import AsyncStorage from '@react-native-async-storage/async-storage';
import NetInfo from '@react-native-community/netinfo';
import { BASE_URL } from '../../lib/constants';
import { socketService } from '../../services/socketService';

export type QueueItemType = 'http_request' | 'socket_event' | 'socket_message' | 'socket_activity';

export interface QueueItem {
  id: string;
  type: QueueItemType;
  timestamp: number;
  retries: number;
  maxRetries: number;
  priority: 'low' | 'normal' | 'high';
  
  // HTTP request data
  endpoint?: string;
  method?: 'GET' | 'POST' | 'PUT' | 'DELETE';
  body?: any;
  headers?: Record<string, string>;
  
  // Socket event data
  event?: string;
  data?: any;
  space_id?: string;
  user_id?: string;
  
  // Conflict resolution
  conflict_key?: string;
  conflict_strategy?: 'overwrite' | 'merge' | 'latest_wins' | 'manual';
  optimistic_update?: boolean;
  
  // Metadata
  metadata?: Record<string, any>;
}

export interface ConflictResolution {
  item_id: string;
  local_data: any;
  server_data: any;
  strategy: 'overwrite' | 'merge' | 'latest_wins' | 'manual';
  resolved_data?: any;
  timestamp: number;
}

export interface QueueStats {
  totalItems: number;
  successfulItems: number;
  failedItems: number;
  pendingItems: number;
  conflictItems: number;
  socketItems: number;
  httpItems: number;
}

class EnhancedOfflineQueueManager {
  private readonly QUEUE_KEY = 'enhanced_offline_queue';
  private readonly CONFLICTS_KEY = 'offline_queue_conflicts';
  private readonly MAX_QUEUE_SIZE = 200;
  private readonly MAX_RETRIES = 3;
  private readonly CONFLICT_RESOLUTION_TIMEOUT = 30000; // 30 seconds
  
  private isOnline: boolean = true;
  private isProcessing: boolean = false;
  private isSocketConnected: boolean = false;
  private listeners: Set<(stats: QueueStats) => void> = new Set();
  private conflictResolvers: Map<string, (conflict: ConflictResolution) => Promise<any>> = new Map();
  
  // Performance tracking
  private lastProcessTime: number = 0;
  private averageProcessTime: number = 0;
  private processedItemsCount: number = 0;

  constructor() {
    this.initializeNetworkListener();
    this.initializeSocketListener();
    this.initializeQueue();
  }

  /**
   * Initialize network connectivity listener
   */
  private initializeNetworkListener() {
    NetInfo.addEventListener(state => {
      const wasOnline = this.isOnline;
      this.isOnline = state.isConnected ?? false;
      
      if (wasOnline !== this.isOnline) {
        if (this.isOnline) {
          console.log('📶 Back online, processing queued items...');
          this.processQueue();
        } else {
          console.log('📱 Gone offline, items will be queued');
        }
      }
    });
  }

  /**
   * Initialize Socket.IO connection listener
   */
  private initializeSocketListener() {
    // Subscribe to socket connection state changes
    socketService.on('socket_connected', () => {
      const wasConnected = this.isSocketConnected;
      this.isSocketConnected = true;
      
      if (!wasConnected) {
        console.log('🔌 Socket connected, processing queued socket events...');
        this.processQueue();
      }
    });

    socketService.on('socket_disconnected', () => {
      this.isSocketConnected = false;
      console.log('🔌 Socket disconnected');
    });
  }

  /**
   * Initialize queue and process any pending items
   */
  private async initializeQueue() {
    try {
      await this.processQueue();
    } catch (error) {
      console.error('Failed to initialize enhanced queue:', error);
    }
  }

  /**
   * Add HTTP request to queue
   */
  async queueHttpRequest(
    endpoint: string,
    method: 'GET' | 'POST' | 'PUT' | 'DELETE',
    body?: any,
    headers?: Record<string, string>,
    options?: {
      priority?: 'low' | 'normal' | 'high';
      conflict_key?: string;
      conflict_strategy?: 'overwrite' | 'merge' | 'latest_wins' | 'manual';
    }
  ): Promise<boolean> {
    const queueItem: QueueItem = {
      id: this.generateId(),
      type: 'http_request',
      timestamp: Date.now(),
      retries: 0,
      maxRetries: this.MAX_RETRIES,
      priority: options?.priority || 'normal',
      endpoint,
      method,
      body,
      headers,
      conflict_key: options?.conflict_key,
      conflict_strategy: options?.conflict_strategy || 'latest_wins',
    };

    return this.addToQueue(queueItem);
  }

  /**
   * Add Socket.IO event to queue
   */
  async queueSocketEvent(
    event: string,
    data: any,
    options?: {
      priority?: 'low' | 'normal' | 'high';
      space_id?: string;
      user_id?: string;
      conflict_key?: string;
      conflict_strategy?: 'overwrite' | 'merge' | 'latest_wins' | 'manual';
      metadata?: Record<string, any>;
    }
  ): Promise<boolean> {
    const queueItem: QueueItem = {
      id: this.generateId(),
      type: 'socket_event',
      timestamp: Date.now(),
      retries: 0,
      maxRetries: this.MAX_RETRIES,
      priority: options?.priority || 'normal',
      event,
      data,
      space_id: options?.space_id,
      user_id: options?.user_id,
      conflict_key: options?.conflict_key,
      conflict_strategy: options?.conflict_strategy || 'overwrite',
      metadata: options?.metadata,
    };

    return this.addToQueue(queueItem);
  }

  /**
   * Add Socket.IO message to queue
   */
  async queueSocketMessage(
    space_id: string,
    message: string,
    messageType: 'text' | 'system' | 'notification' = 'text',
    options?: {
      priority?: 'low' | 'normal' | 'high';
      user_id?: string;
      metadata?: Record<string, any>;
    }
  ): Promise<boolean> {
    const queueItem: QueueItem = {
      id: this.generateId(),
      type: 'socket_message',
      timestamp: Date.now(),
      retries: 0,
      maxRetries: this.MAX_RETRIES,
      priority: options?.priority || 'normal',
      event: 'send_message',
      data: {
        space_id,
        message,
        type: messageType,
        user_id: options?.user_id,
      },
      space_id,
      user_id: options?.user_id,
      conflict_key: `message_${space_id}_${Date.now()}`,
      conflict_strategy: 'overwrite',
      metadata: options?.metadata,
    };

    return this.addToQueue(queueItem);
  }

  /**
   * Add Socket.IO activity update to queue
   */
  async queueSocketActivity(
    space_id: string,
    action: string,
    options?: {
      progress?: number;
      subject?: string;
      session_id?: string;
      priority?: 'low' | 'normal' | 'high';
      user_id?: string;
      metadata?: Record<string, any>;
    }
  ): Promise<boolean> {
    const queueItem: QueueItem = {
      id: this.generateId(),
      type: 'socket_activity',
      timestamp: Date.now(),
      retries: 0,
      maxRetries: this.MAX_RETRIES,
      priority: options?.priority || 'normal',
      event: 'activity_update',
      data: {
        space_id,
        action,
        progress: options?.progress,
        subject: options?.subject,
        session_id: options?.session_id,
        user_id: options?.user_id,
      },
      space_id,
      user_id: options?.user_id,
      conflict_key: `activity_${space_id}_${action}_${Date.now()}`,
      conflict_strategy: 'latest_wins',
      metadata: options?.metadata,
    };

    return this.addToQueue(queueItem);
  }

  /**
   * Add item to queue with smart prioritization
   */
  private async addToQueue(item: QueueItem): Promise<boolean> {
    try {
      const queue = await this.getQueue();
      
      // Check queue size limit
      if (queue.length >= this.MAX_QUEUE_SIZE) {
        // Remove lowest priority items first
        queue.sort((a, b) => {
          const priorityOrder = { low: 0, normal: 1, high: 2 };
          return priorityOrder[a.priority] - priorityOrder[b.priority];
        });
        queue.shift(); // Remove lowest priority item
        console.warn('Queue is full, removed lowest priority item');
      }

      // Check for existing items with same conflict key
      if (item.conflict_key) {
        const existingIndex = queue.findIndex(q => q.conflict_key === item.conflict_key);
        if (existingIndex !== -1) {
          // Handle conflict based on strategy
          await this.handleConflict(queue[existingIndex], item);
          return true;
        }
      }

      queue.push(item);
      await AsyncStorage.setItem(this.QUEUE_KEY, JSON.stringify(queue));
      
      console.log(`📝 Queued ${item.type}: ${item.event || item.method} ${item.endpoint || item.space_id}`);
      this.notifyListeners();
      
      // If conditions are right, process immediately
      if (this.shouldProcessImmediately(item)) {
        this.processQueue();
      }
      
      return true;
    } catch (error) {
      console.error('Failed to queue item:', error);
      return false;
    }
  }

  /**
   * Handle conflicts between queued items
   */
  private async handleConflict(existing: QueueItem, newItem: QueueItem): Promise<void> {
    console.log(`⚠️ Conflict detected for ${newItem.conflict_key}`);
    
    switch (newItem.conflict_strategy) {
      case 'overwrite':
        // Replace existing item
        const queue = await this.getQueue();
        const index = queue.findIndex(item => item.id === existing.id);
        if (index !== -1) {
          queue[index] = newItem;
          await AsyncStorage.setItem(this.QUEUE_KEY, JSON.stringify(queue));
        }
        break;
        
      case 'merge':
        // Merge data from both items
        const mergedData = this.mergeData(existing.data, newItem.data);
        newItem.data = mergedData;
        await this.addToQueue(newItem);
        break;
        
      case 'latest_wins':
        // Keep the newer item (higher timestamp)
        if (newItem.timestamp > existing.timestamp) {
          await this.addToQueue(newItem);
        }
        break;
        
      case 'manual':
        // Store conflict for manual resolution
        await this.storeConflict(existing, newItem);
        break;
    }
  }

  /**
   * Merge data for conflict resolution
   */
  private mergeData(existing: any, incoming: any): any {
    if (typeof existing !== 'object' || typeof incoming !== 'object') {
      return incoming;
    }
    
    const merged = { ...existing };
    
    for (const key in incoming) {
      if (key in merged) {
        // Recursively merge nested objects
        if (typeof merged[key] === 'object' && typeof incoming[key] === 'object') {
          merged[key] = this.mergeData(merged[key], incoming[key]);
        } else {
          // For non-objects, incoming takes precedence
          merged[key] = incoming[key];
        }
      } else {
        merged[key] = incoming[key];
      }
    }
    
    return merged;
  }

  /**
   * Store conflict for manual resolution
   */
  private async storeConflict(item1: QueueItem, item2: QueueItem): Promise<void> {
    try {
      const conflicts = await this.getConflicts();
      const conflict: ConflictResolution = {
        item_id: item2.id,
        local_data: item1.data,
        server_data: item2.data,
        strategy: 'manual',
        timestamp: Date.now(),
      };
      
      conflicts.push(conflict);
      await AsyncStorage.setItem(this.CONFLICTS_KEY, JSON.stringify(conflicts));
      
      console.log(`📋 Stored conflict for manual resolution: ${item2.conflict_key}`);
    } catch (error) {
      console.error('Failed to store conflict:', error);
    }
  }

  /**
   * Check if item should be processed immediately
   */
  private shouldProcessImmediately(item: QueueItem): boolean {
    // High priority items should be processed immediately when online
    if (item.priority === 'high' && this.isOnline) {
      return true;
    }
    
    // Socket events should be processed when socket is connected
    if (item.type !== 'http_request' && this.isSocketConnected) {
      return true;
    }
    
    return false;
  }

  /**
   * Process all queued items with smart prioritization
   */
  async processQueue(): Promise<void> {
    if (this.isProcessing || (!this.isOnline && !this.isSocketConnected)) {
      return;
    }

    this.isProcessing = true;
    const startTime = Date.now();
    console.log('🔄 Processing enhanced offline queue...');

    try {
      const queue = await this.getQueue();
      const processedIds: string[] = [];
      const failedIds: string[] = [];

      // Sort by priority and timestamp
      queue.sort((a, b) => {
        const priorityOrder = { low: 0, normal: 1, high: 2 };
        if (priorityOrder[a.priority] !== priorityOrder[b.priority]) {
          return priorityOrder[b.priority] - priorityOrder[a.priority]; // Higher priority first
        }
        return a.timestamp - b.timestamp; // Older items first
      });

      for (const item of queue) {
        try {
          // Check if conditions are met for this item type
          if (!this.canProcessItem(item)) {
            continue;
          }

          const success = await this.processItem(item);
          if (success) {
            processedIds.push(item.id);
          } else if (item.retries >= item.maxRetries) {
            console.warn(`Max retries reached for item: ${item.id}`);
            failedIds.push(item.id);
          } else {
            item.retries++;
            console.log(`Retrying item (${item.retries}/${item.maxRetries}): ${item.id}`);
          }
        } catch (error) {
          console.error('Failed to process queued item:', error);
          if (item.retries >= item.maxRetries) {
            failedIds.push(item.id);
          } else {
            item.retries++;
          }
        }
      }

      // Remove processed and failed items
      const remainingQueue = queue.filter(
        item => !processedIds.includes(item.id) && !failedIds.includes(item.id)
      );
      await AsyncStorage.setItem(this.QUEUE_KEY, JSON.stringify(remainingQueue));

      // Update performance metrics
      const processTime = Date.now() - startTime;
      this.updatePerformanceMetrics(processTime, processedIds.length);

      console.log(`✅ Processed ${processedIds.length} items, ${failedIds.length} failed, ${remainingQueue.length} remaining`);
      this.notifyListeners();

    } catch (error) {
      console.error('Failed to process enhanced queue:', error);
    } finally {
      this.isProcessing = false;
    }
  }

  /**
   * Check if item can be processed based on current state
   */
  private canProcessItem(item: QueueItem): boolean {
    switch (item.type) {
      case 'http_request':
        return this.isOnline;
      case 'socket_event':
      case 'socket_message':
      case 'socket_activity':
        return this.isSocketConnected;
      default:
        return false;
    }
  }

  /**
   * Process a single queue item
   */
  private async processItem(item: QueueItem): Promise<boolean> {
    try {
      switch (item.type) {
        case 'http_request':
          return await this.processHttpRequest(item);
        case 'socket_event':
          return await this.processSocketEvent(item);
        case 'socket_message':
          return await this.processSocketMessage(item);
        case 'socket_activity':
          return await this.processSocketActivity(item);
        default:
          console.warn(`Unknown item type: ${item.type}`);
          return false;
      }
    } catch (error) {
      console.error(`Failed to process ${item.type} item:`, error);
      return false;
    }
  }

  /**
   * Process HTTP request item
   */
  private async processHttpRequest(item: QueueItem): Promise<boolean> {
    const url = `${process.env.EXPO_PUBLIC_API_URL || `${BASE_URL}/api`}${item.endpoint}`;
    
    const response = await fetch(url, {
      method: item.method,
      headers: {
        'Content-Type': 'application/json',
        ...item.headers,
      },
      body: item.body ? JSON.stringify(item.body) : undefined,
    });

    if (response.ok) {
      console.log(`✅ Processed HTTP request: ${item.method} ${item.endpoint}`);
      return true;
    } else {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }
  }

  /**
   * Process Socket.IO event item
   */
  private async processSocketEvent(item: QueueItem): Promise<boolean> {
    if (!this.isSocketConnected) {
      return false;
    }

    try {
      switch (item.event) {
        case 'send_message':
          socketService.sendMessage(
            item.data.space_id,
            item.data.message,
            item.data.type
          );
          break;
          
        case 'activity_update':
          socketService.updateActivity(
            item.data.space_id,
            item.data.action,
            item.data.progress,
            item.data.subject,
            item.data.session_id
          );
          break;
          
        case 'join_space':
          await socketService.joinSpace(item.space_id!);
          break;
          
        case 'leave_space':
          await socketService.leaveSpace(item.space_id!);
          break;
          
        default:
          console.warn(`Unknown socket event: ${item.event}`);
          return false;
      }
      
      console.log(`✅ Processed socket event: ${item.event}`);
      return true;
    } catch (error) {
      console.error(`Failed to process socket event ${item.event}:`, error);
      return false;
    }
  }

  /**
   * Process Socket.IO message item
   */
  private async processSocketMessage(item: QueueItem): Promise<boolean> {
    return this.processSocketEvent(item);
  }

  /**
   * Process Socket.IO activity item
   */
  private async processSocketActivity(item: QueueItem): Promise<boolean> {
    return this.processSocketEvent(item);
  }

  /**
   * Update performance metrics
   */
  private updatePerformanceMetrics(processTime: number, processedCount: number) {
    this.lastProcessTime = processTime;
    
    // Calculate running average
    this.processedItemsCount++;
    this.averageProcessTime = (
      (this.averageProcessTime * (this.processedItemsCount - 1) + processTime) /
      this.processedItemsCount
    );
  }

  /**
   * Get current queue
   */
  private async getQueue(): Promise<QueueItem[]> {
    try {
      const queueData = await AsyncStorage.getItem(this.QUEUE_KEY);
      return queueData ? JSON.parse(queueData) : [];
    } catch (error) {
      console.error('Failed to get queue:', error);
      return [];
    }
  }

  /**
   * Get stored conflicts
   */
  private async getConflicts(): Promise<ConflictResolution[]> {
    try {
      const conflictsData = await AsyncStorage.getItem(this.CONFLICTS_KEY);
      return conflictsData ? JSON.parse(conflictsData) : [];
    } catch (error) {
      console.error('Failed to get conflicts:', error);
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
        totalItems: queue.length,
        successfulItems: 0, // We don't track this separately in storage
        failedItems: queue.filter(item => item.retries >= item.maxRetries).length,
        pendingItems: queue.filter(item => item.retries < item.maxRetries).length,
        conflictItems: 0, // Would need separate tracking
        socketItems: queue.filter(item => item.type !== 'http_request').length,
        httpItems: queue.filter(item => item.type === 'http_request').length,
      };
    } catch (error) {
      console.error('Failed to get queue stats:', error);
      return {
        totalItems: 0,
        successfulItems: 0,
        failedItems: 0,
        pendingItems: 0,
        conflictItems: 0,
        socketItems: 0,
        httpItems: 0,
      };
    }
  }

  /**
   * Clear all queued items
   */
  async clearQueue(): Promise<void> {
    try {
      await AsyncStorage.removeItem(this.QUEUE_KEY);
      await AsyncStorage.removeItem(this.CONFLICTS_KEY);
      console.log('🗑️ Cleared enhanced offline queue');
      this.notifyListeners();
    } catch (error) {
      console.error('Failed to clear queue:', error);
    }
  }

  /**
   * Generate unique ID for queue items
   */
  private generateId(): string {
    return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Subscribe to queue updates
   */
  subscribe(listener: (stats: QueueStats) => void): () => void {
    this.listeners.add(listener);
    
    return () => {
      this.listeners.delete(listener);
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
   * Get system status
   */
  getStatus() {
    return {
      isOnline: this.isOnline,
      isSocketConnected: this.isSocketConnected,
      isProcessing: this.isProcessing,
      hasListeners: this.listeners.size > 0,
      lastProcessTime: this.lastProcessTime,
      averageProcessTime: this.averageProcessTime,
      processedItemsCount: this.processedItemsCount,
    };
  }

  /**
   * Check if request should be queued (when offline)
   */
  shouldQueueRequest(itemType: QueueItemType): boolean {
    switch (itemType) {
      case 'http_request':
        return !this.isOnline;
      case 'socket_event':
      case 'socket_message':
      case 'socket_activity':
        return !this.isSocketConnected;
      default:
        return true;
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
   * Register conflict resolver
   */
  registerConflictResolver(key: string, resolver: (conflict: ConflictResolution) => Promise<any>) {
    this.conflictResolvers.set(key, resolver);
  }

  /**
   * Resolve stored conflicts
   */
  async resolveConflicts(): Promise<void> {
    try {
      const conflicts = await this.getConflicts();
      
      for (const conflict of conflicts) {
        const resolver = this.conflictResolvers.get(conflict.strategy);
        if (resolver) {
          try {
            await resolver(conflict);
            console.log(`✅ Resolved conflict: ${conflict.item_id}`);
          } catch (error) {
            console.error(`Failed to resolve conflict ${conflict.item_id}:`, error);
          }
        }
      }
      
      // Clear resolved conflicts
      await AsyncStorage.removeItem(this.CONFLICTS_KEY);
    } catch (error) {
      console.error('Failed to resolve conflicts:', error);
    }
  }
}

// Export singleton instance
export const enhancedOfflineQueue = new EnhancedOfflineQueueManager();
export default enhancedOfflineQueue;

// Export types for use in components
export type { QueueItem, ConflictResolution, QueueStats };