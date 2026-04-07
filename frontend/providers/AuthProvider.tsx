import React, { createContext, useContext, useEffect, useState, useRef, ReactNode } from 'react';
import { router } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { 
  signInWithGoogleNative, 
  signOutGoogle, 
  AuthResponse,
} from '../lib/auth/nativeGoogleAuth';
import { 
  setAuthToken,
  getAuthToken,
  getUserData,
  setUserData,
  removeAuthToken,
  removeUserData,
  clearAuthData
} from '../lib/auth/tokenStorage';
import { backendApi } from '../src/api/backendApi';
import { buildApiUrl, API_ENDPOINTS } from '../lib/apiConfig';

// Custom user type for native auth
interface CustomUser {
  id: string;
  email: string;
  username: string;
  displayName?: string | null;
  avatarUrl?: string | null;
  gmailName?: string | null;
  onboardingCompleted: boolean;
}

interface AuthContextType {
  user: CustomUser | null;
  session: string | null;
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

// Keys for storing auth data
const AUTH_TOKEN_KEY = 'study_sync_auth_token';
const USER_DATA_KEY = 'study_sync_user_data';

export function AuthProvider({ children }: AuthProviderProps): React.ReactNode {
  const [user, setUser] = useState<CustomUser | null>(null);
  const [session, setSession] = useState<string | null>(null);
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
  const handleNavigation = (user: CustomUser, userStatus: { hasUsername: boolean; hasCompletedOnboarding: boolean }) => {
    const now = Date.now();
    
    console.log('🧭 handleNavigation called:', {
      user: user?.email,
      hasUsername: userStatus.hasUsername,
      onboardingCompleted: userStatus.hasCompletedOnboarding
    });
    
    // Debounce: prevent navigation if it happened recently
    if (now - lastNavigationRef.current < NAVIGATION_DEBOUNCE_MS) {
      console.log('⏭️ Navigation debounced, too soon since last navigation');
      return;
    }

    lastNavigationRef.current = now;
    
    // Always navigate regardless of lock status
    if (!user) {
      console.log('🔄 No user - navigating to login');
      router.replace('/login');
    } else if (!userStatus.hasCompletedOnboarding) {
      console.log('🔄 New user - navigating to onboarding');
      router.replace('/onboarding-username');
    } else {
      console.log('🔄 Returning user - navigating to home');
      router.replace('/(tabs)');
    }

    setHasNavigated(true);
  };

  // Check user status (username and onboarding)
  const checkUserStatus = async (userId: string) => {
    try {
      console.log('🔍 Checking user status for user:', userId);

      // Get user data from our backend (MongoDB)
      const userData = await backendApi.getProfile();
      
      return {
        hasUsername: !!(userData?.username && userData.username.trim()),
        hasCompletedOnboarding: userData?.onboarding_completed || false
      };
    } catch (error) {
      console.warn('⚠️ Error checking user status:', error);
      return { hasUsername: false, hasCompletedOnboarding: false };
    }
  };

  // Ping health endpoint on app launch to warm the server (prevent cold start)
  useEffect(() => {
    const warmServer = async () => {
      try {
        console.log('🌡️ Warming server with health check...');
        const healthUrl = buildApiUrl(API_ENDPOINTS.HEALTH);
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 10000);
        
        const response = await fetch(healthUrl, {
          method: 'GET',
          signal: controller.signal,
        });
        
        clearTimeout(timeoutId);
        
        if (response.ok) {
          console.log('✅ Server warmed up successfully');
        } else {
          console.warn('⚠️ Health check returned non-OK status:', response.status);
        }
      } catch (error: any) {
        console.warn('⚠️ Server warm-up failed (non-critical):', error.message);
        // Don't throw - this is non-critical
      }
    };
    
    warmServer();
  }, []);

  // Enhanced session initialization with better timing
  useEffect(() => {
    let isMounted = true;
    let initializationAttempts = 0;
    const maxAttempts = 3;

    const initializeAuth = async () => {
      try {
        initializationAttempts++;
        console.log(`🚀 Initializing authentication... (Attempt ${initializationAttempts})`);
        
        // Wait with exponential backoff
        const delay = Math.min(1000 * Math.pow(2, initializationAttempts - 1), 5000);
        if (initializationAttempts > 1) {
          await new Promise(resolve => setTimeout(resolve, delay));
        }
        
        // Check for stored token (native auth)
        const token = await getAuthToken();
        const storedUserData = await getUserData();

        if (!isMounted) return;

        if (token && storedUserData) {
          // We have a stored session from native Google Sign-In
          const userData = JSON.parse(storedUserData) as CustomUser;
          console.log('✅ Session restored from native auth:', {
            email: userData.email,
            id: userData.id
          });

          setSession(token);
          setUser(userData);
          
          // Check user status for existing users with timeout
          let userStatus = { hasUsername: false, hasCompletedOnboarding: false };
          try {
            const timeoutPromise = new Promise((_, reject) =>
              setTimeout(() => reject(new Error('Timeout')), 3000)
            );
            const checkPromise = checkUserStatus(userData.id);

            userStatus = await Promise.race([checkPromise, timeoutPromise]) as { hasUsername: boolean; hasCompletedOnboarding: boolean };
            console.log('✅ User status checked successfully');
          } catch (statusError) {
            console.warn('⚠️ User status check failed, defaulting to false:', statusError);
            userStatus = { hasUsername: false, hasCompletedOnboarding: false };
          }

          setHasUsername(userStatus.hasUsername);
          setHasCompletedOnboarding(userStatus.hasCompletedOnboarding);

          // Always mark as initialized FIRST before attempting navigation
          setLoading(false);
          setIsInitialized(true);

          // Handle navigation for session restoration - always attempt navigation
          handleNavigation(userData, userStatus);
        } else {
          console.log('ℹ️ No existing session found - user needs to authenticate');
          
          // Always mark as initialized FIRST
          setLoading(false);
          setIsInitialized(true);
          
          // Navigate to login when no session exists
          console.log('🔄 No session - navigating to login');
          setTimeout(() => {
            router.replace('/login');
            setHasNavigated(true);
          }, 100);
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

    // SAFETY FALLBACK: Force initialization after maximum 8 seconds no matter what
    // This ensures app never gets stuck on splash screen forever
    const safetyTimeout = setTimeout(() => {
      if (isMounted && !isInitialized) {
        console.warn('⚠️ SAFETY FALLBACK: Forcing auth initialization after timeout');
        setLoading(false);
        setIsInitialized(true);
        
        // Navigate to login as final fallback
        setTimeout(() => {
          router.replace('/login');
          setHasNavigated(true);
        }, 100);
      }
    }, 8000);

    return () => {
      isMounted = false;
      clearTimeout(safetyTimeout);
    };
  }, []);

  // Refresh session function
  const refreshSession = async (): Promise<void> => {
    try {
      console.log('🔄 Refreshing session...');
      setLoading(true);
      
      // For native auth, just verify we have a valid token
      const token = await AsyncStorage.getItem(AUTH_TOKEN_KEY);
      if (!token) {
        throw new Error('No session found');
      }
      
      console.log('✅ Session refreshed successfully');
    } catch (error) {
      console.error('❌ Session refresh error:', error);
      throw error;
    } finally {
      setLoading(false);
    }
  };

  // Email/password login (deprecated - kept for backward compatibility)
  const login = async (email: string, password: string): Promise<void> => {
    // This is deprecated - we now use Google Sign-In only
    throw new Error('Email/password login is not supported. Please use Google Sign-In.');
  };

  // Native Google Sign-In function
  const loginWithGoogle = async (): Promise<void> => {
    // Prevent multiple OAuth flows - but reset if stuck
    if (oauthInProgress) {
      console.log('⏭️ OAuth already in progress, resetting state and trying again');
      setOauthInProgress(false);
      setLoading(false);
    }

    setOauthInProgress(true);
    setLoading(true);
    
    try {
      console.log('🔄 Starting Native Google Sign-In...');

      // Use native Google Sign-In with proper error handling
      let authResponse: AuthResponse;
      try {
        authResponse = await signInWithGoogleNative();
      } catch (moduleError: any) {
        // Handle native module missing case gracefully
        if (moduleError.message?.includes('not available') || moduleError.message?.includes('RNGoogleSignin')) {
          console.error('❌ Native Google Sign-In module not found. This requires a native build.');
          throw new Error('Google Sign-In requires the native app build. Please run "expo run:android" or install the full app.');
        }
        throw moduleError;
      }
      
      console.log('✅ Google Sign-In successful:', {
        email: authResponse.user.email,
        id: authResponse.user.id,
        isNewUser: authResponse.isNewUser
      });

      // Store token and user data
      await AsyncStorage.setItem(AUTH_TOKEN_KEY, authResponse.token);
      await AsyncStorage.setItem(USER_DATA_KEY, JSON.stringify(authResponse.user));

      setSession(authResponse.token);
      setUser(authResponse.user);
      setHasUsername(!!authResponse.user.username);
      setHasCompletedOnboarding(authResponse.user.onboardingCompleted);
      
      // IMPORTANT: Reset loading state to show the UI
      setLoading(false);
      setOauthInProgress(false);

      console.log('📍 Navigation state before handleNavigation:', { hasNavigated, navigationLocked });

      // Handle navigation - force navigation on successful login
      const userStatus = { 
        hasUsername: !!authResponse.user.username, 
        hasCompletedOnboarding: authResponse.user.onboardingCompleted 
      };
      
      // Force navigation after login - always navigate regardless of hasNavigated state
      handleNavigation(authResponse.user, userStatus);

    } catch (error: any) {
      console.error('❌ Google login error:', error.message, error);
      console.error('❌ Error type:', error.constructor.name);
      console.error('❌ Error cause:', error.cause);
      
      // Provide more helpful error message with user-friendly defaults
      let errorMessage = error.message || 'Failed to sign in with Google';
      
      // Map specific errors to user-friendly messages
      if (errorMessage.includes('network') || errorMessage.includes('Network')) {
        errorMessage = 'No internet connection.';
      } else if (errorMessage.includes('timeout') || errorMessage.includes('timed out')) {
        errorMessage = 'Connection timed out. Please try again.';
      } else if (errorMessage.includes('Play Services') || errorMessage.includes('play services')) {
        errorMessage = 'Google Play Services not available. Please install or update Google Play Services.';
      } else if (errorMessage.includes('idToken') || errorMessage.includes('ID token')) {
        errorMessage = 'Failed to get authentication token from Google. Please try again.';
      } else if (errorMessage.includes('Sign in failed') || errorMessage.includes('401')) {
        errorMessage = 'Sign in failed. Please try again.';
      } else if (errorMessage.includes('Something went wrong') || errorMessage.includes('500')) {
        errorMessage = 'Something went wrong. Please try again.';
      } else if (errorMessage.includes('Connection timed out')) {
        errorMessage = 'Connection timed out. Please try again.';
      }
      
      throw new Error(errorMessage);
    } finally {
      // ALWAYS reset loading state - this is critical to prevent stuck UI
      console.log('🔄 Resetting loading state in finally block');
      setLoading(false);
      setOauthInProgress(false);
    }
  };

  // Mark onboarding as completed with all collected data
  const markOnboardingCompleted = async (
    step1Data?: { gender?: string; age?: string; relationship?: string },
    step2Data?: { preferred_sessions?: string[] },
    displayName?: string,
    username?: string
  ) => {
    try {
      if (!user) {
        throw new Error('No user found');
      }

      console.log('💾 Marking onboarding as completed...');

      // Call the backend API to complete onboarding
      const result = await backendApi.completeOnboarding({
        step1_data: step1Data || {},
        step2_data: step2Data || {},
        display_name: displayName,
        username: username
      });

      if (!result.success) {
        throw new Error(result.message || 'Failed to complete onboarding');
      }

      console.log('✅ Onboarding completed via backend:', result.message);

      // Update Supabase to mark onboarding as completed
      try {
        const { supabase } = await import('../lib/supabase');
        await supabase
          .from('users')
          .update({ onboarding_completed: true })
          .eq('id', user.id);
        console.log('✅ Supabase onboarding status updated');
      } catch (supabaseError) {
        console.warn('⚠️ Failed to update Supabase onboarding status:', supabaseError);
      }

      // Update local state
      setHasUsername(true);
      setHasCompletedOnboarding(true);

      // Update stored user data
      const updatedUser = {
        ...user,
        username: result.user?.username || user.username,
        displayName: displayName || user.displayName,
        onboardingCompleted: true
      };
      await AsyncStorage.setItem(USER_DATA_KEY, JSON.stringify(updatedUser));
      setUser(updatedUser);

    } catch (error: any) {
      console.error('❌ Error completing onboarding via backend:', error.message);
      throw new Error(error.message || 'Failed to save onboarding data');
    }
  };

  // Logout function
  const logout = async () => {
    try {
      console.log('🔄 Logging out...');
      setLoading(true);
      
      // Sign out from Google
      await signOutGoogle();
      
      // Clear stored auth data
      await clearAuthData();
      
      setUser(null);
      setSession(null);
      setHasNavigated(false);
      setNavigationLocked(false);
      setOauthInProgress(false);
      
      // Navigate to login
      router.replace('/login');
      
    } catch (error) {
      console.error('❌ Logout error:', error);
    } finally {
      setLoading(false);
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
        logout,
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
