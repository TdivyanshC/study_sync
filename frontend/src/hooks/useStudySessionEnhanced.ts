import { useState, useEffect, useRef, useCallback } from 'react';
import { gamificationApi, SessionEvent } from '../api/gamificationApi';
import { offlineQueue } from '../utils/offlineQueue';
import { create } from 'zustand';

export interface StudySessionState {
  id: string | null;
  userId: string;
  startTime: number;
  duration: number;
  isActive: boolean;
  isOnBreak: boolean;
  events: SessionEvent[];
  spaceId?: string;
}

export interface EnhancedStudyStore {
  currentSession: StudySessionState | null;
  isTimerRunning: boolean;
  todayMetrics: {
    totalMinutes: number;
    xpEarned: number;
    sessionsCompleted: number;
  };
  offlineQueue: {
    pendingEvents: number;
    isProcessing: boolean;
  };

  // Actions
  startSession: (userId: string, spaceId?: string) => void;
  recordHeartbeat: () => void;
  endSession: () => Promise<void>;
  takeBreak: () => void;
  resumeFromBreak: () => void;
  syncOfflineEvents: () => Promise<void>;
  updateTodayMetrics: () => Promise<void>;
  clearSession: () => void;
}

const useEnhancedStudyStore = create<EnhancedStudyStore>((set, get) => ({
  currentSession: null,
  isTimerRunning: false,
  todayMetrics: {
    totalMinutes: 0,
    xpEarned: 0,
    sessionsCompleted: 0,
  },
  offlineQueue: {
    pendingEvents: 0,
    isProcessing: false,
  },

  startSession: (userId: string, spaceId?: string) => {
    const sessionId = `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    const newSession: StudySessionState = {
      id: sessionId,
      userId,
      startTime: Date.now(),
      duration: 0,
      isActive: true,
      isOnBreak: false,
      events: [],
      spaceId,
    };

    set({ 
      currentSession: newSession, 
      isTimerRunning: true 
    });

    // Record session start event
    get().recordHeartbeat(); // This will record the start event
  },

  recordHeartbeat: () => {
    const state = get();
    if (!state.currentSession) return;

    const now = Date.now();
    const event: SessionEvent = {
      session_id: state.currentSession.id!,
      event_type: state.currentSession.isOnBreak ? 'pause' : 'heartbeat',
      event_payload: {
        timestamp: now,
        duration: state.currentSession.duration,
        is_on_break: state.currentSession.isOnBreak,
      },
      created_at: new Date(now).toISOString(),
    };

    // Update session with new event
    const updatedSession = {
      ...state.currentSession,
      events: [...state.currentSession.events, event],
    };

    set({ currentSession: updatedSession });

    // If offline, queue the event
    if (offlineQueue.shouldQueueRequest()) {
      offlineQueue.queueRequest(
        '/xp/sync/offline',
        'POST',
        {
          user_id: state.currentSession.userId,
          events: [event],
        }
      );
    } else {
      // Send immediately when online
      gamificationApi.syncOfflineEvents(state.currentSession.userId, [event])
        .catch(error => {
          console.error('Failed to send heartbeat:', error);
          // Queue for retry
          offlineQueue.queueRequest(
            '/xp/sync/offline',
            'POST',
            {
              user_id: state.currentSession.userId,
              events: [event],
            }
          );
        });
    }
  },

  endSession: async () => {
    const state = get();
    if (!state.currentSession) return;

    const session = state.currentSession;
    const now = Date.now();
    const durationMinutes = Math.round((now - session.startTime) / (1000 * 60));

    // Add end event
    const endEvent: SessionEvent = {
      session_id: session.id!,
      event_type: 'end',
      event_payload: {
        timestamp: now,
        total_duration_minutes: durationMinutes,
        final_break_time: session.isOnBreak,
      },
      created_at: new Date(now).toISOString(),
    };

    const finalSession = {
      ...session,
      events: [...session.events, endEvent],
    };

    set({ currentSession: finalSession });

    try {
      // Create session in backend
      if (!offlineQueue.shouldQueueRequest()) {
        // Try to create session and calculate XP immediately
        const sessionData = {
          user_id: session.userId,
          duration_minutes: durationMinutes,
          space_id: session.spaceId,
        };

        // Create session (you would use your existing session creation logic)
        // await apiService.createSession(sessionData);

        // Calculate XP for the session
        if (session.id) {
          const xpResult = await gamificationApi.calculateSessionXP(session.id);
          if (xpResult.success) {
            console.log(`🎉 Earned ${xpResult.data.calculation_details.total_xp} XP!`);
          }
        }
      } else {
        // Queue session creation and XP calculation
        await offlineQueue.queueRequest(
          '/study-sessions',
          'POST',
          {
            user_id: session.userId,
            duration_minutes: durationMinutes,
            space_id: session.spaceId,
          }
        );

        if (session.id) {
          await offlineQueue.queueRequest(
            '/xp/calculate-session',
            'POST',
            { session_id: session.id }
          );
        }
      }

      // Clear session
      get().clearSession();
      
      // Update today's metrics
      await get().updateTodayMetrics();

      console.log(`✅ Session ended: ${durationMinutes} minutes`);
    } catch (error) {
      console.error('Failed to end session:', error);
      // Still clear the session locally
      get().clearSession();
    }
  },

  takeBreak: () => {
    const state = get();
    if (!state.currentSession || state.currentSession.isOnBreak) return;

    const updatedSession = {
      ...state.currentSession,
      isOnBreak: true,
    };

    set({ 
      currentSession: updatedSession, 
      isTimerRunning: false 
    });

    // Record break event
    get().recordHeartbeat();
  },

  resumeFromBreak: () => {
    const state = get();
    if (!state.currentSession || !state.currentSession.isOnBreak) return;

    const updatedSession = {
      ...state.currentSession,
      isOnBreak: false,
    };

    set({ 
      currentSession: updatedSession, 
      isTimerRunning: true 
    });

    // Record resume event
    get().recordHeartbeat();
  },

  syncOfflineEvents: async () => {
    const state = get();
    if (!state.currentSession) return;

    try {
      await offlineQueue.forceProcessQueue();
      
      // Update local queue stats
      const queueStats = await offlineQueue.getQueueStats();
      set({
        offlineQueue: {
          pendingEvents: queueStats.pendingRequests,
          isProcessing: queueStats.totalRequests > queueStats.failedRequests,
        },
      });
    } catch (error) {
      console.error('Failed to sync offline events:', error);
    }
  },

  updateTodayMetrics: async () => {
    try {
      // This would typically fetch from your backend
      // For now, we'll just increment local counters
      set(state => ({
        todayMetrics: {
          ...state.todayMetrics,
          sessionsCompleted: state.todayMetrics.sessionsCompleted + 1,
        },
      }));
    } catch (error) {
      console.error('Failed to update today metrics:', error);
    }
  },

  clearSession: () => {
    set({ 
      currentSession: null, 
      isTimerRunning: false 
    });
  },
}));

/**
 * Enhanced hook for study session management with XP integration
 */
export const useStudySessionEnhanced = () => {
  const store = useEnhancedStudyStore();
  const heartbeatInterval = useRef<NodeJS.Timeout | null>(null);
  const [formattedTime, setFormattedTime] = useState('00:00');

  // Update formatted time every second when session is active
  useEffect(() => {
    let interval: NodeJS.Timeout;

    if (store.isTimerRunning && store.currentSession) {
      interval = setInterval(() => {
        const now = Date.now();
        const duration = now - store.currentSession!.startTime;
        const minutes = Math.floor(duration / 60000);
        const seconds = Math.floor((duration % 60000) / 1000);
        setFormattedTime(
          `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`
        );
      }, 1000);
    } else {
      setFormattedTime('00:00');
    }

    return () => {
      if (interval) clearInterval(interval);
    };
  }, [store.isTimerRunning, store.currentSession]);

  // Record heartbeat every 10 seconds during active session
  useEffect(() => {
    if (store.isTimerRunning && store.currentSession && !store.currentSession.isOnBreak) {
      heartbeatInterval.current = setInterval(() => {
        store.recordHeartbeat();
      }, 10000); // 10 seconds

      return () => {
        if (heartbeatInterval.current) {
          clearInterval(heartbeatInterval.current);
        }
      };
    }
  }, [store.isTimerRunning, store.currentSession]);

  // Auto-sync offline events when back online
  useEffect(() => {
    const unsubscribe = offlineQueue.subscribe((stats) => {
      useEnhancedStudyStore.setState({
        offlineQueue: {
          pendingEvents: stats.pendingRequests,
          isProcessing: stats.totalRequests > stats.failedRequests,
        },
      });
    });

    return unsubscribe;
  }, []);

  const startSession = useCallback((userId: string, spaceId?: string) => {
    store.startSession(userId, spaceId);
  }, [store]);

  const recordHeartbeat = useCallback(() => {
    store.recordHeartbeat();
  }, [store]);

  const endSession = useCallback(async () => {
    await store.endSession();
  }, [store]);

  const takeBreak = useCallback(() => {
    store.takeBreak();
  }, [store]);

  const resumeFromBreak = useCallback(() => {
    store.resumeFromBreak();
  }, [store]);

  const syncOfflineEvents = useCallback(async () => {
    await store.syncOfflineEvents();
  }, [store]);

  return {
    // State
    currentSession: store.currentSession,
    isTimerRunning: store.isTimerRunning,
    formattedTime,
    todayMetrics: store.todayMetrics,
    offlineQueue: store.offlineQueue,

    // Actions
    startSession,
    recordHeartbeat,
    endSession,
    takeBreak,
    resumeFromBreak,
    syncOfflineEvents,
  };
};

/**
 * Hook for session validation and audit
 */
export const useSessionAudit = (sessionId?: string) => {
  const [auditStatus, setAuditStatus] = useState<{
    isValid: boolean;
    suspicionScore: number;
    lastValidated: string | null;
  } | null>(null);

  const validateSession = useCallback(async (userId: string, validationMode: 'soft' | 'strict' = 'soft') => {
    if (!sessionId) return;

    try {
      const result = await gamificationApi.validateSessionAudit(sessionId, userId, validationMode);
      
      setAuditStatus({
        isValid: result.data.is_valid,
        suspicionScore: result.data.suspicion_score,
        lastValidated: new Date().toISOString(),
      });

      return result;
    } catch (error) {
      console.error('Failed to validate session:', error);
      return null;
    }
  }, [sessionId]);

  return {
    auditStatus,
    validateSession,
  };
};