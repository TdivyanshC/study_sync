import { Request, Response } from 'express';
import Friendship from '../models/Friendship';
import User from '../models/User';
import { Types } from 'mongoose';

export class FriendshipController {
  /**
   * Get user's friends (accepted)
   */
  async getFriends(req: Request, res: Response): Promise<void> {
    try {
      const userId = (req as any).user?.id;

      if (!userId) {
        res.status(401).json({ error: 'Unauthorized' });
        return;
      }

      // Get friendships where user is requester or receiver and status is accepted
      const friendships = await Friendship.find({
        $or: [{ requesterId: userId }, { receiverId: userId }],
        status: 'accepted'
      }).populate('requesterId', 'id username avatarUrl publicUserId')
        .populate('receiverId', 'id username avatarUrl publicUserId');

      // Transform to flat friend list
      const friends = friendships.map(friendship => {
        const isRequester = friendship.requesterId._id.toString() === userId;
        return isRequester ? friendship.receiverId : friendship.requesterId;
      });

      res.json(friends);
    } catch (error: any) {
      console.error('Get friends error:', error);
      res.status(500).json({ error: `Failed to get friends: ${error.message}` });
    }
  }

  /**
   * Get pending friend requests (received)
   */
  async getPendingRequests(req: Request, res: Response): Promise<void> {
    try {
      const userId = (req as any).user?.id;

      if (!userId) {
        res.status(401).json({ error: 'Unauthorized' });
        return;
      }

      const friendships = await Friendship.find({
        receiverId: userId,
        status: 'pending'
      }).populate('requesterId', 'id username avatarUrl publicUserId');

      res.json(friendships.map(friendship => ({
        id: friendship._id,
        requesterId: friendship.requesterId._id,
        receiverId: friendship.receiverId._id,
        status: friendship.status,
        createdAt: friendship.createdAt,
        updatedAt: friendship.updatedAt,
        requester: {
          id: friendship.requesterId._id,
          username: friendship.requesterId.username,
          avatar_url: friendship.requesterId.avatarUrl,
          public_user_id: friendship.requesterId.publicUserId
        }
      })));
    } catch (error: any) {
      console.error('Get pending requests error:', error);
      res.status(500).json({ error: `Failed to get pending requests: ${error.message}` });
    }
  }

  /**
   * Send friend request
   */
  async sendRequest(req: Request, res: Response): Promise<void> {
    try {
      const userId = (req as any).user?.id;
      const { receiver_id } = req.body;

      if (!userId) {
        res.status(401).json({ error: 'Unauthorized' });
        return;
      }

      if (!receiver_id || typeof receiver_id !== 'string') {
        res.status(400).json({ error: 'Valid receiver_id is required' });
        return;
      }

      if (userId === receiver_id) {
        res.status(400).json({ error: 'Cannot add yourself as friend' });
        return;
      }

      // Validate that receiver exists
      const receiverExists = await User.findById(receiver_id);
      if (!receiverExists) {
        res.status(404).json({ error: 'User not found' });
        return;
      }

      // Check if already friends or request exists
      const existing = await Friendship.findOne({
        $or: [
          { requesterId: userId, receiverId: receiver_id },
          { requesterId: receiver_id, receiverId: userId }
        ],
        status: { $in: ['pending', 'accepted'] }
      });

      if (existing) {
        res.status(400).json({ error: 'Friend request already exists or users are already friends' });
        return;
      }

      const friendship = await Friendship.create({
        requesterId: userId,
        receiverId: receiver_id,
        status: 'pending'
      });

      res.status(201).json({
        id: friendship._id,
        requesterId: friendship.requesterId,
        receiverId: friendship.receiverId,
        status: friendship.status,
        createdAt: friendship.createdAt,
        updatedAt: friendship.updatedAt
      });
    } catch (error: any) {
      console.error('Send request error:', error);
      res.status(500).json({ error: `Failed to send friend request: ${error.message}` });
    }
  }

  /**
   * Accept friend request
   */
  async acceptRequest(req: Request, res: Response): Promise<void> {
    try {
      const userId = (req as any).user?.id;
      const { request_id } = req.body;

      if (!userId) {
        res.status(401).json({ error: 'Unauthorized' });
        return;
      }

      if (!request_id || typeof request_id !== 'string') {
        res.status(400).json({ error: 'Valid request_id is required' });
        return;
      }

      // Verify request belongs to user
      const friendship = await Friendship.findOne({
        _id: request_id,
        receiverId: userId,
        status: 'pending'
      });

      if (!friendship) {
        res.status(404).json({ error: 'Request not found' });
        return;
      }

      friendship.status = 'accepted';
      await friendship.save();

      res.json({
        id: friendship._id,
        requesterId: friendship.requesterId,
        receiverId: friendship.receiverId,
        status: friendship.status,
        createdAt: friendship.createdAt,
        updatedAt: friendship.updatedAt
      });
    } catch (error: any) {
      console.error('Accept request error:', error);
      res.status(500).json({ error: `Failed to accept request: ${error.message}` });
    }
  }

  /**
   * Reject friend request
   */
  async rejectRequest(req: Request, res: Response): Promise<void> {
    try {
      const userId = (req as any).user?.id;
      const { request_id } = req.body;

      if (!userId) {
        res.status(401).json({ error: 'Unauthorized' });
        return;
      }

      if (!request_id || typeof request_id !== 'string') {
        res.status(400).json({ error: 'Valid request_id is required' });
        return;
      }

      const friendship = await Friendship.findOne({
        _id: request_id,
        receiverId: userId,
        status: 'pending'
      });

      if (!friendship) {
        res.status(404).json({ error: 'Request not found' });
        return;
      }

      friendship.status = 'rejected';
      await friendship.save();

      res.json({
        id: friendship._id,
        requesterId: friendship.requesterId,
        receiverId: friendship.receiverId,
        status: friendship.status,
        createdAt: friendship.createdAt,
        updatedAt: friendship.updatedAt
      });
    } catch (error: any) {
      console.error('Reject request error:', error);
      res.status(500).json({ error: `Failed to reject request: ${error.message}` });
    }
  }

  /**
   * Remove friend
   */
  async removeFriend(req: Request, res: Response): Promise<void> {
    try {
      const userId = (req as any).user?.id;
      const { friend_id } = req.body;

      if (!userId) {
        res.status(401).json({ error: 'Unauthorized' });
        return;
      }

      if (!friend_id || typeof friend_id !== 'string') {
        res.status(400).json({ error: 'Valid friend_id is required' });
        return;
      }

      await Friendship.deleteOne({
        status: 'accepted',
        $or: [
          { requesterId: userId, receiverId: friend_id },
          { requesterId: friend_id, receiverId: userId }
        ]
      });

      res.json({ message: 'Friend removed successfully' });
    } catch (error: any) {
      console.error('Remove friend error:', error);
      res.status(500).json({ error: `Failed to remove friend: ${error.message}` });
    }
  }
}

export const friendshipController = new FriendshipController();
