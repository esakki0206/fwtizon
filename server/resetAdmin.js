import mongoose from 'mongoose';
import dotenv from 'dotenv';
import User from './models/User.js';

dotenv.config();

mongoose.connect(process.env.MONGODB_URI)
.then(async () => {
  console.log('MongoDB Connected.');

  let admin = await User.findOne({ email: 'admin@fwtion.com' });
  if (admin) {
    admin.password = 'password123';
    await admin.save();
    console.log('Admin password explicitly reset to password123 (hashed).');
  } else {
    console.log('Admin not found in DB.');
  }

  process.exit();
})
.catch(err => {
  console.error('Error:', err);
  process.exit(1);
});
