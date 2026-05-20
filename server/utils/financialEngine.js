import mongoose from 'mongoose';
import Enrollment from '../models/Enrollment.js';
import Course from '../models/Course.js';
import LiveCourse from '../models/LiveCourse.js';
import ResourcePersonExpense from '../models/ResourcePersonExpense.js';
import CourseOtherExpense from '../models/CourseOtherExpense.js';
import RefundRecord from '../models/RefundRecord.js';

/**
 * Safely parse a float to 2 decimal places to avoid floating point issues
 */
const safeMoney = (val) => Number.parseFloat(Number(val || 0).toFixed(2));

/**
 * Build match criteria for a specific course
 */
const getCourseMatch = (courseId, courseType) => {
  if (courseType === 'live') {
    return { liveCourse: new mongoose.Types.ObjectId(courseId) };
  }
  return { course: new mongoose.Types.ObjectId(courseId) };
};

/**
 * Get financial summary for a specific course
 */
export const getCourseFinancialSummary = async (courseId, courseType) => {
  if (!courseId || !courseType) {
    throw new Error('Course ID and Course Type are required');
  }

  const courseMatch = getCourseMatch(courseId, courseType);

  // Get course details
  const courseDetails = courseType === 'live' 
    ? await LiveCourse.findById(courseId).select('title status price')
    : await Course.findById(courseId).select('title status price');
    
  if (!courseDetails) {
    throw new Error('Course not found');
  }

  // 1. Enrollment stats
  const enrollmentsAggr = await Enrollment.aggregate([
    { $match: { ...courseMatch, status: { $in: ['active', 'completed'] } } },
    {
      $group: {
        _id: null,
        totalEnrollments: { $sum: 1 },
        paidEnrollments: { $sum: { $cond: [{ $eq: ['$enrollmentType', 'paid'] }, 1, 0] } },
        freeEnrollments: { $sum: { $cond: [{ $eq: ['$enrollmentType', 'free'] }, 1, 0] } },
        adminEnrollments: { $sum: { $cond: [{ $eq: ['$enrollmentType', 'admin'] }, 1, 0] } },
        autoEnrollments: { $sum: { $cond: [{ $eq: ['$enrollmentType', 'auto'] }, 1, 0] } },
        grossRevenue: { $sum: { $cond: [{ $eq: ['$enrollmentType', 'paid'] }, '$amount', 0] } },
        totalDiscounts: { $sum: { $cond: [{ $eq: ['$enrollmentType', 'paid'] }, '$discountAmount', 0] } },
        lastPaymentDate: { $max: { $cond: [{ $eq: ['$enrollmentType', 'paid'] }, '$createdAt', null] } }
      }
    }
  ]);

  const enrollStats = enrollmentsAggr[0] || {
    totalEnrollments: 0, paidEnrollments: 0, freeEnrollments: 0, adminEnrollments: 0, autoEnrollments: 0,
    grossRevenue: 0, totalDiscounts: 0, lastPaymentDate: null
  };

  // 2. Refunds
  const refundsAggr = await RefundRecord.aggregate([
    { $match: courseMatch },
    { $group: { _id: null, totalRefunded: { $sum: '$amount' } } }
  ]);
  const totalRefunded = refundsAggr[0]?.totalRefunded || 0;

  // 3. Resource Person Expenses (only PAID ones)
  const rpExpenseAggr = await ResourcePersonExpense.aggregate([
    { $match: { ...courseMatch, status: 'paid' } },
    { $group: { _id: null, total: { $sum: '$amount' } } }
  ]);
  const resourcePersonExpense = rpExpenseAggr[0]?.total || 0;

  // 4. Other Expenses
  const otherExpenseAggr = await CourseOtherExpense.aggregate([
    { $match: courseMatch },
    { $group: { _id: null, total: { $sum: '$amount' } } }
  ]);
  const otherExpenses = otherExpenseAggr[0]?.total || 0;

  // 5. Calculations
  const grossRevenue = safeMoney(enrollStats.grossRevenue);
  const netRevenue = safeMoney(grossRevenue - totalRefunded);
  const totalExpenses = safeMoney(resourcePersonExpense + otherExpenses);
  const finalProfit = safeMoney(netRevenue - totalExpenses);
  
  let profitMarginPercent = 0;
  if (grossRevenue > 0) {
    profitMarginPercent = safeMoney((finalProfit / grossRevenue) * 100);
  }

  return {
    courseId,
    courseName: courseDetails.title,
    courseType,
    courseStatus: courseDetails.status,
    coursePrice: courseDetails.price || 0,
    totalEnrollments: enrollStats.totalEnrollments,
    paidEnrollments: enrollStats.paidEnrollments,
    freeEnrollments: enrollStats.freeEnrollments,
    adminEnrollments: enrollStats.adminEnrollments,
    autoEnrollments: enrollStats.autoEnrollments,
    grossRevenue,
    totalDiscounts: safeMoney(enrollStats.totalDiscounts),
    totalRefunded: safeMoney(totalRefunded),
    netRevenue,
    resourcePersonExpense: safeMoney(resourcePersonExpense),
    otherExpenses: safeMoney(otherExpenses),
    totalExpenses,
    finalProfit,
    profitMarginPercent,
    lastPaymentDate: enrollStats.lastPaymentDate
  };
};

/**
 * Get summary for all courses
 */
export const getAllCoursesFinancialSummary = async () => {
  const [courses, liveCourses] = await Promise.all([
    Course.find().select('_id'),
    LiveCourse.find().select('_id')
  ]);

  const allSummaries = [];
  
  // Process sequentially to avoid DB overload (could be optimized with a single massive aggregation)
  for (const c of courses) {
    try {
      allSummaries.push(await getCourseFinancialSummary(c._id, 'self-paced'));
    } catch (err) {
      console.warn(`Could not compute summary for course ${c._id}: ${err.message}`);
    }
  }

  for (const c of liveCourses) {
    try {
      allSummaries.push(await getCourseFinancialSummary(c._id, 'live'));
    } catch (err) {
      console.warn(`Could not compute summary for live course ${c._id}: ${err.message}`);
    }
  }

  return allSummaries;
};

/**
 * Get platform wide totals
 */
export const getPlatformFinancialSummary = async () => {
  const allSummaries = await getAllCoursesFinancialSummary();
  
  let totalGrossRevenue = 0;
  let totalNetRevenue = 0;
  let totalExpenses = 0;
  let totalProfit = 0;
  let totalRefunds = 0;
  let totalDiscounts = 0;
  
  allSummaries.forEach(s => {
    totalGrossRevenue += s.grossRevenue;
    totalNetRevenue += s.netRevenue;
    totalExpenses += s.totalExpenses;
    totalProfit += s.finalProfit;
    totalRefunds += s.totalRefunded;
    totalDiscounts += s.totalDiscounts;
  });

  const avgProfitMargin = totalGrossRevenue > 0 
    ? safeMoney((totalProfit / totalGrossRevenue) * 100) 
    : 0;

  return {
    totalGrossRevenue: safeMoney(totalGrossRevenue),
    totalNetRevenue: safeMoney(totalNetRevenue),
    totalExpenses: safeMoney(totalExpenses),
    totalProfit: safeMoney(totalProfit),
    totalRefunds: safeMoney(totalRefunds),
    totalDiscounts: safeMoney(totalDiscounts),
    courseCount: allSummaries.length,
    avgProfitMargin
  };
};

/**
 * Get expense breakdown for a course (or platform if courseId is null)
 */
export const getCourseExpenseBreakdown = async (courseId = null, courseType = null) => {
  let rpMatch = { status: 'paid' };
  let otherMatch = {};

  if (courseId && courseType) {
    const courseMatch = getCourseMatch(courseId, courseType);
    rpMatch = { ...rpMatch, ...courseMatch };
    otherMatch = { ...courseMatch };
  }

  const [rpAggr, otherAggr] = await Promise.all([
    ResourcePersonExpense.aggregate([
      { $match: rpMatch },
      { $group: { _id: null, total: { $sum: '$amount' } } }
    ]),
    CourseOtherExpense.aggregate([
      { $match: otherMatch },
      { $group: { _id: '$category', total: { $sum: '$amount' } } }
    ])
  ]);

  const resourcePersonTotal = safeMoney(rpAggr[0]?.total || 0);
  
  const categories = {};
  let otherTotal = 0;
  otherAggr.forEach(cat => {
    const amt = safeMoney(cat.total);
    categories[cat._id] = amt;
    otherTotal += amt;
  });

  return {
    resourcePersonTotal,
    categories,
    totalExpenses: safeMoney(resourcePersonTotal + otherTotal)
  };
};

/**
 * Get revenue trend (monthly)
 */
export const getCourseRevenueTrend = async (courseId = null, courseType = null, months = 12) => {
  // Compute start date based on months
  const startDate = new Date();
  startDate.setMonth(startDate.getMonth() - (months - 1));
  startDate.setDate(1);
  startDate.setHours(0, 0, 0, 0);

  let enrollMatch = { 
    status: { $in: ['active', 'completed'] },
    enrollmentType: 'paid',
    createdAt: { $gte: startDate }
  };
  let rpMatch = { status: 'paid', paymentDate: { $gte: startDate } };
  let otherMatch = { date: { $gte: startDate } };
  let refundMatch = { refundDate: { $gte: startDate } };

  if (courseId && courseType) {
    const courseMatch = getCourseMatch(courseId, courseType);
    enrollMatch = { ...enrollMatch, ...courseMatch };
    rpMatch = { ...rpMatch, ...courseMatch };
    otherMatch = { ...otherMatch, ...courseMatch };
    refundMatch = { ...refundMatch, ...courseMatch };
  }

  // Aggregate revenue (createdAt)
  const revenueAggr = await Enrollment.aggregate([
    { $match: enrollMatch },
    {
      $group: {
        _id: { $dateToString: { format: '%Y-%m', date: '$createdAt' } },
        revenue: { $sum: '$amount' }
      }
    }
  ]);

  // Aggregate refunds
  const refundsAggr = await RefundRecord.aggregate([
    { $match: refundMatch },
    {
      $group: {
        _id: { $dateToString: { format: '%Y-%m', date: '$refundDate' } },
        refund: { $sum: '$amount' }
      }
    }
  ]);

  // Aggregate RP expenses
  const rpAggr = await ResourcePersonExpense.aggregate([
    { $match: rpMatch },
    {
      $group: {
        _id: { $dateToString: { format: '%Y-%m', date: '$paymentDate' } },
        expense: { $sum: '$amount' }
      }
    }
  ]);

  // Aggregate Other expenses
  const otherAggr = await CourseOtherExpense.aggregate([
    { $match: otherMatch },
    {
      $group: {
        _id: { $dateToString: { format: '%Y-%m', date: '$date' } },
        expense: { $sum: '$amount' }
      }
    }
  ]);

  // Combine into a month map
  const monthMap = {};
  
  // Initialize last N months with zero
  const current = new Date(startDate);
  const now = new Date();
  while (current <= now) {
    const mStr = `${current.getFullYear()}-${String(current.getMonth() + 1).padStart(2, '0')}`;
    monthMap[mStr] = { month: mStr, revenue: 0, expenses: 0, profit: 0, refunds: 0 };
    current.setMonth(current.getMonth() + 1);
  }

  revenueAggr.forEach(r => { if (monthMap[r._id]) monthMap[r._id].revenue += r.revenue; });
  refundsAggr.forEach(r => { if (monthMap[r._id]) monthMap[r._id].refunds += r.refund; });
  rpAggr.forEach(e => { if (monthMap[e._id]) monthMap[e._id].expenses += e.expense; });
  otherAggr.forEach(e => { if (monthMap[e._id]) monthMap[e._id].expenses += e.expense; });

  // Calculate net profit
  Object.values(monthMap).forEach(m => {
    m.revenue = safeMoney(m.revenue);
    m.expenses = safeMoney(m.expenses);
    m.refunds = safeMoney(m.refunds);
    m.profit = safeMoney(m.revenue - m.refunds - m.expenses);
  });

  return Object.values(monthMap).sort((a, b) => a.month.localeCompare(b.month));
};

/**
 * Get payment distribution
 */
export const getPaymentDistribution = async (courseId = null, courseType = null) => {
  let match = { status: { $in: ['active', 'completed'] } };
  
  if (courseId && courseType) {
    match = { ...match, ...getCourseMatch(courseId, courseType) };
  }

  const distribution = await Enrollment.aggregate([
    { $match: match },
    { $group: { _id: '$enrollmentType', count: { $sum: 1 } } }
  ]);

  const result = { paid: 0, free: 0, admin: 0, auto: 0, total: 0 };
  
  distribution.forEach(d => {
    const type = d._id || 'unknown';
    if (result[type] !== undefined) {
      result[type] = d.count;
      result.total += d.count;
    }
  });

  return result;
};
