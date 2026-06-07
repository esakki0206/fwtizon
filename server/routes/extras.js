import express from 'express';
import Review from '../models/Review.js';
import LiveCourse from '../models/LiveCourse.js';
import Notification from '../models/Notification.js';
import Course from '../models/Course.js';
import User from '../models/User.js';
import Enrollment from '../models/Enrollment.js';
import { protect, authorize, optionalAuth } from '../middleware/auth.js';
import { uploadImage } from '../config/cloudinary.js';

const router = express.Router();
const isValidObjectId = (id) => /^[0-9a-fA-F]{24}$/.test(id);

// ======================
// UPLOAD IMAGE
// ======================
router.post('/upload', protect, authorize('admin', 'instructor'), uploadImage.single('file'), (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, message: 'No file uploaded' });
    }
    // req.file.path contains the optimized Cloudinary HTTPS URL
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
    // Whitelist fields — never pass req.body directly to Model.create()
    // as it would allow injection of any field (user override, rating manipulation, etc.)
    const { courseId, rating, comment } = req.body;

    if (!courseId || !isValidObjectId(courseId)) {
      return res.status(400).json({ success: false, message: 'Valid courseId is required' });
    }
    const ratingNum = Number(rating);
    if (isNaN(ratingNum) || ratingNum < 1 || ratingNum > 5) {
      return res.status(400).json({ success: false, message: 'Rating must be between 1 and 5' });
    }
    if (comment && String(comment).length > 2000) {
      return res.status(400).json({ success: false, message: 'Review comment must be 2000 characters or fewer' });
    }

    // Check enrollment — only enrolled students can leave reviews
    const enrollment = await Enrollment.findOne({
      user: req.user.id,
      course: courseId,
      status: { $in: ['active', 'completed'] },
    });
    if (!enrollment) {
      return res.status(403).json({ success: false, message: 'You must be enrolled in this course to leave a review' });
    }

    const review = await Review.create({
      course: courseId,
      user: req.user.id,
      rating: ratingNum,
      comment: comment ? String(comment).trim() : '',
    });
    res.status(201).json({ success: true, data: review });
  } catch (err) {
    if (err.code === 11000) {
      return res.status(400).json({ success: false, message: 'You have already reviewed this course' });
    }
    res.status(500).json({ success: false, message: err.message });
  }
});

// ======================
// LIVE COURSES (PUBLIC)
// ======================
router.get('/live-courses', async (req, res) => {
  try {
    const courses = await LiveCourse.find({ status: { $nin: ['Draft', 'Hidden'] } }).select('-zoomLink -whatsappGroup').populate('instructor', 'name avatar');
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
router.get('/live-courses/:id', optionalAuth, async (req, res) => {
  try {
    const { id } = req.params;
    const isObjectId = /^[0-9a-fA-F]{24}$/.test(id);
    const query = isObjectId ? { _id: id } : { slug: id };
    const course = await LiveCourse.findOne(query)
      .select('-zoomLink -whatsappGroup')
      .populate('instructor', 'name avatar bio');
    if (!course) {
      return res.status(404).json({ success: false, message: 'Live course not found' });
    }
    if (course.status === 'Hidden' || course.status === 'Draft') {
      if (!req.user || req.user.role !== 'admin') {
        return res.status(404).json({ success: false, message: 'Live course not found' });
      }
    }
    res.status(200).json({ success: true, data: course });
  } catch (err) {
    console.error('Public live course detail error:', err);
    res.status(500).json({ success: false, message: 'Server error fetching live course' });
  }
});

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
    // Scope the update to the authenticated user — prevents one user from
    // marking another user’s notifications as read.
    const notif = await Notification.findOneAndUpdate(
      { _id: req.params.id, user: req.user.id },
      { isRead: true },
      { new: true }
    );
    if (!notif) return res.status(404).json({ success: false, message: 'Notification not found' });
    res.status(200).json({ success: true, data: notif });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

export default router;
