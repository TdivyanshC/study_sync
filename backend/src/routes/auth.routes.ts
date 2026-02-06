import { Router } from 'express';
import { authController } from '../controllers/auth.controller';
import { authMiddleware } from '../middleware/auth.middleware';

const router = Router();

// Auth callback - sync user on first login
router.post('/callback', authController.handleAuthCallback.bind(authController));

// Get current user profile
router.get('/profile', authMiddleware, authController.getProfile.bind(authController));

// Update current user profile
router.patch('/profile', authMiddleware, authController.updateProfile.bind(authController));

export default router;
