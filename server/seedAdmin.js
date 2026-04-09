import mongoose from 'mongoose';
import dotenv from 'dotenv';
import bcrypt from 'bcryptjs';
import User from './models/User.js';
import Course from './models/Course.js';
import Enrollment from './models/Enrollment.js';

dotenv.config();

mongoose.connect(process.env.MONGODB_URI)
.then(async () => {
  console.log('MongoDB Connected.');

  // Create Admin
  let admin = await User.findOne({ email: 'admin@fwtion.com' });
  if (!admin) {
    admin = await User.create({
      name: 'System Admin',
      email: 'admin@fwtion.com',
      password: 'password123',
      role: 'admin'
    });
    console.log('Admin created: admin@fwtion.com / password123');
  } else {
    console.log('Admin already exists.');
  }

  // Create Student
  let student = await User.findOne({ email: 'student@fwtion.com' });
  if (!student) {
    student = await User.create({
      name: 'Jane Student',
      email: 'student@fwtion.com',
      password: 'password123',
      role: 'student'
    });
    console.log('Student created: student@fwtion.com / password123');
  } else {
    console.log('Student already exists.');
  }

  // Create a Course if none exists
  let course = await Course.findOne();
  if (!course) {
    course = await Course.create({
      title: 'Fullstack Web Development Masterclass',
      description: 'Learn MERN stack from scratch.',
      category: 'Development',
      price: 99,
      instructor: admin._id,
      status: 'published'
    });
    console.log('Course created.');
  }

  // Create Enrollment for student
  let enrollment = await Enrollment.findOne({ user: student._id, course: course._id });
  if (!enrollment) {
    enrollment = await Enrollment.create({
      user: student._id,
      course: course._id,
      paymentStatus: 'completed',
      paymentId: 'PAY001',
      amount: course.price,
      status: 'active'
    });
    console.log(`Student enrolled in ${course.title}`);
  } else {
    console.log('Enrollment already exists.');
  }

  console.log('Seeding complete!');
  process.exit();
})
.catch(err => {
  console.error('Error:', err);
  process.exit(1);
});
