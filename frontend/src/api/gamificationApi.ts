import * as SecureStore from 'expo-secure-store';
import { NetInfo } from '@react-native-netinfo/netinfo';

// Types for gamification system
export interface XPAwardRequest {
  user_id: string;
  amount: number;
  source: 'session' | 'streak' | 'daily_bonus' | 'milestone';
  metadata?: Record<string, any>;
}

export interface XPAwardResponse {
  success: boolean;
  data: {
    xp_history_id: string;
    total_xp: number;
    level: number;
    user_id: string;
    amount_awarded: number;
  };
  message: string;
}

export interface SessionCalculationRequest {
  session_id: string;
}

export interface SessionCalculationResponse {
  success: boolean;
  data: {
    session_id: string;
    user_id: string;
    duration_minutes: number;
    calculation_details: {
      base_xp: number;
      bonus_pomodoro: number;
      bonus_daily_goal: number;
      milestone_500: number;
      milestone_10000: number;
      total_xp: number;
      calculation_metadata: Record<string, any>;
    };
    xp_awarded: XPAwardResponse['data'];
  };
  message: string;
}

export interface LeaderboardEntry {
  rank: number;
  user_id: string;
  username: string;
  xp: number;
  level: number;
  streak_multiplier: number;
  growth_percentage: number;
}

export interface LeaderboardResponse {
  success: boolean;
  data: {
    period: string;
    entries: LeaderboardEntry[];
    total_users: number;
    generated_at: string;
  };
  message: string;
}

export interface TodayMetrics {
  total_minutes: number;
  xp_earned: number;
  streak_active: boolean;
  space_breakdown: Record<string, number>;
}

export interface XPHistoryEntry {
  id: string;
  amount: number;
  source: string;
  metadata: Record<string, any>;
  created_at: string;
}

export interface XPHistoryResponse {
  success: boolean;
  data: {
    user_id: string;
    xp_history: XPHistoryEntry[];
    total_records: number;
  };
  message: string;
}

export interface SessionEvent {
  session_id: string;
  event_type: 'start' | 'heartbeat' | 'pause' | 'resume' | 'end';
  event_payload: Record<string, any>;
  created_at: string;
}

export interface OfflineSyncRequest {
  user_id: string;
  events: SessionEvent[];
  last_sync?: string;
}

export interface OfflineSyncResponse {
  success: boolean;
  data: {
    synced_events: number;
    pending_events: number;
    conflicts_resolved: number;
    total_events: number;
  };
  message: string;
}

export interface UserRankingStatus {
  user_id: string;
  current_ranking: {
    tier: string;
    tier_info: {
      name: string;
      emoji: string;
      color: string;
      min_xp: number;
      min_streak: number;
      promotion_threshold_xp: number | null;
      promotion_threshold_streak: number | null;
    };
    user_stats: {
      xp: number;
      level: number;
      current_streak: number;
    };
  };
  progress: {
    at_max_tier: boolean;
    progress_to_next: number;
    next_tier: string | null;
    next_tier_info?: {
      name: string;
      emoji: string;
      color: string;
      min_xp: number;
      min_streak: number;
      promotion_threshold_xp: number | null;
      promotion_threshold_streak: number | null;
    };
    xp_progress: number;
    streak_progress: number;
    requirements: {
      xp: number | null;
      streak: number | null;
    };
  };
  leaderboard: {
    position: number;
    total_users: number;
  };
  next_milestones: {
    next_tier: {
      type: string;
      target: string;
      target_name?: string;
      target_emoji?: string;
      xp_needed: number;
      streak_needed: number;
      message?: string;
    };
    streak_milestones: Array<{
      type: string;
      target: string;
      current: number;
      needed: number;
    }>;
    xp_milestones: Array<{
      type: string;
      target: string;
      current: number;
      needed: number;
    }>;
  };
  downgrade_info: {
    should_downgrade: boolean;
    reason: string | null;
  };
}

export interface UserXPStats {
  user_id: string;
  username: string;
  total_xp: number;
  level: number;
  current_streak: number;
  recent_30_days_xp: number;
  xp_sources: Record<string, number>;
  next_level_xp: number;
  level_progress: number;
}

export interface StreakData {
  user_id: string;
  current_streak: number;
  best_streak: number;
  streak_broken: boolean;
  milestone_reached?: string;
  streak_multiplier: number;
  streak_bonus_xp: number;
  streak_active: boolean;
  has_recent_activity: boolean;
  time_until_break?: string;
}

export interface StreakBonusData {
  user_id: string;
  current_streak: number;
  best_streak: number;
  streak_multiplier: number;
  bonus_xp: number;
  bonus_applied: boolean;
  multiplier_applied: boolean;
}

class GamificationApi {
  private baseUrl: string;
  private maxRetries: number = 3;
  private retryDelay: number = 1000; // 1 second

  constructor() {
    this.baseUrl = process.env.EXPO_PUBLIC_API_URL || 'http://localhost:3000/api';
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
          // Token might be expired, try refreshing (implement token refresh logic here)
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

  /**
   * Award XP to a user
   */
  async awardXP(userId: string, amount: number, source: XPAwardRequest['source'], metadata: Record<string, any> = {}): Promise<XPAwardResponse> {
    const request: XPAwardRequest = {
      user_id: userId,
      amount,
      source,
      metadata,
    };

    return this.makeRequest<XPAwardResponse>('/xp/award', {
      method: 'POST',
      body: JSON.stringify(request),
    });
  }

  /**
   * Calculate XP for a completed study session
   */
  async calculateSessionXP(sessionId: string): Promise<SessionCalculationResponse> {
    const request: SessionCalculationRequest = {
      session_id: sessionId,
    };

    return this.makeRequest<SessionCalculationResponse>('/xp/calculate-session', {
      method: 'POST',
      body: JSON.stringify(request),
    });
  }

  /**
   * Get XP leaderboard for specified period
   */
  async getLeaderboard(period: 'weekly' | 'monthly' | 'all-time' = 'weekly'): Promise<LeaderboardResponse> {
    return this.makeRequest<LeaderboardResponse>(`/xp/leaderboard?period=${period}`);
  }

  /**
   * Get today's metrics for a user
   */
  async getTodayMetrics(userId: string): Promise<TodayMetrics> {
    const response = await this.makeRequest<{
      success: boolean;
      data: {
        user_id: string;
        daily_metrics: Array<{
          date: string;
          total_minutes: number;
          xp_earned: number;
          streak_active: boolean;
          space_breakdown: Record<string, number>;
        }>;
      };
    }>(`/xp/metrics/daily/${userId}?days=1`);

    const today = new Date().toISOString().split('T')[0];
    const todayMetrics = response.data.daily_metrics.find(m => m.date === today);
    
    return todayMetrics || {
      total_minutes: 0,
      xp_earned: 0,
      streak_active: false,
      space_breakdown: {},
    };
  }

  /**
   * Get XP history for a user
   */
  async getXPHistory(userId: string, limit: number = 50, offset: number = 0): Promise<XPHistoryResponse> {
    return this.makeRequest<XPHistoryResponse>(`/xp/history/${userId}?limit=${limit}&offset=${offset}`);
  }

  /**
   * Get comprehensive XP statistics for a user
   */
  async getUserXPStats(userId: string): Promise<UserXPStats> {
    const response = await this.makeRequest<{
      success: boolean;
      data: UserXPStats;
    }>(`/xp/stats/${userId}`);

    return response.data;
  }

  /**
   * Validate session for audit purposes
   */
  async validateSessionAudit(sessionId: string, userId: string, validationMode: 'soft' | 'strict' = 'soft') {
    const request = {
      session_id: sessionId,
      user_id: userId,
      validation_mode: validationMode,
    };

    return this.makeRequest('/xp/audit/validate', {
      method: 'POST',
      body: JSON.stringify(request),
    });
  }

  /**
   * Synchronize offline session events
   */
  async syncOfflineEvents(userId: string, events: SessionEvent[], lastSync?: string): Promise<OfflineSyncResponse> {
    const request: OfflineSyncRequest = {
      user_id: userId,
      events,
      last_sync: lastSync,
    };

    return this.makeRequest<OfflineSyncResponse>('/xp/sync/offline', {
      method: 'POST',
      body: JSON.stringify(request),
    });
  }

  /**
   * Get session events for debugging/audit
   */
  async getSessionEvents(sessionId: string) {
    return this.makeRequest(`/xp/events/${sessionId}`);
  }

  /**
   * Get user's audit summary
   */
  async getUserAuditSummary(userId: string, days: number = 30) {
    return this.makeRequest(`/xp/audit/sessions/${userId}?days=${days}`);
  }

  /**
   * Get user's ranking status from backend
   */
  async getUserRankingStatus(userId: string): Promise<{ success: boolean; data: UserRankingStatus; message: string }> {
    return this.makeRequest(`/ranking/status/${userId}`);
  }

  /**
   * Get detailed progress information for user
   */
  async getUserRankingProgress(userId: string) {
    return this.makeRequest(`/ranking/user/${userId}/progress`);
  }

  /**
   * Get user's ranking event history
   */
  async getUserRankingEvents(userId: string, limit: number = 20) {
    return this.makeRequest(`/ranking/events/${userId}?limit=${limit}`);
  }

  /**
   * Check promotion eligibility
   */
  async checkPromotionEligibility(userId: string) {
    return this.makeRequest(`/ranking/promotion/check/${userId}`, { method: 'POST' });
  }

  /**
   * Promote user if eligible
   */
  async promoteUser(userId: string) {
    return this.makeRequest(`/ranking/promote/${userId}`, { method: 'POST' });
  }

  /**
   * Get ranking leaderboard
   */
  async getRankingLeaderboard(limit: number = 50) {
    return this.makeRequest(`/ranking/leaderboard?limit=${limit}`);
  }

  /**
   * Get all ranking tiers information
   */
  async getRankingTiers() {
    return this.makeRequest('/ranking/tiers');
  }

  /**
   * Update user's daily login streak
   */
  async updateDailyLoginStreak(userId: string): Promise<{ success: boolean; data: StreakData; message: string }> {
    return this.makeRequest(`/streak/update/${userId}`, { method: 'POST' });
  }

  /**
   * Check streak continuity
   */
  async checkStreakContinuity(userId: string): Promise<{ success: boolean; data: StreakData; message: string }> {
    return this.makeRequest(`/streak/continuity/${userId}`);
  }

  /**
   * Get streak bonus information
   */
  async getStreakBonus(userId: string): Promise<{ success: boolean; data: StreakBonusData; message: string }> {
    return this.makeRequest(`/streak/bonus/${userId}`);
  }

  /**
   * Apply streak multiplier to XP
   */
  async applyStreakMultiplier(userId: string, baseXP: number) {
    return this.makeRequest('/streak/apply-multiplier', {
      method: 'POST',
      body: JSON.stringify({ user_id: userId, base_xp: baseXP }),
    });
  }

  /**
   * Get streak analytics
   */
  async getStreakAnalytics(userId: string, days: number = 30) {
    return this.makeRequest(`/streak/analytics/${userId}?days=${days}`);
  }
}

// Export singleton instance
export const gamificationApi = new GamificationApi();
export default gamificationApi;