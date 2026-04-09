import express from 'express';
import Module from '../models/Module.js';
import Lesson from '../models/Lesson.js';
import { protect, authorize } from '../middleware/auth.js';
import Course from '../models/Course.js';

const router = express.Router({ mergeParams: true }); // Important to merge params from course router

// @desc    Get modules for a course
// @route   GET /api/courses/:courseId/modules
// @access  Public
router.get('/', async (req, res) => {
  try {
    const modules = await Module.find({ course: req.params.courseId })
      .sort('order')
      .populate('lessons', 'title order duration isPreview')
      .populate('quiz', 'title isFinal');

    res.status(200).json({ success: true, count: modules.length, data: modules });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// @desc    Add a module to a course
// @route   POST /api/courses/:courseId/modules
// @access  Private
router.post('/', protect, authorize('instructor', 'admin'), async (req, res) => {
  try {
    req.body.course = req.params.courseId;
    const course = await Course.findById(req.params.courseId);

    if (!course) return res.status(404).json({ success: false, message: 'Course not found' });
    if (course.instructor.toString() !== req.user.id && req.user.role !== 'admin') {
      return res.status(401).json({ success: false, message: 'Not authorized' });
    }

    const newModule = await Module.create(req.body);
    res.status(201).json({ success: true, data: newModule });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// @desc    Add a lesson to a module
// @route   POST /api/modules/:moduleId/lessons
// @access  Private
router.post('/:moduleId/lessons', protect, authorize('instructor', 'admin'), async (req, res) => {
  try {
    req.body.module = req.params.moduleId;
    const module = await Module.findById(req.params.moduleId).populate('course');

    if (!module) return res.status(404).json({ success: false, message: 'Module not found' });
    if (module.course.instructor.toString() !== req.user.id && req.user.role !== 'admin') {
      return res.status(401).json({ success: false, message: 'Not authorized' });
    }

    const lesson = await Lesson.create(req.body);
    res.status(201).json({ success: true, data: lesson });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// @desc    Get a lesson (Content access)
// @route   GET /api/lessons/:id
// @access  Private
router.get('/lesson/:id', protect, async (req, res) => {
  try {
    const lesson = await Lesson.findById(req.params.id).populate({
      path: 'module',
      populate: { path: 'course', select: 'instructor' }
    });

    if (!lesson) return res.status(404).json({ success: false, message: 'Lesson not found' });
    
    // Strict Access Control Layer
    if (!lesson.isPreview && req.user.role !== 'admin' && lesson.module.course.instructor.toString() !== req.user.id) {
       const Enrollment = (await import('../models/Enrollment.js')).default;
       const isEnrolled = await Enrollment.findOne({
         user: req.user.id,
         course: lesson.module.course._id,
       });

       if (!isEnrolled || isEnrolled.status !== 'active') {
         return res.status(403).json({ success: false, message: 'Access Denied: You must be actively enrolled in this course to view this lesson.' });
       }
    }

    res.status(200).json({ success: true, data: lesson });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

export default router;
