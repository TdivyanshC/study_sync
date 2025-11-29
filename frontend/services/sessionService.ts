import { gamificationApi } from '../src/api/gamificationApi';

/**
 * Session Service - Handles all session-related API calls with authenticated user ID
 */
class SessionService {
  /**
   * Get today's session data for a specific user
   */
  async getTodaySessions(userId: string): Promise<any> {
    if (!userId) {
      throw new Error('User ID is required');
    }

    console.log(`⏱️ Fetching today's sessions for user: ${userId}`);
    
    try {
      const sessions = await gamificationApi.getTodayMetrics(userId);
      console.log('✅ Today sessions retrieved:', sessions);
      return sessions;
    } catch (error) {
      console.error('❌ Failed to fetch today sessions:', error);
      console.error(`🔗 Full URL attempted: https://nominatively-semirealistic-darryl.ngrok-free.dev/api/sessions/today/${userId}`);
      throw error;
    }
  }

  /**
   * Get today's metrics for a specific user (same as sessions but with focus on metrics)
   */
  async getTodayMetrics(userId: string): Promise<any> {
    if (!userId) {
      throw new Error('User ID is required');
    }

    console.log(`📊 Fetching today's metrics for user: ${userId}`);
    
    try {
      const metrics = await gamificationApi.getTodayMetrics(userId);
      console.log('✅ Today metrics retrieved:', metrics);
      return metrics;
    } catch (error) {
      console.error('❌ Failed to fetch today metrics:', error);
      console.error(`🔗 Full URL attempted: https://nominatively-semirealistic-darryl.ngrok-free.dev/api/metrics/today?user_id=${userId}`);
      throw error;
    }
  }

  /**
   * Award XP to a user
   */
  async awardXP(userId: string, amount: number, source: 'session' | 'streak' | 'daily_bonus' | 'milestone', metadata: Record<string, any> = {}): Promise<any> {
    if (!userId) {
      throw new Error('User ID is required');
    }

    console.log(`💎 Awarding XP: ${amount} to user: ${userId} for source: ${source}`);
    
    try {
      const xpAward = await gamificationApi.awardXP(userId, amount, source, metadata);
      console.log('✅ XP awarded:', xpAward);
      return xpAward;
    } catch (error) {
      console.error('❌ Failed to award XP:', error);
      console.error(`🔗 Full URL attempted: https://nominatively-semirealistic-darryl.ngrok-free.dev/api/xp/award`);
      throw error;
    }
  }
}

// Export singleton instance
export const sessionService = new SessionService();