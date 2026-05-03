import express from 'express';
import {
  createOrder,
  verifyPayment,
  getMyCourses,
  updateProgress,
  checkEnrollmentStatus,
  checkBypassStatus,
  checkEligibility,
  autoEnroll,
} from './enrollmentController.js';
import { protect } from '../middleware/auth.js';
import { paymentLimiter } from '../middleware/rateLimiter.js';

const router = express.Router();

// Enrollment status & bypass check (lightweight, no heavy limiter)
router.get('/status', protect, checkEnrollmentStatus);
router.get('/bypass-check', protect, checkBypassStatus);

// Auto-enrollment eligibility check (lightweight)
router.post('/check-eligibility', protect, checkEligibility);
router.post('/auto-enroll', protect, paymentLimiter, autoEnroll);

// Payment routes (rate-limited)
router.post('/create-order', protect, paymentLimiter, createOrder);
router.post('/verify-payment', protect, paymentLimiter, verifyPayment);

// User data routes
router.get('/my-courses', protect, getMyCourses);
router.put('/progress', protect, updateProgress);

// Webhook is mounted directly in server.js with express.raw() for proper HMAC verification

export default router;
