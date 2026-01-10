import { Request, Response } from 'express';
import TutorApplication from '../models/TutorApplication';
import User from '../models/User';
import Notification from '../models/Notification';

// @desc    Get current user's tutor application status
// @route   GET /api/tutors/status
// @access  Private
export const getTutorStatus = async (req: Request, res: Response) => {
    try {
        const application = await TutorApplication.findOne({ user_id: req.user._id })
            .sort({ createdAt: -1 }); // Get latest
        
        if (!application) {
            return res.json({ status: 'none' });
        }

        res.json({ 
            status: application.status, 
            admin_notes: application.admin_notes,
            application_id: application._id 
        });
    } catch (error: any) {
        res.status(500).json({ message: error.message });
    }
};

// @desc    Submit a tutor application
// @route   POST /api/tutors/apply
// @access  Private (User must be logged in to apply)
export const applyAsTutor = async (req: Request, res: Response) => {
    try {
        const { full_name, email, specialization, bio, linkedin_profile, cv_url } = req.body;
        
        // Handle Image Upload
        let profile_picture_url = req.body.profile_picture_url; // Default if string passed
        if (req.file) {
            profile_picture_url = req.file.path; // Cloudinary URL
        }

        const user_id = req.user._id;

        // Check if already applied
        const existingApp = await TutorApplication.findOne({ user_id, status: 'pending' });
        if (existingApp) {
            return res.status(400).json({ message: 'You already have a pending application.' });
        }

        const application = await TutorApplication.create({
            user_id,
            full_name,
            email,
            specialization,
            bio,
            linkedin_profile,
            cv_url,
            profile_picture_url
        });

        res.status(201).json(application);
    } catch (error: any) {
        res.status(500).json({ message: error.message });
    }
};

// @desc    Get all tutor applications
// @route   GET /api/tutors/admin/applications
// @access  Private/Admin
export const getAllApplications = async (req: Request, res: Response) => {
    try {
        const applications = await TutorApplication.find().sort({ createdAt: -1 });
        res.json(applications);
    } catch (error: any) {
        res.status(500).json({ message: error.message });
    }
};

// @desc    Approve a tutor application
// @route   POST /api/tutors/admin/approve
// @access  Private/Admin
export const approveApplication = async (req: Request, res: Response) => {
    try {
        const { application_id } = req.body;

        const application = await TutorApplication.findById(application_id);
        if (!application) {
            return res.status(404).json({ message: 'Application not found' });
        }

        if (application.status === 'approved') {
            return res.status(400).json({ message: 'Application already approved' });
        }

        // 1. Update Application Status
        application.status = 'approved';
        await application.save();

        // 2. Update User Role to 'tutor' & Sync Profile Data
        const user = await User.findById(application.user_id);
        if (user) {
            user.role = 'tutor';
            user.bio = application.bio;
            user.expertise = application.specialization;
            
            // Save real profile picture to separate field
            if (application.profile_picture_url) {
                user.tutor_profile_image = application.profile_picture_url;
            }
            await user.save();
        }

        // 3. Create Notification
        await Notification.create({
            user_id: application.user_id,
            type: 'success',
            title: 'Application Approved! 🎉',
            message: `Congratulations! Your application to become a tutor has been approved. You can now create courses.`,
            link: '/dashboard'
        });

        res.json({ message: 'Application approved and user promoted to Tutor', application });
    } catch (error: any) {
        res.status(500).json({ message: error.message });
    }
};

// @desc    Reject a tutor application
// @route   POST /api/tutors/admin/reject
// @access  Private/Admin
export const rejectApplication = async (req: Request, res: Response) => {
    try {
        const { application_id, admin_notes } = req.body;

        const application = await TutorApplication.findById(application_id);
        if (!application) {
            return res.status(404).json({ message: 'Application not found' });
        }

        application.status = 'rejected';
        application.admin_notes = admin_notes;
        await application.save();

        // Create Notification
        await Notification.create({
            user_id: application.user_id,
            type: 'error',
            title: 'Application Update',
            message: `Your tutor application was not approved. Admin Note: ${admin_notes || 'No reason provided.'}`,
            link: '/tutor-application'
        });

        res.json({ message: 'Application rejected', application });
    } catch (error: any) {
        res.status(500).json({ message: error.message });
    }
};

// @desc    Get tutor application analytics
// @route   GET /api/tutors/admin/analytics
// @access  Private/Admin
export const getTutorAnalytics = async (req: Request, res: Response) => {
    try {
        const [totalApplications, statusCounts, specializationCounts, recentGrowth] = await Promise.all([
            // 1. Total Count
            TutorApplication.countDocuments(),

            // 2. Status Breakdown
            TutorApplication.aggregate([
                { $group: { _id: '$status', count: { $sum: 1 } } }
            ]),

            // 3. Specialization Distribution
            TutorApplication.aggregate([
                { $group: { _id: '$specialization', count: { $sum: 1 } } },
                { $sort: { count: -1 } },
                { $limit: 10 }
            ]),

            // 4. Growth (Last 6 Months)
            TutorApplication.aggregate([
                {
                    $match: {
                        createdAt: { 
                            $gte: new Date(new Date().setMonth(new Date().getMonth() - 6)) 
                        }
                    }
                },
                {
                    $group: {
                        _id: { $month: '$createdAt' },
                        count: { $sum: 1 }
                    }
                },
                { $sort: { '_id': 1 } }
            ])
        ]);

        // Process Status Counts
        const stats = {
            pending: 0,
            approved: 0,
            rejected: 0
        };
        statusCounts.forEach((s: any) => {
            if (s._id === 'pending') stats.pending = s.count;
            if (s._id === 'approved') stats.approved = s.count;
            if (s._id === 'rejected') stats.rejected = s.count;
        });

        // Format Growth Data
        const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
        const growthData = recentGrowth.map((g: any) => ({
            name: MONTHS[g._id - 1], // Month index is 1-based
            count: g.count
        }));

        res.json({
            totalApplications,
            statusCounts: stats,
            specializationCounts: specializationCounts.map((s: any) => ({ name: s._id, value: s.count })),
            growthData
        });
    } catch (error: any) {
        res.status(500).json({ message: error.message });
    }
};
