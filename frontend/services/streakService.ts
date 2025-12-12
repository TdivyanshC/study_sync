import { gamificationApi, NetworkConnectionError, ServerUnavailableError, ApiError } from '../src/api/gamificationApi';
import { notificationService } from '../src/services/notificationService';

/**
 * Streak Service - Handles all streak-related API calls with authenticated user ID
 * Enhanced with graceful error handling and fallback data
 */
class StreakService {
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
      // The gamificationApi handles backend connectivity issues internally
      // and provides fallback data, so we just log the issue and return the result
      this.handleError(error, 'streak data');
      return null; // This won't be reached, but TypeScript needs it
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
      // For streak continuity check, return default streak data as fallback
      console.warn('⚠️ Using fallback streak continuity due to backend unavailability');
      return {
        success: true,
        data: {
          user_id: userId,
          current_streak: 0,
          best_streak: 0,
          streak_broken: false,
          streak_multiplier: 1.0,
          streak_bonus_xp: 0,
          streak_active: false,
          has_recent_activity: false
        },
        message: 'Streak continuity unavailable - backend connection issue'
      };
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
      // For streak multiplier, return base XP without multiplier as fallback
      console.warn('⚠️ Using base XP without multiplier due to backend unavailability');
      return {
        success: true,
        data: {
          user_id: userId,
          base_xp: baseXP,
          multiplier_applied: 1.0,
          final_xp: baseXP,
          streak_bonus: 0
        },
        message: 'Streak multiplier unavailable - using base XP only'
      };
    }
  }
}

// Export singleton instance
export const streakService = new StreakService();