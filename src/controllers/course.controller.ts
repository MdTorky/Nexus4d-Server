import { Request, Response } from 'express';
import Course from '../models/Course';
import Chapter from '../models/Chapter';
import Notification from '../models/Notification';
import Avatar from '../models/Avatar';
import UserCourse from '../models/UserCourse';
// import EmailService from '../services/email.service';

// @desc    Create a new course (Admin Only)
// @route   POST /api/courses
// @access  Private (Admin)
export const createCourse = async (req: Request, res: Response) => {
    try {
        const { 
            title, description, 
            category, status,
            level, tutor_id,
            completion_xp_bonus, reward_avatar_id, total_duration 
        } = req.body;

        let packages = req.body.packages;
        if (typeof packages === 'string') {
            try {
                packages = JSON.parse(packages);
            } catch (e) {
                console.error("Failed to parse packages", e);
                packages = {
                    basic: { price: 0, features: [] },
                    advanced: { price: 0, features: [] },
                    premium: { price: 0, features: [] }
                };
            }
        }

        // Check file
        const thumbnail_url = req.file ? (req.file as any).path : '';

        if (!thumbnail_url) {
            return res.status(400).json({ message: 'Thumbnail image is required' });
        }

        const course = await Course.create({
            title,
            description,
            thumbnail_url,
            packages,
            category,
            level,
            tutor_id,
            completion_xp_bonus: Number(completion_xp_bonus),
            reward_avatar_id: reward_avatar_id || null,
            total_duration,
            status: status || 'ongoing'
        });

        res.status(201).json(course);
    } catch (error: any) {
        res.status(500).json({ message: error.message });
    }
};

// @desc    Update a course
// @route   PUT /api/courses/:id
// @access  Private (Admin)
export const updateCourse = async (req: Request, res: Response) => {
    try {
         const { 
            title, description, 
            category, status,
            level, tutor_id,
            completion_xp_bonus, reward_avatar_id, total_duration 
        } = req.body;

        let packages = req.body.packages;
        if (typeof packages === 'string') {
            try {
                packages = JSON.parse(packages);
            } catch (e) {
                console.error("Failed to parse packages", e);
            }
        }

        const updates: any = {
            title, description, 
            category, status,
            level, tutor_id,
            completion_xp_bonus, 
            reward_avatar_id: reward_avatar_id || null,
            total_duration
        };

        if (packages) {
            updates.packages = packages;
        }

        if (req.file) {
            updates.thumbnail_url = (req.file as any).path;
        }

        const course = await Course.findByIdAndUpdate(
            req.params.id,
            updates,
            { new: true }
        );

        if (!course) {
            return res.status(404).json({ message: 'Course not found' });
        }

        res.json(course);
    } catch (error: any) {
        res.status(500).json({ message: error.message });
    }
};

// @desc    Create Chapter (Admin Only)
// @route   POST /api/courses/:id/chapters
// @access  Private (Admin)
export const createChapter = async (req: Request, res: Response) => {
    try {
        const courseId = req.params.id;
        const { title, description, position, is_free, xp_reward } = req.body;

        const course = await Course.findById(courseId);
        if (!course) return res.status(404).json({ message: 'Course not found' });

        let video_url = '';
        if (req.file) {
             const { R2Service } = await import('../services/r2.service');
             video_url = await R2Service.uploadFile(req.file, `courses/${courseId}`);
        }

        const chapterData: any = {
            course_id: courseId,
            title,
            description,
            position: Number(position),
            is_free: is_free === 'true' || is_free === true,
            xp_reward: Number(xp_reward) || 10,
            materials: []
        };

        // Legacy support: If video uploaded, add as first material
        if (video_url) {
            chapterData.materials.push({
                title: 'Main Video',
                type: 'video',
                url: video_url
            });
        }

        const chapter = await Chapter.create(chapterData);

        course.total_chapters = (course.total_chapters || 0) + 1;
        await course.save();

        res.status(201).json(chapter);
    } catch (error: any) {
        console.error("Create Chapter Error:", error);
        res.status(500).json({ message: error.message });
    }
};

// @desc    Update Chapter (Admin Only)
// @route   PUT /api/courses/:courseId/chapters/:chapterId
// @access  Private (Admin)
export const updateChapter = async (req: Request, res: Response) => {
    try {
        const { chapterId } = req.params;
        const { title, description, is_free, xp_reward } = req.body;

        const chapter = await Chapter.findByIdAndUpdate(
            chapterId,
            {
                title,
                description,
                is_free: is_free === 'true' || is_free === true,
                xp_reward: Number(xp_reward)
            },
            { new: true }
        );

        if (!chapter) return res.status(404).json({ message: 'Chapter not found' });

        res.json(chapter);
    } catch (error: any) {
        res.status(500).json({ message: error.message });
    }
};

// @desc    Delete Chapter (Admin Only)
// @route   DELETE /api/courses/:courseId/chapters/:chapterId
// @access  Private (Admin)
export const deleteChapter = async (req: Request, res: Response) => {
    try {
        const { courseId, chapterId } = req.params;

        const chapter = await Chapter.findByIdAndDelete(chapterId);
        if (!chapter) return res.status(404).json({ message: 'Chapter not found' });

        // Update course chapter count
        const course = await Course.findById(courseId);
        if (course) {
            course.total_chapters = Math.max(0, (course.total_chapters || 0) - 1);
            await course.save();
        }

        res.json({ message: 'Chapter deleted' });
    } catch (error: any) {
        res.status(500).json({ message: error.message });
    }
};

// @desc    Get Tutor's Assigned Courses (Read Only)
// @route   GET /api/tutors/courses
// @access  Private (Tutor)
export const getTutorCourses = async (req: Request, res: Response) => {
    try {
        // Find courses where this user is the assigned tutor
        const courses = await Course.find({ tutor_id: req.user._id }).sort({ createdAt: -1 });
        res.json(courses);
    } catch (error: any) {
        res.status(500).json({ message: error.message });
    }
};

// @desc    Get Course Details (Admin/Tutor View)
// @route   GET /api/courses/:id/edit
// @access  Private (Admin/Tutor)
export const getCourseForEdit = async (req: Request, res: Response) => {
    try {
        const course = await Course.findById(req.params.id);
        if (!course) return res.status(404).json({ message: 'Course not found' });

        // Admin can view any. Tutor can only view their own.
        if (req.user.role !== 'admin' && course.tutor_id?.toString() !== req.user._id.toString()) {
             return res.status(403).json({ message: 'Not authorized' });
        }
        
        const chapters = await Chapter.find({ course_id: course._id }).sort({ position: 1 });

        res.json({ course, chapters });
    } catch (error: any) {
        res.status(500).json({ message: error.message });
    }
};

// @desc    Get all courses (Public/Admin filter)
// @route   GET /api/courses
// @access  Public
export const getCourses = async (req: Request, res: Response) => {
    try {
        // If Admin, show all including disabled. If Public, show only 'ongoing' or 'complete'.
        let allowedStatuses = ['ongoing', 'complete'];
        
        // req.user is populated by optionalAuth middleware if token is present
        if (req.user && (req.user as any).role === 'admin') {
            allowedStatuses.push('disabled');
        }

        const courses = await Course.find({ status: { $in: allowedStatuses } })
            .populate('tutor_id', 'username first_name last_name current_avatar_url');
        res.json(courses);
    } catch (error: any) {
        res.status(500).json({ message: error.message });
    }
};

// @desc    Get course details (Public)
// @route   GET /api/courses/:id
// @access  Public
export const getCourseById = async (req: Request, res: Response) => {
    try {
        const course = await Course.findOne({ _id: req.params.id })
            .populate('tutor_id', 'username first_name last_name current_avatar_url level bio expertise tutor_profile_image')
            .populate('reward_avatar_id', 'name image_url rarity type');

        if (!course) {
            return res.status(404).json({ message: 'Course not found' });
        }

        const chapters = await Chapter.find({ course_id: course._id }).sort({ position: 1 });
        
        // Merge Tutor Application Data (Bio, Expertise, Real Photo)
        // This ensures best-of-both-worlds: Real Info + Gamified Stats
        let courseObj: any = course.toObject();
        
        if (courseObj.tutor_id) { // explicit check
             const { default: TutorApplication } = await import('../models/TutorApplication'); // Lazy import to avoid circular dependency issues if any
             const tutorApp = await TutorApplication.findOne({
                 user_id: courseObj.tutor_id._id,
                 status: 'approved'
             });

             if (tutorApp) {
                 courseObj.tutor_id = {
                     ...courseObj.tutor_id,
                     bio: tutorApp.bio || courseObj.tutor_id.bio,
                     expertise: tutorApp.specialization || courseObj.tutor_id.expertise,
                     tutor_profile_image: tutorApp.profile_picture_url || courseObj.tutor_id.tutor_profile_image
                 };
             }
        }

        res.json({ ...courseObj, chapters });
    } catch (error: any) {
        res.status(500).json({ message: error.message });
    }
};

// @desc    Add material to a chapter
// @route   POST /api/courses/:courseId/chapters/:chapterId/materials
// @access  Private (Admin)
export const addMaterialToChapter = async (req: Request, res: Response) => {
    try {
        const { title, description, type, min_package_tier, url } = req.body;
        const { courseId, chapterId } = req.params;

        // 1. Upload to R2 if file exists
        let finalUrl = url;
        if (req.file) {
             const { R2Service } = await import('../services/r2.service');
             // Pass only the folder path. The service handles naming and returns the full public URL.
             finalUrl = await R2Service.uploadFile(req.file, `courses/${courseId}`);
        }

        // 2. Update Chapter
        const chapter = await Chapter.findByIdAndUpdate(
            chapterId,
            {
                $push: {
                    materials: {
                        title,
                        description,
                        type,
                        url: finalUrl
                    }
                }
            },
            { new: true }
        );

        if (!chapter) return res.status(404).json({ message: 'Chapter not found' });

        res.json(chapter);

    } catch (error: any) {
        res.status(500).json({ message: error.message });
    }
};

// @desc    Update material in a chapter
// @route   PUT /api/courses/:courseId/chapters/:chapterId/materials/:materialIndex
// @access  Private (Admin)
export const updateMaterial = async (req: Request, res: Response) => {
    try {
        const { title, description, type, min_package_tier, url } = req.body;
        const { courseId, chapterId, materialIndex } = req.params;
        const index = parseInt(materialIndex);

        const chapter = await Chapter.findById(chapterId);
        if (!chapter) return res.status(404).json({ message: 'Chapter not found' });

        const materials = chapter.materials;
        if (!materials || !materials[index]) {
            return res.status(404).json({ message: 'Material not found' });
        }

        // 1. Upload new file if provided
        let finalUrl = url;
        if (req.file) {
             const { R2Service } = await import('../services/r2.service');
             
             // Delete old file if it exists and we are replacing it
             const oldUrl = materials[index].url;
             if (oldUrl) {
                 await R2Service.deleteFile(oldUrl);
             }

             finalUrl = await R2Service.uploadFile(req.file, `courses/${courseId}`);
        } else if (!url) {
            // Keep existing URL if not updating file/url
            finalUrl = materials[index].url;
        }

        // 2. Update the material at specific index
        // We need to mark the modified path if we modify valid array directly on document,
        // but here we are modifying the extracted array. Better to update directly on doc via cast.
        chapter.materials[index] = {
            _id: materials[index]._id, // Keep original ID
             title,
             description,
             type,
             url: finalUrl,
             min_package_tier: min_package_tier || materials[index].min_package_tier
        };

        chapter.markModified('materials');
        await chapter.save();
        res.json(chapter);

    } catch (error: any) {
        res.status(500).json({ message: error.message });
    }
};

// @desc    Delete material from a chapter
// @route   DELETE /api/courses/:courseId/chapters/:chapterId/materials/:materialIndex
// @access  Private (Admin)
export const deleteMaterial = async (req: Request, res: Response) => {
    try {
        const { chapterId, materialIndex } = req.params;
        const index = parseInt(materialIndex);

        const chapter = await Chapter.findById(chapterId);
        if (!chapter) return res.status(404).json({ message: 'Chapter not found' });

        const materials = chapter.materials;
        if (!materials || !materials[index]) {
            return res.status(404).json({ message: 'Material not found' });
        }

        // Delete file from R2
        const fileUrl = materials[index].url;
        if (fileUrl) {
            const { R2Service } = await import('../services/r2.service');
            await R2Service.deleteFile(fileUrl);
        }

        // Remove from array
        materials.splice(index, 1);
        
        chapter.markModified('materials');
        await chapter.save();

        res.json(chapter);

    } catch (error: any) {
        res.status(500).json({ message: error.message });
    }
};
// @desc    Enroll in a course (Manual Payment with Receipt)
// @route   POST /api/courses/:id/enroll
// @access  Private
export const enrollCourse = async (req: Request, res: Response) => {
    try {
        const { id } = req.params;
        const receiptFile = req.file;

        const course = await Course.findById(id);
        if (!course) return res.status(404).json({ message: 'Course not found' });
        
        const packageTier = (req.body.package as 'basic' | 'advanced' | 'premium') || 'basic';
        
        // Calculate Final Price with Promo Code
        let finalPrice = course.packages[packageTier]?.price || 0;
        let discountApplied = 0;
        let promoCodeUsed = null;

        if (req.body.promoCode) {
            const { default: PromoCode } = await import('../models/PromoCode');
            const code = await PromoCode.findOne({ code: req.body.promoCode.toUpperCase() });

            if (code && code.isActive) {
                const now = new Date();
                const isValidDate = now >= code.validFrom && now <= code.validUntil;
                const limitReached = code.usageLimit && code.usedCount >= code.usageLimit;
                
                // Check Restrictions
                const isApplicableCourse = !code.applicableCourses?.length || code.applicableCourses.some(cid => cid.toString() === id);
                const isApplicablePackage = !code.applicablePackages?.length || code.applicablePackages.includes(packageTier);

                if (isValidDate && !limitReached && isApplicableCourse && isApplicablePackage) {
                    if (code.discountType === 'percentage') {
                        discountApplied = (finalPrice * code.discountValue) / 100;
                    } else {
                        discountApplied = code.discountValue;
                    }
                    
                    finalPrice = Math.max(0, finalPrice - discountApplied);
                    promoCodeUsed = code;
                }
            }
        }

        // 1. Get Receipt URL (Required only if finalPrice > 0)
        let receipt_url = '';
        if (finalPrice > 0) {
            if (!req.file) {
                return res.status(400).json({ message: 'Payment receipt is required' });
            }
            receipt_url = req.file.path;
        } else {
            receipt_url = 'COUPON_FREE'; // Placeholder for zero-cost
        }

        // 2. Check existing enrollment
        const { default: UserCourse } = await import('../models/UserCourse');
        let enrollment = await UserCourse.findOne({ user_id: req.user._id, course_id: id });

        // Determine Status: If free, auto-approve (completed/active). If paid, pending.
        const newStatus = finalPrice === 0 ? 'active' : 'pending';

        if (enrollment) {
            // Update Existing Logic
            if (enrollment.status === 'rejected' || enrollment.status === 'pending' || ((enrollment.status === 'active' || enrollment.status === 'completed') && enrollment.package !== packageTier)) {
                
                enrollment.status = newStatus;
                enrollment.receipt_url = receipt_url;
                enrollment.package = packageTier;
                enrollment.amount_paid = finalPrice;
                enrollment.rejection_reason = undefined;
                
                if (promoCodeUsed) {
                    enrollment.promo_code = promoCodeUsed.code;
                    enrollment.promo_code_id = promoCodeUsed._id;
                }

                await enrollment.save();

                // If promo code used and actually free, increment count now? 
                // Previously it was done inside the promo check block but that was premature if enrollment failed.
                // We should increment it here if successful.
                if (promoCodeUsed) {
                     promoCodeUsed.usedCount += 1;
                     await promoCodeUsed.save();
                }

                // If auto-approved (free), update course student count?
                if (newStatus === 'active') {
                     // We might want to trigger the approval logic (notifications etc) here,
                     // but for now let's just save. The admin usually approves.
                     // But if it's free, it should be instant.
                     // Let's add student count update at least.
                     const count = await UserCourse.countDocuments({ course_id: id, status: 'active' });
                     await Course.findByIdAndUpdate(id, { enrolled_students: count });
                }

                return res.json({ message: finalPrice === 0 ? 'Enrollment successful' : 'Enrollment submitted for review', enrollment });
            }
            return res.status(400).json({ message: `You are already active on the ${enrollment.package} package.` });
        }

        // 3. Create New Enrollment
        enrollment = await UserCourse.create({
            user_id: req.user._id,
            course_id: id,
            package: packageTier,
            amount_paid: finalPrice,
            status: newStatus,
            receipt_url,
            promo_code: promoCodeUsed ? promoCodeUsed.code : undefined,
            promo_code_id: promoCodeUsed ? promoCodeUsed._id : undefined
        });

        if (promoCodeUsed) {
            promoCodeUsed.usedCount += 1;
            await promoCodeUsed.save();
        }

        if (newStatus === 'active') {
             const count = await UserCourse.countDocuments({ course_id: id, status: 'active' });
             await Course.findByIdAndUpdate(id, { enrolled_students: count });
        }

        res.status(201).json({ message: 'Enrollment submitted for review', enrollment });
    } catch (error: any) {
        console.error("Enrollment Error:", error);
        res.status(500).json({ message: error.message });
    }
};

// @desc    Get Secure Course Content (Player)
// @route   GET /api/courses/:id/content
// @access  Private (Enrolled User)
export const getSecureCourseContent = async (req: Request, res: Response) => {
    try {
        const { id } = req.params;

        // 1. Check Enrollment
        const { default: UserCourse } = await import('../models/UserCourse');
        const enrollment = await UserCourse.findOne({ user_id: req.user._id, course_id: id });

        if (!enrollment) {
            return res.status(403).json({ message: 'Not enrolled in this course' });
        }

        // 2. Fetch Course & Chapters
        const course = await Course.findById(id);
        if (!course) return res.status(404).json({ message: 'Course not found' });

        const chapters = await Chapter.find({ course_id: id }).sort({ position: 1 });

        // Filter contents based on Package Tier
        const userPackage = enrollment.package || 'basic';
        const tiers = { basic: 1, advanced: 2, premium: 3 };
        const userTierValue = tiers[userPackage as keyof typeof tiers];

        const secureChapters = chapters.map(chapter => {
            const filteredMaterials = chapter.materials.filter((m) => {
                const materialTierValue = tiers[m.min_package_tier as keyof typeof tiers] || 1;
                return userTierValue >= materialTierValue;
            });
            return { ...chapter.toObject(), materials: filteredMaterials };
        });
        
        res.json({ 
            course: { _id: course._id, title: course.title, thumbnail_url: course.thumbnail_url },
            chapters: secureChapters,
            userProgress: enrollment
        });



    } catch (error: any) {
        res.status(500).json({ message: error.message });
    }
};

export const checkEnrollment = async (req: Request, res: Response) => {
    try {
        const { default: UserCourse } = await import('../models/UserCourse');
        const enrollment = await UserCourse.findOne({ user_id: req.user._id, course_id: req.params.id });
        res.json({ isEnrolled: !!enrollment, enrollment });
    } catch (error: any) {
        res.status(500).json({ message: error.message });
    }
};

// @desc    Get My Enrolled Courses (Student)
// @route   GET /api/courses/my-courses
// @access  Private
export const getMyEnrolledCourses = async (req: Request, res: Response) => {
    try {
        const { default: UserCourse } = await import('../models/UserCourse');
        
        const enrollments = await UserCourse.find({ user_id: req.user._id })
            .populate({
                path: 'course_id',
                select: 'title thumbnail_url description level total_duration completion_xp_bonus tutor_id major',
                populate: {
                    path: 'tutor_id',
                    select: 'first_name last_name username current_avatar_url tutor_profile_image'
                }
            })
            .sort({ updatedAt: -1 });

        res.json(enrollments);
    } catch (error: any) {
        res.status(500).json({ message: error.message });
    }
};
// @desc    Get all pending enrollments
// @route   GET /api/admin/enrollments
// @access  Private (Admin)
export const getPendingEnrollments = async (req: Request, res: Response) => {
    try {
        const { default: UserCourse } = await import('../models/UserCourse');
        const enrollments = await UserCourse.find({ status: 'pending' })
            .populate('user_id', 'username email first_name last_name')
            .populate('course_id', 'title price')
            .sort({ createdAt: -1 });
        res.json(enrollments);
    } catch (error: any) {
        res.status(500).json({ message: error.message });
    }
};

// @desc    Approve enrollment
// @route   POST /api/admin/enrollments/:id/approve
// @access  Private (Admin)
export const approveEnrollment = async (req: Request, res: Response) => {
    try {
        const { id } = req.params;
        const { default: UserCourse } = await import('../models/UserCourse');
        const { default: Notification } = await import('../models/Notification');
        const { EmailService } = await import('../services/email.service');

        const enrollment = await UserCourse.findById(id).populate('user_id').populate('course_id');
        if (!enrollment) return res.status(404).json({ message: 'Enrollment not found' });

        enrollment.status = 'active';
        await enrollment.save();

        // Notify User
        const user = enrollment.user_id as any;
        const course = enrollment.course_id as any;

        // Update Course Student Count
        const studentCount = await UserCourse.countDocuments({ course_id: course._id, status: 'active' });
        await Course.findByIdAndUpdate(course._id, { enrolled_students: studentCount });

        // 1. In-App Notification
        // 1. In-App Notification
        await Notification.create({
            user_id: user._id,
            title: 'Enrollment Approved',
            message: `Your enrollment for ${course.title} has been approved!`,
            type: 'success'
        });

        // 2. Email Notification
        await EmailService.sendApprovalEmail(user.email, user.first_name || user.username, course.title);

        res.json({ message: 'Enrollment approved', enrollment });
    } catch (error: any) {
        res.status(500).json({ message: error.message });
    }
};

// @desc    Reject enrollment
// @route   POST /api/admin/enrollments/:id/reject
// @access  Private (Admin)
export const rejectEnrollment = async (req: Request, res: Response) => {
    try {
        const { id } = req.params;
        const { reason } = req.body;
        const { default: UserCourse } = await import('../models/UserCourse');
        const { default: Notification } = await import('../models/Notification');
        const { EmailService } = await import('../services/email.service');

        const enrollment = await UserCourse.findById(id).populate('user_id').populate('course_id');
        if (!enrollment) return res.status(404).json({ message: 'Enrollment not found' });

        enrollment.status = 'rejected';
        enrollment.rejection_reason = reason || 'Payment verification failed';
        await enrollment.save();

        // Notify User
        const user = enrollment.user_id as any;
        const course = enrollment.course_id as any;

        // 1. In-App Notification
        // 1. In-App Notification
        await Notification.create({
            user_id: user._id,
            title: 'Enrollment Rejected',
            message: `Enrollment for ${course.title} rejected. Reason: ${enrollment.rejection_reason}`,
            type: 'error'
        });

        // 2. Email Notification
        await EmailService.sendRejectionEmail(user.email, user.first_name || user.username, course.title, enrollment.rejection_reason || 'Payment verification failed');

        // Update Course Student Count (in case we rejected an active user)
        const studentCount = await UserCourse.countDocuments({ course_id: course._id, status: 'active' });
        await Course.findByIdAndUpdate(course._id, { enrolled_students: studentCount });

        res.json({ message: 'Enrollment rejected', enrollment });
    } catch (error: any) {
        res.status(500).json({ message: error.message });
    }
};
// @desc    Get all enrollments with filtering
// @route   GET /api/admin/enrollments/all
// @access  Private (Admin)
export const getAllEnrollments = async (req: Request, res: Response) => {
    try {
        const { status, package: pkg, course_id, search } = req.query;
        const { default: UserCourse } = await import('../models/UserCourse');

        let query: any = {};

        if (status && status !== 'all') {
            query.status = status;
        }

        if (pkg && pkg !== 'all') {
            query.package = pkg;
        }

        if (course_id && course_id !== 'all') {
            query.course_id = course_id;
        }

        // Search by User (Username or Email) - Requires Lookup or Separate Query
        // For simplicity/performance with Mongoose, we'll fetch users first if search is present
        if (search) {
             const { default: User } = await import('../models/User');
             const users = await User.find({
                 $or: [
                     { username: { $regex: search, $options: 'i' } },
                     { email: { $regex: search, $options: 'i' } },
                     { first_name: { $regex: search, $options: 'i' } },
                     { last_name: { $regex: search, $options: 'i' } }
                 ]
             }).select('_id');
             
             const userIds = users.map(u => u._id);
             query.user_id = { $in: userIds };
        }

        const enrollments = await UserCourse.find(query)
            .populate('user_id', 'username email first_name last_name')
            .populate('course_id', 'title price')
            .sort({ createdAt: -1 });

        res.json(enrollments);
    } catch (error: any) {
        res.status(500).json({ message: error.message });
    }
};

// @desc    Get enrollment analytics
// @route   GET /api/admin/enrollments/analytics
// @access  Private (Admin)
export const getEnrollmentAnalytics = async (req: Request, res: Response) => {
    try {
        const { default: UserCourse } = await import('../models/UserCourse');
        
        // 1. Total Revenue (Active/Completed only)
        const revenueAgg = await UserCourse.aggregate([
            { $match: { status: { $in: ['active', 'completed'] } } },
            { $group: { _id: null, total: { $sum: '$amount_paid' } } }
        ]);
        const totalRevenue = revenueAgg[0]?.total || 0;

        // 2. Counts by Status
        // We want all statuses including pending/rejected for overview
        const statusCounts = await UserCourse.aggregate([
            { $group: { _id: '$status', count: { $sum: 1 } } }
        ]);
        const counts = {
            active: 0, pending: 0, rejected: 0, completed: 0
        };
        statusCounts.forEach((s: any) => {
             if (counts.hasOwnProperty(s._id)) {
                 (counts as any)[s._id] = s.count;
             }
        });
        const totalEnrollments = Object.values(counts).reduce((a, b) => a + b, 0);

        // 3. Package Distribution
        const packageCounts = await UserCourse.aggregate([
             { $match: { status: { $in: ['active', 'completed'] } } },
             { $group: { _id: '$package', count: { $sum: 1 } } }
        ]);

        // 4. Enrollments per Course (Top 5)
        const coursePopularity = await UserCourse.aggregate([
             { $match: { status: { $in: ['active', 'completed'] } } },
             { $group: { _id: '$course_id', count: { $sum: 1 }, revenue: { $sum: '$amount_paid' } } },
             { $sort: { revenue: -1 } },
             { $limit: 5 },
             { $lookup: { from: 'courses', localField: '_id', foreignField: '_id', as: 'course' } },
             { $unwind: '$course' },
             { $project: { title: '$course.title', count: 1, revenue: 1 } }
        ]);

        res.json({
            totalRevenue,
            totalEnrollments,
            statusCounts: counts,
            packageCounts,
            coursePopularity
        });

    } catch (error: any) {
        res.status(500).json({ message: error.message });
    }
};

// @desc    Get global course analytics (Admin)
// @route   GET /api/courses/admin/analytics
// @access  Private/Admin
export const getCourseGlobalAnalytics = async (req: Request, res: Response) => {
    try {
        const [totalCourses, statusCounts, categoryCounts, levelCounts, totalStudents] = await Promise.all([
            // 1. Total Courses
            Course.countDocuments(),

            // 2. Status Breakdown
            Course.aggregate([
                { $group: { _id: '$status', count: { $sum: 1 } } }
            ]),

            // 3. Category Distribution
            Course.aggregate([
                { $group: { _id: '$category', count: { $sum: 1 } } },
                { $sort: { count: -1 } }
            ]),

            // 4. Level Distribution
            Course.aggregate([
                { $group: { _id: '$level', count: { $sum: 1 } } }
            ]),

            // 5. Total Students Across All Courses
            Course.aggregate([
                { $group: { _id: null, total: { $sum: '$enrolled_students' } } }
            ])
        ]);

        res.json({
            totalCourses,
            statusCounts: statusCounts.reduce((acc: any, curr: any) => ({ ...acc, [curr._id]: curr.count }), {}),
            categoryCounts: categoryCounts.map((c: any) => ({ name: c._id, value: c.count })),
            levelCounts: levelCounts.map((l: any) => ({ name: l._id, count: l.count })),
            totalStudents: totalStudents[0]?.total || 0
        });
    } catch (error: any) {
        res.status(500).json({ message: error.message });
    }
};

// @desc    Toggle Material Completion
// @route   POST /api/courses/:id/materials/:materialId/toggle
// @access  Private
export const toggleMaterialCompletion = async (req: Request, res: Response) => {
    try {
        const { id, materialId } = req.params;
        const userId = (req as any).user._id;

        const userCourse = await UserCourse.findOne({ user_id: userId, course_id: id });

        if (!userCourse) {
            return res.status(404).json({ message: 'Enrollment not found' });
        }

        // Initialize if undefined
        if (!userCourse.completed_material_ids) userCourse.completed_material_ids = [];
        if (!userCourse.completed_chapter_ids) userCourse.completed_chapter_ids = [];

        const isCompleted = userCourse.completed_material_ids.map(String).includes(materialId);

        if (isCompleted) {
            // Remove
            userCourse.completed_material_ids = userCourse.completed_material_ids.filter(m => m.toString() !== materialId);
        } else {
            // Add
            userCourse.completed_material_ids.push(materialId as any);
        }

        // Recalculate Progress - RESPECTING PACKAGE TIERS
        const chapters = await Chapter.find({ course_id: id });
        const userPackage = userCourse.package || 'basic';
        const TIERS = { basic: 1, advanced: 2, premium: 3 };
        const userTierValue = TIERS[userPackage as keyof typeof TIERS] || 1;
        
        let totalAccessibleMaterials = 0;
        let completedAccessibleMaterials = 0;
        const newCompletedChapters: string[] = [];

        for (const chapter of chapters) {
            const chapMaterials = chapter.materials || [];
            
            // Filter materials based on user's package
            const accessibleMaterials = chapMaterials.filter(m => {
                 const matTier = TIERS[m.min_package_tier as keyof typeof TIERS] || 1;
                 return userTierValue >= matTier;
            });

            totalAccessibleMaterials += accessibleMaterials.length;

            let chapterCompletedMaterials = 0;
            for (const mat of accessibleMaterials) {
                if (mat._id && userCourse.completed_material_ids.map(String).includes(mat._id.toString())) {
                    completedAccessibleMaterials++;
                    chapterCompletedMaterials++;
                }
            }

            // Check if chapter is fully complete (based on accessible materials)
            if (accessibleMaterials.length > 0 && chapterCompletedMaterials === accessibleMaterials.length) {
                newCompletedChapters.push(chapter._id.toString());
            }
        }

        userCourse.progress = totalAccessibleMaterials > 0 ? Math.round((completedAccessibleMaterials / totalAccessibleMaterials) * 100) : 0;
        userCourse.completed_chapter_ids = newCompletedChapters as any;
        
        // Update status if 100
        if (userCourse.progress === 100 && userCourse.status === 'active') {
             userCourse.status = 'completed';
        } else if (userCourse.progress < 100 && userCourse.status === 'completed') {
             userCourse.status = 'active';
        }

        await userCourse.save();

        res.json({ 
            success: true, 
            completed: !isCompleted, 
            progress: userCourse.progress,
            completedChapters: userCourse.completed_chapter_ids
        });

    } catch (error: any) {
        res.status(500).json({ message: error.message });
    }
};

// @desc    Claim Chapter XP Reward
// @route   POST /api/courses/:id/chapters/:chapterId/claim
// @access  Private
export const claimChapterReward = async (req: Request, res: Response) => {
    try {
        const { id, chapterId } = req.params;
        const userId = (req as any).user._id;

        const userCourse = await UserCourse.findOne({ user_id: userId, course_id: id });
        if (!userCourse) return res.status(404).json({ message: 'Enrollment not found' });

        // Verify completion
        if (!userCourse.completed_chapter_ids.map(String).includes(chapterId)) {
            return res.status(400).json({ message: 'Chapter not completed yet' });
        }

        // Verify not already claimed
        if (!userCourse.claimed_chapter_ids) userCourse.claimed_chapter_ids = [];
        if (userCourse.claimed_chapter_ids.map(String).includes(chapterId)) {
            return res.status(400).json({ message: 'Reward already claimed' });
        }

        // Fetch Chapter to get XP amount
        const chapter = await Chapter.findById(chapterId);
        if (!chapter) return res.status(404).json({ message: 'Chapter not found' });

        // Add XP to User
        const { default: User } = await import('../models/User');
        const user = await User.findById(userId);
        
        let isLeveledUp = false;
        let tokensEarned = 0;

        if (user) {
            const oldLevel = user.level;
            user.xp_points = (user.xp_points || 0) + (chapter.xp_reward || 0);
            await user.save(); // Hook runs here and updates level/tokens

             isLeveledUp = user.level > oldLevel;
             tokensEarned = isLeveledUp ? (user.level - oldLevel) : 0;
            
             if (isLeveledUp) {
                 const { default: Notification } = await import('../models/Notification');
                 await Notification.create({
                    user_id: user._id,
                    title: 'Level Up!',
                    message: `You reached Level ${user.level} and earned ${tokensEarned} Token(s)!`,
                    type: 'success'
                });
            }
        }

        // Mark claimed
        userCourse.claimed_chapter_ids.push(chapterId as any);
        await userCourse.save();

        res.json({
            success: true,
            claimedXp: chapter.xp_reward,
            newTotalXp: user?.xp_points,
            newLevel: user?.level,
            leveledUp: isLeveledUp,
            tokensEarned,
            newTokens: user?.avatar_unlock_tokens // Return total tokens
        });

    } catch (error: any) {
        res.status(500).json({ message: error.message });
    }
};

// @desc    Claim Course Completion Rewards (XP + Avatar)
// @route   POST /api/courses/:id/claim-rewards
// @access  Private
export const claimCourseReward = async (req: Request, res: Response) => {
    try {
        const { id } = req.params;
        const userId = (req as any).user._id;

        const userCourse = await UserCourse.findOne({ user_id: userId, course_id: id });
        if (!userCourse) return res.status(404).json({ message: 'Enrollment not found' });

        if (userCourse.progress < 100) {
            return res.status(400).json({ message: 'Course not 100% completed' });
        }

        if (userCourse.is_course_reward_claimed) {
            return res.status(400).json({ message: 'Rewards already claimed' });
        }

        const course = await Course.findById(id).populate('reward_avatar_id');
        if (!course) return res.status(404).json({ message: 'Course not found' });

        const { default: User } = await import('../models/User');
        const user = await User.findById(userId);
        if (!user) return res.status(404).json({ message: 'User not found' });

        // 1. Grant XP
        const xpBonus = course.completion_xp_bonus || 0;
        user.xp_points = (user.xp_points || 0) + xpBonus;

        // 2. Unlock Avatar (if exists)
        let unlockedAvatar = null;
        if (course.reward_avatar_id) {
             const avatarId = (course.reward_avatar_id as any)._id || course.reward_avatar_id;
             
             const { default: UserAvatar } = await import('../models/UserAvatar');
             
             // Check if already owned (idempotency)
             const existing = await UserAvatar.findOne({ user_id: userId, avatar_id: avatarId });
             if (!existing) {
                 await UserAvatar.create({
                     user_id: userId,
                     avatar_id: avatarId
                 });
             }
             unlockedAvatar = course.reward_avatar_id;
        }
        
        const oldLevel = user.level;
        await user.save();
        
        const isLeveledUp = user.level > oldLevel;
        const tokensEarned = isLeveledUp ? (user.level - oldLevel) : 0;

        userCourse.is_course_reward_claimed = true;
        await userCourse.save();

        // 3. Notification
        await Notification.create({
            user_id: userId,
            title: 'Course Completed!',
            message: `Congratulations! You completed ${course.title} and earned ${xpBonus} XP.`,
            type: 'success' // Enum: info, success, warning, error
        });

        if (isLeveledUp) {
             await Notification.create({
                user_id: userId,
                title: 'Level Up!',
                message: `You reached Level ${user.level} and earned ${tokensEarned} Token(s)!`,
                type: 'success'
            });
        }

        res.json({
            success: true,
            claimedXp: xpBonus,
            newTotalXp: user.xp_points,
            newLevel: user.level,
            rewardAvatar: course.reward_avatar_id,
            leveledUp: isLeveledUp,
            tokensEarned,
            newTokens: user.avatar_unlock_tokens // Return total tokens
        });

    } catch (error: any) {
        res.status(500).json({ message: error.message });
    }
};