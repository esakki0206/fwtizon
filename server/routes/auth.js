import express from 'express';
import {
  register,
  login,
  googleLogin,
  refreshAccessToken,
  getMe,
  logout,
  forgotPassword,
  resetPassword,
  updateDetails,
  updatePassword,
} from './authController.js';
import { protect } from '../middleware/auth.js';
import { authLimiter, authIpLimiter } from '../middleware/rateLimiter.js';

const router = express.Router();

// Public auth routes — dual-layered rate limiting:
//   1. authIpLimiter  → generous per-IP guard (100 req/15 min)
//   2. authLimiter    → strict per-email guard (15 failed/15 min)
router.post('/register', authIpLimiter, authLimiter, register);
router.post('/login', authIpLimiter, authLimiter, login);
router.post('/google', authIpLimiter, authLimiter, googleLogin);
router.post('/refresh-token', refreshAccessToken);
router.post('/forgotpassword', authIpLimiter, authLimiter, forgotPassword);
router.put('/resetpassword/:resettoken', resetPassword);

// Protected auth routes
router.get('/me', protect, getMe);
router.get('/logout', logout);
router.put('/updatedetails', protect, updateDetails);
router.put('/updatepassword', protect, updatePassword);

export default router;
