import express from 'express';
import { protect, authorize } from '../middleware/auth.js';
import { upload, cloudinary } from '../config/cloudinary.js';
import PDFDocument from 'pdfkit';
import Course from '../models/Course.js';
import LiveCourse from '../models/LiveCourse.js';
import ResourcePersonExpense from '../models/ResourcePersonExpense.js';
import CourseOtherExpense from '../models/CourseOtherExpense.js';
import ExpenseAuditLog from '../models/ExpenseAuditLog.js';
import RefundRecord from '../models/RefundRecord.js';
import Enrollment from '../models/Enrollment.js';

import {
  getCourseFinancialSummary,
  getAllCoursesFinancialSummary,
  getPlatformFinancialSummary,
  getCourseRevenueTrend,
  getCourseExpenseBreakdown,
  getPaymentDistribution
} from '../utils/financialEngine.js';

const router = express.Router();

// Helper to create audit log
const createAuditLog = async (expenseType, expenseId, action, changes, performedBy) => {
  await ExpenseAuditLog.create({
    expenseType,
    expenseId,
    action,
    changes,
    performedBy
  });
};

// ─── Financial Summary Endpoints ──────────────────────────────────────────────────

router.get('/financial/courses-summary', protect, authorize('admin'), async (req, res) => {
  try {
    const data = await getAllCoursesFinancialSummary();
    res.json({ success: true, data });
  } catch (error) {
    console.error('courses-summary error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

router.get('/financial/course/:courseType/:courseId', protect, authorize('admin'), async (req, res) => {
  try {
    const { courseType, courseId } = req.params;
    const data = await getCourseFinancialSummary(courseId, courseType);
    res.json({ success: true, data });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

router.get('/financial/platform-summary', protect, authorize('admin'), async (req, res) => {
  try {
    const data = await getPlatformFinancialSummary();
    res.json({ success: true, data });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

router.get('/financial/revenue-trend', protect, authorize('admin'), async (req, res) => {
  try {
    const { courseId, courseType, months } = req.query;
    const m = months ? parseInt(months) : 12;
    const data = await getCourseRevenueTrend(courseId, courseType, m);
    res.json({ success: true, data });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

router.get('/financial/expense-breakdown', protect, authorize('admin'), async (req, res) => {
  try {
    const { courseId, courseType } = req.query;
    const data = await getCourseExpenseBreakdown(courseId, courseType);
    res.json({ success: true, data });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

router.get('/financial/payment-distribution', protect, authorize('admin'), async (req, res) => {
  try {
    const { courseId, courseType } = req.query;
    const data = await getPaymentDistribution(courseId, courseType);
    res.json({ success: true, data });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});


// ─── Resource Person Expenses ─────────────────────────────────────────────────────

router.get('/expenses/resource-person', protect, authorize('admin'), async (req, res) => {
  try {
    const { courseId, courseType, status, from, to } = req.query;
    const match = {};
    if (courseId) {
      if (courseType === 'live') match.liveCourse = courseId;
      else match.course = courseId;
    }
    if (status) match.status = status;
    if (from || to) {
      match.paymentDate = {};
      if (from) match.paymentDate.$gte = new Date(from);
      if (to) match.paymentDate.$lte = new Date(to);
    }

    const expenses = await ResourcePersonExpense.find(match)
      .populate('course', 'title')
      .populate('liveCourse', 'title')
      .sort('-paymentDate');
      
    res.json({ success: true, data: expenses });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

router.post('/expenses/resource-person', protect, authorize('admin'), async (req, res) => {
  try {
    const { courseId, courseType, resourcePersonName, amount, paymentDate, paymentMethod, status, notes } = req.body;
    
    // Check duplicates within 1 minute
    const oneMinAgo = new Date(Date.now() - 60000);
    const dupMatch = {
      resourcePersonName,
      amount,
      createdAt: { $gte: oneMinAgo }
    };
    if (courseType === 'live') dupMatch.liveCourse = courseId;
    else dupMatch.course = courseId;
    
    const existing = await ResourcePersonExpense.findOne(dupMatch);
    if (existing) {
      return res.status(400).json({ success: false, message: 'Duplicate expense detected.' });
    }

    const newExpense = new ResourcePersonExpense({
      course: courseType === 'self-paced' ? courseId : undefined,
      liveCourse: courseType === 'live' ? courseId : undefined,
      courseType,
      resourcePersonName,
      amount,
      paymentDate,
      paymentMethod,
      status,
      notes,
      createdBy: req.user._id
    });

    await newExpense.save();
    await createAuditLog('resource_person', newExpense._id, 'created', { new: newExpense.toObject() }, req.user._id);

    res.status(201).json({ success: true, data: newExpense });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
});

router.put('/expenses/resource-person/:id', protect, authorize('admin'), async (req, res) => {
  try {
    const expense = await ResourcePersonExpense.findById(req.params.id);
    if (!expense) return res.status(404).json({ success: false, message: 'Expense not found' });

    const oldData = expense.toObject();
    const updates = ['resourcePersonName', 'amount', 'paymentDate', 'paymentMethod', 'status', 'notes'];
    
    let isChanged = false;
    const changes = {};

    updates.forEach(key => {
      if (req.body[key] !== undefined && req.body[key] !== expense[key]) {
        changes[key] = { old: expense[key], new: req.body[key] };
        expense[key] = req.body[key];
        isChanged = true;
      }
    });

    if (isChanged) {
      await expense.save();
      await createAuditLog('resource_person', expense._id, 'updated', changes, req.user._id);
    }

    res.json({ success: true, data: expense });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
});

router.delete('/expenses/resource-person/:id', protect, authorize('admin'), async (req, res) => {
  try {
    const expense = await ResourcePersonExpense.findById(req.params.id);
    if (!expense) return res.status(404).json({ success: false, message: 'Expense not found' });

    await createAuditLog('resource_person', expense._id, 'deleted', { old: expense.toObject() }, req.user._id);
    await expense.deleteOne();

    res.json({ success: true, message: 'Expense deleted' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});


// ─── Other Expenses ───────────────────────────────────────────────────────────────

router.get('/expenses/other', protect, authorize('admin'), async (req, res) => {
  try {
    const { courseId, courseType, category, from, to } = req.query;
    const match = {};
    if (courseId) {
      if (courseType === 'live') match.liveCourse = courseId;
      else match.course = courseId;
    }
    if (category) match.category = category;
    if (from || to) {
      match.date = {};
      if (from) match.date.$gte = new Date(from);
      if (to) match.date.$lte = new Date(to);
    }

    const expenses = await CourseOtherExpense.find(match)
      .populate('course', 'title')
      .populate('liveCourse', 'title')
      .sort('-date');
      
    res.json({ success: true, data: expenses });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

router.post('/expenses/other', protect, authorize('admin'), upload.single('receipt'), async (req, res) => {
  try {
    const { courseId, courseType, title, category, amount, date, notes } = req.body;
    
    const newExpense = new CourseOtherExpense({
      course: courseType === 'self-paced' ? courseId : undefined,
      liveCourse: courseType === 'live' ? courseId : undefined,
      courseType,
      title,
      category,
      amount: Number(amount),
      date,
      notes,
      createdBy: req.user._id
    });

    if (req.file) {
      newExpense.receiptUrl = req.file.path;
      newExpense.receiptPublicId = req.file.filename;
    }

    await newExpense.save();
    await createAuditLog('other', newExpense._id, 'created', { new: newExpense.toObject() }, req.user._id);

    res.status(201).json({ success: true, data: newExpense });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
});

router.put('/expenses/other/:id', protect, authorize('admin'), upload.single('receipt'), async (req, res) => {
  try {
    const expense = await CourseOtherExpense.findById(req.params.id);
    if (!expense) return res.status(404).json({ success: false, message: 'Expense not found' });

    const changes = {};
    const updates = ['title', 'category', 'amount', 'date', 'notes'];
    
    updates.forEach(key => {
      if (req.body[key] !== undefined && req.body[key] !== expense[key]) {
        let val = req.body[key];
        if (key === 'amount') val = Number(val);
        changes[key] = { old: expense[key], new: val };
        expense[key] = val;
      }
    });

    if (req.file) {
      if (expense.receiptPublicId) {
        await cloudinary.uploader.destroy(expense.receiptPublicId);
      }
      changes.receiptUrl = { old: expense.receiptUrl, new: req.file.path };
      expense.receiptUrl = req.file.path;
      expense.receiptPublicId = req.file.filename;
    }

    await expense.save();
    if (Object.keys(changes).length > 0) {
      await createAuditLog('other', expense._id, 'updated', changes, req.user._id);
    }

    res.json({ success: true, data: expense });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
});

router.delete('/expenses/other/:id', protect, authorize('admin'), async (req, res) => {
  try {
    const expense = await CourseOtherExpense.findById(req.params.id);
    if (!expense) return res.status(404).json({ success: false, message: 'Expense not found' });

    if (expense.receiptPublicId) {
      try {
        await cloudinary.uploader.destroy(expense.receiptPublicId);
      } catch (err) {
        console.error('Failed to delete receipt from cloudinary:', err);
      }
    }

    await createAuditLog('other', expense._id, 'deleted', { old: expense.toObject() }, req.user._id);
    await expense.deleteOne();

    res.json({ success: true, message: 'Expense deleted' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});


// ─── Refunds ──────────────────────────────────────────────────────────────────────

router.post('/refunds', protect, authorize('admin'), async (req, res) => {
  try {
    const { enrollmentId, amount, reason, refundDate } = req.body;
    
    const enrollment = await Enrollment.findById(enrollmentId);
    if (!enrollment) return res.status(404).json({ success: false, message: 'Enrollment not found' });
    if (enrollment.enrollmentType !== 'paid') {
      return res.status(400).json({ success: false, message: 'Cannot refund a non-paid enrollment' });
    }

    const newRefund = new RefundRecord({
      enrollment: enrollment._id,
      course: enrollment.course,
      liveCourse: enrollment.liveCourse,
      courseType: enrollment.liveCourse ? 'live' : 'self-paced',
      amount,
      reason,
      refundDate,
      processedBy: req.user._id
    });

    await newRefund.save();
    res.status(201).json({ success: true, data: newRefund });
  } catch (error) {
    if (error.code === 11000) {
      return res.status(400).json({ success: false, message: 'A refund has already been processed for this enrollment.' });
    }
    res.status(400).json({ success: false, message: error.message });
  }
});

router.get('/refunds', protect, authorize('admin'), async (req, res) => {
  try {
    const { courseId, courseType, from, to } = req.query;
    const match = {};
    if (courseId) {
      if (courseType === 'live') match.liveCourse = courseId;
      else match.course = courseId;
    }
    if (from || to) {
      match.refundDate = {};
      if (from) match.refundDate.$gte = new Date(from);
      if (to) match.refundDate.$lte = new Date(to);
    }

    const refunds = await RefundRecord.find(match)
      .populate('enrollment', 'paymentId amount status fullName email user')
      .populate('course', 'title')
      .populate('liveCourse', 'title')
      .sort('-refundDate');
      
    res.json({ success: true, data: refunds });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});


// ─── Audit Logs ───────────────────────────────────────────────────────────────────

router.get('/expenses/audit-log', protect, authorize('admin'), async (req, res) => {
  try {
    const { expenseId } = req.query;
    const match = expenseId ? { expenseId } : {};

    const logs = await ExpenseAuditLog.find(match)
      .populate('performedBy', 'name email')
      .sort('-performedAt')
      .limit(100);
      
    res.json({ success: true, data: logs });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});


// ─── Exports ──────────────────────────────────────────────────────────────────────

const generateCSV = (headers, rows) => {
  const escape = (val) => `"${String(val ?? '').replace(/"/g, '""')}"`;
  const headerLine = headers.map(h => escape(h.label)).join(',');
  const dataLines = rows.map(row => headers.map(h => escape(row[h.key])).join(','));
  return [headerLine, ...dataLines].join('\n');
};

router.get('/financial/export/csv', protect, authorize('admin'), async (req, res) => {
  try {
    const { type } = req.query;
    let headers = [];
    let rows = [];
    let filename = '';

    if (type === 'courses-summary') {
      const data = await getAllCoursesFinancialSummary();
      headers = [
        { label: 'Course Name', key: 'courseName' },
        { label: 'Type', key: 'courseType' },
        { label: 'Total Enrollments', key: 'totalEnrollments' },
        { label: 'Paid', key: 'paidEnrollments' },
        { label: 'Free', key: 'freeEnrollments' },
        { label: 'Gross Revenue (INR)', key: 'grossRevenue' },
        { label: 'Discounts', key: 'totalDiscounts' },
        { label: 'Refunds', key: 'totalRefunded' },
        { label: 'Net Revenue', key: 'netRevenue' },
        { label: 'RP Expenses', key: 'resourcePersonExpense' },
        { label: 'Other Expenses', key: 'otherExpenses' },
        { label: 'Final Profit', key: 'finalProfit' },
        { label: 'Margin %', key: 'profitMarginPercent' }
      ];
      rows = data;
      filename = 'Financial_Summary.csv';
    } 
    // Add other types if needed

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.send(generateCSV(headers, rows));
  } catch (error) {
    res.status(500).send('Export failed');
  }
});

router.get('/financial/export/pdf', protect, authorize('admin'), async (req, res) => {
  try {
    const { type } = req.query;
    if (type !== 'courses-summary') {
      return res.status(400).send('Unsupported PDF export type');
    }

    const data = await getAllCoursesFinancialSummary();
    const totals = await getPlatformFinancialSummary();

    const doc = new PDFDocument({ margin: 30, size: 'A4' });
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', 'attachment; filename="Financial_Report.pdf"');
    doc.pipe(res);

    doc.fontSize(20).text('Financial Summary Report', { align: 'center' });
    doc.moveDown();
    doc.fontSize(12).text(`Generated on: ${new Date().toLocaleString()}`, { align: 'center' });
    doc.moveDown(2);

    doc.fontSize(14).text('Platform Totals', { underline: true });
    doc.moveDown(0.5);
    doc.fontSize(12);
    doc.text(`Gross Revenue: INR ${totals.totalGrossRevenue}`);
    doc.text(`Net Revenue: INR ${totals.totalNetRevenue}`);
    doc.text(`Total Expenses: INR ${totals.totalExpenses}`);
    doc.text(`Final Profit: INR ${totals.totalProfit}`);
    doc.text(`Average Margin: ${totals.avgProfitMargin}%`);
    doc.moveDown(2);

    data.forEach(course => {
      doc.fontSize(12).font('Helvetica-Bold').text(course.courseName);
      doc.font('Helvetica').fontSize(10);
      doc.text(`Type: ${course.courseType.toUpperCase()} | Enrollments: ${course.totalEnrollments}`);
      doc.text(`Gross: INR ${course.grossRevenue} | Expenses: INR ${course.totalExpenses} | Profit: INR ${course.finalProfit}`);
      doc.moveDown();
    });

    doc.end();
  } catch (error) {
    res.status(500).send('PDF Export failed');
  }
});

export default router;
