import { Router } from 'express';
import { userController } from '../controllers/user.controller';
import { authMiddleware } from '../middleware/auth.middleware';

const router = Router();

// Get user by ID
router.get('/:user_id', userController.getUser.bind(userController));

// Get user by public ID
router.get('/public/:public_id', userController.getUserByPublicId.bind(userController));

// Complete onboarding (set username)
router.post('/onboarding', authMiddleware, userController.completeOnboarding.bind(userController));

export default router;
