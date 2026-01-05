
import nodemailer from 'nodemailer';
import dotenv from 'dotenv';
import path from 'path';

// Explicitly load .env from server root
dotenv.config({ path: path.join(__dirname, '../../.env') });

console.log('--- Email Debug Script ---');
console.log('SMTP_HOST:', process.env.SMTP_HOST);
console.log('SMTP_PORT:', process.env.SMTP_PORT);
console.log('SMTP_USER:', process.env.SMTP_USER);
console.log('SMTP_PASS:', process.env.SMTP_PASS ? '******' : '(missing)');

const testEmail = async () => {
  if (!process.env.SMTP_HOST || !process.env.SMTP_USER || !process.env.SMTP_PASS) {
      console.error('ERROR: Missing SMTP credentials in .env file.');
      process.exit(1);
  }

  const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: Number(process.env.SMTP_PORT) || 587,
    secure: false, 
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
    debug: true, // Enable debug logs
    logger: true // Enable logger
  });

  try {
      console.log('Attempting to verify connection...');
      await transporter.verify();
      console.log('Connection verified successfully.');

      console.log('Attempting to send test email...');
      const info = await transporter.sendMail({
          from: {
            name: 'Nexus4D Test',
            address: process.env.SMTP_USER!
          },
          to: process.env.SMTP_USER, // Send to self
          subject: 'Nexus 4D Debug Email',
          text: 'If you see this, email sending is working.',
      });

      console.log('Email sent successfully!');
      console.log('Message ID:', info.messageId);
      console.log('Preview URL:', nodemailer.getTestMessageUrl(info));
  } catch (error) {
      console.error('FATAL ERROR: Failed to send email.');
      console.error(error);
  }
};

testEmail();
