import rateLimit from "express-rate-limit";

/**
 * Global rate limiter — applied to ALL routes.
 *
 * Allows 100 requests per 15 minutes per IP.
 * Adjust `max` and `windowMs` based on your API's expected traffic.
 */
export const globalRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100,
  standardHeaders: true, // Returns RateLimit-* headers (RFC 6585)
  legacyHeaders: false,  // Disables X-RateLimit-* headers
  message: {
    success: false,
    message: "Too many requests from this IP. Please try again in 15 minutes.",
  },
  skipSuccessfulRequests: false,
});

/**
 * Strict rate limiter — applied to sensitive auth routes (login, register).
 *
 * Allows only 10 requests per 15 minutes per IP to slow down brute-force attacks.
 */
export const authRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    message: "Too many authentication attempts. Please try again in 15 minutes.",
  },
  skipSuccessfulRequests: false,
});
