/**
 * Ranking Event System
 * Event emitter for ranking-related updates (Module D3)
 */

import { EventEmitter } from 'events';

// Define event types for Module D3 - Ranking System
export interface RankingUpdatedEvent {
  userId: string;
  tier: string;
  score: number;
  progressPercent: number;
  promoted: boolean;
  nextTier?: string;
  timestamp: Date;
}

export interface TierPromotionEvent {
  userId: string;
  oldTier: string;
  newTier: string;
  oldScore: number;
  newScore: number;
  requirements: {
    xp: number;
    streak: number;
  };
  timestamp: Date;
}

export interface TierDemotionEvent {
  userId: string;
  oldTier: string;
  newTier: string;
  reason: string;
  timestamp: Date;
}

export interface RankingMilestoneEvent {
  userId: string;
  milestoneType: string;
  tier: string;
  score: number;
  bonusAwarded?: number;
  timestamp: Date;
}

class RankingEventEmitter {
  private emitter: EventEmitter;

  constructor() {
    this.emitter = new EventEmitter();
    // Increase max listeners to avoid memory leak warnings
    this.emitter.setMaxListeners(50);
  }

  /**
   * Emit ranking updated event
   */
  emitRankingUpdated(event: RankingUpdatedEvent) {
    this.emitter.emit('ranking_updated', event);
  }

  /**
   * Listen for ranking updated events
   */
  onRankingUpdated(callback: (event: RankingUpdatedEvent) => void): () => void {
    this.emitter.on('ranking_updated', callback);
    return () => this.emitter.off('ranking_updated', callback);
  }

  /**
   * Emit tier promotion event
   */
  emitTierPromotion(event: TierPromotionEvent) {
    this.emitter.emit('tier_promotion', event);
  }

  /**
   * Listen for tier promotion events
   */
  onTierPromotion(callback: (event: TierPromotionEvent) => void): () => void {
    this.emitter.on('tier_promotion', callback);
    return () => this.emitter.off('tier_promotion', callback);
  }

  /**
   * Emit tier demotion event
   */
  emitTierDemotion(event: TierDemotionEvent) {
    this.emitter.emit('tier_demotion', event);
  }

  /**
   * Listen for tier demotion events
   */
  onTierDemotion(callback: (event: TierDemotionEvent) => void): () => void {
    this.emitter.on('tier_demotion', callback);
    return () => this.emitter.off('tier_demotion', callback);
  }

  /**
   * Emit ranking milestone event
   */
  emitRankingMilestone(event: RankingMilestoneEvent) {
    this.emitter.emit('ranking_milestone', event);
  }

  /**
   * Listen for ranking milestone events
   */
  onRankingMilestone(callback: (event: RankingMilestoneEvent) => void): () => void {
    this.emitter.on('ranking_milestone', callback);
    return () => this.emitter.off('ranking_milestone', callback);
  }

  /**
   * Remove all listeners (useful for cleanup)
   */
  removeAllListeners() {
    this.emitter.removeAllListeners();
  }

  /**
   * Get listener count for debugging
   */
  getListenerCount(event: string): number {
    return this.emitter.listenerCount(event);
  }
}

// Export singleton instance
export const rankingEventEmitter = new RankingEventEmitter();