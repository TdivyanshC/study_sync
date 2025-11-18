/**
 * Comprehensive API Client for StudySync Backend Integration
 * Extends existing gamificationApi and sessionApi with full backend connectivity
 */

import { gamificationApi } from './gamificationApi';
import { sessionApi } from './sessionApi';

// Optional imports with fallbacks for web compatibility
let SecureStore: any = null;
let NetInfo: any = null;

try {
  SecureStore = require('expo-secure-store');
} catch (e) {
  console.warn('expo-secure-store not available, using mock implementation');
  SecureStore = {
    async getItemAsync(key: string) { return null; },
    async setItemAsync(key: string, value: string) { return; },
    async deleteItemAsync(key: string) { return; }
  };
}

try {
  NetInfo = require('@react-native-netinfo/netinfo');
} catch (e) {
  console.warn('@react-native-netinfo/netinfo not available, using mock implementation');
  NetInfo = {
    async fetch() { return { isConnected: true }; }
  };
}

// Extended types for complete backend integration
export interface BackendHealthResponse {
  status: 'healthy' | 'unhealthy';
  timestamp: string;
  services: string[];
  uptime: string;
  version: string;
}

export interface SessionStartRequest {
  user_id: string;
  space_id?: string;
  duration_minutes: number;
  efficiency?: number;
}

export interface SessionStartResponse {
  success: boolean;
  session_id: string;
  started_at: string;
  message: string;
}

export interface SessionConfirmRequest {
  session_id: string;
  user_id: string;
}

export interface SessionEndRequest {
  session_id: string;
  duration_minutes: number;
  efficiency?: number;
}

export interface XPUserResponse {
  success: boolean;
  user_id: string;
  xp: number;
  level: number;
  total_xp: number;
  xp_history: Array<{
    id: string;
    amount: number;
    source: string;
    created_at: string;
  }>;
}

export interface StreakUserResponse {
  success: boolean;
  user_id: string;
  current_streak: number;
  best_streak: number;
  streak_active: boolean;
  last_study_date?: string;
}

export interface AuditUserResponse {
  success: boolean;
  user_id: string;
  audit_risk: number;
  audit_valid: boolean;
  forgiveness_percent: number;
  audit_patterns: string[];
  audit_messages: string[];
}

export interface RankingUserResponse {
  success: boolean;
  user_id: string;
  tier: string;
  tier_info: {
    name: string;
    emoji: string;
    color: string;
    min_xp: number;
    min_streak: number;
  };
  score: number;
  progress_percent: number;
  promoted: boolean;
  next_tier?: string;
}

export interface BadgesUserResponse {
  success: boolean;
  user_id: string;
  badges: Array<{
    id: string;
    title: string;
    description: string;
    icon_url?: string;
    earned_at: string;
  }>;
  total_badges: number;
}

export interface BackendSessionSummary {
  success: boolean;
  user_id: string;
  session_id: string;
  processed_at: string;
  
  // XP Information
  xp_delta: number;
  xp_reason: string;
  total_xp: number;
  level: number;
  
  // Streak Information
  streak_status: 'maintained' | 'broken' | 'unknown';
  streak_delta: number;
  current_streak: number;
  best_streak: number;
  streak_milestone?: string | null;
  
  // Audit Information
  audit_risk: number;
  audit_valid: boolean;
  audit_patterns: string[];
  forgiveness_percent: number;
  audit_messages: string[];
  
  // Ranking Information
  ranking: {
    tier: string;
    tier_info: {
      name: string;
      emoji: string;
      color: string;
      min_xp: number;
      min_streak: number;
    };
    score: number;
    progress_percent: number;
    promoted: boolean;
    next_tier?: string;
  };
  
  // Notification hooks
  notifications: {
    xp_gained: boolean;
    streak_maintained: boolean;
    streak_milestone: boolean;
    ranking_promoted: boolean;
    confetti_trigger: boolean;
  };
}

class ApiClient {
  private baseUrl: string;
  private maxRetries: number = 3;
  private retryDelay: number = 1000;

  constructor() {
    this.baseUrl = process.env.EXPO_PUBLIC_API_URL || 'http://localhost:8000/api';
  }

  /**
   * Get authentication token from secure storage
   */
  private async getAuthToken(): Promise<string | null> {
    try {
      return await SecureStore.getItemAsync('auth_token');
    } catch (error) {
      console.error('Failed to get auth token:', error);
      return null;
    }
  }

  /**
   * Make authenticated API request with retry logic
   */
  private async makeRequest<T>(
    endpoint: string,
    options: RequestInit = {},
    retryCount: number = 0
  ): Promise<T> {
    try {
      // Check network connectivity
      const state = await NetInfo.fetch();
      if (!state.isConnected) {
        throw new Error('No internet connection');
      }

      const token = await this.getAuthToken();
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
        ...options.headers as Record<string, string>,
      };

      if (token) {
        headers.Authorization = `Bearer ${token}`;
      }

      const response = await fetch(`${this.baseUrl}${endpoint}`, {
        ...options,
        headers,
      });

      if (!response.ok) {
        if (response.status === 401 && retryCount < this.maxRetries) {
          console.log('Token expired, retrying...');
          return this.makeRequest(endpoint, options, retryCount + 1);
        }
        
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      return await response.json();
    } catch (error) {
      if (retryCount < this.maxRetries) {
        console.log(`Request failed, retrying... (${retryCount + 1}/${this.maxRetries})`);
        await new Promise(resolve => setTimeout(resolve, this.retryDelay * Math.pow(2, retryCount)));
        return this.makeRequest(endpoint, options, retryCount + 1);
      }
      
      throw error;
    }
  }

  // Health Check
  async getHealth(): Promise<BackendHealthResponse> {
    return this.makeRequest<BackendHealthResponse>('/health');
  }

  // Session Management Endpoints
  async startSession(request: SessionStartRequest): Promise<SessionStartResponse> {
    return this.makeRequest<SessionStartResponse>('/session/start', {
      method: 'POST',
      body: JSON.stringify(request),
    });
  }

  async confirmSession(request: SessionConfirmRequest): Promise<{ success: boolean; message: string }> {
    return this.makeRequest('/session/confirm', {
      method: 'POST',
      body: JSON.stringify(request),
    });
  }

  async endSession(request: SessionEndRequest): Promise<{ success: boolean; xp_gained: number; level_up: boolean }> {
    return this.makeRequest('/session/end', {
      method: 'POST',
      body: JSON.stringify(request),
    });
  }

  // XP Endpoints
  async getXPUser(userId: string): Promise<XPUserResponse> {
    return this.makeRequest<XPUserResponse>(`/xp/user/${userId}`);
  }

  // Streak Endpoints
  async getStreakUser(userId: string): Promise<StreakUserResponse> {
    return this.makeRequest<StreakUserResponse>(`/streak/user/${userId}`);
  }

  // Audit Endpoints
  async getAuditUser(userId: string): Promise<AuditUserResponse> {
    return this.makeRequest<AuditUserResponse>(`/audit/user/${userId}`);
  }

  // Ranking Endpoints
  async getRankingUser(userId: string): Promise<RankingUserResponse> {
    return this.makeRequest<RankingUserResponse>(`/ranking/user/${userId}`);
  }

  // Badges Endpoints
  async getBadgesUser(userId: string): Promise<BadgesUserResponse> {
    return this.makeRequest<BadgesUserResponse>(`/badges/user/${userId}`);
  }

  // Extended Session Processing
  async processSession(sessionId: string): Promise<BackendSessionSummary> {
    return this.makeRequest<BackendSessionSummary>(`/session/process/${sessionId}`, {
      method: 'POST',
    });
  }

  async getSessionStatus(sessionId: string): Promise<{ success: boolean; session_id: string; user_id: string; processed: boolean }> {
    return this.makeRequest(`/session/status/${sessionId}`);
  }

  // Real-time Health Check for Session Service
  async checkSessionHealth(): Promise<{ status: string; services: string[] }> {
    return this.makeRequest('/session/health');
  }

  // Enhanced XP Stats (extends existing gamificationApi)
  async getEnhancedUserXPStats(userId: string) {
    try {
      // Get both basic XP data and enhanced stats
      const [xpUser, xpStats] = await Promise.all([
        this.getXPUser(userId),
        gamificationApi.getUserXPStats(userId),
      ]);

      return {
        ...xpStats,
        total_xp: xpUser.total_xp,
        level: xpUser.level,
        xp_history: xpUser.xp_history,
      };
    } catch (error) {
      console.error('Failed to get enhanced XP stats:', error);
      throw error;
    }
  }

  // Enhanced Streak Data (combines multiple sources)
  async getEnhancedStreakData(userId: string) {
    try {
      const [streakUser, todayMetrics] = await Promise.all([
        this.getStreakUser(userId),
        gamificationApi.getTodayMetrics(userId),
      ]);

      return {
        ...streakUser,
        today_metrics: todayMetrics,
      };
    } catch (error) {
      console.error('Failed to get enhanced streak data:', error);
      throw error;
    }
  }

  // Enhanced Ranking Data
  async getEnhancedRankingData(userId: string) {
    try {
      const [rankingUser, leaderboard] = await Promise.all([
        this.getRankingUser(userId),
        gamificationApi.getLeaderboard('weekly'),
      ]);

      // Find user's position in leaderboard
      const userPosition = leaderboard.data.entries.findIndex(entry => entry.user_id === userId) + 1;

      return {
        ...rankingUser,
        leaderboard_position: userPosition || null,
        leaderboard_data: leaderboard.data,
      };
    } catch (error) {
      console.error('Failed to get enhanced ranking data:', error);
      throw error;
    }
  }

  // Complete User Profile Aggregation
  async getCompleteUserProfile(userId: string) {
    try {
      const [health, xpData, streakData, auditData, rankingData, badgesData] = await Promise.all([
        this.getHealth().catch(() => ({ status: 'unknown' })),
        this.getEnhancedUserXPStats(userId),
        this.getEnhancedStreakData(userId),
        this.getAuditUser(userId),
        this.getEnhancedRankingData(userId),
        this.getBadgesUser(userId),
      ]);

      return {
        health,
        xp: xpData,
        streak: streakData,
        audit: auditData,
        ranking: rankingData,
        badges: badgesData,
        last_updated: new Date().toISOString(),
      };
    } catch (error) {
      console.error('Failed to get complete user profile:', error);
      throw error;
    }
  }

  // Bulk data sync for offline support
  async syncUserData(userId: string, lastSync?: string) {
    try {
      const profile = await this.getCompleteUserProfile(userId);
      
      return {
        success: true,
        profile,
        sync_timestamp: new Date().toISOString(),
      };
    } catch (error) {
      console.error('Failed to sync user data:', error);
      throw error;
    }
  }

  // Debug and monitoring endpoints
  async getDebugInfo(sessionId?: string) {
    const endpoint = sessionId ? `/debug/session/${sessionId}` : '/debug/health';
    return this.makeRequest(endpoint);
  }

  // Test endpoints for development
  async seedTestData(): Promise<{ success: boolean; message: string; data?: any }> {
    return this.makeRequest('/test/seed', {
      method: 'POST',
    });
  }

  async insertSampleData(): Promise<{ success: boolean; message: string; data?: any }> {
    return this.makeRequest('/test/insert-sample-data', {
      method: 'POST',
    });
  }
}

// Export singleton instance
export const apiClient = new ApiClient();

// Export enhanced APIs
export { gamificationApi, sessionApi };

export default apiClient;