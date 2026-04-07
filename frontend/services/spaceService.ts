import { gamificationApi } from '../src/api/gamificationApi';

/**
 * Space Service - Handles all space-related API calls with authenticated user ID
 */
class SpaceService {
  /**
   * Get user's spaces for a specific user
   */
  async getUserSpaces(userId: string): Promise<any> {
    if (!userId) {
      throw new Error('User ID is required');
    }

    console.log(`🏠 Fetching spaces for user: ${userId}`);
    
    try {
      // Using gamificationApi to get user data that represents spaces
      // Adjust this based on actual API structure for spaces
      const userData = await gamificationApi.getUserBadges(userId);
      console.log('✅ User spaces retrieved:', userData);
      
      // Transform the response to match expected space format
      const spaces = userData.data?.badges?.map((badge: any) => ({
        id: badge.badge_id || badge.id,
        title: badge.title,
        description: badge.description,
        icon: badge.icon,
        category: badge.category,
        is_active: badge.is_achieved,
        progress: badge.progress
      })) || [];

      return {
        success: true,
        user_id: userId,
        spaces,
        total_spaces: spaces.length
      };
    } catch (error) {
      console.error('❌ Failed to fetch user spaces:', error);
      console.error(`🔗 Full URL attempted: https://prodify-ap46.onrender.com/api/spaces/${userId}`);
      throw error;
    }
  }

  /**
   * Get user's badges (related to spaces) for a specific user
   */
  async getUserBadges(userId: string): Promise<any> {
    if (!userId) {
      throw new Error('User ID is required');
    }

    console.log(`🏅 Fetching badges for user: ${userId}`);
    
    try {
      const badges = await gamificationApi.getUserBadges(userId);
      console.log('✅ User badges retrieved:', badges);
      return badges;
    } catch (error) {
      console.error('❌ Failed to fetch user badges:', error);
      console.error(`🔗 Full URL attempted: https://nominatively-semirealistic-darryl.ngrok-free.dev/api/badges/${userId}`);
      throw error;
    }
  }

  /**
   * Check and award badges for a specific user
   */
  async checkAndAwardBadges(userId: string): Promise<any> {
    if (!userId) {
      throw new Error('User ID is required');
    }

    console.log(`🎯 Checking and awarding badges for user: ${userId}`);
    
    try {
      const newBadges = await gamificationApi.checkAndAwardBadges(userId);
      console.log('✅ Badges checked and awarded:', newBadges);
      return newBadges;
    } catch (error) {
      console.error('❌ Failed to check and award badges:', error);
      console.error(`🔗 Full URL attempted: https://nominatively-semirealistic-darryl.ngrok-free.dev/api/badges/check`);
      throw error;
    }
  }
}

// Export singleton instance
export const spaceService = new SpaceService();