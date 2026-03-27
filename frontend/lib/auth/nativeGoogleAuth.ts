import * as Google from '@react-native-google-signin/google-signin';
import { API_ENDPOINTS, buildApiUrl } from '../lib/apiConfig';

/**
 * Native Google Sign-In Service for React Native
 * Uses React Native Google Sign-In package instead of web OAuth
 */

// Configure Google Sign-In
Google.GoogleSignin.configure({
  webClientId: process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID,
  offlineUseCode: true,
  scopes: ['profile', 'email'],
});

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

    // Trigger Google Sign-In flow
    const userInfo = await Google.GoogleSignin.signIn();
    
    if (!userInfo.idToken) {
      throw new Error('No ID token received from Google');
    }

    // Send the ID token to our backend
    const response = await fetch(buildApiUrl(API_ENDPOINTS.AUTH_GOOGLE), {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        idToken: userInfo.idToken,
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
    const isSignedIn = await Google.GoogleSignin.isSignedIn();
    return isSignedIn;
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
      email: userInfo.user.email,
      name: userInfo.user.name,
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