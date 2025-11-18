/**
 * XP Event System
 * Event emitter for XP-related updates
 */

import { EventEmitter } from 'events';

// Define event types
export interface XPUpdatedEvent {
  userId: string;
  amountAwarded: number;
  totalXP: number;
  level: number;
  source: string;
  timestamp: Date;
  levelUp: boolean;
}

export interface XPLevelUpEvent {
  userId: string;
  oldLevel: number;
  newLevel: number;
  totalXP: number;
  timestamp: Date;
}

export interface XPMilestoneEvent {
  userId: string;
  milestoneType: '500_xp' | '10000_xp';
  totalXP: number;
  bonusAwarded: number;
  timestamp: Date;
}

class XPEventEmitter {
  private emitter: EventEmitter;

  constructor() {
    this.emitter = new EventEmitter();
    // Increase max listeners to avoid memory leak warnings
    this.emitter.setMaxListeners(50);
  }

  /**
   * Emit XP updated event
   */
  emitXPUpdated(event: XPUpdatedEvent) {
    this.emitter.emit('xp_updated', event);
  }

  /**
   * Listen for XP updated events
   */
  onXPUpdated(callback: (event: XPUpdatedEvent) => void): () => void {
    this.emitter.on('xp_updated', callback);
    // Return unsubscribe function
    return () => this.emitter.off('xp_updated', callback);
  }

  /**
   * Emit level up event
   */
  emitLevelUp(event: XPLevelUpEvent) {
    this.emitter.emit('level_up', event);
  }

  /**
   * Listen for level up events
   */
  onLevelUp(callback: (event: XPLevelUpEvent) => void): () => void {
    this.emitter.on('level_up', callback);
    return () => this.emitter.off('level_up', callback);
  }

  /**
   * Emit milestone reached event
   */
  emitMilestone(event: XPMilestoneEvent) {
    this.emitter.emit('milestone_reached', event);
  }

  /**
   * Listen for milestone events
   */
  onMilestone(callback: (event: XPMilestoneEvent) => void): () => void {
    this.emitter.on('milestone_reached', callback);
    return () => this.emitter.off('milestone_reached', callback);
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
export const xpEventEmitter = new XPEventEmitter();

// Export types for use in components
// Types are already exported in their declarations above