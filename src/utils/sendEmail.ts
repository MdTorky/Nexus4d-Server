import nodemailer from 'nodemailer';
import dotenv from 'dotenv';

dotenv.config();

const sendEmail = async (options: { email: string; subject: string; message: string; html?: string }) => {
  // If SMTP credentials are not provided, we log the email to the console (Dev Mode)
  if (!process.env.SMTP_HOST || !process.env.SMTP_USER || !process.env.SMTP_PASS) {
    console.log(`
    [EMAIL SERVICE - DEV MODE]
    --------------------------
    To: ${options.email}
    Subject: ${options.subject}
    Message: ${options.message}
    --------------------------
    `);
    return;
  }

  // Create transporter
  const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: Number(process.env.SMTP_PORT) || 587,
    secure: false, // true for 465, false for other ports
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
  });

  // Define email options
  const mailOptions = {
    from: {
        name: 'Nexus4D',
        address: process.env.SMTP_USER
    },
    to: options.email,
    subject: options.subject,
    text: options.message,
    html: options.html,
  };

  await transporter.sendMail(mailOptions);
};

export default sendEmail;
