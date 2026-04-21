import { Request, Response } from 'express';
import User from '../models/User';
import Friendship from '../models/Friendship';
import { statsService } from '../services/stats.service';

export class PublicProfileController {
  async getPublicProfile(req: Request, res: Response): Promise<void> {
    try {
      const { user_id } = req.params;
      const currentUserId = (req as any)?.user?.id;

      // Find target user
      const user = await User.findById(user_id)
        .select('id username displayName avatarUrl xp level currentActivity activityStartedAt totalHoursToday');

      if (!user) {
        res.status(404).json({ error: 'User not found' });
        return;
      }

      // Get streak data
      const streakData = await statsService.getStreakData(user_id);

      // Build base profile
      const profile: any = {
        id: user._id,
        user_id: user._id,
        username: user.username,
        display_name: user.displayName,
        avatar_url: user.avatarUrl,
        xp: user.xp || 0,
        level: user.level || 1,
        streak_count: streakData.current_streak || 0,
        current_activity: user.currentActivity,
        activity_started_at: user.activityStartedAt,
        total_hours_today: user.totalHoursToday || 0,
        is_friend: false,
        relationship_status: 'none' as 'none' | 'friend' | 'pending_sent' | 'pending_received' | 'own_profile',
        friend_since: null
      };

      // If viewing own profile
      if (currentUserId && currentUserId === user_id) {
        profile.relationship_status = 'own_profile';
      } else if (currentUserId) {
        // Check friendship status only if viewing another user
        const friendships = await Friendship.find({
          $or: [
            { requesterId: currentUserId, receiverId: user_id },
            { requesterId: user_id, receiverId: currentUserId }
          ]
        });

        let acceptedFriendship: any = null;
        let pendingSent: any = null;
        let pendingReceived: any = null;

        friendships.forEach((f: any) => {
          if (f.status === 'accepted') {
            acceptedFriendship = f;
          } else if (f.status === 'pending') {
            if (f.requesterId.toString() === currentUserId) {
              pendingSent = f;
            } else {
              pendingReceived = f;
            }
          }
        });

        if (acceptedFriendship) {
          profile.is_friend = true;
          profile.relationship_status = 'friend';
          profile.friend_since = acceptedFriendship.createdAt;
        } else if (pendingSent) {
          profile.relationship_status = 'pending_sent';
          profile.friendship_id = pendingSent._id;
        } else if (pendingReceived) {
          profile.relationship_status = 'pending_received';
          profile.friendship_id = pendingReceived._id;
        }
      }

      res.json({ success: true, user: profile });
    } catch (error: any) {
      console.error('Get public profile error:', error);
      res.status(500).json({ error: `Failed to get public profile: ${error.message}` });
    }
  }
}

export const publicProfileController = new PublicProfileController();
