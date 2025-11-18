/**
 * Session Engine - Central orchestrator for study sessions and gamification
 * Integrates backend APIs with frontend event system and UI components
 */

import { apiClient, BackendSessionSummary } from '../api/apiClient';
import { xpEventEmitter } from '../events/xpEvents';
import { streakEventEmitter } from '../events/streakEvents';
import { softAuditEventEmitter } from '../events/softAuditEvents';
import { rankingEventEmitter } from '../events/rankingEvents';
import { badgeEventEmitter } from '../events/badgeEvents';

export interface SessionConfig {
  userId: string;
  spaceId?: string;
  plannedDuration: number;
  efficiency?: number;
}

export interface SessionResult {
  sessionId: string;
  success: boolean;
  summary?: BackendSessionSummary;
  error?: string;
}

class SessionEngine {
  private activeSession: string | null = null;
  private userId: string | null = null;
  private sessionStartTime: number = 0;

  /**
   * Start a new study session
   */
  async startSession(config: SessionConfig): Promise<SessionResult> {
    try {
      console.log('🚀 SessionEngine: Starting new session...');
      
      this.userId = config.userId;
      this.sessionStartTime = Date.now();

      // Call backend to start session
      const response = await apiClient.startSession({
        user_id: config.userId,
        space_id: config.spaceId,
        duration_minutes: config.plannedDuration,
        efficiency: config.efficiency,
      });

      if (!response.success) {
        throw new Error('Failed to start session');
      }

      this.activeSession = response.session_id;

      // Emit session started event
      console.log(`✅ SessionEngine: Session started with ID: ${this.activeSession}`);
      
      return {
        sessionId: response.session_id,
        success: true,
      };
    } catch (error) {
      console.error('❌ SessionEngine: Failed to start session:', error);
      return {
        sessionId: '',
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Confirm session at midpoint (for Pomodoro-style sessions)
   */
  async confirmSession(): Promise<{ success: boolean; error?: string }> {
    if (!this.activeSession || !this.userId) {
      return {
        success: false,
        error: 'No active session to confirm',
      };
    }

    try {
      console.log('🔄 SessionEngine: Confirming session...');

      const response = await apiClient.confirmSession({
        session_id: this.activeSession,
        user_id: this.userId,
      });

      if (response.success) {
        console.log('✅ SessionEngine: Session confirmed successfully');
        
        // Emit session confirmation event
        streakEventEmitter.emitStreakContinuity({
          userId: this.userId,
          streakActive: true,
          hasRecentActivity: true,
          currentStreak: 0, // Will be updated by backend
          timestamp: new Date(),
        });
      }

      return response;
    } catch (error) {
      console.error('❌ SessionEngine: Failed to confirm session:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * End the current session and process all gamification updates
   */
  async endSession(actualDuration?: number, efficiency?: number): Promise<SessionResult> {
    if (!this.activeSession || !this.userId) {
      return {
        sessionId: '',
        success: false,
        error: 'No active session to end',
      };
    }

    try {
      console.log('🏁 SessionEngine: Ending session and processing results...');

      // Call backend to end session
      const response = await apiClient.endSession({
        session_id: this.activeSession,
        duration_minutes: actualDuration || Math.floor((Date.now() - this.sessionStartTime) / 60000),
        efficiency: efficiency,
      });

      if (!response.success) {
        throw new Error('Failed to end session');
      }

      // Process the session through the complete gamification pipeline
      const sessionSummary = await this.processSessionSummary(this.activeSession);

      // Emit all relevant events based on the session results
      await this.emitGamificationEvents(sessionSummary);

      console.log('✅ SessionEngine: Session ended and processed successfully');
      
      // Clear active session
      const endedSessionId = this.activeSession;
      this.activeSession = null;

      return {
        sessionId: endedSessionId || '',
        success: true,
        summary: sessionSummary,
      };
    } catch (error) {
      console.error('❌ SessionEngine: Failed to end session:', error);
      return {
        sessionId: this.activeSession || '',
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Process session summary through the complete gamification pipeline
   */
  private async processSessionSummary(sessionId: string): Promise<BackendSessionSummary> {
    try {
      // Get the comprehensive session summary from backend
      const summary = await apiClient.processSession(sessionId);
      
      console.log('📊 SessionEngine: Session summary processed:', {
        xp: summary.xp_delta,
        streak: summary.streak_status,
        ranking: summary.ranking.tier,
        audit: summary.audit_valid,
        notifications: summary.notifications,
      });

      return summary;
    } catch (error) {
      console.error('❌ SessionEngine: Failed to process session summary:', error);
      throw error;
    }
  }

  /**
   * Emit all gamification events based on session results
   */
  private async emitGamificationEvents(summary: BackendSessionSummary): Promise<void> {
    if (!this.userId) return;

    try {
      // XP Events
      if (summary.notifications.xp_gained) {
        xpEventEmitter.emitXPUpdated({
          userId: this.userId,
          amountAwarded: summary.xp_delta,
          totalXP: summary.total_xp,
          level: summary.level,
          source: 'session',
          timestamp: new Date(),
          levelUp: summary.level > 0, // Will be more sophisticated in real implementation
        });

        if (summary.xp_delta > 0) {
          console.log(`💎 XP Event: +${summary.xp_delta} XP awarded (Total: ${summary.total_xp})`);
        }
      }

      // Streak Events
      if (summary.notifications.streak_maintained || summary.notifications.streak_milestone) {
        streakEventEmitter.emitStreakUpdated({
          userId: this.userId,
          currentStreak: summary.current_streak,
          bestStreak: summary.best_streak,
          streakBroken: summary.streak_status === 'broken',
          milestoneReached: summary.streak_milestone || undefined,
          streakMultiplier: 1.0, // Will be calculated by backend
          streakBonusXp: 0, // Will be calculated by backend
          timestamp: new Date(),
        });

        if (summary.notifications.streak_milestone && summary.streak_milestone) {
          streakEventEmitter.emitStreakMilestone({
            userId: this.userId,
            milestoneType: summary.streak_milestone,
            currentStreak: summary.current_streak,
            bonusAwarded: 0, // Will be calculated by backend
            timestamp: new Date(),
          });
          console.log(`🔥 Streak Event: Milestone ${summary.streak_milestone} reached!`);
        } else {
          console.log(`🔥 Streak Event: ${summary.streak_status} (${summary.current_streak} days)`);
        }
      }

      // Audit Events
      softAuditEventEmitter.emitAuditValidation({
        userId: this.userId,
        sessionId: summary.session_id,
        isValid: summary.audit_valid,
        validationMode: 'soft',
        baseScore: 100 - summary.audit_risk,
        adjustedScore: 100 - summary.audit_risk,
        forgivenessApplied: summary.forgiveness_percent,
        threshold: 70,
        message: summary.audit_messages.join('; '),
        timestamp: new Date(),
      });

      // Add pattern events if patterns detected
      if (summary.audit_patterns.length > 0) {
        softAuditEventEmitter.emitAuditPattern({
          userId: this.userId,
          sessionId: summary.session_id,
          patterns: {
            missingEvents: [],
            irregularTiming: false,
            suspiciousDuration: false,
            gapsDetected: 0,
          },
          severityLevel: summary.audit_risk > 50 ? 'high' : summary.audit_risk > 25 ? 'medium' : 'low',
          timestamp: new Date(),
        });
      }

      // Ranking Events
      if (summary.notifications.ranking_promoted) {
        rankingEventEmitter.emitTierPromotion({
          userId: this.userId,
          oldTier: 'previous_tier', // Will be provided by backend
          newTier: summary.ranking.tier,
          oldScore: 0, // Will be provided by backend
          newScore: summary.ranking.score,
          requirements: {
            xp: summary.ranking.tier_info.min_xp,
            streak: summary.ranking.tier_info.min_streak,
          },
          timestamp: new Date(),
        });
        console.log(`🏆 Ranking Event: Promoted to ${summary.ranking.tier} tier!`);
      }

      rankingEventEmitter.emitRankingUpdated({
        userId: this.userId,
        tier: summary.ranking.tier,
        score: summary.ranking.score,
        progressPercent: summary.ranking.progress_percent,
        promoted: summary.ranking.promoted,
        nextTier: summary.ranking.next_tier,
        timestamp: new Date(),
      });

      // Badge Events (simplified - real implementation would check for specific badge conditions)
      if (summary.notifications.confetti_trigger) {
        // Simulate badge unlock for demonstration
        badgeEventEmitter.emitBadgeUnlocked({
          userId: this.userId,
          badge: {
            id: 'session_complete',
            title: 'Session Complete',
            description: 'Completed a study session',
          },
          earnedAt: new Date(),
          totalBadges: 1, // Would be fetched from backend
          timestamp: new Date(),
        });
        console.log(`🏅 Badge Event: Badge unlocked!`);
      }

      // Emit general session completion event
      console.log('🎉 SessionEngine: All gamification events emitted successfully');

    } catch (error) {
      console.error('❌ SessionEngine: Failed to emit gamification events:', error);
    }
  }

  /**
   * Get current session status
   */
  getCurrentSession(): { sessionId: string | null; userId: string | null; duration: number } {
    return {
      sessionId: this.activeSession,
      userId: this.userId,
      duration: this.activeSession ? Date.now() - this.sessionStartTime : 0,
    };
  }

  /**
   * Check if there's an active session
   */
  hasActiveSession(): boolean {
    return this.activeSession !== null;
  }

  /**
   * Force clear active session (for cleanup/error handling)
   */
  clearSession(): void {
    console.log('🧹 SessionEngine: Clearing active session');
    this.activeSession = null;
    this.userId = null;
    this.sessionStartTime = 0;
  }

  /**
   * Health check for the session engine
   */
  async healthCheck(): Promise<{ status: string; activeSession: boolean }> {
    try {
      const backendHealth = await apiClient.getHealth();
      return {
        status: backendHealth.status,
        activeSession: this.hasActiveSession(),
      };
    } catch (error) {
      return {
        status: 'unhealthy',
        activeSession: this.hasActiveSession(),
      };
    }
  }

  /**
   * Sync user data (for offline support)
   */
  async syncUserData(userId: string): Promise<void> {
    try {
      console.log('🔄 SessionEngine: Syncing user data...');
      await apiClient.syncUserData(userId);
      console.log('✅ SessionEngine: User data synced successfully');
    } catch (error) {
      console.error('❌ SessionEngine: Failed to sync user data:', error);
      throw error;
    }
  }
}

// Export singleton instance
export const sessionEngine = new SessionEngine();

export default sessionEngine;