/**
 * Session API - Frontend API client for unified session processing
 * Integrates with the Game Engine backend pipeline
 */

import { supabase } from '../../lib/supabaseClient';
import { buildSessionApiUrl, API_ENDPOINTS } from '../lib/apiConfig';

interface SessionSummary {
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

interface SessionStatus {
  success: boolean;
  session_id: string;
  user_id: string;
  processed: boolean;
  session_data: any;
  xp_awarded: any | null;
}

class SessionApi {
  /**
   * Process a completed study session through the unified game engine
   * 
   * @param sessionId - The session ID to process
   * @returns Session summary with all gamification results
   */
  async processSession(sessionId: string): Promise<SessionSummary> {
    try {
      // Get current user session
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        throw new Error('No active session');
      }

      // Call backend API endpoint
      const apiUrl = buildSessionApiUrl('');
      console.log(`🔗 Session API URL: ${apiUrl}`);
      const response = await fetch(`${buildSessionApiUrl(API_ENDPOINTS.SESSION_PROCESS)}/${sessionId}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`
        }
      });

      if (!response.ok) {
        throw new Error(`Session processing failed: ${response.statusText}`);
      }

      const data = await response.json();
      return data;
    } catch (error) {
      console.error('Error processing session:', error);
      throw error;
    }
  }
  
  /**
   * Get the processing status of a session
   * 
   * @param sessionId - The session ID to check
   * @returns Session status information
   */
  async getSessionStatus(sessionId: string): Promise<SessionStatus> {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        throw new Error('No active session');
      }

      const response = await fetch(`${buildSessionApiUrl(API_ENDPOINTS.SESSION_STATUS)}/${sessionId}`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${session.access_token}`
        }
      });

      if (!response.ok) {
        throw new Error(`Failed to get session status: ${response.statusText}`);
      }

      const data = await response.json();
      return data;
    } catch (error) {
      console.error('Error getting session status:', error);
      throw error;
    }
  }
  
  /**
   * Reprocess a session (admin/debug only)
   * 
   * @param sessionId - The session ID to reprocess
   * @returns Reprocessed session summary
   */
  async reprocessSession(sessionId: string): Promise<SessionSummary> {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        throw new Error('No active session');
      }

      const response = await fetch(`${buildSessionApiUrl(API_ENDPOINTS.SESSION_REPROCESS)}/${sessionId}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`
        }
      });

      if (!response.ok) {
        throw new Error(`Failed to reprocess session: ${response.statusText}`);
      }

      const data = await response.json();
      return data.session_summary;
    } catch (error) {
      console.error('Error reprocessing session:', error);
      throw error;
    }
  }
  
  /**
   * Check health of session processing service
   * 
   * @returns Service health status
   */
  async checkHealth(): Promise<any> {
    try {
      const response = await fetch(buildSessionApiUrl(API_ENDPOINTS.SESSION_HEALTH), {
        method: 'GET'
      });

      if (!response.ok) {
        throw new Error(`Health check failed: ${response.statusText}`);
      }

      const data = await response.json();
      return data;
    } catch (error) {
      console.error('Error checking session service health:', error);
      throw error;
    }
  }
}

// Export singleton instance
export const sessionApi = new SessionApi();

// Export types
export { SessionSummary, SessionStatus };
