/**
 * Badge Event Hooks
 * React hooks for listening to badge system events
 */

import { useEffect, useState } from 'react';
import { 
  badgeEventEmitter, 
  BadgeUnlockedEvent, 
  BadgeProgressEvent, 
  BadgeCollectionEvent, 
  BadgeNotificationEvent 
} from '../events/badgeEvents';

export interface UseBadgeEventsOptions {
  userId: string;
  onBadgeUnlocked?: (event: BadgeUnlockedEvent) => void;
  onBadgeProgress?: (event: BadgeProgressEvent) => void;
  onBadgeCollection?: (event: BadgeCollectionEvent) => void;
  onBadgeNotification?: (event: BadgeNotificationEvent) => void;
  enableDebug?: boolean;
}

export interface BadgeEventState {
  lastUnlockedEvent?: BadgeUnlockedEvent;
  lastProgressEvent?: BadgeProgressEvent;
  lastCollectionEvent?: BadgeCollectionEvent;
  lastNotificationEvent?: BadgeNotificationEvent;
  isListening: boolean;
}

/**
 * Hook to listen to all badge system events
 */
export const useBadgeEvents = (options: UseBadgeEventsOptions) => {
  const { 
    userId, 
    onBadgeUnlocked, 
    onBadgeProgress, 
    onBadgeCollection, 
    onBadgeNotification,
    enableDebug = false 
  } = options;
  
  const [state, setState] = useState<BadgeEventState>({
    isListening: false,
  });

  useEffect(() => {
    if (!userId) return;

    const unsubscribeFunctions: (() => void)[] = [];

    // Badge Unlocked Event
    const handleBadgeUnlocked = (event: BadgeUnlockedEvent) => {
      if (event.userId !== userId) return;

      if (enableDebug) {
        console.log('[Badge Event] Badge Unlocked:', event);
      }

      setState(prev => ({
        ...prev,
        lastUnlockedEvent: event,
        isListening: true,
      }));

      onBadgeUnlocked?.(event);
    };

    // Badge Progress Event
    const handleBadgeProgress = (event: BadgeProgressEvent) => {
      if (event.userId !== userId) return;

      if (enableDebug) {
        console.log('[Badge Event] Badge Progress:', event);
      }

      setState(prev => ({
        ...prev,
        lastProgressEvent: event,
        isListening: true,
      }));

      onBadgeProgress?.(event);
    };

    // Badge Collection Event
    const handleBadgeCollection = (event: BadgeCollectionEvent) => {
      if (event.userId !== userId) return;

      if (enableDebug) {
        console.log('[Badge Event] Badge Collection:', event);
      }

      setState(prev => ({
        ...prev,
        lastCollectionEvent: event,
        isListening: true,
      }));

      onBadgeCollection?.(event);
    };

    // Badge Notification Event
    const handleBadgeNotification = (event: BadgeNotificationEvent) => {
      if (event.userId !== userId) return;

      if (enableDebug) {
        console.log('[Badge Event] Badge Notification:', event);
      }

      setState(prev => ({
        ...prev,
        lastNotificationEvent: event,
        isListening: true,
      }));

      onBadgeNotification?.(event);
    };

    // Register event listeners
    const unsubBadgeUnlocked = badgeEventEmitter.onBadgeUnlocked(handleBadgeUnlocked);
    const unsubBadgeProgress = badgeEventEmitter.onBadgeProgress(handleBadgeProgress);
    const unsubBadgeCollection = badgeEventEmitter.onBadgeCollection(handleBadgeCollection);
    const unsubBadgeNotification = badgeEventEmitter.onBadgeNotification(handleBadgeNotification);

    unsubscribeFunctions.push(
      unsubBadgeUnlocked,
      unsubBadgeProgress,
      unsubBadgeCollection,
      unsubBadgeNotification
    );

    // Set listening state
    setState(prev => ({ ...prev, isListening: true }));

    // Cleanup function
    return () => {
      unsubscribeFunctions.forEach(unsub => unsub());
      setState(prev => ({ ...prev, isListening: false }));
    };
  }, [userId, onBadgeUnlocked, onBadgeProgress, onBadgeCollection, onBadgeNotification, enableDebug]);

  return state;
};

/**
 * Hook for badge unlocked notifications only
 */
export const useBadgeUnlockedNotifications = (
  userId: string,
  onUnlocked?: (badge: any, totalBadges: number) => void,
  enableDebug?: boolean
) => {
  return useBadgeEvents({
    userId,
    onBadgeUnlocked: (event) => {
      onUnlocked?.(event.badge, event.totalBadges);
    },
    enableDebug,
  });
};

/**
 * Hook for badge progress notifications only
 */
export const useBadgeProgressNotifications = (
  userId: string,
  onProgress?: (badgeTitle: string, progress: number, target: number, percentage: number) => void,
  enableDebug?: boolean
) => {
  return useBadgeEvents({
    userId,
    onBadgeProgress: (event) => {
      onProgress?.(event.badgeTitle, event.progress, event.target, event.percentage);
    },
    enableDebug,
  });
};

/**
 * Hook for badge collection notifications only
 */
export const useBadgeCollectionNotifications = (
  userId: string,
  onCollection?: (totalBadges: number, badgeTypes: any) => void,
  enableDebug?: boolean
) => {
  return useBadgeEvents({
    userId,
    onBadgeCollection: (event) => {
      onCollection?.(event.totalBadges, event.badgeTypes);
    },
    enableDebug,
  });
};

export default useBadgeEvents;