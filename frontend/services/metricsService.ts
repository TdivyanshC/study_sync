import { gamificationApi } from '../src/api/gamificationApi';

/**
 * Metrics Service - Wraps gamification API to automatically inject user ID
 * All methods require user ID parameter for better testability and flexibility
 */
class MetricsService {
  /**
   * Get today's metrics for a specific user
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
   * Get comprehensive XP statistics for a specific user
   */
  async getXPStats(userId: string): Promise<any> {
    if (!userId) {
      throw new Error('User ID is required');
    }

    console.log(`🏆 Fetching XP stats for user: ${userId}`);
    
    try {
      const xpStats = await gamificationApi.getUserXPStats(userId);
      console.log('✅ XP stats retrieved:', xpStats);
      return xpStats;
    } catch (error) {
      console.error('❌ Failed to fetch XP stats:', error);
      console.error(`🔗 Full URL attempted: https://nominatively-semirealistic-darryl.ngrok-free.dev/api/xp/stats/${userId}`);
      throw error;
    }
  }

  /**
   * Get user's streak data for a specific user
   */
  async getStreakData(userId: string): Promise<any> {
    if (!userId) {
      throw new Error('User ID is required');
    }

    console.log(`🔥 Fetching streak data for user: ${userId}`);
    
    try {
      const streakData = await gamificationApi.updateDailyLoginStreak(userId);
      console.log('✅ Streak data retrieved:', streakData);
      return streakData;
    } catch (error) {
      console.error('❌ Failed to fetch streak data:', error);
      console.error(`🔗 Full URL attempted: https://nominatively-semirealistic-darryl.ngrok-free.dev/api/streaks/${userId}`);
      throw error;
    }
  }

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
   * Get user's spaces for a specific user
   */
  async getUserSpaces(userId: string): Promise<any> {
    if (!userId) {
      throw new Error('User ID is required');
    }

    console.log(`🏠 Fetching spaces for user: ${userId}`);
    
    try {
      // Using a general endpoint for spaces - may need to be adjusted based on actual API structure
      const spaces = await gamificationApi.getUserBadges(userId);
      console.log('✅ User spaces retrieved:', spaces);
      return spaces;
    } catch (error) {
      console.error('❌ Failed to fetch user spaces:', error);
      console.error(`🔗 Full URL attempted: https://nominatively-semirealistic-darryl.ngrok-free.dev/api/spaces/${userId}`);
      throw error;
    }
  }

  /**
   * Get user's profile data for a specific user
   */
  async getUserProfile(userId: string): Promise<any> {
    if (!userId) {
      throw new Error('User ID is required');
    }

    console.log(`👤 Fetching profile for user: ${userId}`);
    
    try {
      const [xpStats, streakData] = await Promise.all([
        this.getXPStats(userId),
        this.getStreakData(userId)
      ]);

      return {
        user_id: userId,
        xp_stats: xpStats,
        streak_data: streakData,
        last_updated: new Date().toISOString()
      };
    } catch (error) {
      console.error('❌ Failed to fetch user profile:', error);
      throw error;
    }
  }
}

// Export singleton instance
export const metricsService = new MetricsService();