import express from 'express';
import Review from '../models/Review.js';
import LiveCourse from '../models/LiveCourse.js';
import Notification from '../models/Notification.js';
import Course from '../models/Course.js';
import User from '../models/User.js';
import Enrollment from '../models/Enrollment.js';
import { protect, authorize } from '../middleware/auth.js';
import { upload } from '../config/cloudinary.js';

const router = express.Router();

// ======================
// UPLOAD FILE
// ======================
router.post('/upload', protect, authorize('admin', 'instructor'), upload.single('file'), (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, message: 'No file uploaded' });
    }
    // Return the Cloudinary URL
    res.status(200).json({ success: true, url: req.file.path });
  } catch (err) {
    console.error('Upload handler Error:', err);
    res.status(500).json({ success: false, message: err.message });
  }
});

// ======================
// PUBLIC PLATFORM STATS (no auth)
// ======================
router.get('/stats', async (req, res) => {
  try {
    const totalCourses = await Course.countDocuments();
    const totalStudents = await User.countDocuments({ role: 'student' });
    const totalCertificates = await Enrollment.countDocuments({ certificateId: { $exists: true, $ne: null } });
    res.status(200).json({
      success: true,
      data: { totalCourses, totalStudents, totalCertificates }
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// ======================
// REVIEWS
// ======================
router.get('/reviews/course/:courseId', async (req, res) => {
  try {
    const reviews = await Review.find({ course: req.params.courseId }).populate('user', 'name avatar');
    res.status(200).json({ success: true, count: reviews.length, data: reviews });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

router.post('/reviews', protect, async (req, res) => {
  try {
    req.body.user = req.user.id;
    const review = await Review.create(req.body);
    res.status(201).json({ success: true, data: review });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// ======================
// LIVE COURSES (PUBLIC)
// ======================
router.get('/live-courses', async (req, res) => {
  try {
    // Only return public info, strip zoom and whatsapp links
    const courses = await LiveCourse.find().select('-zoomLink -whatsappGroup').populate('instructor', 'name avatar');
    res.status(200).json({ success: true, count: courses.length, data: courses });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

/**
 * @desc    Public single live course detail
 * @route   GET /api/live-courses/:id
 * @access  Public
 */
router.get('/live-courses/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const isObjectId = /^[0-9a-fA-F]{24}$/.test(id);

    const query = isObjectId
      ? { _id: id }
      : { slug: id };

    const course = await LiveCourse.findOne(query)
      .select('-zoomLink -whatsappGroup')
      .populate('instructor', 'name avatar bio');

    if (!course) {
      return res.status(404).json({ success: false, message: 'Live course not found' });
    }

    res.status(200).json({ success: true, data: course });
  } catch (err) {
    console.error('Public live course detail error:', err);
    res.status(500).json({ success: false, message: 'Server error fetching live course' });
  }
});

// Code migrated to admin.js

// ======================
// NOTIFICATIONS
// ======================
router.get('/notifications', protect, async (req, res) => {
  try {
    const notifications = await Notification.find({ user: req.user.id }).sort('-createdAt').limit(20);
    res.status(200).json({ success: true, data: notifications });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

router.put('/notifications/:id/read', protect, async (req, res) => {
  try {
    const notification = await Notification.findByIdAndUpdate(req.params.id, { isRead: true }, { new: true });
    res.status(200).json({ success: true, data: notification });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

export default router;
