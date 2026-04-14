import Razorpay from 'razorpay';
import crypto from 'crypto';
import Enrollment from '../models/Enrollment.js';
import Course from '../models/Course.js';
import LiveCourse from '../models/LiveCourse.js';
import Notification from '../models/Notification.js';

// ── Razorpay Configuration ──

const isDummyKey = () => {
  const keyId = process.env.RAZORPAY_KEY_ID || '';
  return !keyId || keyId === 'dummy_key_id' || keyId.includes('YOUR_KEY_ID');
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

/**
 * Create Razorpay Order
 */
export const createOrder = async (req, res) => {
  try {
    const { courseId, liveCourseId } = req.body;

    let targetCourse;

    if (liveCourseId) {
      targetCourse = await LiveCourse.findById(liveCourseId);
    } else if (courseId) {
      targetCourse = await Course.findById(courseId);
    }

    if (!targetCourse) {
      return res.status(404).json({
        success: false,
        message: 'Course not found',
      });
    }

    // Seat check
    if (
      liveCourseId &&
      targetCourse.maxStudents &&
      targetCourse.currentEnrollments >= targetCourse.maxStudents
    ) {
      return res.status(400).json({
        success: false,
        message: 'This live class is full',
      });
    }

    // Prevent duplicate enrollments
    const query = {
      user: req.user.id,
      status: { $in: ['active', 'completed'] },
    };

    if (liveCourseId) query.liveCourse = liveCourseId;
    if (courseId) query.course = courseId;

    const existingEnrollment = await Enrollment.findOne(query);

    if (existingEnrollment) {
      return res.status(400).json({
        success: false,
        message: 'Already enrolled in this course',
      });
    }

    const amount = targetCourse.price * 100;

    let order;

    if (isDummyKey()) {
      order = {
        id: `order_mock_${Date.now()}`,
        amount,
        currency: 'INR',
        status: 'created',
      };

      console.log('Created mock Razorpay order:', order.id);
    } else {
      const razorpay = getRazorpay();

      order = await razorpay.orders.create({
        amount,
        currency: 'INR',
        receipt: `receipt_${Date.now()}`,
        notes: {
          userId: req.user.id,
          courseId: courseId || '',
          liveCourseId: liveCourseId || '',
        },
      });
    }

    res.status(200).json({
      success: true,
      data: order,
    });
  } catch (error) {
    console.error('CREATE ORDER ERROR:', error.message);

    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

/**
 * Verify Payment and Enroll User
 */
/**
 * Verify Payment and Enroll User
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
    } = req.body;

    // ── Ensure authenticated user ──
    if (!req.user || !req.user.id) {
      return res.status(401).json({
        success: false,
        message: 'User authentication failed',
      });
    }

    // ── Ensure course id exists ──
    if (!courseId && !liveCourseId) {
      return res.status(400).json({
        success: false,
        message: 'Course ID missing',
      });
    }

    // ── Signature verification ──
    let isAuthentic = false;

    if (isDummyKey()) {
      isAuthentic = true;
      console.log('[MOCK] Auto-approving payment verification');
    } else {
      if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
        return res.status(400).json({
          success: false,
          message: 'Missing payment verification fields',
        });
      }

      const body = razorpay_order_id + '|' + razorpay_payment_id;

      const expectedSignature = crypto
        .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET)
        .update(body)
        .digest('hex');

      isAuthentic = expectedSignature === razorpay_signature;
    }

    if (!isAuthentic) {
      return res.status(400).json({
        success: false,
        message: 'Payment verification failed — invalid signature',
      });
    }

    // ── Prevent duplicate enrollments ──
    const existQuery = {
      user: req.user.id,
      status: { $in: ['active', 'completed'] },
    };

    if (liveCourseId) existQuery.liveCourse = liveCourseId;
    if (courseId) existQuery.course = courseId;

    const existingEnrollment = await Enrollment.findOne(existQuery);

    if (existingEnrollment) {
      return res.status(200).json({
        success: true,
        message: 'Already enrolled',
        data: existingEnrollment,
      });
    }

    let enrolledItem;

    const enrollData = {
      user: req.user.id,
      paymentId: razorpay_payment_id || `mock_pay_${Date.now()}`,
      status: 'active',
      fullName,
      email,
      phone,
      message,
    };

    // ── Live Course Enrollment ──
    if (liveCourseId) {
      enrolledItem = await LiveCourse.findById(liveCourseId);

      if (!enrolledItem) {
        return res.status(404).json({
          success: false,
          message: 'Live course not found',
        });
      }

      // Seat check
      if (
        enrolledItem.maxStudents &&
        enrolledItem.currentEnrollments >= enrolledItem.maxStudents
      ) {
        return res.status(400).json({
          success: false,
          message: 'This cohort is already full',
        });
      }

      enrollData.liveCourse = liveCourseId;
      enrollData.amount = enrolledItem.price;

      enrolledItem.currentEnrollments =
        (enrolledItem.currentEnrollments || 0) + 1;

      await enrolledItem.save();
    }

    // ── Normal Course Enrollment ──
    else if (courseId) {
      enrolledItem = await Course.findById(courseId);

      if (!enrolledItem) {
        return res.status(404).json({
          success: false,
          message: 'Course not found',
        });
      }

      enrollData.course = courseId;
      enrollData.amount = enrolledItem.price;

      enrolledItem.enrollmentCount =
        (enrolledItem.enrollmentCount || 0) + 1;

      await enrolledItem.save();
    }

    // ── Final safety check ──
    if (!enrolledItem) {
      return res.status(500).json({
        success: false,
        message: 'Enrollment failed — course data missing',
      });
    }

    const enrollment = await Enrollment.create(enrollData);

    // ── Notification ──
    await Notification.create({
      user: req.user.id,
      type: 'payment',
      message: `You have successfully enrolled in "${enrolledItem?.title || 'course'}"!`,
      link: courseId ? `/learn/${enrolledItem._id}` : '/dashboard',
    });

    res.status(200).json({
      success: true,
      message: 'Payment verified and enrolled successfully',
      data: enrollment,
    });

  } catch (error) {
    console.error('VERIFY PAYMENT ERROR:', error);

    res.status(500).json({
      success: false,
      message: error.message || 'Internal Server Error',
    });
  }
};
/**
 * Razorpay Webhook
 */
export const razorpayWebhook = async (req, res) => {
  try {
    const webhookSecret = process.env.RAZORPAY_KEY_SECRET;
    const signature = req.headers['x-razorpay-signature'];

    if (!signature || isDummyKey()) {
      return res.status(200).json({
        success: true,
        message: 'Webhook acknowledged (no-op)',
      });
    }

    const expectedSignature = crypto
      .createHmac('sha256', webhookSecret)
      .update(JSON.stringify(req.body))
      .digest('hex');

    if (expectedSignature !== signature) {
      return res.status(400).json({
        success: false,
        message: 'Invalid webhook signature',
      });
    }

    const event = req.body.event;

    if (event === 'payment.captured') {
      const payment = req.body.payload.payment.entity;

      console.log(
        `[Webhook] Payment captured: ${payment.id}, amount: ₹${payment.amount / 100
        }`
      );
    }

    res.status(200).json({ success: true });
  } catch (error) {
    console.error('WEBHOOK ERROR:', error.message);

    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

/**
 * Get My Courses
 */
export const getMyCourses = async (req, res) => {
  try {
    const enrollments = await Enrollment.find({ user: req.user.id })
      .populate({
        path: 'course',
        select: 'title slug thumbnail instructor category',
        populate: { path: 'instructor', select: 'name avatar' },
      })
      .populate({
        path: 'liveCourse',
        select:
          'title thumbnail instructor category zoomLink whatsappGroup startDate duration schedule',
        populate: { path: 'instructor', select: 'name avatar' },
      });

    res.status(200).json({
      success: true,
      count: enrollments.length,
      data: enrollments,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

/**
 * Update Progress
 */
export const updateProgress = async (req, res) => {
  try {
    const { courseId, lessonId } = req.body;

    if (!courseId || !lessonId) {
      return res.status(400).json({
        success: false,
        message: 'courseId and lessonId are required',
      });
    }

    const enrollment = await Enrollment.findOne({
      user: req.user.id,
      course: courseId,
    });

    if (!enrollment) {
      return res.status(404).json({
        success: false,
        message: 'Enrollment not found',
      });
    }

    if (!enrollment.progress.completedLessons.includes(lessonId)) {
      enrollment.progress.completedLessons.push(lessonId);
      await enrollment.save();
    }

    res.status(200).json({
      success: true,
      data: enrollment.progress,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};