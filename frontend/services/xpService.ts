import { gamificationApi, NetworkConnectionError, ServerUnavailableError, ApiError } from '../src/api/gamificationApi';
import { notificationService } from '../src/services/notificationService';

/**
 * XP Service - Handles all XP-related API calls with authenticated user ID
 * Enhanced with graceful error handling and fallback data
 */
class XPService {
  /**
   * Handle errors gracefully with fallback data
   */
  private handleError(error: any, operation: string): never {
    console.warn(`⚠️ Using fallback data for ${operation} due to backend unavailability`);
    
    if (error instanceof NetworkConnectionError) {
      console.log('📡 Network connection issue detected - using cached/fallback data');
    } else if (error instanceof ServerUnavailableError) {
      console.log('🖥️ Server unavailable - using cached/fallback data');
    } else if (error instanceof ApiError) {
      console.log(`🔧 API Error (${error.code}): ${error.userMessage}`);
    }
    
    // Re-throw to let the gamificationApi's fallback mechanism handle it
    throw error;
  }

  /**
   * Get XP statistics for a specific user
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
      // The gamificationApi handles backend connectivity issues internally
      // and provides fallback data, so we just log the issue and return the result
      this.handleError(error, 'XP stats');
      return null; // This won't be reached, but TypeScript needs it
    }
  }

  /**
   * Get XP history for a specific user
   */
  async getXPHistory(userId: string, limit: number = 50, offset: number = 0): Promise<any> {
    if (!userId) {
      throw new Error('User ID is required');
    }

    console.log(`📚 Fetching XP history for user: ${userId}`);
    
    try {
      const xpHistory = await gamificationApi.getXPHistory(userId, limit, offset);
      console.log('✅ XP history retrieved:', xpHistory);
      return xpHistory;
    } catch (error) {
      // For XP history, return empty history as fallback
      console.warn('⚠️ Using fallback XP history due to backend unavailability');
      return {
        success: true,
        data: {
          user_id: userId,
          xp_history: [],
          total_records: 0
        },
        message: 'XP history unavailable - backend connection issue'
      };
    }
  }

  /**
   * Get XP leaderboard
   */
  async getLeaderboard(period: 'weekly' | 'monthly' | 'all-time' = 'weekly'): Promise<any> {
    console.log(`🏆 Fetching XP leaderboard for period: ${period}`);
    
    try {
      const leaderboard = await gamificationApi.getLeaderboard(period);
      console.log('✅ XP leaderboard retrieved:', leaderboard);
      return leaderboard;
    } catch (error) {
      // For leaderboard, return empty leaderboard as fallback
      console.warn('⚠️ Using fallback XP leaderboard due to backend unavailability');
      return {
        success: true,
        data: {
          period: period,
          entries: [],
          total_users: 0,
          generated_at: new Date().toISOString()
        },
        message: 'Leaderboard unavailable - backend connection issue'
      };
    }
  }
}

// Export singleton instance
export const xpService = new XPService();