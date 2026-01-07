import { Request, Response } from 'express';
import Notification from '../models/Notification';

// @desc    Get user notifications
// @route   GET /api/notifications
// @access  Private
export const getUserNotifications = async (req: Request, res: Response) => {
    try {
        const notifications = await Notification.find({ user_id: req.user._id })
            .sort({ createdAt: -1 })
            .limit(20); // Limit to last 20 for now
        
        // Count unread
        const unreadCount = await Notification.countDocuments({ user_id: req.user._id, is_read: false });

        res.json({ notifications, unreadCount });
    } catch (error: any) {
        res.status(500).json({ message: error.message });
    }
};

// @desc    Mark notification as read
// @route   PUT /api/notifications/:id/read
// @access  Private
export const markAsRead = async (req: Request, res: Response) => {
    try {
        const notification = await Notification.findById(req.params.id);

        if (!notification) {
            return res.status(404).json({ message: 'Notification not found' });
        }

        if (notification.user_id.toString() !== req.user._id.toString()) {
            return res.status(401).json({ message: 'Not authorized' });
        }

        notification.is_read = true;
        await notification.save();

        res.json(notification);
    } catch (error: any) {
        res.status(500).json({ message: error.message });
    }
};

// @desc    Mark ALL as read
// @route   PUT /api/notifications/read-all
// @access  Private
export const markAllAsRead = async (req: Request, res: Response) => {
    try {
        await Notification.updateMany(
            { user_id: req.user._id, is_read: false },
            { $set: { is_read: true } }
        );
        res.json({ message: 'All notifications marked as read' });
    } catch (error: any) {
        res.status(500).json({ message: error.message });
    }
};
