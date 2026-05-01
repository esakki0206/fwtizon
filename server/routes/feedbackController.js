import FeedbackForm from '../models/FeedbackForm.js';
import FeedbackSubmission from '../models/FeedbackSubmission.js';
import Review from '../models/Review.js';
import Enrollment from '../models/Enrollment.js';
import LiveCourse from '../models/LiveCourse.js';
import Certificate from '../models/Certificate.js';
import Counter from '../models/Counter.js';
import Notification from '../models/Notification.js';
import mongoose from 'mongoose';
import { buildFeedbackInsights } from '../utils/feedbackInsights.js';
import { generateCertificatePDF } from '../utils/generateCertificatePDF.js';
import { uploadPdfToCloudinary } from '../utils/uploadPdfToCloudinary.js';

const isValidObjectId = (id) => /^[0-9a-fA-F]{24}$/.test(id);
const escapeRegex = (value = '') => String(value).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

const parseDateFilter = (value, boundary) => {
  if (!value) return null;
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return false;
  if (boundary === 'end') parsed.setHours(23, 59, 59, 999);
  if (boundary === 'start') parsed.setHours(0, 0, 0, 0);
  return parsed;
};

/**
 * SINGLE SOURCE OF TRUTH: Helper to determine if a feedback form is unlocked.
 * Uses UTC server time for consistency.
 */
export const isFormUnlocked = (form, liveCourse) => {
  if (!form || !form.isActive) return false;

  const now = new Date(); // Server UTC time

  // Check submission deadline
  if (form.submissionDeadline && new Date(form.submissionDeadline) < now) {
    return false;
  }

  // Check manual unlock date
  if (form.unlockDate && new Date(form.unlockDate) <= now) {
    return true;
  }

  // Auto-unlock if course endDate has passed
  if (liveCourse && liveCourse.endDate && new Date(liveCourse.endDate) <= now) {
    return true;
  }

  // Check manual course completion status
  return liveCourse && liveCourse.status === 'Completed';
};

// ==============================
// ADMIN: Feedback Form CRUD
// ==============================

export const createFeedbackForm = async (req, res) => {
  try {
    const { liveCourseId, title, instructions, questions, unlockDate, submissionDeadline } = req.body;

    if (!liveCourseId || !title || !questions || !questions.length) {
      return res.status(400).json({ success: false, message: 'liveCourseId, title, and at least one question are required' });
    }

    if (!isValidObjectId(liveCourseId)) {
      return res.status(400).json({ success: false, message: 'Invalid live course ID' });
    }

    const liveCourse = await LiveCourse.findById(liveCourseId);
    if (!liveCourse) {
      return res.status(404).json({ success: false, message: 'Live course not found' });
    }

    const existing = await FeedbackForm.findOne({ liveCourse: liveCourseId });
    if (existing) {
      return res.status(400).json({ success: false, message: 'A feedback form already exists for this live course' });
    }

    // Validate questions structure
    for (const q of questions) {
      if (!q.text || !q.text.trim()) {
        return res.status(400).json({ success: false, message: 'All questions must have text' });
      }
      if (q.type === 'select' && (!q.options || q.options.length < 2)) {
        return res.status(400).json({ success: false, message: 'Select questions must have at least 2 options' });
      }
    }

    const form = await FeedbackForm.create({
      liveCourse: liveCourseId,
      title: title.trim(),
      instructions: instructions?.trim() || '',
      questions,
      unlockDate: unlockDate || null,
      submissionDeadline: submissionDeadline || null,
      createdBy: req.user.id,
    });

    res.status(201).json({ success: true, data: form });
  } catch (error) {
    if (error.code === 11000) {
      return res.status(400).json({ success: false, message: 'A feedback form already exists for this live course' });
    }
    console.error('Create feedback form error:', error);
    res.status(500).json({ success: false, message: 'Failed to create feedback form' });
  }
};

export const updateFeedbackForm = async (req, res) => {
  try {
    const { id } = req.params;
    if (!isValidObjectId(id)) {
      return res.status(400).json({ success: false, message: 'Invalid form ID' });
    }

    const form = await FeedbackForm.findById(id);
    if (!form) {
      return res.status(404).json({ success: false, message: 'Feedback form not found' });
    }

    const { title, instructions, questions, unlockDate, submissionDeadline, isActive } = req.body;

    if (title !== undefined) form.title = title.trim();
    if (instructions !== undefined) form.instructions = instructions.trim();
    if (questions !== undefined) {
      if (!questions.length) {
        return res.status(400).json({ success: false, message: 'At least one question is required' });
      }
      for (const q of questions) {
        if (!q.text || !q.text.trim()) {
          return res.status(400).json({ success: false, message: 'All questions must have text' });
        }
        if (q.type === 'select' && (!q.options || q.options.length < 2)) {
          return res.status(400).json({ success: false, message: 'Select questions must have at least 2 options' });
        }
      }
      form.questions = questions;
    }
    if (unlockDate !== undefined) form.unlockDate = unlockDate || null;
    if (submissionDeadline !== undefined) form.submissionDeadline = submissionDeadline || null;
    if (isActive !== undefined) form.isActive = isActive;

    await form.save();
    res.status(200).json({ success: true, data: form });
  } catch (error) {
    console.error('Update feedback form error:', error);
    res.status(500).json({ success: false, message: 'Failed to update feedback form' });
  }
};

export const getAllFeedbackForms = async (req, res) => {
  try {
    const forms = await FeedbackForm.find()
      .populate('liveCourse', 'title status startDate endDate')
      .populate('createdBy', 'name')
      .sort('-createdAt')
      .lean();

    // Attach submission stats for each form
    const formsWithStats = await Promise.all(forms.map(async (form) => {
      const totalSubmissions = await FeedbackSubmission.countDocuments({ feedbackForm: form._id });
      const totalEnrolled = await Enrollment.countDocuments({
        liveCourse: form.liveCourse?._id,
        status: { $in: ['active', 'completed'] },
      });

      // Determine unlock status using the single source of truth function
      const isUnlocked = isFormUnlocked(form, form.liveCourse);

      return {
        ...form,
        stats: {
          totalEnrolled,
          totalSubmissions,
          totalPending: Math.max(0, totalEnrolled - totalSubmissions),
        },
        isUnlocked,
      };
    }));

    res.status(200).json({ success: true, count: formsWithStats.length, data: formsWithStats });
  } catch (error) {
    console.error('Get feedback forms error:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch feedback forms' });
  }
};

export const getFeedbackFormById = async (req, res) => {
  try {
    const { id } = req.params;
    if (!isValidObjectId(id)) {
      return res.status(400).json({ success: false, message: 'Invalid form ID' });
    }

    const form = await FeedbackForm.findById(id)
      .populate('liveCourse', 'title status startDate endDate domain areaOfExpertise')
      .populate('createdBy', 'name');

    if (!form) {
      return res.status(404).json({ success: false, message: 'Feedback form not found' });
    }

    res.status(200).json({ success: true, data: form });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to fetch feedback form' });
  }
};

export const deleteFeedbackForm = async (req, res) => {
  try {
    const { id } = req.params;
    if (!isValidObjectId(id)) {
      return res.status(400).json({ success: false, message: 'Invalid form ID' });
    }

    const form = await FeedbackForm.findByIdAndDelete(id);
    if (!form) {
      return res.status(404).json({ success: false, message: 'Feedback form not found' });
    }

    // Clean up submissions
    await FeedbackSubmission.deleteMany({ feedbackForm: id });

    res.status(200).json({ success: true, data: {} });
  } catch (error) {
    console.error('Delete feedback form error:', error);
    res.status(500).json({ success: false, message: 'Failed to delete feedback form' });
  }
};

export const toggleFeedbackForm = async (req, res) => {
  try {
    const { id } = req.params;
    if (!isValidObjectId(id)) {
      return res.status(400).json({ success: false, message: 'Invalid form ID' });
    }

    const form = await FeedbackForm.findById(id);
    if (!form) {
      return res.status(404).json({ success: false, message: 'Feedback form not found' });
    }

    form.isActive = !form.isActive;
    await form.save();

    res.status(200).json({ success: true, data: form });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to toggle feedback form' });
  }
};

export const getFormResponses = async (req, res) => {
  try {
    const { id } = req.params;
    if (!isValidObjectId(id)) {
      return res.status(400).json({ success: false, message: 'Invalid form ID' });
    }

    const form = await FeedbackForm.findById(id).populate('liveCourse', 'title').lean();
    if (!form) {
      return res.status(404).json({ success: false, message: 'Feedback form not found' });
    }

    const submissions = await FeedbackSubmission.find({ feedbackForm: id })
      .populate('user', 'name email avatar')
      .sort('-submittedAt')
      .lean();

    // Get all enrolled students for this course to show who hasn't submitted
    const enrollments = await Enrollment.find({
      liveCourse: form.liveCourse?._id,
      status: { $in: ['active', 'completed'] },
    }).populate('user', 'name email avatar').lean();

    const submittedUserIds = new Set(submissions.map(s => s.user?._id?.toString()));
    const pendingStudents = enrollments
      .filter(e => e.user && !submittedUserIds.has(e.user._id.toString()))
      .map(e => ({ userId: e.user._id, name: e.user.name, email: e.user.email, avatar: e.user.avatar }));

    res.status(200).json({
      success: true,
      data: {
        form,
        submissions,
        pendingStudents,
        stats: {
          total: enrollments.length,
          submitted: submissions.length,
          pending: pendingStudents.length,
        },
      },
    });
  } catch (error) {
    console.error('Get form responses error:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch responses' });
  }
};

export const resetSubmission = async (req, res) => {
  try {
    const { id, subId } = req.params;
    if (!isValidObjectId(id) || !isValidObjectId(subId)) {
      return res.status(400).json({ success: false, message: 'Invalid ID' });
    }

    const submission = await FeedbackSubmission.findOneAndDelete({ _id: subId, feedbackForm: id });
    if (!submission) {
      return res.status(404).json({ success: false, message: 'Submission not found' });
    }

    res.status(200).json({ success: true, message: 'Submission reset successfully' });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to reset submission' });
  }
};

export const getCourseFeedbackSummary = async (req, res) => {
  try {
    const {
      courseId,
      rating,
      from,
      to,
      search,
      page = 1,
      limit = 10,
    } = req.query;

    const queryRating = rating ? Number(rating) : null;
    const fromDate = parseDateFilter(from, 'start');
    const toDate = parseDateFilter(to, 'end');
    const searchTerm = search && search.trim() ? search.trim() : null;

    // ── Build filters for both models ──
    const reviewMatch = {};
    const subMatch = {};

    if (courseId) {
      if (!isValidObjectId(courseId)) {
        return res.status(400).json({ success: false, message: 'Invalid course ID' });
      }
      const oid = new mongoose.Types.ObjectId(courseId);
      reviewMatch.course = oid;
      subMatch.liveCourse = oid;
    }

    if (queryRating) {
      reviewMatch.rating = queryRating;
      // For submissions, we'll filter after flattening
    }

    if (fromDate || toDate) {
      const dateFilter = {};
      if (fromDate) dateFilter.$gte = fromDate;
      if (toDate) dateFilter.$lte = toDate;
      reviewMatch.createdAt = dateFilter;
      subMatch.createdAt = dateFilter;
    }

    if (searchTerm) {
      reviewMatch.comment = { $regex: escapeRegex(searchTerm), $options: 'i' };
      // For submissions, we'll filter after flattening
    }

    // ── Fetch data from both sources ──
    const [reviews, submissions] = await Promise.all([
      Review.find(reviewMatch)
        .populate('user', 'name email avatar')
        .populate('course', 'title')
        .sort('-createdAt')
        .lean(),
      FeedbackSubmission.find(subMatch)
        .populate('feedbackForm')
        .populate('user', 'name email avatar')
        .populate('liveCourse', 'title')
        .sort('-createdAt')
        .lean(),
    ]);

    // ── Flatten Submissions ──
    const flattenedSubmissions = submissions.map(sub => {
      const form = sub.feedbackForm;
      if (!form || !form.questions) return null;

      // Identify rating and comment questions
      const ratingQIdx = form.questions.findIndex(q => q.type === 'rating');
      const commentQIdx = form.questions.findIndex(q => q.type === 'textarea' || q.type === 'text');

      const ratingRes = sub.responses.find(r => r.questionIndex === ratingQIdx);
      const commentRes = sub.responses.find(r => r.questionIndex === commentQIdx);

      const ratingVal = ratingRes ? Number(ratingRes.answer) : null;
      const commentVal = commentRes ? String(commentRes.answer) : '';

      // Post-flattening filters
      if (queryRating && ratingVal !== queryRating) return null;
      if (searchTerm && !new RegExp(escapeRegex(searchTerm), 'i').test(commentVal)) return null;

      return {
        _id: sub._id,
        rating: ratingVal,
        comment: commentVal,
        user: sub.user,
        course: sub.liveCourse, // unified field name
        createdAt: sub.createdAt,
        isSubmission: true,
        formTitle: form.title,
      };
    }).filter(Boolean);

    // ── Merge and Sort ──
    const allFeedback = [
      ...reviews.map(r => ({ ...r, isSubmission: false })),
      ...flattenedSubmissions,
    ].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

    // ── Calculate Summary Stats ──
    const totalReviews = allFeedback.length;
    const feedbackWithRating = allFeedback.filter(f => f.rating !== null);
    const sumRating = feedbackWithRating.reduce((acc, f) => acc + f.rating, 0);
    const averageRating = feedbackWithRating.length ? sumRating / feedbackWithRating.length : 0;
    
    const satisfiedCount = feedbackWithRating.filter(f => f.rating >= 4).length;
    const satisfactionPercent = feedbackWithRating.length 
      ? Math.round((satisfiedCount / feedbackWithRating.length) * 1000) / 10 
      : 0;

    // Distribution
    const distribution = [5, 4, 3, 2, 1].map(star => ({
      star,
      count: feedbackWithRating.filter(f => f.rating === star).length,
    }));

    // Pagination
    const currentPage = Math.max(parseInt(page, 10) || 1, 1);
    const pageSize = Math.min(Math.max(parseInt(limit, 10) || 10, 1), 50);
    const skip = (currentPage - 1) * pageSize;
    const paginatedFeedback = allFeedback.slice(skip, skip + pageSize);

    // Course Summaries (optional top 10 list)
    const courseStatsMap = new Map();
    allFeedback.forEach(f => {
      const c = f.course;
      if (!c || !c._id) return;
      const cid = c._id.toString();
      if (!courseStatsMap.has(cid)) {
        courseStatsMap.set(cid, { title: c.title, sum: 0, count: 0 });
      }
      if (f.rating !== null) {
        const stats = courseStatsMap.get(cid);
        stats.sum += f.rating;
        stats.count += 1;
      }
    });

    const courseSummaries = Array.from(courseStatsMap.entries())
      .map(([id, stats]) => ({
        courseId: id,
        courseTitle: stats.title,
        averageRating: stats.count ? Math.round((stats.sum / stats.count) * 10) / 10 : 0,
        feedbackCount: stats.count,
      }))
      .sort((a, b) => b.feedbackCount - a.feedbackCount)
      .slice(0, 10);

    res.status(200).json({
      success: true,
      data: {
        summary: {
          averageRating: Math.round(averageRating * 10) / 10,
          totalReviews,
          satisfactionPercent,
        },
        ratingDistribution: distribution,
        courseSummaries,
        insights: buildFeedbackInsights(allFeedback.slice(0, 500)), // Analyze up to 500 recent items
        recentFeedback: paginatedFeedback,
        pagination: {
          page: currentPage,
          limit: pageSize,
          total: totalReviews,
          totalPages: Math.max(Math.ceil(totalReviews / pageSize), 1),
        },
      },
    });
  } catch (error) {
    console.error('Get course feedback summary error:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch feedback summary' });
  }
};

// ==============================
// STUDENT: Feedback endpoints
// ==============================

// Removed from here as it's moved to the top

/**
 * @desc    Get all eligible feedback forms for the logged-in student
 * @route   GET /api/feedback/my-forms
 * @access  Private
 */
export const getMyFeedbackForms = async (req, res) => {
  try {
    // Find all live course enrollments for this user
    const enrollments = await Enrollment.find({
      user: req.user.id,
      liveCourse: { $exists: true, $ne: null },
      status: { $in: ['active', 'completed'] },
    }).populate({
      path: 'liveCourse',
      select: 'title status startDate endDate thumbnail',
    }).lean();

    if (!enrollments.length) {
      return res.status(200).json({ success: true, count: 0, data: [] });
    }

    const liveCourseIds = enrollments.map(e => e.liveCourse?._id).filter(Boolean);

    // Find feedback forms for enrolled courses
    const forms = await FeedbackForm.find({
      liveCourse: { $in: liveCourseIds },
      isActive: true,
    }).populate('liveCourse', 'title status startDate endDate thumbnail').lean();

    // Check submission status for each form
    const existingSubmissions = await FeedbackSubmission.find({
      user: req.user.id,
      feedbackForm: { $in: forms.map(f => f._id) },
    }).lean();

    const submissionMap = new Map(existingSubmissions.map(s => [s.feedbackForm.toString(), s]));

    // Check certificate status
    const certificates = await Certificate.find({
      user: req.user.id,
      liveCourse: { $in: liveCourseIds },
      type: 'COHORT',
    }).select('liveCourse certificateId').lean();

    const certMap = new Map(certificates.map(c => [c.liveCourse.toString(), c]));

    const result = forms.map(form => {
      const unlocked = isFormUnlocked(form, form.liveCourse);
      const submission = submissionMap.get(form._id.toString());
      const cert = certMap.get(form.liveCourse._id.toString());

      return {
        _id: form._id,
        title: form.title,
        instructions: form.instructions,
        liveCourse: form.liveCourse,
        questionCount: form.questions.length,
        isUnlocked: unlocked,
        isSubmitted: !!submission,
        submittedAt: submission?.submittedAt || null,
        certificate: cert ? {
          certificateId: cert.certificateId,
          downloadUrl: `/api/certificates/${cert.certificateId}/download`,
          viewUrl: `/api/certificates/${cert.certificateId}/view`,
        } : null,
      };
    });

    res.status(200).json({ success: true, count: result.length, data: result });
  } catch (error) {
    console.error('Get my feedback forms error:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch feedback forms' });
  }
};

/**
 * @desc    Get a specific feedback form for a live course (with questions)
 * @route   GET /api/feedback/form/:liveCourseId
 * @access  Private (enrolled students only)
 */
export const getFeedbackForm = async (req, res) => {
  try {
    const { liveCourseId } = req.params;
    if (!isValidObjectId(liveCourseId)) {
      return res.status(400).json({ success: false, message: 'Invalid course ID' });
    }

    // Verify enrollment
    const enrollment = await Enrollment.findOne({
      user: req.user.id,
      liveCourse: liveCourseId,
      status: { $in: ['active', 'completed'] },
    });

    if (!enrollment) {
      return res.status(403).json({ success: false, message: 'You are not enrolled in this course' });
    }

    const liveCourse = await LiveCourse.findById(liveCourseId).select('title status startDate endDate');
    if (!liveCourse) {
      return res.status(404).json({ success: false, message: 'Live course not found' });
    }

    const form = await FeedbackForm.findOne({ liveCourse: liveCourseId, isActive: true });
    if (!form) {
      return res.status(404).json({ success: false, message: 'No feedback form available for this course' });
    }

    const unlocked = isFormUnlocked(form, liveCourse);
    if (!unlocked) {
      return res.status(200).json({
        success: true,
        data: {
          _id: form._id,
          title: form.title,
          liveCourse: { _id: liveCourse._id, title: liveCourse.title, status: liveCourse.status },
          isUnlocked: false,
          message: 'This feedback form is not yet available. It will unlock after the course is completed.',
        },
      });
    }

    // Check if already submitted
    const existingSubmission = await FeedbackSubmission.findOne({ feedbackForm: form._id, user: req.user.id });
    if (existingSubmission) {
      const cert = await Certificate.findOne({ user: req.user.id, liveCourse: liveCourseId, type: 'COHORT' })
        .select('certificateId');

      return res.status(200).json({
        success: true,
        data: {
          _id: form._id,
          title: form.title,
          liveCourse: { _id: liveCourse._id, title: liveCourse.title, status: liveCourse.status },
          isUnlocked: true,
          isSubmitted: true,
          submittedAt: existingSubmission.submittedAt,
          certificate: cert ? {
            certificateId: cert.certificateId,
            downloadUrl: `/api/certificates/${cert.certificateId}/download`,
            viewUrl: `/api/certificates/${cert.certificateId}/view`,
          } : null,
        },
      });
    }

    // Return full form with questions
    res.status(200).json({
      success: true,
      data: {
        _id: form._id,
        title: form.title,
        instructions: form.instructions,
        questions: form.questions,
        liveCourse: { _id: liveCourse._id, title: liveCourse.title, status: liveCourse.status },
        isUnlocked: true,
        isSubmitted: false,
        submissionDeadline: form.submissionDeadline,
      },
    });
  } catch (error) {
    console.error('Get feedback form error:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch feedback form' });
  }
};

/**
 * @desc    Submit feedback + auto-generate certificate
 * @route   POST /api/feedback/submit/:formId
 * @access  Private (enrolled students only)
 */
export const submitFeedback = async (req, res) => {
  try {
    const { formId } = req.params;
    const { responses } = req.body;

    if (!isValidObjectId(formId)) {
      return res.status(400).json({ success: false, message: 'Invalid form ID' });
    }

    if (!responses || !Array.isArray(responses) || !responses.length) {
      return res.status(400).json({ success: false, message: 'Responses are required' });
    }

    // Get the form
    const form = await FeedbackForm.findById(formId);
    if (!form || !form.isActive) {
      return res.status(404).json({ success: false, message: 'Feedback form not found or inactive' });
    }

    // Get the live course
    const liveCourse = await LiveCourse.findById(form.liveCourse);
    if (!liveCourse) {
      return res.status(404).json({ success: false, message: 'Associated live course not found' });
    }

    // Verify unlock status
    if (!isFormUnlocked(form, liveCourse)) {
      return res.status(403).json({ success: false, message: 'This feedback form is not yet available' });
    }

    // Verify enrollment
    const enrollment = await Enrollment.findOne({
      user: req.user.id,
      liveCourse: liveCourse._id,
      status: { $in: ['active', 'completed'] },
    });

    if (!enrollment) {
      return res.status(403).json({ success: false, message: 'You are not enrolled in this course' });
    }

    // Check for duplicate submission
    const existingSub = await FeedbackSubmission.findOne({ feedbackForm: formId, user: req.user.id });
    if (existingSub) {
      return res.status(400).json({ success: false, message: 'You have already submitted feedback for this course' });
    }

    // Validate required questions are answered
    const requiredIndices = form.questions
      .map((q, i) => q.required ? i : null)
      .filter(i => i !== null);

    const answeredIndices = new Set(responses.map(r => r.questionIndex));
    const missingRequired = requiredIndices.filter(i => !answeredIndices.has(i));

    if (missingRequired.length > 0) {
      return res.status(400).json({
        success: false,
        message: `Please answer all required questions. Missing question(s): ${missingRequired.map(i => i + 1).join(', ')}`,
      });
    }

    // Validate rating values
    for (const r of responses) {
      if (r.questionIndex < 0 || r.questionIndex >= form.questions.length) {
        return res.status(400).json({ success: false, message: 'Invalid question index in responses' });
      }
      const question = form.questions[r.questionIndex];
      if (question.type === 'rating') {
        const val = Number(r.answer);
        if (isNaN(val) || val < 1 || val > 5) {
          return res.status(400).json({ success: false, message: `Rating for question ${r.questionIndex + 1} must be between 1 and 5` });
        }
      }
      if (question.required && (!r.answer || (typeof r.answer === 'string' && !r.answer.trim()))) {
        return res.status(400).json({ success: false, message: `Question ${r.questionIndex + 1} is required` });
      }
    }

    // Create submission
    const submission = await FeedbackSubmission.create({
      feedbackForm: formId,
      user: req.user.id,
      liveCourse: liveCourse._id,
      enrollment: enrollment._id,
      responses,
    });

    // ── Auto-generate certificate ──
    let certificateData = null;
    try {
      // Check if certificate already exists
      const existingCert = await Certificate.findOne({
        user: req.user.id,
        liveCourse: liveCourse._id,
        type: 'COHORT',
      });

      if (!existingCert) {
        const serialNumber = await Counter.getNextSequence('certificates');
        const paddedSerial = String(serialNumber).padStart(4, '0');
        const currentYear = new Date().getFullYear();
        const certificateId = `FWT-IZON-${currentYear}-${paddedSerial}`;

        const pdfData = {
          studentName: req.user.name,
          courseName: liveCourse.title,
          domain: liveCourse.domain || 'Professional Development',
          areaOfExpertise: liveCourse.areaOfExpertise || 'Specialized Training',
          completionDate: new Date(),
          certificateId,
          serialNumber,
        };

        const pdfBuffer = await generateCertificatePDF(pdfData);
        const fileUrl = await uploadPdfToCloudinary(
          pdfBuffer,
          `${certificateId}-${req.user.id}`,
          'fwtion/certificates'
        );

        const cert = await Certificate.create({
          certificateId,
          user: req.user.id,
          liveCourse: liveCourse._id,
          studentName: req.user.name,
          studentEmail: req.user.email,
          courseName: liveCourse.title,
          domain: pdfData.domain,
          areaOfExpertise: pdfData.areaOfExpertise,
          issueDate: new Date(),
          completionDate: pdfData.completionDate,
          serialNumber,
          fileUrl,
          enrollment: enrollment._id,
          type: 'COHORT',
        });

        // Update enrollment
        enrollment.certificateId = cert.certificateId;
        if (enrollment.status !== 'completed') {
          enrollment.status = 'completed';
          enrollment.completedAt = new Date();
        }
        await enrollment.save({ validateBeforeSave: false });

        certificateData = {
          certificateId: cert.certificateId,
          downloadUrl: `/api/certificates/${cert.certificateId}/download`,
          viewUrl: `/api/certificates/${cert.certificateId}/view`,
        };

        // Notify student
        await Notification.create({
          user: req.user.id,
          type: 'system',
          message: `Your certificate for "${liveCourse.title}" is ready! Download it from your dashboard.`,
          link: '/dashboard/certificates',
        });
      } else {
        certificateData = {
          certificateId: existingCert.certificateId,
          downloadUrl: `/api/certificates/${existingCert.certificateId}/download`,
          viewUrl: `/api/certificates/${existingCert.certificateId}/view`,
        };
      }
    } catch (certError) {
      console.error('Auto-certificate generation failed after feedback submission:', certError);
      // Feedback was still submitted successfully — don't fail the whole request
    }

    res.status(201).json({
      success: true,
      message: 'Feedback submitted successfully',
      data: {
        submission: { _id: submission._id, submittedAt: submission.submittedAt },
        certificate: certificateData,
      },
    });
  } catch (error) {
    if (error.code === 11000) {
      return res.status(400).json({ success: false, message: 'You have already submitted feedback for this course' });
    }
    console.error('Submit feedback error:', error);
    res.status(500).json({ success: false, message: 'Failed to submit feedback' });
  }
};

/**
 * @desc    Check feedback & certificate status for a live course
 * @route   GET /api/feedback/status/:liveCourseId
 * @access  Private
 */
export const getFeedbackStatus = async (req, res) => {
  try {
    const { liveCourseId } = req.params;
    if (!isValidObjectId(liveCourseId)) {
      return res.status(400).json({ success: false, message: 'Invalid course ID' });
    }

    // Verify enrollment
    const enrollment = await Enrollment.findOne({
      user: req.user.id,
      liveCourse: liveCourseId,
      status: { $in: ['active', 'completed'] },
    });

    if (!enrollment) {
      return res.status(200).json({
        success: true,
        data: { enrolled: false },
      });
    }

    const liveCourse = await LiveCourse.findById(liveCourseId).select('title status endDate');
    const form = await FeedbackForm.findOne({ liveCourse: liveCourseId, isActive: true }).select('_id title unlockDate submissionDeadline isActive');

    if (!form) {
      return res.status(200).json({
        success: true,
        data: { enrolled: true, formAvailable: false },
      });
    }

    const unlocked = liveCourse ? isFormUnlocked(form, liveCourse) : false;
    const submission = await FeedbackSubmission.findOne({ feedbackForm: form._id, user: req.user.id }).select('submittedAt');
    const cert = await Certificate.findOne({ user: req.user.id, liveCourse: liveCourseId, type: 'COHORT' }).select('certificateId');

    res.status(200).json({
      success: true,
      data: {
        enrolled: true,
        formAvailable: true,
        formId: form._id,
        formTitle: form.title,
        isUnlocked: unlocked,
        isSubmitted: !!submission,
        submittedAt: submission?.submittedAt || null,
        certificate: cert ? {
          certificateId: cert.certificateId,
          downloadUrl: `/api/certificates/${cert.certificateId}/download`,
          viewUrl: `/api/certificates/${cert.certificateId}/view`,
        } : null,
      },
    });
  } catch (error) {
    console.error('Get feedback status error:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch feedback status' });
  }
};
