export const welcomeEmailTemplate = (name) => `
  <div style="font-family: Arial, sans-serif; padding: 20px; max-width: 600px; margin: 0 auto; border: 1px solid #e2e8f0; border-radius: 10px;">
    <h2 style="color: #4f46e5; text-align: center;">Welcome to Fwtion LMS!</h2>
    <p style="font-size: 16px; color: #374151;">Hi ${name},</p>
    <p style="font-size: 16px; color: #374151;">We're thrilled to have you here. Fwtion is your new hub for mastering highly sought-after industry skills.</p>
    <p style="font-size: 16px; color: #374151;">You can start browsing our massive catalog of courses right away.</p>
    <div style="text-align: center; margin-top: 30px;">
      <a href="http://localhost:5173/courses" style="padding: 12px 24px; background-color: #4f46e5; color: white; text-decoration: none; border-radius: 5px; font-weight: bold;">Explore Courses</a>
    </div>
    <p style="font-size: 14px; color: #6b7280; margin-top: 40px; text-align: center;">© ${new Date().getFullYear()} Fwtion. All rights reserved.</p>
  </div>
`;

export const purchaseConfirmationTemplate = (name, courseName) => `
  <div style="font-family: Arial, sans-serif; padding: 20px; max-width: 600px; margin: 0 auto; border: 1px solid #e2e8f0; border-radius: 10px;">
    <h2 style="color: #10b981; text-align: center;">Purchase Successful!</h2>
    <p style="font-size: 16px; color: #374151;">Hi ${name},</p>
    <p style="font-size: 16px; color: #374151;">Thank you for enrolling in <strong>${courseName}</strong>. Your payment was successfully processed, and your course is now unlocked!</p>
    <div style="text-align: center; margin-top: 30px;">
      <a href="http://localhost:5173/dashboard" style="padding: 12px 24px; background-color: #10b981; color: white; text-decoration: none; border-radius: 5px; font-weight: bold;">Go to Dashboard</a>
    </div>
  </div>
`;
