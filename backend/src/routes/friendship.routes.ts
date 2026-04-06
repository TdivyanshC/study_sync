import { Router } from 'express';
import { friendshipController } from '../controllers/friendship.controller';
import { authMiddleware } from '../middleware/auth.middleware';
import { friendshipRateLimiter } from '../middleware/rateLimit.middleware';

const router = Router();

// Get user's friends
router.get('/', authMiddleware, friendshipController.getFriends.bind(friendshipController));

// Get pending friend requests
router.get('/pending', authMiddleware, friendshipController.getPendingRequests.bind(friendshipController));

// Send friend request
router.post('/request', authMiddleware, friendshipRateLimiter, friendshipController.sendRequest.bind(friendshipController));

// Accept friend request
router.post('/accept', authMiddleware, friendshipRateLimiter, friendshipController.acceptRequest.bind(friendshipController));

// Reject friend request
router.post('/reject', authMiddleware, friendshipRateLimiter, friendshipController.rejectRequest.bind(friendshipController));

// Remove friend
router.delete('/remove', authMiddleware, friendshipRateLimiter, friendshipController.removeFriend.bind(friendshipController));

// Search users
router.get('/search', authMiddleware, friendshipController.searchUsers.bind(friendshipController));

// Discover suggested users
router.get('/discover', authMiddleware, friendshipController.discoverUsers.bind(friendshipController));

export default router;
