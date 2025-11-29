import { gamificationApi } from '../src/api/gamificationApi';

/**
 * XP Service - Handles all XP-related API calls with authenticated user ID
 */
class XPService {
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
      console.error('❌ Failed to fetch XP stats:', error);
      console.error(`🔗 Full URL attempted: https://nominatively-semirealistic-darryl.ngrok-free.dev/api/xp/stats/${userId}`);
      throw error;
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
      console.error('❌ Failed to fetch XP history:', error);
      console.error(`🔗 Full URL attempted: https://nominatively-semirealistic-darryl.ngrok-free.dev/api/xp/history/${userId}?limit=${limit}&offset=${offset}`);
      throw error;
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
      console.error('❌ Failed to fetch XP leaderboard:', error);
      console.error(`🔗 Full URL attempted: https://nominatively-semirealistic-darryl.ngrok-free.dev/api/xp/leaderboard?period=${period}`);
      throw error;
    }
  }
}

// Export singleton instance
export const xpService = new XPService();