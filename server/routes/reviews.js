import express from 'express';
import Review from '../models/Review.js';
import Course from '../models/Course.js';
import Enrollment from '../models/Enrollment.js';
import { protect } from '../middleware/auth.js';

const router = express.Router({ mergeParams: true });

// @desc    Get reviews for a course
// @route   GET /api/courses/:courseId/reviews
// @access  Public
router.get('/', async (req, res) => {
  try {
    if (req.params.courseId) {
      const reviews = await Review.find({ course: req.params.courseId }).populate({
        path: 'user',
        select: 'name avatar'
      });
      return res.status(200).json({ success: true, count: reviews.length, data: reviews });
    } else {
      const reviews = await Review.find().populate({
        path: 'user',
        select: 'name avatar'
      });
      return res.status(200).json({ success: true, count: reviews.length, data: reviews });
    }
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// @desc    Add review
// @route   POST /api/courses/:courseId/reviews
// @access  Private
router.post('/', protect, async (req, res) => {
  try {
    req.body.course = req.params.courseId;
    req.body.user = req.user.id;

    const course = await Course.findById(req.params.courseId);

    if (!course) {
      return res.status(404).json({ success: false, message: `No course with the id of ${req.params.courseId}` });
    }

    // Verify enrollment
    const enrollment = await Enrollment.findOne({ user: req.user.id, course: req.params.courseId });
    if (!enrollment && req.user.role !== 'admin') {
      return res.status(403).json({ success: false, message: 'You must be enrolled in this course to leave a review.' });
    }

    // Creating the review triggers schema validation and runs the post-save average generator organically
    const review = await Review.create(req.body);

    res.status(201).json({
      success: true,
      data: review
    });
  } catch (error) {
    // Catch duplicate 11000 index error specifically
    if(error.code === 11000) {
      return res.status(400).json({ success: false, message: 'You have already reviewed this course.' });
    }
    res.status(500).json({ success: false, message: error.message });
  }
});

export default router;
