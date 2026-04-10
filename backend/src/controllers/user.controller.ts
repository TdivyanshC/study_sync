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

      // Set display name - use provided display_name or default to username
      userUpdateData.displayName = onboardingData.display_name || username;
      if (onboardingData.step1_data.gender) {
        userUpdateData.gender = onboardingData.step1_data.gender;
      }
      if (onboardingData.step1_data.age) {
        userUpdateData.age = parseInt(onboardingData.step1_data.age) || null;
      }
      if (onboardingData.step1_data.relationship) {
        userUpdateData.relationshipStatus = onboardingData.step1_data.relationship;
      }
      // preferredSessions will be populated after creating actual SessionType documents
      // Do NOT delete it from userUpdateData - we keep it initially and update it later with real IDs

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

      // Store session slugs directly instead of object IDs - frontend expects string names for rendering
      // We still create the SessionType documents for backward compatibility and actual session usage
      if (onboardingData.step2_data?.preferred_sessions && onboardingData.step2_data.preferred_sessions.length > 0) {
        // Create session types in background (don't wait for it to complete to avoid blocking onboarding)
        this.createSessionTypesForUser(userId, onboardingData.step2_data.preferred_sessions).catch(err => {
          console.error('Failed to create session types during onboarding:', err);
        });
        
        // Store the actual session slugs directly so frontend can render them immediately
        // This matches the behavior when adding sessions from the home page
        updatedUser = await User.findByIdAndUpdate(userId, {
          preferredSessions: onboardingData.step2_data.preferred_sessions
        }, { new: true, runValidators: true });
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
  private async createSessionTypesForUser(userId: string, sessionIds: string[]): Promise<string[]> {
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

    const createdSessionIds: string[] = [];

    if (sessionTypesToInsert.length > 0) {
      // Use bulkWrite with upsert to avoid duplicate key errors
      try {
        const bulkOperations = sessionTypesToInsert.map(sessionType => ({
          updateOne: {
            filter: { userId: sessionType.userId, name: sessionType.name },
            update: { $setOnInsert: sessionType },
            upsert: true
          }
        }));
        
        await SessionType.bulkWrite(bulkOperations, { ordered: false });
        console.log('✅ Session types created successfully for user:', userId);

        // Fetch all session types for this user to get their IDs
        const createdSessionTypes = await SessionType.find({ 
          userId, 
          name: { $in: sessionTypesToInsert.map(s => s.name) } 
        });
        
        createdSessionTypes.forEach(st => createdSessionIds.push(st._id.toString()));
      } catch (error) {
        // Don't fail onboarding if session types fail
        console.error('Error creating session types:', error);
      }
    }

    return createdSessionIds;
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
   * Update user preferred sessions
   */
  async updatePreferredSessions(req: Request, res: Response): Promise<void> {
    try {
      const { user_id } = req.params;
      const { preferred_sessions } = req.body;

      if (!Array.isArray(preferred_sessions)) {
        res.status(400).json({
          success: false,
          message: 'preferred_sessions must be an array'
        });
        return;
      }

      // Validate that values are slug strings, not MongoDB ObjectIds
      const isValidSlug = (s: string) => typeof s === 'string' && !/^[a-f0-9]{24}$/.test(s);
      if (!preferred_sessions.every(isValidSlug)) {
        res.status(400).json({
          success: false,
          error: 'Sessions must be slug strings, not IDs'
        });
        return;
      }

      await User.findByIdAndUpdate(user_id, {
        $set: { preferredSessions: preferred_sessions }
      }, { new: true });

      res.json({
        success: true,
        message: 'Preferred sessions updated successfully'
      });
    } catch (error: any) {
      console.error('Error updating preferred sessions:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to update preferred sessions'
      });
    }
  }

  /**
   * Get user preferred sessions
   */
  async getPreferredSessions(req: Request, res: Response): Promise<void> {
    try {
      const { user_id } = req.params;

      const user = await User.findById(user_id).select('preferredSessions');

      if (!user) {
        res.status(404).json({ error: 'User not found' });
        return;
      }

      res.json({
        success: true,
        preferred_sessions: user.preferredSessions || []
      });
    } catch (error: any) {
      console.error('Error getting preferred sessions:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to get preferred sessions'
      });
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
        .select('id username displayName publicUserId avatarUrl xp level')
        .limit(20);

      res.json({
        success: true,
        query: q,
        results: users.map(user => ({
          id: user._id,
          username: user.username,
          display_name: user.displayName,
          public_user_id: user.publicUserId,
          avatar_url: user.avatarUrl,
          xp: user.xp || 0,
          level: user.level || 1
        })),
        total_found: users.length
      });
    } catch (error: any) {
      console.error('Search users error:', error);
      res.status(500).json({ error: `Failed to search users: ${error.message}` });
    }
  }

}

export const userController = new UserController();
