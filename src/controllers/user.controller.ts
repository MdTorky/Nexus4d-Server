import { Request, Response } from 'express';
import User from '../models/User';
import UserAvatar from '../models/UserAvatar';
import Avatar from '../models/Avatar';
import Course from '../models/Course';
import { z } from 'zod';

// Input Validation
const onboardingSchema = z.object({
    first_name: z.string().min(1).optional(),
    last_name: z.string().min(1).optional(),
    major: z.string().optional(),
    semester: z.string().optional(),
    bio: z.string().max(500).optional(),
    privacy_settings: z.object({
        show_nexons: z.boolean().optional(),
        show_courses: z.boolean().optional()
    }).optional()
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
        let query: any = { is_active: true };
        
        // Filter out admin category if user is not admin
        // Note: req.user type might not have role fully typed in Express.Request, assuming extended or any
        if ((req.user as any).role !== 'admin') {
            query.category = { $ne: 'admin' };
        }

        const allAvatars = await Avatar.find(query);
        
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
            required_level: avatar.required_level,
            category: avatar.category,
            // Unlocked if in UserAvatar OR if it's a default type
            is_unlocked: unlockedIds.has(avatar._id.toString()) || avatar.type === 'default'
        }));

        // 4. Populate "required_course_title" for locked course rewards
        const results = await Promise.all(avatarsWithStatus.map(async (a) => {
            let required_course_title = undefined;
            if (!a.is_unlocked && a.unlock_condition === 'course_completion') {
                 // Determine which course rewards this avatar
                 // This might be slow if there are TONs of avatars but okay for now
                 const course = await Course.findOne({ reward_avatar_id: a._id }).select('title');
                 if (course) {
                     required_course_title = course.title;
                 }
            }
            return {
                ...a,
                required_course_title
            };
        }));

        res.json(results);
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

// @desc    Unlock a reward avatar using a token
// @route   POST /api/user/avatar/unlock
// @access  Private
export const unlockAvatar = async (req: Request, res: Response) => {
    try {
        const { avatar_id } = req.body;
        const user = await User.findById(req.user._id);

        if (!user) return res.status(404).json({ message: 'User not found' });
        
        // Check tokens
        if ((user.avatar_unlock_tokens || 0) < 1) {
            return res.status(400).json({ message: 'No unlock tokens available' });
        }

        const avatar = await Avatar.findById(avatar_id);
        if (!avatar) return res.status(404).json({ message: 'Avatar not found' });

        // Check if already unlocked
        const existingUnlock = await UserAvatar.findOne({ user_id: user._id, avatar_id: avatar_id });
        if (existingUnlock) {
            return res.status(400).json({ message: 'Avatar already unlocked' });
        }

        // Unlock logic
        await UserAvatar.create({
            user_id: user._id,
            avatar_id: avatar_id
        });

        // Deduct token
        user.avatar_unlock_tokens = (user.avatar_unlock_tokens || 0) - 1;
        await user.save();

        res.json({ 
            message: 'Avatar unlocked!', 
            avatar_unlock_tokens: user.avatar_unlock_tokens,
            avatar_id: avatar._id
        });

    } catch (error: any) {
        res.status(500).json({ message: error.message });
    }
};

// @desc    Simulate Level Up (Dev Tool)
// @route   POST /api/user/test/level-up
// @access  Private
export const simulateLevelUp = async (req: Request, res: Response) => {
    try {
        const user = await User.findById(req.user._id);
        if (!user) return res.status(404).json({ message: 'User not found' });

        const oldLevel = user.level || 0;
        user.level = (user.level || 0) + 1;
        user.xp_points = (user.xp_points || 0) + 500;
        user.avatar_unlock_tokens = (user.avatar_unlock_tokens || 0) + 1; // Grant token
        
        await user.save();

        // Create Notification for Level Up
        if (oldLevel < user.level) {
             const Notification = (await import('../models/Notification')).default;
             await Notification.create({
                user_id: user._id,
                type: 'success',
                title: 'Level Up! 🚀',
                message: `You reached Level ${user.level}! You earned an Unlock Token.`,
                link: '/profile'
             });
        }

        res.json({
            message: 'Level up simulated successfully',
            level: user.level,
            xp_points: user.xp_points,
            avatar_unlock_tokens: user.avatar_unlock_tokens
        });

    } catch (error: any) {
        res.status(500).json({ message: error.message });
    }
};

// @desc    Simulate Level Down (Dev Tool)
// @route   POST /api/user/test/level-down
// @access  Private
export const simulateLevelDown = async (req: Request, res: Response) => {
    try {
        const user = await User.findById(req.user._id);
        if (!user) return res.status(404).json({ message: 'User not found' });

        if (user.level > 1) {
            user.level = user.level - 1;
            user.xp_points = Math.max(0, (user.xp_points || 0) - 500);
            
            // Optional: Deduct token if they have any, or even go negative? 
            // Let's just remove one if possible to simulate "undoing" the level up reward
            if (user.avatar_unlock_tokens > 0) {
                user.avatar_unlock_tokens = user.avatar_unlock_tokens - 1;
            }
            
            await user.save();
        }

        res.json({
            message: `Leveled down to ${user.level}. Token removed if available.`,
            level: user.level,
            xp_points: user.xp_points,
            avatar_unlock_tokens: user.avatar_unlock_tokens
        });

    } catch (error: any) {
        res.status(500).json({ message: error.message });
    }
};

// @desc    Reset User Gamification Stats (Dev Tool)
// @route   POST /api/user/test/reset
// @access  Private
export const resetTestUser = async (req: Request, res: Response) => {
    try {
        const user = await User.findById(req.user._id);
        if (!user) return res.status(404).json({ message: 'User not found' });

        // 1. Reset User Stats
        user.level = 1;
        user.xp_points = 0;
        user.avatar_unlock_tokens = 0;

        // 2. Lock all Reward avatars (Remove UserAvatar entries for this user)
        // We need to keep the "Default" ones? 
        // Actually, UserAvatar only stores *unlocked* non-default avatars.
        // So deleting all UserAvatar entries for this user effectively re-locks everything 
        // that isn't type='default'.
        await UserAvatar.deleteMany({ user_id: user._id });

        await user.save();

        res.json({
            message: 'User reset to Level 1. All reward avatars locked.',
            level: 1,
            xp_points: 0,
            avatar_unlock_tokens: 0
        });

    } catch (error: any) {
        res.status(500).json({ message: error.message });
    }
};

// @desc    Get list of all tutors (for Admin dropdowns)
// @route   GET /api/user/tutors-list
// @access  Private (Admin)
export const getTutorsList = async (req: Request, res: Response) => {
    try {
        const tutors = await User.find({ role: 'tutor' })
            .select('_id username email first_name last_name profile_picture_url');
        res.json(tutors);
    } catch (error: any) {
        res.status(500).json({ message: error.message });
    }
};

// @desc    Get All Avatars (Admin Dropdown)
// @route   GET /api/admin/avatars-list
// @access  Private (Admin)
export const getAdminAvatars = async (req: Request, res: Response) => {
    try {
        const avatars = await Avatar.find({}).sort({ name: 1 });
        res.json(avatars);
    } catch (error: any) {
        res.status(500).json({ message: error.message });
    }
};

// @desc    Get All Users (Admin)
// @route   GET /api/user/admin/users
// @access  Private (Admin)
// @desc    Get All Users with Stats (Admin)
// @route   GET /api/user/admin/users
// @access  Private (Admin)
export const getAllUsers = async (req: Request, res: Response) => {
    try {
        const users = await User.find({}).select('-password_hash -refresh_token -verification_code').sort({ createdAt: -1 });

        // Import models for stats aggregation
        const FriendRequest = (await import('../models/FriendRequest')).default;
        const Follow = (await import('../models/Follow')).default;
        const UserCourse = (await import('../models/UserCourse')).default;
        const Course = (await import('../models/Course')).default;
        const UserAvatar = (await import('../models/UserAvatar')).default;

        const usersWithStats = await Promise.all(users.map(async (user) => {
            const friendsCount = await FriendRequest.countDocuments({
                $or: [{ requester_id: user._id }, { recipient_id: user._id }],
                status: 'accepted'
            });
            
            const followingCount = await Follow.countDocuments({ follower_id: user._id });
            const followersCount = await Follow.countDocuments({ following_id: user._id });
            
            // Nexons (Avatars) Count
            const nexonsCount = await UserAvatar.countDocuments({ user_id: user._id });

            // Count active or completed enrollments mainly
            const enrolledCount = await UserCourse.countDocuments({ 
                user_id: user._id, 
                status: { $in: ['active', 'completed'] } 
            });

            const assignedCoursesCount = user.role === 'tutor' 
                ? await Course.countDocuments({ tutor_id: user._id }) 
                : 0;

            return {
                ...user.toObject(),
                friendsCount,
                followingCount,
                followersCount,
                nexonsCount,
                enrolledCount,
                assignedCoursesCount
            };
        }));

        res.json(usersWithStats);
    } catch (error: any) {
        res.status(500).json({ message: error.message });
    }
};

// @desc    Update User Status (Admin)
// @route   PUT /api/user/admin/users/:id/status
// @access  Private (Admin)
export const updateUserStatus = async (req: Request, res: Response) => {
    try {
        const { id } = req.params;
        const { is_active, reason } = req.body;

        const user = await User.findById(id);
        if (!user) return res.status(404).json({ message: 'User not found' });

        if (user.role === 'admin') {
             return res.status(403).json({ message: 'Cannot deactivate admin accounts' });
        }

        user.is_active = is_active;
        if (!is_active) {
            user.deactivation_reason = reason;
        } else {
            user.deactivation_reason = undefined; // Clear reason on activation
        }
        
        await user.save();

        // --- Notifications & Emails ---
        // const sendEmail = (await import('../utils/sendEmail')).default; // Remove old import
        const { EmailService } = await import('../services/email.service'); // Dynamically import new service
        const Notification = (await import('../models/Notification')).default;

        if (is_active) {
            // Activated
            await EmailService.sendAccountReactivationEmail(user.email, user.username);

            await Notification.create({
                user_id: user._id,
                type: 'success', // or 'system'
                title: 'Account Reactivated',
                message: 'Your account has been reactivated.',
                link: '/'
            });

        } else {
            // Deactivated
            await EmailService.sendAccountDeactivationEmail(user.email, user.username, reason);
            
            // We can't really show a notification if they can't log in, BUT if we ever implement read-only restricted mode, they might see it. 
            // Good to store it anyway for record.
             await Notification.create({
                user_id: user._id,
                type: 'error',
                title: 'Account Deactivated',
                message: `Reason: ${reason || 'N/A'}`,
                link: '#'
            });
        }

        res.json({ message: `User ${is_active ? 'activated' : 'deactivated'}`, user });
    } catch (error: any) {
        res.status(500).json({ message: error.message });
    }
};

// @desc    Add Test XP
// @route   POST /api/user/test/add-xp
// @access  Private
export const addUserXP = async (req: Request, res: Response) => {
    try {
        const { xp } = req.body;
        const user = await User.findById(req.user._id);
        
        if (!user) return res.status(404).json({ message: 'User not found' });

        const oldLevel = user.level || 1;
        user.xp_points = (user.xp_points || 0) + (xp || 0);
        
        await user.save(); // Triggers pre-save hook for level calc

        const isLeveledUp = user.level > oldLevel;
        const tokensEarned = isLeveledUp ? (user.level - oldLevel) : 0;

         if (isLeveledUp) {
             const { default: Notification } = await import('../models/Notification');
             await Notification.create({
                user_id: user._id,
                title: 'Level Up!',
                message: `You reached Level ${user.level} and earned ${tokensEarned} Token(s)!`,
                type: 'success'
            });
        }

        res.json({
            success: true,
            xp_points: user.xp_points,
            level: user.level,
            avatar_unlock_tokens: user.avatar_unlock_tokens,
            leveledUp: isLeveledUp,
            tokensEarned
        });
    } catch (error: any) {
        res.status(500).json({ message: error.message });
    }
};
