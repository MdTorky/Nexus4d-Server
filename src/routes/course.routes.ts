import { Router } from 'express';
import { protect, admin, tutor } from '../middleware/auth.middleware';
import { videoUpload, courseThumbnailUpload, resourceUpload } from '../middleware/upload.middleware';
import {
    createCourse,
    updateCourse,
    createChapter,
    updateChapter,
    deleteChapter,
    getCourses,
    getCourseById,
    getTutorCourses,
    getCourseForEdit,
    addMaterialToChapter,
    updateMaterial,
    deleteMaterial
} from '../controllers/course.controller';

const router = Router();

// Public Routes
router.get('/', getCourses);
router.get('/:id', getCourseById);

// Tutor Routes (Read Only)
router.get('/tutor/my-courses', protect, tutor, getTutorCourses);
router.get('/:id/edit', protect, tutor, getCourseForEdit); // Tutors can "view" edit page to see details, but saving should be blocked? Or maybe just allow viewing stats. 
// Note: Frontend will hide save buttons for Tutors. Backend `updateCourse` is Admin only.

// Admin Routes (Write Access)
router.post('/', protect, admin, courseThumbnailUpload.single('thumbnail'), createCourse);
router.put('/:id', protect, admin, courseThumbnailUpload.single('thumbnail'), updateCourse);
router.post('/:id/chapters', protect, admin, resourceUpload.single('video'), createChapter); // Keeping legacy for now, but migrating
router.put('/:courseId/chapters/:chapterId', protect, admin, updateChapter);
router.delete('/:courseId/chapters/:chapterId', protect, admin, deleteChapter);
router.post('/:courseId/chapters/:chapterId/materials', protect, admin, resourceUpload.single('file'), addMaterialToChapter);
router.put('/:courseId/chapters/:chapterId/materials/:materialIndex', protect, admin, resourceUpload.single('file'), updateMaterial);
router.delete('/:courseId/chapters/:chapterId/materials/:materialIndex', protect, admin, deleteMaterial);

export default router;
