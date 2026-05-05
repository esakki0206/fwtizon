import FeedbackForm from '../models/FeedbackForm.js';
import FeedbackSubmission from '../models/FeedbackSubmission.js';
import Review from '../models/Review.js';
import Enrollment from '../models/Enrollment.js';
import LiveCourse from '../models/LiveCourse.js';
import Certificate from '../models/Certificate.js';
import CertificateTemplate from '../models/CertificateTemplate.js';
import Counter from '../models/Counter.js';
import Notification from '../models/Notification.js';
import mongoose from 'mongoose';
import { buildFeedbackInsights } from '../utils/feedbackInsights.js';
import { generateCertificatePDF } from '../utils/generateCertificatePDF.js';
import { uploadPdfToCloudinary } from '../utils/uploadPdfToCloudinary.js';
import { buildAndStoreCertificate } from './certificateController.js';

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
export const isFormUnlocked = (form, courseObj) => {
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
  if (courseObj && courseObj.endDate && new Date(courseObj.endDate) <= now) {
    return true;
  }

  // Check manual course completion status
  if (courseObj && courseObj.status === 'Completed') {
    return true;
  }

  // Normal courses don't have endDate/status, so the form is globally unlocked. User eligibility is checked via enrollment.
  if (form.course) {
    return true;
  }

  return false;
};

// ==============================
// ADMIN: Feedback Form CRUD
// ==============================

const VALID_CERTIFICATE_TYPES = ['Completion Certificate', 'Participation Certificate', 'Excellence Certificate'];

const normalizeCertificateTypes = (certificateTypes) => {
  const values = Array.isArray(certificateTypes) ? certificateTypes : [certificateTypes];
  return values.filter(type => VALID_CERTIFICATE_TYPES.includes(type));
};

const getConfiguredCertificateType = (form) => {
  const validTypes = normalizeCertificateTypes(form?.availableCertificateTypes);
  return validTypes[0] || 'Completion Certificate';
};

const validateActiveCertificateTemplate = async (templateId, { required = false } = {}) => {
  if (!templateId) {
    if (!required) return null;
    const error = new Error('Certificate template selection is required');
    error.statusCode = 400;
    throw error;
  }

  if (!isValidObjectId(templateId)) {
    const error = new Error('Invalid certificate template ID');
    error.statusCode = 400;
    throw error;
  }

  const template = await CertificateTemplate.findById(templateId).select('_id isActive');
  if (!template) {
    const error = new Error('Certificate template not found');
    error.statusCode = 404;
    throw error;
  }

  if (!template.isActive) {
    const error = new Error('Selected certificate template is inactive');
    error.statusCode = 400;
    throw error;
  }

  return template._id;
};

export const createFeedbackForm = async (req, res) => {
  try {
    const { liveCourseId, courseId, title, instructions, questions, unlockDate, submissionDeadline, availableCertificateTypes, certificateTemplateId } = req.body;

    if ((!liveCourseId && !courseId) || !title || !questions || !questions.length) {
      return res.status(400).json({ success: false, message: 'Course ID, title, and at least one question are required' });
    }

    let existing;
    if (liveCourseId) {
      if (!isValidObjectId(liveCourseId)) return res.status(400).json({ success: false, message: 'Invalid live course ID' });
      existing = await FeedbackForm.findOne({ liveCourse: liveCourseId });
    } else if (courseId) {
      if (!isValidObjectId(courseId)) return res.status(400).json({ success: false, message: 'Invalid course ID' });
      existing = await FeedbackForm.findOne({ course: courseId });
    }

    if (existing) {
      return res.status(400).json({ success: false, message: 'A feedback form already exists for this course' });
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

    // Validate admin-configured certificate type. Feedback submitters do not choose this.
    let certTypes = ['Completion Certificate'];
    if (availableCertificateTypes !== undefined) {
      const validTypes = normalizeCertificateTypes(availableCertificateTypes);
      if (validTypes.length === 0) {
        return res.status(400).json({ success: false, message: 'At least one valid certificate type is required' });
      }
      certTypes = [validTypes[0]];
    }

    const selectedTemplateId = await validateActiveCertificateTemplate(certificateTemplateId, { required: true });

    const formPayload = {
      title: title.trim(),
      instructions: instructions?.trim() || '',
      questions,
      unlockDate: unlockDate || null,
      submissionDeadline: submissionDeadline || null,
      availableCertificateTypes: certTypes,
      certificateTemplate: selectedTemplateId,
      createdBy: req.user.id,
    };

    if (liveCourseId) formPayload.liveCourse = liveCourseId;
    if (courseId) formPayload.course = courseId;

    const form = await FeedbackForm.create(formPayload);

    res.status(201).json({ success: true, data: form });
  } catch (error) {
    if (error.code === 11000) {
      return res.status(400).json({ success: false, message: 'A feedback form already exists for this live course' });
    }
    console.error('Create feedback form error:', error);
    res.status(error.statusCode || 500).json({ success: false, message: error.statusCode ? error.message : 'Failed to create feedback form' });
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

    const { title, instructions, questions, unlockDate, submissionDeadline, isActive, availableCertificateTypes, certificateTemplateId } = req.body;

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
    if (availableCertificateTypes !== undefined) {
      const validTypes = normalizeCertificateTypes(availableCertificateTypes);
      if (validTypes.length === 0) {
        return res.status(400).json({ success: false, message: 'At least one valid certificate type is required' });
      }
      form.availableCertificateTypes = [validTypes[0]];
    }
    if (certificateTemplateId !== undefined) {
      form.certificateTemplate = await validateActiveCertificateTemplate(certificateTemplateId, { required: true });
    }

    await form.save();
    res.status(200).json({ success: true, data: form });
  } catch (error) {
    console.error('Update feedback form error:', error);
    res.status(error.statusCode || 500).json({ success: false, message: error.statusCode ? error.message : 'Failed to update feedback form' });
  }
};

export const getAllFeedbackForms = async (req, res) => {
  try {
    const forms = await FeedbackForm.find()
      .populate('liveCourse', 'title status startDate endDate')
      .populate('course', 'title')
      .populate('certificateTemplate', 'templateName isActive')
      .populate('createdBy', 'name')
      .sort('-createdAt')
      .lean();

    // Attach submission stats for each form
    const formsWithStats = await Promise.all(forms.map(async (form) => {
      const totalSubmissions = await FeedbackSubmission.countDocuments({ feedbackForm: form._id });
      const enrollmentQuery = form.liveCourse 
        ? { liveCourse: form.liveCourse._id, status: { $in: ['active', 'completed'] } }
        : { course: form.course?._id, status: { $in: ['active', 'completed'] } };

      const totalEnrolled = await Enrollment.countDocuments(enrollmentQuery);

      // Determine unlock status using the single source of truth function
      const isUnlocked = isFormUnlocked(form, form.liveCourse || form.course);

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
      .populate('course', 'title category domain areaOfExpertise')
      .populate('certificateTemplate', 'templateName isActive')
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

    const form = await FeedbackForm.findById(id).populate('liveCourse', 'title').populate('course', 'title').lean();
    if (!form) {
      return res.status(404).json({ success: false, message: 'Feedback form not found' });
    }

    const submissions = await FeedbackSubmission.find({ feedbackForm: id })
      .populate('user', 'name email avatar')
      .sort('-submittedAt')
      .lean();

    // Get all enrolled students for this course to show who hasn't submitted
    const enrollmentQuery = form.liveCourse
      ? { liveCourse: form.liveCourse._id, status: { $in: ['active', 'completed'] } }
      : { course: form.course?._id, status: { $in: ['active', 'completed'] } };

    const enrollments = await Enrollment.find(enrollmentQuery).populate('user', 'name email avatar').lean();

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

    // ── Build Filter Objects ──
    const reviewMatch = {};
    const subMatch = {};

    if (courseId) {
      if (!isValidObjectId(courseId)) {
        return res.status(400).json({ success: false, message: 'Invalid course ID' });
      }
      // When a specific ID is selected, we filter Review by 'course' 
      // and FeedbackSubmission by either 'liveCourse' or 'course'
      reviewMatch.course = courseId;
      subMatch.$or = [{ liveCourse: courseId }, { course: courseId }];
    }

    if (queryRating) {
      reviewMatch.rating = queryRating;
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
    }

    // ── Fetch Data Simultaneously ──
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
        .populate('course', 'title')
        .sort('-createdAt')
        .lean(),
    ]);

    // ── Transform Submissions into Unified Feedback Format ──
    const flattenedSubmissions = submissions.map(sub => {
      const form = sub.feedbackForm;
      if (!form || !form.questions) return null;

      // Map structured responses to a "rating" and a "comment"
      const ratingQIdx = form.questions.findIndex(q => q.type === 'rating');
      const commentQIdx = form.questions.findIndex(q => q.type === 'textarea' || q.type === 'text');

      const ratingRes = sub.responses.find(r => r.questionIndex === ratingQIdx);
      const commentRes = sub.responses.find(r => r.questionIndex === commentQIdx);

      const ratingVal = ratingRes ? Number(ratingRes.answer) : null;
      const commentVal = commentRes ? String(commentRes.answer) : '';

      // Apply filters that couldn't be done at the DB level (Rating & Search)
      if (queryRating && ratingVal !== queryRating) return null;
      if (searchTerm && !new RegExp(escapeRegex(searchTerm), 'i').test(commentVal)) return null;

      return {
        _id: sub._id,
        rating: ratingVal,
        comment: commentVal,
        user: sub.user,
        course: sub.liveCourse || sub.course || { title: 'Unknown Course' },
        createdAt: sub.createdAt,
        isSubmission: true,
        formTitle: form.title,
      };
    }).filter(Boolean);

    // ── Merge and Analyze ──
    const allFeedback = [
      ...reviews.map(r => ({ ...r, isSubmission: false })),
      ...flattenedSubmissions,
    ].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

    // Calculate Summary
    const totalReviews = allFeedback.length;
    const ratedFeedback = allFeedback.filter(f => f.rating !== null);
    const averageRating = ratedFeedback.length 
      ? ratedFeedback.reduce((acc, f) => acc + f.rating, 0) / ratedFeedback.length 
      : 0;
    
    const satisfactionPercent = ratedFeedback.length 
      ? Math.round((ratedFeedback.filter(f => f.rating >= 4).length / ratedFeedback.length) * 100) 
      : 0;

    // Distribution
    const ratingDistribution = [5, 4, 3, 2, 1].map(star => ({
      star,
      count: ratedFeedback.filter(f => f.rating === star).length,
    }));

    // Pagination
    const currentPage = Math.max(parseInt(page, 10) || 1, 1);
    const pageSize = Math.min(Math.max(parseInt(limit, 10) || 10, 1), 50);
    const skip = (currentPage - 1) * pageSize;
    const recentFeedback = allFeedback.slice(skip, skip + pageSize);

    // Top Courses/Cohorts list
    const topPerformers = Array.from(
      allFeedback.reduce((acc, f) => {
        const title = f.course?.title || 'Unknown';
        if (!acc.has(title)) acc.set(title, { sum: 0, count: 0 });
        if (f.rating !== null) {
          acc.get(title).sum += f.rating;
          acc.get(title).count += 1;
        }
        return acc;
      }, new Map()).entries()
    ).map(([title, stats]) => ({
      title,
      averageRating: stats.count ? Math.round((stats.sum / stats.count) * 10) / 10 : 0,
      count: stats.count
    })).sort((a, b) => b.count - a.count).slice(0, 5);

    res.status(200).json({
      success: true,
      data: {
        summary: {
          averageRating: Math.round(averageRating * 10) / 10,
          totalReviews,
          satisfactionPercent,
        },
        ratingDistribution,
        topPerformers,
        insights: buildFeedbackInsights(allFeedback.slice(0, 500)), 
        recentFeedback,
        pagination: {
          page: currentPage,
          limit: pageSize,
          total: totalReviews,
          totalPages: Math.ceil(totalReviews / pageSize) || 1,
        },
      },
    });
  } catch (error) {
    console.error('Feedback summary error:', error);
    res.status(500).json({ success: false, message: 'Failed to process feedback analytics' });
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
      $or: [{ liveCourse: { $exists: true, $ne: null } }, { course: { $exists: true, $ne: null } }],
      status: { $in: ['active', 'completed'] },
    }).populate({
      path: 'liveCourse',
      select: 'title status startDate endDate thumbnail',
    }).populate({
      path: 'course',
      select: 'title thumbnail category domain areaOfExpertise',
    }).lean();

    if (!enrollments.length) {
      return res.status(200).json({ success: true, count: 0, data: [] });
    }

    const liveCourseIds = enrollments.map(e => e.liveCourse?._id).filter(Boolean);
    const courseIds = enrollments.map(e => e.course?._id).filter(Boolean);

    // Find feedback forms for enrolled courses
    const forms = await FeedbackForm.find({
      $or: [
        { liveCourse: { $in: liveCourseIds } },
        { course: { $in: courseIds } }
      ],
      isActive: true,
    }).populate('liveCourse', 'title status startDate endDate thumbnail').populate('course', 'title thumbnail').lean();

    // Check submission status for each form
    const existingSubmissions = await FeedbackSubmission.find({
      user: req.user.id,
      feedbackForm: { $in: forms.map(f => f._id) },
    }).lean();

    const submissionMap = new Map(existingSubmissions.map(s => [s.feedbackForm.toString(), s]));

    // Check certificate status
    const certificates = await Certificate.find({
      user: req.user.id,
      $or: [
        { liveCourse: { $in: liveCourseIds } },
        { course: { $in: courseIds } }
      ]
    }).select('liveCourse course certificateId certificateType').lean();

    const certMap = new Map();
    certificates.forEach(c => {
      if (c.liveCourse) certMap.set(c.liveCourse.toString(), c);
      if (c.course) certMap.set(c.course.toString(), c);
    });

    const result = forms.map(form => {
      const courseObj = form.liveCourse || form.course;
      const unlocked = isFormUnlocked(form, courseObj);
      const submission = submissionMap.get(form._id.toString());
      const cert = certMap.get(courseObj?._id?.toString());

      return {
        _id: form._id,
        title: form.title,
        instructions: form.instructions,
        liveCourse: form.liveCourse,
        course: form.course,
        questionCount: form.questions.length,
        isUnlocked: unlocked,
        isSubmitted: !!submission,
        submittedAt: submission?.submittedAt || null,
        configuredCertificateType: getConfiguredCertificateType(form),
        certificate: cert ? {
          certificateId: cert.certificateId,
          certificateType: cert.certificateType || 'Completion Certificate',
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
    
    let courseObjectId = liveCourseId;
    if (!isValidObjectId(liveCourseId)) {
      const course = await mongoose.model('Course').findOne({ slug: liveCourseId }).select('_id');
      if (!course) return res.status(404).json({ success: false, message: 'Course not found' });
      courseObjectId = course._id;
    }

    // Verify enrollment
    const enrollment = await Enrollment.findOne({
      user: req.user.id,
      $or: [{ liveCourse: courseObjectId }, { course: courseObjectId }],
      status: { $in: ['active', 'completed'] },
    });

    if (!enrollment) {
      return res.status(403).json({ success: false, message: 'You are not enrolled in this course' });
    }

    const liveCourse = await LiveCourse.findById(courseObjectId).select('title status startDate endDate');
    const course = await mongoose.model('Course').findById(courseObjectId).select('title status');
    const courseObj = liveCourse || course;

    if (!courseObj) {
      return res.status(404).json({ success: false, message: 'Course not found' });
    }

    const form = await FeedbackForm.findOne({
      $or: [{ liveCourse: courseObjectId }, { course: courseObjectId }],
      isActive: true
    });

    if (!form) {
      return res.status(404).json({ success: false, message: 'No feedback form available for this course' });
    }

    const unlocked = isFormUnlocked(form, courseObj);
    if (!unlocked) {
      return res.status(200).json({
        success: true,
        data: {
          _id: form._id,
          title: form.title,
          course: { _id: courseObj._id, title: courseObj.title, status: courseObj.status },
          isUnlocked: false,
          message: 'This feedback form is not yet available. It will unlock after the course is completed.',
        },
      });
    }

    // Check if already submitted
    const existingSubmission = await FeedbackSubmission.findOne({ feedbackForm: form._id, user: req.user.id });
    if (existingSubmission) {
      const cert = await Certificate.findOne({ 
        user: req.user.id, 
        $or: [{ liveCourse: courseObjectId }, { course: courseObjectId }] 
      }).select('certificateId certificateType');

      return res.status(200).json({
        success: true,
        data: {
          _id: form._id,
          title: form.title,
          course: { _id: courseObj._id, title: courseObj.title, status: courseObj.status },
          isUnlocked: true,
          isSubmitted: true,
          submittedAt: existingSubmission.submittedAt,
          certificate: cert ? {
            certificateId: cert.certificateId,
            certificateType: cert.certificateType || 'Completion Certificate',
            downloadUrl: `/api/certificates/${cert.certificateId}/download`,
            viewUrl: `/api/certificates/${cert.certificateId}/view`,
          } : null,
        },
      });
    }

    // Return full form with questions. Certificate type is configured by admin.
    res.status(200).json({
      success: true,
      data: {
        _id: form._id,
        title: form.title,
        instructions: form.instructions,
        questions: form.questions,
        configuredCertificateType: getConfiguredCertificateType(form),
        course: { _id: courseObj._id, title: courseObj.title, status: courseObj.status },
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

    // Get the course
    const liveCourse = form.liveCourse ? await LiveCourse.findById(form.liveCourse) : null;
    const course = form.course ? await mongoose.model('Course').findById(form.course) : null;
    const courseObj = liveCourse || course;

    if (!courseObj) {
      return res.status(404).json({ success: false, message: 'Associated course not found' });
    }

    // Verify unlock status
    if (!isFormUnlocked(form, courseObj)) {
      return res.status(403).json({ success: false, message: 'This feedback form is not yet available' });
    }

    // Verify enrollment
    const enrollment = await Enrollment.findOne({
      user: req.user.id,
      $or: [{ liveCourse: courseObj._id }, { course: courseObj._id }],
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

    const certificateType = getConfiguredCertificateType(form);

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

    // Create submission payload
    const submissionPayload = {
      feedbackForm: formId,
      user: req.user.id,
      enrollment: enrollment._id,
      responses,
      selectedCertificateType: certificateType,
    };
    if (liveCourse) submissionPayload.liveCourse = liveCourse._id;
    if (course) submissionPayload.course = course._id;

    const submission = await FeedbackSubmission.create(submissionPayload);

    // ── Auto-generate certificate ──
    let certificateData = null;
    try {
      const selectedFeedbackTemplateId = form.certificateTemplate
        ? await validateActiveCertificateTemplate(form.certificateTemplate)
        : null;

      // Check if certificate already exists
      const existingCert = await Certificate.findOne({
        user: req.user.id,
        $or: [{ liveCourse: courseObj._id }, { course: courseObj._id }],
      });

      if (!existingCert) {
        const cert = await buildAndStoreCertificate({
          userId: req.user.id,
          userEmail: req.user.email,
          userName: req.user.name,
          courseRef: courseObj,
          courseType: liveCourse ? 'liveCourse' : 'course',
          courseId: courseObj._id,
          enrollmentId: enrollment._id,
          completionDate: new Date(),
          templateId: selectedFeedbackTemplateId,
          certificateType,
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
          certificateType: cert.certificateType || certificateType,
          downloadUrl: `/api/certificates/${cert.certificateId}/download`,
          viewUrl: `/api/certificates/${cert.certificateId}/view`,
        };

        // Notify student
        await Notification.create({
          user: req.user.id,
          type: 'system',
          message: `Your certificate for "${courseObj.title}" is ready! Download it from your dashboard.`,
          link: '/dashboard/certificates',
        });
      } else {
        const selectedTemplateId = selectedFeedbackTemplateId ? selectedFeedbackTemplateId.toString() : null;
        const existingTemplateId = existingCert.templateId ? existingCert.templateId.toString() : null;
        const shouldRefreshExistingCert =
          (selectedTemplateId && selectedTemplateId !== existingTemplateId) ||
          (certificateType && existingCert.certificateType !== certificateType) ||
          (selectedTemplateId && !existingCert.templateRenderedAt);

        if (shouldRefreshExistingCert) {
          const template = selectedTemplateId
            ? await CertificateTemplate.findOne({ _id: selectedTemplateId, isActive: true })
            : null;

          if (selectedTemplateId && !template) {
            throw new Error('Configured certificate template is inactive or missing');
          }

          const pdfBuffer = await generateCertificatePDF({
            studentName: existingCert.studentName,
            courseName: existingCert.courseName || courseObj.title,
            domain: existingCert.domain || courseObj.category || 'Professional Development',
            areaOfExpertise: existingCert.areaOfExpertise || 'Specialized Training',
            completionDate: existingCert.completionDate || new Date(),
            certificateId: existingCert.certificateId,
            serialNumber: existingCert.serialNumber || parseInt(existingCert.certificateId.split('-').pop(), 10) || 1,
            instructorName: courseObj.instructorName || '',
          }, template);

          existingCert.fileUrl = await uploadPdfToCloudinary(
            pdfBuffer,
            `${existingCert.certificateId}-${req.user.id}-feedback-${Date.now()}`,
            'fwtion/certificates'
          );
          existingCert.templateId = template?._id || null;
          existingCert.templateName = template?.templateName || 'Legacy Template';
          existingCert.templateRenderedAt = template ? new Date() : null;
          existingCert.certificateType = certificateType;
          await existingCert.save();
        }

        certificateData = {
          certificateId: existingCert.certificateId,
          certificateType: existingCert.certificateType || 'Completion Certificate',
          downloadUrl: `/api/certificates/${existingCert.certificateId}/download`,
          viewUrl: `/api/certificates/${existingCert.certificateId}/view`,
        };
      }
    } catch (certError) {
      console.error('Auto-certificate generation failed after feedback submission:', certError);
      await FeedbackSubmission.deleteOne({ _id: submission._id });
      return res.status(500).json({
        success: false,
        message: 'Feedback could not be submitted because certificate generation failed. Please try again.',
      });
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
    
    let courseObjectId = liveCourseId;
    if (!isValidObjectId(liveCourseId)) {
      const course = await mongoose.model('Course').findOne({ slug: liveCourseId }).select('_id');
      if (!course) return res.status(404).json({ success: false, message: 'Course not found' });
      courseObjectId = course._id;
    }

    // Verify enrollment
    const enrollment = await Enrollment.findOne({
      user: req.user.id,
      $or: [{ liveCourse: courseObjectId }, { course: courseObjectId }],
      status: { $in: ['active', 'completed'] },
    });

    if (!enrollment) {
      return res.status(200).json({
        success: true,
        data: { enrolled: false },
      });
    }

    const liveCourse = await LiveCourse.findById(courseObjectId).select('title status endDate');
    const course = await mongoose.model('Course').findById(courseObjectId).select('title status');
    const courseObj = liveCourse || course;

    const form = await FeedbackForm.findOne({ 
      $or: [{ liveCourse: courseObjectId }, { course: courseObjectId }], 
      isActive: true 
    }).select('_id title unlockDate submissionDeadline isActive course availableCertificateTypes');

    if (!form) {
      return res.status(200).json({
        success: true,
        data: { enrolled: true, formAvailable: false },
      });
    }

    const unlocked = isFormUnlocked(form, courseObj);
    const submission = await FeedbackSubmission.findOne({ feedbackForm: form._id, user: req.user.id }).select('submittedAt');
    const cert = await Certificate.findOne({ 
      user: req.user.id, 
      $or: [{ liveCourse: courseObjectId }, { course: courseObjectId }] 
    }).select('certificateId certificateType');

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
        configuredCertificateType: getConfiguredCertificateType(form),
        certificate: cert ? {
          certificateId: cert.certificateId,
          certificateType: cert.certificateType || 'Completion Certificate',
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
