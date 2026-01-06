import { Request, Response } from 'express';
import User from '../models/User';
import UserAvatar from '../models/UserAvatar';
import Avatar from '../models/Avatar';
import { z } from 'zod';

// Input Validation
const onboardingSchema = z.object({
    first_name: z.string().min(1),
    last_name: z.string().min(1),
    major: z.string().optional(),
    semester: z.string().optional(),
    bio: z.string().max(500).optional(),
    
});

// @desc    Get user profile with gamification stats
// @route   GET /api/user/profile
// @access  Private
export const getUserProfile = async (req: Request, res: Response) => {
    try {
        const user = await User.findById(req.user._id).select('-password_hash -refresh_token -verification_code');
        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }
        res.json(user);
    } catch (error: any) {
        res.status(500).json({ message: error.message });
    }
};

// @desc    Update user profile (Onboarding)
// @route   PUT /api/user/profile
// @access  Private
export const updateUserProfile = async (req: Request, res: Response) => {
    try {
        const validatedData = onboardingSchema.parse(req.body);

        const user = await User.findByIdAndUpdate(
            req.user._id,
            { ...validatedData },
            { new: true, runValidators: true }
        ).select('-password_hash -refresh_token');

        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }

        res.json(user);
    } catch (error: any) {
        if (error instanceof z.ZodError) {
            return res.status(400).json({ errors: error.issues });
        }
        res.status(500).json({ message: error.message });
    }
};

// @desc    Get all avatars with user's unlock status
// @route   GET /api/user/avatars
// @access  Private
export const getUnlockedAvatars = async (req: Request, res: Response) => {
    try {
        // 1. Get all avatars
        const allAvatars = await Avatar.find({ is_active: true });
        
        // 2. Get user's unlocked avatars
        const userUnlocked = await UserAvatar.find({ user_id: req.user._id });
        const unlockedIds = new Set(userUnlocked.map(u => u.avatar_id.toString()));

        // 3. Merge and mark status
        const avatarsWithStatus = allAvatars.map(avatar => ({
            _id: avatar._id,
            name: avatar.name,
            image_url: avatar.image_url,
            type: avatar.type,
            unlock_condition: avatar.unlock_condition,
            // Unlocked if in UserAvatar OR if it's a default type
            is_unlocked: unlockedIds.has(avatar._id.toString()) || avatar.type === 'default'
        }));

        res.json(avatarsWithStatus);
    } catch (error: any) {
        res.status(500).json({ message: error.message });
    }
};

// @desc    Equip an avatar
// @route   PUT /api/user/avatar
// @access  Private
export const equipAvatar = async (req: Request, res: Response) => {
    try {
        const { avatar_id } = req.body;

        const avatar = await Avatar.findById(avatar_id);
        if (!avatar) {
             return res.status(404).json({ message: 'Avatar not found' });
        }

        // Verify user owns this avatar OR it is a default one
        if (avatar.type !== 'default') {
            const ownsAvatar = await UserAvatar.findOne({
                user_id: req.user._id,
                avatar_id: avatar_id
            });

            if (!ownsAvatar) {
                return res.status(403).json({ message: 'You have not unlocked this avatar' });
            }
        }

        const user = await User.findByIdAndUpdate(
            req.user._id,
            { current_avatar_url: avatar.image_url },
            { new: true }
        ).select('-password_hash');

        res.json(user);

    } catch (error: any) {
        res.status(500).json({ message: error.message });
    }
};
