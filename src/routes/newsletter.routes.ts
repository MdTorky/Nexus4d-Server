import express from 'express';
import { protect, admin } from '../middleware/auth.middleware';
import { announceCourse } from '../controllers/newsletter.controller';

const router = express.Router();

router.post('/announce/:courseId', protect, admin, announceCourse);

export default router;
