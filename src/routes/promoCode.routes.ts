import { Router } from 'express';
import { protect, admin } from '../middleware/auth.middleware';
import {
    createPromoCode,
    getPromoCodes,
    togglePromoCodeStatus,
    validatePromoCode
} from '../controllers/promoCode.controller';

const router = Router();

// Public/User Routes
router.post('/validate', protect, validatePromoCode);

// Admin Routes
router.post('/', protect, admin, createPromoCode);
router.get('/', protect, admin, getPromoCodes);
router.post('/:id/toggle', protect, admin, togglePromoCodeStatus);

export default router;
