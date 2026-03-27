import { Request, Response, NextFunction } from 'express';
import { config } from '../config/env';
import { verifyToken, extractToken } from '../config/jwt';

export interface AuthAuthenticatedRequest extends Request {
  user?: {
    id: string;
    email: string;
  };
}

/**
 * Auth middleware - verifies JWT token
 * For development, allows bypass with X-Dev-User-Id header
 */
export async function authMiddleware(
  req: AuthAuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    // Development bypass
    if (config.NODE_ENV === 'development' && req.headers['x-dev-user-id']) {
      req.user = {
        id: req.headers['x-dev-user-id'] as string,
        email: 'dev@example.com',
      };
      next();
      return;
    }

    // Get token from Authorization header
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      res.status(401).json({ error: 'Missing or invalid authorization header' });
      return;
    }

    const token = extractToken(authHeader);
    if (!token) {
      res.status(401).json({ error: 'Missing or invalid authorization header' });
      return;
    }

    // Verify JWT token
    const customPayload = verifyToken(token);
    if (customPayload) {
      req.user = {
        id: customPayload.userId,
        email: customPayload.email,
      };
      next();
      return;
    }

    // Token invalid
    res.status(401).json({ error: 'Invalid or expired token' });
    return;
  } catch (error) {
    console.error('Auth middleware error:', error);
    res.status(500).json({ error: 'Authentication failed' });
  }
}

/**
 * Optional auth middleware - sets user if token present, but doesn't require it
 */
export async function optionalAuthMiddleware(
  req: AuthAuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      next();
      return;
    }

    const token = extractToken(authHeader);
    if (!token) {
      next();
      return;
    }

    // Verify JWT token
    const customPayload = verifyToken(token);
    if (customPayload) {
      req.user = {
        id: customPayload.userId,
        email: customPayload.email,
      };
    }

    next();
  } catch (error) {
    next();
  }
}
