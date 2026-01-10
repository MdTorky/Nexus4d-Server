import nodemailer from 'nodemailer';

// Configure Transporter
// Use environment variables for real configuration
const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST || 'smtp.gmail.com',
    port: Number(process.env.SMTP_PORT) || 587,
    secure: false, // true for 465, false for other ports
    auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS
    }
});

export const EmailService = {
    sendEmail: async (to: string, subject: string, html: string) => {
        if (!process.env.SMTP_USER || !process.env.SMTP_PASS) {
            throw new Error('Email credentials (SMTP_USER, SMTP_PASS) are missing in .env');
        }

        try {
            await transporter.sendMail({
                from: `"Nexus 4D" <${process.env.SMTP_USER}>`,
                to,
                subject,
                html
            });
            console.log(`Email sent to ${to}`);
        } catch (error: any) {
            console.error('Failed to send email:', error);
            throw new Error(`Failed to send email: ${error.message}`);
        }
    },

    sendApprovalEmail: async (to: string, userName: string, courseTitle: string) => {
        const html = `
            <div style="font-family: Arial, sans-serif; color: #333;">
                <h1 style="color: #4CAF50;">Enrollment Approved!</h1>
                <p>Hi ${userName},</p>
                <p>Good news! Your enrollment for <strong>${courseTitle}</strong> has been approved.</p>
                <p>You can now access the full course content.</p>
                <br/>
                <a href="${process.env.CLIENT_API_URL}/my-courses" style="background-color: #4CAF50; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px;">Go to My Courses</a>
            </div>
        `;
        await EmailService.sendEmail(to, `Enrollment Approved: ${courseTitle}`, html);
    },

    sendRejectionEmail: async (to: string, userName: string, courseTitle: string, reason: string) => {
        const html = `
            <div style="font-family: Arial, sans-serif; color: #333;">
                <h1 style="color: #F44336;">Enrollment Rejected</h1>
                <p>Hi ${userName},</p>
                <p>We reviewed your enrollment for <strong>${courseTitle}</strong> and unfortunately could not approve it at this time.</p>
                <p><strong>Reason:</strong> ${reason}</p>
                <p>Please check your payment details or receipt and try again.</p>
            </div>
        `;
        await EmailService.sendEmail(to, `Action Required: Enrollment for ${courseTitle}`, html);
    }
};
