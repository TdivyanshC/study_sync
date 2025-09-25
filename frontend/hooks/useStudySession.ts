import { useState, useEffect, useRef } from 'react';
import { create } from 'zustand';
import { apiService, StudySession as ApiStudySession } from '../services/apiService';
import { socketService } from '../services/socketService';

// Mock user ID for development
const MOCK_USER_ID = 'mock-user-123';

// Enhanced character progression system
export const getCharacterLevel = (totalHours: number) => {
  const levels = [
    { name: 'Beginner Scholar', level: 1, icon: '🎓', minXP: 0, maxXP: 999, color: '#3b82f6' },
    { name: 'Focused Knight', level: 2, icon: '⚔️', minXP: 1000, maxXP: 2499, color: '#8b5cf6' },
    { name: 'Master Sage', level: 3, icon: '🧙‍♂️', minXP: 2500, maxXP: 4999, color: '#06d6a0' },
    { name: 'Legendary Mentor', level: 4, icon: '👑', minXP: 5000, maxXP: 9999, color: '#f59e0b' },
    { name: 'Cosmic Scholar', level: 5, icon: '🌟', minXP: 10000, maxXP: 19999, color: '#ef4444' },
  ];

  // Calculate XP from hours (1 hour = 100 XP)
  const xp = Math.floor(totalHours * 100);
  
  for (let i = levels.length - 1; i >= 0; i--) {
    if (xp >= levels[i].minXP) {
      return { ...levels[i], currentXP: xp };
    }
  }
  
  return { ...levels[0], currentXP: xp };
};

export interface StudySession {
  id: string;
  startTime: Date;
  endTime?: Date;
  duration: number; // in seconds
  isActive: boolean;
  isBreak: boolean;
  subject?: string;
  userId: string;
}

export interface StudyStats {
  todayHours: number;
  weeklyHours: number;
  currentStreak: number;
  longestStreak: number;
  efficiency: number;
  level: number;
  xp: number;
}

interface NotificationState {
  message: string;
  type: 'info' | 'success' | 'warning';
  visible: boolean;
}

// Zustand store for study session management
interface StudyStore {
  currentSession: StudySession | null;
  sessions: StudySession[];
  stats: StudyStats;
  isTimerRunning: boolean;
  isConnectedToSocket: boolean;
  notification: NotificationState;
  userId: string;
  
  // Actions
  initializeSocket: () => Promise<void>;
  startSession: (subject?: string) => Promise<void>;
  stopSession: () => Promise<void>;
  takeBreak: () => Promise<void>;
  resumeFromBreak: () => Promise<void>;
  updateTimer: (seconds: number) => Promise<void>;
  loadUserSessions: () => Promise<void>;
  showNotification: (message: string, type: NotificationState['type']) => void;
  hideNotification: () => void;
  setSocketConnection: (connected: boolean) => void;
}

export const useStudyStore = create<StudyStore>((set, get) => ({
  currentSession: null,
  sessions: [],
  stats: {
    todayHours: 3.5,
    weeklyHours: 24.5,
    currentStreak: 7,
    longestStreak: 12,
    efficiency: 87,
    level: 2,
    xp: 850,
  },
  isTimerRunning: false,
  isConnectedToSocket: false,
  notification: { message: '', type: 'info', visible: false },
  userId: MOCK_USER_ID,

  // Initialize Socket.IO connection
  initializeSocket: async () => {
    try {
      const connected = await socketService.connect(get().userId);
      set({ isConnectedToSocket: connected });
      
      if (connected) {
        // Set up Socket.IO event listeners for real-time notifications
        socketService.onSessionEvents({
          onUserStarted: (data) => {
            if (data.user_id !== get().userId) {
              get().showNotification(
                `${data.user_id} started studying ${data.subject || 'something'}!`,
                'info'
              );
            }
          },
          onUserStopped: (data) => {
            if (data.user_id !== get().userId) {
              const minutes = Math.floor(data.duration / 60);
              get().showNotification(
                `${data.user_id} finished studying! (${minutes} minutes)`,
                'success'
              );
            }
          },
        });
        
        get().showNotification('Connected to real-time updates!', 'success');
      } else {
        get().showNotification('Running in offline mode', 'warning');
      }
    } catch (error) {
      console.error('Socket initialization failed:', error);
      set({ isConnectedToSocket: false });
    }
  },

  startSession: async (subject) => {
    try {
      const { userId } = get();
      
      // Create session in backend
      const apiSession = await apiService.createSession({
        user_id: userId,
        subject,
      });
      
      // Convert to local format
      const newSession: StudySession = {
        id: apiSession.id,
        startTime: new Date(apiSession.start_time),
        duration: 0,
        isActive: true,
        isBreak: false,
        subject,
        userId,
      };
      
      set({ 
        currentSession: newSession,
        isTimerRunning: true 
      });

      // Emit Socket.IO event for real-time notifications
      if (get().isConnectedToSocket) {
        socketService.emitSessionStarted(userId, subject);
      }

      get().showNotification('Study session started!', 'success');
      console.log('✅ Session started:', newSession);
      
    } catch (error) {
      console.error('Failed to start session:', error);
      get().showNotification('Failed to start session', 'warning');
    }
  },

  stopSession: async () => {
    const { currentSession, sessions, userId } = get();
    if (!currentSession) return;

    try {
      // End session in backend
      const endedSession = await apiService.endSession(
        currentSession.id,
        currentSession.duration
      );

      // Update local state
      const finishedSession: StudySession = {
        ...currentSession,
        endTime: new Date(),
        isActive: false,
      };

      set({ 
        currentSession: null,
        sessions: [...sessions, finishedSession],
        isTimerRunning: false 
      });

      // Emit Socket.IO event
      if (get().isConnectedToSocket) {
        socketService.emitSessionStopped(userId, currentSession.duration);
      }

      const minutes = Math.floor(currentSession.duration / 60);
      get().showNotification(`Session completed! ${minutes} minutes studied`, 'success');
      console.log('✅ Session stopped:', finishedSession);
      
    } catch (error) {
      console.error('Failed to stop session:', error);
      get().showNotification('Failed to end session', 'warning');
      // Still update local state even if API fails
      set({ 
        currentSession: null,
        isTimerRunning: false 
      });
    }
  },

  takeBreak: async () => {
    const { currentSession } = get();
    if (!currentSession) return;

    try {
      // Update session to break mode in backend
      await apiService.setSessionBreak(currentSession.id, true);
      
      set(state => ({
        currentSession: state.currentSession ? {
          ...state.currentSession,
          isBreak: true
        } : null,
        isTimerRunning: false
      }));

      get().showNotification('Break time! 💤', 'info');
      
    } catch (error) {
      console.error('Failed to set break:', error);
    }
  },

  resumeFromBreak: async () => {
    const { currentSession } = get();
    if (!currentSession) return;

    try {
      // Resume session from break in backend
      await apiService.setSessionBreak(currentSession.id, false);
      
      set(state => ({
        currentSession: state.currentSession ? {
          ...state.currentSession,
          isBreak: false
        } : null,
        isTimerRunning: true
      }));

      get().showNotification('Welcome back! 📚', 'success');
      
    } catch (error) {
      console.error('Failed to resume from break:', error);
    }
  },

  updateTimer: async (seconds) => {
    const { currentSession } = get();
    if (!currentSession) return;

    // Update local state immediately
    set(state => ({
      currentSession: state.currentSession ? {
        ...state.currentSession,
        duration: seconds
      } : null
    }));

    // Update backend every 30 seconds to avoid too many API calls
    if (seconds % 30 === 0) {
      try {
        await apiService.updateSessionDuration(currentSession.id, seconds);
      } catch (error) {
        console.error('Failed to sync session duration:', error);
      }
    }
  },

  // Load user's session history
  loadUserSessions: async () => {
    try {
      const apiSessions = await apiService.getUserSessions(get().userId);
      
      const sessions: StudySession[] = apiSessions.map(session => ({
        id: session.id,
        startTime: new Date(session.start_time),
        endTime: session.end_time ? new Date(session.end_time) : undefined,
        duration: session.duration,
        isActive: session.is_active,
        isBreak: session.is_break,
        subject: session.subject,
        userId: session.user_id,
      }));
      
      set({ sessions });
      console.log('✅ Loaded user sessions:', sessions);
      
    } catch (error) {
      console.error('Failed to load sessions:', error);
    }
  },

  // Notification management
  showNotification: (message, type) => {
    set({ 
      notification: { message, type, visible: true }
    });
    
    // Auto-hide after 3 seconds
    setTimeout(() => {
      get().hideNotification();
    }, 3000);
  },

  hideNotification: () => {
    set(state => ({ 
      notification: { ...state.notification, visible: false }
    }));
  },

  setSocketConnection: (connected) => {
    set({ isConnectedToSocket: connected });
  },
}));

// Custom hook for timer functionality
export const useTimer = () => {
  const { currentSession, isTimerRunning, updateTimer } = useStudyStore();
  const [time, setTime] = useState(0);
  const intervalRef = useRef<number>();

  useEffect(() => {
    if (isTimerRunning && currentSession && !currentSession.isBreak) {
      intervalRef.current = setInterval(() => {
        setTime(prev => {
          const newTime = prev + 1;
          updateTimer(newTime);
          return newTime;
        });
      }, 1000);
    } else {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    }

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [isTimerRunning, currentSession, updateTimer]);

  useEffect(() => {
    if (currentSession) {
      setTime(currentSession.duration);
    } else {
      setTime(0);
    }
  }, [currentSession]);

  const formatTime = (seconds: number) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const remainingSeconds = seconds % 60;
    
    if (hours > 0) {
      return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${remainingSeconds.toString().padStart(2, '0')}`;
    }
    return `${minutes.toString().padStart(2, '0')}:${remainingSeconds.toString().padStart(2, '0')}`;
  };

  return {
    time,
    formattedTime: formatTime(time),
    isRunning: isTimerRunning,
  };
};

// Hook for initializing the app
export const useAppInitialization = () => {
  const { initializeSocket, loadUserSessions } = useStudyStore();
  
  useEffect(() => {
    const initializeApp = async () => {
      console.log('🚀 Initializing Study Together app...');
      
      // Initialize Socket.IO connection
      await initializeSocket();
      
      // Load user's session history
      await loadUserSessions();
      
      console.log('✅ App initialization complete');
    };
    
    initializeApp();
  }, [initializeSocket, loadUserSessions]);
};