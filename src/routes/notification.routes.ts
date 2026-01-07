import express from 'express';
import { protect } from '../middleware/auth.middleware';
import { getUserNotifications, markAsRead, markAllAsRead } from '../controllers/notification.controller';

const router = express.Router();

router.get('/', protect, getUserNotifications);
router.put('/:id/read', protect, markAsRead);
router.put('/read-all', protect, markAllAsRead);

export default router;
