import { Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { OAuth2Client } from 'google-auth-library';
import User from '../models/User';
import Avatar from '../models/Avatar';
import UserAvatar from '../models/UserAvatar';
import generateTokens from '../utils/generateTokens';
import { z } from 'zod';
import sendEmail from '../utils/sendEmail';
import crypto from 'crypto';

const client = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

// Input Validation Schemas
const registerSchema = z.object({
  username: z.string().min(3),
  email: z.string().email(),
  password: z.string().min(6),
});

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string(),
});

// @desc    Register a new user
// @route   POST /api/auth/register
// @access  Public
export const registerUser = async (req: Request, res: Response) => {
  try {
    const { username, email, password } = registerSchema.parse(req.body);

    const userExists = await User.findOne({ email });
    if (userExists) {
      return res.status(400).json({ message: 'User already exists' });
    }

    const salt = await bcrypt.genSalt(10);
    const password_hash = await bcrypt.hash(password, salt);

    // Avatar Roulette: Pick a random default avatar
    const randomAvatar = await Avatar.aggregate([
        { $match: { type: 'default' } },
        { $sample: { size: 1 } }
    ]);

    const initialAvatarUrl = randomAvatar.length > 0 ? randomAvatar[0].image_url : '';
    const initialAvatarId = randomAvatar.length > 0 ? randomAvatar[0]._id : null;

    const user = await User.create({
      username,
      email,
      password_hash,
      current_avatar_url: initialAvatarUrl, // Set current avatar
      // avatar_url: initialAvatarUrl // Legacy support if needed
    });

    if (user && initialAvatarId) {
        // Unlock the initial avatar for the user
        await UserAvatar.create({
            user_id: user._id,
            avatar_id: initialAvatarId
        });
    }

    if (user) {
      // Generate 6-digit verification code
      const verificationCode = Math.floor(100000 + Math.random() * 900000).toString();
      user.verification_code = verificationCode;
      user.verification_code_expires = new Date(Date.now() + 15 * 60 * 1000); // 15 minutes
      await user.save();

      // Send verification email
      const message = `Your verification code is: ${verificationCode}. It expires in 15 minutes.`;
      try {
          await sendEmail({
              email: user.email,
              subject: 'Nexus 4D - Email Verification',
              message,
          });
      } catch (emailError) {
          console.error("Failed to send email", emailError);
          // Consider what to do if email fails. Ideally, allow resend.
          // For now, we proceed as if sent, or user can request resend (not implemented yet).
      }

      res.status(201).json({
        _id: user._id,
        username: user.username,
        email: user.email,
        message: 'Registration successful. Please check your email for verification code.',
        requiresVerification: true // Flag for frontend
      });
    } else {
      res.status(400).json({ message: 'Invalid user data' });
    }
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ errors: error.issues });
    }
    res.status(500).json({ message: error.message });
  }
};


// @desc    Verify email with code
// @route   POST /api/auth/verify-email
// @access  Public
export const verifyEmail = async (req: Request, res: Response) => {
    try {
        const { email, code } = req.body;

        const user = await User.findOne({ email });

        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }

        if (user.is_verified) {
            return res.status(400).json({ message: 'User already verified' });
        }

        if (user.verification_code !== code) {
            return res.status(400).json({ message: 'Invalid verification code' });
        }

        if (user.verification_code_expires && user.verification_code_expires < new Date()) {
            return res.status(400).json({ message: 'Verification code expired' });
        }

        user.is_verified = true;
        user.verification_code = undefined;
        user.verification_code_expires = undefined;
        
        const { accessToken, refreshToken } = generateTokens(res, user._id.toString());
        user.refresh_token = refreshToken;
        
        await user.save();

        res.status(200).json({
            _id: user._id,
            username: user.username,
            email: user.email,
            role: user.role,
            accessToken,
            message: 'Email verified successfully'
        });

    } catch (error: any) {
        res.status(500).json({ message: error.message });
    }
};

// @desc    Resend verification code
// @route   POST /api/auth/resend-code
// @access  Public
export const resendVerificationCode = async (req: Request, res: Response) => {
    try {
        const { email } = req.body;

        const user = await User.findOne({ email });

        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }

        if (user.is_verified) {
            return res.status(400).json({ message: 'User already verified' });
        }

        // Generate new 6-digit verification code
        const verificationCode = Math.floor(100000 + Math.random() * 900000).toString();
        user.verification_code = verificationCode;
        user.verification_code_expires = new Date(Date.now() + 15 * 60 * 1000); // 15 minutes
        await user.save();

        // Send verification email
        const message = `Your new verification code is: ${verificationCode}. It expires in 15 minutes.`;
        try {
             await sendEmail({
                email: user.email,
                subject: 'Nexus 4D - New Verification Code',
                message,
            });
        } catch (emailError: any) {
             console.error("Failed to send email", emailError);
             return res.status(500).json({ message: 'Failed to send verification email.' });
        }

        res.status(200).json({ message: 'Verification code sent' });

    } catch (error: any) {
        res.status(500).json({ message: error.message });
    }
};

// @desc    Auth user & get token
// @route   POST /api/auth/login
// @access  Public
export const loginUser = async (req: Request, res: Response) => {
  try {
    const { email, password } = loginSchema.parse(req.body);

    const user = await User.findOne({ email });

    if (user && (await bcrypt.compare(password, user.password_hash))) {

      if (!user.is_verified) {
          return res.status(403).json({ 
              message: 'Email not verified. Please check your email.',
              requiresVerification: true,
              email: user.email
          });
      }

      const { accessToken, refreshToken } = generateTokens(res, user._id.toString());

      user.refresh_token = refreshToken;
      await user.save();

      res.json({
        _id: user._id,
        username: user.username,
        email: user.email,
        role: user.role,
        xp_points: user.xp_points || 0,
        level: user.level || 0,
        current_avatar_url: user.current_avatar_url,
        accessToken
      });
    } else {
      res.status(401).json({ message: 'Invalid email or password' });
    }
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ errors: error.issues });
    }
    res.status(500).json({ message: error.message });
  }
};

// @desc    Logout user / clear cookie
// @route   POST /api/auth/logout
// @access  Public
export const logoutUser = async (req: Request, res: Response) => {
  const refreshToken = req.cookies.jwt;
  if (refreshToken) {
    // Optional: Remove from DB
    await User.findOneAndUpdate({ refresh_token: refreshToken }, { refresh_token: '' });
  }

  res.cookie('jwt', '', {
    httpOnly: true,
    expires: new Date(0),
  });
  res.status(200).json({ message: 'Logged out successfully' });
};

// @desc    Refresh access token
// @route   POST /api/auth/refresh
// @access  Public
export const refreshToken = async (req: Request, res: Response) => {
  const token = req.cookies.jwt;

  if (!token) {
    return res.status(401).json({ message: 'Not authorized, no token' });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_REFRESH_SECRET!) as any;

    const user = await User.findById(decoded.userId);

    if (!user || user.refresh_token !== token) {
      return res.status(401).json({ message: 'Invalid refresh token' });
    }

    const accessToken = jwt.sign({ userId: user._id }, process.env.JWT_SECRET!, {
      expiresIn: '15m',
    });

    res.json({ accessToken });
  } catch (error) {
    res.status(401).json({ message: 'Not authorized, token failed' });
  }
}

// @desc    Google Login
// @route   POST /api/auth/google
// @access  Public
export const googleLogin = async (req: Request, res: Response) => {
  try {
    const { googleToken } = req.body;

    const ticket = await client.verifyIdToken({
      idToken: googleToken,
      audience: process.env.GOOGLE_CLIENT_ID,
    });

    const payload = ticket.getPayload();
    if (!payload) {
      return res.status(400).json({ message: 'Invalid Google Token' });
    }

    const { email, name, sub: googleId, picture } = payload;

    // Check if user exists
    let user = await User.findOne({ $or: [{ email }, { googleId }] });

    if (user) {
      // If user exists but no googleId (registered via email/password), link it
      if (!user.googleId) {
        user.googleId = googleId;
        await user.save();
      }
    } else {
      // Create new user (Avatar Roulette if picture not preferred, or add Google pic as unlocked?)
      // Requirement: "Avatar Roulette" on sign-up. 
      // Let's use Avatar Roulette even for Google users to keep gamification consistent, 
      // OR unlock the Google picture as a special avatar? 
      // PRD says "Users are auto-assigned one of 10 Default avatars". Let's stick to that.
      
      const randomAvatar = await Avatar.aggregate([
          { $match: { type: 'default' } },
          { $sample: { size: 1 } }
      ]);
  
      const initialAvatarUrl = randomAvatar.length > 0 ? randomAvatar[0].image_url : picture; // Fallback to google pic?
      const initialAvatarId = randomAvatar.length > 0 ? randomAvatar[0]._id : null;

      user = await User.create({
        username: name || email!.split('@')[0],
        email,
        googleId,
        current_avatar_url: initialAvatarUrl,
        password_hash: '', 
        is_verified: true, 
      });

      if (user && initialAvatarId) {
          await UserAvatar.create({
              user_id: user._id,
              avatar_id: initialAvatarId
          });
      }
    }

    const { accessToken, refreshToken } = generateTokens(res, user._id.toString());

    user.refresh_token = refreshToken;
    await user.save();

    res.json({
      _id: user._id,
      username: user.username,
      email: user.email,
      role: user.role,
      xp_points: user.xp_points || 0,
      level: user.level || 0,
      current_avatar_url: user.current_avatar_url,
      accessToken,
    });

  } catch (error: any) {
    res.status(400).json({ message: 'Google Authentication Failed', error: error.message });
  }
};

// @desc    Get current user profile
// @route   GET /api/auth/me
// @access  Private
export const getProfile = async (req: Request, res: Response) => {
    try {
        const user = await User.findById(req.user._id).select('-password');
        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }
        res.json({
            _id: user._id,
            username: user.username,
            email: user.email,
            role: user.role,
            xp_points: user.xp_points || 0,
            level: user.level || 0,
            current_avatar_url: user.current_avatar_url,
            first_name: user.first_name,
            last_name: user.last_name,
            major: user.major,
            semester: user.semester,
            bio: user.bio,
            avatar_url: user.current_avatar_url // legacy
        });
    } catch (error: any) {
        res.status(500).json({ message: error.message });
    }
};
