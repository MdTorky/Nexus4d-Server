import express from 'express';
import { protect, optionalAuth } from '../middleware/auth.middleware';
import { 
    followUser, 
    unfollowUser, 
    getMyFollowing, 
    getTutorProfile,
    getTutorFollowers,
    sendFriendRequest,
    acceptFriendRequest,
    rejectFriendRequest,
    getMyFriends,
    getFriendRequests,
    getPublicUserProfile,
    getMyFollowers
} from '../controllers/social.controller';

const router = express.Router();

// Public (with Optional Auth for "Is Following" check)
router.get('/tutors/:id', optionalAuth as any, getTutorProfile as any);
router.get('/tutors/:id/followers', getTutorFollowers as any);
router.get('/users/:id', optionalAuth as any, getPublicUserProfile as any); // New Public User Profile

// Protected - Following
router.post('/follow/:tutorId', protect as any, followUser as any);
router.delete('/follow/:tutorId', protect as any, unfollowUser as any);
router.get('/following', protect as any, getMyFollowing as any);
router.get('/followers/me', protect as any, getMyFollowers as any); // New route for tutors

// Protected - Friends
router.post('/friends/request/:recipientId', protect as any, sendFriendRequest as any);
router.post('/friends/accept/:requestId', protect as any, acceptFriendRequest as any);
router.delete('/friends/request/:requestId', protect as any, rejectFriendRequest as any);
router.get('/friends', protect as any, getMyFriends as any);
router.get('/friends/requests', protect as any, getFriendRequests as any);

export default router;
