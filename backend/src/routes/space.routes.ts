import { Router } from 'express';
import { spaceController } from '../controllers/space.controller';
import { authMiddleware } from '../middleware/auth.middleware';

const router = Router();

router.post('/', authMiddleware, spaceController.createSpace.bind(spaceController));
router.get('/', authMiddleware, spaceController.getUserSpaces.bind(spaceController));
router.get('/:space_id', spaceController.getSpace.bind(spaceController));
router.post('/join', authMiddleware, spaceController.joinSpace.bind(spaceController));
router.post('/join-by-code', authMiddleware, spaceController.joinByInviteCode.bind(spaceController));
router.post('/:space_id/regenerate-code', authMiddleware, spaceController.regenerateInviteCode.bind(spaceController));
router.post('/:space_id/leave', authMiddleware, spaceController.leaveSpace.bind(spaceController));
router.delete('/:space_id/members', authMiddleware, spaceController.removeMember.bind(spaceController));
router.get('/:space_id/members', spaceController.getSpaceMembers.bind(spaceController));
router.get('/:space_id/activity', spaceController.getSpaceActivity.bind(spaceController));
router.get('/:space_id/stats', spaceController.getSpaceStats.bind(spaceController));
router.delete('/:space_id', authMiddleware, spaceController.deleteSpace.bind(spaceController));

export default router;
