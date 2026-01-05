import { Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { OAuth2Client } from 'google-auth-library';
import User from '../models/User';
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

    const user = await User.create({
      username,
      email,
      password_hash,
    });

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
      // Create new user
      // Note: Password is required by schema if not modified, but we modified it to be optional
      // We'll generate a random password just in case or leave it undefined if schema allows
      user = await User.create({
        username: name || email!.split('@')[0],
        email,
        googleId,
        avatar_url: picture,
        password_hash: '', // Or handle this in model to not require it
        is_verified: true, // Google users are verified by default
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
      accessToken,
      avatar_url: user.avatar_url
    });

  } catch (error: any) {
    console.error('Google Auth Error:', error);
    res.status(400).json({ message: 'Google Authentication Failed', error: error.message });
  }
};
