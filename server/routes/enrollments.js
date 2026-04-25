import express from 'express';
import {
  createOrder,
  verifyPayment,
  getMyCourses,
  updateProgress,
  checkEnrollmentStatus,
} from './enrollmentController.js';
import { protect } from '../middleware/auth.js';
import { paymentLimiter } from '../middleware/rateLimiter.js';

const router = express.Router();

router.get('/status', protect, checkEnrollmentStatus);
router.post('/create-order', protect, paymentLimiter, createOrder);
router.post('/verify-payment', protect, paymentLimiter, verifyPayment);
router.get('/my-courses', protect, getMyCourses);
router.put('/progress', protect, updateProgress);

// Webhook is mounted directly in server.js with express.raw() for proper HMAC verification

export default router;
