import rateLimit from 'express-rate-limit';

/**
 * Rate limiter for authentication endpoints.
 * Limits to 10 requests per 15-minute window.
 */
export const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    message: 'Too many authentication attempts. Please try again after 15 minutes.',
  },
});

/**
 * General API rate limiter.
 * 500 req / 15-min window — generous enough for dev hot-reload,
 * still protective in production. Tighten for prod if needed.
 */
export const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 500,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    message: 'Too many requests. Please slow down.',
  },
});

/**
 * Payment-specific rate limiter.
 * 10 req / 15-min window — tight to prevent order flooding
 * and brute-force signature attacks on payment endpoints.
 */
export const paymentLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    message: 'Too many payment requests. Please try again later.',
  },
});
