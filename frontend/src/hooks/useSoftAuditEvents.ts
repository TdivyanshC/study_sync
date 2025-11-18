/**
 * Soft Audit Event Hooks
 * React hooks for listening to soft audit system events (Module Soft)
 */

import { useEffect, useState } from 'react';
import { 
  softAuditEventEmitter, 
  AuditForgivenessEvent, 
  SoftAuditFlagEvent, 
  AuditValidationEvent, 
  AuditPatternEvent 
} from '../events/softAuditEvents';

export interface UseSoftAuditEventsOptions {
  userId: string;
  onAuditForgiveness?: (event: AuditForgivenessEvent) => void;
  onSoftAuditFlag?: (event: SoftAuditFlagEvent) => void;
  onAuditValidation?: (event: AuditValidationEvent) => void;
  onAuditPattern?: (event: AuditPatternEvent) => void;
  enableDebug?: boolean;
}

export interface SoftAuditEventState {
  lastForgivenessEvent?: AuditForgivenessEvent;
  lastFlagEvent?: SoftAuditFlagEvent;
  lastValidationEvent?: AuditValidationEvent;
  lastPatternEvent?: AuditPatternEvent;
  isListening: boolean;
}

/**
 * Hook to listen to all soft audit system events
 */
export const useSoftAuditEvents = (options: UseSoftAuditEventsOptions) => {
  const { 
    userId, 
    onAuditForgiveness, 
    onSoftAuditFlag, 
    onAuditValidation, 
    onAuditPattern,
    enableDebug = false 
  } = options;
  
  const [state, setState] = useState<SoftAuditEventState>({
    isListening: false,
  });

  useEffect(() => {
    if (!userId) return;

    const unsubscribeFunctions: (() => void)[] = [];

    // Audit Forgiveness Event
    const handleAuditForgiveness = (event: AuditForgivenessEvent) => {
      if (event.userId !== userId) return;

      if (enableDebug) {
        console.log('[Soft Audit Event] Forgiveness:', event);
      }

      setState(prev => ({
        ...prev,
        lastForgivenessEvent: event,
        isListening: true,
      }));

      onAuditForgiveness?.(event);
    };

    // Soft Audit Flag Event
    const handleSoftAuditFlag = (event: SoftAuditFlagEvent) => {
      if (event.userId !== userId) return;

      if (enableDebug) {
        console.log('[Soft Audit Event] Flag:', event);
      }

      setState(prev => ({
        ...prev,
        lastFlagEvent: event,
        isListening: true,
      }));

      onSoftAuditFlag?.(event);
    };

    // Audit Validation Event
    const handleAuditValidation = (event: AuditValidationEvent) => {
      if (event.userId !== userId) return;

      if (enableDebug) {
        console.log('[Soft Audit Event] Validation:', event);
      }

      setState(prev => ({
        ...prev,
        lastValidationEvent: event,
        isListening: true,
      }));

      onAuditValidation?.(event);
    };

    // Audit Pattern Event
    const handleAuditPattern = (event: AuditPatternEvent) => {
      if (event.userId !== userId) return;

      if (enableDebug) {
        console.log('[Soft Audit Event] Pattern:', event);
      }

      setState(prev => ({
        ...prev,
        lastPatternEvent: event,
        isListening: true,
      }));

      onAuditPattern?.(event);
    };

    // Register event listeners
    const unsubForgiveness = softAuditEventEmitter.onAuditForgiveness(handleAuditForgiveness);
    const unsubFlag = softAuditEventEmitter.onSoftAuditFlag(handleSoftAuditFlag);
    const unsubValidation = softAuditEventEmitter.onAuditValidation(handleAuditValidation);
    const unsubPattern = softAuditEventEmitter.onAuditPattern(handleAuditPattern);

    unsubscribeFunctions.push(
      unsubForgiveness,
      unsubFlag,
      unsubValidation,
      unsubPattern
    );

    // Set listening state
    setState(prev => ({ ...prev, isListening: true }));

    // Cleanup function
    return () => {
      unsubscribeFunctions.forEach(unsub => unsub());
      setState(prev => ({ ...prev, isListening: false }));
    };
  }, [userId, onAuditForgiveness, onSoftAuditFlag, onAuditValidation, onAuditPattern, enableDebug]);

  return state;
};

/**
 * Hook for audit forgiveness notifications only
 */
export const useAuditForgivenessNotifications = (
  userId: string,
  onForgiveness?: (forgivenessRate: number, streakContribution: number, xpContribution: number) => void,
  enableDebug?: boolean
) => {
  return useSoftAuditEvents({
    userId,
    onAuditForgiveness: (event) => {
      onForgiveness?.(event.forgivenessRate, event.streakContribution, event.xpContribution);
    },
    enableDebug,
  });
};

/**
 * Hook for soft audit flag notifications only
 */
export const useSoftAuditFlagNotifications = (
  userId: string,
  onFlag?: (suspicionScore: number, adjustedScore: number, isValid: boolean, recommendations: string[]) => void,
  enableDebug?: boolean
) => {
  return useSoftAuditEvents({
    userId,
    onSoftAuditFlag: (event) => {
      onFlag?.(event.suspicionScore, event.adjustedScore, event.isValid, event.recommendations);
    },
    enableDebug,
  });
};

/**
 * Hook for audit validation notifications only
 */
export const useAuditValidationNotifications = (
  userId: string,
  onValidation?: (isValid: boolean, baseScore: number, adjustedScore: number, forgiveness: number) => void,
  enableDebug?: boolean
) => {
  return useSoftAuditEvents({
    userId,
    onAuditValidation: (event) => {
      onValidation?.(event.isValid, event.baseScore, event.adjustedScore, event.forgivenessApplied);
    },
    enableDebug,
  });
};

/**
 * Hook for audit pattern notifications only
 */
export const useAuditPatternNotifications = (
  userId: string,
  onPattern?: (patterns: any, severityLevel: string) => void,
  enableDebug?: boolean
) => {
  return useSoftAuditEvents({
    userId,
    onAuditPattern: (event) => {
      onPattern?.(event.patterns, event.severityLevel);
    },
    enableDebug,
  });
};

export default useSoftAuditEvents;