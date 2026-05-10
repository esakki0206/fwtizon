import rateLimit from 'express-rate-limit';

// ─────────────────────────────────────────────────
// KEY GENERATORS
// ─────────────────────────────────────────────────

/**
 * Extract a stable user identifier from the auth request body.
 * Falls back to IP when no identifier is present (shouldn't happen
 * for well-formed login/register requests).
 */
const authKeyGenerator = (req) => {
  const email = req.body?.email;
  if (email) {
    return `auth:${email.toLowerCase().trim()}`;
  }

  // Google login uses a credential token — key by IP for those
  // (the token changes each time so it can't be used as a key)
  const credential = req.body?.credential;
  if (credential) {
    return `auth:google:${req.ip}`;
  }

  return `auth:ip:${req.ip}`;
};

/**
 * Key by authenticated user ID for payment endpoints.
 * Falls back to IP if somehow unauthenticated (shouldn't happen
 * since payment routes use `protect` middleware).
 */
const userKeyGenerator = (req) => {
  if (req.user?.id) {
    return `user:${req.user.id}`;
  }
  return `ip:${req.ip}`;
};

// ─────────────────────────────────────────────────
// AUTH RATE LIMITER  (per-email / per-credential)
// ─────────────────────────────────────────────────
/**
 * Limits authentication attempts PER EMAIL ADDRESS (not per IP).
 *
 * Why: When 300+ students log in simultaneously they may share the
 * same IP (e.g. behind a college network, NAT, or Vercel edge proxy).
 * Keying by email means only repeated failed attempts on THE SAME
 * account are throttled — legitimate students are never blocked.
 *
 * - 15 failed attempts per email per 15-minute window
 * - Successful logins (2xx) don't count toward the limit
 */
export const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,           // 15 minutes
  max: 15,                             // 15 failed attempts per key
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: authKeyGenerator,
  skipSuccessfulRequests: true,        // don't count 2xx responses
  message: {
    success: false,
    message: 'Too many failed login attempts for this account. Please try again after 15 minutes.',
  },
});

// ─────────────────────────────────────────────────
// IP BRUTE-FORCE LIMITER  (per-IP, generous)
// ─────────────────────────────────────────────────
/**
 * A secondary, IP-based guard that stops a single IP from
 * spraying credentials across MANY different accounts.
 *
 * 100 auth requests per 15-min window per IP — generous enough
 * for a college lab of 300 students sharing one public IP,
 * but catches true brute-force scanners.
 */
export const authIpLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  standardHeaders: true,
  legacyHeaders: false,
  skipSuccessfulRequests: true,
  message: {
    success: false,
    message: 'Too many authentication requests from this network. Please try again later.',
  },
});

// ─────────────────────────────────────────────────
// GENERAL API RATE LIMITER  (per-IP)
// ─────────────────────────────────────────────────
/**
 * 1000 req / 15-min window per IP.
 * Generous enough for SPAs that make many API calls per page,
 * and for scenarios where many users share a single IP.
 */
export const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 1000,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    message: 'Too many requests. Please slow down.',
  },
});

// ─────────────────────────────────────────────────
// PAYMENT RATE LIMITER  (per-user, not per-IP)
// ─────────────────────────────────────────────────
/**
 * Limits payment requests PER AUTHENTICATED USER.
 *
 * 15 requests per 15-min window per user.
 * Only failed requests count, so a successful payment
 * flow doesn't eat into the budget.
 *
 * Keying by user ID instead of IP ensures students behind
 * the same network don't block each other.
 */
export const paymentLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 15,
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: userKeyGenerator,
  skipSuccessfulRequests: true,
  message: {
    success: false,
    message: 'Too many payment requests. Please try again later.',
  },
});
