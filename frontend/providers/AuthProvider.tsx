import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { makeRedirectUri } from 'expo-auth-session';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '../lib/supabase';

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
          console.log('Initial session:', session ? `User: ${session.user?.email}` : 'No session');
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

    // Listen for auth state changes - this handles OAuth redirects automatically
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        console.log('Auth state changed:', event);
        
        if (isMounted) {
          setSession(session);
          setUser(session?.user ?? null);
          setLoading(false);
        }
      }
    );

    return () => {
      isMounted = false;
      subscription.unsubscribe();
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

  // 🔥 FLOW A IMPLEMENTATION - Expo AuthSession Proxy Mode
  const loginWithGoogle = async (): Promise<void> => {
    setLoading(true);
    try {
      // Use Expo proxy URL for reliable OAuth handling
      const redirectUri = 'https://auth.expo.io/@tdivyanshc/study-sync';
      
      console.log('Redirect URI in OAuth request:');
      console.log(redirectUri);
      
      if (!redirectUri) {
        throw new Error('Redirect URI is null - Expo proxy URL failed');
      }
      
      console.log('🔄 Starting Google OAuth Flow A with Expo proxy mode');

      // Flow A implementation with Expo proxy - get OAuth URL
      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: redirectUri
        }
      });

      if (error) {
        console.error('OAuth error:', error);
        throw error;
      }

      console.log('✅ OAuth URL generated:', data.url);
      console.log('🌐 Opening browser for Google authentication...');
      
      // Open the OAuth URL in browser (required for React Native)
      const { openAuthSessionAsync } = await import('expo-web-browser');
      await openAuthSessionAsync(data.url, redirectUri);
      
      // The onAuthStateChange listener will handle the session when user returns
      
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