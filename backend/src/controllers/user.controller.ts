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

      // Prepare user update data
      const userUpdateData: any = {
        onboarding_completed: true,
        onboarding_completed_at: new Date().toISOString(),
      };

      // Update username if provided (from step1 or display_name)
      if (onboardingData.display_name) {
        userUpdateData.username = onboardingData.display_name.toLowerCase().replace(/[^a-zA-Z0-9_]/g, '_');
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

      // Update user record
      const { data: updatedUser, error: userError } = await supabaseAdmin
        .from('users')
        .update(userUpdateData)
        .eq('id', userId)
        .select()
        .single();

      if (userError) {
        console.error('Error updating user during onboarding:', userError);
        res.status(400).json({ error: `Failed to complete onboarding: ${userError.message}` });
        return;
      }

      // Create session types for selected sessions (O(n) where n = number of sessions)
      if (onboardingData.step2_data?.preferred_sessions && onboardingData.step2_data.preferred_sessions.length > 0) {
        await this.createSessionTypesForUser(userId, onboardingData.step2_data.preferred_sessions);
      }

      res.json({ 
        success: true, 
        user: updatedUser,
        message: 'Onboarding completed successfully'
      });
    } catch (error) {
      console.error('Complete onboarding error:', error);
      res.status(500).json({ error: 'Failed to complete onboarding' });
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
