import express from 'express';
import { protect, admin } from '../middleware/auth.middleware';
import { 
    applyAsTutor, 
    getAllApplications, 
    approveApplication, 
    rejectApplication,
    getTutorStatus,
    getTutorAnalytics
} from '../controllers/tutor.controller';

import upload from '../middleware/upload.middleware';

const router = express.Router();

// Public / User Routes
router.get('/status', protect, getTutorStatus);
router.post('/apply', protect, upload.single('profile_picture'), applyAsTutor);

// Admin Routes
router.get('/admin/applications', protect, admin, getAllApplications);
router.post('/admin/approve', protect, admin, approveApplication);
router.post('/admin/reject', protect, admin, rejectApplication);
router.get('/admin/analytics', protect, admin, getTutorAnalytics);

export default router;
