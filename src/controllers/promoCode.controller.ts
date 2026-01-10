import { Request, Response } from 'express';
import PromoCode from '../models/PromoCode';
import { z } from 'zod';

const createPromoCodeSchema = z.object({
    code: z.string().min(3).toUpperCase(),
    discountType: z.enum(['percentage', 'fixed']),
    discountValue: z.number().min(0),
    validFrom: z.string().or(z.date()),
    validUntil: z.string().or(z.date()),
    usageLimit: z.number().optional(),
    applicableCourses: z.array(z.string()).optional(),
    applicablePackages: z.array(z.enum(['basic', 'advanced', 'premium'])).optional()
});

// @desc    Create a new promo code
// @route   POST /api/promocodes
// @access  Private (Admin)
export const createPromoCode = async (req: Request, res: Response) => {
    try {
        const validatedData = createPromoCodeSchema.parse(req.body);
        
        const existing = await PromoCode.findOne({ code: validatedData.code });
        if (existing) {
            return res.status(400).json({ message: 'Promo code already exists' });
        }

        // Handle Date Logic
        // Ensure validUntil is the end of that day
        const validUntil = new Date(validatedData.validUntil);
        validUntil.setHours(23, 59, 59, 999);

        // Ensure validFrom handles potential timezone issues (default to 00:00 UTC is problematic for +8h)
        // If the user selects "Today", they want it valid immediately.
        // We can just rely on the stored date if we are okay with it, but setting it to start of day UTC
        // means people in +zones wait. 
        // A simple fix is to assume validFrom is inclusive of the whole UTC day, 
        // so maybe subtract 12-14 hours to cover all Eastern timezones? 
        // Or simply: strict check is fine if we tell them, but for UX, let's allow it.
        const validFrom = new Date(validatedData.validFrom);
        // No modification to validFrom for now to keep it deterministic, OR:
        // validFrom.setHours(0, 0, 0, 0); 
        
        const promoCode = await PromoCode.create({
            ...validatedData,
            validFrom,
            validUntil
        });
        
        res.status(201).json(promoCode);
    } catch (error: any) {
        res.status(400).json({ message: error.errors || error.message });
    }
};

// @desc    Get all promo codes
// @route   GET /api/promocodes
// @access  Private (Admin)
export const getPromoCodes = async (req: Request, res: Response) => {
    try {
        const codes = await PromoCode.find().sort({ createdAt: -1 });
        res.json(codes);
    } catch (error: any) {
        res.status(500).json({ message: error.message });
    }
};

// @desc    Toggle promo code status
// @route   POST /api/promocodes/:id/toggle
// @access  Private (Admin)
export const togglePromoCodeStatus = async (req: Request, res: Response) => {
    try {
        const { id } = req.params;
        const promoCode = await PromoCode.findById(id);
        
        if (!promoCode) {
            return res.status(404).json({ message: 'Promo code not found' });
        }

        promoCode.isActive = !promoCode.isActive;
        await promoCode.save();

        res.json(promoCode);
    } catch (error: any) {
        res.status(500).json({ message: error.message });
    }
};

// @desc    Validate promo code
// @route   POST /api/promocodes/validate
// @access  Private (User)
export const validatePromoCode = async (req: Request, res: Response) => {
    try {
        const { code, courseId, packageTier } = req.body;
        
        if (!code) return res.status(400).json({ message: 'Code is required' });

        const promoCode = await PromoCode.findOne({ code: code.toUpperCase() });

        if (!promoCode) {
            return res.status(404).json({ message: 'Invalid promo code' });
        }

        if (!promoCode.isActive) {
            return res.status(400).json({ message: 'This promo code is inactive' });
        }

        const now = new Date();
        if (now < promoCode.validFrom) {
            return res.status(400).json({ message: 'This promo code is not valid yet' });
        }
        if (now > promoCode.validUntil) {
             return res.status(400).json({ message: 'This promo code has expired' });
        }

        if (promoCode.usageLimit && promoCode.usedCount >= promoCode.usageLimit) {
            return res.status(400).json({ message: 'This promo code usage limit has been reached' });
        }

        // Check Course Restriction
        if (promoCode.applicableCourses && promoCode.applicableCourses.length > 0 && courseId) {
            const isApplicableCourse = promoCode.applicableCourses.some(id => id.toString() === courseId);
            if (!isApplicableCourse) {
                 return res.status(400).json({ message: 'This promo code is not valid for this course' });
            }
        }
        
        // Check Package Restriction
        if (promoCode.applicablePackages && promoCode.applicablePackages.length > 0 && packageTier) {
            if (!promoCode.applicablePackages.includes(packageTier)) {
                return res.status(400).json({ 
                    message: `This promo code is only valid for: ${promoCode.applicablePackages.join(', ')}` 
                });
            }
        }

        res.json({
            valid: true,
            code: promoCode.code,
            discountType: promoCode.discountType,
            discountValue: promoCode.discountValue
        });

    } catch (error: any) {
        res.status(500).json({ message: error.message });
    }
};
