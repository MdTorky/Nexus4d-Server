import nodemailer from 'nodemailer';
import path from 'path';

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

// Helper for Premium Nexus Layout
const getNexusTemplate = (title: string, content: string) => {
    return `
        <!DOCTYPE html>
        <html>
        <head>
            <meta charset="utf-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>${title}</title>
        </head>
        <body style="margin: 0; padding: 0; background-color: #000000; font-family: 'Segoe UI', Arial, sans-serif; color: #ffffff;">
            <table role="presentation" width="100%" border="0" cellspacing="0" cellpadding="0" style="background-color: #000000; padding: 40px 0;">
                <tr>
                    <td align="center">
                        <!-- Main Container -->
                        <table role="presentation" width="600" border="0" cellspacing="0" cellpadding="0" style="width: 100%; max-width: 600px; background-color: #09090b; border: 1px solid #333333; border-radius: 20px; box-shadow: 0 0 50px rgba(57, 255, 20, 0.1); overflow: hidden;">
                            
                            <!-- Header -->
                            <tr>
                                <td align="center" style="padding: 40px 0 30px 0; border-bottom: 1px solid #222222; background: linear-gradient(180deg, rgba(57,255,20,0.05) 0%, rgba(9,9,11,0) 100%);">
                                    <img src="cid:nexuslogo" alt="NEXUS 4D" style="max-width: 200px; height: auto; display: block;" />
                                    <p style="margin: 10px 0 0 0; font-size: 10px; color: #666666; letter-spacing: 2px; text-transform: uppercase; font-weight: bold;">Mission Command</p>
                                </td>
                            </tr>

                            <!-- Content -->
                            <tr>
                                <td style="padding: 40px;">
                                    ${content}
                                </td>
                            </tr>

                            <!-- Footer -->
                            <tr>
                                <td align="center" style="padding: 30px; background-color: #050505; border-top: 1px solid #222; text-align: center;">
                                    <p style="margin: 0 0 10px 0; font-size: 12px; color: #444444;">&copy; ${new Date().getFullYear()} Nexus 4D. All rights reserved.</p>
                                    <div style="font-size: 10px; color: #333333;">
                                        <a href="${process.env.CLIENT_API_URL}" style="color: #444; text-decoration: none; margin: 0 10px;">Platform</a> | 
                                        <a href="#" style="color: #444; text-decoration: none; margin: 0 10px;">Support</a>
                                    </div>
                                </td>
                            </tr>
                        </table>
                    </td>
                </tr>
            </table>
        </body>
        </html>
    `;
};

export const EmailService = {


    sendEmail: async (to: string, subject: string, html: string) => {
        if (!process.env.SMTP_USER || !process.env.SMTP_PASS) {
            console.warn('Email credentials missing - Printing email to console instead.');
            console.log(`[MOCK EMAIL] To: ${to} | Subject: ${subject}`);
            return;
        }

        try {
            await transporter.sendMail({
                from: `"Nexus 4D" <${process.env.SMTP_USER}>`,
                to,
                subject,
                html,
                attachments: [
                    {
                        filename: 'Logo Horizontal.png',
                        path: path.join(__dirname, '../assets/Logo Horizontal.png'),
                        cid: 'nexuslogo' // same cid value as in the html img src
                    }
                ]
            });
            console.log(`Email sent to ${to}`);
        } catch (error: any) {
            console.error('Failed to send email:', error);
            // Don't throw to prevent breaking the flow, just log error
        }
    },

    sendApprovalEmail: async (to: string, userName: string, courseTitle: string) => {
        const content = `
            <h2 style="margin: 0 0 20px 0; color: #39ff14; font-size: 24px; font-weight: bold; text-transform: uppercase; letter-spacing: -0.5px;">Authorization Granted</h2>
            <p style="margin: 0 0 20px 0; line-height: 1.6; color: #cccccc;">Attention <strong>${userName}</strong>,</p>
            <p style="margin: 0 0 30px 0; line-height: 1.6; color: #cccccc;">Your enrollment request for the mission <strong>${courseTitle}</strong> has been officially approved. You have been granted full clearance to access the materials.</p>
            
            <table role="presentation" border="0" cellspacing="0" cellpadding="0" style="margin: 30px 0;">
                <tr>
                    <td align="center" bgcolor="#39ff14" style="border-radius: 12px;">
                        <a href="${process.env.CLIENT_API_URL}/courses" style="font-size: 16px; font-family: 'Segoe UI', Arial, sans-serif; color: #000000; text-decoration: none; border-radius: 12px; padding: 15px 30px; border: 1px solid #39ff14; display: inline-block; font-weight: 900; letter-spacing: 0.5px; text-transform: uppercase;">
                            Initiate Mission
                        </a>
                    </td>
                </tr>
            </table>

            <p style="margin: 0; font-size: 12px; color: #666666;">If this was a mistake, abort immediately and contact support.</p>
        `;
        
        await EmailService.sendEmail(
            to, 
            `Clearance Granted: ${courseTitle}`, 
            getNexusTemplate('Mission Approved', content)
        );
    },

    sendRejectionEmail: async (to: string, userName: string, courseTitle: string, reason: string) => {
        const content = `
            <div style="border-left: 4px solid #ef4444; padding-left: 20px; margin-bottom: 25px;">
                <h2 style="margin: 0 0 10px 0; color: #ef4444; font-size: 24px; font-weight: bold; text-transform: uppercase;">Access Denied</h2>
            </div>
            
            <p style="margin: 0 0 20px 0; line-height: 1.6; color: #cccccc;">Agent <strong>${userName}</strong>,</p>
            <p style="margin: 0 0 20px 0; line-height: 1.6; color: #cccccc;">Your request to join <strong>${courseTitle}</strong> could not be processed at this time.</p>
            
            <div style="background-color: rgba(239, 68, 68, 0.1); border: 1px solid rgba(239, 68, 68, 0.2); padding: 20px; border-radius: 10px; margin-bottom: 30px;">
                <p style="margin: 0; font-size: 12px; color: #ef4444; text-transform: uppercase; font-weight: bold; margin-bottom: 5px;">Reason for Rejection</p>
                <p style="margin: 0; color: #ffffff;">${reason || 'Administrative decision.'}</p>
            </div>

            <p style="margin: 0 0 20px 0; line-height: 1.6; color: #cccccc;">Please verify your data or payment receipt and submit a new request.</p>
        `;

        await EmailService.sendEmail(
            to, 
            `Action Required: ${courseTitle}`, 
            getNexusTemplate('Access Denied', content)
        );
    },

    sendVerificationEmail: async (to: string, code: string) => {
        const content = `
            <h2 style="margin: 0 0 20px 0; color: #39ff14; font-size: 24px; font-weight: bold; text-transform: uppercase; letter-spacing: -0.5px;">Identity Verification</h2>
            <p style="margin: 0 0 20px 0; line-height: 1.6; color: #cccccc;">Initiating neural link... Please verify your email address to establish a secure connection.</p>
            
            <div style="background-color: rgba(57, 255, 20, 0.1); border: 1px solid rgba(57, 255, 20, 0.2); padding: 30px; border-radius: 15px; margin: 30px 0; text-align: center;">
                <p style="margin: 0 0 10px 0; font-size: 12px; color: #39ff14; text-transform: uppercase; letter-spacing: 2px; font-weight: bold;">Verification Code</p>
                <h1 style="margin: 0; font-size: 48px; font-weight: 900; color: #ffffff; letter-spacing: 5px;">${code}</h1>
            </div>

            <p style="margin: 0 0 20px 0; line-height: 1.6; color: #cccccc; font-size: 12px;">This code will expire in 15 minutes. Do not share this code with anyone.</p>
        `;

        await EmailService.sendEmail(
            to,
            `Verify Your Identity: Nexus 4D`,
            getNexusTemplate('Verify Identity', content)
        );
    },

    sendWelcomeEmail: async (to: string, username: string) => {
        const content = `
            <div style="text-align: center; margin-bottom: 30px;">
                <h2 style="margin: 0 0 10px 0; color: #ffffff; font-size: 28px; font-weight: 900; text-transform: uppercase; letter-spacing: -1px;">Welcome to the Nexus</h2>
                <p style="margin: 0; color: #39ff14; font-size: 14px; text-transform: uppercase; letter-spacing: 2px; font-weight: bold;">Neural Link Established</p>
            </div>

            <p style="margin: 0 0 20px 0; line-height: 1.6; color: #cccccc;">Greetings <strong>${username}</strong>,</p>
            <p style="margin: 0 0 20px 0; line-height: 1.6; color: #cccccc;">You have successfully joined the ranks. Your training begins now. Access the platform to explore missions, upgrade your skills, and climb the leaderboard.</p>
            
            <table role="presentation" border="0" cellspacing="0" cellpadding="0" style="margin: 30px 0;">
                <tr>
                    <td align="center" bgcolor="#39ff14" style="border-radius: 12px;">
                        <a href="${process.env.CLIENT_API_URL}/login" style="font-size: 16px; font-family: 'Segoe UI', Arial, sans-serif; color: #000000; text-decoration: none; border-radius: 12px; padding: 15px 30px; border: 1px solid #39ff14; display: inline-block; font-weight: 900; letter-spacing: 0.5px; text-transform: uppercase;">
                            Enter The Nexus
                        </a>
                    </td>
                </tr>
            </table>

            <p style="margin: 0; font-size: 12px; color: #666666;">For support or inquiries, contact mission command.</p>
        `;

        await EmailService.sendEmail(
            to,
            `Welcome to the Nexus`,
            getNexusTemplate('Welcome', content)
        );
    },

    sendAccountReactivationEmail: async (to: string, username: string) => {
        const content = `
            <div style="text-align: center; margin-bottom: 30px;">
                <h2 style="margin: 0 0 10px 0; color: #39ff14; font-size: 24px; font-weight: bold; text-transform: uppercase; letter-spacing: -0.5px;">System Online</h2>
                <p style="margin: 0; color: #ffffff; font-size: 12px; text-transform: uppercase; letter-spacing: 2px; font-weight: bold;">Account Reactivated</p>
            </div>

            <p style="margin: 0 0 20px 0; line-height: 1.6; color: #cccccc;">Welcome back, <strong>${username}</strong>.</p>
            <p style="margin: 0 0 20px 0; line-height: 1.6; color: #cccccc;">Your neural link has been re-established. All systems are operational. You may resume your missions immediately.</p>
            
            <table role="presentation" border="0" cellspacing="0" cellpadding="0" style="margin: 30px 0;">
                <tr>
                    <td align="center" bgcolor="#39ff14" style="border-radius: 12px;">
                        <a href="${process.env.CLIENT_API_URL}/login" style="font-size: 16px; font-family: 'Segoe UI', Arial, sans-serif; color: #000000; text-decoration: none; border-radius: 12px; padding: 15px 30px; border: 1px solid #39ff14; display: inline-block; font-weight: 900; letter-spacing: 0.5px; text-transform: uppercase;">
                            Resume Session
                        </a>
                    </td>
                </tr>
            </table>
        `;

        await EmailService.sendEmail(
            to,
            `Account Reactivated - Nexus4D`,
            getNexusTemplate('Account Reactivated', content)
        );
    },

    sendAccountDeactivationEmail: async (to: string, username: string, reason: string) => {
        const content = `
            <div style="border-left: 4px solid #ef4444; padding-left: 20px; margin-bottom: 25px;">
                <h2 style="margin: 0 0 10px 0; color: #ef4444; font-size: 24px; font-weight: bold; text-transform: uppercase;">System Terminated</h2>
            </div>
            
            <p style="margin: 0 0 20px 0; line-height: 1.6; color: #cccccc;">Agent <strong>${username}</strong>,</p>
            <p style="margin: 0 0 20px 0; line-height: 1.6; color: #cccccc;">Your account has been deactivated by an administrator. Access to the Nexus is currently suspended.</p>
            
            <div style="background-color: rgba(239, 68, 68, 0.1); border: 1px solid rgba(239, 68, 68, 0.2); padding: 20px; border-radius: 10px; margin-bottom: 30px;">
                <p style="margin: 0; font-size: 12px; color: #ef4444; text-transform: uppercase; font-weight: bold; margin-bottom: 5px;">Termination Reason</p>
                <p style="margin: 0; color: #ffffff;">${reason || 'Violation of protocols.'}</p>
            </div>

            <p style="margin: 0 0 20px 0; line-height: 1.6; color: #cccccc;">If you believe this is an error in the system logic, contact high command immediately.</p>
        `;

        await EmailService.sendEmail(
            to,
            `Account Deactivated - Nexus4D`,
            getNexusTemplate('Account Deactivated', content)
        );
    },

    sendCourseAnnouncement: async (to: string, username: string, courseTitle: string, courseDescription: string, courseLink: string) => {
        const content = `
            <div style="text-align: center; margin-bottom: 30px;">
                <h2 style="margin: 0 0 10px 0; color: #39ff14; font-size: 24px; font-weight: bold; text-transform: uppercase; letter-spacing: -0.5px;">New Mission Available</h2>
                <p style="margin: 0; color: #ffffff; font-size: 12px; text-transform: uppercase; letter-spacing: 2px; font-weight: bold;">Briefing Incoming</p>
            </div>

            <p style="margin: 0 0 20px 0; line-height: 1.6; color: #cccccc;">Agent <strong>${username}</strong>,</p>
            <p style="margin: 0 0 20px 0; line-height: 1.6; color: #cccccc;">A new mission protocol has been uploaded to the mainframe. Review the following classified intelligence:</p>
            
            <div style="background-color: #111; border: 1px solid #333; padding: 25px; border-radius: 15px; margin: 30px 0;">
                <h3 style="margin: 0 0 15px 0; font-size: 20px; color: #fff; font-weight: bold;">${courseTitle}</h3>
                <p style="margin: 0 0 20px 0; line-height: 1.6; color: #aaa; font-size: 14px;">${courseDescription}</p>
                
                <table role="presentation" border="0" cellspacing="0" cellpadding="0">
                    <tr>
                        <td align="center" bgcolor="#39ff14" style="border-radius: 8px;">
                            <a href="${courseLink}" style="font-size: 14px; font-family: 'Segoe UI', Arial, sans-serif; color: #000000; text-decoration: none; border-radius: 8px; padding: 12px 25px; border: 1px solid #39ff14; display: inline-block; font-weight: bold; text-transform: uppercase;">
                                View Mission Intel
                            </a>
                        </td>
                    </tr>
                </table>
            </div>

            <p style="margin: 0; font-size: 11px; color: #555; text-align: center;">
                To opt out of mission briefings, update your privacy settings in your profile.
            </p>
        `;

        await EmailService.sendEmail(
            to,
            `New Mission: ${courseTitle}`,
            getNexusTemplate('New Mission Alert', content)
        );
    }
};
