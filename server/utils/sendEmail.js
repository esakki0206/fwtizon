import nodemailer from 'nodemailer';

/**
 * Nodemailer transporter — created once at module load, reused for all emails.
 * Creating a new transporter per email call is expensive (new SMTP connection
 * pool each time). A single module-level transporter reuses the connection pool.
 */
const transporter = nodemailer.createTransport({
  host: process.env.EMAIL_HOST,
  port: Number(process.env.EMAIL_PORT) || 587,
  secure: false, // TLS (STARTTLS) — not SSL. Use port 587.
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
});

/**
 * Send an email using Nodemailer + Gmail SMTP.
 *
 * @param {{ email: string, subject: string, html: string }} options
 */
const sendEmail = async (options) => {
  const mailOptions = {
    from: `"Fwtion LMS" <${process.env.EMAIL_USER}>`,
    to: options.email,
    subject: options.subject,
    html: options.html,
  };

  await transporter.sendMail(mailOptions);
};

export default sendEmail;
