import { gamificationApi } from '../src/api/gamificationApi';

/**
 * Streak Service - Handles all streak-related API calls with authenticated user ID
 */
class StreakService {
  /**
   * Get streak data for a specific user
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
   * Check streak continuity for a specific user
   */
  async checkStreakContinuity(userId: string): Promise<any> {
    if (!userId) {
      throw new Error('User ID is required');
    }

    console.log(`🔍 Checking streak continuity for user: ${userId}`);
    
    try {
      const continuityCheck = await gamificationApi.checkStreakContinuity(userId);
      console.log('✅ Streak continuity checked:', continuityCheck);
      return continuityCheck;
    } catch (error) {
      console.error('❌ Failed to check streak continuity:', error);
      console.error(`🔗 Full URL attempted: https://nominatively-semirealistic-darryl.ngrok-free.dev/api/streaks/continuity/${userId}`);
      throw error;
    }
  }

  /**
   * Apply streak multiplier for a specific user
   */
  async applyStreakMultiplier(userId: string, baseXP: number): Promise<any> {
    if (!userId) {
      throw new Error('User ID is required');
    }

    console.log(`⚡ Applying streak multiplier for user: ${userId}, base XP: ${baseXP}`);
    
    try {
      const multiplierResult = await gamificationApi.applyStreakMultiplier(userId, baseXP);
      console.log('✅ Streak multiplier applied:', multiplierResult);
      return multiplierResult;
    } catch (error) {
      console.error('❌ Failed to apply streak multiplier:', error);
      console.error(`🔗 Full URL attempted: https://nominatively-semirealistic-darryl.ngrok-free.dev/api/streaks/multiplier`);
      throw error;
    }
  }
}

// Export singleton instance
export const streakService = new StreakService();