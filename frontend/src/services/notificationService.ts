import { Platform } from 'react-native';
import * as Haptics from 'expo-haptics';

export type NotificationType = 'error' | 'warning' | 'info' | 'success';

export interface Notification {
  id: string;
  type: NotificationType;
  title: string;
  message: string;
  duration?: number;
  action?: {
    label: string;
    onPress: () => void;
  };
  persistent?: boolean;
}

class NotificationService {
  private notifications: Notification[] = [];
  private listeners: ((notifications: Notification[]) => void)[] = [];

  /**
   * Add a notification listener
   */
  addListener(listener: (notifications: Notification[]) => void) {
    this.listeners.push(listener);
    return () => {
      this.listeners = this.listeners.filter(l => l !== listener);
    };
  }

  /**
   * Remove all listeners
   */
  removeAllListeners() {
    this.listeners = [];
  }

  /**
   * Notify listeners of changes
   */
  private notifyListeners() {
    this.listeners.forEach(listener => listener([...this.notifications]));
  }

  /**
   * Get all current notifications
   */
  getNotifications(): Notification[] {
    return [...this.notifications];
  }

  /**
   * Show an error notification
   */
  showError(title: string, message: string, options: Partial<Notification> = {}) {
    this.show({
      type: 'error',
      title,
      message,
      duration: options.duration ?? 5000,
      action: options.action,
      persistent: options.persistent ?? false,
    });
  }

  /**
   * Show a warning notification
   */
  showWarning(title: string, message: string, options: Partial<Notification> = {}) {
    this.show({
      type: 'warning',
      title,
      message,
      duration: options.duration ?? 4000,
      action: options.action,
      persistent: options.persistent ?? false,
    });
  }

  /**
   * Show an info notification
   */
  showInfo(title: string, message: string, options: Partial<Notification> = {}) {
    this.show({
      type: 'info',
      title,
      message,
      duration: options.duration ?? 3000,
      action: options.action,
      persistent: options.persistent ?? false,
    });
  }

  /**
   * Show a success notification
   */
  showSuccess(title: string, message: string, options: Partial<Notification> = {}) {
    this.show({
      type: 'success',
      title,
      message,
      duration: options.duration ?? 3000,
      action: options.action,
      persistent: options.persistent ?? false,
    });
  }

  /**
   * Show a notification
   */
  show(notification: Omit<Notification, 'id'>) {
    const id = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    const newNotification: Notification = {
      ...notification,
      id,
    };

    this.notifications.push(newNotification);
    this.notifyListeners();

    // Provide haptic feedback for errors and warnings
    if (Platform.OS !== 'web') {
      if (notification.type === 'error') {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      } else if (notification.type === 'warning') {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
      } else if (notification.type === 'success') {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      }
    }

    // Auto-dismiss non-persistent notifications
    if (!notification.persistent && notification.duration && notification.duration > 0) {
      setTimeout(() => {
        this.dismiss(id);
      }, notification.duration);
    }
  }

  /**
   * Dismiss a notification by ID
   */
  dismiss(id: string) {
    this.notifications = this.notifications.filter(n => n.id !== id);
    this.notifyListeners();
  }

  /**
   * Dismiss all notifications
   */
  dismissAll() {
    this.notifications = [];
    this.notifyListeners();
  }

  /**
   * Show backend connectivity error
   */
  showBackendError(userMessage: string = 'Unable to connect to the server') {
    this.showError(
      'Connection Issue',
      userMessage,
      {
        persistent: true,
        action: {
          label: 'Retry',
          onPress: () => {
            // You could trigger a retry mechanism here
            this.dismissAll();
          }
        }
      }
    );
  }

  /**
   * Show server unavailable error
   */
  showServerUnavailable() {
    this.showError(
      'Server Unavailable',
      'The server is temporarily unavailable. Please try again later.',
      {
        persistent: true,
        action: {
          label: 'Retry',
          onPress: () => {
            // You could trigger a retry mechanism here
            this.dismissAll();
          }
        }
      }
    );
  }

  /**
   * Show ngrok tunnel error
   */
  showNgrokError() {
    this.showError(
      'Tunnel Connection Failed',
      'Unable to connect to the development server. Please check if the server is running.',
      {
        persistent: true,
        action: {
          label: 'Retry',
          onPress: () => {
            this.dismissAll();
          }
        }
      }
    );
  }

  /**
   * Show network connection error
   */
  showNetworkError() {
    this.showError(
      'Network Error',
      'Please check your internet connection and try again.',
      {
        persistent: true,
        action: {
          label: 'Retry',
          onPress: () => {
            this.dismissAll();
          }
        }
      }
    );
  }
}

// Export singleton instance
export const notificationService = new NotificationService();
export default notificationService;