import Razorpay from 'razorpay';
import crypto from 'crypto';
import Enrollment from '../models/Enrollment.js';
import Course from '../models/Course.js';
import LiveCourse from '../models/LiveCourse.js';
import Notification from '../models/Notification.js';
import Certificate from '../models/Certificate.js';
import Receipt from '../models/Receipt.js';
import Counter from '../models/Counter.js';
import CohortApplication from '../models/CohortApplication.js';
import Module from '../models/Module.js';
import { generateCertificatePDF } from '../utils/generateCertificatePDF.js';
import { generateReceiptPDF } from '../utils/generateReceiptPDF.js';
import { uploadPdfToCloudinary } from '../utils/uploadPdfToCloudinary.js';

// ── Input Validation ────────────────────────────────────────────────────────
const isValidObjectId = (id) => /^[0-9a-fA-F]{24}$/.test(id);

// ── Razorpay Configuration ──────────────────────────────────────────────────

const isDummyKey = () => {
  const keyId = process.env.RAZORPAY_KEY_ID || '';
  return (
    !keyId ||
    keyId === 'dummy_key_id' ||
    keyId.includes('YOUR_KEY_ID') ||
    keyId === 'rzp_test_YOUR_KEY_ID'
  );
};

let _razorpay = null;
const getRazorpay = () => {
  if (_razorpay) return _razorpay;
  if (!isDummyKey()) {
    _razorpay = new Razorpay({
      key_id: process.env.RAZORPAY_KEY_ID,
      key_secret: process.env.RAZORPAY_KEY_SECRET,
    });
  }
  return _razorpay;
};

// ── Create Razorpay Order ───────────────────────────────────────────────────
/**
 * @desc  Create a Razorpay order using price fetched from DB (never from frontend).
 *        Returns key_id so the frontend can init the checkout modal.
 * @route POST /api/enroll/create-order
 */
export const createOrder = async (req, res) => {
  try {
    const { courseId, liveCourseId } = req.body;

    if (!courseId && !liveCourseId) {
      return res.status(400).json({ success: false, message: 'courseId or liveCourseId is required' });
    }

    // Validate ObjectId format to prevent CastError crashes
    if (courseId && !isValidObjectId(courseId)) {
      return res.status(400).json({ success: false, message: 'Invalid courseId format' });
    }
    if (liveCourseId && !isValidObjectId(liveCourseId)) {
      return res.status(400).json({ success: false, message: 'Invalid liveCourseId format' });
    }

    let targetCourse;
    if (liveCourseId) {
      targetCourse = await LiveCourse.findById(liveCourseId);
    } else {
      targetCourse = await Course.findById(courseId);
    }

    if (!targetCourse) {
      return res.status(404).json({ success: false, message: 'Course not found' });
    }

    // Seat check for live courses
    if (
      liveCourseId &&
      targetCourse.maxStudents &&
      targetCourse.currentEnrollments >= targetCourse.maxStudents
    ) {
      return res.status(400).json({ success: false, message: 'This live class is full' });
    }

    // Prevent duplicate enrollments
    const existQuery = {
      user: req.user.id,
      status: { $in: ['active', 'completed'] },
    };
    if (liveCourseId) existQuery.liveCourse = liveCourseId;
    if (courseId) existQuery.course = courseId;

    const existing = await Enrollment.findOne(existQuery);
    if (existing) {
      return res.status(400).json({ success: false, message: 'Already enrolled in this course' });
    }

    // Amount ALWAYS comes from DB — never trust the frontend
    const amountPaise = Math.round(targetCourse.price * 100); // Razorpay works in paise

    let order;

    if (isDummyKey()) {
      // ── Mock mode (no real Razorpay keys configured) ──
      order = {
        id: `order_mock_${Date.now()}`,
        amount: amountPaise,
        currency: 'INR',
        status: 'created',
      };
      console.log('[MOCK] Created mock Razorpay order:', order.id);
    } else {
      const razorpay = getRazorpay();
      order = await razorpay.orders.create({
        amount: amountPaise,
        currency: 'INR',
        receipt: `rcpt_${Date.now()}`,
        notes: {
          userId: req.user.id,
          courseId: courseId || '',
          liveCourseId: liveCourseId || '',
        },
      });
    }

    // Return key_id so frontend can open Razorpay checkout — secret is NEVER sent
    res.status(200).json({
      success: true,
      data: {
        ...order,
        // key_id is the public key — safe to expose to frontend
        key_id: isDummyKey() ? 'mock_key' : process.env.RAZORPAY_KEY_ID,
        // Convey human-readable amount back for UI display
        amount_display: targetCourse.price,
        currency: 'INR',
      },
    });
  } catch (error) {
    console.error('CREATE ORDER ERROR:', error.message);
    res.status(500).json({ success: false, message: error.message });
  }
};

// ── Helper: Reusable Enrollment Logic ───────────────────────────────────────
const enrollUserInCourse = async ({
  user,
  courseId,
  liveCourseId,
  fullName,
  email,
  phone,
  message,
  gender,
  whatsappNumber,
  courseDepartment,
  experienceLevel,
  paymentId,
  orderId,
  isAdminBypass = false
}) => {
  // 1. Prevent duplicate enrollments
  const existQuery = { user: user.id, status: { $in: ['active', 'completed'] } };
  if (liveCourseId) existQuery.liveCourse = liveCourseId;
  if (courseId) existQuery.course = courseId;

  const existingEnrollment = await Enrollment.findOne(existQuery);
  if (existingEnrollment) {
    return { success: true, alreadyEnrolled: true, message: 'Already enrolled', data: existingEnrollment };
  }

  // 2. Fetch Course
  let enrolledItem;
  const enrollData = {
    user: user.id,
    paymentId: paymentId || `mock_pay_${Date.now()}`,
    status: 'active',
    fullName: fullName || user.name || '',
    email: email || user.email || '',
    phone,
    message,
  };

  if (liveCourseId) {
    enrolledItem = await LiveCourse.findById(liveCourseId);
    if (!enrolledItem) throw new Error('Live course not found');
    if (enrolledItem.maxStudents && enrolledItem.currentEnrollments >= enrolledItem.maxStudents) {
      throw new Error('This cohort is already full');
    }
    enrollData.liveCourse = liveCourseId;
    enrollData.amount = isAdminBypass ? 0 : enrolledItem.price;
  } else if (courseId) {
    enrolledItem = await Course.findById(courseId);
    if (!enrolledItem) throw new Error('Course not found');
    enrollData.course = courseId;
    enrollData.amount = isAdminBypass ? 0 : enrolledItem.price;
  }

  if (!enrolledItem) throw new Error('Enrollment failed — course data missing');

  // 3. Payment Integrity Check (Amount Verification)
  // ONLY for real payments, skipped for dummy keys and admin bypass
  if (!isAdminBypass && !isDummyKey()) {
    try {
      const razorpay = getRazorpay();
      const payment = await razorpay.payments.fetch(paymentId);
      const expectedAmountPaise = Math.round(enrolledItem.price * 100);
      
      if (payment.amount !== expectedAmountPaise || payment.status !== 'captured' || payment.currency !== 'INR') {
        console.warn(`[SECURITY] Payment mismatch. Expected: ${expectedAmountPaise}, Got: ${payment.amount}`);
        throw new Error('Payment verification failed — invalid amount or status');
      }
    } catch (fetchErr) {
      console.error('Failed to fetch Razorpay payment details:', fetchErr.message);
      if (fetchErr.message === 'Payment verification failed — invalid amount or status') throw fetchErr;
      throw new Error('Failed to verify payment integrity');
    }
  }

  // 4. Update Course Enrollment Count
  if (liveCourseId) {
    enrolledItem.currentEnrollments = (enrolledItem.currentEnrollments || 0) + 1;
    await enrolledItem.save();
  } else if (courseId) {
    enrolledItem.enrollmentCount = (enrolledItem.enrollmentCount || 0) + 1;
    await enrolledItem.save();
  }

  // 5. Create Enrollment Record
  let enrollment;
  try {
    enrollment = await Enrollment.create(enrollData);
  } catch (createErr) {
    if (createErr.code === 11000) {
      const duplicateQuery = { user: user.id };
      if (liveCourseId) duplicateQuery.liveCourse = liveCourseId;
      else if (courseId) duplicateQuery.course = courseId;
      const existingRecord = await Enrollment.findOne(duplicateQuery);
      return { success: true, alreadyEnrolled: true, message: 'Already enrolled', data: existingRecord };
    }
    throw createErr;
  }

  // 6. Cohort Application for Live Course
  if (liveCourseId && gender && whatsappNumber) {
    try {
      await CohortApplication.create({
        user: user.id,
        liveCourse: liveCourseId,
        fullName: fullName || user.name,
        email: email || user.email,
        mobileNumber: phone,
        whatsappNumber,
        gender,
        courseDepartment,
        experienceLevel,
        status: 'Enrolled'
      });
    } catch (appErr) {
      console.error('Failed to create cohort application:', appErr);
    }
  }

  // 7. Auto-generate Receipt
  try {
    const serialNumber = await Counter.getNextSequence('receipts');
    const now = new Date();
    const fiscalStartYear = (now.getMonth() + 1) >= 4 ? now.getFullYear() : now.getFullYear() - 1;
    const fiscalYear = `${fiscalStartYear}-${String(fiscalStartYear + 1).slice(-2)}`;
    const paddedSerial = String(serialNumber).padStart(4, '0');
    const receiptId = `FWT-iZON-RECEIPT-${fiscalYear}-${paddedSerial}`;

    const receiptData = {
      receiptId,
      serialNumber,
      userName: fullName || user.name || 'Student',
      userEmail: email || user.email,
      courseName: enrolledItem.title,
      amount: isAdminBypass ? 0 : enrolledItem.price,
      paymentId: paymentId || `bypass_${Date.now()}`,
      orderId: orderId || 'N/A',
      date: now,
      status: 'SUCCESS'
    };

    const pdfBuffer = await generateReceiptPDF(receiptData);
    const fileUrl = await uploadPdfToCloudinary(pdfBuffer, `${receiptId}-${user.id}`, 'fwtion/receipts');

    await Receipt.create({
      receiptId,
      user: user.id,
      course: courseId || undefined,
      liveCourse: liveCourseId || undefined,
      enrollment: enrollment._id,
      paymentId: receiptData.paymentId,
      orderId: receiptData.orderId,
      amount: receiptData.amount,
      userName: receiptData.userName,
      userEmail: receiptData.userEmail,
      courseName: receiptData.courseName,
      fileUrl,
      status: 'SUCCESS'
    });
  } catch (receiptError) {
    console.error('Failed to auto-generate receipt:', receiptError);
  }

  // 8. Notification
  await Notification.create({
    user: user.id,
    type: 'payment',
    message: `You have successfully enrolled in "${enrolledItem?.title || 'the course'}"!`,
    link: courseId ? `/learn/${enrolledItem._id}` : '/dashboard',
  });

  return { success: true, message: 'Payment verified and enrolled successfully', data: enrollment };
};

// ── Verify Payment and Enroll ───────────────────────────────────────────────
/**
 * @desc  Verify Razorpay HMAC signature then enroll the user. Supports Admin Bypass.
 * @route POST /api/enroll/verify-payment
 */
export const verifyPayment = async (req, res) => {
  try {
    const {
      razorpay_order_id,
      razorpay_payment_id,
      razorpay_signature,
      courseId,
      liveCourseId,
      fullName,
      email,
      phone,
      message,
      gender,
      whatsappNumber,
      courseDepartment,
      experienceLevel,
    } = req.body;

    if (!req.user?.id) return res.status(401).json({ success: false, message: 'User authentication failed' });
    if (!courseId && !liveCourseId) return res.status(400).json({ success: false, message: 'Course ID missing' });
    if (courseId && !isValidObjectId(courseId)) return res.status(400).json({ success: false, message: 'Invalid courseId format' });
    if (liveCourseId && !isValidObjectId(liveCourseId)) return res.status(400).json({ success: false, message: 'Invalid liveCourseId format' });

    // ── Admin Bypass Logic ──
    const targetEmail = email || req.user.email;
    const bypassEmail = process.env.ADMIN_BYPASS_EMAIL;
    const isAdminBypass = (bypassEmail && targetEmail === bypassEmail) || (req.user?.role === 'admin');

    if (isAdminBypass) {
      try {
        const result = await enrollUserInCourse({
          user: req.user, courseId, liveCourseId, fullName, email: targetEmail, phone, message,
          gender, whatsappNumber, courseDepartment, experienceLevel,
          paymentId: `bypass_pay_${Date.now()}`, orderId: `bypass_order_${Date.now()}`, isAdminBypass: true
        });
        return res.status(200).json({ ...result, bypass: true });
      } catch (err) {
        console.error('Admin Bypass Enrollment Error:', err);
        return res.status(500).json({ success: false, message: err.message || 'Server error' });
      }
    }

    // ── Signature Verification ──
    let isAuthentic = false;

    if (isDummyKey()) {
      isAuthentic = true;
      console.log('[MOCK] Auto-approving payment verification');
    } else {
      if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
        return res.status(400).json({ success: false, message: 'Missing payment verification fields' });
      }

      const expectedSignature = crypto
        .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET)
        .update(`${razorpay_order_id}|${razorpay_payment_id}`)
        .digest('hex');

      try {
        isAuthentic = crypto.timingSafeEqual(Buffer.from(expectedSignature, 'hex'), Buffer.from(razorpay_signature, 'hex'));
      } catch (_err) {
        isAuthentic = false;
      }
    }

    if (!isAuthentic) {
      console.warn(`[SECURITY] Invalid payment signature for user ${req.user.id}, order ${razorpay_order_id}`);
      return res.status(400).json({ success: false, message: 'Payment verification failed — invalid signature' });
    }

    // ── Regular Enrollment ──
    try {
      const result = await enrollUserInCourse({
        user: req.user, courseId, liveCourseId, fullName, email, phone, message,
        gender, whatsappNumber, courseDepartment, experienceLevel,
        paymentId: razorpay_payment_id || `mock_pay_${Date.now()}`,
        orderId: razorpay_order_id || 'N/A', isAdminBypass: false
      });
      return res.status(200).json(result);
    } catch (err) {
      console.error('Regular Enrollment Error:', err);
      if (err.message.includes('Payment verification failed') || err.message.includes('not found') || err.message.includes('full')) {
        return res.status(400).json({ success: false, message: err.message });
      }
      return res.status(500).json({ success: false, message: err.message || 'Server error' });
    }
  } catch (error) {
    console.error('VERIFY PAYMENT MAIN ERROR:', error);
    res.status(500).json({ success: false, message: error.message || 'Internal Server Error' });
  }
};

// ── Razorpay Webhook ────────────────────────────────────────────────────────
export const razorpayWebhook = async (req, res) => {
  try {
    const signature = req.headers['x-razorpay-signature'];

    if (!signature || isDummyKey()) {
      return res.status(200).json({ success: true, message: 'Webhook acknowledged (no-op)' });
    }

    // req.body is a raw Buffer when mounted with express.raw() in server.js
    // This preserves byte-exact body for reliable HMAC verification
    const rawBody = Buffer.isBuffer(req.body) ? req.body : Buffer.from(JSON.stringify(req.body));

    const expectedSignature = crypto
      .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET)
      .update(rawBody)
      .digest('hex');

    // Timing-safe comparison
    let isValid = false;
    try {
      isValid = crypto.timingSafeEqual(
        Buffer.from(expectedSignature, 'hex'),
        Buffer.from(signature, 'hex')
      );
    } catch (_bufferErr) {
      isValid = false;
    }

    if (!isValid) {
      console.warn('[SECURITY] Invalid webhook signature received');
      return res.status(400).json({ success: false, message: 'Invalid webhook signature' });
    }

    // Parse body if it came as raw buffer
    const body = Buffer.isBuffer(req.body) ? JSON.parse(req.body.toString()) : req.body;

    if (body.event === 'payment.captured') {
      const payment = body.payload.payment.entity;
      console.log(`[Webhook] Payment captured: ${payment.id}, amount: ₹${payment.amount / 100}`);
    }

    res.status(200).json({ success: true });
  } catch (error) {
    console.error('WEBHOOK ERROR:', error.message);
    res.status(500).json({ success: false, message: error.message });
  }
};

// ── Get My Courses ──────────────────────────────────────────────────────────
export const getMyCourses = async (req, res) => {
  try {
    const enrollments = await Enrollment.find({ user: req.user.id })
      .populate({
        path: 'course',
        select: 'title slug thumbnail instructor instructorName instructorPhoto category price',
        populate: { path: 'instructor', select: 'name avatar' },
      })
      .populate({
        path: 'liveCourse',
        select: 'title thumbnail instructor category zoomLink whatsappGroup startDate classStartTime classEndTime timezone duration schedule price',
        populate: { path: 'instructor', select: 'name avatar' },
      });

    res.status(200).json({ success: true, count: enrollments.length, data: enrollments });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// ── Update Progress ─────────────────────────────────────────────────────────
export const updateProgress = async (req, res) => {
  try {
    const { courseId, lessonId } = req.body;

    if (!courseId || !lessonId) {
      return res.status(400).json({ success: false, message: 'courseId and lessonId are required' });
    }
    if (!isValidObjectId(courseId) || !isValidObjectId(lessonId)) {
      return res.status(400).json({ success: false, message: 'Invalid courseId or lessonId format' });
    }

    const enrollment = await Enrollment.findOne({ user: req.user.id, course: courseId }).populate('course');

    if (!enrollment) {
      return res.status(404).json({ success: false, message: 'Enrollment not found' });
    }

    if (!enrollment.progress.completedLessons.includes(lessonId)) {
      enrollment.progress.completedLessons.push(lessonId);

      // Recalculate progress percentage
      try {
        const modules = await Module.find({ course: courseId });
        const totalLessons = modules.reduce((total, mod) => total + (mod.lessons?.length || 0), 0);

        if (totalLessons > 0) {
          const completedCount = enrollment.progress.completedLessons.length;
          enrollment.progress.percentComplete = Math.floor((completedCount / totalLessons) * 100);

          if (enrollment.progress.percentComplete >= 100 && enrollment.status !== 'completed') {
            enrollment.status = 'completed';
            enrollment.completedAt = new Date();
            enrollment.progress.percentComplete = 100;

            // Auto-generate certificate
            try {
              const serialNumber = await Counter.getNextSequence('certificates');
              const paddedSerial = String(serialNumber).padStart(4, '0');
              const currentYear = new Date().getFullYear();
              const certificateId = `FWT-IZON-${currentYear}-${paddedSerial}`;

              const pdfData = {
                studentName: req.user.name,
                courseName: enrollment.course.title,
                domain: enrollment.course.category || 'Professional Development',
                areaOfExpertise: 'Specialized Training',
                completionDate: enrollment.completedAt,
                certificateId,
                serialNumber
              };

              const pdfBuffer = await generateCertificatePDF(pdfData);
              const fileUrl = await uploadPdfToCloudinary(pdfBuffer, `${certificateId}-${req.user.id}`, 'fwtion/certificates');

              await Certificate.create({
                certificateId,
                user: req.user.id,
                course: courseId,
                studentName: req.user.name,
                studentEmail: req.user.email,
                courseName: enrollment.course.title,
                domain: pdfData.domain,
                areaOfExpertise: pdfData.areaOfExpertise,
                issueDate: new Date(),
                completionDate: pdfData.completionDate,
                serialNumber,
                fileUrl,
                enrollment: enrollment._id
              });
            } catch (certError) {
              console.error('Failed to auto-generate certificate:', certError);
            }
          }
        }
      } catch (err) {
        console.error('Error calculating progress:', err);
      }

      await enrollment.save();
    }

    res.status(200).json({ success: true, data: enrollment.progress });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// ── Check Enrollment Status (lightweight) ───────────────────────────────────
/**
 * @desc  Check if the authenticated user is enrolled in a specific course.
 *        Returns { enrolled: true/false } — much cheaper than fetching all enrollments.
 * @route GET /api/enroll/status?courseId=...  OR  ?liveCourseId=...
 */
export const checkEnrollmentStatus = async (req, res) => {
  try {
    const { courseId, liveCourseId } = req.query;

    if (!courseId && !liveCourseId) {
      return res.status(400).json({
        success: false,
        message: 'courseId or liveCourseId query parameter is required',
      });
    }

    // Validate ObjectId format
    if (courseId && !isValidObjectId(courseId)) {
      return res.status(400).json({ success: false, message: 'Invalid courseId format' });
    }
    if (liveCourseId && !isValidObjectId(liveCourseId)) {
      return res.status(400).json({ success: false, message: 'Invalid liveCourseId format' });
    }

    const query = {
      user: req.user.id,
      status: { $in: ['active', 'completed'] },
    };
    if (liveCourseId) query.liveCourse = liveCourseId;
    if (courseId) query.course = courseId;

    const exists = await Enrollment.findOne(query).lean();

    res.status(200).json({
      success: true,
      enrolled: !!exists,
    });
  } catch (error) {
    console.error('CHECK ENROLLMENT STATUS ERROR:', error.message);
    res.status(500).json({ success: false, message: error.message });
  }
};
