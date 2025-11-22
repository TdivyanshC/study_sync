import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { useSocket } from '../hooks/useSocket';
import { SocketActivity } from '../../services/socketService';

interface SpaceActivityFeedProps {
  spaceId: string;
  currentUserId: string;
  onActivityPress?: (activity: SocketActivity) => void;
  onRefresh?: () => void;
}

interface FormattedActivity extends SocketActivity {
  formattedTime: string;
  actionDescription: string;
  icon: string;
  color: string;
}

export const SpaceActivityFeed: React.FC<SpaceActivityFeedProps> = ({
  spaceId,
  currentUserId,
  onActivityPress,
  onRefresh
}) => {
  const [activities, setActivities] = useState<FormattedActivity[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [filter, setFilter] = useState<'all' | 'sessions' | 'messages'>('all');
  
  const {
    connectionState,
    joinSpace,
    subscribe,
    clearActivities,
    isInSpace
  } = useSocket({
    autoConnect: true,
    onError: (error) => {
      Alert.alert('Connection Error', 'Failed to receive activity updates');
    }
  });

  // Join space on mount
  useEffect(() => {
    const initializeActivityFeed = async () => {
      setIsLoading(true);
      try {
        if (!isInSpace(spaceId)) {
          await joinSpace(spaceId);
        }
      } catch (error) {
        console.error('Failed to join space for activity feed:', error);
      } finally {
        setIsLoading(false);
      }
    };

    initializeActivityFeed();

    return () => {
      clearActivities(spaceId);
    };
  }, [spaceId]);

  // Subscribe to activity updates
  useEffect(() => {
    const unsubscribers = [
      subscribe('activity_received', (activity: SocketActivity) => {
        if (activity.space_id === spaceId) {
          const formattedActivity = formatActivity(activity);
          setActivities(prev => {
            // Avoid duplicates
            if (prev.some(act => act.id === activity.id)) {
              return prev;
            }
            const newActivities = [formattedActivity, ...prev];
            
            // Keep only last 50 activities for performance
            if (newActivities.length > 50) {
              return newActivities.slice(0, 50);
            }
            
            return newActivities;
          });
        }
      }),
      subscribe('user_started_session', (data) => {
        if (data.space_id === spaceId) {
          // Create activity for session start
          const sessionActivity: FormattedActivity = {
            id: `session_start_${data.session_id}`,
            space_id: spaceId,
            user_id: data.user_id,
            username: data.username,
            action: 'session_started',
            subject: data.subject,
            session_id: data.session_id,
            created_at: data.timestamp,
            timestamp: data.timestamp,
            formattedTime: formatTimeAgo(data.timestamp),
            actionDescription: `started studying ${data.subject}`,
            icon: '📚',
            color: '#4CAF50'
          };
          
          setActivities(prev => [sessionActivity, ...prev].slice(0, 50));
        }
      }),
      subscribe('user_stopped_session', (data) => {
        if (data.space_id === spaceId) {
          // Create activity for session end
          const sessionActivity: FormattedActivity = {
            id: `session_stop_${data.session_id}`,
            space_id: spaceId,
            user_id: data.user_id,
            username: data.username,
            action: 'session_stopped',
            progress: data.completed ? 100 : Math.floor((data.actual_duration / data.planned_duration) * 100),
            created_at: data.timestamp,
            timestamp: data.timestamp,
            formattedTime: formatTimeAgo(data.timestamp),
            actionDescription: `${data.completed ? 'completed' : 'stopped'} a ${data.planned_duration}min session`,
            icon: data.completed ? '✅' : '⏹️',
            color: data.completed ? '#4CAF50' : '#FF9800'
          };
          
          setActivities(prev => [sessionActivity, ...prev].slice(0, 50));
        }
      }),
      subscribe('new_message', (data) => {
        if (data.space_id === spaceId && data.message_type === 'text') {
          // Create activity for new message
          const messageActivity: FormattedActivity = {
            id: `message_${data.id}`,
            space_id: spaceId,
            user_id: data.user_id,
            username: data.username,
            action: 'message_sent',
            created_at: data.timestamp,
            timestamp: data.timestamp,
            formattedTime: formatTimeAgo(data.timestamp),
            actionDescription: `sent a message`,
            icon: '💬',
            color: '#2196F3'
          };
          
          setActivities(prev => [messageActivity, ...prev].slice(0, 50));
        }
      })
    ];

    return () => {
      unsubscribers.forEach(unsubscribe => unsubscribe());
    };
  }, [spaceId, subscribe]);

  const formatActivity = (activity: SocketActivity): FormattedActivity => {
    const timeAgo = formatTimeAgo(activity.timestamp);
    
    let description = '';
    let icon = '📋';
    let color = '#666';
    
    switch (activity.action) {
      case 'started_studying':
        description = `started studying ${activity.subject || 'General'}`;
        icon = '📚';
        color = '#4CAF50';
        break;
      case 'paused_study':
        description = 'paused studying';
        icon = '⏸️';
        color = '#FF9800';
        break;
      case 'resumed_study':
        description = 'resumed studying';
        icon = '▶️';
        color = '#4CAF50';
        break;
      case 'break_started':
        description = 'took a break';
        icon = '☕';
        color = '#9C27B0';
        break;
      case 'break_ended':
        description = 'ended break';
        icon = '✅';
        color = '#4CAF50';
        break;
      case 'task_completed':
        description = 'completed a task';
        icon = '✅';
        color = '#4CAF50';
        break;
      case 'focus_session_started':
        description = 'started a focus session';
        icon = '🎯';
        color = '#2196F3';
        break;
      default:
        description = activity.action.replace(/_/g, ' ');
        icon = '📋';
        color = '#666';
    }
    
    return {
      ...activity,
      formattedTime: timeAgo,
      actionDescription: description,
      icon,
      color
    };
  };

  const formatTimeAgo = (timestamp: string): string => {
    const now = new Date();
    const time = new Date(timestamp);
    const diffMs = now.getTime() - time.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    
    return time.toLocaleDateString();
  };

  const handleActivityPress = (activity: FormattedActivity) => {
    onActivityPress?.(activity);
  };

  const handleRefresh = () => {
    setActivities([]);
    onRefresh?.();
  };

  const getFilteredActivities = () => {
    switch (filter) {
      case 'sessions':
        return activities.filter(activity => 
          activity.action.includes('session') || activity.action.includes('study')
        );
      case 'messages':
        return activities.filter(activity => 
          activity.action === 'message_sent'
        );
      default:
        return activities;
    }
  };

  const renderActivity = ({ item: activity }: { item: FormattedActivity }) => (
    <TouchableOpacity
      style={styles.activityItem}
      onPress={() => handleActivityPress(activity)}
      disabled={activity.user_id === currentUserId}
    >
      <View style={styles.activityIcon}>
        <Text style={styles.iconText}>{activity.icon}</Text>
      </View>
      
      <View style={styles.activityContent}>
        <View style={styles.activityHeader}>
          <Text style={styles.username}>
            {activity.username}
            {activity.user_id === currentUserId && ' (You)'}
          </Text>
          <Text style={styles.timestamp}>{activity.formattedTime}</Text>
        </View>
        
        <Text style={styles.activityDescription}>
          {activity.actionDescription}
        </Text>
        
        {activity.subject && (
          <Text style={styles.subjectText}>
            Subject: {activity.subject}
          </Text>
        )}
        
        {activity.progress !== undefined && (
          <View style={styles.progressContainer}>
            <View style={styles.progressBar}>
              <View 
                style={[
                  styles.progressFill, 
                  { width: `${activity.progress}%`, backgroundColor: activity.color }
                ]} 
              />
            </View>
            <Text style={styles.progressText}>{activity.progress}%</Text>
          </View>
        )}
      </View>
    </TouchableOpacity>
  );

  const renderEmptyState = () => (
    <View style={styles.emptyState}>
      <Text style={styles.emptyStateText}>
        {isLoading ? 'Loading activities...' : 'No recent activity'}
      </Text>
      <Text style={styles.emptyStateSubtext}>
        {isLoading ? '' : 'Activity will appear here as it happens'}
      </Text>
    </View>
  );

  if (!connectionState.isConnected) {
    return (
      <View style={styles.container}>
        <Text style={styles.errorText}>Connecting to activity feed...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Activity</Text>
        <View style={styles.headerRight}>
          <TouchableOpacity
            style={styles.refreshButton}
            onPress={handleRefresh}
            disabled={isLoading}
          >
            <Text style={styles.refreshButtonText}>
              {isLoading ? '⟳' : '↻'}
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Filter Tabs */}
      <View style={styles.filterContainer}>
        {[
          { key: 'all', label: 'All' },
          { key: 'sessions', label: 'Study' },
          { key: 'messages', label: 'Chat' }
        ].map(tab => (
          <TouchableOpacity
            key={tab.key}
            style={[
              styles.filterTab,
              filter === tab.key && styles.filterTabActive
            ]}
            onPress={() => setFilter(tab.key as any)}
          >
            <Text style={[
              styles.filterText,
              filter === tab.key && styles.filterTextActive
            ]}>
              {tab.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <FlatList
        data={getFilteredActivities()}
        renderItem={renderActivity}
        keyExtractor={(item) => item.id}
        style={styles.activitiesList}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={!isLoading ? renderEmptyState : null}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: 'white',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  title: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  refreshButton: {
    padding: 4,
    borderRadius: 6,
    backgroundColor: '#f0f0f0',
  },
  refreshButtonText: {
    fontSize: 16,
    color: '#666',
  },
  filterContainer: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  filterTab: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    marginRight: 8,
    backgroundColor: '#f0f0f0',
  },
  filterTabActive: {
    backgroundColor: '#007AFF',
  },
  filterText: {
    fontSize: 14,
    color: '#666',
  },
  filterTextActive: {
    color: 'white',
    fontWeight: '500',
  },
  activitiesList: {
    flex: 1,
    paddingHorizontal: 16,
  },
  activityItem: {
    flexDirection: 'row',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f5f5f5',
  },
  activityIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#f0f0f0',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  iconText: {
    fontSize: 18,
  },
  activityContent: {
    flex: 1,
  },
  activityHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  username: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
  },
  timestamp: {
    fontSize: 12,
    color: '#999',
  },
  activityDescription: {
    fontSize: 14,
    color: '#666',
    marginBottom: 2,
  },
  subjectText: {
    fontSize: 12,
    color: '#007AFF',
    fontStyle: 'italic',
  },
  progressContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 6,
  },
  progressBar: {
    flex: 1,
    height: 4,
    backgroundColor: '#e0e0e0',
    borderRadius: 2,
    marginRight: 8,
  },
  progressFill: {
    height: '100%',
    borderRadius: 2,
  },
  progressText: {
    fontSize: 12,
    color: '#666',
    minWidth: 30,
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 40,
  },
  emptyStateText: {
    fontSize: 16,
    color: '#666',
    marginBottom: 4,
  },
  emptyStateSubtext: {
    fontSize: 14,
    color: '#999',
    textAlign: 'center',
  },
  errorText: {
    fontSize: 14,
    color: '#999',
    textAlign: 'center',
    padding: 20,
  },
});