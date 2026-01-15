
import express from 'express';
import { submitContactForm, getMessages, markAsRead, deleteMessage } from '../controllers/contact.controller';
import {protect, admin } from '../middleware/auth.middleware';

const router = express.Router();

// Public Route
router.post('/', submitContactForm);

// Admin Routes
router.get('/admin/messages', protect,admin, getMessages);
router.put('/admin/messages/:id/read', protect,admin, markAsRead);
router.delete('/admin/messages/:id', protect,admin, deleteMessage);

export default router;
