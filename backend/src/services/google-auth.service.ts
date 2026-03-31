import { OAuth2Client } from 'google-auth-library';
import { config } from '../config/env';

/**
 * Google tokeninfo response interface
 */
interface GoogleTokenInfoResponse {
  error?: string;
  error_description?: string;
  aud?: string;
  sub?: string;
  email?: string;
  name?: string;
  picture?: string;
  given_name?: string;
  family_name?: string;
}

/**
 * Verify Google ID token from native Google Sign-In
 * Uses the tokeninfo endpoint approach like the working project (Patriot Pulse)
 */
export const verifyGoogleIdToken = async (idToken: string): Promise<GoogleUserPayload | null> => {
  try {
    console.log('🔐 Verifying Google ID token...');
    
    // Verify the token by calling Google's tokeninfo endpoint
    // This is the same approach used by the working project
    const tokenInfoUrl = `https://oauth2.googleapis.com/tokeninfo?id_token=${idToken}`;
    console.log('📡 Calling Google tokeninfo endpoint...');
    
    const response = await fetch(tokenInfoUrl);
    
    if (!response.ok) {
      console.error('Google tokeninfo response not ok:', response.status);
      return null;
    }
    
    const payload: GoogleTokenInfoResponse = await response.json();
    console.log('📬 Google tokeninfo response received');
    
    // Check for error in response
    if (payload.error) {
      console.error('Google tokeninfo error:', payload.error, payload.error_description);
      return null;
    }
    
    // Verify the audience matches our client IDs
    const validAudience = [
      config.GOOGLE_ANDROID_CLIENT_ID,
      config.GOOGLE_CLIENT_ID
    ];
    
    console.log('🔍 Token audience:', payload.aud);
    console.log('✅ Valid audiences:', validAudience);
    
    if (!payload.aud || !validAudience.includes(payload.aud)) {
      console.error('Token audience mismatch:', payload.aud, 'Expected one of:', validAudience);
      return null;
    }
    
    if (!payload.email) {
      console.error('No email in token payload');
      return null;
    }
    
    console.log('✅ Google token verified successfully for:', payload.email);
    
    return {
      googleId: payload.sub || '',
      email: payload.email,
      name: payload.name || undefined,
      picture: payload.picture || undefined,
      givenName: payload.given_name || undefined,
      familyName: payload.family_name || undefined,
    };
  } catch (error) {
    console.error('Google ID token verification failed:', error);
    return null;
  }
};

/**
 * Google User payload interface
 */
export interface GoogleUserPayload {
  googleId: string;
  email: string;
  name?: string;
  picture?: string;
  givenName?: string;
  familyName?: string;
}