import express from 'express';
import {
  createOrder,
  verifyPayment,
  getMyCourses,
  updateProgress,
  razorpayWebhook,
  checkEnrollmentStatus,
} from './enrollmentController.js';
import { protect } from '../middleware/auth.js';

const router = express.Router();

router.get('/status', protect, checkEnrollmentStatus);
router.post('/create-order', protect, createOrder);
router.post('/verify-payment', protect, verifyPayment);
router.get('/my-courses', protect, getMyCourses);
router.put('/progress', protect, updateProgress);

// Razorpay webhook (no auth — verified via signature)
router.post('/webhook', razorpayWebhook);

export default router;
