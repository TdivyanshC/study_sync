import { Platform } from 'react-native';
import * as SecureStore from 'expo-secure-store';
import NetInfo from '@react-native-community/netinfo';
import { buildApiUrl, API_ENDPOINTS } from '../lib/apiConfig';
import { findWorkingBackendUrl, getManualConnectionInstructions } from '../../lib/networkDetector';

// Custom error classes for better error handling
class NetworkError extends Error {
  constructor(message: string, public status: number, public responseText: string) {
    super(message);
    this.name = 'NetworkError';
  }
}

class NetworkRetryableError extends Error {
  constructor(message: string, public status: number, public responseText: string) {
    super(message);
    this.name = 'NetworkRetryableError';
  }
}

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
  session_id: string | null;
  total_focus_time: number;
  tasks_completed: number;
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

class GamificationApi {
  private maxRetries: number = 1; // Stop infinite loops - only 1 retry for network errors
  private retryDelay: number = 1000; // 1 second base delay
  private maxRetryDelay: number = 1000; // 1 second max delay for immediate failure feedback
  private backendReachable: boolean = false; // Track backend availability

  constructor() {
    console.log(`🎯 Gamification API initialized`);
  }

  /**
   * Get authentication token from secure storage
   */
  private async getAuthToken(): Promise<string | null> {
    try {
      // SecureStore is not available on web
      if (Platform.OS === 'web') {
        return localStorage.getItem('auth_token');
      }
      return await SecureStore.getItemAsync('auth_token');
    } catch (error) {
      console.error('Failed to get auth token:', error);
      return null;
    }
  }

  /**
   * Create AbortController with timeout for cross-platform compatibility
   */
  private createTimeoutController(timeoutMs: number = 30000): AbortController | { signal?: AbortSignal } {
    // Fallback for environments without AbortController
    if (typeof AbortController === 'undefined') {
      console.log('⚠️ AbortController not available, skipping timeout');
      return { signal: undefined };
    }
    
    const controller = new AbortController();
    const timeoutId = setTimeout(() => {
      try {
        controller.abort();
      } catch (e) {
        console.log('Timeout abort failed:', e);
      }
    }, timeoutMs);
    
    // Cleanup timeout when signal is aborted
    controller.signal.addEventListener('abort', () => {
      clearTimeout(timeoutId);
    });
    
    return controller;
  }

  /**
   * Check backend server availability
   */
  private async checkBackendAvailability(): Promise<boolean> {
    try {
      if (this.backendReachable) {
        return true; // Already confirmed reachable
      }

      const url = buildApiUrl(API_ENDPOINTS.HEALTH);
      
      console.log(`🏥 Checking backend availability at: ${url}`);
      
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 10000); // 10 second timeout for ngrok
      
      const response = await fetch(url, {
        method: 'GET',
        signal: controller.signal,
        headers: {
          'Content-Type': 'application/json',
        }
      });
      
      clearTimeout(timeoutId);
      
      if (response.ok) {
        console.log('✅ Backend is reachable');
        this.backendReachable = true;
        return true;
      } else {
        console.log(`⚠️ Backend returned ${response.status} - but backend is running, not marking as unreachable`);
        // Don't mark as unreachable for HTTP errors - backend might still be working
        // Just log the warning and continue
        this.backendReachable = true; // Assume reachable for non-critical HTTP errors
        return true;
      }
    } catch (error) {
      console.log('🔥 Backend unreachable – check ngrok or LAN IP');
      // Don't permanently mark as unreachable on connection errors
      // This was causing the blocking behavior
      console.log('🔄 Attempting to continue despite connection error...');
      this.backendReachable = false;
      return false;
    }
  }

  /**
   * Make authenticated API request with limited retry logic
   */
  private async makeRequest<T>(
    endpoint: string,
    options: RequestInit = {},
    retryCount: number = 0
  ): Promise<T> {
    const url = buildApiUrl(endpoint);
    const method = options.method || 'GET';
    
    try {
      console.log(`🌐 [${retryCount > 0 ? 'RETRY' : 'REQUEST'}] ${method} ${url}`);
      
      // Check if backend is reachable - but don't permanently block all calls
      if (endpoint !== API_ENDPOINTS.HEALTH && !this.backendReachable) {
        console.log('⚠️ Backend reachability unknown – attempting API call anyway');
        // Don't block the call, just attempt it and handle the error appropriately
      }
      
      // Check network connectivity (skip on web)
      if (Platform.OS !== 'web') {
        const state = await NetInfo.fetch();
        if (!state.isConnected) {
          throw new Error('No internet connection');
        }
      }

      const token = await this.getAuthToken();
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
        'X-Client': 'StudySync-Frontend',
        'X-Request-ID': `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        ...options.headers as Record<string, string>,
      };

      if (token) {
        headers.Authorization = `Bearer ${token}`;
      }

      // Create timeout controller for cross-platform compatibility
      const timeoutController = this.createTimeoutController(30000); // 30 second timeout
      
      const response = await fetch(url, {
        ...options,
        headers,
        signal: timeoutController.signal,
      });

      console.log(`📡 Response: ${response.status} ${response.statusText} for ${method} ${url}`);

      if (!response.ok) {
        const errorText = await response.text().catch(() => 'Unable to read error response');
        const errorMessage = `HTTP ${response.status}: ${response.statusText}`;
        
        console.error(`❌ Network Error: ${errorMessage}`);
        console.error(`🔍 Error Details: ${errorText}`);
        
        if (response.status === 401 && retryCount < this.maxRetries) {
          console.log('🔑 Token expired, retrying...');
          return this.makeRequest(endpoint, options, retryCount + 1);
        }
        
        if (response.status >= 500 && retryCount < this.maxRetries) {
          console.log(`🔄 Server error ${response.status}, retrying... (${retryCount + 1}/${this.maxRetries})`);
          throw new NetworkRetryableError(errorMessage, response.status, errorText);
        }
        
        throw new NetworkError(errorMessage, response.status, errorText);
      }

      const data = await response.json();
      console.log(`✅ Success: ${method} ${url}`);
      return data;
      
    } catch (error) {
      // Handle timeout errors specifically
      if (error instanceof Error) {
        if (error.name === 'AbortError' || error.message.includes('aborted')) {
          console.error(`⏰ Request timeout: ${url}`);
          if (retryCount < this.maxRetries) {
            const delay = Math.min(this.retryDelay * Math.pow(2, retryCount), this.maxRetryDelay);
            console.log(`⏳ Retrying due to timeout in ${delay}ms... (${retryCount + 1}/${this.maxRetries})`);
            await new Promise(resolve => setTimeout(resolve, delay));
            return this.makeRequest(endpoint, options, retryCount + 1);
          }
          throw new NetworkRetryableError('Request timeout', 408, 'Request timed out');
        }
      }
      
      // Handle network timeouts and connection errors - improved handling for ngrok
      if (error instanceof TypeError && error.message.includes('Network request failed')) {
        console.error(`🔥 Network Error: ${error.message} - Backend unreachable`);
        console.log('🔄 Ngrok connection may be slow, attempting one more retry...');
        // For ngrok URLs, give one extra chance due to potential slow startup
        if (url.includes('ngrok')) {
          const delay = 3000; // 3 second delay for ngrok
          console.log(`⏳ Retrying ngrok request in ${delay}ms...`);
          await new Promise(resolve => setTimeout(resolve, delay));
          return this.makeRequest(endpoint, options, retryCount + 1);
        }
        console.log('⛔ Stopping retry attempts due to network failure');
        throw new Error('Backend unreachable – check ngrok or LAN IP');
      } else if (error instanceof NetworkRetryableError) {
        console.error(`🔄 Retryable Error: ${error.message}`);
        if (retryCount === 0) {
          const delay = Math.min(this.retryDelay, this.maxRetryDelay);
          console.log(`⏳ Single retry attempt for server error... (${retryCount + 1}/${this.maxRetries})`);
          await new Promise(resolve => setTimeout(resolve, delay));
          return this.makeRequest(endpoint, options, retryCount + 1);
        }
      } else if (error instanceof NetworkError) {
        console.error(`❌ Network Error: ${error.message}`);
      } else if (error instanceof Error) {
        console.error(`💥 Unexpected Error: ${error.message}`);
      } else {
        console.error(`💥 Unknown Error: ${error}`);
      }

      // No additional retries for timeout errors after the first attempt
      if (retryCount < this.maxRetries && error instanceof Error && !error.message.includes('timeout') && !error.message.includes('Network request failed')) {
        const delay = Math.min(this.retryDelay, this.maxRetryDelay);
        console.log(`⏳ Final retry attempt... (${retryCount + 1}/${this.maxRetries})`);
        
        await new Promise(resolve => setTimeout(resolve, delay));
        return this.makeRequest(endpoint, options, retryCount + 1);
      }
      
      // Final failure - provide helpful error message
      let finalError: Error;
      if (error instanceof NetworkError || error instanceof NetworkRetryableError) {
        finalError = error;
      } else if (error instanceof Error) {
        finalError = new NetworkError(`Request failed after ${this.maxRetries} retries: ${error.message}`, 0, String(error));
      } else {
        finalError = new NetworkError(`Request failed after ${this.maxRetries} retries: ${String(error)}`, 0, String(error));
      }
        
      console.error(`💀 Final failure: ${finalError.message}`);
      throw finalError;
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

    return this.makeRequest<XPAwardResponse>(API_ENDPOINTS.XP_AWARD, {
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

    return this.makeRequest<SessionCalculationResponse>(API_ENDPOINTS.XP_CALCULATE_SESSION, {
      method: 'POST',
      body: JSON.stringify(request),
    });
  }

  /**
   * Get XP leaderboard for specified period
   */
  async getLeaderboard(period: 'weekly' | 'monthly' | 'all-time' = 'weekly'): Promise<LeaderboardResponse> {
    return this.makeRequest<LeaderboardResponse>(`${API_ENDPOINTS.XP_LEADERBOARD}?period=${period}`);
  }

  /**
   * Get today's metrics for a user
   */
  async getTodayMetrics(userId: string): Promise<TodayMetrics> {
    return this.makeRequest<TodayMetrics>(`${API_ENDPOINTS.METRICS_TODAY}?user_id=${userId}`);
  }

  /**
   * Get XP history for a user
   */
  async getXPHistory(userId: string, limit: number = 50, offset: number = 0): Promise<XPHistoryResponse> {
    return this.makeRequest<XPHistoryResponse>(`${API_ENDPOINTS.XP_HISTORY}/${userId}?limit=${limit}&offset=${offset}`);
  }

  /**
   * Get comprehensive XP statistics for a user
   */
  async getUserXPStats(userId: string): Promise<UserXPStats> {
    const response = await this.makeRequest<{
      success: boolean;
      data: UserXPStats;
    }>(`${API_ENDPOINTS.XP_STATS}/${userId}`);

    return response.data;
  }

  /**
   * Update user's daily login streak
   */
  async updateDailyLoginStreak(userId: string): Promise<{ success: boolean; data: StreakData; message: string }> {
    return this.makeRequest(`${API_ENDPOINTS.STREAK_UPDATE}/${userId}`, { method: 'POST' });
  }

  /**
   * Check streak continuity
   */
  async checkStreakContinuity(userId: string): Promise<{ success: boolean; data: StreakData; message: string }> {
    return this.makeRequest(`${API_ENDPOINTS.STREAK_CONTINUITY}/${userId}`);
  }

  /**
   * Apply streak multiplier to XP
   */
  async applyStreakMultiplier(userId: string, baseXP: number) {
    return this.makeRequest(API_ENDPOINTS.STREAK_APPLY_MULTIPLIER, {
      method: 'POST',
      body: JSON.stringify({ user_id: userId, base_xp: baseXP }),
    });
  }

  /**
   * Try to find working backend URL manually
   * Call this method when automatic detection fails
   */
  public async manuallyDetectBackend(): Promise<boolean> {
    try {
      console.log('🔍 Attempting manual backend detection...');
      const workingUrl = await findWorkingBackendUrl();
      
      if (workingUrl) {
        console.log(`🎯 Manually found working backend: ${workingUrl}`);
        // Reset backend reachable flag to force re-check
        this.backendReachable = false;
        return true;
      }
      
      console.log('❌ Manual detection failed');
      return false;
    } catch (error) {
      console.error('❌ Manual detection error:', error);
      return false;
    }
  }
}

// Export singleton instance
export const gamificationApi = new GamificationApi();
export default gamificationApi;