import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Colors } from '../constants/Colors';
import { GlobalStyles } from '../constants/Theme';

interface ActivityCardProps {
  userId: string;
  action: string;
  timestamp: string;
}

const ActivityCard: React.FC<ActivityCardProps> = ({ userId, action, timestamp }) => {
  // Get user initials for avatar
  const getInitials = (userId: string) => {
    return userId.charAt(0).toUpperCase();
  };

  // Format action text
  const formatAction = (action: string) => {
    const actionMap: { [key: string]: string } = {
      'joined_space': 'joined the space',
      'started_session': 'started studying',
      'ended_session': 'finished studying',
      'sent_message': 'sent a message',
    };
    return actionMap[action] || action.replace('_', ' ');
  };

  // Format timestamp
  const formatTime = (timestamp: string) => {
    const now = new Date();
    const time = new Date(timestamp);
    const diffMs = now.getTime() - time.getTime();
    const diffMins = Math.floor(diffMs / (1000 * 60));
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    return `${diffDays}d ago`;
  };

  return (
    <View style={styles.container}>
      <View style={styles.avatar}>
        <Text style={styles.avatarText}>{getInitials(userId)}</Text>
      </View>
      <View style={styles.content}>
        <Text style={styles.actionText}>
          <Text style={styles.userName}>{userId}</Text> {formatAction(action)}
        </Text>
        <Text style={styles.timestamp}>{formatTime(timestamp)}</Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    backgroundColor: Colors.surface,
    borderRadius: 12,
    marginBottom: 8,
    shadowColor: Colors.text,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  avatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: Colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  avatarText: {
    color: Colors.text,
    fontSize: 14,
    fontWeight: 'bold',
  },
  content: {
    flex: 1,
  },
  actionText: {
    fontSize: 14,
    color: Colors.text,
    lineHeight: 18,
  },
  userName: {
    fontWeight: 'bold',
    color: Colors.primary,
  },
  timestamp: {
    fontSize: 12,
    color: Colors.textMuted,
    marginTop: 2,
  },
});

export default ActivityCard;