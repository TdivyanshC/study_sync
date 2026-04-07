import { API_ENDPOINTS, buildApiUrl } from '../../lib/apiConfig';

// Lazy loaded Google Sign-In module - only loaded when actually needed
let GoogleSignInModule: typeof import('@react-native-google-signin/google-signin') | null = null;
let isConfigured = false;

// Get Google client IDs from environment
const getGoogleWebClientId = (): string => {
  if (process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID) {
    return process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID;
  }
  // Default web client ID
  return '944168135230-d85l1tlunaqumisao3iap07re4ir2gpk.apps.googleusercontent.com';
};

/**
 * Safely load and initialize Google Sign-In module
 * Returns null if native module is not available
 */
const getGoogleSignIn = async (): Promise<typeof import('@react-native-google-signin/google-signin') | null> => {
  if (GoogleSignInModule) {
    if (!isConfigured) {
      try {
        GoogleSignInModule.GoogleSignin.configure({
          scopes: ['profile', 'email'],
          webClientId: getGoogleWebClientId(),
          offlineAccess: true,
          forceCodeForRefreshToken: true,
        });
        isConfigured = true;
        console.log('🔧 Google Sign-In configured successfully');
      } catch (configureError) {
        console.warn('⚠️ Failed to configure Google Sign-In:', configureError);
      }
    }
    return GoogleSignInModule;
  }

  try {
    // Dynamically import only when needed - avoids crash at app startup
    const module = await import('@react-native-google-signin/google-signin');
    
    // Verify native module actually exists
    if (!module.GoogleSignin) {
      console.warn('⚠️ GoogleSignin native module not available');
      return null;
    }

    GoogleSignInModule = module;

    // Configure after successful load
    GoogleSignInModule.GoogleSignin.configure({
      scopes: ['profile', 'email'],
      webClientId: getGoogleWebClientId(),
      offlineAccess: true,
      forceCodeForRefreshToken: true,
    });
    
    isConfigured = true;
    console.log('✅ Google Sign-In module loaded and configured');
    
    return GoogleSignInModule;
  } catch (importError) {
    console.error('❌ Failed to load Google Sign-In module:', importError);
    return null;
  }
};

/**
 * Google Sign-In user data interface
 */
export interface GoogleUserData {
  id: string;
  email: string;
  name: string;
  photo: string | null;
  firstName: string | null;
  lastName: string | null;
}

/**
 * Auth response from backend
 */
export interface AuthResponse {
  token: string;
  user: {
    id: string;
    email: string;
    username: string;
    displayName: string | null;
    avatarUrl: string | null;
    gmailName: string | null;
    onboardingCompleted: boolean;
  };
  isNewUser: boolean;
}

/**
 * Sign in with Google using native Google Sign-In
 * Returns the Google user data and sends ID token to backend
 */
export const signInWithGoogleNative = async (): Promise<AuthResponse> => {
  try {
    const Google = await getGoogleSignIn();
    
    if (!Google) {
      throw new Error('Google Sign-In is not available on this device. Please use an alternative login method.');
    }

    // First, try to sign out to ensure a fresh login flow (forces account selection)
    try {
      const currentUser = await Google.GoogleSignin.getCurrentUser();
      if (currentUser) {
        console.log('🔄 Signed out cached user to force account selection');
        await Google.GoogleSignin.signOut();
      }
    } catch (e) {
      // Ignore - user might not be signed in
    }

    // Check if Play Services are available (Android)
    const hasPlayServices = await Google.GoogleSignin.hasPlayServices();
    if (!hasPlayServices) {
      throw new Error('Google Play Services not available');
    }

    // Trigger Google Sign-In flow and get the response
    const signInResult = await Google.GoogleSignin.signIn();
    
    console.log('📝 Google signIn result:', JSON.stringify(signInResult, null, 2));
    
    // Check if we got the idToken directly from signIn (v14.x behavior)
    let idToken: string | null = null;
    
    if (signInResult && typeof signInResult === 'object') {
      // Try direct idToken property
      if ('idToken' in signInResult) {
        idToken = (signInResult as any).idToken || null;
      }
      // Try data.idToken property
      if (!idToken && 'data' in signInResult) {
        const data = (signInResult as any).data;
        if (data && typeof data === 'object' && 'idToken' in data) {
          idToken = data.idToken || null;
        }
      }
    }
    
    // Fallback: try getTokens()
    if (!idToken) {
      console.log('🔄 Trying getTokens() as fallback...');
      const tokens = await Google.GoogleSignin.getTokens();
      idToken = tokens.idToken;
    }
    
    if (!idToken) {
      console.error('❌ No ID token found in signIn result or tokens');
      throw new Error('No ID token received from Google');
    }
    
    console.log('✅ Got Google ID token');

    // Send the ID token to our backend with timeout
    // Increased timeout to 30 seconds to account for cold starts and Google token verification
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 30000); // 30 second timeout
    
    try {
      const response = await fetch(buildApiUrl(API_ENDPOINTS.AUTH_GOOGLE), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          idToken: idToken,
        }),
        signal: controller.signal,
      });
      
      clearTimeout(timeoutId);

      console.log('📡 Backend response status:', response.status);

      if (!response.ok) {
        const errorData = await response.json();
        console.error('❌ Backend error response:', errorData);
        throw new Error(errorData.error || `Failed to authenticate with backend: ${response.status}`);
      }

      const data: AuthResponse = await response.json();
      console.log('✅ Backend auth successful');
      return data;
    } catch (fetchError: any) {
      clearTimeout(timeoutId);
      if (fetchError.name === 'AbortError') {
        // Request timed out - this could be due to slow backend cold start or network latency
        console.warn('⚠️ Request timed out - attempting retry once...');
        
        // Retry once after a brief delay
        await new Promise(resolve => setTimeout(resolve, 2000));
        
        try {
          const retryResponse = await fetch(buildApiUrl(API_ENDPOINTS.AUTH_GOOGLE), {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              idToken: idToken,
            }),
          });
          
          if (!retryResponse.ok) {
            const error = await retryResponse.json();
            // Handle specific error status codes
            if (retryResponse.status === 401) {
              throw new Error('Sign in failed. Please try again.');
            } else if (retryResponse.status >= 500) {
              throw new Error('Something went wrong. Please try again.');
            }
            throw new Error(error.error || `Failed to authenticate with backend: ${retryResponse.status}`);
          }
          
          const data: AuthResponse = await retryResponse.json();
          console.log('✅ Retry successful after timeout');
          return data;
        } catch (retryError: any) {
          throw new Error('Connection timed out. Please try again.');
        }
      }
      // Check for other specific errors
      if (fetchError.message?.includes('Network') || fetchError.message?.includes('network')) {
        throw new Error('No internet connection.');
      }
      throw fetchError;
    }
  } catch (error: any) {
    console.error('Native Google Sign-In error:', error);
    console.error('Error type:', error.constructor?.name);
    console.error('Error cause:', error.cause);
    
    // Check if it's a network error
    if (error.message?.includes('Network') || error.message?.includes('network')) {
      throw new Error('No internet connection.');
    }
    
    // Check for specific error types and provide better messages
    if (error.message?.includes('Failed to authenticate') || error.message?.includes('401')) {
      throw new Error('Sign in failed. Please try again.');
    }
    if (error.message?.includes('500') || error.message?.includes('Internal server')) {
      throw new Error('Something went wrong. Please try again.');
    }
    if (error.message?.includes('timed out') || error.message?.includes('timeout') || error.message?.includes('timed out')) {
      throw new Error('Connection timed out. Please try again.');
    }
    
    throw new Error(error.message || 'Failed to sign in with Google');
  }
};

/**
 * Sign out from Google
 */
export const signOutGoogle = async (): Promise<void> => {
  try {
    const Google = await getGoogleSignIn();
    if (Google) {
      await Google.GoogleSignin.signOut();
    }
  } catch (error) {
    console.error('Google Sign-Out error:', error);
    // Ignore sign-out errors
  }
};

/**
 * Check if user is currently signed in with Google
 */
export const isGoogleSignedIn = async (): Promise<boolean> => {
  try {
    const Google = await getGoogleSignIn();
    if (!Google) return false;
    
    const user = await Google.GoogleSignin.getCurrentUser();
    return !!user;
  } catch (error) {
    return false;
  }
};

/**
 * Get current signed-in user (if any)
 */
export const getCurrentGoogleUser = async (): Promise<GoogleUserData | null> => {
  try {
    const Google = await getGoogleSignIn();
    if (!Google) return null;
    
    const userInfo = await Google.GoogleSignin.getCurrentUser();
    
    if (!userInfo?.user) {
      return null;
    }

    return {
      id: userInfo.user.id,
      email: userInfo.user.email || '',
      name: userInfo.user.name || '',
      photo: userInfo.user.photo,
      firstName: userInfo.user.givenName,
      lastName: userInfo.user.familyName,
    };
  } catch (error) {
    return null;
  }
};

// Export safe getter instead of direct module reference
export const getGoogleModule = getGoogleSignIn;