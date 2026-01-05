import { Router } from 'express';

const router = Router();

// @route   GET /api/courses
// @desc    Get all courses (Public/Filtered)
// @access  Public
router.get('/', (req, res) => {
    res.json({ message: 'Get all courses placeholder' });
});

// @route   GET /api/courses/:id
// @desc    Get course by ID
// @access  Public
router.get('/:id', (req, res) => {
    res.json({ message: `Get course ${req.params.id} placeholder` });
});

export default router;
