import { Request, Response } from 'express';
import mongoose from 'mongoose';
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
      console.log('🔔 Google Sign-In request received');
      console.log('📍 Request origin:', req.headers.origin || 'unknown');
      console.log('⏰ Timestamp:', new Date().toISOString());
      
      const { idToken } = req.body;

      if (!idToken) {
        console.warn('⚠️ Missing Google ID token');
        res.status(400).json({ error: 'Missing Google ID token' });
        return;
      }

      console.log('🔐 Verifying Google ID token...');
      // Verify Google ID token
      const googleUser: GoogleUserPayload | null = await verifyGoogleIdToken(idToken);

      if (!googleUser) {
        console.warn('⚠️ Invalid Google ID token - token verification failed');
        res.status(401).json({ error: 'Invalid Google ID token' });
        return;
      }

      console.log('✅ Google token verified for:', googleUser.email);

      // Check MongoDB connection before querying
      console.log('🔌 Checking MongoDB connection...');
      if (mongoose.connection.readyState !== 1) {
        console.warn('⚠️ MongoDB not connected, readyState:', mongoose.connection.readyState);
        // Try to reconnect if disconnected
        if (mongoose.connection.readyState === 0) {
          console.log('🔄 Attempting to reconnect to MongoDB...');
          try {
            await mongoose.connect(process.env.MONGODB_URI || '', {
              serverSelectionTimeoutMS: 10000,
              socketTimeoutMS: 45000,
            });
            console.log('✅ MongoDB reconnected successfully');
          } catch (dbError: any) {
            console.error('❌ MongoDB reconnection failed:', dbError.message);
            res.status(503).json({ error: 'Database temporarily unavailable. Please try again.' });
            return;
          }
        } else {
          res.status(503).json({ error: 'Database temporarily unavailable. Please try again.' });
          return;
        }
      }

      // Check if user already exists by email
      console.log('📊 Checking for existing user...');
      let user = await User.findOne({ email: googleUser.email });

      let isNewUser = false;

      if (!user) {
        // Create new user
        isNewUser = true;
        console.log('🆕 Creating new user for:', googleUser.email);
        
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
          console.error('❌ Failed to generate unique user ID');
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
        console.log('✅ New user created with ID:', user._id);
      } else {
        // Update existing user's Google info
        console.log('📝 Updating existing user:', user.email);
        user = await User.findByIdAndUpdate(
          user._id,
          {
            gmailName: googleUser.name || user.gmailName,
            avatarUrl: googleUser.picture || user.avatarUrl,
          },
          { new: true }
        );
        console.log('✅ User updated successfully');
      }

      // Generate our own JWT token for the user
      console.log('🔑 Generating JWT token...');
      const token = generateToken(user._id, user.email);
      console.log('✅ JWT token generated');

      // Send response
      console.log('📤 Sending auth response to client');
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
      console.log('✅ Google Sign-In completed successfully');
    } catch (error: any) {
      console.error('❌ Google Sign-In error:', error);
      console.error('❌ Error stack:', error.stack);
      res.status(500).json({ error: `Internal server error: ${error.message}` });
    }
  }

  /**
   * Handle auth callback - sync user to users table on first login
   * Note: Using native JWT auth with MongoDB instead of Supabase
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
