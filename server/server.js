import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import helmet from 'helmet';
import connectDB from './config/db.js';
import { apiLimiter } from './middleware/rateLimiter.js';

// Connect to database
connectDB();

const app = express();

// ── Security Middleware ──
app.use(helmet({
  crossOriginResourcePolicy: { policy: 'cross-origin' },
  crossOriginOpenerPolicy: { policy: 'same-origin-allow-popups' },
  contentSecurityPolicy: false,
}));

// ── CORS Configuration ──
// Build an allowlist from env vars so both local dev and production work.
// CLIENT_URL            = http://localhost:5173      (dev)
// CLIENT_URL_PRODUCTION = https://fwtizon.vercel.app (prod)
const ALLOWED_ORIGINS = [
  process.env.CLIENT_URL,
  process.env.CLIENT_URL_PRODUCTION,
  'http://localhost:5173',
  'http://localhost:3000',
].filter(Boolean); // remove undefined/empty entries

app.use(cors({
  origin: (origin, callback) => {
    // Allow requests with no origin (server-to-server, Postman, curl)
    if (!origin) return callback(null, true);
    if (ALLOWED_ORIGINS.includes(origin)) {
      return callback(null, true);
    }
    return callback(new Error(`CORS: origin '${origin}' not allowed`));
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}));

// ── Razorpay Webhook — MUST be mounted BEFORE express.json() ──
// Razorpay signs the raw HTTP body; express.json() would parse it and
// JSON.stringify(req.body) may differ from the original, breaking HMAC.
import { razorpayWebhook } from './routes/enrollmentController.js';
app.post(
  '/api/enroll/webhook',
  express.raw({ type: 'application/json' }),
  razorpayWebhook
);

// ── Body Parsers ──
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
app.use(cookieParser());

// ── General API Rate Limiter ──
app.use('/api', apiLimiter);

// ── Route Imports ──
import authRoutes from './routes/auth.js';
import courseRoutes from './routes/courses.js';
import enrollmentRoutes from './routes/enrollments.js';
import courseModulesRoutes from './routes/courseModules.js';
import quizRoutes from './routes/quizzes.js';
import extrasRoutes from './routes/extras.js';
import adminRoutes from './routes/admin.js';
import notificationsRoutes from './routes/notifications.js';
import assignmentRoutes from './routes/assignments.js';
import certificateRoutes, { receiptsRouter } from './routes/certificates.js';
import feedbackRoutes from './routes/feedback.js';
import couponRoutes from './routes/coupons.js';

// ── Mount Routers ──
app.use('/api/auth', authRoutes);
app.use('/api/courses', courseRoutes);
app.use('/api/enroll', enrollmentRoutes);
app.use('/api/courses/:courseId/modules', courseModulesRoutes);
app.use('/api/modules', courseModulesRoutes);
app.use('/api/lessons', courseModulesRoutes);
app.use('/api/quizzes', quizRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/notifications', notificationsRoutes);
app.use('/api/assignments', assignmentRoutes);
app.use('/api/certificates', certificateRoutes);
app.use('/api/receipts', receiptsRouter);
app.use('/api/feedback', feedbackRoutes);
app.use('/api/coupons', couponRoutes);
app.use('/api', extrasRoutes);

// ── Health Check ──
app.get('/', (req, res) => {
  res.json({ success: true, message: 'Fwtion LMS API is running' });
});

// ── 404 Handler ──
app.use((req, res) => {
  res.status(404).json({ success: false, message: `Route ${req.originalUrl} not found` });
});

// ── Global Error Handler ──
app.use((err, req, res, _next) => {
  console.error('Server Error:', err.message);

  if (err.code === 'LIMIT_FILE_SIZE') {
    return res.status(400).json({ success: false, message: 'File size exceeds the 10MB limit' });
  }

  const statusCode = res.statusCode && res.statusCode !== 200 ? res.statusCode : 500;
  res.status(statusCode).json({
    success: false,
    message: err.message || 'Internal Server Error',
    stack: process.env.NODE_ENV === 'production' ? undefined : err.stack,
  });
});

// ── Start Server ──
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`✓ Server running on port ${PORT} [${process.env.NODE_ENV || 'development'}]`);
  console.log(`✓ CORS allowed origins: ${ALLOWED_ORIGINS.join(', ')}`);
});
