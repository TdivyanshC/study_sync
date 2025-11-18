/**
 * Streak Event Hooks
 * React hooks for listening to streak system events (Module B2)
 */

import { useEffect, useState } from 'react';
import { 
  streakEventEmitter, 
  StreakUpdatedEvent, 
  StreakContinuityEvent, 
  StreakMilestoneEvent, 
  StreakBrokenEvent,
  StreakBonusEvent 
} from '../events/streakEvents';

export interface UseStreakEventsOptions {
  userId: string;
  onStreakUpdated?: (event: StreakUpdatedEvent) => void;
  onStreakContinuity?: (event: StreakContinuityEvent) => void;
  onStreakMilestone?: (event: StreakMilestoneEvent) => void;
  onStreakBroken?: (event: StreakBrokenEvent) => void;
  onStreakBonus?: (event: StreakBonusEvent) => void;
  enableDebug?: boolean;
}

export interface StreakEventState {
  lastStreakUpdate?: StreakUpdatedEvent;
  lastContinuityCheck?: StreakContinuityEvent;
  lastMilestoneEvent?: StreakMilestoneEvent;
  lastBrokenEvent?: StreakBrokenEvent;
  lastBonusEvent?: StreakBonusEvent;
  isListening: boolean;
}

/**
 * Hook to listen to all streak system events
 */
export const useStreakEvents = (options: UseStreakEventsOptions) => {
  const { 
    userId, 
    onStreakUpdated, 
    onStreakContinuity, 
    onStreakMilestone, 
    onStreakBroken, 
    onStreakBonus,
    enableDebug = false 
  } = options;
  
  const [state, setState] = useState<StreakEventState>({
    isListening: false,
  });

  useEffect(() => {
    if (!userId) return;

    const unsubscribeFunctions: (() => void)[] = [];

    // Streak Updated Event
    const handleStreakUpdated = (event: StreakUpdatedEvent) => {
      if (event.userId !== userId) return;

      if (enableDebug) {
        console.log('[Streak Event] Streak Updated:', event);
      }

      setState(prev => ({
        ...prev,
        lastStreakUpdate: event,
        isListening: true,
      }));

      onStreakUpdated?.(event);
    };

    // Streak Continuity Event
    const handleStreakContinuity = (event: StreakContinuityEvent) => {
      if (event.userId !== userId) return;

      if (enableDebug) {
        console.log('[Streak Event] Streak Continuity:', event);
      }

      setState(prev => ({
        ...prev,
        lastContinuityCheck: event,
        isListening: true,
      }));

      onStreakContinuity?.(event);
    };

    // Streak Milestone Event
    const handleStreakMilestone = (event: StreakMilestoneEvent) => {
      if (event.userId !== userId) return;

      if (enableDebug) {
        console.log('[Streak Event] Streak Milestone:', event);
      }

      setState(prev => ({
        ...prev,
        lastMilestoneEvent: event,
        isListening: true,
      }));

      onStreakMilestone?.(event);
    };

    // Streak Broken Event
    const handleStreakBroken = (event: StreakBrokenEvent) => {
      if (event.userId !== userId) return;

      if (enableDebug) {
        console.log('[Streak Event] Streak Broken:', event);
      }

      setState(prev => ({
        ...prev,
        lastBrokenEvent: event,
        isListening: true,
      }));

      onStreakBroken?.(event);
    };

    // Streak Bonus Event
    const handleStreakBonus = (event: StreakBonusEvent) => {
      if (event.userId !== userId) return;

      if (enableDebug) {
        console.log('[Streak Event] Streak Bonus:', event);
      }

      setState(prev => ({
        ...prev,
        lastBonusEvent: event,
        isListening: true,
      }));

      onStreakBonus?.(event);
    };

    // Register event listeners
    const unsubStreakUpdated = streakEventEmitter.onStreakUpdated(handleStreakUpdated);
    const unsubStreakContinuity = streakEventEmitter.onStreakContinuity(handleStreakContinuity);
    const unsubStreakMilestone = streakEventEmitter.onStreakMilestone(handleStreakMilestone);
    const unsubStreakBroken = streakEventEmitter.onStreakBroken(handleStreakBroken);
    const unsubStreakBonus = streakEventEmitter.onStreakBonus(handleStreakBonus);

    unsubscribeFunctions.push(
      unsubStreakUpdated,
      unsubStreakContinuity,
      unsubStreakMilestone,
      unsubStreakBroken,
      unsubStreakBonus
    );

    // Set listening state
    setState(prev => ({ ...prev, isListening: true }));

    // Cleanup function
    return () => {
      unsubscribeFunctions.forEach(unsub => unsub());
      setState(prev => ({ ...prev, isListening: false }));
    };
  }, [userId, onStreakUpdated, onStreakContinuity, onStreakMilestone, onStreakBroken, onStreakBonus, enableDebug]);

  return state;
};

/**
 * Hook for streak updates only
 */
export const useStreakUpdates = (
  userId: string,
  onStreakUpdate?: (currentStreak: number, bestStreak: number, broken: boolean, bonusXp: number) => void,
  enableDebug?: boolean
) => {
  return useStreakEvents({
    userId,
    onStreakUpdated: (event) => {
      onStreakUpdate?.(event.currentStreak, event.bestStreak, event.streakBroken, event.streakBonusXp);
    },
    enableDebug,
  });
};

/**
 * Hook for streak milestone notifications only
 */
export const useStreakMilestoneNotifications = (
  userId: string,
  onMilestone?: (milestoneType: string, currentStreak: number, bonusAwarded: number) => void,
  enableDebug?: boolean
) => {
  return useStreakEvents({
    userId,
    onStreakMilestone: (event) => {
      onMilestone?.(event.milestoneType, event.currentStreak, event.bonusAwarded);
    },
    enableDebug,
  });
};

/**
 * Hook for streak broken notifications only
 */
export const useStreakBrokenNotifications = (
  userId: string,
  onBroken?: (brokenStreakLength: number, daysInactive: number) => void,
  enableDebug?: boolean
) => {
  return useStreakEvents({
    userId,
    onStreakBroken: (event) => {
      onBroken?.(event.brokenStreakLength, event.daysInactive);
    },
    enableDebug,
  });
};

/**
 * Hook for streak bonus notifications only
 */
export const useStreakBonusNotifications = (
  userId: string,
  onBonus?: (bonusXp: number, multiplier: number, currentStreak: number) => void,
  enableDebug?: boolean
) => {
  return useStreakEvents({
    userId,
    onStreakBonus: (event) => {
      onBonus?.(event.bonusXp, event.multiplier, event.currentStreak);
    },
    enableDebug,
  });
};

export default useStreakEvents;