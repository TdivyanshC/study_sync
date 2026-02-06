import { Router } from 'express';
import { spaceController } from '../controllers/space.controller';
import { authMiddleware } from '../middleware/auth.middleware';

const router = Router();

// Create a new space
router.post('/', authMiddleware, spaceController.createSpace.bind(spaceController));

// Get user's spaces
router.get('/', authMiddleware, spaceController.getUserSpaces.bind(spaceController));

// Get space by ID
router.get('/:space_id', spaceController.getSpace.bind(spaceController));

// Join a space
router.post('/join', authMiddleware, spaceController.joinSpace.bind(spaceController));

// Get space members
router.get('/:space_id/members', spaceController.getSpaceMembers.bind(spaceController));

// Get space activity
router.get('/:space_id/activity', spaceController.getSpaceActivity.bind(spaceController));

// Get space stats
router.get('/:space_id/stats', spaceController.getSpaceStats.bind(spaceController));

// Delete space (owner only)
router.delete('/:space_id', authMiddleware, spaceController.deleteSpace.bind(spaceController));

export default router;
