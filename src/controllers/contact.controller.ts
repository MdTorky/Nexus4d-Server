
import { Request, Response } from 'express';
import ContactMessage from '../models/ContactMessage';
import Notification from '../models/Notification';
import User from '../models/User';

// Helper to notify admins (simplified, assumes admin role check on User model)
const notifyAdmins = async (title: string, message: string, link: string) => {
    const admins = await User.find({ role: 'admin' });
    const notifications = admins.map(admin => ({
        user_id: admin._id,
        type: 'info',
        title,
        message,
        link,
        is_read: false
    }));
    if (notifications.length > 0) {
        await Notification.insertMany(notifications);
    }
};

export const submitContactForm = async (req: Request, res: Response) => {
    try {
        const { name, email, subject, message } = req.body;

        if (!name || !email || !subject || !message) {
            return res.status(400).json({ message: 'All fields are required' });
        }

        const newMessage = await ContactMessage.create({
            name,
            email,
            subject,
            message
        });

        // Notify Admins
        await notifyAdmins(
            'New Contact Message',
            `Received a new message from ${name}: "${subject}"`,
            '/admin?tab=messages'
        );

        res.status(201).json({ message: 'Message sent successfully', data: newMessage });
    } catch (error) {
        console.error('Submit contact error:', error);
        res.status(500).json({ message: 'Server error submitted message' });
    }
};

export const getMessages = async (req: Request, res: Response) => {
    try {
        const messages = await ContactMessage.find().sort({ createdAt: -1 });
        res.status(200).json(messages);
    } catch (error) {
        res.status(500).json({ message: 'Error fetching messages' });
    }
};

export const markAsRead = async (req: Request, res: Response) => {
    try {
        const { id } = req.params;
        const message = await ContactMessage.findByIdAndUpdate(id, { isRead: true }, { new: true });
        if (!message) return res.status(404).json({ message: 'Message not found' });
        res.status(200).json(message);
    } catch (error) {
        res.status(500).json({ message: 'Error updating message status' });
    }
};

export const deleteMessage = async (req: Request, res: Response) => {
    try {
        const { id } = req.params;
        const message = await ContactMessage.findByIdAndDelete(id);
        if (!message) return res.status(404).json({ message: 'Message not found' });
        res.status(200).json({ message: 'Message deleted' });
    } catch (error) {
        res.status(500).json({ message: 'Error deleting message' });
    }
};
