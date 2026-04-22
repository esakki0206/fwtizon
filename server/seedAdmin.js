import mongoose from 'mongoose';
import dotenv from 'dotenv';
import User from './models/User.js';
import Course from './models/Course.js';
import LiveCourse from './models/LiveCourse.js';
import Enrollment from './models/Enrollment.js';

dotenv.config();

const seed = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log(`MongoDB Connected: ${mongoose.connection.host}`);

    // ── Admin ──
    let admin = await User.findOne({ email: 'admin@fwtion.com' });
    if (!admin) {
      admin = await User.create({
        name: 'System Admin',
        email: 'admin@fwtion.com',
        password: 'password123',
        role: 'admin',
      });
      console.log('✓ Admin created: admin@fwtion.com / password123');
    } else {
      console.log('● Admin already exists.');
    }

    // ── Student ──
    let student = await User.findOne({ email: 'student@fwtion.com' });
    if (!student) {
      student = await User.create({
        name: 'Jane Student',
        email: 'student@fwtion.com',
        password: 'password123',
        role: 'student',
      });
      console.log('✓ Student created: student@fwtion.com / password123');
    } else {
      console.log('● Student already exists.');
    }

    // ── Regular Course ──
    let course = await Course.findOne();
    if (!course) {
      course = await Course.create({
        title: 'Fullstack Web Development Masterclass',
        description: 'Learn MERN stack from scratch.',
        category: 'Development',
        price: 99,
        instructor: admin._id,
        status: 'published',
      });
      console.log('✓ Course created.');
    } else {
      console.log('● Course already exists.');
    }

    // ── Course Enrollment ──
    let courseEnrollment = await Enrollment.findOne({ user: student._id, course: course._id });
    if (!courseEnrollment) {
      courseEnrollment = await Enrollment.create({
        user: student._id,
        course: course._id,
        paymentId: 'seed_pay_course_001',
        amount: course.price,
        status: 'active',
      });
      console.log(`✓ Student enrolled in course: ${course.title}`);
    } else {
      console.log('● Course enrollment already exists.');
    }

    // ── Live Course ──
    let liveCourse = await LiveCourse.findOne();
    if (!liveCourse) {
      liveCourse = await LiveCourse.create({
        title: 'AI & Machine Learning Bootcamp',
        description: 'A hands-on live cohort covering neural networks, NLP, and computer vision with Python.',
        category: 'AI / ML',
        price: 4999,
        instructor: admin._id,
        maxStudents: 30,
        currentEnrollments: 1,
        startDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // starts in 7 days
        endDate: new Date(Date.now() + 35 * 24 * 60 * 60 * 1000),  // 4 weeks later
        duration: '4 Weeks',
        status: 'Published',
        domain: 'Artificial Intelligence',
        areaOfExpertise: 'Machine Learning',
        learningObjectives: [
          'Build and train neural networks from scratch',
          'Implement NLP pipelines for text classification',
          'Deploy ML models using Flask and Docker',
        ],
        curriculum: [
          { title: 'Python for Data Science', description: 'NumPy, Pandas, Matplotlib refresher' },
          { title: 'Deep Learning Fundamentals', description: 'Perceptrons, backpropagation, CNNs' },
          { title: 'NLP & Transformers', description: 'Tokenization, BERT, GPT fine-tuning' },
          { title: 'Capstone Project', description: 'End-to-end ML pipeline deployment' },
        ],
      });
      console.log('✓ Live course created: AI & Machine Learning Bootcamp');
    } else {
      console.log('● Live course already exists.');
    }

    // ── Live Course Enrollment ──
    let liveEnrollment = await Enrollment.findOne({ user: student._id, liveCourse: liveCourse._id });
    if (!liveEnrollment) {
      liveEnrollment = await Enrollment.create({
        user: student._id,
        liveCourse: liveCourse._id,
        paymentId: 'seed_pay_live_001',
        amount: liveCourse.price,
        status: 'active',
      });
      // Update enrollment count
      if (!liveCourse.currentEnrollments || liveCourse.currentEnrollments < 1) {
        liveCourse.currentEnrollments = 1;
        await liveCourse.save();
      }
      console.log(`✓ Student enrolled in live course: ${liveCourse.title}`);
    } else {
      console.log('● Live course enrollment already exists.');
    }

    console.log('\n✅ Seeding complete!');
    console.log('─────────────────────────────────');
    console.log('Admin:   admin@fwtion.com / password123');
    console.log('Student: student@fwtion.com / password123');
    console.log('─────────────────────────────────');

    process.exit(0);
  } catch (err) {
    console.error('Seed Error:', err);
    process.exit(1);
  }
};

seed();
