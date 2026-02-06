import React, { createContext, useContext, useEffect, useState, useRef, ReactNode } from 'react';
import { makeRedirectUri } from 'expo-auth-session';
import * as WebBrowser from 'expo-web-browser';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '../lib/supabase';
import * as Linking from 'expo-linking';
import { router } from 'expo-router';
import { getApiBaseUrl } from '../lib/constants';
import { backendApi } from '../src/api/backendApi';

// Initialize WebBrowser for OAuth
WebBrowser.maybeCompleteAuthSession();

interface AuthContextType {
  user: User | null;
  session: Session | null;
  loading: boolean;
  isInitialized: boolean;
  hasCompletedOnboarding: boolean;
  hasUsername: boolean;
  hasNavigated: boolean;
  navigationLocked: boolean;
  login: (email: string, password: string) => Promise<void>;
  loginWithGoogle: () => Promise<void>;
  logout: () => Promise<void>;
  refreshSession: () => Promise<void>;
  markOnboardingCompleted: (step1Data?: any, step2Data?: any, displayName?: string) => Promise<void>;
}

export const AuthContext = createContext<AuthContextType | undefined>(undefined);

interface AuthProviderProps {
  children: ReactNode;
}

export function AuthProvider({ children }: AuthProviderProps): React.ReactNode {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [isInitialized, setIsInitialized] = useState(false);
  const [hasNavigated, setHasNavigated] = useState(false);
  const [hasCompletedOnboarding, setHasCompletedOnboarding] = useState(false);
  const [hasUsername, setHasUsername] = useState(false);
  const [navigationLocked, setNavigationLocked] = useState(false);
  const [oauthInProgress, setOauthInProgress] = useState(false);

  // Track last navigation time to prevent rapid navigation calls
  const lastNavigationRef = useRef<number>(0);
  const NAVIGATION_DEBOUNCE_MS = 2000;

  // Centralized navigation function to prevent conflicts
  const handleNavigation = (user: User, userStatus: { hasUsername: boolean; hasCompletedOnboarding: boolean }) => {
    const now = Date.now();
    
    // Debounce: prevent navigation if it happened recently
    if (now - lastNavigationRef.current < NAVIGATION_DEBOUNCE_MS) {
      console.log('⏭️ Navigation debounced, too soon since last navigation');
      return;
    }
    
    // Always allow login navigation, even if navigation is locked
    if (!user && !hasNavigated) {
      console.log('🔄 No user - navigating to login');
      lastNavigationRef.current = now;
      setTimeout(() => {
        router.replace('/login');
        setTimeout(() => {
          setNavigationLocked(false);
          setHasNavigated(true);
        }, 500);
      }, 100);
      return;
    }

    if (navigationLocked) {
      console.log('🔒 Navigation already in progress, skipping...');
      return;
    }

    setNavigationLocked(true);
    lastNavigationRef.current = now;
    console.log('🧭 Starting navigation:', {
      email: user?.email,
      hasUsername: userStatus.hasUsername,
      onboardingCompleted: userStatus.hasCompletedOnboarding
    });

    // Add a small delay to ensure state is settled
    setTimeout(() => {
      if (user && !userStatus.hasUsername) {
        console.log('🔄 New user - navigating to username selection');
        router.replace('/username-selection');
      } else if (user && userStatus.hasUsername && !userStatus.hasCompletedOnboarding) {
        console.log('🔄 User has username but no onboarding - navigating to onboarding step 1');
        router.replace('/onboarding-step1');
      } else if (user && userStatus.hasUsername && userStatus.hasCompletedOnboarding) {
        console.log('🔄 Returning user - navigating to home');
        router.replace('/(tabs)');
      } else {
        console.log('🔄 No user - navigating to login');
        router.replace('/login');
      }

      // Reset navigation flags after a delay to allow for any async operations
      setTimeout(() => {
        setNavigationLocked(false);
        setHasNavigated(true);
      }, 500);
    }, 100);
  };

  // Check user status (username and onboarding)
  const checkUserStatus = async (userId: string) => {
    try {
      console.log('🔍 Checking user status for user:', userId);

      // Check username and onboarding status in the users table
      const { data, error } = await supabase
        .from('users')
        .select('username, onboarding_completed')
        .eq('id', userId)
        .single();

      // If no user found, return defaults (new user)
      if (error && error.code === 'PGRST116') {
        console.log('ℹ️ No user found, treating as new user');
        return { hasUsername: false, hasCompletedOnboarding: false };
      }

      // If other error, log but don't fail the auth process
      if (error) {
        console.warn('⚠️ Error checking user status:', error.message);
        return { hasUsername: false, hasCompletedOnboarding: false };
      }

      return {
        hasUsername: !!(data?.username && data.username.trim()),
        hasCompletedOnboarding: data?.onboarding_completed || false
      };
    } catch (error) {
      console.warn('⚠️ Exception checking user status:', error);
      return { hasUsername: false, hasCompletedOnboarding: false };
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
            setHasUsername(false);
            setLoading(false);
            setIsInitialized(true);

            // Navigate to login even on session error
            if (!hasNavigated && !navigationLocked) {
              console.log('🔄 Session error - navigating to login');
              setTimeout(() => {
                router.replace('/login');
                setTimeout(() => {
                  setNavigationLocked(false);
                  setHasNavigated(true);
                }, 500);
              }, 100);
            }
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
              setHasUsername(false);
            } else {
              setSession(session);
              setUser(session.user);
              
              // Check user status for existing users with timeout
              let userStatus = { hasUsername: false, hasCompletedOnboarding: false };
              try {
                const timeoutPromise = new Promise((_, reject) =>
                  setTimeout(() => reject(new Error('Timeout')), 3000)
                );
                const checkPromise = checkUserStatus(session.user.id);

                userStatus = await Promise.race([checkPromise, timeoutPromise]) as { hasUsername: boolean; hasCompletedOnboarding: boolean };
                console.log('✅ User status checked successfully');
              } catch (statusError) {
                console.warn('⚠️ User status check failed, defaulting to false:', statusError);
                userStatus = { hasUsername: false, hasCompletedOnboarding: false };
              }

              setHasUsername(userStatus.hasUsername);
              setHasCompletedOnboarding(userStatus.hasCompletedOnboarding);

              // Handle navigation for session restoration
              if (!hasNavigated && !navigationLocked) {
                handleNavigation(session.user, userStatus);
              }
              
              console.log('📱 Session valid, user remains authenticated', {
                hasUsername: userStatus.hasUsername,
                onboardingCompleted: userStatus.hasCompletedOnboarding,
                hasNavigated,
                navigationLocked
              });
            }
          } else {
            console.log('ℹ️ No existing session found - user needs to authenticate');
            setSession(null);
            setUser(null);
            setHasCompletedOnboarding(false);
            setHasUsername(false);

            // Navigate to login when no session exists
            if (!hasNavigated && !navigationLocked) {
              console.log('🔄 No session - navigating to login');
              setTimeout(() => {
                router.replace('/login');
                setTimeout(() => {
                  setNavigationLocked(false);
                  setHasNavigated(true);
                }, 500);
              }, 100);
            }
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
          setHasUsername(false);
          setLoading(false);
          setIsInitialized(true);
           
          // Even on error, navigate to login to allow user to authenticate
          if (!hasNavigated && !navigationLocked) {
            console.log('🔄 Auth initialization failed - navigating to login');
            setTimeout(() => {
              router.replace('/login');
              setTimeout(() => {
                setNavigationLocked(false);
                setHasNavigated(true);
              }, 500);
            }, 100);
          }
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
          case 'INITIAL_SESSION':
            console.log('🎯 Initial session detected from OAuth callback');
            if (session?.user) {
              console.log('✅ User from initial session:', {
                email: session.user.email,
                provider: session.user.app_metadata?.provider
              });
              
              // Check user status and navigate accordingly with timeout
              let userStatus = { hasUsername: false, hasCompletedOnboarding: false };
              try {
                const timeoutPromise = new Promise((_, reject) =>
                  setTimeout(() => reject(new Error('Timeout')), 5000)
                );
                const checkPromise = checkUserStatus(session.user.id);

                userStatus = await Promise.race([checkPromise, timeoutPromise]) as { hasUsername: boolean; hasCompletedOnboarding: boolean };
                console.log('✅ User status checked from initial session:', userStatus);
              } catch (statusError) {
                console.warn('⚠️ User status check failed from initial session, defaulting to false:', statusError);
                userStatus = { hasUsername: false, hasCompletedOnboarding: false };
              }

              setHasUsername(userStatus.hasUsername);
              setHasCompletedOnboarding(userStatus.hasCompletedOnboarding);

              // Use centralized navigation function
              if (!hasNavigated && !navigationLocked) {
                handleNavigation(session.user, userStatus);
              }
            }
            break;

          case 'SIGNED_IN':
            if (session?.user) {
              console.log('✅ User signed in:', {
                email: session.user.email,
                provider: session.user.app_metadata?.provider
              });
              
              // Check user status and navigate accordingly with timeout
              let userStatus = { hasUsername: false, hasCompletedOnboarding: false };
              try {
                const timeoutPromise = new Promise((_, reject) =>
                  setTimeout(() => reject(new Error('Timeout')), 3000)
                );
                const checkPromise = checkUserStatus(session.user.id);

                userStatus = await Promise.race([checkPromise, timeoutPromise]) as { hasUsername: boolean; hasCompletedOnboarding: boolean };
                console.log('✅ User status checked during sign in');
              } catch (statusError) {
                console.warn('⚠️ User status check failed during sign in, defaulting to false:', statusError);
                userStatus = { hasUsername: false, hasCompletedOnboarding: false };
              }

              setHasUsername(userStatus.hasUsername);
              setHasCompletedOnboarding(userStatus.hasCompletedOnboarding);

              // Use centralized navigation function
              if (!hasNavigated && !navigationLocked) {
                handleNavigation(session.user, userStatus);
              }
            }
            break;
             
          case 'SIGNED_OUT':
            console.log('👋 User signed out');
            setSession(null);
            setUser(null);
            setHasCompletedOnboarding(false);
            setHasUsername(false);
            setHasNavigated(false);
            setNavigationLocked(false);
            setOauthInProgress(false);
            break;
             
          case 'TOKEN_REFRESHED':
            console.log('🔄 Token refreshed successfully');
            // Only update session state, don't trigger navigation on token refresh
            // This prevents infinite render loops in the web bundler
            if (session) {
              setSession(session);
              setUser(session.user);
            }
            // Don't trigger navigation on TOKEN_REFRESHED - this causes the render loop
            return; // Early return to prevent navigation
             
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
    // Prevent multiple OAuth flows
    if (oauthInProgress) {
      console.log('⏭️ OAuth already in progress, ignoring duplicate call');
      return;
    }

    setOauthInProgress(true);
    setLoading(true);
    
    try {
      const googleClientId = process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID;
      if (!googleClientId || googleClientId === 'your_google_web_client_id_here') {
        throw new Error('Google Web Client ID is not configured. Please set EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID in your .env file.');
      }

      // Use makeRedirectUri for proper Expo deep link handling
      const redirectTo = makeRedirectUri({
        scheme: 'exp',
        path: 'auth/callback',
      });

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

      // Open the OAuth URL in the web browser
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
        // The session will be automatically detected by detectSessionInUrl: true
        // and the onAuthStateChange listener will handle navigation
        // We DON'T reset oauthInProgress here - it will be reset on SIGNED_OUT or timeout
      }

    } catch (error: any) {
      console.error('❌ Google login error:', error.message);
      setOauthInProgress(false);
      throw new Error(error.message || 'Failed to sign in with Google');
    } finally {
      // Don't reset loading(false) here - let the onAuthStateChange handle it
      // This prevents the login button from appearing again during OAuth flow
    }
  };

  // Mark onboarding as completed with all collected data
  const markOnboardingCompleted = async (
    step1Data?: { gender?: string; age?: string; relationship?: string },
    step2Data?: { preferred_sessions?: string[] },
    displayName?: string
  ) => {
    try {
      if (!user) {
        throw new Error('No user found');
      }

      console.log('💾 Marking onboarding as completed...');

      // Call the backend API to complete onboarding
      // This uses the service role key which bypasses RLS
      const result = await backendApi.completeOnboarding({
        step1_data: step1Data || {},
        step2_data: step2Data || {},
        display_name: displayName
      });

      if (!result.success) {
        throw new Error(result.message || 'Failed to complete onboarding');
      }

      console.log('✅ Onboarding completed via backend:', result.message);

      // Update local state
      setHasUsername(true);
      setHasCompletedOnboarding(true);
    } catch (error: any) {
      console.error('❌ Error completing onboarding via backend:', error.message);
      
      // Fallback: try direct Supabase upsert if backend fails
      try {
        console.log('🔄 Attempting fallback direct Supabase upsert...');
        
        const username = displayName 
          ? displayName.toLowerCase().replace(/[^a-z0-9]/g, '') + '_' + user.id.substring(0, 6)
          : user.email?.split('@')[0].toLowerCase().replace(/[^a-z0-9]/g, '') + '_' + user.id.substring(0, 6) || 'user_' + user.id.substring(0, 6);
        
        const publicUserId = 'U' + Math.random().toString(36).substring(2, 8).toUpperCase().slice(0, 6);

        // Update auth metadata
        await supabase.auth.updateUser({
          data: { onboarding_completed: true, username }
        });

        // Upsert user record
        const { error: userError } = await supabase
          .from('users')
          .upsert({
            id: user.id,
            email: user.email,
            username,
            public_user_id: publicUserId,
            display_name: displayName,
            onboarding_completed: true,
            gender: step1Data?.gender,
            age: step1Data?.age ? parseInt(step1Data.age) : null,
            relationship_status: step1Data?.relationship,
            preferred_sessions: step2Data?.preferred_sessions || [],
            updated_at: new Date().toISOString()
          }, { onConflict: 'id' });

        if (userError) {
          console.warn('⚠️ Fallback upsert also failed:', userError.message);
        } else {
          setHasUsername(true);
          setHasCompletedOnboarding(true);
        }
      } catch (fallbackError: any) {
        console.error('❌ Fallback also failed:', fallbackError.message);
        throw new Error(error.message || 'Failed to save onboarding data');
      }
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        session,
        loading,
        isInitialized,
        hasCompletedOnboarding,
        hasUsername,
        hasNavigated,
        navigationLocked,
        login,
        loginWithGoogle,
        logout: async () => {
          try {
            setLoading(true);
            await supabase.auth.signOut();
            setHasNavigated(false);
            setNavigationLocked(false);
            setOauthInProgress(false);
          } catch (error) {
            console.error('❌ Logout error:', error);
          } finally {
            setLoading(false);
          }
        },
        refreshSession,
        markOnboardingCompleted
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
