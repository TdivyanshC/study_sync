import { Router } from 'express';
import { userController } from '../controllers/user.controller';
import { authMiddleware } from '../middleware/auth.middleware';

const router = Router();

// Complete onboarding - this is the main endpoint frontend calls
router.post('/complete', authMiddleware, userController.completeOnboarding.bind(userController));

export default router;
