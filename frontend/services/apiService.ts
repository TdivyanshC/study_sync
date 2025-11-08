import Constants from 'expo-constants';

// Types for API responses
export interface StudySession {
  _id: string;
  user_id: string;
  subject: string;
  duration_minutes: number;
  efficiency?: number;
  created_at: string;
}

export interface CreateSessionRequest {
  user_id: string;
  subject: string;
  duration_minutes: number;
  efficiency?: number;
}

export interface Profile {
  _id: string;
  user_id: string;
  username: string;
  xp: number;
  level: number;
  streak: number;
  total_hours: number;
  efficiency: number;
  achievements: string[];
}

export interface StreakData {
  current_streak: number;
  best_streak: number;
  average_efficiency: number;
}

export interface Space {
  _id: string;
  name: string;
  description: string;
  created_by: string;
  members: string[];
  created_at: string;
}

export interface DashboardData {
  profile: Profile;
  streak: StreakData;
  spaces: Space[];
  recent_sessions: StudySession[];
}

class ApiService {
  private baseUrl: string;

  constructor() {
    // Get backend URL from environment
    this.baseUrl = Constants.expoConfig?.extra?.backendUrl ||
                   process.env.EXPO_PUBLIC_BACKEND_URL ||
                   'http://localhost:8000';
    
    // Ensure it has /api suffix
    if (!this.baseUrl.endsWith('/api')) {
      this.baseUrl += '/api';
    }
    
    console.log('API Service initialized with base URL:', this.baseUrl);
  }

  // Generic fetch wrapper with error handling
  private async fetchWithErrorHandling<T>(
    url: string, 
    options: RequestInit = {}
  ): Promise<T> {
    try {
      const response = await fetch(`${this.baseUrl}${url}`, {
        headers: {
          'Content-Type': 'application/json',
          ...options.headers,
        },
        ...options,
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`HTTP ${response.status}: ${errorText}`);
      }

      return await response.json();
    } catch (error) {
      console.error(`API Error - ${url}:`, error);
      throw error;
    }
  }

  // Health check
  public async healthCheck(): Promise<{ message: string }> {
    return this.fetchWithErrorHandling<{ message: string }>('/');
  }

  // Create a new study session
  public async createSession(sessionData: CreateSessionRequest): Promise<StudySession> {
    console.log('Creating session:', sessionData);
    return this.fetchWithErrorHandling<StudySession>('/sessions/add', {
      method: 'POST',
      body: JSON.stringify(sessionData),
    });
  }

  // Get all sessions for a user
  public async getUserSessions(userId: string): Promise<StudySession[]> {
    console.log(`Getting sessions for user: ${userId}`);
    return this.fetchWithErrorHandling<StudySession[]>(`/sessions/${userId}`);
  }

  // Get user profile
  public async getUserProfile(userId: string): Promise<Profile> {
    console.log(`Getting profile for user: ${userId}`);
    return this.fetchWithErrorHandling<Profile>(`/profiles/${userId}`);
  }

  // Get user streaks
  public async getUserStreaks(userId: string): Promise<StreakData> {
    console.log(`Getting streaks for user: ${userId}`);
    return this.fetchWithErrorHandling<StreakData>(`/streaks/${userId}`);
  }

  // Get user spaces
  public async getUserSpaces(userId: string): Promise<Space[]> {
    console.log(`Getting spaces for user: ${userId}`);
    return this.fetchWithErrorHandling<Space[]>(`/spaces/${userId}`);
  }

  // Get user dashboard
  public async getUserDashboard(userId: string): Promise<DashboardData> {
    console.log(`Getting dashboard for user: ${userId}`);
    return this.fetchWithErrorHandling<DashboardData>(`/dashboard/${userId}`);
  }

  // Create a space
  public async createSpace(spaceData: { name: string; description: string; created_by: string }): Promise<Space> {
    console.log('Creating space:', spaceData);
    return this.fetchWithErrorHandling<Space>('/spaces/create', {
      method: 'POST',
      body: JSON.stringify(spaceData),
    });
  }

  // Join a space
  public async joinSpace(spaceId: string, userId: string): Promise<{ message: string }> {
    console.log(`User ${userId} joining space ${spaceId}`);
    return this.fetchWithErrorHandling<{ message: string }>(`/spaces/${spaceId}/join`, {
      method: 'POST',
      body: JSON.stringify({ user_id: userId }),
    });
  }

  // Get space activity
  public async getSpaceActivity(spaceId: string): Promise<any[]> {
    console.log(`Getting activity for space: ${spaceId}`);
    return this.fetchWithErrorHandling<any[]>(`/spaces/${spaceId}/activity`);
  }

  // Get space chat
  public async getSpaceChat(spaceId: string): Promise<any[]> {
    console.log(`Getting chat for space: ${spaceId}`);
    return this.fetchWithErrorHandling<any[]>(`/spaces/${spaceId}/chat`);
  }

  // Send chat message
  public async sendChatMessage(spaceId: string, userId: string, message: string): Promise<any> {
    console.log(`Sending message to space ${spaceId}:`, message);
    return this.fetchWithErrorHandling<any>(`/spaces/${spaceId}/chat`, {
      method: 'POST',
      body: JSON.stringify({ user_id: userId, message }),
    });
  }

  // Log space activity
  public async logSpaceActivity(spaceId: string, userId: string, action: string, progress?: number): Promise<any> {
    console.log(`Logging activity in space ${spaceId}:`, action);
    return this.fetchWithErrorHandling<any>(`/spaces/${spaceId}/activity`, {
      method: 'POST',
      body: JSON.stringify({ user_id: userId, action, progress }),
    });
  }
}

// Export singleton instance
export const apiService = new ApiService();
export default apiService;