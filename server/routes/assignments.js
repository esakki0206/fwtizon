import express from 'express';
import Assignment from '../models/Assignment.js';
import AssignmentSubmission from '../models/AssignmentSubmission.js';
import Enrollment from '../models/Enrollment.js';
import Notification from '../models/Notification.js';
import { protect, authorize } from '../middleware/auth.js';
import { upload } from '../config/cloudinary.js';

const router = express.Router();

// ============================================
// ADMIN / INSTRUCTOR — Assignment CRUD
// ============================================

/**
 * @desc    Create a new assignment
 * @route   POST /api/assignments
 * @access  Private/Admin/Instructor
 */
router.post('/', protect, authorize('admin', 'instructor'), upload.single('file'), async (req, res) => {
  try {
    const data = { ...req.body, createdBy: req.user.id };
    if (req.file) {
      data.fileAttachment = req.file.path;
    }
    const assignment = await Assignment.create(data);
    res.status(201).json({ success: true, data: assignment });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

/**
 * @desc    Get all assignments (with optional course filter)
 * @route   GET /api/assignments
 * @access  Private
 */
router.get('/', protect, async (req, res) => {
  try {
    const filter = {};
    if (req.query.course) filter.course = req.query.course;
    if (req.query.module) filter.module = req.query.module;

    const assignments = await Assignment.find(filter)
      .populate('course', 'title')
      .populate('module', 'title')
      .populate('createdBy', 'name')
      .sort('-createdAt');

    res.status(200).json({ success: true, count: assignments.length, data: assignments });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

/**
 * @desc    Get single assignment
 * @route   GET /api/assignments/:id
 * @access  Private
 */
router.get('/:id', protect, async (req, res) => {
  try {
    const assignment = await Assignment.findById(req.params.id)
      .populate('course', 'title')
      .populate('module', 'title')
      .populate('createdBy', 'name avatar');

    if (!assignment) {
      return res.status(404).json({ success: false, message: 'Assignment not found' });
    }

    res.status(200).json({ success: true, data: assignment });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

/**
 * @desc    Update assignment
 * @route   PUT /api/assignments/:id
 * @access  Private/Admin/Instructor
 */
router.put('/:id', protect, authorize('admin', 'instructor'), upload.single('file'), async (req, res) => {
  try {
    const updateData = { ...req.body };
    if (req.file) {
      updateData.fileAttachment = req.file.path;
    }

    const assignment = await Assignment.findByIdAndUpdate(req.params.id, updateData, {
      new: true,
      runValidators: true,
    });

    if (!assignment) {
      return res.status(404).json({ success: false, message: 'Assignment not found' });
    }

    res.status(200).json({ success: true, data: assignment });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

/**
 * @desc    Delete assignment
 * @route   DELETE /api/assignments/:id
 * @access  Private/Admin/Instructor
 */
router.delete('/:id', protect, authorize('admin', 'instructor'), async (req, res) => {
  try {
    const assignment = await Assignment.findById(req.params.id);
    if (!assignment) {
      return res.status(404).json({ success: false, message: 'Assignment not found' });
    }

    // Delete all associated submissions
    await AssignmentSubmission.deleteMany({ assignment: assignment._id });
    await assignment.deleteOne();

    res.status(200).json({ success: true, data: {} });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// ============================================
// STUDENT — Submit assignment
// ============================================

/**
 * @desc    Submit an assignment
 * @route   POST /api/assignments/:id/submit
 * @access  Private (Student)
 */
router.post('/:id/submit', protect, upload.single('file'), async (req, res) => {
  try {
    const assignment = await Assignment.findById(req.params.id);
    if (!assignment) {
      return res.status(404).json({ success: false, message: 'Assignment not found' });
    }

    if (assignment.status === 'closed') {
      return res.status(400).json({ success: false, message: 'This assignment is closed for submissions' });
    }

    // Check enrollment
    const enrollment = await Enrollment.findOne({
      user: req.user.id,
      course: assignment.course,
      status: 'active',
    });

    if (!enrollment && req.user.role !== 'admin') {
      return res.status(403).json({ success: false, message: 'You must be enrolled in this course to submit assignments' });
    }

    // Check for existing submission
    const existingSubmission = await AssignmentSubmission.findOne({
      assignment: req.params.id,
      student: req.user.id,
    }).sort('-submittedAt');

    if (existingSubmission && existingSubmission.status !== 'graded') {
      // Update existing ungraded submission
      existingSubmission.textResponse = req.body.textResponse || existingSubmission.textResponse;
      if (req.file) existingSubmission.fileUrl = req.file.path;
      existingSubmission.submittedAt = new Date();
      await existingSubmission.save();

      return res.status(200).json({ success: true, message: 'Submission updated', data: existingSubmission });
    }

    if (existingSubmission && !assignment.allowResubmission) {
      return res.status(400).json({ success: false, message: 'Resubmission is not allowed for this assignment' });
    }

    // Create new submission (or resubmission)
    const submissionData = {
      assignment: req.params.id,
      student: req.user.id,
      textResponse: req.body.textResponse || '',
      status: existingSubmission ? 'resubmitted' : 'submitted',
    };

    if (req.file) {
      submissionData.fileUrl = req.file.path;
    }

    const submission = await AssignmentSubmission.create(submissionData);

    // Send notification
    await Notification.create({
      user: req.user.id,
      type: 'system',
      message: `Your assignment "${assignment.title}" has been submitted successfully.`,
      link: `/dashboard/assignments`,
    });

    res.status(201).json({ success: true, data: submission });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// ============================================
// ADMIN — View submissions for an assignment
// ============================================

/**
 * @desc    Get all submissions for an assignment
 * @route   GET /api/assignments/:id/submissions
 * @access  Private/Admin/Instructor
 */
router.get('/:id/submissions', protect, authorize('admin', 'instructor'), async (req, res) => {
  try {
    const submissions = await AssignmentSubmission.find({ assignment: req.params.id })
      .populate('student', 'name email avatar')
      .populate('gradedBy', 'name')
      .sort('-submittedAt');

    res.status(200).json({ success: true, count: submissions.length, data: submissions });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

/**
 * @desc    Grade a submission
 * @route   PUT /api/assignments/submissions/:submissionId/grade
 * @access  Private/Admin/Instructor
 */
router.put('/submissions/:submissionId/grade', protect, authorize('admin', 'instructor'), async (req, res) => {
  try {
    const { grade, feedback } = req.body;

    if (grade === undefined || grade === null) {
      return res.status(400).json({ success: false, message: 'Please provide a grade' });
    }

    const submission = await AssignmentSubmission.findById(req.params.submissionId);
    if (!submission) {
      return res.status(404).json({ success: false, message: 'Submission not found' });
    }

    // Validate grade against assignment max marks
    const assignment = await Assignment.findById(submission.assignment);
    if (assignment && grade > assignment.maxMarks) {
      return res.status(400).json({
        success: false,
        message: `Grade cannot exceed maximum marks (${assignment.maxMarks})`,
      });
    }

    submission.grade = grade;
    submission.feedback = feedback || '';
    submission.status = 'graded';
    submission.gradedAt = new Date();
    submission.gradedBy = req.user.id;
    await submission.save();

    // Notify student
    await Notification.create({
      user: submission.student,
      type: 'system',
      message: `Your assignment "${assignment?.title}" has been graded. Score: ${grade}/${assignment?.maxMarks}`,
      link: `/dashboard/assignments`,
    });

    res.status(200).json({ success: true, data: submission });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

/**
 * @desc    Get current user's submissions
 * @route   GET /api/assignments/my-submissions
 * @access  Private
 */
router.get('/my/submissions', protect, async (req, res) => {
  try {
    const submissions = await AssignmentSubmission.find({ student: req.user.id })
      .populate({
        path: 'assignment',
        select: 'title description dueDate maxMarks course',
        populate: { path: 'course', select: 'title' },
      })
      .sort('-submittedAt');

    res.status(200).json({ success: true, count: submissions.length, data: submissions });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

export default router;
