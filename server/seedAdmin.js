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

    console.log('\n✅ Seeding complete!');
    console.log('─────────────────────────────────');
    console.log('Admin:   admin@fwtion.com / password123');
    console.log('─────────────────────────────────');

    process.exit(0);
  } catch (err) {
    console.error('Seed Error:', err);
    process.exit(1);
  }
};

seed();
