import express from 'express';
import { protect, admin } from '../middleware/auth.middleware';
import { 
    getAllAvatars, 
    createAvatar, 
    updateAvatar, 
    deleteAvatar,
    bulkUpdateCategories 
} from '../controllers/avatar.controller';

const router = express.Router();

router.get('/all', protect, admin, getAllAvatars);
// router.get('/scan', protect, admin, getScannedIcons);
router.post('/', protect, admin, createAvatar);
router.put('/:id', protect, admin, updateAvatar);
router.put('/bulk-update-category', protect, admin, bulkUpdateCategories);
router.delete('/:id', protect, admin, deleteAvatar);

export default router;
