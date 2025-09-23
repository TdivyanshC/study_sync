import { io, Socket } from 'socket.io-client';
import Constants from 'expo-constants';

class SocketService {
  private socket: Socket | null = null;
  private isConnected: boolean = false;

  // Get backend URL from environment
  private getBackendUrl(): string {
    const backendUrl = Constants.expoConfig?.extra?.backendUrl || 
                      process.env.EXPO_PUBLIC_BACKEND_URL ||
                      'http://localhost:8001';
    return backendUrl.replace('/api', ''); // Remove /api suffix for Socket.IO
  }

  // Initialize Socket.IO connection
  public connect(userId?: string): Promise<boolean> {
    return new Promise((resolve) => {
      try {
        const backendUrl = this.getBackendUrl();
        console.log('Attempting to connect to Socket.IO server:', backendUrl);
        
        this.socket = io(backendUrl, {
          transports: ['websocket', 'polling'], // Fallback to polling if WebSocket fails
          timeout: 5000,
          reconnection: true,
          reconnectionDelay: 1000,
          reconnectionAttempts: 3,
        });

        this.socket.on('connect', () => {
          console.log('✅ Socket.IO connected successfully');
          this.isConnected = true;
          
          // Join user room if userId provided
          if (userId) {
            this.joinRoom(userId);
          }
          
          resolve(true);
        });

        this.socket.on('connect_error', (error) => {
          console.log('❌ Socket.IO connection failed:', error.message);
          this.isConnected = false;
          resolve(false);
        });

        this.socket.on('disconnect', () => {
          console.log('🔌 Socket.IO disconnected');
          this.isConnected = false;
        });

        this.socket.on('connected', (data) => {
          console.log('Server confirmation:', data.message);
        });

      } catch (error) {
        console.error('Socket.IO connection error:', error);
        resolve(false);
      }
    });
  }

  // Join a room (user room or study group room)
  public joinRoom(room: string): void {
    if (this.socket && this.isConnected) {
      this.socket.emit('join_room', { room });
      console.log(`Joining room: ${room}`);
    }
  }

  // Emit session started event
  public emitSessionStarted(userId: string, subject?: string, room: string = 'general'): void {
    if (this.socket && this.isConnected) {
      this.socket.emit('session_started', {
        user_id: userId,
        subject,
        room,
        timestamp: new Date().toISOString(),
      });
      console.log('Session started event emitted');
    }
  }

  // Emit session stopped event
  public emitSessionStopped(userId: string, duration: number, room: string = 'general'): void {
    if (this.socket && this.isConnected) {
      this.socket.emit('session_stopped', {
        user_id: userId,
        duration,
        room,
        timestamp: new Date().toISOString(),
      });
      console.log('Session stopped event emitted');
    }
  }

  // Listen for session events from other users
  public onSessionEvents(callbacks: {
    onUserStarted?: (data: any) => void;
    onUserStopped?: (data: any) => void;
  }): void {
    if (this.socket) {
      if (callbacks.onUserStarted) {
        this.socket.on('user_started_session', callbacks.onUserStarted);
      }
      
      if (callbacks.onUserStopped) {
        this.socket.on('user_stopped_session', callbacks.onUserStopped);
      }
    }
  }

  // Remove event listeners
  public removeSessionListeners(): void {
    if (this.socket) {
      this.socket.off('user_started_session');
      this.socket.off('user_stopped_session');
    }
  }

  // Disconnect from Socket.IO
  public disconnect(): void {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
      this.isConnected = false;
      console.log('Socket.IO disconnected manually');
    }
  }

  // Get connection status
  public getConnectionStatus(): boolean {
    return this.isConnected;
  }

  // Get socket instance (for advanced usage)
  public getSocket(): Socket | null {
    return this.socket;
  }
}

// Export singleton instance
export const socketService = new SocketService();
export default socketService;