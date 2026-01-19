import { Request, Response } from 'express';
import User from '../models/User';
import Course from '../models/Course';
import { EmailService } from '../services/email.service';

// @desc    Announce a course via newsletter
// @route   POST /api/newsletter/announce/:courseId
// @access  Private (Admin)
export const announceCourse = async (req: Request, res: Response) => {
    try {
        const { courseId } = req.params;

        // 1. Get Course Details
        const course = await Course.findById(courseId);
        if (!course) {
            return res.status(404).json({ message: 'Course not found' });
        }

        // 2. Find Subscribers (Active + Opted In)
        const subscribers = await User.find({
            is_active: true,
            newsletter_opt_in: true
        }).select('email username first_name');

        if (subscribers.length === 0) {
            return res.status(400).json({ message: 'No subscribers found to send email to.' });
        }

        console.log(`[Newsletter] Broadcasting '${course.title}' to ${subscribers.length} agents...`);

        // 3. Send Emails (Async Loop - basic implementation)
        // In a real production app at scale, this should be a Queue/Job.
        let sentCount = 0;
        const courseLink = `${process.env.CLIENT_API_URL}/courses/${course._id}`;

        // Don't await strictly for response time, but for reliability we might want to.
        // For now, let's fire and forget or await all promises.
        // Awaiting all might timeout if list is huge.
        // Let's do chunks or just await sequential for safety in this MVP.
        
        for (const user of subscribers) {
            try {
                // Use first name if available, else username
                const name = user.first_name || user.username;
                
                await EmailService.sendCourseAnnouncement(
                    user.email,
                    name,
                    course.title,
                    course.description || 'New classified material is available for specialized training.',
                    courseLink
                );
                sentCount++;
            } catch (err) {
                console.error(`Failed to email ${user.email}`, err);
            }
        }

        res.json({
            message: `Newsletter broadcast complete.`,
            stats: {
                total_subscribers: subscribers.length,
                sent_successfully: sentCount,
                course: course.title
            }
        });

    } catch (error: any) {
        console.error("Newsletter Error:", error);
        res.status(500).json({ message: error.message });
    }
};
