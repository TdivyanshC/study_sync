import { useState, useEffect, useRef } from 'react';
import { create } from 'zustand';
import { apiService, DashboardData, StudySession as ApiStudySession } from '../services/apiService';

// Use real user ID from populated data
const USER_ID = 'user1';

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
  user_id: string;
  space_id?: string;
  duration_minutes: number;
  efficiency?: number;
  created_at: string;
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
  sessions: StudySession[];
  stats: StudyStats;
  dashboardData: DashboardData | null;
  isConnectedToSocket: boolean;
  notification: NotificationState;
  userId: string;
  currentSession: any; // Current study session state
  isTimerRunning: boolean;

  // Actions
  initializeSocket: () => Promise<void>;
  loadDashboardData: () => Promise<void>;
  logSession: (subject: string, durationMinutes: number, efficiency?: number) => Promise<void>;
  showNotification: (message: string, type: NotificationState['type']) => void;
  hideNotification: () => void;
  setSocketConnection: (connected: boolean) => void;
  startSession: () => void;
  stopSession: () => void;
  takeBreak: () => void;
  resumeFromBreak: () => void;
}

export const useStudyStore = create<StudyStore>((set, get) => ({
  sessions: [],
  stats: {
    todayHours: 0,
    weeklyHours: 0,
    currentStreak: 0,
    longestStreak: 0,
    efficiency: 0,
    level: 1,
    xp: 0,
  },
  dashboardData: null,
  isConnectedToSocket: false,
  notification: { message: '', type: 'info', visible: false },
  userId: USER_ID,
  currentSession: null,
  isTimerRunning: false,

  // Initialize Socket.IO connection (removed - using Supabase realtime instead)
  initializeSocket: async () => {
    // Socket.IO removed - using Supabase realtime client instead
    set({ isConnectedToSocket: true }); // Assume connected for now
    get().showNotification('Using Supabase realtime updates!', 'success');
  },

  // Load dashboard data from backend
  loadDashboardData: async () => {
    try {
      const dashboardData = await apiService.getUserDashboard(get().userId);

      // Convert sessions to local format
      const sessions: StudySession[] = dashboardData.recent_sessions.map(session => ({
        id: session.id,
        user_id: session.user_id,
        space_id: session.space_id,
        duration_minutes: session.duration_minutes,
        efficiency: session.efficiency,
        created_at: session.created_at,
      }));

      // Calculate stats from profile and streak data - with safety checks
      const profile = dashboardData.profile;
      const streak = dashboardData.streak;

      // Calculate total hours from sessions
      const totalHours = sessions.reduce((sum, session) => sum + session.duration_minutes / 60, 0);

      const stats: StudyStats = {
        todayHours: Math.floor(totalHours * 0.1), // Rough estimate for today
        weeklyHours: totalHours,
        currentStreak: streak?.current_streak || 0,
        longestStreak: streak?.best_streak || 0,
        efficiency: Math.round(streak?.average_efficiency || 0),
        level: profile?.level || 1,
        xp: profile?.xp || 0,
      };

      set({
        dashboardData,
        sessions,
        stats
      });

      console.log('✅ Loaded dashboard data:', dashboardData);

    } catch (error) {
      console.error('Failed to load dashboard data:', error);
      get().showNotification('Failed to load dashboard data', 'warning');
    }
  },

  // Log a completed study session
  logSession: async (subject: string, durationMinutes: number, efficiency?: number) => {
    try {
      await apiService.createSession({
        user_id: get().userId,
        duration_minutes: durationMinutes,
        efficiency,
      });

      get().showNotification('Session logged successfully!', 'success');

      // Reload dashboard data
      await get().loadDashboardData();

    } catch (error) {
      console.error('Failed to log session:', error);
      get().showNotification('Failed to log session', 'warning');
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

  // Timer/session management functions
  startSession: () => {
    set({
      currentSession: { isBreak: false, startTime: Date.now() },
      isTimerRunning: true
    });
    get().showNotification('Study session started!', 'success');
  },

  stopSession: () => {
    set({
      currentSession: null,
      isTimerRunning: false
    });
    get().showNotification('Session ended', 'info');
  },

  takeBreak: () => {
    set(state => ({
      currentSession: state.currentSession ? { ...state.currentSession, isBreak: true } : null,
      isTimerRunning: false
    }));
    get().showNotification('Break time! Take a rest.', 'info');
  },

  resumeFromBreak: () => {
    set(state => ({
      currentSession: state.currentSession ? { ...state.currentSession, isBreak: false } : null,
      isTimerRunning: true
    }));
    get().showNotification('Back to studying!', 'success');
  },
}));

// Timer hook for formatting time
export const useTimer = () => {
  const [time, setTime] = useState(0);
  const [isRunning, setIsRunning] = useState(false);

  useEffect(() => {
    let interval: ReturnType<typeof setInterval>;
    if (isRunning) {
      interval = setInterval(() => {
        setTime(prev => prev + 1);
      }, 1000);
    }

    return () => {
      if (interval) clearInterval(interval);
    };
  }, [isRunning]);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const start = () => setIsRunning(true);
  const stop = () => setIsRunning(false);
  const reset = () => {
    setIsRunning(false);
    setTime(0);
  };

  return {
    formattedTime: formatTime(time),
    time,
    isRunning,
    start,
    stop,
    reset,
  };
};

// Hook for initializing the app
export const useAppInitialization = () => {
  const { initializeSocket, loadDashboardData } = useStudyStore();

  useEffect(() => {
    const initializeApp = async () => {
      console.log('🚀 Initializing Study Together app...');

      // Initialize Socket.IO connection
      await initializeSocket();

      // Load dashboard data
      await loadDashboardData();

      console.log('✅ App initialization complete');
    };

    initializeApp();
  }, [initializeSocket, loadDashboardData]);
};