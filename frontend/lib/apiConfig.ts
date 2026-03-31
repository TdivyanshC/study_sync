/**
 * StudySync API Configuration
 * Centralized API endpoint definitions
 */

// Backend URL configuration
const getBackendUrl = (): string => {
  // Check environment variable first
  if (process.env.EXPO_PUBLIC_BACKEND_URL) {
    return process.env.EXPO_PUBLIC_BACKEND_URL;
  }
  
  // Development fallback to localhost with ngrok support
  if (__DEV__ || process.env.NODE_ENV === 'development') {
    return process.env.EXPO_PUBLIC_NGROK_URL || 'http://localhost:3000';
  }
  
  // Production - use the user's backend URL
  return 'https://prodify-ap46.onrender.com';
};

// API endpoints
export const API_ENDPOINTS = {
  // Health
  HEALTH: '/health',
  
  // Auth
  AUTH_GOOGLE: '/api/auth/google', // Native Google Sign-In
  AUTH_CALLBACK: '/api/auth/callback',
  AUTH_PROFILE: '/api/auth/profile',
  
  // Users
  USER_PROFILE: (userId: string) => `/api/users/${userId}`,
  USER_ONBOARDING: '/api/users/onboarding',
  
  // Sessions
  SESSION_START: '/api/sessions/start',
  SESSION_END: '/api/sessions/end',
  SESSION_ACTIVE: '/api/sessions/active',
  SESSIONS: '/api/sessions',
  SESSION_TODAY: '/api/sessions/today',
  
  // Stats
  STATS: '/api/stats',
  STATS_STREAKS: '/api/stats/streaks',
  STATS_TODAY: '/api/stats/today',
  
  // Spaces
  SPACES: '/api/spaces',
  SPACE_JOIN: '/api/spaces/join',
  SPACE_MEMBERS: (spaceId: string) => `/api/spaces/${spaceId}/members`,
  SPACE_ACTIVITY: (spaceId: string) => `/api/spaces/${spaceId}/activity`,
  SPACE_STATS: (spaceId: string) => `/api/spaces/${spaceId}/stats`,
  
  // Friends
  FRIENDS: '/api/friends',
  FRIENDS_PENDING: '/api/friends/pending',
  FRIENDS_REQUEST: '/api/friends/request',
  FRIENDS_ACCEPT: '/api/friends/accept',
  FRIENDS_REJECT: '/api/friends/reject',
  FRIENDS_REMOVE: '/api/friends/remove',
};

// Build full API URL
export const buildApiUrl = (endpoint: string): string => {
  const baseUrl = getBackendUrl();
  
  // Handle function endpoints
  if (typeof endpoint === 'function') {
    return `${baseUrl}${endpoint()}`;
  }
  
  return `${baseUrl}${endpoint}`;
};

// Get base URL only
export const getBaseUrl = (): string => getBackendUrl();
