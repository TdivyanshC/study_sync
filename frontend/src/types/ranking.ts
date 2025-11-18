/**
 * Ranking System Type Definitions
 * Module D3: Ranking System TypeScript types
 */

// Tier definitions
export interface TierInfo {
  name: string;
  emoji: string;
  color: string;
  min_xp: number;
  min_streak: number;
  promotion_threshold_xp: number | null;
  promotion_threshold_streak: number | null;
}

export interface PromotionRequirements {
  bronze_to_silver: { xp: number; streak: number };
  silver_to_gold: { xp: number; streak: number };
  gold_to_platinum: { xp: number; streak: number };
  platinum_to_diamond: { xp: number; streak: number };
}

export interface DowngradeThresholds {
  silver: number;
  gold: number;
  platinum: number;
  diamond: number;
}

// User ranking data
export interface UserStats {
  xp: number;
  level: number;
  current_streak: number;
}

export interface CurrentRanking {
  tier: keyof typeof RankingConstants.TIERS;
  tier_info: TierInfo;
  user_stats: UserStats;
}

// Progress information
export interface ProgressInfo {
  at_max_tier: boolean;
  progress_to_next: number;
  next_tier: string | null;
  next_tier_info?: TierInfo;
  xp_progress: number;
  streak_progress: number;
  requirements: {
    xp: number | null;
    streak: number | null;
  };
}

// Milestone information
export interface NextTierMilestone {
  type: string;
  target: string;
  target_name?: string;
  target_emoji?: string;
  xp_needed: number;
  streak_needed: number;
  message?: string;
}

export interface StreakMilestone {
  type: string;
  target: string;
  current: number;
  needed: number;
}

export interface XPMilestone {
  type: string;
  target: string;
  current: number;
  needed: number;
}

export interface NextMilestones {
  next_tier: NextTierMilestone;
  streak_milestones: StreakMilestone[];
  xp_milestones: XPMilestone[];
}

// Leaderboard
export interface LeaderboardInfo {
  position: number;
  total_users: number;
}

export interface LeaderboardUser {
  position: number;
  user_id: string;
  xp: number;
  level: number;
  current_streak: number;
  tier: string;
  tier_info: TierInfo;
}

// Downgrade information
export interface DowngradeInfo {
  should_downgrade: boolean;
  reason: string | null;
  inactive_days?: number;
  new_tier?: string;
  downgrade_threshold?: number;
}

// Main ranking status response
export interface RankingStatus {
  success: boolean;
  user_id: string;
  current_ranking: CurrentRanking;
  progress: ProgressInfo;
  leaderboard: LeaderboardInfo;
  next_milestones: NextMilestones;
  downgrade_info: DowngradeInfo;
  ranking_api_endpoint: string;
  timestamp: string;
}

// Promotion eligibility
export interface PromotionEligibility {
  success: boolean;
  user_id: string;
  current_tier: string;
  next_tier?: string;
  eligible_for_promotion: boolean;
  requirements?: {
    xp: {
      required: number;
      current: number;
      met: boolean;
      remaining: number;
    };
    streak: {
      required: number;
      current: number;
      met: boolean;
      remaining: number;
    };
  };
  message: string;
  composite_score?: number;
}

// Promotion result
export interface PromotionResult {
  success: boolean;
  user_id: string;
  promoted?: boolean;
  from_tier?: string;
  to_tier?: string;
  new_ranking?: CurrentRanking;
  message: string;
  celebration_data?: {
    tier_emoji: string;
    tier_color: string;
    new_title: string;
  };
}

// Leaderboard response
export interface LeaderboardResponse {
  success: boolean;
  leaderboard: LeaderboardUser[];
  total_users: number;
  generated_at: string;
}

// Downgrade processing result
export interface DowngradeResult {
  success: boolean;
  downgrade_count: number;
  downgraded_users: Array<{
    user_id: string;
    from_tier: string;
    to_tier: string;
    reason: string;
    inactive_days: number;
  }>;
  processed_at: string;
}

// Event history
export interface RankingEvent {
  id: string;
  event_type: string;
  from_tier?: string;
  to_tier?: string;
  reason?: string;
  created_at: string;
}

export interface RankingEventsResponse {
  success: boolean;
  user_id: string;
  events: RankingEvent[];
  total_events: number;
}

// API responses
export interface APIResponse<T> {
  success: boolean;
  data: T;
  message: string;
}

// Ranking constants class
export class RankingConstants {
  static readonly TIERS = {
    bronze: {
      name: 'Bronze',
      emoji: '🥉',
      color: '#CD7F32',
      min_xp: 0,
      min_streak: 0,
      promotion_threshold_xp: 500,
      promotion_threshold_streak: 3
    },
    silver: {
      name: 'Silver',
      emoji: '🥈',
      color: '#C0C0C0',
      min_xp: 500,
      min_streak: 3,
      promotion_threshold_xp: 2000,
      promotion_threshold_streak: 7
    },
    gold: {
      name: 'Gold',
      emoji: '🥇',
      color: '#FFD700',
      min_xp: 2000,
      min_streak: 7,
      promotion_threshold_xp: 5000,
      promotion_threshold_streak: 14
    },
    platinum: {
      name: 'Platinum',
      emoji: '💎',
      color: '#E5E4E2',
      min_xp: 5000,
      min_streak: 14,
      promotion_threshold_xp: 15000,
      promotion_threshold_streak: 30
    },
    diamond: {
      name: 'Diamond',
      emoji: '💎',
      color: '#B9F2FF',
      min_xp: 15000,
      min_streak: 30,
      promotion_threshold_xp: null,
      promotion_threshold_streak: null
    }
  } as const;

  static readonly DOWNGRADE_THRESHOLDS = {
    silver: 14,
    gold: 10,
    platinum: 7,
    diamond: 5
  } as const;

  static readonly XP_WEIGHT = 0.7;
  static readonly STREAK_WEIGHT = 0.3;

  static readonly PROMOTION_REQUIREMENTS = {
    bronze_to_silver: { xp: 500, streak: 3 },
    silver_to_gold: { xp: 2000, streak: 7 },
    gold_to_platinum: { xp: 5000, streak: 14 },
    platinum_to_diamond: { xp: 15000, streak: 30 }
  } as const;
}

// Utility type guards
export function isPromotionEligible(eligibility: PromotionEligibility): eligibility is PromotionEligibility & { 
  eligible_for_promotion: true; 
  requirements: {
    xp: { required: number; current: number; met: true; remaining: number };
    streak: { required: number; current: number; met: true; remaining: number };
  };
} {
  return eligibility.eligible_for_promotion && eligibility.requirements !== null;
}

export function isMaxTier(tier: keyof typeof RankingConstants.TIERS): boolean {
  return tier === 'diamond';
}

export function getNextTier(currentTier: keyof typeof RankingConstants.TIERS): keyof typeof RankingConstants.TIERS | null {
  const tierOrder: (keyof typeof RankingConstants.TIERS)[] = ['bronze', 'silver', 'gold', 'platinum', 'diamond'];
  const currentIndex = tierOrder.indexOf(currentTier);
  
  if (currentIndex >= tierOrder.length - 1) {
    return null;
  }
  
  return tierOrder[currentIndex + 1];
}

export function calculateCompositeScore(xp: number, streak: number): number {
  const normalizedXP = Math.min(xp / 15000, 1.0);
  const normalizedStreak = Math.min(streak / 30, 1.0);
  
  return normalizedXP * RankingConstants.XP_WEIGHT + 
         normalizedStreak * RankingConstants.STREAK_WEIGHT;
}

export function formatTierName(tier: keyof typeof RankingConstants.TIERS): string {
  return RankingConstants.TIERS[tier].name;
}

export function formatTierEmoji(tier: keyof typeof RankingConstants.TIERS): string {
  return RankingConstants.TIERS[tier].emoji;
}

export function formatTierColor(tier: keyof typeof RankingConstants.TIERS): string {
  return RankingConstants.TIERS[tier].color;
}

export function getTierRequirements(tier: keyof typeof RankingConstants.TIERS) {
  return RankingConstants.TIERS[tier];
}