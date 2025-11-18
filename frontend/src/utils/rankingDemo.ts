/**
 * Ranking System Demo Utility
 * Demonstrates Module D3: Ranking System functionality
 */

import { 
  RankingConstants, 
  TierInfo, 
  UserStats, 
  ProgressInfo, 
  NextMilestones, 
  LeaderboardUser,
  calculateCompositeScore,
  formatTierName,
  formatTierEmoji,
  formatTierColor,
  getNextTier,
  isMaxTier
} from '../types/ranking';

// Mock API service for demo
class MockRankingAPI {
  private static instance: MockRankingAPI;
  public users: Map<string, any> = new Map();

  static getInstance(): MockRankingAPI {
    if (!MockRankingAPI.instance) {
      MockRankingAPI.instance = new MockRankingAPI();
    }
    return MockRankingAPI.instance;
  }

  async getRankingStatus(userId: string) {
    // Simulate network delay
    await new Promise(resolve => setTimeout(resolve, 800));
    
    // Mock user data
    const userData = this.users.get(userId) || {
      xp: Math.floor(Math.random() * 15000) + 100,
      level: Math.floor(Math.random() * 50) + 1,
      current_streak: Math.floor(Math.random() * 50),
      tier: this.calculateTier(Math.floor(Math.random() * 15000) + 100, Math.floor(Math.random() * 50))
    };

    return {
      success: true,
      user_id: userId,
      current_ranking: {
        tier: userData.tier,
        tier_info: RankingConstants.TIERS[userData.tier as keyof typeof RankingConstants.TIERS],
        user_stats: {
          xp: userData.xp,
          level: userData.level,
          current_streak: userData.current_streak
        }
      },
      progress: this.calculateProgress(userData.xp, userData.current_streak, userData.tier),
      leaderboard: {
        position: Math.floor(Math.random() * 100) + 1,
        total_users: 150
      },
      next_milestones: this.calculateMilestones(userData.xp, userData.current_streak, userData.tier),
      downgrade_info: {
        should_downgrade: userData.current_streak === 0 && userData.xp < 100,
        reason: userData.current_streak === 0 ? 'No recent activity' : null
      }
    };
  }

  async checkPromotionEligibility(userId: string) {
    const status = await this.getRankingStatus(userId);
    const currentTier = status.current_ranking.tier;
    
    if (isMaxTier(currentTier as keyof typeof RankingConstants.TIERS)) {
      return {
        success: true,
        user_id: userId,
        current_tier: currentTier,
        eligible_for_promotion: false,
        message: 'Already at highest tier (Diamond)',
        next_tier: null,
        requirements: null
      };
    }

    const nextTier = getNextTier(currentTier as keyof typeof RankingConstants.TIERS);
    if (!nextTier) {
      return {
        success: true,
        user_id: userId,
        current_tier: currentTier,
        eligible_for_promotion: false,
        message: 'Already at highest tier',
        next_tier: null,
        requirements: null
      };
    }
    
    const promotionKey = `${currentTier}_to_${nextTier}` as keyof typeof RankingConstants.PROMOTION_REQUIREMENTS;
    const requirements = RankingConstants.PROMOTION_REQUIREMENTS[promotionKey];
    const userStats = status.current_ranking.user_stats;
    
    const xpMet = userStats.xp >= requirements.xp;
    const streakMet = userStats.current_streak >= requirements.streak;
    const eligible = xpMet && streakMet;

    return {
      success: true,
      user_id: userId,
      current_tier: currentTier,
      next_tier: nextTier,
      eligible_for_promotion: eligible,
      requirements: {
        xp: {
          required: requirements.xp,
          current: userStats.xp,
          met: xpMet,
          remaining: Math.max(0, requirements.xp - userStats.xp)
        },
        streak: {
          required: requirements.streak,
          current: userStats.current_streak,
          met: streakMet,
          remaining: Math.max(0, requirements.streak - userStats.current_streak)
        }
      },
      message: eligible 
        ? `Eligible for promotion to ${RankingConstants.TIERS[nextTier].name}` 
        : `Need ${requirements.xp} XP and ${requirements.streak} day streak for ${RankingConstants.TIERS[nextTier].name}`,
      composite_score: calculateCompositeScore(userStats.xp, userStats.current_streak)
    };
  }

  async promoteUser(userId: string) {
    const eligibility = await this.checkPromotionEligibility(userId);
    
    if (!eligibility.eligible_for_promotion) {
      return {
        success: false,
        user_id: userId,
        message: 'Not eligible for promotion yet',
        current_tier: eligibility.current_tier,
        requirements: eligibility.requirements
      };
    }

    // Simulate promotion
    const userData = this.users.get(userId) || {};
    userData.tier = eligibility.next_tier!;
    this.users.set(userId, userData);

    return {
      success: true,
      user_id: userId,
      promoted: true,
      from_tier: eligibility.current_tier,
      to_tier: eligibility.next_tier!,
      message: `Congratulations! Promoted from ${RankingConstants.TIERS[eligibility.current_tier as keyof typeof RankingConstants.TIERS].name} to ${RankingConstants.TIERS[eligibility.next_tier! as keyof typeof RankingConstants.TIERS].name}!`,
      celebration_data: {
        tier_emoji: formatTierEmoji(eligibility.next_tier! as keyof typeof RankingConstants.TIERS),
        tier_color: formatTierColor(eligibility.next_tier! as keyof typeof RankingConstants.TIERS),
        new_title: `${formatTierName(eligibility.next_tier! as keyof typeof RankingConstants.TIERS)} Scholar`
      }
    };
  }

  async getLeaderboard(limit: number = 20) {
    // Generate mock leaderboard data
    const leaderboard: LeaderboardUser[] = [];
    const tiers = Object.keys(RankingConstants.TIERS) as (keyof typeof RankingConstants.TIERS)[];
    
    for (let i = 0; i < Math.min(limit, 50); i++) {
      const xp = Math.floor(Math.random() * 20000) + 100;
      const streak = Math.floor(Math.random() * 100);
      const tier = this.calculateTier(xp, streak);
      
      leaderboard.push({
        position: i + 1,
        user_id: `user_${i}`,
        xp: xp,
        level: Math.floor(xp / 100) + 1,
        current_streak: streak,
        tier: tier,
        tier_info: RankingConstants.TIERS[tier as keyof typeof RankingConstants.TIERS]
      });
    }

    return {
      success: true,
      leaderboard: leaderboard,
      total_users: leaderboard.length
    };
  }

  public calculateTier(xp: number, streak: number): string {
    const tierOrder: (keyof typeof RankingConstants.TIERS)[] = ['bronze', 'silver', 'gold', 'platinum', 'diamond'];
    
    for (const tier of tierOrder.reverse()) {
      const tierInfo = RankingConstants.TIERS[tier];
      if (xp >= tierInfo.min_xp && streak >= tierInfo.min_streak) {
        return tier;
      }
    }
    return 'bronze';
  }

  private calculateProgress(xp: number, streak: number, currentTier: string) {
    const tierOrder: (keyof typeof RankingConstants.TIERS)[] = ['bronze', 'silver', 'gold', 'platinum', 'diamond'];
    const currentIndex = tierOrder.indexOf(currentTier as keyof typeof RankingConstants.TIERS);
    
    if (currentIndex >= tierOrder.length - 1) {
      return {
        at_max_tier: true,
        progress_to_next: 100,
        next_tier: null
      };
    }

    const nextTier = tierOrder[currentIndex + 1];
    const currentTierInfo = RankingConstants.TIERS[currentTier as keyof typeof RankingConstants.TIERS];
    const nextTierInfo = RankingConstants.TIERS[nextTier];

    const xpRange = (nextTierInfo.promotion_threshold_xp || 0) - (currentTierInfo.promotion_threshold_xp || 0);
    const xpProgress = xpRange > 0 ? ((xp - (currentTierInfo.promotion_threshold_xp || 0)) / xpRange * 100) : 100;

    const streakRange = (nextTierInfo.promotion_threshold_streak || 0) - (currentTierInfo.promotion_threshold_streak || 0);
    const streakProgress = streakRange > 0 ? ((streak - (currentTierInfo.promotion_threshold_streak || 0)) / streakRange * 100) : 100;

    const overallProgress = (xpProgress * 0.7 + streakProgress * 0.3);

    return {
      at_max_tier: false,
      progress_to_next: Math.min(overallProgress, 100),
      next_tier: nextTier,
      next_tier_info: nextTierInfo,
      xp_progress: Math.max(xpProgress, 0),
      streak_progress: Math.max(streakProgress, 0),
      requirements: {
        xp: nextTierInfo.promotion_threshold_xp,
        streak: nextTierInfo.promotion_threshold_streak
      }
    };
  }

  private calculateMilestones(xp: number, streak: number, currentTier: string) {
    const tierOrder: (keyof typeof RankingConstants.TIERS)[] = ['bronze', 'silver', 'gold', 'platinum', 'diamond'];
    const currentIndex = tierOrder.indexOf(currentTier as keyof typeof RankingConstants.TIERS);
    
    let nextTier = null;
    if (currentIndex < tierOrder.length - 1) {
      nextTier = tierOrder[currentIndex + 1];
    }

    const nextTierMilestone = nextTier ? {
      type: 'tier_promotion',
      target: nextTier,
      target_name: formatTierName(nextTier),
      target_emoji: formatTierEmoji(nextTier),
      xp_needed: Math.max(0, (RankingConstants.TIERS[nextTier].promotion_threshold_xp || 0) - xp),
      streak_needed: Math.max(0, (RankingConstants.TIERS[nextTier].promotion_threshold_streak || 0) - streak)
    } : {
      type: 'max_tier',
      target: 'diamond_master',
      message: 'Maintain your Diamond status!'
    };

    const streakTargets = [7, 14, 30, 60, 100];
    const streakMilestones = streakTargets
      .filter(target => streak < target)
      .slice(0, 2)
      .map(target => ({
        type: 'streak',
        target: `${target}_days`,
        current: streak,
        needed: target - streak
      }));

    return {
      next_tier: nextTierMilestone,
      streak_milestones: streakMilestones,
      xp_milestones: [
        {
          type: 'xp_round',
          target: `${Math.ceil(xp / 1000) * 1000}_xp`,
          current: xp,
          needed: Math.ceil(xp / 1000) * 1000 - xp
        }
      ]
    };
  }
}

/**
 * Demo utility functions
 */
export const simulateRankingDemo = async (userId: string = 'demo-user') => {
  console.log('🏆 Starting Ranking System Demo (Module D3)...');
  console.log('='.repeat(50));

  const api = MockRankingAPI.getInstance();

  // Demo 1: Get ranking status
  console.log('\n📊 Getting user ranking status...');
  const rankingStatus = await api.getRankingStatus(userId);
  console.log(`Current Tier: ${formatTierName(rankingStatus.current_ranking.tier as keyof typeof RankingConstants.TIERS)} ${formatTierEmoji(rankingStatus.current_ranking.tier as keyof typeof RankingConstants.TIERS)}`);
  console.log(`XP: ${rankingStatus.current_ranking.user_stats.xp}`);
  console.log(`Streak: ${rankingStatus.current_ranking.user_stats.current_streak} days`);
  console.log(`Leaderboard Position: #${rankingStatus.leaderboard.position}`);

  if (!rankingStatus.progress.at_max_tier) {
    console.log(`Progress to ${rankingStatus.progress.next_tier_info?.name}: ${Math.round(rankingStatus.progress.progress_to_next)}%`);
  }

  // Demo 2: Check promotion eligibility
  console.log('\n🎯 Checking promotion eligibility...');
  const eligibility = await api.checkPromotionEligibility(userId);
  console.log(`Eligible for promotion: ${eligibility.eligible_for_promotion ? 'YES' : 'NO'}`);
  if (eligibility.eligible_for_promotion) {
    console.log(`Next tier: ${formatTierName(eligibility.next_tier! as keyof typeof RankingConstants.TIERS)} ${formatTierEmoji(eligibility.next_tier! as keyof typeof RankingConstants.TIERS)}`);
  } else {
    if (eligibility.requirements) {
      console.log(`Requirements: ${eligibility.requirements.xp.required} XP, ${eligibility.requirements.streak.required} day streak`);
      console.log(`Missing: ${eligibility.requirements.xp.remaining} XP, ${eligibility.requirements.streak.remaining} days`);
    } else {
      console.log(eligibility.message);
    }
  }

  // Demo 3: Attempt promotion if eligible
  if (eligibility.eligible_for_promotion) {
    console.log('\n🚀 Attempting promotion...');
    const promotion = await api.promoteUser(userId);
    if (promotion.promoted) {
      console.log(`🎉 SUCCESS: ${promotion.message}`);
    } else {
      console.log(`❌ Failed: ${promotion.message}`);
    }
  }

  // Demo 4: Get leaderboard
  console.log('\n🏅 Top 10 Leaderboard:');
  const leaderboard = await api.getLeaderboard(10);
  leaderboard.leaderboard.slice(0, 5).forEach((user, index) => {
    console.log(`${user.position}. ${user.tier_info.emoji} ${user.tier_info.name} Scholar - ${user.xp} XP (${user.current_streak} day streak)`);
  });

  // Demo 5: Tier information
  console.log('\n📋 Available Tiers:');
  Object.entries(RankingConstants.TIERS).forEach(([tier, info]) => {
    console.log(`${info.emoji} ${info.name}: ${info.min_xp}+ XP, ${info.min_streak}+ day streak`);
  });

  console.log('\n✅ Ranking System Demo completed!');
  
  return {
    rankingStatus,
    eligibility,
    leaderboard,
    message: 'Ranking system demo completed successfully'
  };
};

/**
 * Simulate ranking progression over time
 */
export const simulateRankingProgression = async (userId: string = 'progression-user') => {
  console.log('📈 Simulating ranking progression over time...');
  
  const api = MockRankingAPI.getInstance();
  const progressionLog = [];

  // Simulate user studying and gaining XP/streaks over several weeks
  for (let week = 1; week <= 8; week++) {
    console.log(`\n--- Week ${week} ---`);
    
    // Simulate weekly progress
    const xpGained = Math.floor(Math.random() * 2000) + 500;
    const newStreak = Math.min(week * 3, 50);
    
    // Update mock user data
    const currentData = api.users.get(userId) || { xp: 0, level: 1, current_streak: 0, tier: 'bronze' };
    currentData.xp += xpGained;
    currentData.current_streak = newStreak;
    currentData.tier = api.calculateTier(currentData.xp, currentData.current_streak);
    api.users.set(userId, currentData);

    const status = await api.getRankingStatus(userId);
    const eligibility = await api.checkPromotionEligibility(userId);

    progressionLog.push({
      week,
      xp: currentData.xp,
      streak: newStreak,
      tier: currentData.tier,
      tier_info: status.current_ranking.tier_info,
      eligible: eligibility.eligible_for_promotion,
      progress: status.progress.progress_to_next
    });

    console.log(`XP: ${currentData.xp} | Streak: ${newStreak} | Tier: ${formatTierName(currentData.tier as keyof typeof RankingConstants.TIERS)} ${formatTierEmoji(currentData.tier as keyof typeof RankingConstants.TIERS)}`);
    
    if (eligibility.eligible_for_promotion) {
      console.log('🎯 Eligible for promotion!');
    }

    // Auto-promote if eligible (every 2 weeks for demo)
    if (eligibility.eligible_for_promotion && week % 2 === 0) {
      const promotion = await api.promoteUser(userId);
      if (promotion.promoted) {
        console.log(`🚀 PROMOTED: ${promotion.message}`);
      }
    }
  }

  console.log('\n📊 Progression Summary:');
  progressionLog.forEach(log => {
    console.log(`Week ${log.week}: ${log.tier_info.name} ${log.tier_info.emoji} - ${log.xp} XP, ${log.streak} day streak (${Math.round(log.progress)}% to next)`);
  });

  return progressionLog;
};

/**
 * Create demo user with specific ranking scenario
 */
export const createDemoRankingScenario = async (
  userId: string,
  scenario: 'new_user' | 'silver_progression' | 'gold_eligible' | 'platinum_master' | 'diamond_inactive'
) => {
  console.log(`🎭 Creating ${scenario} scenario for user ${userId}...`);

  const api = MockRankingAPI.getInstance();
  const scenarios = {
    new_user: { xp: 100, streak: 1, tier: 'bronze' },
    silver_progression: { xp: 800, streak: 4, tier: 'silver' },
    gold_eligible: { xp: 2200, streak: 8, tier: 'silver' },
    platinum_master: { xp: 8000, streak: 25, tier: 'platinum' },
    diamond_inactive: { xp: 18000, streak: 0, tier: 'diamond' }
  };

  const userData = scenarios[scenario];
  api.users.set(userId, userData);

  console.log(`✅ ${scenario} scenario created:`);
  console.log(`   XP: ${userData.xp}`);
  console.log(`   Streak: ${userData.streak} days`);
  console.log(`   Tier: ${userData.tier}`);

  // Get initial status
  const status = await api.getRankingStatus(userId);
  const eligibility = await api.checkPromotionEligibility(userId);

  return {
    scenario,
    userData,
    rankingStatus: status,
    eligibility,
    readyForDemo: true
  };
};

export default {
  simulateRankingDemo,
  simulateRankingProgression,
  createDemoRankingScenario
};