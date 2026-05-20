import mongoose from 'mongoose';
import Enrollment from '../models/Enrollment.js';
import Course from '../models/Course.js';
import LiveCourse from '../models/LiveCourse.js';
import ResourcePersonExpense from '../models/ResourcePersonExpense.js';
import CourseOtherExpense from '../models/CourseOtherExpense.js';
import RefundRecord from '../models/RefundRecord.js';

/**
 * Safely round a float to 2 decimal places to prevent floating point drift.
 */
const safeMoney = (val) => Number.parseFloat(Number(val || 0).toFixed(2));

/**
 * Build a Mongoose match object for a specific course reference.
 */
const getCourseMatch = (courseId, courseType) => {
  if (courseType === 'live') {
    return { liveCourse: new mongoose.Types.ObjectId(courseId) };
  }
  return { course: new mongoose.Types.ObjectId(courseId) };
};

/**
 * Compute the complete financial summary for a single course.
 * All arithmetic is done server-side; never trust the client to compute these.
 *
 * Formula:
 *   Gross Revenue   = sum(amount)  for paid enrollments (actual cash received)
 *   Discount Total  = sum(discountAmount) for paid enrollments (informational)
 *   Refund Total    = sum(refunds)
 *   Net Revenue     = Gross Revenue − Refund Total
 *   RP Expense      = sum(amount) for PAID resource-person expenses
 *   Other Expenses  = sum(amount) for all other-course expenses
 *   Total Expenses  = RP Expense + Other Expenses
 *   Final Profit    = Net Revenue − Total Expenses
 *   Profit Margin % = (Final Profit / Gross Revenue) × 100
 */
export const getCourseFinancialSummary = async (courseId, courseType) => {
  if (!courseId || !courseType) {
    throw new Error('Course ID and Course Type are required');
  }

  const courseMatch = getCourseMatch(courseId, courseType);

  // Load course metadata + all aggregations in parallel
  const [
    courseDetails,
    enrollmentsAggr,
    refundsAggr,
    rpExpenseAggr,
    rpPendingAggr,
    otherExpenseAggr,
    lastPaymentAggr,
  ] = await Promise.all([
    courseType === 'live'
      ? LiveCourse.findById(courseId).select('title status price').lean()
      : Course.findById(courseId).select('title status price').lean(),

    Enrollment.aggregate([
      { $match: { ...courseMatch, status: { $in: ['active', 'completed'] } } },
      {
        $group: {
          _id: null,
          totalEnrollments: { $sum: 1 },
          paidEnrollments:  { $sum: { $cond: [{ $eq: ['$enrollmentType', 'paid'] },  1, 0] } },
          freeEnrollments:  { $sum: { $cond: [{ $eq: ['$enrollmentType', 'free'] },  1, 0] } },
          adminEnrollments: { $sum: { $cond: [{ $eq: ['$enrollmentType', 'admin'] }, 1, 0] } },
          autoEnrollments:  { $sum: { $cond: [{ $eq: ['$enrollmentType', 'auto'] },  1, 0] } },
          grossRevenue:     { $sum: { $cond: [{ $eq: ['$enrollmentType', 'paid'] }, '$amount',         0] } },
          totalDiscounts:   { $sum: { $cond: [{ $eq: ['$enrollmentType', 'paid'] }, '$discountAmount', 0] } },
        },
      },
    ]),

    RefundRecord.aggregate([
      { $match: courseMatch },
      { $group: { _id: null, totalRefunded: { $sum: '$amount' } } },
    ]),

    // Only PAID resource-person expenses count as realised costs
    ResourcePersonExpense.aggregate([
      { $match: { ...courseMatch, status: 'paid' } },
      { $group: { _id: null, total: { $sum: '$amount' } } },
    ]),

    // Pending resource-person expenses (committed but not yet disbursed)
    ResourcePersonExpense.aggregate([
      { $match: { ...courseMatch, status: 'pending' } },
      { $group: { _id: null, total: { $sum: '$amount' } } },
    ]),

    CourseOtherExpense.aggregate([
      { $match: courseMatch },
      { $group: { _id: null, total: { $sum: '$amount' } } },
    ]),

    Enrollment.aggregate([
      { $match: { ...courseMatch, enrollmentType: 'paid', status: { $in: ['active', 'completed'] } } },
      { $group: { _id: null, lastPaymentDate: { $max: '$createdAt' } } },
    ]),
  ]);

  if (!courseDetails) {
    throw new Error('Course not found');
  }

  const es = enrollmentsAggr[0] || {
    totalEnrollments: 0, paidEnrollments: 0, freeEnrollments: 0,
    adminEnrollments: 0, autoEnrollments: 0,
    grossRevenue: 0, totalDiscounts: 0,
  };

  const grossRevenue        = safeMoney(es.grossRevenue);
  const totalDiscounts      = safeMoney(es.totalDiscounts);
  const totalRefunded       = safeMoney(refundsAggr[0]?.totalRefunded || 0);
  const netRevenue          = safeMoney(grossRevenue - totalRefunded);
  const resourcePersonExpense = safeMoney(rpExpenseAggr[0]?.total  || 0);
  const pendingRPExpense    = safeMoney(rpPendingAggr[0]?.total  || 0);
  const otherExpenses       = safeMoney(otherExpenseAggr[0]?.total || 0);
  const totalExpenses       = safeMoney(resourcePersonExpense + otherExpenses);
  const finalProfit         = safeMoney(netRevenue - totalExpenses);
  const profitMarginPercent = grossRevenue > 0
    ? safeMoney((finalProfit / grossRevenue) * 100)
    : 0;

  return {
    courseId:               String(courseId),
    courseName:             courseDetails.title,
    courseType,
    courseStatus:           courseDetails.status,
    coursePrice:            courseDetails.price || 0,
    totalEnrollments:       es.totalEnrollments,
    paidEnrollments:        es.paidEnrollments,
    freeEnrollments:        es.freeEnrollments,
    adminEnrollments:       es.adminEnrollments,
    autoEnrollments:        es.autoEnrollments,
    grossRevenue,
    totalDiscounts,
    totalRefunded,
    netRevenue,
    resourcePersonExpense,
    pendingRPExpense,
    otherExpenses,
    totalExpenses,
    finalProfit,
    profitMarginPercent,
    lastPaymentDate:        lastPaymentAggr[0]?.lastPaymentDate || null,
  };
};

/**
 * Get financial summaries for ALL courses (self-paced + live) in parallel.
 * Uses Promise.allSettled so a single bad course never blocks the whole response.
 */
export const getAllCoursesFinancialSummary = async () => {
  const [courses, liveCourses] = await Promise.all([
    Course.find().select('_id').lean(),
    LiveCourse.find().select('_id').lean(),
  ]);

  const tasks = [
    ...courses.map((c)  => getCourseFinancialSummary(c._id, 'self-paced')),
    ...liveCourses.map((c) => getCourseFinancialSummary(c._id, 'live')),
  ];

  const results = await Promise.allSettled(tasks);

  return results
    .filter((r) => r.status === 'fulfilled')
    .map((r) => r.value);
};

/**
 * Platform-wide totals derived from all course summaries.
 */
export const getPlatformFinancialSummary = async () => {
  const all = await getAllCoursesFinancialSummary();

  const totals = all.reduce(
    (acc, s) => {
      acc.totalGrossRevenue += s.grossRevenue;
      acc.totalNetRevenue   += s.netRevenue;
      acc.totalExpenses     += s.totalExpenses;
      acc.totalProfit       += s.finalProfit;
      acc.totalRefunds      += s.totalRefunded;
      acc.totalDiscounts    += s.totalDiscounts;
      acc.pendingRPExpense  += s.pendingRPExpense;
      return acc;
    },
    {
      totalGrossRevenue: 0,
      totalNetRevenue:   0,
      totalExpenses:     0,
      totalProfit:       0,
      totalRefunds:      0,
      totalDiscounts:    0,
      pendingRPExpense:  0,
    }
  );

  const avgProfitMargin = totals.totalGrossRevenue > 0
    ? safeMoney((totals.totalProfit / totals.totalGrossRevenue) * 100)
    : 0;

  return {
    totalGrossRevenue: safeMoney(totals.totalGrossRevenue),
    totalNetRevenue:   safeMoney(totals.totalNetRevenue),
    totalExpenses:     safeMoney(totals.totalExpenses),
    totalProfit:       safeMoney(totals.totalProfit),
    totalRefunds:      safeMoney(totals.totalRefunds),
    totalDiscounts:    safeMoney(totals.totalDiscounts),
    pendingRPExpense:  safeMoney(totals.pendingRPExpense),
    courseCount:       all.length,
    avgProfitMargin,
  };
};

/**
 * Revenue + expense + profit trend by month (last N months).
 */
export const getCourseRevenueTrend = async (courseId = null, courseType = null, months = 12) => {
  const startDate = new Date();
  startDate.setMonth(startDate.getMonth() - (months - 1));
  startDate.setDate(1);
  startDate.setHours(0, 0, 0, 0);

  let enrollMatch  = { status: { $in: ['active', 'completed'] }, enrollmentType: 'paid', createdAt: { $gte: startDate } };
  let rpMatch      = { status: 'paid', paymentDate: { $gte: startDate } };
  let otherMatch   = { date: { $gte: startDate } };
  let refundMatch  = { refundDate: { $gte: startDate } };

  if (courseId && courseType) {
    const cm = getCourseMatch(courseId, courseType);
    enrollMatch  = { ...enrollMatch,  ...cm };
    rpMatch      = { ...rpMatch,      ...cm };
    otherMatch   = { ...otherMatch,   ...cm };
    refundMatch  = { ...refundMatch,  ...cm };
  }

  const FMT = '%Y-%m';

  const [revenueAggr, refundsAggr, rpAggr, otherAggr] = await Promise.all([
    Enrollment.aggregate([
      { $match: enrollMatch },
      { $group: { _id: { $dateToString: { format: FMT, date: '$createdAt' } }, revenue: { $sum: '$amount' } } },
    ]),
    RefundRecord.aggregate([
      { $match: refundMatch },
      { $group: { _id: { $dateToString: { format: FMT, date: '$refundDate' } }, refund: { $sum: '$amount' } } },
    ]),
    ResourcePersonExpense.aggregate([
      { $match: rpMatch },
      { $group: { _id: { $dateToString: { format: FMT, date: '$paymentDate' } }, expense: { $sum: '$amount' } } },
    ]),
    CourseOtherExpense.aggregate([
      { $match: otherMatch },
      { $group: { _id: { $dateToString: { format: FMT, date: '$date' } }, expense: { $sum: '$amount' } } },
    ]),
  ]);

  // Seed all months with zeros
  const monthMap = {};
  const cursor = new Date(startDate);
  const now    = new Date();
  while (cursor <= now) {
    const key = `${cursor.getFullYear()}-${String(cursor.getMonth() + 1).padStart(2, '0')}`;
    monthMap[key] = { month: key, revenue: 0, expenses: 0, profit: 0, refunds: 0 };
    cursor.setMonth(cursor.getMonth() + 1);
  }

  revenueAggr.forEach((r) => { if (monthMap[r._id]) monthMap[r._id].revenue  += r.revenue;  });
  refundsAggr.forEach((r) => { if (monthMap[r._id]) monthMap[r._id].refunds  += r.refund;   });
  rpAggr.forEach((e)      => { if (monthMap[e._id]) monthMap[e._id].expenses += e.expense;  });
  otherAggr.forEach((e)   => { if (monthMap[e._id]) monthMap[e._id].expenses += e.expense;  });

  return Object.values(monthMap)
    .sort((a, b) => a.month.localeCompare(b.month))
    .map((m) => ({
      ...m,
      revenue:  safeMoney(m.revenue),
      expenses: safeMoney(m.expenses),
      refunds:  safeMoney(m.refunds),
      profit:   safeMoney(m.revenue - m.refunds - m.expenses),
    }));
};

/**
 * Expense category breakdown (RP + named categories).
 */
export const getCourseExpenseBreakdown = async (courseId = null, courseType = null) => {
  let rpMatch    = { status: 'paid' };
  let otherMatch = {};

  if (courseId && courseType) {
    const cm = getCourseMatch(courseId, courseType);
    rpMatch    = { ...rpMatch,    ...cm };
    otherMatch = { ...otherMatch, ...cm };
  }

  const [rpAggr, otherAggr] = await Promise.all([
    ResourcePersonExpense.aggregate([
      { $match: rpMatch },
      { $group: { _id: null, total: { $sum: '$amount' } } },
    ]),
    CourseOtherExpense.aggregate([
      { $match: otherMatch },
      { $group: { _id: '$category', total: { $sum: '$amount' } } },
    ]),
  ]);

  const resourcePersonTotal = safeMoney(rpAggr[0]?.total || 0);
  const categories = {};
  let otherTotal = 0;
  otherAggr.forEach((cat) => {
    const amt = safeMoney(cat.total);
    categories[cat._id] = amt;
    otherTotal += amt;
  });

  return {
    resourcePersonTotal,
    categories,
    totalExpenses: safeMoney(resourcePersonTotal + otherTotal),
  };
};

/**
 * Enrollment type distribution across the platform or for a single course.
 */
export const getPaymentDistribution = async (courseId = null, courseType = null) => {
  let match = { status: { $in: ['active', 'completed'] } };
  if (courseId && courseType) {
    match = { ...match, ...getCourseMatch(courseId, courseType) };
  }

  const distribution = await Enrollment.aggregate([
    { $match: match },
    { $group: { _id: '$enrollmentType', count: { $sum: 1 } } },
  ]);

  const result = { paid: 0, free: 0, admin: 0, auto: 0, total: 0 };
  distribution.forEach((d) => {
    const type = d._id || 'admin';
    if (result[type] !== undefined) {
      result[type]  = d.count;
      result.total += d.count;
    }
  });

  return result;
};
