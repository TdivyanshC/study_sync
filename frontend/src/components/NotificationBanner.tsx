import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Animated,
  Dimensions,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { notificationService, Notification, NotificationType } from '../services/notificationService';

const { width } = Dimensions.get('window');

interface NotificationBannerProps {
  // Custom notification to display (optional)
  notification?: Notification;
  
  // Position: 'top' or 'bottom'
  position?: 'top' | 'bottom';
  
  // Maximum number of notifications to show
  maxNotifications?: number;
}

export const NotificationBanner: React.FC<NotificationBannerProps> = ({
  notification,
  position = 'top',
  maxNotifications = 3,
}) => {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [animValues] = useState<{ [key: string]: Animated.Value }>({});

  useEffect(() => {
    // If a custom notification is provided, use it
    if (notification) {
      setNotifications([notification]);
      return;
    }

    // Otherwise, subscribe to the notification service
    const unsubscribe = notificationService.addListener((newNotifications) => {
      setNotifications(newNotifications.slice(0, maxNotifications));
      
      // Initialize animations for new notifications
      newNotifications.forEach((notif) => {
        if (!animValues[notif.id]) {
          animValues[notif.id] = new Animated.Value(0);
        }
      });
    });

    return unsubscribe;
  }, [notification, maxNotifications]);

  const getNotificationColor = (type: NotificationType) => {
    switch (type) {
      case 'error':
        return '#FF3B30';
      case 'warning':
        return '#FF9500';
      case 'info':
        return '#007AFF';
      case 'success':
        return '#34C759';
      default:
        return '#007AFF';
    }
  };

  const getNotificationIcon = (type: NotificationType) => {
    switch (type) {
      case 'error':
        return 'alert-circle';
      case 'warning':
        return 'warning';
      case 'info':
        return 'information-circle';
      case 'success':
        return 'checkmark-circle';
      default:
        return 'information-circle';
    }
  };

  const dismissNotification = (id: string) => {
    notificationService.dismiss(id);
  };

  const renderNotification = (notif: Notification, index: number) => {
    const translateY = animValues[notif.id] || new Animated.Value(0);
    const opacity = animValues[notif.id] || new Animated.Value(0);

    // Animate in
    useEffect(() => {
      Animated.parallel([
        Animated.timing(translateY, {
          toValue: 0,
          duration: 300,
          useNativeDriver: true,
        }),
        Animated.timing(opacity, {
          toValue: 1,
          duration: 300,
          useNativeDriver: true,
        }),
      ]).start();
    }, []);

    const handleDismiss = () => {
      // Animate out
      Animated.parallel([
        Animated.timing(translateY, {
          toValue: position === 'top' ? -100 : 100,
          duration: 300,
          useNativeDriver: true,
        }),
        Animated.timing(opacity, {
          toValue: 0,
          duration: 300,
          useNativeDriver: true,
        }),
      ]).start(() => {
        dismissNotification(notif.id);
      });
    };

    const handleActionPress = () => {
      if (notif.action?.onPress) {
        notif.action.onPress();
      }
      handleDismiss();
    };

    return (
      <Animated.View
        key={notif.id}
        style={[
          styles.notificationContainer,
          {
            backgroundColor: getNotificationColor(notif.type),
            transform: [{ translateY }],
            opacity,
            marginTop: index > 0 ? 8 : 0,
          },
        ]}
      >
        <View style={styles.notificationContent}>
          <View style={styles.iconContainer}>
            <Ionicons
              name={getNotificationIcon(notif.type) as any}
              size={20}
              color="white"
            />
          </View>
          
          <View style={styles.textContainer}>
            <Text style={styles.title}>{notif.title}</Text>
            <Text style={styles.message}>{notif.message}</Text>
          </View>

          <View style={styles.actionsContainer}>
            {notif.action && (
              <TouchableOpacity
                style={styles.actionButton}
                onPress={handleActionPress}
                activeOpacity={0.8}
              >
                <Text style={styles.actionText}>{notif.action.label}</Text>
              </TouchableOpacity>
            )}
            
            <TouchableOpacity
              style={styles.dismissButton}
              onPress={handleDismiss}
              activeOpacity={0.8}
            >
              <Ionicons name="close" size={16} color="white" />
            </TouchableOpacity>
          </View>
        </View>
      </Animated.View>
    );
  };

  if (notifications.length === 0) {
    return null;
  }

  return (
    <View
      style={[
        styles.container,
        position === 'top' ? styles.topContainer : styles.bottomContainer,
      ]}
    >
      {notifications.map((notif, index) => renderNotification(notif, index))}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    left: 0,
    right: 0,
    zIndex: 1000,
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  topContainer: {
    top: Platform.OS === 'ios' ? 50 : 20,
  },
  bottomContainer: {
    bottom: Platform.OS === 'ios' ? 50 : 20,
  },
  notificationContainer: {
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
    overflow: 'hidden',
  },
  notificationContent: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  iconContainer: {
    marginRight: 12,
  },
  textContainer: {
    flex: 1,
  },
  title: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 2,
  },
  message: {
    color: 'white',
    fontSize: 14,
    opacity: 0.9,
    lineHeight: 18,
  },
  actionsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginLeft: 8,
  },
  actionButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    borderRadius: 6,
    marginRight: 8,
  },
  actionText: {
    color: 'white',
    fontSize: 14,
    fontWeight: '500',
  },
  dismissButton: {
    padding: 4,
    borderRadius: 4,
  },
});

export default NotificationBanner;