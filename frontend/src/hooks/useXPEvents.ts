/**
 * XP Event Hook
 * React hook for listening to XP system events
 */

import { useEffect, useState } from 'react';
import { xpEventEmitter, XPUpdatedEvent, XPLevelUpEvent, XPMilestoneEvent } from '../events/xpEvents';

export interface UseXPEventsOptions {
  userId: string;
  onXPUpdated?: (event: XPUpdatedEvent) => void;
  onLevelUp?: (event: XPLevelUpEvent) => void;
  onMilestone?: (event: XPMilestoneEvent) => void;
  enableDebug?: boolean;
}

export interface XPEventState {
  lastXPEvent?: XPUpdatedEvent;
  lastLevelUpEvent?: XPLevelUpEvent;
  lastMilestoneEvent?: XPMilestoneEvent;
  isListening: boolean;
}

/**
 * Hook to listen to XP system events
 */
export const useXPEvents = (options: UseXPEventsOptions) => {
  const { userId, onXPUpdated, onLevelUp, onMilestone, enableDebug = false } = options;
  
  const [state, setState] = useState<XPEventState>({
    isListening: false,
  });

  useEffect(() => {
    if (!userId) return;

    const unsubscribeFunctions: (() => void)[] = [];

    // XP Updated Event
    const handleXPUpdated = (event: XPUpdatedEvent) => {
      // Filter events for this user only
      if (event.userId !== userId) return;

      if (enableDebug) {
        console.log('[XP Event] XP Updated:', event);
      }

      setState(prev => ({
        ...prev,
        lastXPEvent: event,
        isListening: true,
      }));

      onXPUpdated?.(event);
    };

    // Level Up Event
    const handleLevelUp = (event: XPLevelUpEvent) => {
      if (event.userId !== userId) return;

      if (enableDebug) {
        console.log('[XP Event] Level Up:', event);
      }

      setState(prev => ({
        ...prev,
        lastLevelUpEvent: event,
        isListening: true,
      }));

      onLevelUp?.(event);
    };

    // Milestone Event
    const handleMilestone = (event: XPMilestoneEvent) => {
      if (event.userId !== userId) return;

      if (enableDebug) {
        console.log('[XP Event] Milestone:', event);
      }

      setState(prev => ({
        ...prev,
        lastMilestoneEvent: event,
        isListening: true,
      }));

      onMilestone?.(event);
    };

    // Register event listeners
    const unsubXPUpdated = xpEventEmitter.onXPUpdated(handleXPUpdated);
    const unsubLevelUp = xpEventEmitter.onLevelUp(handleLevelUp);
    const unsubMilestone = xpEventEmitter.onMilestone(handleMilestone);

    unsubscribeFunctions.push(unsubXPUpdated, unsubLevelUp, unsubMilestone);

    // Set listening state
    setState(prev => ({ ...prev, isListening: true }));

    // Cleanup function
    return () => {
      unsubscribeFunctions.forEach(unsub => unsub());
      setState(prev => ({ ...prev, isListening: false }));
    };
  }, [userId, onXPUpdated, onLevelUp, onMilestone, enableDebug]);

  return state;
};

/**
 * Hook for simplified XP updates only
 */
export const useXPUpdates = (
  userId: string,
  onXPUpdate?: (amount: number, totalXP: number, level: number, source: string) => void,
  enableDebug?: boolean
) => {
  return useXPEvents({
    userId,
    onXPUpdated: (event) => {
      onXPUpdate?.(event.amountAwarded, event.totalXP, event.level, event.source);
    },
    enableDebug,
  });
};

/**
 * Hook for level up notifications only
 */
export const useLevelUpNotifications = (
  userId: string,
  onLevelUp?: (oldLevel: number, newLevel: number, totalXP: number) => void,
  enableDebug?: boolean
) => {
  return useXPEvents({
    userId,
    onLevelUp: (event) => {
      onLevelUp?.(event.oldLevel, event.newLevel, event.totalXP);
    },
    enableDebug,
  });
};

/**
 * Hook for milestone notifications only
 */
export const useMilestoneNotifications = (
  userId: string,
  onMilestone?: (milestoneType: string, totalXP: number, bonusAwarded: number) => void,
  enableDebug?: boolean
) => {
  return useXPEvents({
    userId,
    onMilestone: (event) => {
      onMilestone?.(event.milestoneType, event.totalXP, event.bonusAwarded);
    },
    enableDebug,
  });
};

export default useXPEvents;