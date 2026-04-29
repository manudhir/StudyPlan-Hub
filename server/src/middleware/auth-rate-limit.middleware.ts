import rateLimit from 'express-rate-limit';

export const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // 5 attempts per window
  skipSuccessfulRequests: true, // Don't count successful requests
  keyGenerator: (req) => {
    // Use email if available (from body), otherwise use IP
    return req.body?.email || req.ip || '';
  },
  handler: (req, res) => {
    res.status(429).json({
      success: false,
      error: 'Too many login attempts',
      message: 'Too many login attempts. Please try again in 15 minutes.',
      timestamp: new Date().toISOString(),
    });
  },
  standardHeaders: false,
  legacyHeaders: false,
});
