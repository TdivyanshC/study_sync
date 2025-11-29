import * as AuthSession from 'expo-auth-session';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '../../lib/supabase';

/**
 * AuthService - Clean Supabase OAuth Flow A Implementation
 * 
 * This service provides a clean interface for authentication using Supabase OAuth
 * with the recommended Flow A approach. It uses AuthSession proxy mode for
 * production-ready OAuth that works across Expo Go, Dev Client, and Production.
 * 
 * Key Features:
 * - No manual URL handling
 * - No PKCE configuration needed
 * - Automatic session management
 * - Works across all Expo environments
 * - Minimal configuration required
 */

class AuthService {
  /**
   * Email/password authentication
   */
  static async loginWithEmail(email: string, password: string): Promise<{ user: User; session: Session }> {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      throw new Error(error.message);
    }

    if (!data.user || !data.session) {
      throw new Error('Failed to create session');
    }

    return { user: data.user, session: data.session };
  }



  /**
   * Logout and clear session
   */
  static async logout(): Promise<void> {
    const { error } = await supabase.auth.signOut();
    
    if (error) {
      throw new Error(error.message);
    }

    console.log('Logout successful');
  }

  /**
   * Get current session
   */
  static async getSession(): Promise<Session | null> {
    const { data: { session }, error } = await supabase.auth.getSession();
    
    if (error) {
      console.error('Error getting session:', error);
      return null;
    }

    return session;
  }

  /**
   * Get current user
   */
  static async getCurrentUser(): Promise<User | null> {
    const { data: { user }, error } = await supabase.auth.getUser();
    
    if (error) {
      console.error('Error getting user:', error);
      return null;
    }

    return user;
  }

  /**
   * Check if user is authenticated
   */
  static async isAuthenticated(): Promise<boolean> {
    const session = await this.getSession();
    return !!session;
  }

  /**
   * Subscribe to auth state changes
   * Returns unsubscribe function
   */
  static onAuthStateChange(callback: (event: string, session: Session | null) => void) {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(callback);
    return () => subscription.unsubscribe();
  }

  /**
   * Set up auth state listener with automatic navigation
   */
  static setupAuthListener(navigateToHome: () => void, navigateToLogin: () => void) {
    return this.onAuthStateChange((event, session) => {
      console.log('Auth state changed:', event);
      
      if (session && event === 'SIGNED_IN') {
        console.log('✅ User signed in:', session.user?.email);
        navigateToHome();
      } else if (!session && event === 'SIGNED_OUT') {
        console.log('👋 User signed out');
        navigateToLogin();
      }
    });
  }
}

export default AuthService;