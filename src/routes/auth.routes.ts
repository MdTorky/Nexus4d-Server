import { Router } from 'express';
import { registerUser, loginUser, logoutUser, refreshToken, googleLogin, verifyEmail, resendVerificationCode, getProfile } from '../controllers/auth.controller';
import { protect } from '../middleware/auth.middleware';

const router = Router();

// @route   POST /api/auth/register
// @desc    Register a new user
// @access  Public
router.post('/register', registerUser);

// @route   POST /api/auth/verify-email
// @desc    Verify email with code
// @access  Public
router.post('/verify-email', verifyEmail);

// @route   POST /api/auth/resend-code
// @desc    Resend verification code
// @access  Public
router.post('/resend-code', resendVerificationCode);

// @route   POST /api/auth/login
// @desc    Login user & get token
// @access  Public
router.post('/login', loginUser);

// @route   POST /api/auth/logout
// @desc    Logout user
// @access  Public
router.post('/logout', logoutUser);

// @route   POST /api/auth/refresh
// @desc    Get new access token
// @access  Public
router.post('/refresh', refreshToken);

// @route   POST /api/auth/google
// @desc    Google Login
// @access  Public
router.post('/google', googleLogin);

// @route   GET /api/auth/me
// @desc    Get current user profile
// @access  Private
router.get('/me', protect, getProfile);

export default router;
