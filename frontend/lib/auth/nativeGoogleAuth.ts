import * as Google from '@react-native-google-signin/google-signin';
import { API_ENDPOINTS, buildApiUrl } from '../../lib/apiConfig';

// Get Google client IDs from environment
const getGoogleWebClientId = (): string => {
  if (process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID) {
    return process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID;
  }
  // Default web client ID
  return '944168135230-d85l1tlunaqumisao3iap07re4ir2gpk.apps.googleusercontent.com';
};

// Configure Google Sign-In - matching working project (Patriot Pulse) configuration
Google.GoogleSignin.configure({
  scopes: ['profile', 'email'],
  webClientId: getGoogleWebClientId(),
  offlineAccess: true,
  forceCodeForRefreshToken: true,
});

console.log('🔧 Google Sign-In configured with webClientId:', getGoogleWebClientId().substring(0, 30) + '...');

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

    // Send the ID token to our backend
    const response = await fetch(buildApiUrl(API_ENDPOINTS.AUTH_GOOGLE), {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        idToken: idToken,
      }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to authenticate with backend');
    }

    const data: AuthResponse = await response.json();
    return data;
  } catch (error: any) {
    console.error('Native Google Sign-In error:', error);
    console.error('Error type:', error.constructor?.name);
    console.error('Error cause:', error.cause);
    
    // Check if it's a network error
    if (error.message?.includes('Network') || error.message?.includes('network')) {
      throw new Error('Network error. Please check your internet connection.');
    }
    
    throw new Error(error.message || 'Failed to sign in with Google');
  }
};

/**
 * Sign out from Google
 */
export const signOutGoogle = async (): Promise<void> => {
  try {
    await Google.GoogleSignin.signOut();
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

// Export Google Sign-In module for advanced use cases
export { Google };