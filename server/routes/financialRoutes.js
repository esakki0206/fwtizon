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
  getPaymentDistribution,
} from '../utils/financialEngine.js';

const router = express.Router();

// ─── Audit log helper ─────────────────────────────────────────────────────────
const createAuditLog = async (expenseType, expenseId, action, changes, performedBy) => {
  try {
    await ExpenseAuditLog.create({ expenseType, expenseId, action, changes, performedBy });
  } catch (err) {
    console.error('Audit log creation failed (non-fatal):', err.message);
  }
};

// ─── Courses list (lightweight — for expense form dropdowns) ─────────────────

router.get('/financial/courses-list', protect, authorize('admin'), async (req, res) => {
  try {
    const [courses, liveCourses] = await Promise.all([
      Course.find().select('_id title status').sort('title').lean(),
      LiveCourse.find().select('_id title status').sort('title').lean(),
    ]);
    const data = [
      ...courses.map((c)  => ({ _id: c._id, title: c.title, status: c.status, courseType: 'self-paced' })),
      ...liveCourses.map((c) => ({ _id: c._id, title: c.title, status: c.status, courseType: 'live' })),
    ];
    res.json({ success: true, data });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// ─── Financial Summary Endpoints ─────────────────────────────────────────────

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
    const m = months ? parseInt(months, 10) : 12;
    const data = await getCourseRevenueTrend(courseId || null, courseType || null, m);
    res.json({ success: true, data });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

router.get('/financial/expense-breakdown', protect, authorize('admin'), async (req, res) => {
  try {
    const { courseId, courseType } = req.query;
    const data = await getCourseExpenseBreakdown(courseId || null, courseType || null);
    res.json({ success: true, data });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

router.get('/financial/payment-distribution', protect, authorize('admin'), async (req, res) => {
  try {
    const { courseId, courseType } = req.query;
    const data = await getPaymentDistribution(courseId || null, courseType || null);
    res.json({ success: true, data });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// ─── Resource Person Expenses ─────────────────────────────────────────────────

router.get('/expenses/resource-person', protect, authorize('admin'), async (req, res) => {
  try {
    const { courseId, courseType, status, from, to, page = 1, limit = 50 } = req.query;
    const match = {};
    if (courseId) {
      match[courseType === 'live' ? 'liveCourse' : 'course'] = courseId;
    }
    if (status) match.status = status;
    if (from || to) {
      match.paymentDate = {};
      if (from) match.paymentDate.$gte = new Date(from);
      if (to)   match.paymentDate.$lte = new Date(to);
    }

    const skip  = (parseInt(page, 10) - 1) * parseInt(limit, 10);
    const [expenses, total] = await Promise.all([
      ResourcePersonExpense.find(match)
        .populate('course',     'title')
        .populate('liveCourse', 'title')
        .populate('createdBy',  'name')
        .sort('-paymentDate')
        .skip(skip)
        .limit(parseInt(limit, 10)),
      ResourcePersonExpense.countDocuments(match),
    ]);

    res.json({ success: true, data: expenses, total, page: parseInt(page, 10) });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

router.post('/expenses/resource-person', protect, authorize('admin'), async (req, res) => {
  try {
    const { courseId, courseType, resourcePersonName, amount, paymentDate, paymentMethod, status, notes } = req.body;

    if (!courseId)            return res.status(400).json({ success: false, message: 'Course is required' });
    if (!resourcePersonName?.trim()) return res.status(400).json({ success: false, message: 'Resource person name is required' });
    if (!amount || Number(amount) < 0) return res.status(400).json({ success: false, message: 'Valid amount is required' });
    if (!paymentDate)         return res.status(400).json({ success: false, message: 'Payment date is required' });

    // Duplicate guard: same person + same course + same amount within 60 seconds
    const oneMinAgo  = new Date(Date.now() - 60_000);
    const dupMatch   = { resourcePersonName, amount: Number(amount), createdAt: { $gte: oneMinAgo } };
    dupMatch[courseType === 'live' ? 'liveCourse' : 'course'] = courseId;
    const existing = await ResourcePersonExpense.findOne(dupMatch);
    if (existing) {
      return res.status(400).json({ success: false, message: 'Duplicate expense detected. Please wait a moment before retrying.' });
    }

    const expense = await ResourcePersonExpense.create({
      course:             courseType === 'self-paced' ? courseId : undefined,
      liveCourse:         courseType === 'live'       ? courseId : undefined,
      courseType,
      resourcePersonName: resourcePersonName.trim(),
      amount:             Number(amount),
      paymentDate,
      paymentMethod:      paymentMethod?.trim() || '',
      status:             status || 'pending',
      notes:              notes?.trim() || '',
      createdBy:          req.user._id,
    });

    await createAuditLog('resource_person', expense._id, 'created', { new: expense.toObject() }, req.user._id);
    res.status(201).json({ success: true, data: expense });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
});

router.put('/expenses/resource-person/:id', protect, authorize('admin'), async (req, res) => {
  try {
    const expense = await ResourcePersonExpense.findById(req.params.id);
    if (!expense) return res.status(404).json({ success: false, message: 'Expense not found' });

    const updatable = ['resourcePersonName', 'amount', 'paymentDate', 'paymentMethod', 'status', 'notes'];
    const changes   = {};
    let   dirty     = false;

    updatable.forEach((key) => {
      if (req.body[key] !== undefined) {
        const val = key === 'amount' ? Number(req.body[key]) : req.body[key];
        if (String(val) !== String(expense[key])) {
          changes[key]  = { old: expense[key], new: val };
          expense[key]  = val;
          dirty         = true;
        }
      }
    });

    if (dirty) {
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

// ─── Other Expenses ───────────────────────────────────────────────────────────

router.get('/expenses/other', protect, authorize('admin'), async (req, res) => {
  try {
    const { courseId, courseType, category, from, to, page = 1, limit = 50 } = req.query;
    const match = {};
    if (courseId) {
      match[courseType === 'live' ? 'liveCourse' : 'course'] = courseId;
    }
    if (category) match.category = category;
    if (from || to) {
      match.date = {};
      if (from) match.date.$gte = new Date(from);
      if (to)   match.date.$lte = new Date(to);
    }

    const skip  = (parseInt(page, 10) - 1) * parseInt(limit, 10);
    const [expenses, total] = await Promise.all([
      CourseOtherExpense.find(match)
        .populate('course',     'title')
        .populate('liveCourse', 'title')
        .populate('createdBy',  'name')
        .sort('-date')
        .skip(skip)
        .limit(parseInt(limit, 10)),
      CourseOtherExpense.countDocuments(match),
    ]);

    res.json({ success: true, data: expenses, total, page: parseInt(page, 10) });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

router.post('/expenses/other', protect, authorize('admin'), upload.single('receipt'), async (req, res) => {
  try {
    const { courseId, courseType, title, category, amount, date, notes } = req.body;

    if (!courseId)       return res.status(400).json({ success: false, message: 'Course is required' });
    if (!title?.trim())  return res.status(400).json({ success: false, message: 'Expense title is required' });
    if (!category)       return res.status(400).json({ success: false, message: 'Expense category is required' });
    if (!amount || Number(amount) < 0) return res.status(400).json({ success: false, message: 'Valid amount is required' });
    if (!date)           return res.status(400).json({ success: false, message: 'Date is required' });

    const expense = new CourseOtherExpense({
      course:     courseType === 'self-paced' ? courseId : undefined,
      liveCourse: courseType === 'live'       ? courseId : undefined,
      courseType,
      title:      title.trim(),
      category,
      amount:     Number(amount),
      date,
      notes:      notes?.trim() || '',
      createdBy:  req.user._id,
    });

    if (req.file) {
      expense.receiptUrl      = req.file.path;
      expense.receiptPublicId = req.file.filename;
    }

    await expense.save();
    await createAuditLog('other', expense._id, 'created', { new: expense.toObject() }, req.user._id);
    res.status(201).json({ success: true, data: expense });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
});

router.put('/expenses/other/:id', protect, authorize('admin'), upload.single('receipt'), async (req, res) => {
  try {
    const expense = await CourseOtherExpense.findById(req.params.id);
    if (!expense) return res.status(404).json({ success: false, message: 'Expense not found' });

    const updatable = ['title', 'category', 'amount', 'date', 'notes'];
    const changes   = {};

    updatable.forEach((key) => {
      if (req.body[key] !== undefined) {
        let val = key === 'amount' ? Number(req.body[key]) : req.body[key];
        if (String(val) !== String(expense[key])) {
          changes[key] = { old: expense[key], new: val };
          expense[key] = val;
        }
      }
    });

    if (req.file) {
      if (expense.receiptPublicId) {
        try { await cloudinary.uploader.destroy(expense.receiptPublicId); } catch (_) { /* non-fatal */ }
      }
      changes.receiptUrl       = { old: expense.receiptUrl, new: req.file.path };
      expense.receiptUrl       = req.file.path;
      expense.receiptPublicId  = req.file.filename;
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
      try { await cloudinary.uploader.destroy(expense.receiptPublicId); } catch (_) { /* non-fatal */ }
    }

    await createAuditLog('other', expense._id, 'deleted', { old: expense.toObject() }, req.user._id);
    await expense.deleteOne();
    res.json({ success: true, message: 'Expense deleted' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// ─── Refunds ──────────────────────────────────────────────────────────────────

router.post('/refunds', protect, authorize('admin'), async (req, res) => {
  try {
    const { enrollmentId, amount, reason, refundDate } = req.body;

    if (!enrollmentId) return res.status(400).json({ success: false, message: 'Enrollment ID is required' });
    if (!amount || Number(amount) <= 0) return res.status(400).json({ success: false, message: 'Valid refund amount is required' });
    if (!refundDate) return res.status(400).json({ success: false, message: 'Refund date is required' });

    const enrollment = await Enrollment.findById(enrollmentId);
    if (!enrollment) return res.status(404).json({ success: false, message: 'Enrollment not found' });
    if (enrollment.enrollmentType !== 'paid') {
      return res.status(400).json({ success: false, message: 'Cannot refund a non-paid enrollment' });
    }
    if (Number(amount) > (enrollment.amount || 0)) {
      return res.status(400).json({ success: false, message: 'Refund amount cannot exceed the original payment amount' });
    }

    const refund = await RefundRecord.create({
      enrollment:  enrollment._id,
      course:      enrollment.course,
      liveCourse:  enrollment.liveCourse,
      courseType:  enrollment.liveCourse ? 'live' : 'self-paced',
      amount:      Number(amount),
      reason:      reason?.trim() || '',
      refundDate:  new Date(refundDate),
      processedBy: req.user._id,
    });

    res.status(201).json({ success: true, data: refund });
  } catch (error) {
    if (error.code === 11000) {
      return res.status(400).json({ success: false, message: 'A refund has already been processed for this enrollment.' });
    }
    res.status(400).json({ success: false, message: error.message });
  }
});

router.get('/refunds', protect, authorize('admin'), async (req, res) => {
  try {
    const { courseId, courseType, from, to, page = 1, limit = 50 } = req.query;
    const match = {};
    if (courseId) {
      match[courseType === 'live' ? 'liveCourse' : 'course'] = courseId;
    }
    if (from || to) {
      match.refundDate = {};
      if (from) match.refundDate.$gte = new Date(from);
      if (to)   match.refundDate.$lte = new Date(to);
    }

    const skip  = (parseInt(page, 10) - 1) * parseInt(limit, 10);
    const [refunds, total] = await Promise.all([
      RefundRecord.find(match)
        .populate('enrollment', 'paymentId amount status fullName email user')
        .populate('course',     'title')
        .populate('liveCourse', 'title')
        .populate('processedBy','name')
        .sort('-refundDate')
        .skip(skip)
        .limit(parseInt(limit, 10)),
      RefundRecord.countDocuments(match),
    ]);

    res.json({ success: true, data: refunds, total, page: parseInt(page, 10) });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// ─── Audit Logs ───────────────────────────────────────────────────────────────

router.get('/expenses/audit-log', protect, authorize('admin'), async (req, res) => {
  try {
    const { expenseId, page = 1, limit = 50 } = req.query;
    const match = expenseId ? { expenseId } : {};
    const skip  = (parseInt(page, 10) - 1) * parseInt(limit, 10);

    const [logs, total] = await Promise.all([
      ExpenseAuditLog.find(match)
        .populate('performedBy', 'name email')
        .sort('-performedAt')
        .skip(skip)
        .limit(parseInt(limit, 10)),
      ExpenseAuditLog.countDocuments(match),
    ]);

    res.json({ success: true, data: logs, total, page: parseInt(page, 10) });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// ─── Exports ──────────────────────────────────────────────────────────────────

const escapeCSV = (val) => `"${String(val ?? '').replace(/"/g, '""')}"`;

const generateCSV = (headers, rows) => {
  const headerLine = headers.map((h) => escapeCSV(h.label)).join(',');
  const dataLines  = rows.map((row) => headers.map((h) => escapeCSV(row[h.key])).join(','));
  return [headerLine, ...dataLines].join('\n');
};

router.get('/financial/export/csv', protect, authorize('admin'), async (req, res) => {
  try {
    const { type } = req.query;
    let headers = [], rows = [], filename = 'export.csv';

    if (type === 'courses-summary') {
      const data = await getAllCoursesFinancialSummary();
      headers = [
        { label: 'Course Name',         key: 'courseName'           },
        { label: 'Type',                 key: 'courseType'           },
        { label: 'Total Enrollments',    key: 'totalEnrollments'     },
        { label: 'Paid',                 key: 'paidEnrollments'      },
        { label: 'Free',                 key: 'freeEnrollments'      },
        { label: 'Gross Revenue (INR)',  key: 'grossRevenue'         },
        { label: 'Discounts',            key: 'totalDiscounts'       },
        { label: 'Refunds',              key: 'totalRefunded'        },
        { label: 'Net Revenue',          key: 'netRevenue'           },
        { label: 'RP Expenses',          key: 'resourcePersonExpense'},
        { label: 'Other Expenses',       key: 'otherExpenses'        },
        { label: 'Total Expenses',       key: 'totalExpenses'        },
        { label: 'Final Profit',         key: 'finalProfit'          },
        { label: 'Margin %',             key: 'profitMarginPercent'  },
      ];
      rows     = data;
      filename = 'Financial_Summary.csv';
    } else if (type === 'expenses-rp') {
      const data = (await ResourcePersonExpense.find()
        .populate('course',     'title')
        .populate('liveCourse', 'title')
        .sort('-paymentDate')).map((e) => ({
          name:         e.resourcePersonName,
          course:       e.course?.title || e.liveCourse?.title || '',
          courseType:   e.courseType,
          amount:       e.amount,
          status:       e.status,
          paymentDate:  e.paymentDate ? new Date(e.paymentDate).toLocaleDateString() : '',
          method:       e.paymentMethod || '',
          notes:        e.notes || '',
        }));
      headers = [
        { label: 'Resource Person', key: 'name'        },
        { label: 'Course',          key: 'course'       },
        { label: 'Type',            key: 'courseType'   },
        { label: 'Amount (INR)',    key: 'amount'       },
        { label: 'Status',          key: 'status'       },
        { label: 'Payment Date',    key: 'paymentDate'  },
        { label: 'Method',          key: 'method'       },
        { label: 'Notes',           key: 'notes'        },
      ];
      rows     = data;
      filename = 'RP_Expenses.csv';
    } else if (type === 'expenses-other') {
      const data = (await CourseOtherExpense.find()
        .populate('course',     'title')
        .populate('liveCourse', 'title')
        .sort('-date')).map((e) => ({
          title:      e.title,
          course:     e.course?.title || e.liveCourse?.title || '',
          courseType: e.courseType,
          category:   e.category,
          amount:     e.amount,
          date:       e.date ? new Date(e.date).toLocaleDateString() : '',
          notes:      e.notes || '',
        }));
      headers = [
        { label: 'Title',       key: 'title'      },
        { label: 'Course',      key: 'course'      },
        { label: 'Type',        key: 'courseType'  },
        { label: 'Category',    key: 'category'    },
        { label: 'Amount (INR)',key: 'amount'      },
        { label: 'Date',        key: 'date'        },
        { label: 'Notes',       key: 'notes'       },
      ];
      rows     = data;
      filename = 'Other_Expenses.csv';
    }

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

    const [data, totals] = await Promise.all([
      getAllCoursesFinancialSummary(),
      getPlatformFinancialSummary(),
    ]);

    const doc = new PDFDocument({ margin: 40, size: 'A4' });
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', 'attachment; filename="Financial_Report.pdf"');
    doc.pipe(res);

    // Title
    doc.fontSize(20).font('Helvetica-Bold').text('Financial Summary Report', { align: 'center' });
    doc.moveDown(0.3);
    doc.fontSize(11).font('Helvetica').text(`Generated: ${new Date().toLocaleString('en-IN')}`, { align: 'center' });
    doc.moveDown(1.5);

    // Platform totals
    doc.fontSize(13).font('Helvetica-Bold').text('Platform Totals');
    doc.moveTo(40, doc.y).lineTo(555, doc.y).strokeColor('#e5e7eb').stroke();
    doc.moveDown(0.4);
    doc.fontSize(11).font('Helvetica');
    const fmt = (v) => `₹${Number(v).toLocaleString('en-IN')}`;
    const tRows = [
      ['Gross Revenue',    fmt(totals.totalGrossRevenue)],
      ['Net Revenue',      fmt(totals.totalNetRevenue)],
      ['Total Expenses',   fmt(totals.totalExpenses)],
      ['Final Profit',     fmt(totals.totalProfit)],
      ['Total Refunds',    fmt(totals.totalRefunds)],
      ['Average Margin',   `${totals.avgProfitMargin}%`],
      ['Total Courses',    String(totals.courseCount)],
    ];
    tRows.forEach(([label, value]) => {
      doc.font('Helvetica-Bold').text(label + ':', { continued: true, width: 200 });
      doc.font('Helvetica').text('  ' + value);
    });
    doc.moveDown(1.5);

    // Per-course section
    doc.fontSize(13).font('Helvetica-Bold').text('Course Breakdown');
    doc.moveTo(40, doc.y).lineTo(555, doc.y).strokeColor('#e5e7eb').stroke();
    doc.moveDown(0.4);

    data.forEach((course, i) => {
      if (i > 0) doc.moveDown(0.5);
      doc.fontSize(11).font('Helvetica-Bold').text(course.courseName);
      doc.fontSize(9).font('Helvetica').fillColor('#6b7280')
        .text(`Type: ${course.courseType.toUpperCase()} | Status: ${course.courseStatus} | Enrollments: ${course.totalEnrollments}`);
      doc.fillColor('#111827')
        .text(`Gross: ${fmt(course.grossRevenue)}  |  Expenses: ${fmt(course.totalExpenses)}  |  Profit: ${fmt(course.finalProfit)}  |  Margin: ${course.profitMarginPercent}%`);
    });

    doc.end();
  } catch (error) {
    if (!res.headersSent) res.status(500).send('PDF Export failed');
  }
});

export default router;
