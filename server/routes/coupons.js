import express from 'express';
import { validateCoupon } from './couponController.js';
import { protect } from '../middleware/auth.js';

const router = express.Router();

/**
 * @route POST /api/coupons/validate
 * @desc  Validate a coupon code for a specific course.
 *        Returns price breakdown. Does NOT increment usedCount.
 * @access Private (any authenticated user)
 */
router.post('/validate', protect, validateCoupon);

export default router;
