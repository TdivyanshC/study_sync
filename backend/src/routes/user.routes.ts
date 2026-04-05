import { Router } from 'express';
import { userController } from '../controllers/user.controller';
import { authMiddleware } from '../middleware/auth.middleware';

const router = Router();

// Get user by ID
router.get('/:user_id', userController.getUser.bind(userController));

// Get user by public ID
router.get('/public/:public_id', userController.getUserByPublicId.bind(userController));

// Check username availability
router.get('/username/check', userController.checkUsernameAvailability.bind(userController));

// Search users by username, displayName, or publicUserId
router.get('/search', authMiddleware, userController.searchUsers.bind(userController));

// Complete onboarding (set username)
router.post('/onboarding', authMiddleware, userController.completeOnboarding.bind(userController));

// Create custom session type
router.post('/session-types', authMiddleware, userController.createSessionType.bind(userController));

// Get user's session types
router.get('/session-types', authMiddleware, userController.getSessionTypes.bind(userController));

// Delete session type
router.delete('/session-types/:session_type_id', authMiddleware, userController.deleteSessionType.bind(userController));

export default router;
