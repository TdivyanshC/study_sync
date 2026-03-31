import rateLimit from 'express-rate-limit';
import { Request, Response } from 'express';
import { config } from '../config/env';

// General API rate limiter
export const apiRateLimiter = rateLimit({
  windowMs: config.RATE_LIMIT_WINDOW_MS,
  max: config.RATE_LIMIT_MAX_REQUESTS,
  message: { error: 'Too many requests, please try again later' },
  standardHeaders: true,
  legacyHeaders: false,
});

// Stricter rate limiter for auth endpoints - increased from 10 to 30 to prevent blocking legitimate users
export const authRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 30, // 30 attempts per window (increased from 10)
  message: { error: 'Too many auth attempts, please try again later' },
  standardHeaders: true,
  legacyHeaders: false,
});

// Rate limiter for session creation
export const sessionRateLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 30, // 30 sessions per minute
  message: { error: 'Too many session requests' },
  standardHeaders: true,
  legacyHeaders: false,
});

// Skip rate limiter for health checks
export const skipRateLimiter = (req: Request, res: Response): boolean => {
  return req.path === '/health' || req.path === '/api/health';
};
