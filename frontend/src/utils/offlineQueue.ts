import AsyncStorage from '@react-native-async-storage/async-storage';
import NetInfo from '@react-native-community/netinfo';

interface QueuedRequest {
  id: string;
  endpoint: string;
  method: 'GET' | 'POST' | 'PUT' | 'DELETE';
  body?: any;
  headers?: Record<string, string>;
  timestamp: number;
  retries: number;
  maxRetries: number;
}

interface QueueStats {
  totalRequests: number;
  successfulRequests: number;
  failedRequests: number;
  pendingRequests: number;
}

class OfflineQueueManager {
  private readonly QUEUE_KEY = 'offline_queue';
  private readonly MAX_QUEUE_SIZE = 100;
  private readonly MAX_RETRIES = 3;
  private isOnline: boolean = true;
  private isProcessing: boolean = false;
  private listeners: ((stats: QueueStats) => void)[] = [];

  constructor() {
    // Monitor network connectivity
    NetInfo.addEventListener(state => {
      const wasOnline = this.isOnline;
      this.isOnline = state.isConnected ?? false;
      
      if (wasOnline !== this.isOnline) {
        if (this.isOnline) {
          console.log('📶 Back online, processing queued requests...');
          this.processQueue();
        } else {
          console.log('📱 Gone offline, requests will be queued');
        }
      }
    });

    // Process queue on app initialization
    this.initializeQueue();
  }

  /**
   * Initialize queue and process any pending requests
   */
  private async initializeQueue() {
    try {
      await this.processQueue();
    } catch (error) {
      console.error('Failed to initialize queue:', error);
    }
  }

  /**
   * Add a request to the offline queue
   */
  async queueRequest(
    endpoint: string,
    method: 'GET' | 'POST' | 'PUT' | 'DELETE',
    body?: any,
    headers?: Record<string, string>
  ): Promise<boolean> {
    try {
      const queue = await this.getQueue();
      
      // Check queue size limit
      if (queue.length >= this.MAX_QUEUE_SIZE) {
        console.warn('Queue is full, dropping oldest request');
        queue.shift(); // Remove oldest request
      }

      const request: QueuedRequest = {
        id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        endpoint,
        method,
        body,
        headers,
        timestamp: Date.now(),
        retries: 0,
        maxRetries: this.MAX_RETRIES,
      };

      queue.push(request);
      await AsyncStorage.setItem(this.QUEUE_KEY, JSON.stringify(queue));
      
      console.log(`📝 Queued request: ${method} ${endpoint}`);
      this.notifyListeners();
      
      // If online, process immediately
      if (this.isOnline && !this.isProcessing) {
        this.processQueue();
      }
      
      return true;
    } catch (error) {
      console.error('Failed to queue request:', error);
      return false;
    }
  }

  /**
   * Process all queued requests
   */
  async processQueue(): Promise<void> {
    if (this.isProcessing || !this.isOnline) {
      return;
    }

    this.isProcessing = true;
    console.log('🔄 Processing offline queue...');

    try {
      const queue = await this.getQueue();
      const processedRequests: string[] = [];

      for (const request of queue) {
        try {
          const success = await this.executeRequest(request);
          if (success) {
            processedRequests.push(request.id);
          } else if (request.retries >= request.maxRetries) {
            console.warn(`Max retries reached for request: ${request.endpoint}`);
            processedRequests.push(request.id);
          } else {
            request.retries++;
            console.log(`Retrying request (${request.retries}/${request.maxRetries}): ${request.endpoint}`);
          }
        } catch (error) {
          console.error('Failed to process queued request:', error);
          if (request.retries >= request.maxRetries) {
            processedRequests.push(request.id);
          } else {
            request.retries++;
          }
        }
      }

      // Remove processed requests from queue
      const remainingQueue = queue.filter(req => !processedRequests.includes(req.id));
      await AsyncStorage.setItem(this.QUEUE_KEY, JSON.stringify(remainingQueue));
      
      console.log(`✅ Processed ${processedRequests.length} requests, ${remainingQueue.length} remaining`);
      this.notifyListeners();

    } catch (error) {
      console.error('Failed to process queue:', error);
    } finally {
      this.isProcessing = false;
    }
  }

  /**
   * Execute a single queued request
   */
  private async executeRequest(request: QueuedRequest): Promise<boolean> {
    try {
      const url = `${process.env.EXPO_PUBLIC_API_URL || 'http://localhost:3000/api'}${request.endpoint}`;
      
      const response = await fetch(url, {
        method: request.method,
        headers: {
          'Content-Type': 'application/json',
          ...request.headers,
        },
        body: request.body ? JSON.stringify(request.body) : undefined,
      });

      if (response.ok) {
        console.log(`✅ Successfully executed queued request: ${request.method} ${request.endpoint}`);
        return true;
      } else {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
    } catch (error) {
      console.error(`❌ Failed to execute queued request: ${request.method} ${request.endpoint}`, error);
      return false;
    }
  }

  /**
   * Get current queue
   */
  private async getQueue(): Promise<QueuedRequest[]> {
    try {
      const queueData = await AsyncStorage.getItem(this.QUEUE_KEY);
      return queueData ? JSON.parse(queueData) : [];
    } catch (error) {
      console.error('Failed to get queue:', error);
      return [];
    }
  }

  /**
   * Get queue statistics
   */
  async getQueueStats(): Promise<QueueStats> {
    try {
      const queue = await this.getQueue();
      
      return {
        totalRequests: queue.length,
        successfulRequests: 0, // We don't track this separately in storage
        failedRequests: queue.filter(req => req.retries >= req.maxRetries).length,
        pendingRequests: queue.filter(req => req.retries < req.maxRetries).length,
      };
    } catch (error) {
      console.error('Failed to get queue stats:', error);
      return {
        totalRequests: 0,
        successfulRequests: 0,
        failedRequests: 0,
        pendingRequests: 0,
      };
    }
  }

  /**
   * Clear all queued requests
   */
  async clearQueue(): Promise<void> {
    try {
      await AsyncStorage.removeItem(this.QUEUE_KEY);
      console.log('🗑️ Cleared offline queue');
      this.notifyListeners();
    } catch (error) {
      console.error('Failed to clear queue:', error);
    }
  }

  /**
   * Force process queue (for manual triggers)
   */
  async forceProcessQueue(): Promise<void> {
    if (!this.isProcessing) {
      await this.processQueue();
    }
  }

  /**
   * Subscribe to queue updates
   */
  subscribe(listener: (stats: QueueStats) => void): () => void {
    this.listeners.push(listener);
    
    // Return unsubscribe function
    return () => {
      const index = this.listeners.indexOf(listener);
      if (index > -1) {
        this.listeners.splice(index, 1);
      }
    };
  }

  /**
   * Notify all listeners of queue updates
   */
  private async notifyListeners() {
    const stats = await this.getQueueStats();
    this.listeners.forEach(listener => {
      try {
        listener(stats);
      } catch (error) {
        console.error('Error in queue listener:', error);
      }
    });
  }

  /**
   * Check if online and process queue
   */
  async flushQueueOnInternetReconnect(): Promise<void> {
    const state = await NetInfo.fetch();
    if (state.isConnected) {
      await this.processQueue();
    }
  }

  /**
   * Get queue size for display
   */
  async getQueueSize(): Promise<number> {
    const queue = await this.getQueue();
    return queue.length;
  }

  /**
   * Check if request should be queued (when offline)
   */
  shouldQueueRequest(): boolean {
    return !this.isOnline;
  }

  /**
   * Get status of the queue system
   */
  getStatus() {
    return {
      isOnline: this.isOnline,
      isProcessing: this.isProcessing,
      hasListeners: this.listeners.length > 0,
    };
  }
}

// Export singleton instance
export const offlineQueue = new OfflineQueueManager();
export default offlineQueue;

// Export types for use in components
export type { QueuedRequest, QueueStats };