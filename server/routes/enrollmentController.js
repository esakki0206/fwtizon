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
import Coupon from '../models/Coupon.js';
import User from '../models/User.js';
import { validateCouponForCourse } from './couponController.js';
import { generateCertificatePDF } from '../utils/generateCertificatePDF.js';
import { generateReceiptPDF } from '../utils/generateReceiptPDF.js';
import { uploadPdfToCloudinary } from '../utils/uploadPdfToCloudinary.js';
import { buildAndStoreCertificate } from './certificateController.js';

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

// ── Admin Bypass Check ───────────────────────────────────────────────────────
/**
 * @desc  Check (server-side only) whether the authenticated user qualifies
 *        for the admin bypass flow. Never trust the frontend for this.
 * @route GET /api/enroll/bypass-check
 * @access Private
 */
export const checkBypassStatus = async (req, res) => {
  try {
    if (!req.user?.email) {
      return res.status(200).json({ success: true, isBypass: false });
    }

    const bypassEmail = process.env.ADMIN_BYPASS_EMAIL;
    const isBypass =
      Boolean(bypassEmail && req.user.email === bypassEmail) ||
      req.user.role === 'admin';

    return res.status(200).json({ success: true, isBypass });
  } catch (error) {
    console.error('Bypass check error:', error.message);
    res.status(500).json({ success: false, message: error.message });
  }
};

// ── Create Razorpay Order ───────────────────────────────────────────────────
/**
 * @desc  Create a Razorpay order.
 *        - Price ALWAYS comes from DB.
 *        - Coupon discount is validated server-side if couponCode is provided.
 *        - Returns key_id so frontend can init the checkout modal.
 * @route POST /api/enroll/create-order
 */
export const createOrder = async (req, res) => {
  try {
    const { courseId, liveCourseId, couponCode } = req.body;

    if (!courseId && !liveCourseId) {
      return res.status(400).json({ success: false, message: 'courseId or liveCourseId is required' });
    }
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

    // Prevent duplicate enrollments — scope to exact course type
    let existQuery;
    if (liveCourseId) {
      existQuery = { user: req.user.id, liveCourse: liveCourseId, status: { $in: ['active', 'completed'] } };
    } else {
      existQuery = { user: req.user.id, course: courseId, status: { $in: ['active', 'completed'] } };
    }

    const existing = await Enrollment.findOne(existQuery);
    if (existing) {
      return res.status(400).json({ success: false, message: 'Already enrolled in this course' });
    }

    // ── Price from DB (never trust frontend) ──
    const originalPrice = targetCourse.price;
    let finalPrice = originalPrice;
    let discountAmount = 0;
    let appliedCouponCode = null;

    // ── Coupon validation ──
    if (couponCode) {
      const targetId = courseId || liveCourseId;
      const couponResult = await validateCouponForCourse(couponCode, targetId, originalPrice);
      if (!couponResult.valid) {
        return res.status(400).json({ success: false, message: `Coupon error: ${couponResult.message}` });
      }
      finalPrice = couponResult.finalPrice;
      discountAmount = couponResult.discountAmount;
      appliedCouponCode = couponResult.coupon.code;
    }

    const amountPaise = Math.round(finalPrice * 100);

    let order;

    if (isDummyKey() || amountPaise === 0) {
      // ── Mock mode OR free (100% discount) ──
      order = {
        id: `order_mock_${Date.now()}`,
        amount: amountPaise,
        currency: 'INR',
        status: 'created',
      };
      if (isDummyKey()) {
        console.log('[MOCK] Created mock Razorpay order:', order.id);
      } else {
        console.log('[FREE] 100% coupon applied, skipping Razorpay:', order.id);
      }
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
          couponCode: appliedCouponCode || '',
          originalPrice: String(originalPrice),
          discountAmount: String(discountAmount),
        },
      });
    }

    res.status(200).json({
      success: true,
      data: {
        ...order,
        key_id: isDummyKey() ? 'mock_key' : process.env.RAZORPAY_KEY_ID,
        amount_display: finalPrice,
        original_amount: originalPrice,
        discount_amount: discountAmount,
        coupon_applied: appliedCouponCode,
        currency: 'INR',
        // Flag: if amount is 0 due to 100% coupon, frontend can auto-enroll
        is_free: amountPaise === 0,
      },
    });
  } catch (error) {
    console.error('CREATE ORDER ERROR:', error.message);
    res.status(500).json({ success: false, message: error.message });
  }
};

// ── Helper: Reusable Enrollment Logic ───────────────────────────────────────
export const enrollUserInCourse = async ({
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
  isAdminBypass = false,
  couponCode = null,
  discountAmount = 0,
  originalAmount = null,
  enrollmentType = 'paid',
}) => {
  // 1. Prevent duplicate enrollments — scope query to the EXACT course type
  let existQuery;
  if (liveCourseId) {
    existQuery = { user: user.id, liveCourse: liveCourseId, status: { $in: ['active', 'completed'] } };
  } else if (courseId) {
    existQuery = { user: user.id, course: courseId, status: { $in: ['active', 'completed'] } };
  } else {
    throw new Error('Either courseId or liveCourseId must be provided');
  }

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
    couponCode: couponCode || null,
    discountAmount: discountAmount || 0,
    enrollmentType,
  };

  if (liveCourseId) {
    enrolledItem = await LiveCourse.findById(liveCourseId);
    if (!enrolledItem) throw new Error('Live course not found');
    if (enrolledItem.maxStudents && enrolledItem.currentEnrollments >= enrolledItem.maxStudents) {
      throw new Error('This cohort is already full');
    }
    enrollData.liveCourse = liveCourseId;
    const rawPrice = enrolledItem.price;
    enrollData.amount = isAdminBypass ? 0 : (rawPrice - (discountAmount || 0));
    enrollData.originalAmount = originalAmount ?? rawPrice;
  } else if (courseId) {
    enrolledItem = await Course.findById(courseId);
    if (!enrolledItem) throw new Error('Course not found');
    enrollData.course = courseId;
    const rawPrice = enrolledItem.price;
    enrollData.amount = isAdminBypass ? 0 : (rawPrice - (discountAmount || 0));
    enrollData.originalAmount = originalAmount ?? rawPrice;
  }

  if (!enrolledItem) throw new Error('Enrollment failed — course data missing');

  // 3. Payment Integrity Check (real payments only)
  if (!isAdminBypass && !isDummyKey() && paymentId && !paymentId.startsWith('mock_')) {
    try {
      const razorpay = getRazorpay();
      const payment = await razorpay.payments.fetch(paymentId);
      // Expected = final discounted price in paise
      const finalAmountRs = enrollData.amount;
      const expectedAmountPaise = Math.round(finalAmountRs * 100);

      if (
        payment.amount !== expectedAmountPaise ||
        payment.status !== 'captured' ||
        payment.currency !== 'INR'
      ) {
        console.warn(
          `[SECURITY] Payment mismatch. Expected: ${expectedAmountPaise} paise (₹${finalAmountRs}), Got: ${payment.amount} paise. Status: ${payment.status}`
        );
        throw new Error('Payment verification failed — invalid amount or status');
      }
    } catch (fetchErr) {
      console.error('Failed to fetch Razorpay payment details:', fetchErr.message);
      if (fetchErr.message === 'Payment verification failed — invalid amount or status') throw fetchErr;
      throw new Error('Failed to verify payment integrity');
    }
  }

  // 4. Update Course Enrollment Count (atomic — avoids triggering pre-save hooks)
  if (liveCourseId) {
    const actualCount = await Enrollment.countDocuments({
      liveCourse: liveCourseId,
      status: { $in: ['active', 'completed'] }
    });
    // +1 because the new enrollment hasn't been created yet
    await LiveCourse.findByIdAndUpdate(liveCourseId, {
      $set: { currentEnrollments: actualCount + 1 }
    });
  } else if (courseId) {
    const actualCount = await Enrollment.countDocuments({
      course: courseId,
      status: { $in: ['active', 'completed'] }
    });
    await Course.findByIdAndUpdate(courseId, {
      $set: { enrollmentCount: actualCount + 1 }
    });
  }

  // 5. Increment Coupon Usage (atomic)
  if (couponCode) {
    try {
      await Coupon.findOneAndUpdate(
        { code: couponCode.toUpperCase() },
        { $inc: { usedCount: 1 } }
      );
    } catch (couponErr) {
      console.error('Failed to increment coupon usage count:', couponErr.message);
      // Non-fatal — enrollment still succeeds
    }
  }

  // 6. Create Enrollment Record
  let enrollment;
  try {
    enrollment = await Enrollment.create(enrollData);

    // Update User schema with the course and type (auto/paid) for normal courses
    if (courseId) {
      await User.findByIdAndUpdate(user.id, {
        $push: {
          enrolledCourses: {
            courseId,
            type: enrollmentType
          }
        }
      });
    }
  } catch (createErr) {
    if (createErr.code === 11000) {
      let duplicateQuery;
      if (liveCourseId) {
        duplicateQuery = { user: user.id, liveCourse: liveCourseId };
      } else {
        duplicateQuery = { user: user.id, course: courseId };
      }
      const existingRecord = await Enrollment.findOne(duplicateQuery);
      return { success: true, alreadyEnrolled: true, message: 'Already enrolled', data: existingRecord };
    }
    throw createErr;
  }

  // 7. Cohort Application for Live Course
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
        status: 'Enrolled',
      });
    } catch (appErr) {
      console.error('Failed to create cohort application:', appErr);
    }
  }

  // 8. Auto-generate Receipt
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
      amount: enrollData.amount,
      paymentId: paymentId || `bypass_${Date.now()}`,
      orderId: orderId || 'N/A',
      date: now,
      status: 'SUCCESS',
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
      status: 'SUCCESS',
    });
  } catch (receiptError) {
    console.error('Failed to auto-generate receipt:', receiptError);
  }

  // 9. Notification
  await Notification.create({
    user: user.id,
    type: 'payment',
    message: `You have successfully enrolled in "${enrolledItem?.title || 'the course'}"!`,
    link: courseId ? `/learn/${enrolledItem._id}` : '/dashboard',
  });

  return {
    success: true,
    message: 'Enrolled successfully',
    data: enrollment,
  };
};

// ── Verify Payment and Enroll ───────────────────────────────────────────────
/**
 * @desc  Verify Razorpay HMAC signature then enroll the user.
 *        Supports admin bypass and coupon-discounted amounts.
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
      couponCode,
    } = req.body;

    if (!req.user?.id) {
      return res.status(401).json({ success: false, message: 'User authentication failed' });
    }
    if (!courseId && !liveCourseId) {
      return res.status(400).json({ success: false, message: 'Course ID missing' });
    }
    if (courseId && !isValidObjectId(courseId)) {
      return res.status(400).json({ success: false, message: 'Invalid courseId format' });
    }
    if (liveCourseId && !isValidObjectId(liveCourseId)) {
      return res.status(400).json({ success: false, message: 'Invalid liveCourseId format' });
    }

    // ── Admin Bypass — checked server-side ONLY ──────────────────────────
    const targetEmail = email || req.user.email;
    const bypassEmail = process.env.ADMIN_BYPASS_EMAIL;
    const isAdminBypass =
      (Boolean(bypassEmail) && targetEmail === bypassEmail) ||
      req.user?.role === 'admin';

    if (isAdminBypass) {
      try {
        const result = await enrollUserInCourse({
          user: req.user,
          courseId,
          liveCourseId,
          fullName,
          email: targetEmail,
          phone,
          message,
          gender,
          whatsappNumber,
          courseDepartment,
          experienceLevel,
          paymentId: `bypass_pay_${Date.now()}`,
          orderId: `bypass_order_${Date.now()}`,
          isAdminBypass: true,
          couponCode: null,       // bypasses pay full coupons don't apply
          discountAmount: 0,
          originalAmount: null,
        });
        return res.status(200).json({ ...result, bypass: true });
      } catch (err) {
        console.error('Admin Bypass Enrollment Error:', err);
        return res.status(500).json({ success: false, message: err.message || 'Server error' });
      }
    }

    // ── Re-validate coupon server-side ───────────────────────────────────
    let serverDiscountAmount = 0;
    let serverFinalPrice = null;
    let validatedCouponCode = null;

    if (couponCode) {
      const targetId = courseId || liveCourseId;
      let targetPrice = null;
      if (courseId) {
        const course = await Course.findById(courseId).select('price');
        if (!course) return res.status(404).json({ success: false, message: 'Course not found' });
        targetPrice = course.price;
      } else if (liveCourseId) {
        const liveCourse = await LiveCourse.findById(liveCourseId).select('price');
        if (!liveCourse) return res.status(404).json({ success: false, message: 'Live Course not found' });
        targetPrice = liveCourse.price;
      }

      const couponResult = await validateCouponForCourse(couponCode, targetId, targetPrice);
      if (!couponResult.valid) {
        // If coupon is no longer valid (e.g. race condition), reject the payment
        return res.status(400).json({ success: false, message: `Coupon validation failed: ${couponResult.message}` });
      }
      serverDiscountAmount = couponResult.discountAmount;
      serverFinalPrice = couponResult.finalPrice;
      validatedCouponCode = couponResult.coupon.code;
    }

    // ── Signature Verification ───────────────────────────────────────────
    // If final price is 0 (100% coupon), skip Razorpay verification
    const isFreeEnrollment = serverFinalPrice !== null && serverFinalPrice === 0;
    let isAuthentic = false;

    if (isDummyKey() || isFreeEnrollment) {
      isAuthentic = true;
      if (isDummyKey()) console.log('[MOCK] Auto-approving payment verification');
      if (isFreeEnrollment) console.log('[FREE] 100% coupon — skipping Razorpay signature check');
    } else {
      if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
        return res.status(400).json({ success: false, message: 'Missing payment verification fields' });
      }

      const expectedSignature = crypto
        .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET)
        .update(`${razorpay_order_id}|${razorpay_payment_id}`)
        .digest('hex');

      try {
        isAuthentic = crypto.timingSafeEqual(
          Buffer.from(expectedSignature, 'hex'),
          Buffer.from(razorpay_signature, 'hex')
        );
      } catch (_err) {
        isAuthentic = false;
      }
    }

    if (!isAuthentic) {
      console.warn(
        `[SECURITY] Invalid payment signature for user ${req.user.id}, order ${razorpay_order_id}`
      );
      return res.status(400).json({ success: false, message: 'Payment verification failed — invalid signature' });
    }

    // ── Regular Enrollment ───────────────────────────────────────────────
    try {
      const result = await enrollUserInCourse({
        user: req.user,
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
        paymentId: isFreeEnrollment
          ? `free_coupon_${Date.now()}`
          : razorpay_payment_id || `mock_pay_${Date.now()}`,
        orderId: razorpay_order_id || 'N/A',
        isAdminBypass: false,
        couponCode: validatedCouponCode,
        discountAmount: serverDiscountAmount,
        originalAmount: null,     // enrollUserInCourse will derive from DB
      });
      return res.status(200).json(result);
    } catch (err) {
      console.error('Regular Enrollment Error:', err);
      if (
        err.message.includes('Payment verification failed') ||
        err.message.includes('not found') ||
        err.message.includes('full')
      ) {
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

    const rawBody = Buffer.isBuffer(req.body) ? req.body : Buffer.from(JSON.stringify(req.body));

    const expectedSignature = crypto
      .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET)
      .update(rawBody)
      .digest('hex');

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
        match: { status: { $nin: ['hidden', 'draft'] } },
        select: 'title slug thumbnail instructor instructorName instructorPhoto category price',
        populate: { path: 'instructor', select: 'name avatar' },
      })
      .populate({
        path: 'liveCourse',
        match: { status: { $nin: ['Hidden', 'Draft'] } },
        select: 'title thumbnail instructor category zoomLink whatsappGroup startDate classStartTime classEndTime timezone duration schedule price',
        populate: { path: 'instructor', select: 'name avatar' },
      });

    const validEnrollments = enrollments.filter(e => e.course || e.liveCourse);

    res.status(200).json({ success: true, count: validEnrollments.length, data: validEnrollments });
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
    if (!isValidObjectId(lessonId)) {
      return res.status(400).json({ success: false, message: 'Invalid lessonId format' });
    }

    let courseObjectId = courseId;
    if (!isValidObjectId(courseId)) {
      const course = await Course.findOne({ slug: courseId }).select('_id');
      if (!course) return res.status(404).json({ success: false, message: 'Course not found' });
      courseObjectId = course._id;
    }

    const enrollment = await Enrollment.findOne({ user: req.user.id, course: courseObjectId }).populate('course');

    if (!enrollment) {
      return res.status(404).json({ success: false, message: 'Enrollment not found' });
    }

    if (!enrollment.progress.completedLessons.includes(lessonId)) {
      enrollment.progress.completedLessons.push(lessonId);

      try {
        const modules = await Module.find({ course: courseObjectId }).populate('lessons');
        const totalLessons = modules.reduce((total, mod) => total + (mod.lessons?.length || 0), 0);

        if (totalLessons > 0) {
          const completedCount = enrollment.progress.completedLessons.length;
          enrollment.progress.percentComplete = Math.floor((completedCount / totalLessons) * 100);

          if (enrollment.progress.percentComplete >= 100 && enrollment.status !== 'completed') {
            enrollment.status = 'completed';
            enrollment.completedAt = new Date();
            enrollment.progress.percentComplete = 100;

            // Auto-generate certificate using active template
            try {
              const cert = await buildAndStoreCertificate({
                userId: req.user.id,
                userEmail: req.user.email,
                userName: req.user.name,
                courseRef: enrollment.course,
                courseType: 'course',
                courseId: enrollment.course._id,
                enrollmentId: enrollment._id,
                completionDate: enrollment.completedAt,
                templateId: null, // use default template
              });
              enrollment.certificateId = cert.certificateId;
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

// ── Check Enrollment Status ─────────────────────────────────────────────────
/**
 * @desc  Check if the authenticated user is enrolled in a specific course.
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
    if (courseId && !isValidObjectId(courseId)) {
      return res.status(400).json({ success: false, message: 'Invalid courseId format' });
    }
    if (liveCourseId && !isValidObjectId(liveCourseId)) {
      return res.status(400).json({ success: false, message: 'Invalid liveCourseId format' });
    }

    // Scope query to exact course type
    let query;
    if (liveCourseId) {
      query = { user: req.user.id, liveCourse: liveCourseId, status: { $in: ['active', 'completed'] } };
    } else {
      query = { user: req.user.id, course: courseId, status: { $in: ['active', 'completed'] } };
    }

    const enrollment = await Enrollment.findOne(query).populate('liveCourse', 'zoomLink').lean();
    
    res.status(200).json({ 
      success: true, 
      enrolled: !!enrollment,
      zoomLink: enrollment?.liveCourse?.zoomLink 
    });
  } catch (error) {
    console.error('CHECK ENROLLMENT STATUS ERROR:', error.message);
    res.status(500).json({ success: false, message: error.message });
  }
};

// ── Check Eligibility for Auto-Enrollment ──────────────────────────────────
/**
 * @desc  Check if user is eligible for free auto-enrollment into a Normal Course
 *        based on an active linked live course enrollment.
 * @route POST /api/enroll/check-eligibility
 * @access Private
 */
export const checkEligibility = async (req, res) => {
  try {
    const { courseId } = req.body;
    if (!courseId || !isValidObjectId(courseId)) {
      return res.status(400).json({ success: false, message: 'Valid courseId is required' });
    }

    const course = await Course.findById(courseId);
    if (!course) {
      return res.status(404).json({ success: false, message: 'Course not found' });
    }

    if (!course.linkedLiveCourseId) {
      return res.status(200).json({ success: true, eligibleForFree: false, reason: 'No linked live course' });
    }

    // Check if user is enrolled in the linked live course
    const liveEnrollment = await Enrollment.findOne({
      user: req.user.id,
      liveCourse: course.linkedLiveCourseId,
      status: { $in: ['active', 'completed'] }
    });

    if (liveEnrollment) {
      return res.status(200).json({ success: true, eligibleForFree: true, reason: 'Active enrollment in linked live course' });
    } else {
      return res.status(200).json({ success: true, eligibleForFree: false, reason: 'Not enrolled in linked live course' });
    }
  } catch (error) {
    console.error('CHECK ELIGIBILITY ERROR:', error.message);
    res.status(500).json({ success: false, message: error.message });
  }
};

// ── Auto-Enroll ─────────────────────────────────────────────────────────────
/**
 * @desc  Auto enroll user into a Normal Course if eligible.
 * @route POST /api/enroll/auto-enroll
 * @access Private
 */
export const autoEnroll = async (req, res) => {
  try {
    const { courseId } = req.body;
    if (!courseId || !isValidObjectId(courseId)) {
      return res.status(400).json({ success: false, message: 'Valid courseId is required' });
    }

    const course = await Course.findById(courseId);
    if (!course || !course.linkedLiveCourseId) {
      return res.status(403).json({ success: false, message: 'Not eligible for auto-enrollment' });
    }

    const liveEnrollment = await Enrollment.findOne({
      user: req.user.id,
      liveCourse: course.linkedLiveCourseId,
      status: { $in: ['active', 'completed'] }
    });

    if (!liveEnrollment) {
      return res.status(403).json({ success: false, message: 'Not enrolled in linked live course' });
    }

    // Call shared enroll logic
    const result = await enrollUserInCourse({
      user: req.user,
      courseId,
      fullName: req.user.name,
      email: req.user.email,
      paymentId: `auto_enrolled_${Date.now()}`,
      orderId: 'auto_enrolled',
      isAdminBypass: true, // Bypass amount verification
      enrollmentType: 'auto',
    });

    if (result.alreadyEnrolled) {
      return res.status(200).json({ success: true, message: 'Already enrolled' });
    }

    res.status(200).json({ success: true, message: 'Successfully auto-enrolled' });
  } catch (error) {
    console.error('AUTO ENROLL ERROR:', error.message);
    res.status(500).json({ success: false, message: error.message });
  }
};
