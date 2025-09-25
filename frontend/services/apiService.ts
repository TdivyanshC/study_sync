import Constants from 'expo-constants';

// Types for API responses
export interface StudySession {
  id: string;
  user_id: string;
  start_time: string;
  end_time?: string;
  duration: number;
  is_active: boolean;
  is_break: boolean;
  subject?: string;
}

export interface CreateSessionRequest {
  user_id: string;
  subject?: string;
}

export interface UpdateSessionRequest {
  duration?: number;
  is_active?: boolean;
  is_break?: boolean;
  end_time?: string;
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
    return this.fetchWithErrorHandling<StudySession>('/sessions', {
      method: 'POST',
      body: JSON.stringify(sessionData),
    });
  }

  // Update an existing study session
  public async updateSession(
    sessionId: string, 
    updateData: UpdateSessionRequest
  ): Promise<StudySession> {
    console.log(`Updating session ${sessionId}:`, updateData);
    return this.fetchWithErrorHandling<StudySession>(`/sessions/${sessionId}`, {
      method: 'PUT',
      body: JSON.stringify(updateData),
    });
  }

  // Get all sessions for a user
  public async getUserSessions(userId: string): Promise<StudySession[]> {
    console.log(`Getting sessions for user: ${userId}`);
    return this.fetchWithErrorHandling<StudySession[]>(`/sessions/${userId}`);
  }

  // End a study session
  public async endSession(sessionId: string, duration: number): Promise<StudySession> {
    const endTime = new Date().toISOString();
    return this.updateSession(sessionId, {
      duration,
      is_active: false,
      end_time: endTime,
    });
  }

  // Set session to break mode
  public async setSessionBreak(sessionId: string, isBreak: boolean): Promise<StudySession> {
    return this.updateSession(sessionId, {
      is_break: isBreak,
    });
  }

  // Update session duration (called periodically while timer is running)
  public async updateSessionDuration(sessionId: string, duration: number): Promise<StudySession> {
    return this.updateSession(sessionId, {
      duration,
    });
  }
}

// Export singleton instance
export const apiService = new ApiService();
export default apiService;