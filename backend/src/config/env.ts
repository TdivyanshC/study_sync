// Environment configuration
import crypto from 'crypto';

export const config = {
  // Server
  PORT: parseInt(process.env.PORT || '3000', 10),
  NODE_ENV: process.env.NODE_ENV || 'development',
  
  // MongoDB URI (required)
  MONGODB_URI: process.env.MONGODB_URI || '',
  
  // JWT Configuration for Google Sign-In
  JWT_SECRET: process.env.JWT_SECRET || crypto.randomBytes(64).toString('hex'),
  JWT_EXPIRES_IN: process.env.JWT_EXPIRES_IN || '7d',
  
  // Google OAuth
  GOOGLE_CLIENT_ID: process.env.GOOGLE_CLIENT_ID || '944168135230-i3dv0ar7uq7vubv9i03bq5o0nq2deh1j.apps.googleusercontent.com',
  GOOGLE_CLIENT_SECRET: process.env.GOOGLE_CLIENT_SECRET || '',
  
  // Rate limiting
  RATE_LIMIT_WINDOW_MS: 15 * 60 * 1000, // 15 minutes
  RATE_LIMIT_MAX_REQUESTS: 100, // per window
  
  // CORS
  CORS_ORIGIN: process.env.CORS_ORIGIN || '*',
};
