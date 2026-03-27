import { Request, Response } from 'express';
import User from '../models/User';
import { generatePublicUserId } from '../utils/ids';
import { Types } from 'mongoose';

/**
 * Test controller for creating users programmatically
 * FOR DEVELOPMENT/TESTING ONLY - Remove or secure in production
 */
export class TestController {
  /**
   * Create a test user with email/password authentication
   * Note: For MongoDB version, we'll create a user directly without Supabase Auth
   * In a real implementation, you would integrate with an auth service like JWT or Auth0
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

      // Check if user already exists by email
      const existingUser = await User.findOne({ email: email });
      
      if (existingUser) {
        res.status(400).json({ error: 'User with this email already exists' });
        return;
      }

      // Check if username already exists
      const existingUsername = await User.findOne({ username: username.toLowerCase() });
      
      if (existingUsername) {
        res.status(400).json({ error: 'Username already taken' });
        return;
      }

      // Generate unique public_user_id
      let publicUserId = generatePublicUserId();
      let attempts = 0;
      const maxAttempts = 10;

      while (attempts < maxAttempts) {
        const existing = await User.findOne({ publicUserId: publicUserId });
        
        if (!existing) break;
        publicUserId = generatePublicUserId();
        attempts++;
      }

      if (attempts >= maxAttempts) {
        res.status(500).json({ error: 'Failed to generate unique user ID' });
        return;
      }

      // Create user record
      const newUser = await User.create({
        _id: new Types.ObjectId().toHexString(), // Generate UUID-like ID
        email: email,
        username: username.toLowerCase(),
        publicUserId: publicUserId,
        displayName: display_name || username,
        gender: gender || null,
        age: age ? parseInt(age) : null,
        relationshipStatus: relationship || null,
        preferredSessions: [],
        onboardingCompleted: false,
      });

      res.status(201).json({
        success: true,
        user: {
          id: newUser._id,
          email: newUser.email,
          username: newUser.username,
          publicUserId: newUser.publicUserId,
          displayName: newUser.displayName,
          gender: newUser.gender,
          age: newUser.age,
          relationshipStatus: newUser.relationshipStatus,
          preferredSessions: newUser.preferredSessions,
          onboardingCompleted: newUser.onboardingCompleted,
          createdAt: newUser.createdAt,
          updatedAt: newUser.updatedAt
        },
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
        const user = await User.findOne({ email: email });
        if (user) {
          userId = user._id;
        }
      }

      if (!userId) {
        res.status(404).json({ error: 'User not found' });
        return;
      }

      // Delete user
      await User.findByIdAndDelete(userId);

      res.json({ success: true, message: 'User deleted successfully' });
    } catch (error: any) {
      console.error('Delete test user error:', error);
      res.status(500).json({ error: `Internal server error: ${error.message}` });
    }
  }
}

export const testController = new TestController();
