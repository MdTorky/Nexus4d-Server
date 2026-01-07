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
    getAdminAvatars
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

router.get('/tutors-list', protect, getTutorsList);
router.get('/admin/avatars-list', protect, getAdminAvatars); // New Admin Endpoint

export default router;
