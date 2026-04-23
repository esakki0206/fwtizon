import nodemailer from 'nodemailer';

/**
 * Send an email using Nodemailer + Gmail SMTP.
 *
 * Required env vars (server/.env):
 *   EMAIL_HOST   = smtp.gmail.com
 *   EMAIL_PORT   = 587
 *   EMAIL_USER   = your-gmail@gmail.com
 *   EMAIL_PASS   = your-gmail-app-password  (NOT your login password)
 *
 * @param {{ email: string, subject: string, html: string }} options
 */
const sendEmail = async (options) => {
  const transporter = nodemailer.createTransport({
    host: process.env.EMAIL_HOST,
    port: Number(process.env.EMAIL_PORT) || 587,
    secure: false, // TLS (STARTTLS) — not SSL. Use port 587.
    auth: {
      user: process.env.EMAIL_USER,   // ← was EMAIL_USERNAME (wrong)
      pass: process.env.EMAIL_PASS,   // ← was EMAIL_PASSWORD (wrong)
    },
  });

  const mailOptions = {
    from: `"Fwtion LMS" <${process.env.EMAIL_USER}>`,
    to: options.email,
    subject: options.subject,
    html: options.html,
  };

  await transporter.sendMail(mailOptions);
};

export default sendEmail;
