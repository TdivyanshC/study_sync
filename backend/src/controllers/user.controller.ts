import { Request, Response } from 'express';
import { supabaseAdmin } from '../config/supabase';

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
}

interface SessionTypeData {
  user_id: string;
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

      const { data, error } = await supabaseAdmin
        .from('users')
        .select('id, username, email, avatar_url, public_user_id, created_at')
        .eq('id', user_id)
        .single();

      if (error || !data) {
        res.status(404).json({ error: 'User not found' });
        return;
      }

      res.json(data);
    } catch (error) {
      console.error('Get user error:', error);
      res.status(500).json({ error: 'Failed to get user' });
    }
  }

  /**
   * Get user by public_user_id
   */
  async getUserByPublicId(req: Request, res: Response): Promise<void> {
    try {
      const { public_id } = req.params;

      const { data, error } = await supabaseAdmin
        .from('users')
        .select('id, username, avatar_url, public_user_id')
        .eq('public_user_id', public_id)
        .single();

      if (error || !data) {
        res.status(404).json({ error: 'User not found' });
        return;
      }

      res.json(data);
    } catch (error) {
      console.error('Get user by public id error:', error);
      res.status(500).json({ error: 'Failed to get user' });
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

      // Generate username from display_name or email, or use fallback
      const username = onboardingData.display_name 
        ? onboardingData.display_name.toLowerCase().replace(/[^a-zA-Z0-9_]/g, '_') + '_' + userId.substring(0, 6)
        : 'user_' + userId.substring(0, 8);

      // Generate public_user_id (7 characters starting with U)
      const publicUserId = 'U' + Math.random().toString(36).substring(2, 8).toUpperCase().slice(0, 6);

      // Prepare user update/insert data
      const userUpdateData: any = {
        id: userId,
        username: username,
        public_user_id: publicUserId,
        onboarding_completed: true,
        onboarding_completed_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      // Add optional fields if provided
      if (onboardingData.display_name) {
        userUpdateData.display_name = onboardingData.display_name;
      }
      if (onboardingData.step1_data.gender) {
        userUpdateData.gender = onboardingData.step1_data.gender;
      }
      if (onboardingData.step1_data.age) {
        userUpdateData.age = parseInt(onboardingData.step1_data.age) || null;
      }
      if (onboardingData.step1_data.relationship) {
        userUpdateData.relationship_status = onboardingData.step1_data.relationship;
      }
      if (onboardingData.step2_data?.preferred_sessions) {
        userUpdateData.preferred_sessions = JSON.stringify(onboardingData.step2_data.preferred_sessions);
      }

      // First, check if user record exists
      const { data: existingUser, error: fetchError } = await supabaseAdmin
        .from('users')
        .select('id')
        .eq('id', userId)
        .single();

      if (fetchError && fetchError.code !== 'PGRST116') {
        // PGRST116 means no rows returned, which is expected for new users
        console.error('Error checking existing user:', fetchError);
        throw fetchError;
      }

      let updatedUser;

      if (existingUser) {
        // Update existing user
        console.log('📝 Updating existing user record');
        const { data, error: updateError } = await supabaseAdmin
          .from('users')
          .update(userUpdateData)
          .eq('id', userId)
          .select()
          .single();

        if (updateError) {
          console.error('Error updating user:', updateError);
          throw updateError;
        }
        updatedUser = data;
      } else {
        // Insert new user record
        console.log('📝 Creating new user record');
        const { data, error: insertError } = await supabaseAdmin
          .from('users')
          .insert(userUpdateData)
          .select()
          .single();

        if (insertError) {
          console.error('Error inserting user:', insertError);
          throw insertError;
        }
        updatedUser = data;
      }

      console.log('✅ User record saved:', updatedUser?.id);

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
      res.status(500).json({ error: `Failed to complete onboarding: ${error.message}` });
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
        user_id: userId,
        name: sessionTypeMap[id].name,
        icon: sessionTypeMap[id].icon,
        color: sessionTypeMap[id].color,
      }));

    if (sessionTypesToInsert.length > 0) {
      const { error } = await supabaseAdmin
        .from('session_types')
        .upsert(sessionTypesToInsert, { onConflict: 'user_id, name' });

      if (error) {
        console.error('Error creating session types:', error);
        // Don't fail onboarding if session types fail
      }
    }
  }
}

export const userController = new UserController();
