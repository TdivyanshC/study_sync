/**
 * Streak Event System
 * Event emitter for streak-related updates (Module B2)
 */

import { EventEmitter } from 'events';

// Define event types for Module B2 - Streak Rules
export interface StreakUpdatedEvent {
  userId: string;
  currentStreak: number;
  bestStreak: number;
  streakBroken: boolean;
  milestoneReached?: string;
  streakMultiplier: number;
  streakBonusXp: number;
  timestamp: Date;
}

export interface StreakContinuityEvent {
  userId: string;
  streakActive: boolean;
  hasRecentActivity: boolean;
  currentStreak: number;
  timeUntilBreak?: string;
  timestamp: Date;
}

export interface StreakMilestoneEvent {
  userId: string;
  milestoneType: string; // e.g., "7_day_streak", "30_day_streak"
  currentStreak: number;
  bonusAwarded: number;
  timestamp: Date;
}

export interface StreakBrokenEvent {
  userId: string;
  brokenStreakLength: number;
  daysInactive: number;
  timestamp: Date;
}

export interface StreakBonusEvent {
  userId: string;
  bonusXp: number;
  multiplier: number;
  currentStreak: number;
  applied: boolean;
  timestamp: Date;
}

class StreakEventEmitter {
  private emitter: EventEmitter;

  constructor() {
    this.emitter = new EventEmitter();
    // Increase max listeners to avoid memory leak warnings
    this.emitter.setMaxListeners(50);
  }

  /**
   * Emit streak updated event
   */
  emitStreakUpdated(event: StreakUpdatedEvent) {
    this.emitter.emit('streak_updated', event);
  }

  /**
   * Listen for streak updated events
   */
  onStreakUpdated(callback: (event: StreakUpdatedEvent) => void): () => void {
    this.emitter.on('streak_updated', callback);
    return () => this.emitter.off('streak_updated', callback);
  }

  /**
   * Emit streak continuity event
   */
  emitStreakContinuity(event: StreakContinuityEvent) {
    this.emitter.emit('streak_continuity', event);
  }

  /**
   * Listen for streak continuity events
   */
  onStreakContinuity(callback: (event: StreakContinuityEvent) => void): () => void {
    this.emitter.on('streak_continuity', callback);
    return () => this.emitter.off('streak_continuity', callback);
  }

  /**
   * Emit streak milestone event
   */
  emitStreakMilestone(event: StreakMilestoneEvent) {
    this.emitter.emit('streak_milestone', event);
  }

  /**
   * Listen for streak milestone events
   */
  onStreakMilestone(callback: (event: StreakMilestoneEvent) => void): () => void {
    this.emitter.on('streak_milestone', callback);
    return () => this.emitter.off('streak_milestone', callback);
  }

  /**
   * Emit streak broken event
   */
  emitStreakBroken(event: StreakBrokenEvent) {
    this.emitter.emit('streak_broken', event);
  }

  /**
   * Listen for streak broken events
   */
  onStreakBroken(callback: (event: StreakBrokenEvent) => void): () => void {
    this.emitter.on('streak_broken', callback);
    return () => this.emitter.off('streak_broken', callback);
  }

  /**
   * Emit streak bonus event
   */
  emitStreakBonus(event: StreakBonusEvent) {
    this.emitter.emit('streak_bonus', event);
  }

  /**
   * Listen for streak bonus events
   */
  onStreakBonus(callback: (event: StreakBonusEvent) => void): () => void {
    this.emitter.on('streak_bonus', callback);
    return () => this.emitter.off('streak_bonus', callback);
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
export const streakEventEmitter = new StreakEventEmitter();