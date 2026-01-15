import jwt from 'jsonwebtoken';
import { Response } from 'express';

const generateTokens = (res: Response, userId: string) => {
    if (!process.env.JWT_SECRET || !process.env.JWT_REFRESH_SECRET) {
        throw new Error('JWT Secrets not defined in environment');
    }

    const accessToken = jwt.sign({ userId }, process.env.JWT_SECRET, {
        expiresIn: '1d',
    });

    const refreshToken = jwt.sign({ userId }, process.env.JWT_REFRESH_SECRET, {
        expiresIn: '7d', // 7 Days
    });

    // Set Refresh Token as HTTP-Only Cookie
    res.cookie('jwt', refreshToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV !== 'development', // Use secure cookies in production (HTTPS)
        sameSite: 'strict', // Prevent CSRF
        maxAge: 7 * 24 * 60 * 60 * 1000, // 7 Days
    });

    return { accessToken, refreshToken };
};

export default generateTokens;
