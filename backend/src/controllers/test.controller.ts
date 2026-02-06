import { Request, Response } from 'express';
import { supabaseAdmin } from '../config/supabase';
import { generatePublicUserId } from '../utils/ids';
import { v4 as uuidv4 } from 'uuid';

/**
 * Test controller for creating users programmatically
 * FOR DEVELOPMENT/TESTING ONLY - Remove or secure in production
 */
export class TestController {
  /**
   * Create a test user with email/password authentication
   */
  async createTestUser(req: Request, res: Response): Promise<void> {
    try {
      const { email, password, username, display_name, gender, age, relationship } = req.body;

      if (!email || !password || !username) {
        res.status(400).json({ 
          error: 'Missing required fields: email, password, username' 
        });
        return;
      }

      // Check if user already exists in users table by email
      const { data: existingUser, error: existingUserError } = await supabaseAdmin
        .from('users')
        .select('id, email')
        .eq('email', email)
        .single();
      
      // If user exists (no error means we found one)
      if (!existingUserError && existingUser) {
        res.status(400).json({ error: 'User with this email already exists' });
        return;
      }

      // Create user in Supabase Auth
      const { data: authUser, error: authError } = await supabaseAdmin.auth.admin.createUser({
        email,
        password,
        email_confirm: true,
        user_metadata: {
          username,
          display_name: display_name || username,
        }
      });

      if (authError) {
        console.error('Auth creation error:', authError);
        res.status(400).json({ error: `Auth creation failed: ${authError.message}` });
        return;
      }

      const userId = authUser.user?.id;

      if (!userId) {
        res.status(500).json({ error: 'Failed to get user ID from auth' });
        return;
      }

      // Generate unique public_user_id
      let publicUserId = generatePublicUserId();
      let attempts = 0;
      const maxAttempts = 10;

      while (attempts < maxAttempts) {
        const { data: existing } = await supabaseAdmin
          .from('users')
          .select('public_user_id')
          .eq('public_user_id', publicUserId)
          .single();
        
        if (!existing) break;
        publicUserId = generatePublicUserId();
        attempts++;
      }

      if (attempts >= maxAttempts) {
        res.status(500).json({ error: 'Failed to generate unique user ID' });
        return;
      }

      // Create user record in users table
      const { data: newUser, error: userError } = await supabaseAdmin
        .from('users')
        .insert({
          id: userId,
          email,
          username: username.toLowerCase(),
          public_user_id: publicUserId,
          display_name: display_name || username,
          gender: gender || null,
          age: age ? parseInt(age) : null,
          relationship_status: relationship || null,
          preferred_sessions: [],
          onboarding_completed: false,
        })
        .select()
        .single();

      if (userError) {
        console.error('User record creation error:', userError);
        // Try to rollback auth user
        await supabaseAdmin.auth.admin.deleteUser(userId);
        res.status(400).json({ error: `User record creation failed: ${userError.message}` });
        return;
      }

      res.status(201).json({
        success: true,
        user: newUser,
        message: 'Test user created successfully'
      });
    } catch (error: any) {
      console.error('Create test user error:', error);
      res.status(500).json({ error: `Internal server error: ${error.message}` });
    }
  }

  /**
   * Delete a test user
   */
  async deleteTestUser(req: Request, res: Response): Promise<void> {
    try {
      const { user_id, email } = req.body;

      if (!user_id && !email) {
        res.status(400).json({ error: 'Missing user_id or email' });
        return;
      }

      // Get user ID from email if not provided
      let userId = user_id;
      if (email) {
        // List users by email to find the user ID
        const { data: authUsers } = await supabaseAdmin.auth.admin.listUsers();
        const authUser = authUsers?.users.find(u => u.email === email);
        if (authUser) {
          userId = authUser.id;
        }
      }

      if (!userId) {
        res.status(404).json({ error: 'User not found' });
        return;
      }

      // Delete from users table first
      await supabaseAdmin.from('users').delete().eq('id', userId);

      // Delete from auth.users
      const { error } = await supabaseAdmin.auth.admin.deleteUser(userId);

      if (error) {
        res.status(400).json({ error: `Delete failed: ${error.message}` });
        return;
      }

      res.json({ success: true, message: 'User deleted successfully' });
    } catch (error: any) {
      console.error('Delete test user error:', error);
      res.status(500).json({ error: `Internal server error: ${error.message}` });
    }
  }
}

export const testController = new TestController();
