import { Router } from 'express';

const router = Router();

// @route   POST /api/payments/upload
// @desc    Upload payment receipt (Manual flow)
// @access  Private (Student)
router.post('/upload', (req, res) => {
    res.json({ message: 'Upload receipt placeholder' });
});

// @route   GET /api/payments/admin/pending
// @desc    Get all pending payments
// @access  Private (Admin)
router.get('/admin/pending', (req, res) => {
    res.json({ message: 'Get pending payments placeholder' });
});

export default router;
