import { OAuth2Client } from 'google-auth-library';
import { config } from '../config/env';

/**
 * Google Web OAuth2 Client instance (for backend token verification)
 * Requires GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET env vars
 */
export const googleWebOAuth2Client = new OAuth2Client(
  config.GOOGLE_CLIENT_ID,
  config.GOOGLE_CLIENT_SECRET,
  'postmessage'
);

/**
 * Google Android OAuth2 Client instance (for Android token verification)
 * Requires GOOGLE_ANDROID_CLIENT_ID and GOOGLE_CLIENT_SECRET env vars
 */
export const googleAndroidOAuth2Client = new OAuth2Client(
  config.GOOGLE_ANDROID_CLIENT_ID,
  config.GOOGLE_CLIENT_SECRET,
  'postmessage'
);

/**
 * @deprecated Use googleWebOAuth2Client or googleAndroidOAuth2Client instead
 */
export const googleOAuth2Client = googleWebOAuth2Client;

/**
 * Verify Google ID token from native Google Sign-In
 */
export const verifyGoogleIdToken = async (idToken: string): Promise<GoogleUserPayload | null> => {
  try {
    const ticket = await googleOAuth2Client.verifyIdToken({
      idToken,
      audience: [
        config.GOOGLE_ANDROID_CLIENT_ID, // Android client ID
        config.GOOGLE_CLIENT_ID, // Web client ID
      ],
    });

    const payload = ticket.getPayload();
    if (!payload) {
      return null;
    }

    if (!payload.email) {
      return null;
    }

    return {
      googleId: payload.sub,
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