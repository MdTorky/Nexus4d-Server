import { Router } from 'express';
import { protect, admin, tutor } from '../middleware/auth.middleware';
import { videoUpload, courseThumbnailUpload, resourceUpload, receiptUpload } from '../middleware/upload.middleware';

// Remove redundant multer/cloudinary imports if they persist below
// (Ensuring we use the exported one)

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
    deleteMaterial,
    enrollCourse,
    getSecureCourseContent,
    checkEnrollment,
    getMyEnrolledCourses,
    getPendingEnrollments,
    approveEnrollment,
    rejectEnrollment,
    getAllEnrollments,
    getEnrollmentAnalytics,
    getCourseGlobalAnalytics,
    toggleMaterialCompletion,
    claimChapterReward,
    claimCourseReward
} from '../controllers/course.controller';

const router = Router();

// Public Routes (with optional auth to check for admin)
import { optionalAuth } from '../middleware/auth.middleware';
router.get('/', optionalAuth, getCourses);

// Student Routes (Protected) - specific paths before generic :id
router.get('/my-courses', protect, getMyEnrolledCourses); 

// Admin Enrollment Management (Must be before /:id)
router.get('/enrollments/pending', protect, admin, getPendingEnrollments);
router.get('/enrollments/all', protect, admin, getAllEnrollments);
router.get('/enrollments/analytics', protect, admin, getEnrollmentAnalytics);
router.get('/admin/analytics', protect, admin, getCourseGlobalAnalytics);
router.post('/enrollments/:id/approve', protect, admin, approveEnrollment);
router.post('/enrollments/:id/reject', protect, admin, rejectEnrollment);

router.get('/:id', getCourseById);

// Student Actions
router.post('/:id/enroll', protect, receiptUpload.single('receipt'), enrollCourse);
router.get('/:id/content', protect, getSecureCourseContent);
router.post('/:id/materials/:materialId/toggle', protect, toggleMaterialCompletion);
router.post('/:id/chapters/:chapterId/claim', protect, claimChapterReward);
router.post('/:id/claim-rewards', protect, claimCourseReward);
router.get('/:id/enrollment', protect, checkEnrollment);

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
