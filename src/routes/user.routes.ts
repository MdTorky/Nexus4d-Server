import express from 'express';
import { protect } from '../middleware/auth.middleware';
import { 
    getUserProfile, 
    updateUserProfile, 
    getUnlockedAvatars, 
    equipAvatar 
} from '../controllers/user.controller';

const router = express.Router();

router.route('/profile')
    .get(protect, getUserProfile)
    .put(protect, updateUserProfile);

router.get('/avatars', protect, getUnlockedAvatars);
router.put('/avatar', protect, equipAvatar);

export default router;
