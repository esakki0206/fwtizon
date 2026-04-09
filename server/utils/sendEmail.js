import nodemailer from 'nodemailer';

const sendEmail = async (options) => {
  // Create a transporter
  const transporter = nodemailer.createTransport({
    host: process.env.EMAIL_HOST,
    port: process.env.EMAIL_PORT,
    auth: {
      user: process.env.EMAIL_USERNAME,
      pass: process.env.EMAIL_PASSWORD
    }
  });

  // Define email options
  const mailOptions = {
    from: 'Fwtion LMS <support@fwtion.com>',
    to: options.email,
    subject: options.subject,
    html: options.html
  };

  // Send email
  await transporter.sendMail(mailOptions);
};

export default sendEmail;
