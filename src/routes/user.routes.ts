import express from 'express';
import { protect } from '../middleware/auth.middleware';
import { 
    getUserProfile, 
    updateUserProfile, 
    getUnlockedAvatars, 
    equipAvatar,
    unlockAvatar,
    simulateLevelUp,
    simulateLevelDown,
    resetTestUser,
    getTutorsList,
    getAdminAvatars,
    getAllUsers, // New
    updateUserStatus, // New
    addUserXP
} from '../controllers/user.controller';

const router = express.Router();

router.route('/profile')
    .get(protect, getUserProfile)
    .put(protect, updateUserProfile);

router.get('/avatars', protect, getUnlockedAvatars);
router.put('/avatar', protect, equipAvatar);
router.post('/avatar/unlock', protect, unlockAvatar);
router.post('/test/level-up', protect, simulateLevelUp);
router.post('/test/level-down', protect, simulateLevelDown);
router.post('/test/reset', protect, resetTestUser);
router.post('/test/add-xp', protect, addUserXP);

router.get('/tutors-list', protect, getTutorsList);
router.get('/admin/avatars-list', protect, getAdminAvatars); // New Admin Endpoint

// Admin User Management
router.get('/admin/users', protect, getAllUsers);
router.put('/admin/users/:id/status', protect, updateUserStatus);

export default router;
