import express from 'express';
import crypto from 'crypto';
import bcrypt from 'bcryptjs';
import Course from '../models/Course.js';
import Module from '../models/Module.js';
import Lesson from '../models/Lesson.js';
import User from '../models/User.js';
import Enrollment from '../models/Enrollment.js';
import LiveCourse from '../models/LiveCourse.js';
import Certificate from '../models/Certificate.js';
import Assignment from '../models/Assignment.js';
import AssignmentSubmission from '../models/AssignmentSubmission.js';
import Notification from '../models/Notification.js';
import Review from '../models/Review.js';
import Receipt from '../models/Receipt.js';
import Counter from '../models/Counter.js';
import { generateCertificatePDF } from '../utils/generateCertificatePDF.js';
import { uploadPdfToCloudinary } from '../utils/uploadPdfToCloudinary.js';
import CertificateTemplate from '../models/CertificateTemplate.js';
import { buildAndStoreCertificate, resolveTemplate } from './certificateController.js';
import { sanitizeLiveCoursePayload } from '../utils/liveCoursePayload.js';
import { protect, authorize } from '../middleware/auth.js';
import sendEmail from '../utils/sendEmail.js';
import {
  createFeedbackForm,
  updateFeedbackForm,
  getAllFeedbackForms,
  getFeedbackFormById,
  deleteFeedbackForm,
  toggleFeedbackForm,
  getFormResponses,
  resetSubmission,
  getCourseFeedbackSummary,
} from './feedbackController.js';
import {
  listCoupons,
  getCoupon,
  createCoupon,
  updateCoupon,
  toggleCoupon,
  deleteCoupon,
} from './couponController.js';

const router = express.Router();

// ──────────────────────────────────────────────
// Helpers
// ──────────────────────────────────────────────
const isValidObjectId = (id) => /^[0-9a-fA-F]{24}$/.test(id);

const validateActiveCertificateTemplate = async (templateId) => {
  if (!templateId) return null;

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

const escapeRegex = (str = '') => str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

const csvEscape = (value) => {
  if (value === null || value === undefined) return '';
  const str = String(value);
  if (/[",\n\r]/.test(str)) return `"${str.replace(/"/g, '""')}"`;
  return str;
};

const MONTH_NAMES = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

/**
 * Calculate percentage change between current and previous values.
 * Returns 0 if previous is 0 to avoid division by zero.
 */
const percentChange = (current, previous) => {
  if (previous === 0) return current > 0 ? 100 : 0;
  return Math.round(((current - previous) / previous) * 1000) / 10;
};

// ==============================
// DASHBOARD ANALYTICS (Enhanced)
// ==============================

/**
 * @desc    Get enhanced dashboard analytics with period comparisons
 * @route   GET /api/admin/analytics
 * @access  Private/Admin
 */
router.get('/analytics', protect, authorize('admin'), async (req, res) => {
  try {
    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const weekStart = new Date(todayStart); weekStart.setDate(weekStart.getDate() - 7);
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const prevMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const prevMonthEnd = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59, 999);

    // ── Core counts ──
    const [
      totalCourses,
      totalStudents,
      totalEnrollments,
      activeLiveCourses,
      totalAssignments,
      totalAssignmentSubmissions,
    ] = await Promise.all([
      Course.countDocuments(),
      User.countDocuments({ role: { $ne: 'admin' } }),
      Enrollment.countDocuments({ status: 'active' }),
      LiveCourse.countDocuments(),
      Assignment.countDocuments(),
      AssignmentSubmission.countDocuments(),
    ]);

    // ── New registrations breakdown ──
    const [newToday, newThisWeek, newThisMonth] = await Promise.all([
      User.countDocuments({ role: { $ne: 'admin' }, createdAt: { $gte: todayStart } }),
      User.countDocuments({ role: { $ne: 'admin' }, createdAt: { $gte: weekStart } }),
      User.countDocuments({ role: { $ne: 'admin' }, createdAt: { $gte: monthStart } }),
    ]);

    // ── Active users (logged in recently) ──
    const [activeToday, activeThisWeek, activeThisMonth] = await Promise.all([
      User.countDocuments({ role: { $ne: 'admin' }, lastLogin: { $gte: todayStart } }),
      User.countDocuments({ role: { $ne: 'admin' }, lastLogin: { $gte: weekStart } }),
      User.countDocuments({ role: { $ne: 'admin' }, lastLogin: { $gte: monthStart } }),
    ]);

    // ── Previous period counts for comparison ──
    const [prevMonthStudents, prevMonthEnrollments] = await Promise.all([
      User.countDocuments({ role: { $ne: 'admin' }, createdAt: { $gte: prevMonthStart, $lte: prevMonthEnd } }),
      Enrollment.countDocuments({ status: 'active', createdAt: { $gte: prevMonthStart, $lte: prevMonthEnd } }),
    ]);

    // ── Revenue ──
    const [currentRevenueAgg, prevRevenueAgg] = await Promise.all([
      Enrollment.aggregate([
        { $match: { status: { $in: ['active', 'completed'] } } },
        { $group: { _id: null, totalRevenue: { $sum: '$amount' } } },
      ]),
      Enrollment.aggregate([
        { $match: { status: { $in: ['active', 'completed'] }, createdAt: { $gte: prevMonthStart, $lte: prevMonthEnd } } },
        { $group: { _id: null, totalRevenue: { $sum: '$amount' } } },
      ]),
    ]);

    const totalRevenue = currentRevenueAgg.length > 0 ? currentRevenueAgg[0].totalRevenue : 0;
    const prevRevenue = prevRevenueAgg.length > 0 ? prevRevenueAgg[0].totalRevenue : 0;

    // ── This month revenue for comparison ──
    const thisMonthRevenueAgg = await Enrollment.aggregate([
      { $match: { status: { $in: ['active', 'completed'] }, createdAt: { $gte: monthStart } } },
      { $group: { _id: null, totalRevenue: { $sum: '$amount' } } },
    ]);
    const thisMonthRevenue = thisMonthRevenueAgg.length > 0 ? thisMonthRevenueAgg[0].totalRevenue : 0;

    // ── Quiz submission count ──
    const quizSubmissionAgg = await Enrollment.aggregate([
      { $unwind: '$progress.quizScores' },
      { $group: { _id: null, total: { $sum: '$progress.quizScores.attempts' } } },
    ]);
    const totalQuizSubmissions = quizSubmissionAgg.length > 0 ? quizSubmissionAgg[0].total : 0;

    // ── Category distribution ──
    const categoryDistribution = await Course.aggregate([
      { $group: { _id: '$category', count: { $sum: 1 } } },
      { $sort: { count: -1 } },
    ]);

    // ── Monthly revenue (real data) ──
    const monthlyRevenue = await Enrollment.aggregate([
      { $match: { status: { $in: ['active', 'completed'] }, amount: { $gt: 0 } } },
      {
        $group: {
          _id: { year: { $year: '$createdAt' }, month: { $month: '$createdAt' } },
          revenue: { $sum: '$amount' },
          count: { $sum: 1 },
        },
      },
      { $sort: { '_id.year': 1, '_id.month': 1 } },
      { $limit: 12 },
    ]);

    const formattedMonthlyRevenue = monthlyRevenue.map(item => ({
      month: MONTH_NAMES[item._id.month - 1],
      year: item._id.year,
      revenue: item.revenue,
      enrollments: item.count,
    }));

    // ── Monthly enrollments (real data) ──
    const monthlyEnrollments = await Enrollment.aggregate([
      { $match: { status: { $in: ['active', 'completed'] } } },
      {
        $group: {
          _id: { year: { $year: '$createdAt' }, month: { $month: '$createdAt' } },
          count: { $sum: 1 },
        },
      },
      { $sort: { '_id.year': 1, '_id.month': 1 } },
      { $limit: 12 },
    ]);

    const formattedMonthlyEnrollments = monthlyEnrollments.map(item => ({
      month: MONTH_NAMES[item._id.month - 1],
      year: item._id.year,
      students: item.count,
    }));

    // ── Completion rate ──
    const completedEnrollments = await Enrollment.countDocuments({ status: 'completed' });
    const allEnrollments = await Enrollment.countDocuments();
    const completionRate = allEnrollments > 0
      ? Math.round((completedEnrollments / allEnrollments) * 1000) / 10
      : 0;

    // ── Period comparisons ──
    const trends = {
      students: percentChange(newThisMonth, prevMonthStudents),
      revenue: percentChange(thisMonthRevenue, prevRevenue),
      enrollments: percentChange(
        await Enrollment.countDocuments({ status: 'active', createdAt: { $gte: monthStart } }),
        prevMonthEnrollments
      ),
    };

    // ── System health ──
    const systemHealth = {
      status: 'operational',
      database: 'connected',
      uptime: process.uptime(),
      memoryUsage: Math.round(process.memoryUsage().heapUsed / 1024 / 1024),
      totalMemory: Math.round(process.memoryUsage().heapTotal / 1024 / 1024),
    };

    // ── Enrollment type split (auto vs paid vs free) ──
    const enrollmentTypeSplit = await Enrollment.aggregate([
      { $match: { status: { $in: ['active', 'completed'] }, course: { $ne: null } } },
      { $group: { _id: '$enrollmentType', count: { $sum: 1 } } },
    ]);
    const enrollmentSplit = {
      auto: 0,
      paid: 0,
      free: 0,
    };
    enrollmentTypeSplit.forEach(item => {
      if (item._id && enrollmentSplit.hasOwnProperty(item._id)) {
        enrollmentSplit[item._id] = item.count;
      } else {
        // Legacy records without enrollmentType default to 'paid'
        enrollmentSplit.paid += item.count;
      }
    });

    res.status(200).json({
      success: true,
      data: {
        totalCourses,
        totalStudents,
        totalEnrollments,
        totalRevenue,
        activeLiveCourses,
        totalAssignments,
        totalAssignmentSubmissions,
        totalQuizSubmissions,
        completionRate,
        newRegistrations: { today: newToday, week: newThisWeek, month: newThisMonth },
        activeUsers: { today: activeToday, week: activeThisWeek, month: activeThisMonth },
        trends,
        systemHealth,
        categoryDistribution,
        monthlyRevenue: formattedMonthlyRevenue,
        monthlyEnrollments: formattedMonthlyEnrollments,
        enrollmentSplit,
      },
    });
  } catch (error) {
    console.error('Analytics error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// ==============================
// ADVANCED ANALYTICS
// ==============================

/**
 * @desc    Get advanced analytics with date range filtering
 * @route   GET /api/admin/analytics/advanced
 * @query   from, to (ISO date strings)
 * @access  Private/Admin
 */
router.get('/analytics/advanced', protect, authorize('admin'), async (req, res) => {
  try {
    const now = new Date();
    const from = req.query.from ? new Date(req.query.from) : new Date(now.getFullYear(), now.getMonth() - 11, 1);
    const to = req.query.to ? new Date(req.query.to) : now;
    to.setHours(23, 59, 59, 999);

    const dateFilter = { $gte: from, $lte: to };

    // ── User growth (monthly registrations) ──
    const userGrowth = await User.aggregate([
      { $match: { role: { $ne: 'admin' }, createdAt: dateFilter } },
      {
        $group: {
          _id: { year: { $year: '$createdAt' }, month: { $month: '$createdAt' } },
          count: { $sum: 1 },
        },
      },
      { $sort: { '_id.year': 1, '_id.month': 1 } },
    ]);

    const formattedUserGrowth = userGrowth.map(item => ({
      month: `${MONTH_NAMES[item._id.month - 1]} ${item._id.year}`,
      shortMonth: MONTH_NAMES[item._id.month - 1],
      users: item.count,
    }));

    // ── Daily active users (last 30 days) ──
    const thirtyDaysAgo = new Date(now);
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const dailyActiveUsers = await User.aggregate([
      { $match: { role: { $ne: 'admin' }, lastLogin: { $gte: thirtyDaysAgo } } },
      {
        $group: {
          _id: {
            year: { $year: '$lastLogin' },
            month: { $month: '$lastLogin' },
            day: { $dayOfMonth: '$lastLogin' },
          },
          count: { $sum: 1 },
        },
      },
      { $sort: { '_id.year': 1, '_id.month': 1, '_id.day': 1 } },
    ]);

    const formattedDAU = dailyActiveUsers.map(item => ({
      date: `${item._id.year}-${String(item._id.month).padStart(2, '0')}-${String(item._id.day).padStart(2, '0')}`,
      label: `${MONTH_NAMES[item._id.month - 1]} ${item._id.day}`,
      users: item.count,
    }));

    // ── Login frequency (hourly distribution) ──
    const loginFrequency = await User.aggregate([
      { $match: { lastLogin: { $exists: true } } },
      {
        $group: {
          _id: { $hour: '$lastLogin' },
          count: { $sum: 1 },
        },
      },
      { $sort: { _id: 1 } },
    ]);

    const formattedLoginFreq = loginFrequency.map(item => ({
      hour: `${String(item._id).padStart(2, '0')}:00`,
      logins: item.count,
    }));

    // ── Peak usage hours ──
    const peakHour = loginFrequency.length > 0
      ? loginFrequency.reduce((max, item) => item.count > max.count ? item : max, { count: 0 })
      : null;

    // ── Course enrollment trends ──
    const enrollmentTrends = await Enrollment.aggregate([
      { $match: { createdAt: dateFilter } },
      {
        $group: {
          _id: { year: { $year: '$createdAt' }, month: { $month: '$createdAt' } },
          count: { $sum: 1 },
          revenue: { $sum: '$amount' },
        },
      },
      { $sort: { '_id.year': 1, '_id.month': 1 } },
    ]);

    const formattedEnrollmentTrends = enrollmentTrends.map(item => ({
      month: `${MONTH_NAMES[item._id.month - 1]} ${item._id.year}`,
      shortMonth: MONTH_NAMES[item._id.month - 1],
      enrollments: item.count,
      revenue: item.revenue || 0,
    }));

    // ── Revenue by period ──
    const revenueByPeriod = await Enrollment.aggregate([
      { $match: { status: { $in: ['active', 'completed'] }, amount: { $gt: 0 }, createdAt: dateFilter } },
      {
        $group: {
          _id: { year: { $year: '$createdAt' }, month: { $month: '$createdAt' } },
          revenue: { $sum: '$amount' },
          transactions: { $sum: 1 },
        },
      },
      { $sort: { '_id.year': 1, '_id.month': 1 } },
    ]);

    const formattedRevenue = revenueByPeriod.map(item => ({
      month: `${MONTH_NAMES[item._id.month - 1]} ${item._id.year}`,
      shortMonth: MONTH_NAMES[item._id.month - 1],
      revenue: item.revenue,
      transactions: item.transactions,
    }));

    // ── Retention / churn ──
    const totalUsers = await User.countDocuments({ role: { $ne: 'admin' } });
    const activeUsersMonth = await User.countDocuments({
      role: { $ne: 'admin' },
      lastLogin: { $gte: new Date(now.getFullYear(), now.getMonth(), 1) },
    });
    const retentionRate = totalUsers > 0 ? Math.round((activeUsersMonth / totalUsers) * 1000) / 10 : 0;
    const churnRate = Math.round((100 - retentionRate) * 10) / 10;

    // ── Most active users ──
    const mostActiveUsers = await Enrollment.aggregate([
      { $match: { status: { $in: ['active', 'completed'] } } },
      { $group: { _id: '$user', enrollmentCount: { $sum: 1 } } },
      { $sort: { enrollmentCount: -1 } },
      { $limit: 5 },
      {
        $lookup: {
          from: 'users',
          localField: '_id',
          foreignField: '_id',
          as: 'userInfo',
        },
      },
      { $unwind: '$userInfo' },
      {
        $project: {
          _id: '$userInfo._id',
          name: '$userInfo.name',
          email: '$userInfo.email',
          avatar: '$userInfo.avatar',
          enrollmentCount: 1,
        },
      },
    ]);

    // ── Most popular courses ──
    const mostPopularCourses = await Enrollment.aggregate([
      { $match: { course: { $exists: true, $ne: null }, status: { $in: ['active', 'completed'] } } },
      { $group: { _id: '$course', enrollmentCount: { $sum: 1 }, revenue: { $sum: '$amount' } } },
      { $sort: { enrollmentCount: -1 } },
      { $limit: 5 },
      {
        $lookup: {
          from: 'courses',
          localField: '_id',
          foreignField: '_id',
          as: 'courseInfo',
        },
      },
      { $unwind: '$courseInfo' },
      {
        $project: {
          _id: '$courseInfo._id',
          title: '$courseInfo.title',
          thumbnail: '$courseInfo.thumbnail',
          enrollmentCount: 1,
          revenue: 1,
        },
      },
    ]);

    // ── Average revenue per user ──
    const totalRevenueAgg = await Enrollment.aggregate([
      { $match: { status: { $in: ['active', 'completed'] } } },
      { $group: { _id: null, total: { $sum: '$amount' } } },
    ]);
    const avgRevenuePerUser = totalUsers > 0
      ? Math.round((totalRevenueAgg[0]?.total || 0) / totalUsers)
      : 0;

    res.status(200).json({
      success: true,
      data: {
        userGrowth: formattedUserGrowth,
        dailyActiveUsers: formattedDAU,
        loginFrequency: formattedLoginFreq,
        enrollmentTrends: formattedEnrollmentTrends,
        revenueByPeriod: formattedRevenue,
        retentionRate,
        churnRate,
        avgRevenuePerUser,
        peakHour: peakHour ? `${String(peakHour._id).padStart(2, '0')}:00` : 'N/A',
        mostActiveUsers,
        mostPopularCourses,
      },
    });
  } catch (error) {
    console.error('Advanced analytics error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// ==============================
// ACTIVITY FEED
// ==============================

/**
 * @desc    Get admin activity feed (latest actions across all models)
 * @route   GET /api/admin/activity-feed
 * @query   page, limit
 * @access  Private/Admin
 */
router.get('/activity-feed', protect, authorize('admin'), async (req, res) => {
  try {
    const page = Math.max(parseInt(req.query.page, 10) || 1, 1);
    const limit = Math.min(Math.max(parseInt(req.query.limit, 10) || 20, 1), 50);

    // Gather recent activities from multiple models in parallel
    const [recentUsers, recentEnrollments, recentCourses, recentReviews] = await Promise.all([
      User.find({ role: { $ne: 'admin' } })
        .select('name email avatar createdAt lastLogin')
        .sort('-createdAt')
        .limit(30)
        .lean(),
      Enrollment.find()
        .populate('user', 'name email avatar')
        .populate('course', 'title')
        .populate('liveCourse', 'title')
        .sort('-createdAt')
        .limit(30)
        .lean(),
      Course.find()
        .select('title createdAt updatedAt')
        .sort('-createdAt')
        .limit(10)
        .lean(),
      Review.find()
        .populate('user', 'name avatar')
        .populate('course', 'title')
        .sort('-createdAt')
        .limit(10)
        .lean(),
    ]);

    // Normalize into a unified activity format
    const activities = [];

    recentUsers.forEach(u => {
      activities.push({
        id: `reg-${u._id}`,
        type: 'registration',
        message: `${u.name} registered a new account`,
        user: { name: u.name, email: u.email, avatar: u.avatar },
        timestamp: u.createdAt,
      });
      if (u.lastLogin && u.lastLogin > u.createdAt) {
        activities.push({
          id: `login-${u._id}`,
          type: 'login',
          message: `${u.name} logged in`,
          user: { name: u.name, email: u.email, avatar: u.avatar },
          timestamp: u.lastLogin,
        });
      }
    });

    recentEnrollments.forEach(e => {
      const courseName = e.course?.title || e.liveCourse?.title || 'Unknown';
      const userName = e.user?.name || e.fullName || 'Unknown';
      activities.push({
        id: `enroll-${e._id}`,
        type: 'enrollment',
        message: `${userName} enrolled in "${courseName}"`,
        user: e.user ? { name: e.user.name, avatar: e.user.avatar } : null,
        timestamp: e.createdAt,
        meta: { amount: e.amount },
      });
    });

    recentCourses.forEach(c => {
      activities.push({
        id: `course-${c._id}`,
        type: 'course_created',
        message: `Course "${c.title}" was created`,
        timestamp: c.createdAt,
      });
    });

    recentReviews.forEach(r => {
      activities.push({
        id: `review-${r._id}`,
        type: 'review',
        message: `${r.user?.name || 'User'} left a review on "${r.course?.title || 'a course'}"`,
        user: r.user ? { name: r.user.name, avatar: r.user.avatar } : null,
        timestamp: r.createdAt,
      });
    });

    // Sort by timestamp descending, paginate
    activities.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
    const total = activities.length;
    const paginated = activities.slice((page - 1) * limit, page * limit);

    res.status(200).json({
      success: true,
      count: paginated.length,
      total,
      page,
      totalPages: Math.max(Math.ceil(total / limit), 1),
      data: paginated,
    });
  } catch (error) {
    console.error('Activity feed error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// ==============================
// ADMIN NOTIFICATIONS
// ==============================

/**
 * @desc    Broadcast an announcement to students
 * @route   POST /api/admin/announcements
 * @access  Private/Admin
 */
router.post('/announcements', protect, authorize('admin'), async (req, res) => {
  try {
    const { title, message, postToDashboard, sendEmailAlert } = req.body;
    
    if (!title || !message) {
      return res.status(400).json({ success: false, message: 'Please provide both title and message' });
    }

    const students = await User.find({ role: { $ne: 'admin' }, status: { $ne: 'suspended' } }).select('_id email');
    
    if (postToDashboard) {
      const notifications = students.map(student => ({
        user: student._id,
        type: 'system',
        message: `${title}: ${message}`,
      }));
      await Notification.insertMany(notifications);
    }
    
    if (sendEmailAlert) {
      // Send email to all students.
      for (const student of students) {
         try {
            await sendEmail({
              email: student.email,
              subject: `Platform Announcement: ${title}`,
              html: `<h2>${title}</h2><p>${message}</p>`,
            });
         } catch (err) {
            console.error(`Failed to send email to ${student.email}:`, err.message);
         }
      }
    }
    
    res.status(200).json({ success: true, message: `Announcement sent successfully to ${students.length} students.` });
  } catch (error) {
    console.error('Announcement broadcast error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

/**
 * @desc    Get admin-level notifications
 * @route   GET /api/admin/admin-notifications
 * @access  Private/Admin
 */
router.get('/admin-notifications', protect, authorize('admin'), async (req, res) => {
  try {
    // Fetch notifications for this admin user
    const notifications = await Notification.find({ user: req.user.id })
      .sort('-createdAt')
      .limit(50)
      .lean();

    res.status(200).json({
      success: true,
      count: notifications.length,
      unreadCount: notifications.filter(n => !n.isRead).length,
      data: notifications,
    });
  } catch (error) {
    console.error('Admin notifications error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

/**
 * @desc    Mark admin notification as read
 * @route   PATCH /api/admin/admin-notifications/:id/read
 * @access  Private/Admin
 */
router.patch('/admin-notifications/:id/read', protect, authorize('admin'), async (req, res) => {
  try {
    const { id } = req.params;
    if (!isValidObjectId(id)) {
      return res.status(200).json({ success: true, message: 'System alert acknowledged' });
    }

    const notification = await Notification.findByIdAndUpdate(id, { isRead: true }, { new: true });
    if (!notification) {
      return res.status(404).json({ success: false, message: 'Notification not found' });
    }

    res.status(200).json({ success: true, data: notification });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// ==============================
// ANALYTICS EXPORT (CSV only)
// ==============================

/**
 * @desc    Export analytics data as CSV
 * @route   GET /api/admin/analytics/export
 * @query   type (users|enrollments|revenue), from, to
 * @access  Private/Admin
 */
router.get('/analytics/export', protect, authorize('admin'), async (req, res) => {
  try {
    const { type = 'users' } = req.query;
    const from = req.query.from ? new Date(req.query.from) : null;
    const to = req.query.to ? new Date(req.query.to) : null;

    let headers, rows;
    const dateFilter = {};
    if (from) dateFilter.$gte = from;
    if (to) { to.setHours(23, 59, 59, 999); dateFilter.$lte = to; }
    const hasDateFilter = Object.keys(dateFilter).length > 0;

    if (type === 'users') {
      const filter = { role: { $ne: 'admin' } };
      if (hasDateFilter) filter.createdAt = dateFilter;

      const users = await User.find(filter)
        .select('-password -refreshToken -resetPasswordToken -resetPasswordExpire')
        .sort('-createdAt')
        .lean();

      headers = ['Name', 'Email', 'Role', 'Status', 'Last Login', 'Joined'];
      rows = users.map(u => [
        csvEscape(u.name),
        csvEscape(u.email),
        csvEscape(u.role),
        csvEscape(u.status || 'active'),
        csvEscape(u.lastLogin ? new Date(u.lastLogin).toISOString() : ''),
        csvEscape(u.createdAt ? new Date(u.createdAt).toISOString() : ''),
      ].join(','));

    } else if (type === 'enrollments') {
      const filter = {};
      if (hasDateFilter) filter.createdAt = dateFilter;

      const enrollments = await Enrollment.find(filter)
        .populate('user', 'name email')
        .populate('course', 'title price')
        .populate('liveCourse', 'title price')
        .sort('-createdAt')
        .lean();

      headers = ['Student', 'Email', 'Course', 'Type', 'Amount', 'Status', 'Date'];
      rows = enrollments.map(e => [
        csvEscape(e.user?.name || e.fullName || ''),
        csvEscape(e.user?.email || e.email || ''),
        csvEscape(e.course?.title || e.liveCourse?.title || ''),
        csvEscape(e.course ? 'Course' : 'Live Course'),
        csvEscape(e.amount || 0),
        csvEscape(e.status),
        csvEscape(e.createdAt ? new Date(e.createdAt).toISOString() : ''),
      ].join(','));

    } else if (type === 'revenue') {
      const filter = { status: { $in: ['active', 'completed'] }, amount: { $gt: 0 } };
      if (hasDateFilter) filter.createdAt = dateFilter;

      const payments = await Enrollment.find(filter)
        .populate('user', 'name email')
        .populate('course', 'title')
        .populate('liveCourse', 'title')
        .sort('-createdAt')
        .lean();

      headers = ['Student', 'Email', 'Course', 'Amount', 'Payment ID', 'Status', 'Date'];
      rows = payments.map(p => [
        csvEscape(p.user?.name || ''),
        csvEscape(p.user?.email || ''),
        csvEscape(p.course?.title || p.liveCourse?.title || ''),
        csvEscape(p.amount),
        csvEscape(p.paymentId || ''),
        csvEscape(p.status),
        csvEscape(p.createdAt ? new Date(p.createdAt).toISOString() : ''),
      ].join(','));

    } else {
      return res.status(400).json({ success: false, message: 'Invalid export type. Use: users, enrollments, revenue' });
    }

    const csv = [headers.join(','), ...rows].join('\n');
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="${type}-export-${Date.now()}.csv"`);
    return res.status(200).send(csv);
  } catch (error) {
    console.error('Export error:', error);
    res.status(500).json({ success: false, message: 'Failed to export data' });
  }
});

// ============================================================
// USERS (legacy)
// ============================================================

/**
 * @desc    Get all users (non-admin)
 * @route   GET /api/admin/users
 * @access  Private/Admin
 */
router.get('/users', protect, authorize('admin'), async (req, res) => {
  try {
    const users = await User.find({ role: { $ne: 'admin' } }).select('-password').sort('-createdAt');
    res.status(200).json({ success: true, count: users.length, data: users });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

/**
 * @desc    Suspend or reactivate user (legacy endpoint, kept for compatibility)
 * @route   PUT /api/admin/users/:id/suspend
 * @access  Private/Admin
 */
router.put('/users/:id/suspend', protect, authorize('admin'), async (req, res) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user) return res.status(404).json({ success: false, message: 'User not found' });
    if (user.role === 'admin') return res.status(400).json({ success: false, message: 'Cannot suspend an admin' });

    user.status = user.status === 'suspended' ? 'active' : 'suspended';
    await user.save({ validateBeforeSave: false });

    res.status(200).json({ success: true, data: user });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// ============================================================
// STUDENTS — Full Coursera-grade CRUD
// ============================================================

/**
 * @desc    CSV export of students (must come BEFORE /students/:id)
 * @route   GET /api/admin/students/export
 * @access  Private/Admin
 */
router.get('/students/export', protect, authorize('admin'), async (req, res) => {
  try {
    const students = await User.find({ role: { $ne: 'admin' } })
      .select('-password -refreshToken -resetPasswordToken -resetPasswordExpire')
      .sort('-createdAt')
      .lean();

    const enrollmentCounts = await Enrollment.aggregate([
      { $match: { status: { $in: ['active', 'completed'] } } },
      { $group: { _id: '$user', count: { $sum: 1 } } },
    ]);
    const enrollMap = new Map(enrollmentCounts.map((e) => [String(e._id), e.count]));

    const headers = ['Name', 'Email', 'Role', 'Status', 'Courses Enrolled', 'Joined', 'Last Login'];
    const rows = students.map((s) => [
      csvEscape(s.name),
      csvEscape(s.email),
      csvEscape(s.role),
      csvEscape(s.status || 'active'),
      csvEscape(enrollMap.get(String(s._id)) || 0),
      csvEscape(s.createdAt ? new Date(s.createdAt).toISOString() : ''),
      csvEscape(s.lastLogin ? new Date(s.lastLogin).toISOString() : ''),
    ].join(','));

    const csv = [headers.join(','), ...rows].join('\n');
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="students-${Date.now()}.csv"`);
    return res.status(200).send(csv);
  } catch (error) {
    console.error('Student export error:', error);
    res.status(500).json({ success: false, message: 'Failed to export students' });
  }
});

/**
 * @desc    List students with search, filter, sort, pagination
 * @route   GET /api/admin/students
 * @query   page, limit, search, status, role, sortBy, sortOrder
 * @access  Private/Admin
 */
router.get('/students', protect, authorize('admin'), async (req, res) => {
  try {
    const page = Math.max(parseInt(req.query.page, 10) || 1, 1);
    const limit = Math.min(Math.max(parseInt(req.query.limit, 10) || 10, 1), 100);
    const skip = (page - 1) * limit;

    const search = (req.query.search || '').trim();
    const status = (req.query.status || '').trim();
    const role = (req.query.role || '').trim();
    const sortBy = ['name', 'email', 'createdAt', 'status', 'role'].includes(req.query.sortBy)
      ? req.query.sortBy
      : 'createdAt';
    const sortOrder = req.query.sortOrder === 'asc' ? 1 : -1;

    const filter = { role: { $ne: 'admin' } };

    if (search) {
      const regex = new RegExp(escapeRegex(search), 'i');
      filter.$or = [{ name: regex }, { email: regex }];
    }

    if (status && ['active', 'suspended'].includes(status)) {
      filter.status = status;
    }

    if (role && ['student', 'instructor'].includes(role)) {
      filter.role = role;
    }

    const [students, total] = await Promise.all([
      User.find(filter)
        .select('-password -refreshToken -resetPasswordToken -resetPasswordExpire')
        .sort({ [sortBy]: sortOrder })
        .skip(skip)
        .limit(limit)
        .lean(),
      User.countDocuments(filter),
    ]);

    // Attach enrollment counts in one aggregation pass
    const ids = students.map((s) => s._id);
    const counts = await Enrollment.aggregate([
      { $match: { user: { $in: ids } } },
      { $group: { _id: '$user', count: { $sum: 1 } } },
    ]);
    const countMap = new Map(counts.map((c) => [String(c._id), c.count]));

    const data = students.map((s) => ({
      ...s,
      coursesEnrolled: countMap.get(String(s._id)) || 0,
      status: s.status || 'active',
    }));

    res.status(200).json({
      success: true,
      count: data.length,
      total,
      page,
      limit,
      totalPages: Math.max(Math.ceil(total / limit), 1),
      data,
    });
  } catch (error) {
    console.error('List students error:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch students' });
  }
});

/**
 * @desc    Get single student profile (with enrollments, quizzes, assignments)
 * @route   GET /api/admin/students/:id
 * @access  Private/Admin
 */
router.get('/students/:id', protect, authorize('admin'), async (req, res) => {
  try {
    const { id } = req.params;
    if (!isValidObjectId(id)) {
      return res.status(400).json({ success: false, message: 'Invalid student ID' });
    }

    const student = await User.findById(id)
      .select('-password -refreshToken -resetPasswordToken -resetPasswordExpire')
      .lean();

    if (!student) {
      return res.status(404).json({ success: false, message: 'Student not found' });
    }
    if (student.role === 'admin') {
      return res.status(403).json({ success: false, message: 'Admin profiles are not accessible here' });
    }

    const [enrollments, submissions] = await Promise.all([
      Enrollment.find({ user: id })
        .populate('course', 'title thumbnail price')
        .populate('liveCourse', 'title thumbnail price')
        .sort('-createdAt')
        .lean(),
      AssignmentSubmission.find({ student: id })
        .populate('assignment', 'title totalMarks')
        .sort('-createdAt')
        .lean(),
    ]);

    // Derive quiz attempts from enrollment.progress.quizScores
    const quizAttempts = enrollments.flatMap((e) =>
      (e.progress?.quizScores || []).map((q) => ({
        course: e.course?.title || e.liveCourse?.title || 'Unknown',
        quiz: q.quiz,
        score: q.score,
        passed: q.passed,
        attempts: q.attempts,
      }))
    );

    const completedModules = enrollments.reduce(
      (acc, e) => acc + (e.progress?.completedLessons?.length || 0),
      0
    );

    res.status(200).json({
      success: true,
      data: {
        ...student,
        status: student.status || 'active',
        stats: {
          totalEnrollments: enrollments.length,
          completedModules,
          quizAttempts: quizAttempts.length,
          assignmentSubmissions: submissions.length,
        },
        enrollments,
        quizAttempts,
        submissions,
      },
    });
  } catch (error) {
    console.error('Get student error:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch student' });
  }
});

/**
 * @desc    Update student information
 * @route   PUT /api/admin/students/:id
 * @access  Private/Admin
 */
router.put('/students/:id', protect, authorize('admin'), async (req, res) => {
  try {
    const { id } = req.params;
    if (!isValidObjectId(id)) {
      return res.status(400).json({ success: false, message: 'Invalid student ID' });
    }

    const student = await User.findById(id);
    if (!student) return res.status(404).json({ success: false, message: 'Student not found' });
    if (student.role === 'admin') {
      return res.status(403).json({ success: false, message: 'Cannot edit admin accounts' });
    }

    // Whitelist editable fields
    const allowed = ['name', 'email', 'role', 'avatar', 'status'];
    const updates = {};
    for (const key of allowed) {
      if (req.body[key] !== undefined) updates[key] = req.body[key];
    }

    // Validation
    if (updates.email && !/^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,})+$/.test(updates.email)) {
      return res.status(400).json({ success: false, message: 'Invalid email address' });
    }
    if (updates.role && !['student', 'instructor'].includes(updates.role)) {
      return res.status(400).json({ success: false, message: 'Invalid role' });
    }
    if (updates.status && !['active', 'suspended'].includes(updates.status)) {
      return res.status(400).json({ success: false, message: 'Invalid status' });
    }

    if (updates.email && updates.email !== student.email) {
      const exists = await User.findOne({ email: updates.email, _id: { $ne: id } });
      if (exists) {
        return res.status(409).json({ success: false, message: 'Email already in use' });
      }
    }

    Object.assign(student, updates);
    await student.save({ validateBeforeSave: false });

    const safeStudent = student.toObject();
    delete safeStudent.password;
    delete safeStudent.refreshToken;

    res.status(200).json({ success: true, data: safeStudent });
  } catch (error) {
    console.error('Update student error:', error);
    res.status(500).json({ success: false, message: 'Failed to update student' });
  }
});

/**
 * @desc    Suspend or reactivate student
 * @route   PATCH /api/admin/students/:id/suspend
 * @access  Private/Admin
 */
router.patch('/students/:id/suspend', protect, authorize('admin'), async (req, res) => {
  try {
    const { id } = req.params;
    if (!isValidObjectId(id)) {
      return res.status(400).json({ success: false, message: 'Invalid student ID' });
    }

    const student = await User.findById(id);
    if (!student) return res.status(404).json({ success: false, message: 'Student not found' });
    if (student.role === 'admin') {
      return res.status(400).json({ success: false, message: 'Cannot suspend an admin' });
    }

    student.status = student.status === 'suspended' ? 'active' : 'suspended';
    await student.save({ validateBeforeSave: false });

    res.status(200).json({
      success: true,
      message: student.status === 'suspended' ? 'Account suspended' : 'Account reactivated',
      data: { _id: student._id, status: student.status },
    });
  } catch (error) {
    console.error('Suspend student error:', error);
    res.status(500).json({ success: false, message: 'Failed to update student status' });
  }
});

/**
 * @desc    Reset student password (generates a temporary password)
 * @route   POST /api/admin/students/:id/reset-password
 * @access  Private/Admin
 */
router.post('/students/:id/reset-password', protect, authorize('admin'), async (req, res) => {
  try {
    const { id } = req.params;
    if (!isValidObjectId(id)) {
      return res.status(400).json({ success: false, message: 'Invalid student ID' });
    }

    const student = await User.findById(id).select('+password');
    if (!student) return res.status(404).json({ success: false, message: 'Student not found' });
    if (student.role === 'admin') {
      return res.status(403).json({ success: false, message: 'Cannot reset admin password from here' });
    }

    // Generate a strong temporary password
    const tempPassword = crypto.randomBytes(8).toString('base64').replace(/[+/=]/g, '').slice(0, 12);
    const salt = await bcrypt.genSalt(10);
    student.password = await bcrypt.hash(tempPassword, salt);
    student.refreshToken = undefined;

    // Bypass pre-save hash since we already hashed
    await student.save({ validateBeforeSave: false });

    // Notify the student in-app
    try {
      await Notification.create({
        user: student._id,
        type: 'system',
        message: 'An administrator has reset your password. Please log in and update it immediately.',
      });
    } catch (_) { /* non-fatal */ }

    res.status(200).json({
      success: true,
      message: 'Temporary password generated',
      data: { tempPassword },
    });
  } catch (error) {
    console.error('Reset password error:', error);
    res.status(500).json({ success: false, message: 'Failed to reset password' });
  }
});

/**
 * @desc    Safe-delete a student and all related records
 * @route   DELETE /api/admin/students/:id
 * @access  Private/Admin
 */
router.delete('/students/:id', protect, authorize('admin'), async (req, res) => {
  try {
    const { id } = req.params;
    if (!isValidObjectId(id)) {
      return res.status(400).json({ success: false, message: 'Invalid student ID' });
    }

    const student = await User.findById(id);
    if (!student) return res.status(404).json({ success: false, message: 'Student not found' });
    if (student.role === 'admin') {
      return res.status(403).json({ success: false, message: 'Cannot delete admin accounts' });
    }

    // Cascade clean-up — non-transactional but resilient.
    const results = await Promise.allSettled([
      Enrollment.deleteMany({ user: id }),
      AssignmentSubmission.deleteMany({ student: id }),
      Notification.deleteMany({ user: id }),
      Review.deleteMany({ user: id }),
      Certificate.deleteMany({ user: id }),
      student.deleteOne(),
    ]);

    const failures = results.filter((r) => r.status === 'rejected');
    if (failures.length) {
      console.error('Cascade delete partial failures:', failures.map((f) => f.reason?.message));
    }

    res.status(200).json({
      success: true,
      message: 'Student and all related records deleted',
      data: { _id: id },
    });
  } catch (error) {
    console.error('Delete student error:', error);
    res.status(500).json({ success: false, message: 'Failed to delete student' });
  }
});

// ==============================
// ENROLLMENTS
// ==============================

/**
 * @desc    Get all enrollments/payments
 * @route   GET /api/admin/enrollments
 * @access  Private/Admin
 */
router.get('/enrollments', protect, authorize('admin'), async (req, res) => {
  try {
    const enrollments = await Enrollment.find()
      .populate('user', 'name email avatar')
      .populate('course', 'title price')
      .populate('liveCourse', 'title price')
      .sort('-createdAt');

    res.status(200).json({ success: true, count: enrollments.length, data: enrollments });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// ==============================
// COHORT CERTIFICATION MAP
// ==============================
router.get('/cohorts', protect, authorize('admin', 'instructor'), async (req, res) => {
  try {
    const cohorts = await LiveCourse.find().sort('-createdAt');
    res.status(200).json({ success: true, data: cohorts });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

router.get('/cohorts/:cohortId/students', protect, authorize('admin'), async (req, res) => {
  try {
    const enrollments = await Enrollment.find({ 
      liveCourse: req.params.cohortId,
      status: { $in: ['active', 'completed'] },
    }).populate('user', 'name email');

    const formatted = enrollments.map(en => ({
      userId: en.user?._id,
      userName: en.user?.name || en.fullName,
      userEmail: en.user?.email || en.email,
      completionStatus: 'ELIGIBLE', // No completion check for cohort mapping per requirements
      completedAt: en.completedAt || null
    })).filter(e => e.userId || e.userName);

    res.status(200).json({ success: true, count: formatted.length, data: formatted });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

router.post('/generate-cohort-certificate', protect, authorize('admin'), async (req, res) => {
  try {
    const { userId, cohortId, certificateType, templateId } = req.body;
    if (!userId || !cohortId) return res.status(400).json({ success: false, message: 'userId and cohortId are required' });

    const validCertTypes = ['Completion Certificate', 'Participation Certificate', 'Excellence Certificate'];
    const selectedCertType = validCertTypes.includes(certificateType) ? certificateType : 'Completion Certificate';
    const selectedTemplateId = await validateActiveCertificateTemplate(templateId);

    const enrollment = await Enrollment.findOne({ user: userId, liveCourse: cohortId }).populate('user liveCourse');
    if (!enrollment) return res.status(404).json({ success: false, message: 'Valid cohort enrollment not found' });

    let cert = await Certificate.findOne({ user: userId, liveCourse: cohortId, type: 'COHORT' });
    if (cert) return res.status(200).json({ success: true, message: 'Certificate already exists', data: cert });

    cert = await buildAndStoreCertificate({
      userId,
      userEmail: enrollment.user.email,
      userName: enrollment.user.name,
      courseRef: enrollment.liveCourse,
      courseType: 'liveCourse',
      courseId: cohortId,
      enrollmentId: enrollment._id,
      completionDate: enrollment.liveCourse.endDate || new Date(),
      templateId: selectedTemplateId,
      certificateType: selectedCertType,
    });

    cert.type = 'COHORT';
    cert.certificateType = selectedCertType;
    await cert.save();

    res.status(201).json({ success: true, data: cert });
  } catch (error) {
    res.status(error.statusCode || 500).json({ success: false, message: error.message });
  }
});

// ==============================
// CERTIFICATE MAPPING FIX
// ==============================
router.get('/courses/:courseId/enrolled-students', protect, authorize('admin'), async (req, res) => {
  try {
    const enrollments = await Enrollment.find({ 
      course: req.params.courseId,
      status: { $in: ['active', 'completed'] },
    }).populate('user', 'name email');

    const formatted = enrollments.map(en => ({
      userId: en.user?._id,
      userName: en.user?.name || en.fullName,
      userEmail: en.user?.email || en.email,
      completionStatus: en.status === 'completed' || en.progress?.percentComplete >= 100 ? 'COMPLETED' : 'IN_PROGRESS',
      completedAt: en.completedAt || null
    })).filter(e => e.userId || e.userName); 

    res.status(200).json({ success: true, count: formatted.length, data: formatted });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

router.post('/generate-certificate', protect, authorize('admin'), async (req, res) => {
  try {
    const { userId, courseId, certificateType, templateId } = req.body;
    if (!userId || !courseId) return res.status(400).json({ success: false, message: 'userId and courseId are required' });

    const validCertTypes = ['Completion Certificate', 'Participation Certificate', 'Excellence Certificate'];
    const selectedCertType = validCertTypes.includes(certificateType) ? certificateType : 'Completion Certificate';
    const selectedTemplateId = await validateActiveCertificateTemplate(templateId);

    const enrollment = await Enrollment.findOne({ user: userId, course: courseId }).populate('user course');
    if (!enrollment) return res.status(404).json({ success: false, message: 'Valid enrollment not found' });
    if (enrollment.status !== 'completed' && enrollment.progress?.percentComplete < 100) {
      return res.status(400).json({ success: false, message: 'Course is not COMPLETED by this student' });
    }

    let cert = await Certificate.findOne({ user: userId, course: courseId });
    if (cert) return res.status(200).json({ success: true, message: 'Certificate already exists', data: cert });

    cert = await buildAndStoreCertificate({
      userId,
      userEmail: enrollment.user.email,
      userName: enrollment.user.name,
      courseRef: enrollment.course,
      courseType: 'course',
      courseId,
      enrollmentId: enrollment._id,
      completionDate: enrollment.completedAt || new Date(),
      templateId: selectedTemplateId,
      certificateType: selectedCertType,
    });

    cert.certificateType = selectedCertType;
    await cert.save();

    enrollment.certificateId = cert.certificateId;
    if (enrollment.status !== 'completed') {
      enrollment.status = 'completed';
      enrollment.completedAt = new Date();
      enrollment.progress.percentComplete = 100;
    }
    await enrollment.save({ validateBeforeSave: false });

    res.status(201).json({ success: true, data: cert });
  } catch (error) {
    res.status(error.statusCode || 500).json({ success: false, message: error.message });
  }
});

// ==============================
// SYNC ENROLLMENT COUNTS
// ==============================

/**
 * @desc    Recalculate cached enrollment counts from actual enrollment records
 * @route   POST /api/admin/sync-enrollment-counts
 * @access  Private/Admin
 */
router.post('/sync-enrollment-counts', protect, authorize('admin'), async (req, res) => {
  try {
    // Sync LiveCourse.currentEnrollments
    const liveCourses = await LiveCourse.find().select('_id currentEnrollments');
    let liveFixed = 0;
    for (const lc of liveCourses) {
      const actualCount = await Enrollment.countDocuments({
        liveCourse: lc._id,
        status: { $in: ['active', 'completed'] }
      });
      if (lc.currentEnrollments !== actualCount) {
        lc.currentEnrollments = actualCount;
        await lc.save({ validateBeforeSave: false });
        liveFixed++;
      }
    }

    // Sync Course.enrollmentCount
    const Course = mongoose.model('Course');
    const courses = await Course.find().select('_id enrollmentCount');
    let courseFixed = 0;
    for (const c of courses) {
      const actualCount = await Enrollment.countDocuments({
        course: c._id,
        status: { $in: ['active', 'completed'] }
      });
      if (c.enrollmentCount !== actualCount) {
        c.enrollmentCount = actualCount;
        await c.save({ validateBeforeSave: false });
        courseFixed++;
      }
    }

    res.status(200).json({
      success: true,
      message: `Enrollment counts synced. Fixed ${liveFixed} live courses and ${courseFixed} normal courses.`,
      data: { liveCoursesFixed: liveFixed, coursesFixed: courseFixed }
    });
  } catch (error) {
    console.error('Sync enrollment counts error:', error);
    res.status(500).json({ success: false, message: 'Failed to sync enrollment counts' });
  }
});

// ==============================
// CERTIFICATES
// ==============================

router.get('/certificates', protect, authorize('admin'), async (req, res) => {
  try {
    const certificates = await Certificate.find()
      .populate('user', 'name email')
      .populate('course', 'title')
      .populate('liveCourse', 'title')
      .sort('-createdAt');

    // Append viewUrl / downloadUrl so the frontend can build correct PDF links
    const data = certificates.map((cert) => {
      const obj = cert.toObject();
      obj.viewUrl = `/api/certificates/${obj.certificateId}/view`;
      obj.downloadUrl = `/api/certificates/${obj.certificateId}/download`;
      return obj;
    });

    res.status(200).json({ success: true, count: data.length, data });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

router.post('/certificates', protect, authorize('admin'), async (req, res) => {
  try {
    const certificate = await Certificate.create(req.body);
    res.status(201).json({ success: true, data: certificate });
  } catch (error) {
    if (error.code === 11000) {
      return res.status(400).json({ success: false, message: 'Certificate ID already exists' });
    }
    res.status(500).json({ success: false, message: error.message });
  }
});

router.put('/certificates/:id', protect, authorize('admin'), async (req, res) => {
  try {
    const certificate = await Certificate.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      runValidators: true,
    });
    if (!certificate) return res.status(404).json({ success: false, message: 'Certificate not found' });
    res.status(200).json({ success: true, data: certificate });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

router.delete('/certificates/:id', protect, authorize('admin'), async (req, res) => {
  try {
    const certificate = await Certificate.findByIdAndDelete(req.params.id);
    if (!certificate) return res.status(404).json({ success: false, message: 'Certificate not found' });
    res.status(200).json({ success: true, data: {} });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Admin force-generate Certificate for a given enrollment
router.post('/certificates/generate/:enrollmentId', protect, authorize('admin'), async (req, res) => {
  try {
    const enrollment = await Enrollment.findById(req.params.enrollmentId)
      .populate('user', 'name email')
      .populate('course')
      .populate('liveCourse');

    if (!enrollment) return res.status(404).json({ success: false, message: 'Enrollment not found' });
    if (enrollment.status !== 'completed') return res.status(400).json({ success: false, message: 'Course is not completed' });

    const courseType = enrollment.course ? 'course' : 'liveCourse';
    const courseId = enrollment[courseType]?._id;

    let cert = await Certificate.findOne({ user: enrollment.user._id, [courseType]: courseId });
    if (cert) return res.status(400).json({ success: false, message: 'Certificate already generated' });

    const courseRef = enrollment[courseType];
    const serialNumber = await Counter.getNextSequence('certificates');
    const paddedSerial = String(serialNumber).padStart(4, '0');
    const currentYear = new Date().getFullYear();
    const certificateId = `FWT-IZON-${currentYear}-${paddedSerial}`;

    const pdfData = {
      studentName: enrollment.user.name,
      courseName: courseRef.title,
      domain: courseRef.category || 'Professional Development',
      areaOfExpertise: 'Specialized Training',
      completionDate: enrollment.completedAt || new Date(),
      certificateId,
      serialNumber
    };

    const pdfBuffer = await generateCertificatePDF(pdfData);
    const fileUrl = await uploadPdfToCloudinary(pdfBuffer, `${certificateId}-${enrollment.user._id}`, 'fwtion/certificates');

    cert = await Certificate.create({
      certificateId,
      user: enrollment.user._id,
      [courseType]: courseId,
      studentName: enrollment.user.name,
      studentEmail: enrollment.user.email,
      courseName: courseRef.title,
      domain: pdfData.domain,
      areaOfExpertise: pdfData.areaOfExpertise,
      issueDate: new Date(),
      completionDate: pdfData.completionDate,
      serialNumber,
      fileUrl,
      enrollment: enrollment._id
    });

    enrollment.certificateId = cert.certificateId;
    await enrollment.save({ validateBeforeSave: false });

    res.status(201).json({ success: true, data: cert });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

router.post('/certificates/regenerate/:id', protect, authorize('admin'), async (req, res) => {
  try {
    const cert = await Certificate.findById(req.params.id)
      .populate('user', 'name _id')
      .populate('course', 'title category instructorName')
      .populate('liveCourse', 'title category instructorName');
      
    if (!cert) return res.status(404).json({ success: false, message: 'Certificate not found' });
    
    const courseRef = cert.course || cert.liveCourse;
    const templateId = req.body.templateId || cert.templateId;
    const template = await resolveTemplate(templateId);

    const pdfData = {
      studentName: req.body.studentName || cert.studentName,
      courseName: req.body.courseName || cert.courseName,
      domain: req.body.domain || cert.domain || courseRef?.category || 'Professional Development',
      areaOfExpertise: req.body.areaOfExpertise || cert.areaOfExpertise || 'Specialized Training',
      completionDate: req.body.completionDate || cert.completionDate || cert.issueDate,
      certificateId: cert.certificateId,
      serialNumber: cert.serialNumber || parseInt(cert.certificateId.split('-').pop(), 10) || 1,
      instructorName: courseRef?.instructorName || '',
    };

    const pdfBuffer = await generateCertificatePDF(pdfData, template);
    const fileUrl = await uploadPdfToCloudinary(pdfBuffer, `${cert.certificateId}-${cert.user._id}-v${Date.now()}`, 'fwtion/certificates');
    
    cert.fileUrl = fileUrl;
    cert.studentName = pdfData.studentName;
    cert.courseName = pdfData.courseName;
    cert.domain = pdfData.domain;
    cert.areaOfExpertise = pdfData.areaOfExpertise;
    if (template) {
      cert.templateId = template._id;
      cert.templateName = template.templateName;
    }
    
    await cert.save();
    res.status(200).json({ success: true, data: cert });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

router.post('/enrollments/:id/complete', protect, authorize('admin'), async (req, res) => {
  try {
    const enrollment = await Enrollment.findById(req.params.id).populate('course liveCourse user');
    if (!enrollment) return res.status(404).json({ success: false, message: 'Enrollment not found' });
    
    enrollment.status = 'completed';
    enrollment.completedAt = new Date();
    enrollment.progress.percentComplete = 100;
    
    await enrollment.save();
    res.status(200).json({ success: true, message: 'Enrollment completed manually', data: enrollment });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Admin Receipts
router.get('/receipts', protect, authorize('admin'), async (req, res) => {
  try {
    const receipts = await Receipt.find()
      .populate('user', 'name email')
      .populate('course', 'title')
      .populate('liveCourse', 'title')
      .sort('-createdAt');

    // Append viewUrl / downloadUrl so the frontend can build correct PDF links
    const data = receipts.map((receipt) => {
      const obj = receipt.toObject();
      obj.viewUrl = `/api/receipts/${obj.receiptId}/view`;
      obj.downloadUrl = `/api/receipts/${obj.receiptId}/download`;
      return obj;
    });

    res.status(200).json({ success: true, count: data.length, data });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

router.get('/receipts/:id', protect, authorize('admin'), async (req, res) => {
  try {
    const receipt = await Receipt.findById(req.params.id)
      .populate('user', 'name email')
      .populate('course', 'title')
      .populate('liveCourse', 'title');
    if (!receipt) return res.status(404).json({ success: false, message: 'Receipt not found' });
    res.status(200).json({ success: true, data: receipt });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// ==============================
// LIVE COURSES (Admin Full Control)
// ==============================

router.get('/live-courses', protect, authorize('admin', 'instructor'), async (req, res) => {
  try {
    const courses = await LiveCourse.find().populate('instructor', 'name avatar').sort('-createdAt');
    res.status(200).json({ success: true, count: courses.length, data: courses });
  } catch (err) {
    console.error('Fetch live courses error:', err);
    res.status(500).json({ success: false, message: 'Error fetching live courses' });
  }
});

router.post('/live-courses', protect, authorize('admin', 'instructor'), async (req, res) => {
  try {
    const payload = sanitizeLiveCoursePayload(req.body);
    payload.instructor = req.user.id;
    const course = await LiveCourse.create(payload);
    res.status(201).json({ success: true, data: course });
  } catch (err) {
    console.error('Live course creation error:', err);
    res.status(err.statusCode || 500).json({ success: false, message: err.message || 'Error creating live course' });
  }
});

router.put('/live-courses/:id', protect, authorize('admin', 'instructor'), async (req, res) => {
  try {
    const course = await LiveCourse.findById(req.params.id);
    if (!course) return res.status(404).json({ success: false, message: 'LiveCourse not found' });

    const payload = sanitizeLiveCoursePayload(req.body, { existingCourse: course });

    if (!payload.zoomLink && course.zoomLink) {
      payload.zoomLink = course.zoomLink;
    }

    if (!payload.whatsappGroup && course.whatsappGroup) {
      payload.whatsappGroup = course.whatsappGroup;
    }

    Object.assign(course, payload);
    await course.save();

    res.status(200).json({ success: true, data: course });
  } catch (err) {
    console.error('Live course update error:', err);
    res.status(err.statusCode || 500).json({ success: false, message: err.message || 'Error updating live course' });
  }
});

router.delete('/live-courses/:id', protect, authorize('admin', 'instructor'), async (req, res) => {
  try {
    const course = await LiveCourse.findById(req.params.id);
    if (!course) return res.status(404).json({ success: false, message: 'LiveCourse not found' });

    await course.deleteOne();
    res.status(200).json({ success: true, data: {} });
  } catch (err) {
    console.error('Live course deletion error:', err);
    res.status(500).json({ success: false, message: 'Error deleting live course' });
  }
});

import CohortApplication from '../models/CohortApplication.js';
router.get('/live-courses/:id/applications', protect, authorize('admin'), async (req, res) => {
  try {
    const applications = await CohortApplication.find({ liveCourse: req.params.id, status: 'Enrolled' })
      .populate('user', 'name avatar email')
      .sort('-createdAt');
    res.status(200).json({ success: true, count: applications.length, data: applications });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

/**
 * @desc    Export applications for a live course as .xlsx
 * @route   GET /api/admin/live-courses/:id/applications/export
 * @access  Private/Admin
 */
router.get('/live-courses/:id/applications/export', protect, authorize('admin'), async (req, res) => {
  try {
    const { id } = req.params;
    if (!isValidObjectId(id)) {
      return res.status(400).json({ success: false, message: 'Invalid course ID' });
    }

    // Fetch the live course for metadata
    const liveCourse = await LiveCourse.findById(id).lean();
    if (!liveCourse) {
      return res.status(404).json({ success: false, message: 'Live course not found' });
    }

    // Fetch all applications for this cohort
    const applications = await CohortApplication.find({ liveCourse: id, status: 'Enrolled' })
      .populate('user', 'name email')
      .sort('-createdAt')
      .lean();

    // Fetch enrollments to get payment IDs per applicant email
    const enrollments = await Enrollment.find({ liveCourse: id }).lean();
    const enrollmentMap = new Map();
    for (const en of enrollments) {
      enrollmentMap.set(en.email || '', en.paymentId || '');
    }

    // Dynamically import exceljs (ESM-compatible)
    const ExcelJS = (await import('exceljs')).default;
    const workbook = new ExcelJS.Workbook();
    workbook.creator = 'Fwtizon Academy Admin';
    workbook.created = new Date();

    const sheet = workbook.addWorksheet('Applications', {
      pageSetup: { paperSize: 9, orientation: 'landscape' },
    });

    // ── Column definitions ─────────────────────────────────────────────────
    sheet.columns = [
      { header: '#',                key: 'index',          width: 5  },
      { header: 'Applicant Name',   key: 'fullName',       width: 28 },
      { header: 'Email',            key: 'email',          width: 32 },
      { header: 'Mobile Number',    key: 'mobileNumber',   width: 18 },
      { header: 'WhatsApp Number',  key: 'whatsappNumber', width: 18 },
      { header: 'Gender',           key: 'gender',         width: 16 },
      { header: 'Department',       key: 'courseDepartment', width: 22 },
      { header: 'Experience Level', key: 'experienceLevel', width: 18 },
      { header: 'Course Name',      key: 'courseName',     width: 36 },
      { header: 'Instructor',       key: 'instructorName', width: 24 },
      { header: 'Payment Status',   key: 'paymentStatus',  width: 16 },
      { header: 'Application Status', key: 'status',       width: 18 },
      { header: 'Payment ID',       key: 'paymentId',      width: 28 },
      { header: 'Applied Date',     key: 'appliedDate',    width: 22 },
      { header: 'Applied Time',     key: 'appliedTime',    width: 16 },
    ];

    // ── Style the header row ───────────────────────────────────────────────
    const headerRow = sheet.getRow(1);
    headerRow.eachCell((cell) => {
      cell.font = { bold: true, color: { argb: 'FFFFFFFF' }, size: 11 };
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF4F46E5' } };
      cell.alignment = { vertical: 'middle', horizontal: 'center', wrapText: true };
      cell.border = {
        top:    { style: 'thin', color: { argb: 'FF4338CA' } },
        left:   { style: 'thin', color: { argb: 'FF4338CA' } },
        bottom: { style: 'thin', color: { argb: 'FF4338CA' } },
        right:  { style: 'thin', color: { argb: 'FF4338CA' } },
      };
    });
    headerRow.height = 30;

    // ── Populate data rows ─────────────────────────────────────────────────
    const instructorName =
      (liveCourse.instructorName && liveCourse.instructorName.trim()) ||
      'N/A';

    applications.forEach((app, i) => {
      const appliedDate = app.createdAt ? new Date(app.createdAt) : null;
      const paymentId   = enrollmentMap.get(app.email || '') || 'N/A';
      const isPaid      = paymentId !== 'N/A';

      const row = sheet.addRow({
        index:           i + 1,
        fullName:        app.fullName || 'N/A',
        email:           app.email || 'N/A',
        mobileNumber:    app.mobileNumber || 'N/A',
        whatsappNumber:  app.whatsappNumber || 'N/A',
        gender:          app.gender || 'N/A',
        courseDepartment: app.courseDepartment || 'N/A',
        experienceLevel: app.experienceLevel || 'N/A',
        courseName:      liveCourse.title || 'N/A',
        instructorName,
        paymentStatus:   isPaid ? 'Paid' : 'Pending',
        status:          app.status || 'Applied',
        paymentId,
        appliedDate:     appliedDate
          ? appliedDate.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })
          : 'N/A',
        appliedTime:     appliedDate
          ? appliedDate.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true })
          : 'N/A',
      });

      // Alternating row background
      const bgColor = i % 2 === 0 ? 'FFFAFAFA' : 'FFFFFFFF';
      row.eachCell((cell) => {
        cell.alignment = { vertical: 'middle', horizontal: 'left', wrapText: false };
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: bgColor } };
        cell.border = {
          top:    { style: 'hair', color: { argb: 'FFE5E7EB' } },
          left:   { style: 'hair', color: { argb: 'FFE5E7EB' } },
          bottom: { style: 'hair', color: { argb: 'FFE5E7EB' } },
          right:  { style: 'hair', color: { argb: 'FFE5E7EB' } },
        };
      });

      // Color-code payment status cell
      const payCell = row.getCell('paymentStatus');
      payCell.font = { bold: true, color: { argb: isPaid ? 'FF059669' : 'FFD97706' } };

      // Color-code application status cell
      const statusCell = row.getCell('status');
      const isEnrolled = app.status === 'Enrolled';
      statusCell.font = { bold: true, color: { argb: isEnrolled ? 'FF059669' : 'FF6B7280' } };

      row.height = 22;
    });

    // ── Summary row at the bottom ──────────────────────────────────────────
    sheet.addRow([]);
    const summaryRow = sheet.addRow([
      '', 'Total Applications:', applications.length,
      '', 'Paid:', enrollments.length,
    ]);
    summaryRow.eachCell((cell) => {
      if (cell.value !== '') {
        cell.font = { bold: true, size: 10, color: { argb: 'FF374151' } };
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF3F4F6' } };
      }
    });

    // ── Auto-filter on header row ──────────────────────────────────────────
    sheet.autoFilter = {
      from: { row: 1, column: 1 },
      to:   { row: 1, column: sheet.columns.length },
    };

    // Freeze the header row
    sheet.views = [{ state: 'frozen', ySplit: 1 }];

    // ── Stream the workbook to the response ───────────────────────────────
    const safeName = (liveCourse.title || 'cohort').replace(/[^a-zA-Z0-9]/g, '_').substring(0, 40);
    const filename  = `applications_${safeName}_${Date.now()}.xlsx`;

    res.setHeader(
      'Content-Type',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    );
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.setHeader('Cache-Control', 'no-cache');

    await workbook.xlsx.write(res);
    res.end();
  } catch (error) {
    console.error('Excel export error:', error);
    // Only send JSON error if headers not already sent
    if (!res.headersSent) {
      res.status(500).json({ success: false, message: 'Failed to export applications' });
    }
  }
});

// ==============================
// ADMIN COURSE MANAGEMENT
// All statuses returned (draft + published) — admin sees everything.
// ==============================

/**
 * @desc    List ALL courses (any status) for admin panel
 * @route   GET /api/admin/courses
 * @query   page, limit, search, status
 * @access  Private/Admin
 */
router.get('/courses', protect, authorize('admin'), async (req, res) => {
  try {
    const page = Math.max(parseInt(req.query.page, 10) || 1, 1);
    const limit = Math.min(Math.max(parseInt(req.query.limit, 10) || 50, 1), 100);
    const skip = (page - 1) * limit;

    const filter = {};
    if (req.query.search) {
      filter.title = { $regex: escapeRegex(req.query.search), $options: 'i' };
    }
    if (req.query.status && ['draft', 'published'].includes(req.query.status)) {
      filter.status = req.query.status;
    }

    const [courses, total] = await Promise.all([
      Course.find(filter)
        .populate({ path: 'instructor', select: 'name avatar' })
        .sort('-createdAt')
        .skip(skip)
        .limit(limit)
        .lean(),
      Course.countDocuments(filter),
    ]);

    // Merge display overrides so admin table shows correct instructor info
    const data = courses.map(c => ({
      ...c,
      displayInstructorName: (c.instructorName && c.instructorName.trim()) || c.instructor?.name || 'Fwtion Academy',
      displayInstructorPhoto: (c.instructorPhoto && c.instructorPhoto.trim()) || c.instructor?.avatar || '',
    }));

    res.status(200).json({
      success: true,
      count: data.length,
      total,
      page,
      totalPages: Math.max(Math.ceil(total / limit), 1),
      data,
    });
  } catch (error) {
    console.error('Admin list courses error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

/**
 * @desc    Create a course as admin
 * @route   POST /api/admin/courses
 * @access  Private/Admin
 */
router.post('/courses', protect, authorize('admin'), async (req, res) => {
  try {
    const { title, description, price, category, status, thumbnail, instructorName, instructorPhoto, linkedLiveCourseId } = req.body;

    // Validation
    if (!title || !title.trim()) {
      return res.status(400).json({ success: false, message: 'Course title is required' });
    }
    if (!description || !description.trim()) {
      return res.status(400).json({ success: false, message: 'Course description is required' });
    }
    if (price === undefined || price === null || isNaN(Number(price)) || Number(price) < 0) {
      return res.status(400).json({ success: false, message: 'A valid course price (≥ 0) is required' });
    }
    if (!category) {
      return res.status(400).json({ success: false, message: 'Course category is required' });
    }
    if (!instructorName || !instructorName.trim()) {
      return res.status(400).json({ success: false, message: 'Instructor name is required' });
    }

    const courseData = {
      title: title.trim(),
      description: description.trim(),
      price: Number(price),
      category,
      status: (status || 'draft').toLowerCase(),
      thumbnail: thumbnail || 'no-photo.jpg',
      instructorName: instructorName.trim(),
      instructorPhoto: instructorPhoto || '',
      instructor: req.user.id,
      linkedLiveCourseId: linkedLiveCourseId || null,
    };

    const course = await Course.create(courseData);
    res.status(201).json({ success: true, data: course });
  } catch (error) {
    console.error('Admin create course error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

/**
 * @desc    Update a course as admin (all fields including instructor overrides & price)
 * @route   PUT /api/admin/courses/:id
 * @access  Private/Admin
 */
router.put('/courses/:id', protect, authorize('admin'), async (req, res) => {
  try {
    if (!isValidObjectId(req.params.id)) {
      return res.status(400).json({ success: false, message: 'Invalid course ID' });
    }

    const course = await Course.findById(req.params.id);
    if (!course) {
      return res.status(404).json({ success: false, message: 'Course not found' });
    }

    const { title, description, price, category, status, thumbnail, instructorName, instructorPhoto, linkedLiveCourseId } = req.body;

    // Validation
    if (title !== undefined && !title.trim()) {
      return res.status(400).json({ success: false, message: 'Course title cannot be empty' });
    }
    if (price !== undefined && (isNaN(Number(price)) || Number(price) < 0)) {
      return res.status(400).json({ success: false, message: 'Price must be a non-negative number' });
    }
    if (instructorName !== undefined && !instructorName.trim()) {
      return res.status(400).json({ success: false, message: 'Instructor name cannot be empty' });
    }

    const allowedUpdates = {};
    if (title !== undefined) allowedUpdates.title = title.trim();
    if (description !== undefined) allowedUpdates.description = description.trim();
    if (price !== undefined) allowedUpdates.price = Number(price);
    if (category !== undefined) allowedUpdates.category = category;
    if (status !== undefined) allowedUpdates.status = status.toLowerCase();
    if (thumbnail !== undefined) allowedUpdates.thumbnail = thumbnail;
    if (instructorName !== undefined) allowedUpdates.instructorName = instructorName.trim();
    if (instructorPhoto !== undefined) allowedUpdates.instructorPhoto = instructorPhoto;
    // Allow linking/unlinking a live course (null clears it)
    if (linkedLiveCourseId !== undefined) allowedUpdates.linkedLiveCourseId = linkedLiveCourseId || null;

    const updated = await Course.findByIdAndUpdate(
      req.params.id,
      allowedUpdates,
      { new: true, runValidators: true }
    ).populate({ path: 'instructor', select: 'name avatar' });

    const data = {
      ...updated.toObject(),
      displayInstructorName: (updated.instructorName && updated.instructorName.trim()) || updated.instructor?.name || 'Fwtion Academy',
      displayInstructorPhoto: (updated.instructorPhoto && updated.instructorPhoto.trim()) || updated.instructor?.avatar || '',
    };

    res.status(200).json({ success: true, data });
  } catch (error) {
    console.error('Admin update course error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

/**
 * @desc    Toggle course status (Draft/Published)
 * @route   PATCH /api/admin/courses/:id/toggle-status
 * @access  Private/Admin
 */
router.patch('/courses/:id/toggle-status', protect, authorize('admin'), async (req, res) => {
  try {
    if (!isValidObjectId(req.params.id)) {
      return res.status(400).json({ success: false, message: 'Invalid course ID' });
    }
    const course = await Course.findById(req.params.id);
    if (!course) {
      return res.status(404).json({ success: false, message: 'Course not found' });
    }

    course.status = course.status === 'published' ? 'draft' : 'published';
    await course.save({ validateBeforeSave: false });

    res.status(200).json({
      success: true,
      data: { _id: course._id, status: course.status },
      message: `Course is now ${course.status}`
    });
  } catch (error) {
    console.error('Admin toggle course status error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

/**
 * @desc    Delete a course as admin
 * @route   DELETE /api/admin/courses/:id
 * @access  Private/Admin
 */
router.delete('/courses/:id', protect, authorize('admin'), async (req, res) => {
  try {
    if (!isValidObjectId(req.params.id)) {
      return res.status(400).json({ success: false, message: 'Invalid course ID' });
    }
    const course = await Course.findByIdAndDelete(req.params.id);
    if (!course) {
      return res.status(404).json({ success: false, message: 'Course not found' });
    }
    res.status(200).json({ success: true, data: {} });
  } catch (error) {
    console.error('Admin delete course error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

/**
 * @desc    Get applications/enrollments for a specific normal course
 * @route   GET /api/admin/courses/:id/students
 * @access  Private/Admin
 */
router.get('/courses/:id/students', protect, authorize('admin'), async (req, res) => {
  try {
    if (!isValidObjectId(req.params.id)) {
      return res.status(400).json({ success: false, message: 'Invalid course ID' });
    }

    const enrollments = await Enrollment.find({ course: req.params.id })
      .populate('user', 'name email mobileNumber whatsappNumber gender courseDepartment experienceLevel avatar')
      .sort('-createdAt')
      .lean();

    res.status(200).json({ success: true, data: enrollments });
  } catch (error) {
    console.error('Admin get course students error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

/**
 * @desc    Get a single course with full curriculum (modules + lessons) for the admin editor
 * @route   GET /api/admin/courses/:id/full
 * @access  Private/Admin
 */
router.get('/courses/:id/full', protect, authorize('admin'), async (req, res) => {
  try {
    if (!isValidObjectId(req.params.id)) {
      return res.status(400).json({ success: false, message: 'Invalid course ID' });
    }

    const course = await Course.findById(req.params.id)
      .populate({
        path: 'modules',
        options: { sort: { order: 1 } },
        populate: {
          path: 'lessons',
          options: { sort: { order: 1 } },
        },
      })
      .lean();

    if (!course) {
      return res.status(404).json({ success: false, message: 'Course not found' });
    }

    res.status(200).json({ success: true, data: course });
  } catch (error) {
    console.error('Admin get full course error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

/**
 * @desc    Bulk update curriculum (modules and lessons) for a course
 * @route   PUT /api/admin/courses/:id/modules
 * @access  Private/Admin
 */
router.put('/courses/:id/modules', protect, authorize('admin'), async (req, res) => {
  try {
    const courseId = req.params.id;
    if (!isValidObjectId(courseId)) {
      return res.status(400).json({ success: false, message: 'Invalid course ID' });
    }

    const course = await Course.findById(courseId);
    if (!course) {
      return res.status(404).json({ success: false, message: 'Course not found' });
    }

    const { modules } = req.body;
    if (!Array.isArray(modules)) {
      return res.status(400).json({ success: false, message: 'Modules must be an array' });
    }

    // Process modules
    const updatedModulesData = [];
    for (let mIdx = 0; mIdx < modules.length; mIdx++) {
      const modData = modules[mIdx];
      let moduleDoc;

      if (modData._id && isValidObjectId(modData._id)) {
        // Update existing module
        moduleDoc = await Module.findByIdAndUpdate(
          modData._id,
          { title: modData.title, order: mIdx },
          { new: true }
        );
      } else {
        // Create new module
        moduleDoc = await Module.create({
          title: modData.title || 'New Module',
          course: courseId,
          order: mIdx,
        });
      }

      if (!moduleDoc) continue;

      // Process lessons for this module
      const lessonsData = modData.lessons || [];
      const currentLessonIds = [];

      for (let lIdx = 0; lIdx < lessonsData.length; lIdx++) {
        const lessData = lessonsData[lIdx];
        let lessonDoc;

        const lessonPayload = {
          title: lessData.title || 'New Lesson',
          module: moduleDoc._id,
          type: lessData.type || 'video',
          content: lessData.content || '',
          description: lessData.description || '',
          zoomEmbedLink: lessData.zoomEmbedLink || '',
          zoomPassword: lessData.zoomPassword || '',
          duration: lessData.duration || 0,
          order: lIdx,
          isPreview: lessData.isPreview || false,
          resources: lessData.resources || [],
        };

        if (lessData._id && isValidObjectId(lessData._id)) {
          // Update existing lesson
          lessonDoc = await Lesson.findByIdAndUpdate(lessData._id, lessonPayload, { new: true });
        } else {
          // Create new lesson
          lessonDoc = await Lesson.create(lessonPayload);
        }

        if (lessonDoc) {
          currentLessonIds.push(lessonDoc._id);
        }
      }

      // Cleanup removed lessons in this module
      if (modData._id) {
        await Lesson.deleteMany({
          module: moduleDoc._id,
          _id: { $nin: currentLessonIds }
        });
      }

      updatedModulesData.push({ ...moduleDoc.toObject(), lessons: currentLessonIds });
    }

    // Cleanup removed modules for this course
    const currentModuleIds = updatedModulesData.map(m => m._id);
    const modulesToDelete = await Module.find({ course: courseId, _id: { $nin: currentModuleIds } });
    
    for (const mod of modulesToDelete) {
      await Lesson.deleteMany({ module: mod._id });
      await mod.deleteOne();
    }

    res.status(200).json({ success: true, message: 'Curriculum updated successfully' });
  } catch (error) {
    console.error('Admin bulk update curriculum error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// ==============================
// FEEDBACK FORMS (Admin)
// ==============================

router.post('/feedback-forms', protect, authorize('admin'), createFeedbackForm);
router.put('/feedback-forms/:id', protect, authorize('admin'), updateFeedbackForm);
router.get('/feedback-forms', protect, authorize('admin'), getAllFeedbackForms);
router.get('/feedback-forms/:id', protect, authorize('admin'), getFeedbackFormById);
router.delete('/feedback-forms/:id', protect, authorize('admin'), deleteFeedbackForm);
router.patch('/feedback-forms/:id/toggle', protect, authorize('admin'), toggleFeedbackForm);
router.get('/feedback-forms/:id/responses', protect, authorize('admin'), getFormResponses);
router.delete('/feedback-forms/:id/submissions/:subId/reset', protect, authorize('admin'), resetSubmission);
router.get('/feedback-summary', protect, authorize('admin'), getCourseFeedbackSummary);

// ==============================
// COUPON MANAGEMENT
// ==============================
router.get('/coupons', protect, authorize('admin'), listCoupons);
router.get('/coupons/:id', protect, authorize('admin'), getCoupon);
router.post('/coupons', protect, authorize('admin'), createCoupon);
router.put('/coupons/:id', protect, authorize('admin'), updateCoupon);
router.patch('/coupons/:id/toggle', protect, authorize('admin'), toggleCoupon);
router.delete('/coupons/:id', protect, authorize('admin'), deleteCoupon);

export default router;
