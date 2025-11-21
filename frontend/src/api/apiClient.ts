/**
 * Comprehensive API Client for StudySync Backend Integration
 * Extends existing gamificationApi and sessionApi with full backend connectivity
 */

import { gamificationApi } from './gamificationApi';
import { sessionApi } from './sessionApi';
import { getApiBaseUrl, buildApiUrl, API_ENDPOINTS } from '../lib/apiConfig';

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
  private baseUrl: string = "";
  private apiBaseUrl: string = ""; // API routes with /api prefix
  private maxRetries: number = 5;
  private retryDelay: number = 1000;
  private maxRetryDelay: number = 8000;
  private initialized: boolean = false;

  constructor() {
    // Use centralized API configuration
    this.baseUrl = getApiBaseUrl().replace('/api', '');
    this.apiBaseUrl = getApiBaseUrl();
    this.initialized = true;
    
    console.log(`🎯 ApiClient initialized with URL: ${this.apiBaseUrl}`);
  }



  private ensureInitialized() {
    if (!this.initialized) {
      console.warn('⚠️ API Client not initialized yet, using fallback URL');
      this.baseUrl = "http://localhost:8000";
      this.apiBaseUrl = "http://localhost:8000/api";
      this.initialized = true;
    }
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
   * Make authenticated API request with exponential backoff retry logic
   */
  private async makeRequest<T>(
    endpoint: string,
    options: RequestInit = {},
    retryCount: number = 0
  ): Promise<T> {
    const url = `${this.apiBaseUrl}${endpoint}`;
    const method = options.method || 'GET';
    
    try {
      console.log(`🌐 [${retryCount > 0 ? 'RETRY' : 'REQUEST'}] ${method} ${url}`);
      
      // Check network connectivity
      const state = await NetInfo.fetch();
      if (!state.isConnected) {
        throw new Error('No internet connection');
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
      
      // Handle network timeouts and connection errors
      if (error instanceof TypeError && error.message.includes('Network request failed')) {
        console.error(`🔥 Network Error: ${error.message}`);
      } else if (error instanceof NetworkRetryableError) {
        console.error(`🔄 Retryable Error: ${error.message}`);
      } else if (error instanceof NetworkError) {
        console.error(`❌ Network Error: ${error.message}`);
      } else if (error instanceof Error) {
        console.error(`💥 Unexpected Error: ${error.message}`);
      } else {
        console.error(`💥 Unknown Error: ${error}`);
      }

      if (retryCount < this.maxRetries) {
        const delay = Math.min(this.retryDelay * Math.pow(2, retryCount), this.maxRetryDelay);
        console.log(`⏳ Retrying in ${delay}ms... (${retryCount + 1}/${this.maxRetries})`);
        
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

  // Health Check
  async getHealth(): Promise<BackendHealthResponse> {
    return this.makeRequest<BackendHealthResponse>(API_ENDPOINTS.HEALTH);
  }

  // Session Management Endpoints
  async startSession(request: SessionStartRequest): Promise<SessionStartResponse> {
    return this.makeRequest<SessionStartResponse>(API_ENDPOINTS.SESSION_START, {
      method: 'POST',
      body: JSON.stringify(request),
    });
  }

  async confirmSession(request: SessionConfirmRequest): Promise<{ success: boolean; message: string }> {
    return this.makeRequest(API_ENDPOINTS.SESSION_CONFIRM, {
      method: 'POST',
      body: JSON.stringify(request),
    });
  }

  async endSession(request: SessionEndRequest): Promise<{ success: boolean; xp_gained: number; level_up: boolean }> {
    return this.makeRequest(API_ENDPOINTS.SESSION_END, {
      method: 'POST',
      body: JSON.stringify(request),
    });
  }

  // Extended Session Processing
  async processSession(sessionId: string): Promise<BackendSessionSummary> {
    return this.makeRequest<BackendSessionSummary>(`${API_ENDPOINTS.SESSION_PROCESS}/${sessionId}`, {
      method: 'POST',
    });
  }

  async getSessionStatus(sessionId: string): Promise<{ success: boolean; session_id: string; user_id: string; processed: boolean }> {
    return this.makeRequest(`${API_ENDPOINTS.SESSION_STATUS}/${sessionId}`);
  }

  // Real-time Health Check for Session Service
  async checkSessionHealth(): Promise<{ status: string; services: string[] }> {
    return this.makeRequest(API_ENDPOINTS.SESSION_HEALTH);
  }

  // Enhanced XP Stats (extends existing gamificationApi)
  async getEnhancedUserXPStats(userId: string) {
    try {
      // Get enhanced stats from gamificationApi
      const xpStats = await gamificationApi.getUserXPStats(userId);

      return xpStats;
    } catch (error) {
      console.error('Failed to get enhanced XP stats:', error);
      throw error;
    }
  }

  // Enhanced Streak Data (combines multiple sources)
  async getEnhancedStreakData(userId: string) {
    try {
      const todayMetrics = await gamificationApi.getTodayMetrics(userId);
      const streakData = await gamificationApi.updateDailyLoginStreak(userId);

      return {
        ...streakData.data,
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
      const leaderboard = await gamificationApi.getLeaderboard('weekly');

      // Find user's position in leaderboard
      const userPosition = leaderboard.data.entries.findIndex((entry: any) => entry.user_id === userId) + 1;

      return {
        tier: 'bronze', // Default tier since we're not implementing full ranking API yet
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
      const [health, xpData, streakData] = await Promise.all([
        this.getHealth().catch(() => ({ status: 'unknown' })),
        this.getEnhancedUserXPStats(userId),
        this.getEnhancedStreakData(userId),
      ]);

      return {
        health,
        xp: xpData,
        streak: streakData,
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