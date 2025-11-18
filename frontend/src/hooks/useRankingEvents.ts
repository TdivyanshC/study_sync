/**
 * Ranking Event Hooks
 * React hooks for listening to ranking system events (Module D3)
 */

import { useEffect, useState } from 'react';
import { 
  rankingEventEmitter, 
  RankingUpdatedEvent, 
  TierPromotionEvent, 
  TierDemotionEvent, 
  RankingMilestoneEvent 
} from '../events/rankingEvents';

export interface UseRankingEventsOptions {
  userId: string;
  onRankingUpdated?: (event: RankingUpdatedEvent) => void;
  onTierPromotion?: (event: TierPromotionEvent) => void;
  onTierDemotion?: (event: TierDemotionEvent) => void;
  onRankingMilestone?: (event: RankingMilestoneEvent) => void;
  enableDebug?: boolean;
}

export interface RankingEventState {
  lastRankingUpdate?: RankingUpdatedEvent;
  lastPromotionEvent?: TierPromotionEvent;
  lastDemotionEvent?: TierDemotionEvent;
  lastMilestoneEvent?: RankingMilestoneEvent;
  isListening: boolean;
}

/**
 * Hook to listen to all ranking system events
 */
export const useRankingEvents = (options: UseRankingEventsOptions) => {
  const { 
    userId, 
    onRankingUpdated, 
    onTierPromotion, 
    onTierDemotion, 
    onRankingMilestone,
    enableDebug = false 
  } = options;
  
  const [state, setState] = useState<RankingEventState>({
    isListening: false,
  });

  useEffect(() => {
    if (!userId) return;

    const unsubscribeFunctions: (() => void)[] = [];

    // Ranking Updated Event
    const handleRankingUpdated = (event: RankingUpdatedEvent) => {
      if (event.userId !== userId) return;

      if (enableDebug) {
        console.log('[Ranking Event] Ranking Updated:', event);
      }

      setState(prev => ({
        ...prev,
        lastRankingUpdate: event,
        isListening: true,
      }));

      onRankingUpdated?.(event);
    };

    // Tier Promotion Event
    const handleTierPromotion = (event: TierPromotionEvent) => {
      if (event.userId !== userId) return;

      if (enableDebug) {
        console.log('[Ranking Event] Tier Promotion:', event);
      }

      setState(prev => ({
        ...prev,
        lastPromotionEvent: event,
        isListening: true,
      }));

      onTierPromotion?.(event);
    };

    // Tier Demotion Event
    const handleTierDemotion = (event: TierDemotionEvent) => {
      if (event.userId !== userId) return;

      if (enableDebug) {
        console.log('[Ranking Event] Tier Demotion:', event);
      }

      setState(prev => ({
        ...prev,
        lastDemotionEvent: event,
        isListening: true,
      }));

      onTierDemotion?.(event);
    };

    // Ranking Milestone Event
    const handleRankingMilestone = (event: RankingMilestoneEvent) => {
      if (event.userId !== userId) return;

      if (enableDebug) {
        console.log('[Ranking Event] Ranking Milestone:', event);
      }

      setState(prev => ({
        ...prev,
        lastMilestoneEvent: event,
        isListening: true,
      }));

      onRankingMilestone?.(event);
    };

    // Register event listeners
    const unsubRankingUpdated = rankingEventEmitter.onRankingUpdated(handleRankingUpdated);
    const unsubTierPromotion = rankingEventEmitter.onTierPromotion(handleTierPromotion);
    const unsubTierDemotion = rankingEventEmitter.onTierDemotion(handleTierDemotion);
    const unsubRankingMilestone = rankingEventEmitter.onRankingMilestone(handleRankingMilestone);

    unsubscribeFunctions.push(
      unsubRankingUpdated,
      unsubTierPromotion,
      unsubTierDemotion,
      unsubRankingMilestone
    );

    // Set listening state
    setState(prev => ({ ...prev, isListening: true }));

    // Cleanup function
    return () => {
      unsubscribeFunctions.forEach(unsub => unsub());
      setState(prev => ({ ...prev, isListening: false }));
    };
  }, [userId, onRankingUpdated, onTierPromotion, onTierDemotion, onRankingMilestone, enableDebug]);

  return state;
};

/**
 * Hook for ranking updates only
 */
export const useRankingUpdates = (
  userId: string,
  onRankingUpdate?: (tier: string, score: number, progressPercent: number, promoted: boolean) => void,
  enableDebug?: boolean
) => {
  return useRankingEvents({
    userId,
    onRankingUpdated: (event) => {
      onRankingUpdate?.(event.tier, event.score, event.progressPercent, event.promoted);
    },
    enableDebug,
  });
};

/**
 * Hook for tier promotion notifications only
 */
export const useTierPromotionNotifications = (
  userId: string,
  onPromotion?: (oldTier: string, newTier: string, requirements: any) => void,
  enableDebug?: boolean
) => {
  return useRankingEvents({
    userId,
    onTierPromotion: (event) => {
      onPromotion?.(event.oldTier, event.newTier, event.requirements);
    },
    enableDebug,
  });
};

/**
 * Hook for ranking milestone notifications only
 */
export const useRankingMilestoneNotifications = (
  userId: string,
  onMilestone?: (milestoneType: string, tier: string, score: number) => void,
  enableDebug?: boolean
) => {
  return useRankingEvents({
    userId,
    onRankingMilestone: (event) => {
      onMilestone?.(event.milestoneType, event.tier, event.score);
    },
    enableDebug,
  });
};

export default useRankingEvents;