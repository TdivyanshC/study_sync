import { OAuth2Client } from 'google-auth-library';
import { config } from '../config/env';

/**
 * Google OAuth2 Client instance
 */
export const googleOAuth2Client = new OAuth2Client(
  config.GOOGLE_CLIENT_ID,
  config.GOOGLE_CLIENT_SECRET,
  'postmessage' // Redirect URI for native apps
);

/**
 * Verify Google ID token from native Google Sign-In
 */
export const verifyGoogleIdToken = async (idToken: string): Promise<GoogleUserPayload | null> => {
  try {
    const ticket = await googleOAuth2Client.verifyIdToken({
      idToken,
      audience: [
        config.GOOGLE_CLIENT_ID, // Android/iOS client ID
        config.GOOGLE_CLIENT_ID, // Web client ID (same as native for this app)
      ],
    });

    const payload = ticket.getPayload();
    if (!payload) {
      return null;
    }

    return {
      googleId: payload.sub,
      email: payload.email,
      name: payload.name,
      picture: payload.picture,
      givenName: payload.given_name,
      familyName: payload.family_name,
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