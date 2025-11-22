import { io, Socket } from 'socket.io-client';
import AsyncStorage from '@react-native-async-storage/async-storage';
import NetInfo from '@react-native-community/netinfo';
import { BASE_URL } from '../lib/constants';

export interface SocketUser {
  user_id: string;
  username?: string;
  status: 'online' | 'away' | 'offline';
  last_seen?: string;
}

export interface SocketMessage {
  id: string;
  space_id: string;
  user_id: string;
  username: string;
  message: string;
  message_type: 'text' | 'system' | 'notification';
  created_at: string;
  timestamp: string;
}

export interface SocketActivity {
  id: string;
  space_id: string;
  user_id: string;
  username: string;
  action: string;
  progress?: number;
  subject?: string;
  session_id?: string;
  created_at: string;
  timestamp: string;
}

export interface SocketSession {
  session_id: string;
  user_id: string;
  username: string;
  space_id?: string;
  subject: string;
  duration: number;
  progress?: number;
  time_remaining?: number;
  efficiency?: number;
  start_time: string;
  status: 'active' | 'paused' | 'completed' | 'stopped';
  completed?: boolean;
}

export interface SocketSpacePresence {
  space_id: string;
  online_users: string[];
  total_online: number;
  timestamp: string;
}

class SocketService {
  private socket: Socket | null = null;
  private isConnected: boolean = false;
  private currentUserId: string | null = null;
  private currentToken: string | null = null;
  private reconnectAttempts: number = 0;
  private maxReconnectAttempts: number = 5;
  private heartbeatInterval: number | null = null;
  private joinedSpaces: Set<string> = new Set();
  private listeners: Map<string, Set<Function>> = new Map();

  private readonly CONNECTION_TIMEOUT = 10000;
  private readonly HEARTBEAT_INTERVAL = 30000; // 30 seconds

  constructor() {
    this.initializeNetworkListener();
  }

  /**
   * Initialize network connectivity listener
   */
  private initializeNetworkListener() {
    NetInfo.addEventListener(state => {
      if (state.isConnected && !this.isConnected) {
        console.log('📶 Network available, attempting to reconnect...');
        this.connect();
      } else if (!state.isConnected && this.isConnected) {
        console.log('📱 Network lost, disconnecting...');
        this.disconnect();
      }
    });
  }

  /**
   * Connect to Socket.IO server
   */
  async connect(userId?: string, token?: string): Promise<boolean> {
    try {
      // Get stored credentials if not provided
      if (!userId) {
        userId = await AsyncStorage.getItem('user_id');
      }
      if (!token) {
        token = await AsyncStorage.getItem('auth_token');
      }

      if (!userId || !token) {
        console.log('❌ No user credentials found for socket connection');
        return false;
      }

      this.currentUserId = userId;
      this.currentToken = token;

      // Disconnect existing connection
      if (this.socket) {
        this.disconnect();
      }

      // Get API URL from environment or constants
      const apiUrl = process.env.EXPO_PUBLIC_API_URL || BASE_URL;
      const socketUrl = apiUrl.replace('/api', ''); // Remove /api if present

      console.log(`🔌 Connecting to Socket.IO server at ${socketUrl}`);

      // Create new socket connection
      this.socket = io(socketUrl, {
        transports: ['websocket', 'polling'],
        timeout: this.CONNECTION_TIMEOUT,
        forceNew: true,
        reconnection: true,
        reconnectionAttempts: this.maxReconnectAttempts,
        reconnectionDelay: 1000,
        reconnectionDelayMax: 5000,
        maxHttpBufferSize: 1e6,
        pingTimeout: 60000,
        pingInterval: 25000
      });

      // Setup event listeners
      this.setupSocketListeners();

      // Wait for connection
      return new Promise((resolve, reject) => {
        if (!this.socket) {
          reject(new Error('Socket not initialized'));
          return;
        }

        const timeout = setTimeout(() => {
          reject(new Error('Connection timeout'));
        }, this.CONNECTION_TIMEOUT);

        this.socket.on('connect', () => {
          clearTimeout(timeout);
          console.log('✅ Connected to Socket.IO server');
          this.isConnected = true;
          this.reconnectAttempts = 0;

          // Authenticate with the server
          if (token) {
            this.authenticate(token);
          }
          resolve(true);
        });

        this.socket.on('connect_error', (error) => {
          clearTimeout(timeout);
          console.error('❌ Socket connection error:', error);
          this.isConnected = false;
          reject(error);
        });

        this.socket.on('disconnect', (reason) => {
          console.log('🔌 Disconnected from server:', reason);
          this.isConnected = false;
          this.stopHeartbeat();
          this.emit('socket_disconnected', { reason });
        });

        this.socket.on('reconnect', (attemptNumber) => {
          console.log(`🔄 Reconnected after ${attemptNumber} attempts`);
          this.isConnected = true;
          this.reconnectAttempts = 0;
          this.emit('socket_reconnected', { attemptNumber });
        });

        this.socket.on('reconnect_error', (error) => {
          this.reconnectAttempts++;
          console.error(`🔄 Reconnection attempt ${this.reconnectAttempts} failed:`, error);
        });

        this.socket.on('reconnect_failed', () => {
          console.error('❌ Failed to reconnect after maximum attempts');
          this.isConnected = false;
          this.emit('socket_reconnect_failed', { 
            attempts: this.reconnectAttempts,
            maxAttempts: this.maxReconnectAttempts
          });
        });
      });

    } catch (error) {
      console.error('❌ Failed to connect to Socket.IO server:', error);
      return false;
    }
  }

  /**
   * Disconnect from Socket.IO server
   */
  disconnect(): void {
    if (this.socket) {
      console.log('🔌 Disconnecting from Socket.IO server');
      this.socket.disconnect();
      this.socket = null;
    }

    this.isConnected = false;
    this.stopHeartbeat();
    this.joinedSpaces.clear();
    this.clearAllListeners();
  }

  /**
   * Authenticate with the server using JWT token
   */
  private authenticate(token: string): void {
    if (!this.socket || !this.isConnected) {
      return;
    }

    this.socket.emit('authenticate_user', { token });
  }

  /**
   * Setup Socket.IO event listeners
   */
  private setupSocketListeners(): void {
    if (!this.socket) return;

    // Connection events
    this.socket.on('authenticated', (data) => {
      console.log('✅ Socket authenticated:', data);
      this.emit('socket_authenticated', data);
      this.startHeartbeat();
    });

    this.socket.on('auth_error', (data) => {
      console.error('❌ Socket authentication failed:', data);
      this.emit('socket_auth_error', data);
    });

    // Space events
    this.socket.on('space_joined', (data) => {
      console.log('✅ Joined space:', data);
      if (data.space_id) {
        this.joinedSpaces.add(data.space_id);
      }
      this.emit('space_joined', data);
    });

    this.socket.on('user_joined_space', (data) => {
      console.log('👤 User joined space:', data);
      this.emit('user_joined_space', data);
    });

    this.socket.on('user_left_space', (data) => {
      console.log('👤 User left space:', data);
      this.emit('user_left_space', data);
    });

    this.socket.on('space_left', (data) => {
      console.log('👋 Left space:', data);
      if (data.space_id) {
        this.joinedSpaces.delete(data.space_id);
      }
      this.emit('space_left', data);
    });

    this.socket.on('space_presence', (data: SocketSpacePresence) => {
      this.emit('space_presence', data);
    });

    // Message events
    this.socket.on('new_message', (data: SocketMessage) => {
      this.emit('new_message', data);
    });

    // Activity events
    this.socket.on('activity_received', (data: SocketActivity) => {
      this.emit('activity_received', data);
    });

    // Session events
    this.socket.on('user_started_session', (data) => {
      this.emit('user_started_session', data);
    });

    this.socket.on('session_progress', (data) => {
      this.emit('session_progress', data);
    });

    this.socket.on('user_stopped_session', (data) => {
      this.emit('user_stopped_session', data);
    });

    this.socket.on('active_sessions', (data) => {
      this.emit('active_sessions', data);
    });

    // Status events
    this.socket.on('heartbeat_ack', (data) => {
      this.emit('heartbeat_ack', data);
    });

    this.socket.on('user_status', (data) => {
      this.emit('user_status', data);
    });

    // Error handling
    this.socket.on('error', (data) => {
      console.error('❌ Socket error:', data);
      this.emit('socket_error', data);
    });
  }

  /**
   * Start heartbeat to maintain connection
   */
  private startHeartbeat(): void {
    this.stopHeartbeat();
    this.heartbeatInterval = setInterval(() => {
      if (this.socket && this.isConnected && this.currentUserId) {
        this.socket.emit('heartbeat', { 
          user_id: this.currentUserId,
          timestamp: new Date().toISOString()
        });
      }
    }, this.HEARTBEAT_INTERVAL);
  }

  /**
   * Stop heartbeat
   */
  private stopHeartbeat(): void {
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
      this.heartbeatInterval = null;
    }
  }

  /**
   * Join a study space
   */
  async joinSpace(spaceId: string): Promise<boolean> {
    if (!this.socket || !this.isConnected || !this.currentUserId) {
      console.log('❌ Cannot join space: not connected or no user');
      return false;
    }

    try {
      return new Promise((resolve) => {
        const timeout = setTimeout(() => {
          resolve(false);
        }, 5000);

        this.socket!.emit('join_space', {
          space_id: spaceId,
          user_id: this.currentUserId
        });

        this.socket!.once('space_joined', (data) => {
          clearTimeout(timeout);
          if (data.space_id === spaceId) {
            this.joinedSpaces.add(spaceId);
            resolve(true);
          } else {
            resolve(false);
          }
        });

        this.socket!.once('error', (error) => {
          clearTimeout(timeout);
          console.error('Error joining space:', error);
          resolve(false);
        });
      });
    } catch (error) {
      console.error('Failed to join space:', error);
      return false;
    }
  }

  /**
   * Leave a study space
   */
  async leaveSpace(spaceId: string): Promise<boolean> {
    if (!this.socket || !this.isConnected || !this.currentUserId) {
      return false;
    }

    try {
      this.socket.emit('leave_space', {
        space_id: spaceId,
        user_id: this.currentUserId
      });
      
      this.joinedSpaces.delete(spaceId);
      return true;
    } catch (error) {
      console.error('Failed to leave space:', error);
      return false;
    }
  }

  /**
   * Send a message to a space
   */
  sendMessage(spaceId: string, message: string, messageType: 'text' | 'system' | 'notification' = 'text'): void {
    if (!this.socket || !this.isConnected || !this.currentUserId) {
      console.log('❌ Cannot send message: not connected');
      return;
    }

    this.socket.emit('send_message', {
      space_id: spaceId,
      user_id: this.currentUserId,
      message,
      type: messageType
    });
  }

  /**
   * Update activity in a space
   */
  updateActivity(spaceId: string, action: string, progress?: number, subject?: string, sessionId?: string): void {
    if (!this.socket || !this.isConnected || !this.currentUserId) {
      return;
    }

    this.socket.emit('activity_update', {
      space_id: spaceId,
      user_id: this.currentUserId,
      action,
      progress,
      subject,
      session_id: sessionId
    });
  }

  /**
   * Start tracking a study session
   */
  startSession(sessionId: string, spaceId?: string, subject?: string, duration?: number): void {
    if (!this.socket || !this.isConnected || !this.currentUserId) {
      return;
    }

    this.socket.emit('session_started', {
      session_id: sessionId,
      user_id: this.currentUserId,
      space_id: spaceId,
      subject: subject || 'General Study',
      duration: duration || 25
    });
  }

  /**
   * Update session progress
   */
  updateSessionProgress(sessionId: string, progress: number, timeRemaining: number, efficiency?: number): void {
    if (!this.socket || !this.isConnected) {
      return;
    }

    this.socket.emit('session_progress', {
      session_id: sessionId,
      progress,
      time_remaining: timeRemaining,
      efficiency
    });
  }

  /**
   * Stop a study session
   */
  stopSession(sessionId: string, actualDuration: number, efficiency?: number, completed?: boolean): void {
    if (!this.socket || !this.isConnected) {
      return;
    }

    this.socket.emit('session_stopped', {
      session_id: sessionId,
      actual_duration: actualDuration,
      efficiency,
      completed: completed || false
    });
  }

  /**
   * Get space presence information
   */
  getSpacePresence(spaceId: string): void {
    if (!this.socket || !this.isConnected) {
      return;
    }

    this.socket.emit('get_space_presence', { space_id: spaceId });
  }

  /**
   * Get active sessions in a space
   */
  getActiveSessions(spaceId: string): void {
    if (!this.socket || !this.isConnected) {
      return;
    }

    this.socket.emit('get_active_sessions', { space_id: spaceId });
  }

  /**
   * Get user status
   */
  getUserStatus(userId?: string): void {
    if (!this.socket || !this.isConnected) {
      return;
    }

    this.socket.emit('get_user_status', { user_id: userId || this.currentUserId });
  }

  /**
   * Event listener management
   */
  on(event: string, callback: Function): () => void {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, new Set());
    }
    
    this.listeners.get(event)!.add(callback);
    
    // Return unsubscribe function
    return () => {
      const eventListeners = this.listeners.get(event);
      if (eventListeners) {
        eventListeners.delete(callback);
        if (eventListeners.size === 0) {
          this.listeners.delete(event);
        }
      }
    };
  }

  /**
   * Emit event to listeners
   */
  private emit(event: string, data?: any): void {
    const eventListeners = this.listeners.get(event);
    if (eventListeners) {
      eventListeners.forEach(callback => {
        try {
          callback(data);
        } catch (error) {
          console.error(`Error in socket event listener for ${event}:`, error);
        }
      });
    }
  }

  /**
   * Clear all event listeners
   */
  private clearAllListeners(): void {
    this.listeners.clear();
  }

  /**
   * Get connection status
   */
  getConnectionStatus(): {
    isConnected: boolean;
    socketId?: string;
    currentUserId?: string;
    joinedSpaces: string[];
    reconnectAttempts: number;
  } {
    return {
      isConnected: this.isConnected,
      socketId: this.socket?.id,
      currentUserId: this.currentUserId,
      joinedSpaces: Array.from(this.joinedSpaces),
      reconnectAttempts: this.reconnectAttempts
    };
  }

  /**
   * Check if user is in a space
   */
  isInSpace(spaceId: string): boolean {
    return this.joinedSpaces.has(spaceId);
  }

  /**
   * Get all joined spaces
   */
  getJoinedSpaces(): string[] {
    return Array.from(this.joinedSpaces);
  }
}

// Create singleton instance
export const socketService = new SocketService();
export default socketService;