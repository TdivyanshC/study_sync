/**
 * StudySync Backend API
 * Direct integration with the Express + Supabase backend
 */

import { Platform } from 'react-native';
import * as SecureStore from 'expo-secure-store';
import NetInfo from '@react-native-community/netinfo';
import { buildApiUrl, API_ENDPOINTS } from '../../lib/apiConfig';
import { getAuthToken } from '../../lib/auth/tokenStorage';

// ============================================
// Types
// ============================================

export interface SessionEvent {
  id: string;
  user_id: string;
  session_type_id?: string;
  space_id?: string;
  started_at: string;
  ended_at?: string;
  duration_seconds?: number;
  created_at: string;
}

export interface StartSessionRequest {
  session_type_id?: string;
  space_id?: string;
  started_at?: string;
}

export interface EndSessionRequest {
  session_id: string;
  ended_at?: string;
}

export interface TodayMetrics {
  total_seconds: number;
  session_count: number;
}

export interface ProductivityStats {
  today: TodayMetrics;
  weekly: TodayMetrics;
  monthly: TodayMetrics;
  total: { total_seconds: number; session_count: number };
}

export interface StreakData {
  current_streak: number;
  best_streak: number;
  average_efficiency: number;
  last_session_date?: string;
}

export interface Space {
  id: string;
  name: string;
  description?: string;
  created_by: string;
  created_at: string;
}

export interface SpaceMember {
  id: string;
  space_id: string;
  user_id: string;
  role: 'owner' | 'member';
  joined_at: string;
  user?: {
    id: string;
    username: string;
    avatar_url?: string;
  };
}

export interface Friend {
  id: string;
  username: string;
  avatar_url?: string;
  public_user_id: string;
}

export interface UserProfile {
  id: string;
  email: string;
  username: string;
  public_user_id: string;
  avatar_url?: string;
  gmail_name?: string;
  onboarding_completed?: boolean;
  created_at: string;
}

export interface OnboardingData {
  step1_data: {
    gender?: string;
    age?: string;
    relationship?: string;
  };
  step2_data: {
    preferred_sessions?: string[];
  };
  display_name?: string;
}

// ============================================
// Error Classes
// ============================================

export class BackendApiError extends Error {
  constructor(
    message: string,
    public status: number = 500,
    public code: string = 'BACKEND_ERROR'
  ) {
    super(message);
    this.name = 'BackendApiError';
  }
}

export class NetworkConnectionError extends BackendApiError {
  constructor(message: string = 'Unable to connect to the server') {
    super(message, 0, 'NETWORK_CONNECTION_ERROR');
  }
}

// ============================================
// API Client
// ============================================

class BackendApi {
  private maxRetries: number = 2;
  private retryDelay: number = 1000;
  private maxRetryDelay: number = 3000;

  constructor() {
    console.log('📡 Backend API client initialized');
  }

  /**
   * Get auth token - try custom JWT first, then fallback to Supabase
   */
  private async getAuthToken(): Promise<string | null> {
    try {
      // First try to get our custom JWT token
      const customToken = await getAuthToken();
      if (customToken) {
        return customToken;
      }
      
      // Fallback to Supabase token
      if (Platform.OS === 'web') {
        return localStorage.getItem('supabase.auth.token');
      }
      return await SecureStore.getItemAsync('supabase.auth.token');
    } catch {
      return null;
    }
  }

  /**
   * Make authenticated API request
   */
  private async request<T>(
    endpoint: string,
    options: RequestInit = {},
    retryCount: number = 0
  ): Promise<T> {
    const url = buildApiUrl(endpoint);
    const method = options.method || 'GET';

    try {
      // Check network
      if (Platform.OS !== 'web') {
        const state = await NetInfo.fetch();
        if (!state.isConnected) {
          throw new NetworkConnectionError('No internet connection');
        }
      }

      const token = await this.getAuthToken();
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
        ...(options.headers as Record<string, string>),
      };

      if (token) {
        headers.Authorization = `Bearer ${token}`;
      }

      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 30000);

      const response = await fetch(url, {
        ...options,
        headers,
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        const errorText = await response.text();
        
        // Retry logic for server errors
        if (response.status >= 500 && retryCount < this.maxRetries) {
          const delay = Math.min(this.retryDelay * Math.pow(2, retryCount), this.maxRetryDelay);
          await new Promise(resolve => setTimeout(resolve, delay));
          return this.request(endpoint, options, retryCount + 1);
        }

        throw new BackendApiError(
          errorText || 'Request failed',
          response.status
        );
      }

      return response.json();
    } catch (error) {
      if (error instanceof BackendApiError || error instanceof NetworkConnectionError) {
        throw error;
      }
      
      if (error instanceof Error && error.name === 'AbortError') {
        throw new NetworkConnectionError('Request timed out');
      }

      throw new NetworkConnectionError('Network request failed');
    }
  }

  // ============================================
  // Auth & Profile
  // ============================================

  async getProfile(): Promise<UserProfile> {
    return this.request<UserProfile>(API_ENDPOINTS.AUTH_PROFILE);
  }

  async updateProfile(data: { username?: string; avatar_url?: string }): Promise<UserProfile> {
    return this.request<UserProfile>(API_ENDPOINTS.AUTH_PROFILE, {
      method: 'PATCH',
      body: JSON.stringify(data),
    });
  }

  async completeOnboarding(data: OnboardingData): Promise<{ success: boolean; user: any; message: string }> {
    return this.request<{ success: boolean; user: any; message: string }>(API_ENDPOINTS.USER_ONBOARDING, {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  // ============================================
  // Sessions
  // ============================================

  async startSession(data: StartSessionRequest): Promise<SessionEvent> {
    return this.request<SessionEvent>(API_ENDPOINTS.SESSION_START, {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async endSession(data: EndSessionRequest): Promise<SessionEvent> {
    return this.request<SessionEvent>(API_ENDPOINTS.SESSION_END, {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async getActiveSession(): Promise<SessionEvent | null> {
    return this.request<SessionEvent | null>(API_ENDPOINTS.SESSION_ACTIVE);
  }

  async getUserSessions(options?: { limit?: number; offset?: number; space_id?: string }): Promise<SessionEvent[]> {
    const params = new URLSearchParams();
    if (options?.limit) params.append('limit', options.limit.toString());
    if (options?.offset) params.append('offset', options.offset.toString());
    if (options?.space_id) params.append('space_id', options.space_id);
    
    const query = params.toString() ? `?${params}` : '';
    return this.request<SessionEvent[]>(`${API_ENDPOINTS.SESSIONS}${query}`);
  }

  async getTodayTotal(): Promise<TodayMetrics> {
    return this.request<TodayMetrics>(API_ENDPOINTS.SESSION_TODAY);
  }

  // ============================================
  // Stats
  // ============================================

  async getProductivityStats(): Promise<ProductivityStats> {
    return this.request<ProductivityStats>(API_ENDPOINTS.STATS);
  }

  async getStreakData(): Promise<StreakData> {
    return this.request<StreakData>(API_ENDPOINTS.STATS_STREAKS);
  }

  // ============================================
  // Spaces
  // ============================================

  async createSpace(data: { name: string; description?: string }): Promise<Space> {
    return this.request<Space>(API_ENDPOINTS.SPACES, {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async getUserSpaces(): Promise<Space[]> {
    return this.request<Space[]>(API_ENDPOINTS.SPACES);
  }

  async getSpace(spaceId: string): Promise<Space> {
    return this.request<Space>(`/api/spaces/${spaceId}`);
  }

  async joinSpace(spaceId: string): Promise<SpaceMember> {
    return this.request<SpaceMember>(API_ENDPOINTS.SPACE_JOIN, {
      method: 'POST',
      body: JSON.stringify({ space_id: spaceId }),
    });
  }

  async getSpaceMembers(spaceId: string): Promise<SpaceMember[]> {
    return this.request<SpaceMember[]>(API_ENDPOINTS.SPACE_MEMBERS(spaceId));
  }

  async getSpaceActivity(spaceId: string, limit: number = 20): Promise<any[]> {
    return this.request<any[]>(`${API_ENDPOINTS.SPACE_ACTIVITY(spaceId)}?limit=${limit}`);
  }

  // ============================================
  // Friends
  // ============================================

  async getFriends(): Promise<Friend[]> {
    return this.request<Friend[]>(API_ENDPOINTS.FRIENDS);
  }

  async getPendingRequests(): Promise<any[]> {
    return this.request<any[]>(API_ENDPOINTS.FRIENDS_PENDING);
  }

  async sendFriendRequest(receiverId: string): Promise<any> {
    return this.request(API_ENDPOINTS.FRIENDS_REQUEST, {
      method: 'POST',
      body: JSON.stringify({ receiver_id: receiverId }),
    });
  }

  async acceptFriendRequest(requestId: string): Promise<any> {
    return this.request(API_ENDPOINTS.FRIENDS_ACCEPT, {
      method: 'POST',
      body: JSON.stringify({ request_id: requestId }),
    });
  }

  async rejectFriendRequest(requestId: string): Promise<any> {
    return this.request(API_ENDPOINTS.FRIENDS_REJECT, {
      method: 'POST',
      body: JSON.stringify({ request_id: requestId }),
    });
  }

  async removeFriend(friendId: string): Promise<{ message: string }> {
    return this.request<{ message: string }>(API_ENDPOINTS.FRIENDS_REMOVE, {
      method: 'DELETE',
      body: JSON.stringify({ friend_id: friendId }),
    });
  }
}

// Export singleton instance
export const backendApi = new BackendApi();
export default backendApi;
