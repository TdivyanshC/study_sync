import { useState, useEffect, useRef } from 'react';
import { create } from 'zustand';

// Mock data for initial development
export interface StudySession {
  id: string;
  startTime: Date;
  endTime?: Date;
  duration: number; // in seconds
  isActive: boolean;
  isBreak: boolean;
  subject?: string;
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

// Zustand store for study session management
interface StudyStore {
  currentSession: StudySession | null;
  sessions: StudySession[];
  stats: StudyStats;
  isTimerRunning: boolean;
  startSession: (subject?: string) => void;
  stopSession: () => void;
  takeBreak: () => void;
  resumeFromBreak: () => void;
  updateTimer: (seconds: number) => void;
}

export const useStudyStore = create<StudyStore>((set, get) => ({
  currentSession: null,
  sessions: [], // Mock data will be added
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

  startSession: (subject) => {
    const newSession: StudySession = {
      id: Math.random().toString(36).substr(2, 9),
      startTime: new Date(),
      duration: 0,
      isActive: true,
      isBreak: false,
      subject,
    };
    set({ 
      currentSession: newSession,
      isTimerRunning: true 
    });
  },

  stopSession: () => {
    const { currentSession, sessions } = get();
    if (currentSession) {
      const finishedSession = {
        ...currentSession,
        endTime: new Date(),
        isActive: false,
      };
      set({ 
        currentSession: null,
        sessions: [...sessions, finishedSession],
        isTimerRunning: false 
      });
    }
  },

  takeBreak: () => {
    set(state => ({
      currentSession: state.currentSession ? {
        ...state.currentSession,
        isBreak: true
      } : null,
      isTimerRunning: false
    }));
  },

  resumeFromBreak: () => {
    set(state => ({
      currentSession: state.currentSession ? {
        ...state.currentSession,
        isBreak: false
      } : null,
      isTimerRunning: true
    }));
  },

  updateTimer: (seconds) => {
    set(state => ({
      currentSession: state.currentSession ? {
        ...state.currentSession,
        duration: seconds
      } : null
    }));
  },
}));

// Custom hook for timer functionality
export const useTimer = () => {
  const { currentSession, isTimerRunning, updateTimer } = useStudyStore();
  const [time, setTime] = useState(0);
  const intervalRef = useRef<NodeJS.Timeout>();

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