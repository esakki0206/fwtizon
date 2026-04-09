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
import { authLimiter } from '../middleware/rateLimiter.js';

const router = express.Router();

// Public auth routes (rate limited)
router.post('/register', authLimiter, register);
router.post('/login', authLimiter, login);
router.post('/google', authLimiter, googleLogin);
router.post('/refresh-token', refreshAccessToken);
router.post('/forgotpassword', authLimiter, forgotPassword);
router.put('/resetpassword/:resettoken', resetPassword);

// Protected auth routes
router.get('/me', protect, getMe);
router.get('/logout', logout);
router.put('/updatedetails', protect, updateDetails);
router.put('/updatepassword', protect, updatePassword);

export default router;
