import { useEffect, useRef, useState, useCallback } from 'react';
import { socketService, SocketMessage, SocketActivity, SocketSpacePresence, SocketSession } from '../../services/socketService';

export interface SocketConnectionState {
  isConnected: boolean;
  socketId?: string;
  currentUserId?: string;
  joinedSpaces: string[];
  reconnectAttempts: number;
}

export interface UseSocketOptions {
  autoConnect?: boolean;
  userId?: string;
  token?: string;
  onConnect?: () => void;
  onDisconnect?: (reason?: string) => void;
  onError?: (error: any) => void;
}

export const useSocket = (options: UseSocketOptions = {}) => {
  const {
    autoConnect = true,
    userId,
    token,
    onConnect,
    onDisconnect,
    onError
  } = options;

  const [connectionState, setConnectionState] = useState<SocketConnectionState>({
    isConnected: false,
    joinedSpaces: [],
    reconnectAttempts: 0
  });
  
  const [messages, setMessages] = useState<SocketMessage[]>([]);
  const [activities, setActivities] = useState<SocketActivity[]>([]);
  const [spacePresence, setSpacePresence] = useState<Map<string, SocketSpacePresence>>(new Map());
  const [activeSessions, setActiveSessions] = useState<Map<string, SocketSession[]>>(new Map());
  
  const isConnectingRef = useRef(false);
  const unsubscribeFunctionsRef = useRef<(() => void)[]>([]);

  // Update connection state
  const updateConnectionState = useCallback(() => {
    const status = socketService.getConnectionStatus();
    setConnectionState(status);
  }, []);

  // Connect to socket
  const connect = useCallback(async (userId?: string, token?: string): Promise<boolean> => {
    if (isConnectingRef.current) {
      return socketService.getConnectionStatus().isConnected;
    }

    isConnectingRef.current = true;
    try {
      const success = await socketService.connect(userId || undefined, token || undefined);
      if (success) {
        updateConnectionState();
        onConnect?.();
      }
      return success;
    } catch (error) {
      console.error('Socket connection failed:', error);
      onError?.(error);
      return false;
    } finally {
      isConnectingRef.current = false;
    }
  }, [onConnect, onError, updateConnectionState]);

  // Disconnect from socket
  const disconnect = useCallback(() => {
    socketService.disconnect();
    setConnectionState({
      isConnected: false,
      joinedSpaces: [],
      reconnectAttempts: 0
    });
    onDisconnect?.();
  }, [onDisconnect]);

  // Subscribe to socket events
  const subscribe = useCallback((event: string, callback: Function) => {
    return socketService.on(event, callback);
  }, []);

  // Join a space
  const joinSpace = useCallback(async (spaceId: string): Promise<boolean> => {
    const success = await socketService.joinSpace(spaceId);
    if (success) {
      updateConnectionState();
    }
    return success;
  }, [updateConnectionState]);

  // Leave a space
  const leaveSpace = useCallback(async (spaceId: string): Promise<boolean> => {
    const success = await socketService.leaveSpace(spaceId);
    if (success) {
      updateConnectionState();
    }
    return success;
  }, [updateConnectionState]);

  // Send a message
  const sendMessage = useCallback((spaceId: string, message: string, messageType?: 'text' | 'system' | 'notification') => {
    socketService.sendMessage(spaceId, message, messageType);
  }, []);

  // Update activity
  const updateActivity = useCallback((spaceId: string, action: string, progress?: number, subject?: string, sessionId?: string) => {
    socketService.updateActivity(spaceId, action, progress, subject, sessionId);
  }, []);

  // Session management
  const startSession = useCallback((sessionId: string, spaceId?: string, subject?: string, duration?: number) => {
    socketService.startSession(sessionId, spaceId, subject, duration);
  }, []);

  const updateSessionProgress = useCallback((sessionId: string, progress: number, timeRemaining: number, efficiency?: number) => {
    socketService.updateSessionProgress(sessionId, progress, timeRemaining, efficiency);
  }, []);

  const stopSession = useCallback((sessionId: string, actualDuration: number, efficiency?: number, completed?: boolean) => {
    socketService.stopSession(sessionId, actualDuration, efficiency, completed);
  }, []);

  // Get space presence
  const getSpacePresence = useCallback((spaceId: string) => {
    socketService.getSpacePresence(spaceId);
  }, []);

  // Get active sessions
  const getActiveSessions = useCallback((spaceId: string) => {
    socketService.getActiveSessions(spaceId);
  }, []);

  // Get user status
  const getUserStatus = useCallback((userId?: string) => {
    socketService.getUserStatus(userId);
  }, []);

  // Check if user is in space
  const isInSpace = useCallback((spaceId: string): boolean => {
    return socketService.isInSpace(spaceId);
  }, []);

  // Get joined spaces
  const getJoinedSpaces = useCallback((): string[] => {
    return socketService.getJoinedSpaces();
  }, []);

  // Clear messages for a specific space
  const clearMessages = useCallback((spaceId?: string) => {
    if (spaceId) {
      setMessages(prev => prev.filter(msg => msg.space_id !== spaceId));
    } else {
      setMessages([]);
    }
  }, []);

  // Clear activities for a specific space
  const clearActivities = useCallback((spaceId?: string) => {
    if (spaceId) {
      setActivities(prev => prev.filter(activity => activity.space_id !== spaceId));
    } else {
      setActivities([]);
    }
  }, []);

  // Setup event listeners
  useEffect(() => {
    if (!autoConnect) return;

    const unsubscribers: (() => void)[] = [];

    // Connection state events
    unsubscribers.push(
      socketService.on('socket_authenticated', () => {
        updateConnectionState();
        onConnect?.();
      }),
      socketService.on('socket_auth_error', (data) => {
        onError?.(data);
      }),
      socketService.on('socket_disconnected', (data) => {
        updateConnectionState();
        onDisconnect?.(data.reason);
      }),
      socketService.on('socket_reconnected', () => {
        updateConnectionState();
        onConnect?.();
      }),
      socketService.on('socket_reconnect_failed', (data) => {
        updateConnectionState();
        onError?.(new Error(`Reconnection failed after ${data.attempts} attempts`));
      })
    );

    // Space events
    unsubscribers.push(
      socketService.on('space_joined', (data) => {
        updateConnectionState();
      }),
      socketService.on('user_joined_space', (data) => {
        // Could trigger notifications or UI updates
        console.log('User joined space:', data);
      }),
      socketService.on('user_left_space', (data) => {
        // Could trigger notifications or UI updates
        console.log('User left space:', data);
      }),
      socketService.on('space_left', (data) => {
        updateConnectionState();
      })
    );

    // Message events
    unsubscribers.push(
      socketService.on('new_message', (message: SocketMessage) => {
        setMessages(prev => {
          // Avoid duplicates
          if (prev.some(msg => msg.id === message.id)) {
            return prev;
          }
          return [...prev, message].slice(-100); // Keep last 100 messages
        });
      })
    );

    // Activity events
    unsubscribers.push(
      socketService.on('activity_received', (activity: SocketActivity) => {
        setActivities(prev => {
          // Avoid duplicates
          if (prev.some(act => act.id === activity.id)) {
            return prev;
          }
          return [...prev, activity].slice(-50); // Keep last 50 activities
        });
      })
    );

    // Presence events
    unsubscribers.push(
      socketService.on('space_presence', (presence: SocketSpacePresence) => {
        setSpacePresence(prev => {
          const newMap = new Map(prev);
          newMap.set(presence.space_id, presence);
          return newMap;
        });
      })
    );

    // Session events
    unsubscribers.push(
      socketService.on('user_started_session', (data) => {
        // Handle session started
        console.log('User started session:', data);
      }),
      socketService.on('session_progress', (data) => {
        // Handle session progress updates
        console.log('Session progress:', data);
      }),
      socketService.on('user_stopped_session', (data) => {
        // Handle session stopped
        console.log('User stopped session:', data);
      }),
      socketService.on('active_sessions', (data) => {
        setActiveSessions(prev => {
          const newMap = new Map(prev);
          newMap.set(data.space_id, data.sessions || []);
          return newMap;
        });
      })
    );

    // Error handling
    unsubscribers.push(
      socketService.on('socket_error', (error) => {
        console.error('Socket error:', error);
        onError?.(error);
      })
    );

    // Store unsubscribers for cleanup
    unsubscribeFunctionsRef.current = unsubscribers;

    // Cleanup function
    return () => {
      unsubscribers.forEach(unsubscribe => unsubscribe());
      unsubscribeFunctionsRef.current = [];
    };
  }, [autoConnect, onConnect, onDisconnect, onError, updateConnectionState]);

  // Auto-connect if enabled
  useEffect(() => {
    if (autoConnect && userId && token && !connectionState.isConnected && !isConnectingRef.current) {
      connect(userId, token);
    }
  }, [autoConnect, userId, token, connectionState.isConnected, connect]);

  return {
    // Connection state
    connectionState,
    connect,
    disconnect,
    subscribe,

    // Space management
    joinSpace,
    leaveSpace,
    isInSpace,
    getJoinedSpaces,
    getSpacePresence,

    // Messaging
    messages,
    sendMessage,
    clearMessages,

    // Activities
    activities,
    updateActivity,
    clearActivities,

    // Sessions
    activeSessions,
    startSession,
    updateSessionProgress,
    stopSession,
    getActiveSessions,

    // User status
    getUserStatus,

    // Utility
    updateConnectionState
  };
};