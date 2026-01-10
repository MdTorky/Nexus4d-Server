import { Request, Response } from 'express';
import Follow from '../models/Follow';
import User from '../models/User';
import Course from '../models/Course';
import Notification from '../models/Notification';
import UserAvatar from '../models/UserAvatar';
import Avatar from '../models/Avatar'; // Ensure Avatar model is registered for populate

// @desc    Follow a tutor/user
// @route   POST /api/social/follow/:tutorId
// @access  Private
export const followUser = async (req: Request, res: Response) => {
    try {
        const { tutorId } = req.params;
        const followerId = req.user._id;

        if (tutorId === followerId.toString()) {
            return res.status(400).json({ message: 'You cannot follow yourself' });
        }

        const existingFollow = await Follow.findOne({ follower_id: followerId, following_id: tutorId });
        if (existingFollow) {
            return res.status(400).json({ message: 'Already following this user' });
        }

        await Follow.create({ follower_id: followerId, following_id: tutorId });

        // Notify the tutor
        await Notification.create({
            user_id: tutorId,
            type: 'info',
            title: 'New Follower',
            message: `${req.user.username} started following you!`,
            link: '/profile' // Or follower list if implemented
        });

        res.json({ message: 'Followed successfully' });
    } catch (error: any) {
        res.status(500).json({ message: error.message });
    }
};

// @desc    Unfollow a tutor/user
// @route   DELETE /api/social/follow/:tutorId
// @access  Private
export const unfollowUser = async (req: Request, res: Response) => {
    try {
        const { tutorId } = req.params;
        const followerId = req.user._id;

        const deleted = await Follow.findOneAndDelete({ follower_id: followerId, following_id: tutorId });
        
        if (!deleted) {
            return res.status(404).json({ message: 'Follow relationship not found' });
        }

        res.json({ message: 'Unfollowed successfully' });
    } catch (error: any) {
        res.status(500).json({ message: error.message });
    }
};

// @desc    Get users I am following
// @route   GET /api/social/following
// @access  Private
export const getMyFollowing = async (req: Request, res: Response) => {
    try {
        const following = await Follow.find({ follower_id: req.user._id })
            .populate('following_id', 'username first_name last_name current_avatar_url role expertise level')
            .sort({ createdAt: -1 });

        const followingList = following.map(f => f.following_id);
        res.json(followingList);
    } catch (error: any) {
        res.status(500).json({ message: error.message });
    }
};

// @desc    Get users following ME (for Tutors)
// @route   GET /api/social/followers/me
// @access  Private-
export const getMyFollowers = async (req: Request, res: Response) => {
    try {
        const followers = await Follow.find({ following_id: req.user._id })
            .populate('follower_id', 'username first_name last_name current_avatar_url role expertise level')
            .sort({ createdAt: -1 });

        const followersList = followers.map(f => f.follower_id);
        res.json(followersList);
    } catch (error: any) {
        res.status(500).json({ message: error.message });
    }
};

// @desc    Get full tutor profile with stats and courses
// @route   GET /api/tutors/:id
// @access  Public (or Private)
export const getTutorProfile = async (req: Request, res: Response) => {
    try {
        const { id } = req.params;

        const tutor = await User.findById(id).select('-password_hash -refresh_token -verification_code');
        if (!tutor) {
            return res.status(404).json({ message: 'Tutor not found' });
        }

        const followersCount = await Follow.countDocuments({ following_id: id });
        
        // Fetch FULL course data so CourseCard works correctly (needs packages, description, etc.)
        const courses = await Course.find({ tutor_id: id, status: 'ongoing' }).sort({ createdAt: -1 });

        // Check if current user follows this tutor
        let isFollowing = false;
        if (req.user) {
            const follow = await Follow.findOne({ follower_id: req.user._id, following_id: id });
            if (follow) isFollowing = true;
        }

        // Merge Tutor Application Data (Bio, Expertise, Real Photo)
        let tutorObj: any = tutor.toObject();
        const { default: TutorApplication } = await import('../models/TutorApplication');
        const tutorApp = await TutorApplication.findOne({
            user_id: tutor._id,
            status: 'approved'
        });

        if (tutorApp) {
             tutorObj = {
                 ...tutorObj,
                 bio: tutorApp.bio || tutorObj.bio,
                 expertise: tutorApp.specialization || tutorObj.expertise,
                 tutor_profile_image: tutorApp.profile_picture_url || tutorObj.tutor_profile_image
             };
        }

        // Get Unlocked Avatars (Nexons)
        let unlockedAvatars: any[] = [];
        if (tutor.privacy_settings?.show_nexons !== false) {
            // 1. Get explicitly unlocked
            const unlockedRecords = await UserAvatar.find({ user_id: id }).populate('avatar_id');
            
            // 2. Get default avatars
            const defaultAvatars = await Avatar.find({ type: 'default', is_active: true });

            // 3. Combine them formatted uniformly
            const formattedUnlocked = unlockedRecords.map((r: any) => ({
                 _id: r._id,
                 avatar_id: r.avatar_id
            }));

            const formattedDefaults = defaultAvatars.map(a => ({
                _id: a._id, // Use avatar ID as unique key
                avatar_id: a
            }));

            unlockedAvatars = [...formattedUnlocked, ...formattedDefaults];
        }

        res.json({
            tutor: tutorObj,
            stats: {
                followers: followersCount,
                courses: courses.length
            },
            courses,
            isFollowing,
            unlockedAvatars
        });
    } catch (error: any) {
        res.status(500).json({ message: error.message });
    }
};

// @desc    Get users following a specific tutor
// @route   GET /api/social/tutors/:id/followers
// @access  Public
export const getTutorFollowers = async (req: Request, res: Response) => {
    try {
        const { id } = req.params;

        const followers = await Follow.find({ following_id: id })
            .populate('follower_id', 'username first_name last_name current_avatar_url role expertise level') // Requested fields
            .sort({ createdAt: -1 });

        const followersList = followers.map(f => f.follower_id);
        res.json(followersList);
    } catch (error: any) {
        res.status(500).json({ message: error.message });
    }
};

// -------------------------------------------------------------
// FRIEND SYSTEM
// -------------------------------------------------------------

import FriendRequest from '../models/FriendRequest';

// @desc    Send a friend request
// @route   POST /api/social/friends/request/:recipientId
// @access  Private
export const sendFriendRequest = async (req: Request, res: Response) => {
    try {
        const { recipientId } = req.params;
        const requesterId = req.user._id;

        if (recipientId === requesterId.toString()) {
            return res.status(400).json({ message: 'Cannot friend yourself' });
        }

        // Check if already friends or pending
        const existingRequest = await FriendRequest.findOne({
            $or: [
                { requester_id: requesterId, recipient_id: recipientId },
                { requester_id: recipientId, recipient_id: requesterId }
            ]
        });

        if (existingRequest) {
            if (existingRequest.status === 'accepted') return res.status(400).json({ message: 'Already friends' });
            if (existingRequest.status === 'pending') return res.status(400).json({ message: 'Request already pending' });
        }

        await FriendRequest.create({
            requester_id: requesterId,
            recipient_id: recipientId,
            status: 'pending'
        });

        // Notify recipient
        await Notification.create({
            user_id: recipientId,
            type: 'info', // Could add 'friend_request' type later
            title: 'New Friend Request',
            message: `${req.user.username} sent you a friend request`,
            link: '/profile' // Direct to requests tab
        });

        res.json({ message: 'Friend request sent' });
    } catch (error: any) {
        res.status(500).json({ message: error.message });
    }
};

// @desc    Accept a friend request
// @route   POST /api/social/friends/accept/:requestId
// @access  Private
export const acceptFriendRequest = async (req: Request, res: Response) => {
    try {
        const { requestId } = req.params;
        const userId = req.user._id;

        const request = await FriendRequest.findById(requestId);
        if (!request) return res.status(404).json({ message: 'Request not found' });

        if (request.recipient_id.toString() !== userId.toString()) {
            return res.status(403).json({ message: 'Not authorized' });
        }

        request.status = 'accepted';
        await request.save();

        // Notify requester
        await Notification.create({
            user_id: request.requester_id,
            type: 'success',
            title: 'Friend Request Accepted',
            message: `${req.user.username} accepted your friend request!`,
            link: `/users/${req.user._id}`
        });

        res.json({ message: 'Friend request accepted' });
    } catch (error: any) {
        res.status(500).json({ message: error.message });
    }
};

// @desc    Reject/Cancel a friend request
// @route   DELETE /api/social/friends/request/:requestId
// @access  Private
export const rejectFriendRequest = async (req: Request, res: Response) => {
    try {
        const { requestId } = req.params;
        const userId = req.user._id;

        const request = await FriendRequest.findById(requestId);
        if (!request) return res.status(404).json({ message: 'Request not found' });

        // Allow either party to cancel/reject
        if (request.recipient_id.toString() !== userId.toString() && request.requester_id.toString() !== userId.toString()) {
            return res.status(403).json({ message: 'Not authorized' });
        }

        await FriendRequest.findByIdAndDelete(requestId);

        res.json({ message: 'Friend request removed' });
    } catch (error: any) {
        res.status(500).json({ message: error.message });
    }
};

// @desc    Get my friends list
// @route   GET /api/social/friends
// @access  Private
export const getMyFriends = async (req: Request, res: Response) => {
    try {
        const userId = req.user._id;

        const relationships = await FriendRequest.find({
            $or: [{ requester_id: userId }, { recipient_id: userId }],
            status: 'accepted'
        }).populate('requester_id', 'username first_name last_name current_avatar_url level role')
          .populate('recipient_id', 'username first_name last_name current_avatar_url level role');

        const friends = relationships.map(r => 
            r.requester_id._id.toString() === userId.toString() ? r.recipient_id : r.requester_id
        );

        res.json(friends);
    } catch (error: any) {
        res.status(500).json({ message: error.message });
    }
};

// @desc    Get pending friend requests (incoming)
// @route   GET /api/social/friends/requests
// @access  Private
export const getFriendRequests = async (req: Request, res: Response) => {
    try {
        const userId = req.user._id;

        const requests = await FriendRequest.find({
            recipient_id: userId,
            status: 'pending'
        }).populate('requester_id', 'username first_name last_name current_avatar_url level');

        res.json(requests);
    } catch (error: any) {
        res.status(500).json({ message: error.message });
    }
};

// @desc    Get Public User Profile
// @route   GET /api/users/public/:id
// @access  Public (Optional Auth)
export const getPublicUserProfile = async (req: Request, res: Response) => {
    try {
        const { id } = req.params;
        const currentUserId = req.user?._id;

        const user = await User.findById(id).select('-password_hash -refresh_token -verification_code -email'); // Hide email for privacy?
        if (!user) return res.status(404).json({ message: 'User not found' });

        // Get Unlocked Avatars (Nexons)
        let unlockedAvatars: any[] = [];
        if (user.privacy_settings?.show_nexons !== false) {
             // 1. Get explicitly unlocked
            const { default: UserAvatar } = await import('../models/UserAvatar');
            const { default: Avatar } = await import('../models/Avatar');
            const unlockedRecords = await UserAvatar.find({ user_id: id }).populate('avatar_id');
            
            // 2. Get default avatars
            const defaultAvatars = await Avatar.find({ type: 'default', is_active: true });

            // 3. Combine them formatted uniformly
            const formattedUnlocked = unlockedRecords.map((r: any) => ({
                 _id: r._id,
                 avatar_id: r.avatar_id
            }));

            const formattedDefaults = defaultAvatars.map(a => ({
                _id: a._id,
                avatar_id: a
            }));

            unlockedAvatars = [...formattedUnlocked, ...formattedDefaults];
        }

        // Get Courses (Enrolled & Completed)
        let enrolledCourses: any[] = [];
        let completedCourses: any[] = [];

        if (user.privacy_settings?.show_courses !== false) {
            const { default: UserCourse } = await import('../models/UserCourse');
            
            enrolledCourses = await UserCourse.find({ user_id: id, status: 'active' })
                .populate({
                    path: 'course_id',
                    select: 'title thumbnail_url description level category tutor_id',
                    populate: { path: 'tutor_id', select: 'first_name last_name username' }
                })
                .sort({ last_accessed_at: -1 });

            completedCourses = await UserCourse.find({ user_id: id, status: 'completed' })
                 .populate({
                    path: 'course_id',
                    select: 'title thumbnail_url level category'
                })
                .sort({ updatedAt: -1 });
        }

        // Check Friend Status
        let friendStatus = 'none'; // none, pending, friends
        let requestId = null;

        if (currentUserId) {
            const friendReq = await FriendRequest.findOne({
                $or: [
                    { requester_id: currentUserId, recipient_id: id },
                    { requester_id: id, recipient_id: currentUserId }
                ],
                status: 'accepted'
            });

            // Check for outgoing pending request
            const outgoingRequest = await FriendRequest.findOne({
                requester_id: currentUserId,
                recipient_id: id,
                status: 'pending'
            });

            // Check for incoming pending request
            const incomingRequest = await FriendRequest.findOne({
                requester_id: id,
                recipient_id: currentUserId,
                status: 'pending'
            });

            if (friendReq) {
                friendStatus = 'accepted';
            } else if (outgoingRequest) {
                friendStatus = 'pending_outgoing';
                requestId = outgoingRequest._id;
            } else if (incomingRequest) {
                friendStatus = 'pending_incoming';
                requestId = incomingRequest._id;
            }
        }

        res.json({
            user,
            friendStatus,
            requestId,
            unlockedAvatars,
            enrolledCourses,
            completedCourses
        });
    } catch (error: any) {
        res.status(500).json({ message: error.message });
    }
};
