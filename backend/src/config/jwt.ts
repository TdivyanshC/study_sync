import jwt from 'jsonwebtoken';
import { config } from './env';

/**
 * Generate JWT token for authenticated user
 */
export const generateToken = (userId: string, email: string): string => {
  return jwt.sign(
    { userId, email },
    config.JWT_SECRET,
    { expiresIn: config.JWT_EXPIRES_IN }
  );
};

/**
 * Verify JWT token
 */
export const verifyToken = (token: string): { userId: string; email: string } | null => {
  try {
    const decoded = jwt.verify(token, config.JWT_SECRET) as { userId: string; email: string };
    return decoded;
  } catch (error) {
    return null;
  }
};

/**
 * Extract token from Authorization header
 */
export const extractToken = (authHeader: string | undefined): string | null => {
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return null;
  }
  return authHeader.split(' ')[1];
};