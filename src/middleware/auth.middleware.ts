import jwt from 'jsonwebtoken';
import { Request, Response, NextFunction } from 'express';
import User from '../models/User';

interface JwtPayload {
    userId: string;
}

// Extend Request type to include user
declare global {
    namespace Express {
        interface Request {
            user?: any;
        }
    }
}

export const protect = async (req: Request, res: Response, next: NextFunction) => {
    let token;

    if (
        req.headers.authorization &&
        req.headers.authorization.startsWith('Bearer')
    ) {
        try {
            token = req.headers.authorization.split(' ')[1];

            if (!process.env.JWT_SECRET) {
                throw new Error('JWT_SECRET not defined');
            }

            const decoded = jwt.verify(token, process.env.JWT_SECRET) as JwtPayload;

            req.user = await User.findById(decoded.userId).select('-password_hash');

            if (req.user && !req.user.is_active) {
                 return res.status(403).json({ 
                    message: 'Account Deactivated', 
                    reason: req.user.deactivation_reason || 'See support for details.' 
                });
            }

            next();
        } catch (error) {
            console.error(error);
            res.status(401).json({ message: 'Not authorized, token failed' });
        }
    }

    if (!token) {
        res.status(401).json({ message: 'Not authorized, no token' });
    }
};

export const admin = (req: Request, res: Response, next: NextFunction) => {
    if (req.user && req.user.role === 'admin') {
        next();
    } else {
        res.status(401).json({ message: 'Not authorized as an admin' });
    }
};

export const tutor = (req: Request, res: Response, next: NextFunction) => {
    if (req.user && (req.user.role === 'tutor' || req.user.role === 'admin')) {
        next();
    } else {
        res.status(401).json({ message: 'Not authorized as a tutor' });
    }
};

export const optionalAuth = async (req: Request, res: Response, next: NextFunction) => {
    let token;

    if (
        req.headers.authorization &&
        req.headers.authorization.startsWith('Bearer')
    ) {
        try {
            token = req.headers.authorization.split(' ')[1];
            if (process.env.JWT_SECRET) {
                const decoded = jwt.verify(token, process.env.JWT_SECRET) as JwtPayload;
                req.user = await User.findById(decoded.userId).select('-password_hash');
            }
        } catch (error) {
            console.error("Optional Auth Token Failed:", error);
            // Do nothing, just continue as guest
        }
    }
    next();
};
