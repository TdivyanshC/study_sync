import { Request, Response } from 'express';
import { supabaseAdmin } from '../config/supabase';
import { generatePublicUserId } from '../utils/ids';

export class AuthController {
  /**
   * Handle Supabase auth callback - sync user to users table on first login
   */
  async handleAuthCallback(req: Request, res: Response): Promise<void> {
    try {
      const { user_id, email } = req.body;

      if (!user_id || !email) {
        res.status(400).json({ error: 'Missing user_id or email' });
        return;
      }

      // Check if user already exists in users table
      const { data: existingUser } = await supabaseAdmin
        .from('users')
        .select('*')
        .eq('id', user_id)
        .single();

      if (existingUser) {
        res.json({ user: existingUser, isNewUser: false });
        return;
      }

      // Generate unique public_user_id with retry
      let publicUserId: string;
      let attempts = 0;
      const maxAttempts = 10;

      do {
        publicUserId = generatePublicUserId();
        const { data: existing } = await supabaseAdmin
          .from('users')
          .select('public_user_id')
          .eq('public_user_id', publicUserId)
          .single();
        
        if (!existing) break;
        attempts++;
      } while (attempts < maxAttempts);

      if (attempts >= maxAttempts) {
        res.status(500).json({ error: 'Failed to generate unique user ID' });
        return;
      }

      // Create user record
      const { data: newUser, error } = await supabaseAdmin
        .from('users')
        .insert({
          id: user_id,
          email,
          username: email.split('@')[0],
          public_user_id: publicUserId,
        })
        .select()
        .single();

      if (error) {
        console.error('Error creating user:', error);
        res.status(500).json({ error: `Failed to create user: ${error.message}` });
        return;
      }

      res.json({ user: newUser, isNewUser: true });
    } catch (error) {
      console.error('Auth callback error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }

  /**
   * Get current user profile
   */
  async getProfile(req: Request, res: Response): Promise<void> {
    try {
      const userId = (req as any).user?.id;

      if (!userId) {
        res.status(401).json({ error: 'Unauthorized' });
        return;
      }

      const { data, error } = await supabaseAdmin
        .from('users')
        .select('*')
        .eq('id', userId)
        .single();

      if (error || !data) {
        res.status(404).json({ error: 'User not found' });
        return;
      }

      res.json(data);
    } catch (error) {
      console.error('Get profile error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }

  /**
   * Update user profile
   */
  async updateProfile(req: Request, res: Response): Promise<void> {
    try {
      const userId = (req as any).user?.id;
      const { username, avatar_url, gmail_name } = req.body;

      if (!userId) {
        res.status(401).json({ error: 'Unauthorized' });
        return;
      }

      const { data, error } = await supabaseAdmin
        .from('users')
        .update({
          ...(username && { username }),
          ...(avatar_url && { avatar_url }),
          ...(gmail_name && { gmail_name }),
        })
        .eq('id', userId)
        .select()
        .single();

      if (error) {
        console.error('Error updating profile:', error);
        res.status(500).json({ error: `Failed to update profile: ${error.message}` });
        return;
      }

      res.json(data);
    } catch (error) {
      console.error('Update profile error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }
}

export const authController = new AuthController();
