import { Request, Response } from 'express';
import User from '../models/User';
import SessionType from '../models/SessionType';

interface OnboardingData {
  step1_data: {
    gender?: string;
    age?: string;
    relationship?: string;
  };
  step2_data: {
    preferred_sessions?: string[];
  };
  display_name?: string;
  username?: string;
}

interface SessionTypeData {
  userId: string;
  name: string;
  icon: string;
  color: string;
}

export class UserController {
  /**
   * Get user by ID
   */
  async getUser(req: Request, res: Response): Promise<void> {
    try {
      const { user_id } = req.params;

      const user = await User.findById(user_id);

      if (!user) {
        res.status(404).json({ error: 'User not found' });
        return;
      }

      res.json(user);
    } catch (error: any) {
      console.error('Get user error:', error);
      res.status(500).json({ error: `Failed to get user: ${error.message}` });
    }
  }

  /**
   * Get user by public_user_id
   */
  async getUserByPublicId(req: Request, res: Response): Promise<void> {
    try {
      const { public_id } = req.params;

      const user = await User.findOne({ publicUserId: public_id });

      if (!user) {
        res.status(404).json({ error: 'User not found' });
        return;
      }

      res.json(user);
    } catch (error: any) {
      console.error('Get user by public id error:', error);
      res.status(500).json({ error: `Failed to get user: ${error.message}` });
    }
  }

  /**
   * Complete onboarding - handles full onboarding data including username, gender, sessions
   */
  async completeOnboarding(req: Request, res: Response): Promise<void> {
    try {
      const userId = (req as any).user?.id;
      const onboardingData: OnboardingData = req.body;

      if (!userId) {
        res.status(401).json({ error: 'Unauthorized' });
        return;
      }

      // Validate required fields
      if (!onboardingData.step1_data) {
        res.status(400).json({ error: 'Missing step1_data' });
        return;
      }

      console.log('📝 Completing onboarding for user:', userId);

      // Use provided username or generate from display_name or email, or use fallback
      const username = onboardingData.username ||
        (onboardingData.display_name
          ? onboardingData.display_name.toLowerCase().replace(/[^a-zA-Z0-9_]/g, '_') + '_' + userId.substring(0, 6)
          : 'user_' + userId.substring(0, 8));

      // Check if username already exists (case insensitive)
      const escapedUsername = username.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const existingUsername = await User.findOne({
        username: { $regex: `^${escapedUsername}$`, $options: 'i' },
        _id: { $ne: userId } // Exclude current user
      });

      if (existingUsername) {
        res.status(409).json({ error: 'This username is already taken' });
        return;
      }

      // Generate public_user_id (7 characters starting with U)
      let publicUserId;
      let existingPublicId;
      do {
        publicUserId = 'U' + Math.random().toString(36).substring(2, 8).toUpperCase().slice(0, 6);
        existingPublicId = await User.findOne({ publicUserId });
      } while (existingPublicId);

      // Prepare user update/insert data
      const userUpdateData: any = {
        username: username,
        publicUserId: publicUserId,
        onboardingCompleted: true,
        onboardingCompletedAt: new Date(),
      };

      // Add optional fields if provided
      if (onboardingData.display_name) {
        userUpdateData.displayName = onboardingData.display_name;
      }
      if (onboardingData.step1_data.gender) {
        userUpdateData.gender = onboardingData.step1_data.gender;
      }
      if (onboardingData.step1_data.age) {
        userUpdateData.age = parseInt(onboardingData.step1_data.age) || null;
      }
      if (onboardingData.step1_data.relationship) {
        userUpdateData.relationshipStatus = onboardingData.step1_data.relationship;
      }
      if (onboardingData.step2_data?.preferred_sessions) {
        userUpdateData.preferredSessions = onboardingData.step2_data.preferred_sessions;
      }

      // First, check if user record exists
      let existingUser = await User.findById(userId);

      let updatedUser;

      if (existingUser) {
        // Update existing user
        console.log('📝 Updating existing user record');
        updatedUser = await User.findByIdAndUpdate(
          userId,
          userUpdateData,
          { new: true, runValidators: true }
        );
      } else {
        // Insert new user record
        console.log('📝 Creating new user record');
        updatedUser = await User.create({
          _id: userId,
          ...userUpdateData
        });
      }

      console.log('✅ User record saved:', updatedUser?._id);

      // Create session types for selected sessions
      if (onboardingData.step2_data?.preferred_sessions && onboardingData.step2_data.preferred_sessions.length > 0) {
        await this.createSessionTypesForUser(userId, onboardingData.step2_data.preferred_sessions);
      }

      res.json({ 
        success: true, 
        user: updatedUser,
        message: 'Onboarding completed successfully'
      });
    } catch (error: any) {
      console.error('❌ Complete onboarding error:', error);
      if (error.code === 11000) {
        if (error.keyPattern?.username) {
          res.status(409).json({ error: 'This username is already taken' });
        } else if (error.keyPattern?.publicUserId) {
          res.status(409).json({ error: 'Public ID conflict, please try again' });
        } else {
          res.status(409).json({ error: 'Duplicate entry error' });
        }
      } else {
        res.status(500).json({ error: `Failed to complete onboarding: ${error.message}` });
      }
    }
  }

  /**
   * Helper function to create session types for a user
   * Time Complexity: O(n) where n = number of session types
   * Space Complexity: O(n) for storing session types
   */
  private async createSessionTypesForUser(userId: string, sessionIds: string[]): Promise<void> {
    const sessionTypeMap: Record<string, { name: string; icon: string; color: string }> = {
      'gym': { name: 'Gym Session', icon: '💪', color: '#ff6b35' },
      'meditation': { name: 'Meditation', icon: '🧘', color: '#8b5cf6' },
      'coding': { name: 'Coding', icon: '💻', color: '#06d6a0' },
      'cricket': { name: 'Cricket', icon: '🏏', color: '#fbbf24' },
      'singing': { name: 'Singing', icon: '🎤', color: '#ec4899' },
      'study': { name: 'Study Session', icon: '📚', color: '#3b82f6' },
      'yoga': { name: 'Yoga', icon: '🧘‍♀️', color: '#10b981' },
      'reading': { name: 'Reading', icon: '📖', color: '#6366f1' },
      'writing': { name: 'Writing', icon: '✍️', color: '#f59e0b' },
      'music': { name: 'Music Practice', icon: '🎵', color: '#8b5cf6' },
      'gaming': { name: 'Gaming', icon: '🎮', color: '#ef4444' },
      'cooking': { name: 'Cooking', icon: '👨‍🍳', color: '#f97316' },
    };

    const sessionTypesToInsert: SessionTypeData[] = sessionIds
      .filter(id => sessionTypeMap[id])
      .map(id => ({
        userId: userId,
        name: sessionTypeMap[id].name,
        icon: sessionTypeMap[id].icon,
        color: sessionTypeMap[id].color,
      }));

    if (sessionTypesToInsert.length > 0) {
      // Use insertMany with ordered: false to continue even if some fail
      try {
        await SessionType.insertMany(sessionTypesToInsert, { ordered: false });
      } catch (error) {
        // Don't fail onboarding if session types fail
        console.error('Error creating session types:', error);
      }
    }
  }

  /**
   * Create a custom session type for a user
   */
  async createSessionType(req: Request, res: Response): Promise<void> {
    try {
      const userId = (req as any).user?.id;
      const { name, icon, color } = req.body;

      if (!userId) {
        res.status(401).json({ error: 'Unauthorized' });
        return;
      }

      if (!name || !icon || !color) {
        res.status(400).json({ error: 'Missing required fields: name, icon, color' });
        return;
      }

      const sessionType = await SessionType.create({
        userId,
        name,
        icon,
        color,
      });

      res.status(201).json(sessionType);
    } catch (error: any) {
      console.error('Create session type error:', error);
      if (error.code === 11000) {
        res.status(409).json({ error: 'Session type with this name already exists' });
      } else {
        res.status(500).json({ error: `Failed to create session type: ${error.message}` });
      }
    }
  }

  /**
   * Get all session types for a user
   */
  async getSessionTypes(req: Request, res: Response): Promise<void> {
    try {
      const userId = (req as any).user?.id;

      if (!userId) {
        res.status(401).json({ error: 'Unauthorized' });
        return;
      }

      const sessionTypes = await SessionType.find({ userId }).sort({ createdAt: -1 });
      res.json(sessionTypes);
    } catch (error: any) {
      console.error('Get session types error:', error);
      res.status(500).json({ error: `Failed to get session types: ${error.message}` });
    }
  }

  /**
   * Delete a session type
   */
  async deleteSessionType(req: Request, res: Response): Promise<void> {
    try {
      const userId = (req as any).user?.id;
      const { session_type_id } = req.params;

      if (!userId) {
        res.status(401).json({ error: 'Unauthorized' });
        return;
      }

      const result = await SessionType.findOneAndDelete({
        _id: session_type_id,
        userId,
      });

      if (!result) {
        res.status(404).json({ error: 'Session type not found' });
        return;
      }

      res.json({ success: true, message: 'Session type deleted' });
    } catch (error: any) {
      console.error('Delete session type error:', error);
      res.status(500).json({ error: `Failed to delete session type: ${error.message}` });
    }
  }

  /**
   * Check if username is available
   */
  async checkUsernameAvailability(req: Request, res: Response): Promise<void> {
    try {
      const { username } = req.query;

      console.log('🔍 Checking username availability for:', username);

      if (!username || typeof username !== 'string' || username.length < 3 || username.length > 20) {
        console.log('❌ Invalid username length');
        res.status(400).json({ error: 'Username must be between 3 and 20 characters' });
        return;
      }

      // Check if username matches allowed pattern
      if (!/^[a-zA-Z0-9_]+$/.test(username)) {
        console.log('❌ Invalid username pattern');
        res.status(400).json({ error: 'Username can only contain letters, numbers, and underscores' });
        return;
      }

      // Check if username already exists (case insensitive)
      const escapedUsername = username.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const existingUser = await User.findOne({
        username: { $regex: `^${escapedUsername}$`, $options: 'i' }
      });

      console.log('📊 Existing user found:', !!existingUser);

      res.json({ available: !existingUser });
    } catch (error: any) {
      console.error('Check username availability error:', error);
      res.status(500).json({ error: `Failed to check username availability: ${error.message}` });
    }
  }

  /**
   * Search users by username or publicUserId
   */
  async searchUsers(req: Request, res: Response): Promise<void> {
    try {
      const userId = (req as any).user?.id;
      const { q } = req.query;

      if (!userId) {
        res.status(401).json({ error: 'Unauthorized' });
        return;
      }

      if (!q || typeof q !== 'string' || q.length < 2) {
        res.status(400).json({ error: 'Search query must be at least 2 characters' });
        return;
      }

      // Search by username or publicUserId (case insensitive)
      const users = await User.find({
        $and: [
          { _id: { $ne: userId } }, // Exclude self
          {
            $or: [
              { username: { $regex: q, $options: 'i' } },
              { publicUserId: { $regex: q, $options: 'i' } },
              { displayName: { $regex: q, $options: 'i' } }
            ]
          }
        ]
      })
        .select('id username displayName publicUserId avatarUrl')
        .limit(20);

      res.json(users.map(user => ({
        id: user._id,
        username: user.username,
        display_name: user.displayName,
        public_user_id: user.publicUserId,
        avatar_url: user.avatarUrl,
      })));
    } catch (error: any) {
      console.error('Search users error:', error);
      res.status(500).json({ error: `Failed to search users: ${error.message}` });
    }
  }
}

export const userController = new UserController();
