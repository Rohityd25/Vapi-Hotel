/**
 * =============================================
 *  EMAIL UTILITY - Nodemailer
 * =============================================
 * Sends emails using Gmail SMTP.
 * Used for: welcome, booking confirmation, 
 * password reset, cancellation.
 */
const nodemailer = require('nodemailer');

const sendEmail = async ({ to, subject, html, text }) => {
  // Create transporter (Gmail SMTP)
  const transporter = nodemailer.createTransport({
    host:   process.env.SMTP_HOST || 'smtp.gmail.com',
    port:   parseInt(process.env.SMTP_PORT) || 587,
    secure: false, // true for port 465, false for 587
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
  });

  // Verify connection (useful for debugging)
  // await transporter.verify();

  const mailOptions = {
    from:    `"${process.env.FROM_NAME || 'Hotel Vapi'}" <${process.env.FROM_EMAIL || process.env.SMTP_USER}>`,
    to,
    subject,
    html,
    text: text || html.replace(/<[^>]*>/g, ''), // fallback plain text
  };

  const info = await transporter.sendMail(mailOptions);
  console.log(`📧 Email sent to ${to}: ${info.messageId}`);
  return info;
};

module.exports = { sendEmail };
