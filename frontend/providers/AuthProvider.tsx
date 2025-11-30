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
 * AuthProvider with PKCE OAuth and automatic navigation support
 * 
 * This provider automatically handles navigation based on authentication state:
 * - SIGNED_IN: Navigates to '/(tabs)' (home screen)
 * - SIGNED_OUT: Navigates to '/login'
 * 
 * OAuth uses PKCE flow:
 * - Manually opens browser using WebBrowser.openAuthSessionAsync()
 * - Supabase SDK automatically exchanges authorization code for tokens
 * - No manual URL parsing or token extraction needed
 * - onAuthStateChange listener handles session updates and navigation
 * 
 * All sign-in methods (email/password and OAuth) will trigger automatic navigation
 * through the onAuthStateChange listener.
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

  // Initialize session on app start and listen for auth state changes
  useEffect(() => {
    let isMounted = true;

    // Get initial session
    async function getInitialSession() {
      try {
        const { data: { session }, error } = await supabase.auth.getSession();
        
        if (error) {
          console.error('Error getting session:', error.message);
          if (isMounted) {
            setSession(null);
            setUser(null);
            setLoading(false);
          }
          return;
        }

        if (isMounted) {
          console.log('🚀 App loaded - Initial session:', session ? 
            `User: ${session.user?.email} (ID: ${session.user?.id})` : 
            'No session - user needs to authenticate');
          
          // Navigate if user has existing session
          if (session?.user) {
            console.log('📱 Existing session found, navigating to home');
            setTimeout(() => {
              router.replace('/(tabs)');
            }, 100);
          }
          
          setSession(session);
          setUser(session?.user ?? null);
          setLoading(false);
        }
      } catch (error) {
        console.error('Error initializing session:', error);
        if (isMounted) {
          setSession(null);
          setUser(null);
          setLoading(false);
        }
      }
    }

    getInitialSession();

    // Listen for auth state changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        console.log('Auth state changed:', event);
        
        if (isMounted) {
          setSession(session);
          setUser(session?.user ?? null);
          setLoading(false);
          
          // Handle SIGNED_IN event for navigation
          if (event === 'SIGNED_IN' && session?.user) {
            console.log('✅ User signed in successfully, navigating to home');
            // Add small delay to ensure session is fully established
            setTimeout(() => {
              router.replace('/(tabs)');
            }, 100);
          }
          
          // Handle SIGNED_OUT event for navigation
          if (event === 'SIGNED_OUT') {
            console.log('👋 User signed out, navigating to login');
            router.replace('/login');
          }
        }
      }
    );

    // Handle OAuth callback deep links
    const handleDeepLink = ({ url }: { url: string }) => {
      console.log('🔗 Deep link received for session processing:', url);
      
      // Check if this is our OAuth callback URL with code parameter
      if (url.includes('/auth/callback?code=')) {
        console.log('🔄 OAuth callback detected, exchanging authorization code for tokens...');
        
        // Extract the authorization code from the URL
        const urlObj = new URL(url);
        const code = urlObj.searchParams.get('code');
        
        if (code) {
          console.log('📝 Authorization code extracted:', code);
          
          // Explicitly exchange the code for tokens
          setTimeout(async () => {
            try {
              console.log('🔄 Exchanging code for session...');
              const { data, error } = await supabase.auth.exchangeCodeForSession(code);
              
              if (error) {
                console.error('Code exchange error:', error);
              } else if (data.session) {
                console.log('✅ Session established via code exchange:', data.session.user?.email);
              } else {
                console.log('⚠️ Code exchange succeeded but no session returned');
              }
            } catch (error) {
              console.error('Code exchange failed:', error);
            }
          }, 1000);
        } else {
          console.log('❌ No authorization code found in URL');
        }
      }
    };

    // Add deep link listener for OAuth callbacks
    let linkingSubscription: any = null;
    try {
      if (Linking && typeof Linking.addEventListener === 'function') {
        linkingSubscription = Linking.addEventListener('url', handleDeepLink);
      } else {
        console.warn('Linking.addEventListener is not available');
      }
    } catch (error) {
      console.warn('Failed to setup deep link listener:', error);
    }

    return () => {
      isMounted = false;
      subscription.unsubscribe();
      if (linkingSubscription && typeof linkingSubscription.remove === 'function') {
        linkingSubscription.remove();
      }
    };
  }, []);



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

      // Session will be updated by the onAuthStateChange listener
      console.log('Email login successful:', data.user?.email);
    } catch (error: any) {
      console.error('Login error:', error.message);
      throw new Error(error.message || 'Failed to sign in');
    } finally {
      setLoading(false);
    }
  };

  // PKCE OAuth implementation - let Supabase handle everything
  const loginWithGoogle = async (): Promise<void> => {
    setLoading(true);
    try {
      // Check if Google Web Client ID is configured
      const googleClientId = process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID;
      if (!googleClientId || googleClientId === 'your_google_web_client_id_here') {
        throw new Error('Google Web Client ID is not configured. Please set EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID in your .env file.');
      }

      // Use the redirect URL that works with Expo development
      const redirectTo = 'exp://192.168.1.11:8081/--/auth/callback';

      console.log('🔄 Starting Google OAuth with PKCE flow');
      console.log('Redirect to:', redirectTo);

      // Get OAuth URL from Supabase with PKCE flow
      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: redirectTo,
          skipBrowserRedirect: true, // We'll open manually
        }
      });

      if (error) {
        console.error('OAuth error:', error);
        throw error;
      }

      console.log('✅ OAuth URL generated:', data.url);

      // Open the OAuth URL manually using WebBrowser
      const result = await WebBrowser.openAuthSessionAsync(
        data.url,
        redirectTo
      );

      console.log('🔍 Auth session result:', result.type, 'Browser opened successfully');

      // The onAuthStateChange listener will handle the session automatically
      // when Supabase processes the OAuth callback

      // No need to manually handle the callback - the onAuthStateChange listener
      // will automatically detect when the session is established and navigate

    } catch (error: any) {
      console.error('Google login error:', error.message);
      throw new Error(error.message || 'Failed to sign in with Google');
    } finally {
      setLoading(false);
    }
  };

  const logout = async (): Promise<void> => {
    setLoading(true);
    try {
      const { error } = await supabase.auth.signOut();
      
      if (error) {
        throw error;
      }

      // Session will be cleared by the onAuthStateChange listener
      console.log('Logout successful');
    } catch (error: any) {
      console.error('Logout error:', error.message);
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