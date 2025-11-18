/**
 * Badge Event System
 * Event emitter for badge-related updates (Module Badge)
 */

import { EventEmitter } from 'events';

// Define event types for Badge System
export interface BadgeUnlockedEvent {
  userId: string;
  badge: {
    id: string;
    title: string;
    description: string;
    icon_url?: string;
  };
  earnedAt: Date;
  totalBadges: number;
  timestamp: Date;
}

export interface BadgeProgressEvent {
  userId: string;
  badgeId: string;
  badgeTitle: string;
  progress: number;
  target: number;
  percentage: number;
  timestamp: Date;
}

export interface BadgeCollectionEvent {
  userId: string;
  totalBadges: number;
  badgeTypes: {
    streak: number;
    xp: number;
    session: number;
    milestone: number;
  };
  timestamp: Date;
}

export interface BadgeNotificationEvent {
  userId: string;
  type: 'unlocked' | 'progress' | 'collection_complete';
  badgeId?: string;
  title: string;
  message: string;
  icon?: string;
  timestamp: Date;
}

class BadgeEventEmitter {
  private emitter: EventEmitter;

  constructor() {
    this.emitter = new EventEmitter();
    // Increase max listeners to avoid memory leak warnings
    this.emitter.setMaxListeners(50);
  }

  /**
   * Emit badge unlocked event
   */
  emitBadgeUnlocked(event: BadgeUnlockedEvent) {
    this.emitter.emit('badge_unlocked', event);
  }

  /**
   * Listen for badge unlocked events
   */
  onBadgeUnlocked(callback: (event: BadgeUnlockedEvent) => void): () => void {
    this.emitter.on('badge_unlocked', callback);
    return () => this.emitter.off('badge_unlocked', callback);
  }

  /**
   * Emit badge progress event
   */
  emitBadgeProgress(event: BadgeProgressEvent) {
    this.emitter.emit('badge_progress', event);
  }

  /**
   * Listen for badge progress events
   */
  onBadgeProgress(callback: (event: BadgeProgressEvent) => void): () => void {
    this.emitter.on('badge_progress', callback);
    return () => this.emitter.off('badge_progress', callback);
  }

  /**
   * Emit badge collection event
   */
  emitBadgeCollection(event: BadgeCollectionEvent) {
    this.emitter.emit('badge_collection', event);
  }

  /**
   * Listen for badge collection events
   */
  onBadgeCollection(callback: (event: BadgeCollectionEvent) => void): () => void {
    this.emitter.on('badge_collection', callback);
    return () => this.emitter.off('badge_collection', callback);
  }

  /**
   * Emit badge notification event
   */
  emitBadgeNotification(event: BadgeNotificationEvent) {
    this.emitter.emit('badge_notification', event);
  }

  /**
   * Listen for badge notification events
   */
  onBadgeNotification(callback: (event: BadgeNotificationEvent) => void): () => void {
    this.emitter.on('badge_notification', callback);
    return () => this.emitter.off('badge_notification', callback);
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
export const badgeEventEmitter = new BadgeEventEmitter();