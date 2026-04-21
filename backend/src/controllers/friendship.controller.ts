import { Request, Response } from 'express';
import Friendship from '../models/Friendship';
import User from '../models/User';
import { Types } from 'mongoose';
import { statsService } from '../services/stats.service';

export class FriendshipController {
  /**
   * Get user's friends (accepted)
   */
  async getFriends(req: Request, res: Response): Promise<void> {
    try {
      const userId = (req as any).user?.id;

      // For testing - if no auth, return empty friends list
      if (!userId) {
        res.json({
          success: true,
          friends: [],
          total_friends: 0,
          message: "No user authenticated"
        });
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
        const friendUser = isRequester ? friendship.receiverId : friendship.requesterId;
        
        // Return format matching frontend expected FriendListItem
        return {
          user_id: friendUser._id,
          username: friendUser.username,
          display_name: friendUser.displayName,
          avatar_url: friendUser.avatarUrl,
          xp: friendUser.xp || 0,
          level: friendUser.level || 1,
          current_activity: friendUser.currentActivity,
          activity_started_at: friendUser.activityStartedAt,
          total_hours_today: friendUser.totalHoursToday || 0,
          friend_since: friendship.createdAt
        };
      });

      // Return properly formatted response for frontend
      res.json({
        success: true,
        friends,
        total_friends: friends.length,
        message: "Friends loaded successfully"
      });
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

      res.json({
        success: true,
        requests: friendships.map(friendship => ({
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
        })),
        message: 'Pending requests loaded'
      });
    } catch (error: any) {
      console.error('Get pending requests error:', error);
      res.status(500).json({ error: `Failed to get pending requests: ${error.message}` });
    }
  }

  /**
   * Discover suggested users (real users to add as friends)
   */
  async discoverUsers(req: Request, res: Response): Promise<void> {
    try {
      const userId = (req as any).user?.id;
      const { limit = 20 } = req.query;

      if (!userId) {
        res.status(401).json({ error: 'Unauthorized' });
        return;
      }

      // Get existing friendships to exclude
      const friendships = await Friendship.find({
        $or: [{ requesterId: userId }, { receiverId: userId }]
      });

      const excludeIds = new Set([userId]);
      friendships.forEach(f => {
        excludeIds.add(f.requesterId.toString());
        excludeIds.add(f.receiverId.toString());
      });

      // Find random active users that are not already friends
      const users = await User.aggregate([
        { $match: { _id: { $nin: Array.from(excludeIds).map(id => new Types.ObjectId(id as string)) } } },
        { $sample: { size: Number(limit) } },
        { $project: { username: 1, displayName: 1, avatarUrl: 1, xp: 1, level: 1 } }
      ]);

      const results = users.map(user => ({
        user_id: user._id,
        username: user.username,
        display_name: user.displayName,
        avatar_url: user.avatarUrl,
        xp: user.xp || 0,
        level: user.level || 1,
        is_friend: false
      }));

      res.json({
        success: true,
        results,
        total_found: users.length,
        message: `Found ${users.length} suggested users`
      });

    } catch (error: any) {
      console.error('Discover users error:', error);
      res.status(500).json({ error: `Failed to discover users: ${error.message}` });
    }
  }

  /**
   * Search users by username
   */
  async searchUsers(req: Request, res: Response): Promise<void> {
    try {
      const userId = (req as any).user?.id;
      const { query, limit = 10 } = req.query;

      if (!userId) {
        res.status(401).json({ error: 'Unauthorized' });
        return;
      }

      if (!query || typeof query !== 'string' || query.trim().length < 2) {
        res.status(400).json({ error: 'Search query must be at least 2 characters' });
        return;
      }

      const searchRegex = new RegExp(query.trim(), 'i');
      
      // Find users matching username or display name
      const users = await User.find({
        $and: [
          { _id: { $ne: userId } },
          {
            $or: [
              { username: searchRegex },
              { displayName: searchRegex }
            ]
          }
        ]
      })
      .select('id username displayName avatarUrl xp level publicUserId')
      .limit(Number(limit));

      // Get existing friendships for current user
      const friendships = await Friendship.find({
        $or: [{ requesterId: userId }, { receiverId: userId }]
      });

      // Mark which users are already friends
      const friendIds = new Set();
      friendships.forEach(f => {
        friendIds.add(f.requesterId.toString());
        friendIds.add(f.receiverId.toString());
      });

      const results = users.map(user => ({
        user_id: user._id,
        username: user.username,
        display_name: user.displayName,
        avatar_url: user.avatarUrl,
        xp: user.xp || 0,
        level: user.level || 1,
        is_friend: friendIds.has(user._id.toString())
      }));

      res.json({
        success: true,
        query: query,
        results,
        total_found: users.length,
        message: `Found ${users.length} users`
      });

    } catch (error: any) {
      console.error('Search users error:', error);
      res.status(500).json({ error: `Failed to search users: ${error.message}` });
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
        success: true,
        friend_id: friendship._id,
        status: friendship.status,
        message: 'Friend request sent successfully'
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
        success: true,
        id: friendship._id,
        status: friendship.status,
        message: 'Friend request accepted'
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
        success: true,
        id: friendship._id,
        status: friendship.status,
        message: 'Friend request rejected'
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

   /**
    * Get friend statistics for the authenticated user
    */
   async getFriendStats(req: Request, res: Response): Promise<void> {
     try {
       const userId = (req as any).user?.id;

       if (!userId) {
         res.status(401).json({ error: 'Unauthorized' });
         return;
       }

       // Get all accepted friendships
       const friendships = await Friendship.find({
         $or: [{ requesterId: userId }, { receiverId: userId }],
         status: 'accepted'
       });

       const friendIds = friendships.map(f => 
         f.requesterId.toString() === userId ? f.receiverId : f.requesterId
       );

       // Get friend user data to check activity
       const friends = await User.find({
         _id: { $in: friendIds }
       }).select('currentActivity activityStartedAt totalHoursToday');

       const now = new Date();
       const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());

       // Calculate stats
       const totalFriends = friendIds.length;
       const activeFriendsToday = friends.filter(f => 
         f.totalHoursToday > 0
       ).length;
       const friendsStudyingNow = friends.filter(f => 
         f.currentActivity && f.currentActivity.includes('study')
       ).length;
       const friendsInGymNow = friends.filter(f => 
         f.currentActivity && (f.currentActivity.includes('gym') || f.currentActivity.includes('workout'))
       ).length;
       const friendsCodingNow = friends.filter(f => 
         f.currentActivity && f.currentActivity.includes('code')
       ).length;

       res.json({
         success: true,
         stats: {
           total_friends: totalFriends,
           active_friends_today: activeFriendsToday,
           friends_studying_now: friendsStudyingNow,
           friends_in_gym_now: friendsInGymNow,
           friends_coding_now: friendsCodingNow
         }
       });
     } catch (error: any) {
       console.error('Get friend stats error:', error);
       res.status(500).json({ error: `Failed to get friend stats: ${error.message}` });
     }
   }

   /**
    * Get detailed profile of a friend
    */
   async getFriendProfile(req: Request, res: Response): Promise<void> {
     try {
       const userId = (req as any).user?.id;
       const { friendUserId } = req.params;

       if (!userId) {
         res.status(401).json({ error: 'Unauthorized' });
         return;
       }

       if (!friendUserId || typeof friendUserId !== 'string') {
         res.status(400).json({ error: 'Valid friendUserId is required' });
         return;
       }

       // Verify they are actually friends
       const friendship = await Friendship.findOne({
         $or: [
           { requesterId: userId, receiverId: friendUserId },
           { requesterId: friendUserId, receiverId: userId }
         ],
         status: 'accepted'
       });

       if (!friendship) {
         res.status(404).json({ error: 'Friend not found or not accepted' });
         return;
       }

       // Get friend's full profile
       const friend = await User.findById(friendUserId)
         .select('id username displayName avatarUrl xp level currentActivity activityStartedAt totalHoursToday publicUserId onboardingCompleted onboardingCompletedAt createdAt');

       if (!friend) {
         res.status(404).json({ error: 'User not found' });
         return;
       }

       // Get friend's streak data
       const streakData = await statsService.getStreakData(friendUserId);

       res.json({
         success: true,
         friend: {
           id: friend._id,
           user_id: friend._id,
           username: friend.username,
           display_name: friend.displayName,
           avatar_url: friend.avatarUrl,
           xp: friend.xp || 0,
           level: friend.level || 1,
           streak_count: streakData.current_streak,
           current_activity: friend.currentActivity,
           activity_started_at: friend.activityStartedAt,
           total_hours_today: friend.totalHoursToday || 0,
           friend_since: friendship.createdAt,
           status: friendship.status
         }
       });
     } catch (error: any) {
       console.error('Get friend profile error:', error);
       res.status(500).json({ error: `Failed to get friend profile: ${error.message}` });
     }
   }

   /**
    * Update user's current activity
    */
   async updateUserActivity(req: Request, res: Response): Promise<void> {
     try {
       const userId = (req as any).user?.id;
       const { activity } = req.body;

       if (!userId) {
         res.status(401).json({ error: 'Unauthorized' });
         return;
       }

       if (!activity || typeof activity !== 'string') {
         res.status(400).json({ error: 'Valid activity is required' });
         return;
       }

       // Update user's activity
       const updateData: any = { currentActivity: activity };
       
       // If activity is empty/neutral, clear started_at
       if (activity === 'available' || activity === '' || !activity) {
         updateData.activityStartedAt = null;
       } else {
         updateData.activityStartedAt = new Date();
       }

       const user = await User.findByIdAndUpdate(
         userId,
         updateData,
         { new: true }
       ).select('currentActivity activityStartedAt');

       if (!user) {
         res.status(404).json({ error: 'User not found' });
         return;
       }

       res.json({
         success: true,
         user_id: userId,
         activity: {
           current_activity: user.currentActivity,
           activity_started_at: user.activityStartedAt
         }
       });
     } catch (error: any) {
       console.error('Update user activity error:', error);
       res.status(500).json({ error: `Failed to update activity: ${error.message}` });
     }
   }

   /**
    * Get activity feed of friends
    */
   async getFriendActivityFeed(req: Request, res: Response): Promise<void> {
     try {
       const userId = (req as any).user?.id;
       const { limit = 20 } = req.query;

       if (!userId) {
         res.status(401).json({ error: 'Unauthorized' });
         return;
       }

       // Get user's accepted friendships
       const friendships = await Friendship.find({
         $or: [{ requesterId: userId }, { receiverId: userId }],
         status: 'accepted'
       });

       const friendIds = friendships.map(f => 
         f.requesterId.toString() === userId ? f.receiverId : f.requesterId
       );

       // Get recent session events from friends
       // This would typically come from a SessionEvent collection
       // For now, return friend activity based on their current status
       const friends = await User.find({
         _id: { $in: friendIds },
         currentActivity: { $exists: true, $ne: null }
       })
       .select('username displayName avatarUrl currentActivity activityStartedAt totalHoursToday')
       .sort({ activityStartedAt: -1 })
       .limit(Number(limit));

       const activities = friends.map(friend => ({
         friend_user_id: friend._id,
         friend_name: friend.displayName || friend.username,
         activity_type: friend.currentActivity || 'unknown',
         activity_description: friend.currentActivity ? 
           friend.currentActivity.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase()) : 'Unknown',
         hours_spent: friend.totalHoursToday || 0,
         timestamp: friend.activityStartedAt || new Date()
       }));

       res.json({
         success: true,
         activities,
         total_activities: activities.length
       });
     } catch (error: any) {
       console.error('Get friend activity feed error:', error);
       res.status(500).json({ error: `Failed to get activity feed: ${error.message}` });
     }
   }
 }

export const friendshipController = new FriendshipController();
