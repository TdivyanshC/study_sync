import { Request, Response } from 'express';
import User from '../models/User';
import { generatePublicUserId } from '../utils/ids';
import { generateToken, verifyToken, extractToken } from '../config/jwt';
import { verifyGoogleIdToken, GoogleUserPayload } from '../services/google-auth.service';

export class AuthController {
  /**
   * Handle Google Sign-In from native React Native app
   * Verifies the Google ID token and creates/updates user in MongoDB
   */
  async googleSignIn(req: Request, res: Response): Promise<void> {
    try {
      const { idToken } = req.body;

      if (!idToken) {
        res.status(400).json({ error: 'Missing Google ID token' });
        return;
      }

      // Verify Google ID token
      const googleUser: GoogleUserPayload | null = await verifyGoogleIdToken(idToken);

      if (!googleUser) {
        res.status(401).json({ error: 'Invalid Google ID token' });
        return;
      }

      // Check if user already exists by email
      let user = await User.findOne({ email: googleUser.email });

      let isNewUser = false;

      if (!user) {
        // Create new user
        isNewUser = true;
        
        // Generate unique public_user_id with retry
        let publicUserId: string;
        let attempts = 0;
        const maxAttempts = 10;

        do {
          publicUserId = generatePublicUserId();
          const existing = await User.findOne({ publicUserId });
          
          if (!existing) break;
          attempts++;
        } while (attempts < maxAttempts);

        if (attempts >= maxAttempts) {
          res.status(500).json({ error: 'Failed to generate unique user ID' });
          return;
        }

        // Create user record
        user = await User.create({
          _id: googleUser.googleId,
          email: googleUser.email,
          gmailName: googleUser.name,
          username: googleUser.email.split('@')[0],
          publicUserId,
          avatarUrl: googleUser.picture,
          displayName: googleUser.name,
        });
      } else {
        // Update existing user's Google info
        user = await User.findByIdAndUpdate(
          user._id,
          {
            gmailName: googleUser.name || user.gmailName,
            avatarUrl: googleUser.picture || user.avatarUrl,
          },
          { new: true }
        );
      }

      // Generate our own JWT token for the user
      const token = generateToken(user._id, user.email);

      res.json({
        token,
        user: {
          id: user._id,
          email: user.email,
          username: user.username,
          displayName: user.displayName,
          avatarUrl: user.avatarUrl,
          gmailName: user.gmailName,
          onboardingCompleted: user.onboardingCompleted,
        },
        isNewUser,
      });
    } catch (error: any) {
      console.error('Google Sign-In error:', error);
      res.status(500).json({ error: `Internal server error: ${error.message}` });
    }
  }

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

      // Check if user already exists in users collection
      const existingUser = await User.findById(user_id);

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
        const existing = await User.findOne({ publicUserId });
        
        if (!existing) break;
        attempts++;
      } while (attempts < maxAttempts);

      if (attempts >= maxAttempts) {
        res.status(500).json({ error: 'Failed to generate unique user ID' });
        return;
      }

      // Create user record
      const newUser = await User.create({
        _id: user_id,
        email,
        username: email.split('@')[0],
        publicUserId,
      });

      res.json({ user: newUser, isNewUser: true });
    } catch (error: any) {
      console.error('Auth callback error:', error);
      res.status(500).json({ error: `Internal server error: ${error.message}` });
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

      const user = await User.findById(userId);

      if (!user) {
        res.status(404).json({ error: 'User not found' });
        return;
      }

      res.json(user);
    } catch (error: any) {
      console.error('Get profile error:', error);
      res.status(500).json({ error: `Internal server error: ${error.message}` });
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

      const updateData: any = {};
      if (username) updateData.username = username;
      if (avatar_url) updateData.avatarUrl = avatar_url;
      if (gmail_name) updateData.gmailName = gmail_name;

      const user = await User.findByIdAndUpdate(
        userId,
        updateData,
        { new: true, runValidators: true }
      );

      if (!user) {
        res.status(404).json({ error: 'User not found' });
        return;
      }

      res.json(user);
    } catch (error: any) {
      console.error('Update profile error:', error);
      res.status(500).json({ error: `Internal server error: ${error.message}` });
    }
  }
}

export const authController = new AuthController();
