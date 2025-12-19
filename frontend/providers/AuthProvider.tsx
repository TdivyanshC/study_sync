import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { makeRedirectUri } from 'expo-auth-session';
import * as WebBrowser from 'expo-web-browser';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '../lib/supabase';
import * as Linking from 'expo-linking';
import { router } from 'expo-router';

// Initialize WebBrowser for OAuth
WebBrowser.maybeCompleteAuthSession();

interface AuthContextType {
  user: User | null;
  session: Session | null;
  loading: boolean;
  isInitialized: boolean;
  hasCompletedOnboarding: boolean;
  login: (email: string, password: string) => Promise<void>;
  loginWithGoogle: () => Promise<void>;
  logout: () => Promise<void>;
  refreshSession: () => Promise<void>;
  markOnboardingCompleted: () => Promise<void>;
}

export const AuthContext = createContext<AuthContextType | undefined>(undefined);

interface AuthProviderProps {
  children: ReactNode;
}

export function AuthProvider({ children }: AuthProviderProps) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [isInitialized, setIsInitialized] = useState(false);
  const [hasNavigated, setHasNavigated] = useState(false);
  const [hasCompletedOnboarding, setHasCompletedOnboarding] = useState(false);

  // Check if user has completed onboarding
  const checkOnboardingStatus = async (userId: string) => {
    try {
      // First check if the table exists and user has a profile
      const { data, error } = await supabase
        .from('user_profiles')
        .select('onboarding_completed')
        .eq('user_id', userId)
        .single();

      // If no profile exists yet (new user), return false
      if (error && error.code === 'PGRST116') {
        console.log('ℹ️ No user profile found, treating as new user');
        return false;
      }

      // If other error, log but don't fail the auth process
      if (error) {
        console.warn('⚠️ Error checking onboarding status:', error.message);
        return false; // Default to false for safety
      }

      return data?.onboarding_completed || false;
    } catch (error) {
      console.warn('⚠️ Exception checking onboarding status:', error);
      return false; // Default to false for safety, don't block auth
    }
  };

  // Enhanced session initialization with better timing
  useEffect(() => {
    let isMounted = true;
    let initializationAttempts = 0;
    const maxAttempts = 3;

    const initializeAuth = async () => {
      try {
        initializationAttempts++;
        console.log(`🚀 Initializing authentication... (Attempt ${initializationAttempts})`);
        
        // Wait for Supabase to be ready with exponential backoff
        const delay = Math.min(1000 * Math.pow(2, initializationAttempts - 1), 5000);
        if (initializationAttempts > 1) {
          await new Promise(resolve => setTimeout(resolve, delay));
        }
        
        // Get session with retry logic
        const getSessionWithRetry = async (): Promise<{ data: { session: Session | null }, error: any }> => {
          for (let i = 0; i < 3; i++) {
            try {
              const result = await supabase.auth.getSession();
              if (result.error && i < 2) {
                console.log(`⚠️ Session fetch attempt ${i + 1} failed, retrying...`);
                await new Promise(resolve => setTimeout(resolve, 500 * (i + 1)));
                continue;
              }
              return result;
            } catch (error) {
              if (i === 2) throw error;
              await new Promise(resolve => setTimeout(resolve, 500 * (i + 1)));
            }
          }
          throw new Error('Failed to get session after 3 attempts');
        };

        const { data: { session }, error } = await getSessionWithRetry();
        
        if (error) {
          console.error('❌ Error getting session:', error.message);
          if (isMounted) {
            setSession(null);
            setUser(null);
            setHasCompletedOnboarding(false);
            setLoading(false);
            setIsInitialized(true);
          }
          return;
        }

        if (isMounted) {
          if (session?.user) {
            console.log('✅ Session restored successfully:', {
              email: session.user.email,
              id: session.user.id,
              expiresAt: session.expires_at,
              provider: session.user.app_metadata?.provider
            });
            
            // Check if session is expired
            const now = Math.floor(Date.now() / 1000);
            if (session.expires_at && session.expires_at < now) {
              console.log('⚠️ Session expired, user needs to re-authenticate');
              setSession(null);
              setUser(null);
              setHasCompletedOnboarding(false);
            } else {
              setSession(session);
              setUser(session.user);
              
              // Check onboarding status for existing users with timeout
              let completedOnboarding = false;
              try {
                const timeoutPromise = new Promise((_, reject) => 
                  setTimeout(() => reject(new Error('Timeout')), 3000)
                );
                const checkPromise = checkOnboardingStatus(session.user.id);
                
                completedOnboarding = await Promise.race([checkPromise, timeoutPromise]);
                console.log('✅ Onboarding status checked successfully');
              } catch (statusError) {
                console.warn('⚠️ Onboarding status check failed, defaulting to false:', statusError);
                completedOnboarding = false; // Default to false for safety
              }
              
              setHasCompletedOnboarding(completedOnboarding);
              
              console.log('📱 Session valid, user remains authenticated', {
                onboardingCompleted: completedOnboarding
              });
            }
          } else {
            console.log('ℹ️ No existing session found - user needs to authenticate');
            setSession(null);
            setUser(null);
            setHasCompletedOnboarding(false);
          }
          
          setLoading(false);
          setIsInitialized(true);
        }
      } catch (error) {
        console.error('❌ Error initializing auth:', error);
        if (isMounted) {
          setSession(null);
          setUser(null);
          setHasCompletedOnboarding(false);
          setLoading(false);
          setIsInitialized(true);
        }
      }
    };

    // Start initialization
    initializeAuth();

    // Listen for auth state changes with enhanced handling
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        console.log('🔄 Auth state changed:', event, session ? 'Session present' : 'No session');
        
        if (!isMounted) return;

        // Handle session updates immediately
        setSession(session);
        setUser(session?.user ?? null);
        
        // Only stop loading after initial initialization
        if (isInitialized) {
          setLoading(false);
        }

        // Handle different auth events
        switch (event) {
          case 'SIGNED_IN':
            if (session?.user) {
              console.log('✅ User signed in:', {
                email: session.user.email,
                provider: session.user.app_metadata?.provider
              });
              
              // Check onboarding status and navigate accordingly with timeout
              let completedOnboarding = false;
              try {
                const timeoutPromise = new Promise((_, reject) => 
                  setTimeout(() => reject(new Error('Timeout')), 3000)
                );
                const checkPromise = checkOnboardingStatus(session.user.id);
                
                completedOnboarding = await Promise.race([checkPromise, timeoutPromise]);
                console.log('✅ Onboarding status checked during sign in');
              } catch (statusError) {
                console.warn('⚠️ Onboarding status check failed during sign in, defaulting to false:', statusError);
                completedOnboarding = false; // Default to false for safety
              }
              
              setHasCompletedOnboarding(completedOnboarding);
              
              // Auto-navigate with better timing control
              if (!hasNavigated) {
                setHasNavigated(true);
                setTimeout(() => {
                  if (isMounted && session?.user) {
                    if (!completedOnboarding) {
                      console.log('🔄 New user - navigating to onboarding step 1');
                      router.replace('/onboarding-step1');
                    } else {
                      console.log('🔄 Returning user - navigating to home');
                      router.replace('/(tabs)');
                    }
                  }
                }, 200); // Increased delay for better stability
              }
            }
            break;
            
          case 'SIGNED_OUT':
            console.log('👋 User signed out');
            setSession(null);
            setUser(null);
            setHasCompletedOnboarding(false);
            setHasNavigated(false); // Reset navigation flag for next login
            break;
            
          case 'TOKEN_REFRESHED':
            console.log('🔄 Token refreshed successfully');
            if (session) {
              setSession(session);
              setUser(session.user);
            }
            break;
            
          case 'USER_UPDATED':
            if (session?.user) {
              console.log('👤 User data updated');
              setSession(session);
              setUser(session.user);
            }
            break;
        }

        // Set loading to false after any auth state change
        setLoading(false);
      }
    );

    // Cleanup
    return () => {
      isMounted = false;
      subscription.unsubscribe();
    };
  }, []);

  // Enhanced refresh session function
  const refreshSession = async (): Promise<void> => {
    try {
      console.log('🔄 Refreshing session...');
      setLoading(true);
      
      const { data, error } = await supabase.auth.refreshSession();
      
      if (error) {
        console.error('❌ Session refresh failed:', error.message);
        throw error;
      }
      
      if (data.session) {
        console.log('✅ Session refreshed successfully');
        setSession(data.session);
        setUser(data.session.user);
      }
    } catch (error) {
      console.error('❌ Session refresh error:', error);
      throw error;
    } finally {
      setLoading(false);
    }
  };

  // Deep link handling moved to _layout.tsx to avoid conflicts
  // OAuth callback handling is now done in the auth callback component

  // Enhanced login function with better error handling
  const login = async (email: string, password: string): Promise<void> => {
    setLoading(true);
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        throw error;
      }

      console.log('✅ Email login successful');
      // Navigation will be handled by onAuthStateChange
    } catch (error: any) {
      console.error('❌ Login error:', error.message);
      throw new Error(error.message || 'Failed to sign in');
    } finally {
      setLoading(false);
    }
  };

  // Enhanced Google OAuth function with better error handling
  const loginWithGoogle = async (): Promise<void> => {
    setLoading(true);
    try {
      const googleClientId = process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID;
      if (!googleClientId || googleClientId === 'your_google_web_client_id_here') {
        throw new Error('Google Web Client ID is not configured. Please set EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID in your .env file.');
      }

      const devIP = process.env.EXPO_PUBLIC_DEV_IP || '192.168.1.9';
      const redirectTo = `exp://${devIP}:8081/--/auth/callback`;

      console.log('🔄 Starting Google OAuth...');
      console.log('Redirect to:', redirectTo);

      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: redirectTo,
          skipBrowserRedirect: true,
        }
      });

      if (error) {
        console.error('❌ OAuth error:', error);
        throw error;
      }

      console.log('✅ OAuth URL generated');

      const result = await WebBrowser.openAuthSessionAsync(
        data.url,
        redirectTo
      );

      console.log('🔍 Auth session result:', result.type);

      if (result.type === 'cancel') {
        console.log('❌ OAuth cancelled');
        throw new Error('Authentication was cancelled');
      } else if (result.type === 'success') {
        console.log('✅ OAuth completed, processing callback...');
      }

    } catch (error: any) {
      console.error('❌ Google login error:', error.message);
      throw new Error(error.message || 'Failed to sign in with Google');
    } finally {
      setLoading(false);
    }
  };

  // Mark onboarding as completed
  const markOnboardingCompleted = async (): Promise<void> => {
    if (!user?.id) {
      throw new Error('User not authenticated');
    }

    try {
      const { error } = await supabase
        .from('user_profiles')
        .upsert({
          user_id: user.id,
          onboarding_completed: true,
          updated_at: new Date().toISOString()
        });

      if (error) {
        console.warn('⚠️ Error saving onboarding completion to database:', error.message);
        // Don't throw error, just log it - the app should still work
      }

      setHasCompletedOnboarding(true);
      console.log('✅ Onboarding marked as completed (status updated locally)');
    } catch (error: any) {
      console.warn('⚠️ Exception marking onboarding as completed:', error.message);
      // Still update local state even if database save fails
      setHasCompletedOnboarding(true);
      console.log('✅ Onboarding marked as completed (local only)');
    }
  };

  // Enhanced logout function
  const logout = async (): Promise<void> => {
    setLoading(true);
    try {
      const { error } = await supabase.auth.signOut();
      
      if (error) {
        throw error;
      }

      console.log('✅ Logout successful');
      // Navigation will be handled by onAuthStateChange
    } catch (error: any) {
      console.error('❌ Logout error:', error.message);
      throw new Error(error.message || 'Failed to sign out');
    } finally {
      setLoading(false);
    }
  };

  const value = {
    user,
    session,
    loading,
    isInitialized,
    hasCompletedOnboarding,
    login,
    loginWithGoogle,
    logout,
    refreshSession,
    markOnboardingCompleted,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}

// Export for convenience
export const useUser = useAuth;