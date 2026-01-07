import { Request, Response } from 'express';
import Course from '../models/Course';
import Chapter from '../models/Chapter';
import { R2Service } from '../services/r2.service';

// @desc    Create a new course (Admin Only)
// @route   POST /api/courses
// @access  Private (Admin)
export const createCourse = async (req: Request, res: Response) => {
    try {
        const { 
            title, description, 
            type, major, category, 
            level, packages, tutor_id,
            completion_xp_bonus, reward_avatar_id, total_duration 
        } = req.body;

        // Check file
        const thumbnail_url = req.file ? (req.file as any).path : '';

        if (!thumbnail_url) {
            return res.status(400).json({ message: 'Thumbnail image is required' });
        }

        const course = await Course.create({
            title,
            description,
            thumbnail_url,
            type,
            major: type === 'university' ? major : undefined,
            category: type === 'general' ? category : undefined,
            level,
            packages: typeof packages === 'string' ? JSON.parse(packages) : packages, // Handle FormData JSON string
            tutor_id,
            completion_xp_bonus: Number(completion_xp_bonus),
            reward_avatar_id: reward_avatar_id || null, // Convert empty string to null
            total_duration,
            status: 'ongoing'
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
            type, major, category, 
            level, packages, tutor_id, status,
            completion_xp_bonus, reward_avatar_id, total_duration 
        } = req.body;

        const updates: any = {
            title, description, 
            type, level, tutor_id, status,
            completion_xp_bonus, 
            reward_avatar_id: reward_avatar_id || null, // Convert empty string to null to unset/ignore
            total_duration
        };

        if (req.file) {
            updates.thumbnail_url = (req.file as any).path;
        }

        if (type === 'university') {
            updates.major = major;
            updates.category = undefined; 
        } else if (type === 'general') {
             updates.category = category;
             updates.major = undefined;
        }

        if (packages) {
            updates.packages = typeof packages === 'string' ? JSON.parse(packages) : packages;
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
                url: video_url,
                min_package_tier: 'basic'
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
        // If Admin, show all. If Public, show only 'ongoing' or 'complete'? 
        // Usually Public sees all active courses.
        const courses = await Course.find({ status: { $in: ['ongoing', 'complete'] } })
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
            .populate('tutor_id', 'username first_name last_name current_avatar_url');

        if (!course) {
            return res.status(404).json({ message: 'Course not found' });
        }

        const chapters = await Chapter.find({ course_id: course._id }).sort({ position: 1 });

        res.json({ ...course.toObject(), chapters });
    } catch (error: any) {
        res.status(500).json({ message: error.message });
    }
};

// @desc    Add material to a chapter
// @route   POST /api/courses/:courseId/chapters/:chapterId/materials
// @access  Private (Admin)
export const addMaterialToChapter = async (req: Request, res: Response) => {
    try {
        const { title, type, min_package_tier, url } = req.body;
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
                        type,
                        url: finalUrl,
                        min_package_tier: min_package_tier || 'basic'
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
        const { title, type, min_package_tier, url } = req.body;
        const { courseId, chapterId, materialIndex } = req.params;
        const index = parseInt(materialIndex);

        const chapter = await Chapter.findById(chapterId);
        if (!chapter) return res.status(404).json({ message: 'Chapter not found' });

        const materials = (chapter as any).materials;
        if (!materials || !materials[index]) {
            return res.status(404).json({ message: 'Material not found' });
        }

        // 1. Upload new file if provided
        let finalUrl = url;
        if (req.file) {
             const { R2Service } = await import('../services/r2.service');
             finalUrl = await R2Service.uploadFile(req.file, `courses/${courseId}`);
        } else if (!url) {
            // Keep existing URL if not updating file/url
            finalUrl = materials[index].url;
        }

        // 2. Update the material at specific index
        materials[index] = {
            title,
            type,
            url: finalUrl,
            min_package_tier: min_package_tier || 'basic'
        };

        // We need to mark the modified path if we modify valid array directly on document,
        // but here we are modifying the extracted array. Better to update directly on doc via cast.
        (chapter as any).materials[index] = {
             title,
             type,
             url: finalUrl,
             min_package_tier: min_package_tier || 'basic'
        };

        (chapter as any).markModified('materials');
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

        const materials = (chapter as any).materials;
        if (!materials || !materials[index]) {
            return res.status(404).json({ message: 'Material not found' });
        }

        // Remove from array
        materials.splice(index, 1);
        
        (chapter as any).markModified('materials');
        await chapter.save();

        res.json(chapter);

    } catch (error: any) {
        res.status(500).json({ message: error.message });
    }
};
