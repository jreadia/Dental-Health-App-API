import rateLimit from 'express-rate-limit';

const skipIfTest = () => process.env.NODE_ENV === 'test';

// Global rate limiter for standard API requests
export const globalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // Limit each IP to 100 requests per `window` (per 15 minutes)
  message: 'Too many requests from this IP, please try again after 15 minutes',
  standardHeaders: true,
  legacyHeaders: false,
  skip: skipIfTest
});

// Stricter rate limiter for authentication routes
export const authLimiter = rateLimit({
  windowMs: 5 * 60 * 1000, // 5 minutes
  max: 5, // Limit each IP to 5 requests per `window` (per 5 minutes)
  message: 'Too many login attempts from this IP, please try again after 5 minutes',
  standardHeaders: true,
  legacyHeaders: false,
  skip: skipIfTest
});

// Stricter rate limiter for ML route
export const mlLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 50, // Limit each IP to 50 requests per `window` (per 15 minutes)
  message: 'Too many image analysis requests from this IP, please try again after 15 minutes',
  standardHeaders: true,
  legacyHeaders: false,
  skip: skipIfTest
});
