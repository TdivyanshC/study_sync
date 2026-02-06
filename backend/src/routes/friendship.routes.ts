import { Router } from 'express';
import { friendshipController } from '../controllers/friendship.controller';
import { authMiddleware } from '../middleware/auth.middleware';

const router = Router();

// Get user's friends
router.get('/', authMiddleware, friendshipController.getFriends.bind(friendshipController));

// Get pending friend requests
router.get('/pending', authMiddleware, friendshipController.getPendingRequests.bind(friendshipController));

// Send friend request
router.post('/request', authMiddleware, friendshipController.sendRequest.bind(friendshipController));

// Accept friend request
router.post('/accept', authMiddleware, friendshipController.acceptRequest.bind(friendshipController));

// Reject friend request
router.post('/reject', authMiddleware, friendshipController.rejectRequest.bind(friendshipController));

// Remove friend
router.delete('/remove', authMiddleware, friendshipController.removeFriend.bind(friendshipController));

export default router;
