/**
 * Centralized API Configuration for StudySync Frontend
 * Ensures consistent /api prefix across all endpoints
 */

import { Platform } from 'react-native';

// Get the base backend URL (without /api)
export function getBackendUrl(): string {
  // 1. NGROK override from env
  if (process.env.EXPO_PUBLIC_NGROK_URL) {
    return process.env.EXPO_PUBLIC_NGROK_URL;
  }

  // 2. Expo tunnel / debug mode
  if (typeof location !== "undefined" && location.hostname.includes("exp")) {
    return `https://${location.hostname.replace("exp", "ngrok")}`;
  }

  // 3. LAN IP fallback - Auto-detect user's correct local LAN IP
  try {
    const localIP = getLocalIPAddress();
    if (localIP) {
      return `http://${localIP}:8000`;
    }
  } catch (error) {
    console.warn('Failed to detect local IP:', error);
  }

  // Platform-specific fallback
  if (Platform.OS === 'android') {
    return "http://10.0.2.2:8000"; // Android emulator
  } else if (Platform.OS === 'ios') {
    return "http://localhost:8000"; // iOS simulator
  } else {
    return "http://localhost:8000"; // Web fallback
  }
}

// Get the API base URL with /api prefix
export function getApiBaseUrl(): string {
  return `${getBackendUrl()}/api`;
}

// Auto-detect local IP address for LAN access
function getLocalIPAddress(): string | null {
  try {
    // Use WebRTC to get local IP (works on web)
    if (typeof window !== 'undefined' && window.location) {
      const hostname = window.location.hostname;
      if (hostname === 'localhost' || hostname === '127.0.0.1') {
        return "127.0.0.1";
      }
      
      if (!hostname.includes('localhost') && !hostname.includes('127.0.0.1') && !hostname.includes('ngrok')) {
        return hostname;
      }
    }
  } catch (error) {
    console.warn('Web IP detection failed:', error);
  }
  
  // Fallback to hardcoded common LAN IPs
  const commonIPs = [
    "192.168.1.100",
    "192.168.0.100", 
    "192.168.1.50",
    "192.168.0.50",
    "10.0.0.100"
  ];
  
  return commonIPs[0]; // User should replace <REPLACE_WITH_LAN_IP>
}

// Centralized API endpoint builders
export const API_ENDPOINTS = {
  // Health check
  HEALTH: '/health',
  
  // Gamification endpoints (under /api/xp/)
  XP_AWARD: '/xp/award',
  XP_CALCULATE_SESSION: '/xp/calculate-session',
  XP_LEADERBOARD: '/xp/leaderboard',
  XP_HISTORY: '/xp/history',
  XP_STATS: '/xp/stats',
  XP_AUDIT_VALIDATE: '/xp/audit/validate',
  XP_SYNC_OFFLINE: '/xp/sync/offline',
  XP_EVENTS: '/xp/events',
  XP_AUDIT_SESSIONS: '/xp/audit/sessions',
  
  // Metrics endpoints (under /api/)
  METRICS_TODAY: '/metrics/today',
  
  // Session endpoints (under /api/session/)
  SESSION_START: '/session/start',
  SESSION_CONFIRM: '/session/confirm',
  SESSION_END: '/session/end',
  SESSION_PROCESS: '/session/process',
  SESSION_STATUS: '/session/status',
  SESSION_REPROCESS: '/session/reprocess',
  SESSION_HEALTH: '/session/health',
  
  // Ranking endpoints (under /api/)
  RANKING_STATUS: '/ranking/status',
  RANKING_USER: '/ranking/user',
  RANKING_PROGRESS: '/ranking/user/progress',
  RANKING_EVENTS: '/ranking/events',
  RANKING_PROMOTION_CHECK: '/ranking/promotion/check',
  RANKING_PROMOTE: '/ranking/promote',
  RANKING_LEADERBOARD: '/ranking/leaderboard',
  RANKING_TIERS: '/ranking/tiers',
  
  // Streak endpoints (under /api/)
  STREAK_UPDATE: '/streak/update',
  STREAK_CONTINUITY: '/streak/continuity',
  STREAK_BONUS: '/streak/bonus',
  STREAK_APPLY_MULTIPLIER: '/streak/apply-multiplier',
  STREAK_ANALYTICS: '/streak/analytics',
  
  // Badge endpoints (under /api/badges/)
  BADGES_USER: '/badges/user',
  BADGES_CHECK: '/badges/check',
  BADGES_LEADERBOARD: '/badges/leaderboard',
  BADGES_COLLECTION: '/badges/collection',
  
  // Test endpoints (under /api/)
  TEST_SEED: '/test/seed',
  TEST_INSERT_SAMPLE: '/test/insert-sample-data',
};

// Build full API URL helper
export function buildApiUrl(endpoint: string): string {
  return `${getApiBaseUrl()}${endpoint}`;
}

// Build session API URL helper (for /session/* endpoints)
export function buildSessionApiUrl(endpoint: string): string {
  return `${getApiBaseUrl()}${endpoint}`;
}