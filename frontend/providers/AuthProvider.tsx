import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { makeRedirectUri } from 'expo-auth-session';
import * as WebBrowser from 'expo-web-browser';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '../lib/supabase';
import * as Linking from 'expo-linking';
import { router } from 'expo-router';

// Initialize WebBrowser for OAuth
WebBrowser.maybeCompleteAuthSession();

/**
 * Enhanced AuthProvider with robust session persistence
 * 
 * This provider fixes the issue where users get logged out on app refresh by:
 * - Properly waiting for session restoration before making navigation decisions
 * - Handling session restoration timing issues
 * - Preventing premature navigation to login screen
 * - Ensuring proper token refresh handling
 */

interface AuthContextType {
  user: User | null;
  session: Session | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  loginWithGoogle: () => Promise<void>;
  logout: () => Promise<void>;
}

export const AuthContext = createContext<AuthContextType | undefined>(undefined);

interface AuthProviderProps {
  children: ReactNode;
}

export function AuthProvider({ children }: AuthProviderProps) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [sessionRestored, setSessionRestored] = useState(false);

  // Enhanced session initialization with proper timing
  useEffect(() => {
    let isMounted = true;
    let sessionCheckTimeout: NodeJS.Timeout;

    // Get initial session with better error handling
    async function initializeAuth() {
      try {
        console.log('🚀 Initializing authentication...');
        
        // Wait a bit for AsyncStorage to be ready (important for session persistence)
        await new Promise(resolve => setTimeout(resolve, 100));
        
        const { data: { session }, error } = await supabase.auth.getSession();
        
        if (error) {
          console.error('❌ Error getting session:', error.message);
          if (isMounted) {
            setSession(null);
            setUser(null);
            setLoading(false);
            setSessionRestored(true);
          }
          return;
        }

        if (isMounted) {
          if (session?.user) {
            console.log('✅ Session restored successfully:', {
              email: session.user.email,
              id: session.user.id,
              expiresAt: session.expires_at
            });
            
            // Check if session is expired
            const now = Math.floor(Date.now() / 1000);
            if (session.expires_at && session.expires_at < now) {
              console.log('⚠️ Session expired, user needs to re-authenticate');
              setSession(null);
              setUser(null);
            } else {
              setSession(session);
              setUser(session.user);
              console.log('📱 Session valid, user remains authenticated');
            }
          } else {
            console.log('ℹ️ No existing session found - user needs to authenticate');
            setSession(null);
            setUser(null);
          }
          
          setLoading(false);
          setSessionRestored(true);
        }
      } catch (error) {
        console.error('❌ Error initializing auth:', error);
        if (isMounted) {
          setSession(null);
          setUser(null);
          setLoading(false);
          setSessionRestored(true);
        }
      }
    }

    initializeAuth();

    // Listen for auth state changes with enhanced handling
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        console.log('🔄 Auth state changed:', event, session ? 'Session present' : 'No session');
        
        if (!isMounted) return;

        // Handle session updates
        setSession(session);
        setUser(session?.user ?? null);
        setLoading(false);

        // Only navigate after session restoration is complete
        if (sessionRestored) {
          if (event === 'SIGNED_IN' && session?.user) {
            console.log('✅ User signed in, navigating to home');
            router.replace('/(tabs)');
          } else if (event === 'SIGNED_OUT') {
            console.log('👋 User signed out, navigating to login');
            router.replace('/login');
          }
        }
      }
    );

    // Cleanup
    return () => {
      isMounted = false;
      subscription.unsubscribe();
    };
    // Cleanup
    return () => {
      isMounted = false;
      if (typeof sessionCheckTimeout !== 'undefined') {
        clearTimeout(sessionCheckTimeout);
      }
      subscription.unsubscribe();
    };
  }, [sessionRestored]);

  // Handle deep linking for OAuth callbacks
  useEffect(() => {
    const handleDeepLink = ({ url }: { url: string }) => {
      console.log('🔗 Deep link received for auth:', url);
      
      // Check if this is our OAuth callback URL
      if (url.includes('?code=') && (url.includes('exp://') || url.includes('/auth/callback'))) {
        console.log('🔄 Processing OAuth callback...');
        
        const urlObj = new URL(url);
        const code = urlObj.searchParams.get('code');
        
        if (code) {
          console.log('📝 Authorization code found, exchanging for session...');
          
          setTimeout(async () => {
            try {
              const { data, error } = await supabase.auth.exchangeCodeForSession(code);
              
              if (error) {
                console.error('❌ Code exchange failed:', error);
              } else if (data.session) {
                console.log('✅ Session established via code exchange');
              }
            } catch (error) {
              console.error('❌ Code exchange error:', error);
            }
          }, 500);
        }
      }
    };

    // Setup deep link listener
    let linkingSubscription: any = null;
    try {
      if (Linking && typeof Linking.addEventListener === 'function') {
        linkingSubscription = Linking.addEventListener('url', handleDeepLink);
      }
    } catch (error) {
      console.warn('⚠️ Failed to setup deep link listener:', error);
    }

    return () => {
      if (linkingSubscription && typeof linkingSubscription.remove === 'function') {
        linkingSubscription.remove();
      }
    };
  }, []);

  // Enhanced login function
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

  // Enhanced Google OAuth function
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
    login,
    loginWithGoogle,
    logout,
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