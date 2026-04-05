import rateLimit from 'express-rate-limit';
import { Request, Response } from 'express';
import { config } from '../config/env';

// Skip function for rate limiter - returns true to skip rate limiting
const shouldSkipRateLimit = (req: Request): boolean => {
  return req.path === '/health' || req.path === '/api/health';
};

// General API rate limiter
export const apiRateLimiter = rateLimit({
  windowMs: config.RATE_LIMIT_WINDOW_MS,
  max: config.RATE_LIMIT_MAX_REQUESTS,
  message: { error: 'Too many requests, please try again later' },
  standardHeaders: true,
  legacyHeaders: false,
  skip: shouldSkipRateLimit,
});

// Stricter rate limiter for auth endpoints - increased from 10 to 30 to prevent blocking legitimate users
export const authRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 30, // 30 attempts per window (increased from 10)
  message: { error: 'Too many auth attempts, please try again later' },
  standardHeaders: true,
  legacyHeaders: false,
  skip: shouldSkipRateLimit,
});

// Rate limiter for session creation
export const sessionRateLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 30, // 30 sessions per minute
  message: { error: 'Too many session requests' },
  standardHeaders: true,
  legacyHeaders: false,
});

// Rate limiter for friendship actions
export const friendshipRateLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 20, // 20 friendship actions per minute
  message: { error: 'Too many friendship requests, please try again later' },
  standardHeaders: true,
  legacyHeaders: false,
});
