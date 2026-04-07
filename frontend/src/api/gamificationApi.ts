import { Platform } from 'react-native';
import * as SecureStore from 'expo-secure-store';
import NetInfo from '@react-native-community/netinfo';
import { buildApiUrl, API_ENDPOINTS } from '../lib/apiConfig';
import { findWorkingBackendUrl, getManualConnectionInstructions } from '../../lib/networkDetector';
import { getAuthToken, removeAuthToken } from '../../lib/auth/tokenStorage';

// Enhanced error classes for better error handling
export class ApiError extends Error {
  constructor(
    message: string, 
    public status: number, 
    public code: string = 'API_ERROR',
    public userMessage: string = 'An unexpected error occurred',
    public isRetryable: boolean = false
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

export class NetworkConnectionError extends ApiError {
  constructor(message: string = 'Unable to connect to the server') {
    super(message, 0, 'NETWORK_CONNECTION_ERROR', 'Connection failed. Please check your internet connection.', true);
  }
}

export class ServerUnavailableError extends ApiError {
  constructor(message: string = 'Server is temporarily unavailable') {
    super(message, 503, 'SERVER_UNAVAILABLE', 'Server is temporarily unavailable. Please try again later.', true);
  }
}

export class BackendNotFoundError extends ApiError {
  constructor(message: string = 'Backend service not found') {
    super(message, 404, 'BACKEND_NOT_FOUND', 'Backend service not found. Please check if the server is running.', false);
  }
}

// Check if response content is HTML (ngrok error page)
function isHtmlResponse(content: string): boolean {
  return content.trim().toLowerCase().startsWith('<!doctype html') || 
         content.trim().toLowerCase().startsWith('<html');
}

// Extract error information from HTML responses
function extractErrorFromHtml(htmlContent: string): { code: string; message: string } {
  // Common ngrok error patterns
  if (htmlContent.includes('ERR_NGROK_8012')) {
    return {
      code: 'NGROK_TUNNEL_ERROR',
      message: 'ngrok tunnel connection failed'
    };
  }
  
  if (htmlContent.includes('502 Bad Gateway')) {
    return {
      code: 'BAD_GATEWAY',
      message: 'Server returned 502 Bad Gateway'
    };
  }
  
  if (htmlContent.includes('timeout')) {
    return {
      code: 'REQUEST_TIMEOUT',
      message: 'Request timed out'
    };
  }
  
  // Generic HTML error
  return {
    code: 'HTML_ERROR_RESPONSE',
    message: 'Received HTML error response instead of JSON'
  };
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

export interface Badge {
  id: string;
  badge_id: string;
  title: string;
  description: string;
  icon: string;
  category: string;
  requirement_type: string;
  requirement_value: number;
  progress: {
    current: number;
    target: number;
    percentage: number;
    is_complete: boolean;
  };
  achieved_at?: string;
  is_achieved: boolean;
}

export interface UserBadgesResponse {
  success: boolean;
  data: {
    badges: Badge[];
    total_badges: number;
    badge_categories: Record<string, number>;
    recent_badges: Badge[];
  };
  message?: string;
}

export interface BadgeLeaderboardEntry {
  rank: number;
  user_id: string;
  username: string;
  badge_count: number;
  level: number;
  total_xp: number;
}

export interface BadgeLeaderboardResponse {
  success: boolean;
  data: {
    leaderboard: BadgeLeaderboardEntry[];
    total_users: number;
    generated_at: string;
  };
  message?: string;
}

export interface CheckBadgesResponse {
  success: boolean;
  data: {
    new_badges: Badge[];
    badge_count: number;
    message: string;
  };
  message?: string;
}

export interface SessionEvent {
  session_id: string;
  event_type: string;
  event_payload: Record<string, any>;
  created_at: string;
}

class GamificationApi {
  private maxRetries: number = 2; // Increased retry attempts for better resilience
  private retryDelay: number = 1000; // 1 second base delay
  private maxRetryDelay: number = 3000; // 3 second max delay
  private backendReachable: boolean = false; // Track backend availability
  private lastHealthCheck: number = 0; // Track when we last checked backend health
  private healthCheckInterval: number = 30000; // 30 seconds between health checks

  constructor() {
    console.log(`🎯 Gamification API initialized with enhanced error handling`);
  }

  /**
   * Get authentication token from secure storage
   */
  private async getAuthToken(): Promise<string | null> {
    try {
      return await getAuthToken();
    } catch (error) {
      console.warn('Failed to get auth token:', error);
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
   * Check backend server availability with throttling
   */
  private async checkBackendAvailability(): Promise<boolean> {
    try {
      // Throttle health checks to avoid overwhelming the backend
      const now = Date.now();
      if (now - this.lastHealthCheck < this.healthCheckInterval && this.backendReachable) {
        return this.backendReachable;
      }
      this.lastHealthCheck = now;

      const url = buildApiUrl(API_ENDPOINTS.HEALTH);
      
      console.log(`🏥 Checking backend availability at: ${url}`);
      
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5000); // 5 second timeout for health checks
      
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
        console.log(`⚠️ Backend returned ${response.status} - marking as unreachable`);
        this.backendReachable = false;
        return false;
      }
    } catch (error) {
      console.log('🔥 Backend unreachable:', error instanceof Error ? error.message : String(error));
      this.backendReachable = false;
      return false;
    }
  }

  /**
   * Create a user-friendly error message based on error type
   */
  private createUserFriendlyError(error: any, status: number, responseText: string): ApiError {
    // Handle HTML responses from ngrok or other error pages
    if (isHtmlResponse(responseText)) {
      const extractedError = extractErrorFromHtml(responseText);
      
      switch (extractedError.code) {
        case 'NGROK_TUNNEL_ERROR':
          return new NetworkConnectionError('ngrok tunnel connection failed. Please check if the server is running.');
        case 'BAD_GATEWAY':
          return new ServerUnavailableError('Server is temporarily unavailable. Please try again later.');
        case 'REQUEST_TIMEOUT':
          return new NetworkConnectionError('Request timed out. Please check your connection.');
        default:
          return new ApiError(
            'Received HTML error response instead of JSON API response',
            status,
            'HTML_ERROR_RESPONSE',
            'Server returned an error page. Please try again later.',
            true
          );
      }
    }

    // Handle standard HTTP status codes
    switch (status) {
      case 0:
        return new NetworkConnectionError('Unable to connect to the server');
      case 401:
        return new ApiError('Authentication required', 401, 'UNAUTHORIZED', 'Please log in again', false);
      case 403:
        return new ApiError('Access forbidden', 403, 'FORBIDDEN', 'You do not have permission to perform this action', false);
      case 404:
        return new BackendNotFoundError('The requested resource was not found');
      case 408:
        return new NetworkConnectionError('Request timed out. Please try again.');
      case 429:
        return new ApiError('Too many requests', 429, 'RATE_LIMITED', 'Too many requests. Please wait a moment and try again.', true);
      case 500:
        return new ServerUnavailableError('Internal server error. Please try again later.');
      case 502:
        return new ServerUnavailableError('Server is temporarily unavailable. Please try again later.');
      case 503:
        return new ServerUnavailableError('Service temporarily unavailable. Please try again later.');
      case 504:
        return new NetworkConnectionError('Request timed out. Please try again.');
      default:
        if (status >= 500) {
          return new ServerUnavailableError(`Server error (${status}). Please try again later.`);
        } else if (status >= 400) {
          return new ApiError(`Client error (${status})`, status, 'CLIENT_ERROR', 'Invalid request. Please check your input.', false);
        }
        return new ApiError(`Network error (${status})`, status, 'NETWORK_ERROR', 'A network error occurred. Please try again.', true);
    }
  }

  /**
   * Make authenticated API request with enhanced error handling and retry logic
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
      
      // Check network connectivity (skip on web)
      if (Platform.OS !== 'web') {
        const state = await NetInfo.fetch();
        if (!state.isConnected) {
          throw new NetworkConnectionError('No internet connection');
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
        // Read error response, but limit size to avoid logging HTML
        const errorText = await response.text().catch(() => 'Unable to read error response');
        
        // Don't log the full HTML response to avoid console pollution
        if (isHtmlResponse(errorText)) {
          console.warn(`⚠️ Received HTML error response (${response.status}) - likely ngrok or server error page`);
        } else {
          console.error(`❌ API Error: HTTP ${response.status} - ${errorText.substring(0, 200)}...`);
        }
        
        // Create user-friendly error
        const friendlyError = this.createUserFriendlyError(null, response.status, errorText);
        
        // Handle authentication errors with retry
        if (response.status === 401 && retryCount < this.maxRetries) {
          console.log('🔑 Token expired, clearing cached token and retrying...');
          
          // Clear potentially invalid token from storage to force re-fetch on next attempt
          try {
            await removeAuthToken();
          } catch (clearError) {
            console.warn('Failed to clear invalid token:', clearError);
          }
          
          // Wait briefly before retry
          await new Promise(resolve => setTimeout(resolve, 300));
          
          return this.makeRequest(endpoint, options, retryCount + 1);
        }
        
        // Handle retryable server errors
        if (friendlyError.isRetryable && retryCount < this.maxRetries) {
          const delay = Math.min(this.retryDelay * Math.pow(2, retryCount), this.maxRetryDelay);
          console.log(`🔄 Server error ${response.status}, retrying in ${delay}ms... (${retryCount + 1}/${this.maxRetries})`);
          await new Promise(resolve => setTimeout(resolve, delay));
          return this.makeRequest(endpoint, options, retryCount + 1);
        }
        
        throw friendlyError;
      }

      const data = await response.json();
      console.log(`✅ Success: ${method} ${url}`);
      
      // Mark backend as reachable on successful requests
      this.backendReachable = true;
      
      return data;
      
    } catch (error) {
      // Handle timeout errors
      if (error instanceof Error && (error.name === 'AbortError' || error.message.includes('aborted'))) {
        console.error(`⏰ Request timeout: ${url}`);
        const timeoutError = new NetworkConnectionError('Request timed out. Please check your connection.');
        
        if (retryCount < this.maxRetries) {
          const delay = Math.min(this.retryDelay * Math.pow(2, retryCount), this.maxRetryDelay);
          console.log(`⏳ Retrying due to timeout in ${delay}ms... (${retryCount + 1}/${this.maxRetries})`);
          await new Promise(resolve => setTimeout(resolve, delay));
          return this.makeRequest(endpoint, options, retryCount + 1);
        }
        
        throw timeoutError;
      }
      
      // Handle network errors
      if (error instanceof TypeError && error.message.includes('Network request failed')) {
        console.error(`🔥 Network Error: ${error.message}`);
        
        // For ngrok URLs, give extra retries due to potential slow startup
        if (url.includes('ngrok') && retryCount < this.maxRetries) {
          const delay = 2000; // 2 second delay for ngrok
          console.log(`⏳ Retrying ngrok request in ${delay}ms... (${retryCount + 1}/${this.maxRetries})`);
          await new Promise(resolve => setTimeout(resolve, delay));
          return this.makeRequest(endpoint, options, retryCount + 1);
        }
        
        throw new NetworkConnectionError('Unable to connect to the server. Please check your internet connection.');
      }
      
      // Handle our custom API errors
      if (error instanceof ApiError) {
        console.error(`❌ API Error: ${error.code} - ${error.message}`);
        throw error;
      }
      
      // Handle unexpected errors
      const unexpectedError = new ApiError(
        `Unexpected error: ${error instanceof Error ? error.message : String(error)}`,
        0,
        'UNEXPECTED_ERROR',
        'An unexpected error occurred. Please try again.',
        true
      );
      
      console.error(`💥 Unexpected Error:`, error);
      throw unexpectedError;
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
    try {
      return await this.makeRequest<TodayMetrics>(`${API_ENDPOINTS.METRICS_TODAY}?user_id=${userId}`);
    } catch (error) {
      // Return fallback data when backend is unavailable
      if (error instanceof NetworkConnectionError || error instanceof ServerUnavailableError) {
        console.log('📊 Returning fallback metrics data due to backend unavailability');
        return {
          session_id: null,
          total_focus_time: 0,
          tasks_completed: 0
        };
      }
      throw error;
    }
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
    try {
      const response = await this.makeRequest<{
        success: boolean;
        data: UserXPStats;
      }>(`${API_ENDPOINTS.XP_STATS}/${userId}`);

      return response.data;
    } catch (error) {
      // Return fallback stats when backend is unavailable
      if (error instanceof NetworkConnectionError || error instanceof ServerUnavailableError) {
        console.log('📈 Returning fallback XP stats due to backend unavailability');
        return {
          user_id: userId,
          username: 'User',
          total_xp: 0,
          level: 1,
          current_streak: 0,
          recent_30_days_xp: 0,
          xp_sources: {},
          next_level_xp: 100,
          level_progress: 0
        };
      }
      throw error;
    }
  }

  /**
   * Update user's daily login streak
   */
  async updateDailyLoginStreak(userId: string): Promise<{ success: boolean; data: StreakData; message: string }> {
    try {
      return await this.makeRequest(`${API_ENDPOINTS.STREAK_UPDATE}/${userId}`, { method: 'POST' });
    } catch (error) {
      // Return fallback streak data when backend is unavailable
      if (error instanceof NetworkConnectionError || error instanceof ServerUnavailableError) {
        console.log('🔥 Returning fallback streak data due to backend unavailability');
        return {
          success: true,
          data: {
            user_id: userId,
            current_streak: 0,
            best_streak: 0,
            streak_broken: false,
            streak_multiplier: 1.0,
            streak_bonus_xp: 0,
            streak_active: false,
            has_recent_activity: false
          },
          message: 'Streak data unavailable - backend connection issue'
        };
      }
      throw error;
    }
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
   * Get user's badge collection
   */
  async getUserBadges(userId: string): Promise<UserBadgesResponse> {
    try {
      return await this.makeRequest<UserBadgesResponse>(`${API_ENDPOINTS.BADGES_USER}/${userId}`);
    } catch (error) {
      // Return fallback badges data when backend is unavailable
      if (error instanceof NetworkConnectionError || error instanceof ServerUnavailableError) {
        console.log('🏆 Returning fallback badges data due to backend unavailability');
        return {
          success: true,
          data: {
            badges: [],
            total_badges: 0,
            badge_categories: {},
            recent_badges: []
          },
          message: 'Badges data unavailable - backend connection issue'
        };
      }
      throw error;
    }
  }

  /**
   * Check and award badges for a user
   */
  async checkAndAwardBadges(userId: string): Promise<CheckBadgesResponse> {
    return this.makeRequest<CheckBadgesResponse>(API_ENDPOINTS.BADGES_CHECK, {
      method: 'POST',
      body: JSON.stringify({ user_id: userId }),
    });
  }

  /**
   * Get badge collection leaderboard
   */
  async getBadgeLeaderboard(limit: number = 50): Promise<BadgeLeaderboardResponse> {
    return this.makeRequest<BadgeLeaderboardResponse>(`${API_ENDPOINTS.BADGES_LEADERBOARD}?limit=${limit}`);
  }

  /**
   * Validate session for audit purposes
   */
  async validateSessionAudit(sessionId: string, userId: string, validationMode: 'soft' | 'strict' = 'soft') {
    return this.makeRequest(API_ENDPOINTS.XP_AUDIT_VALIDATE, {
      method: 'POST',
      body: JSON.stringify({
        session_id: sessionId,
        user_id: userId,
        validation_mode: validationMode
      }),
    });
  }

  /**
   * Sync offline session events
   */
  async syncOfflineEvents(userId: string, events: any[]) {
    return this.makeRequest(API_ENDPOINTS.XP_SYNC_OFFLINE, {
      method: 'POST',
      body: JSON.stringify({
        user_id: userId,
        events: events,
      }),
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

  /**
   * Get backend connectivity status
   */
  public getBackendStatus(): { isReachable: boolean; lastCheck: number } {
    return {
      isReachable: this.backendReachable,
      lastCheck: this.lastHealthCheck
    };
  }
}

// Export singleton instance
export const gamificationApi = new GamificationApi();
export default gamificationApi;