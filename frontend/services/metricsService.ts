import { gamificationApi, NetworkConnectionError, ServerUnavailableError, ApiError } from '../src/api/gamificationApi';
import { notificationService } from '../src/services/notificationService';

/**
 * Metrics Service - Wraps gamification API to automatically inject user ID
 * All methods require user ID parameter for better testability and flexibility
 * Enhanced with graceful error handling and fallback data
 */
class MetricsService {
  /**
   * Handle errors gracefully and show user-friendly notifications
   */
  private handleError(error: any, operation: string): never {
    console.warn(`⚠️ Using fallback data for ${operation} due to backend unavailability`);
    
    if (error instanceof NetworkConnectionError) {
      // Don't show notification for connection errors - the gamificationApi handles this with fallback data
      console.log('📡 Network connection issue detected - using cached/fallback data');
    } else if (error instanceof ServerUnavailableError) {
      console.log('🖥️ Server unavailable - using cached/fallback data');
    } else if (error instanceof ApiError) {
      console.log(`🔧 API Error (${error.code}): ${error.userMessage}`);
    } else {
      console.log(`❓ Unexpected error: ${error.message || error}`);
    }
    
    // Since gamificationApi now provides fallback data, re-throw to let the caller handle it
    throw error;
  }
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
      // The gamificationApi now handles backend connectivity issues internally
      // and provides fallback data, so we just log the issue and return the result
      this.handleError(error, 'today metrics');
      // This line won't be reached due to the throw above, but TypeScript needs it
      return null;
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
      console.error(`🔗 Full URL attempted: https://prodify-ap46.onrender.com/api/xp/stats/${userId}`);
      // Return safe fallback instead of throwing
      return { total_xp: 0, level: 1 };
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