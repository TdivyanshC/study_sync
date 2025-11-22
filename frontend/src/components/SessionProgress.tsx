import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Animated,
  Alert,
} from 'react-native';
import { useSocket } from '../hooks/useSocket';
import { SocketSession } from '../../services/socketService';

interface SessionProgressProps {
  spaceId?: string;
  currentUserId: string;
  onSessionPress?: (session: SocketSession) => void;
  onRefresh?: () => void;
}

interface FormattedSession extends SocketSession {
  timeElapsed: number;
  timeRemainingFormatted: string;
  isActive: boolean;
  progressColor: string;
  statusIcon: string;
}

export const SessionProgress: React.FC<SessionProgressProps> = ({
  spaceId,
  currentUserId,
  onSessionPress,
  onRefresh
}) => {
  const [sessions, setSessions] = useState<FormattedSession[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [timeTick, setTimeTick] = useState(0);
  
  const {
    connectionState,
    activeSessions,
    subscribe,
    getActiveSessions,
    joinSpace,
    isInSpace
  } = useSocket({
    autoConnect: true,
    onError: (error) => {
      Alert.alert('Connection Error', 'Failed to receive session updates');
    }
  });

  // Join space if provided
  useEffect(() => {
    const initializeSessionTracking = async () => {
      if (spaceId && !isInSpace(spaceId)) {
        setIsLoading(true);
        try {
          await joinSpace(spaceId);
        } catch (error) {
          console.error('Failed to join space for session tracking:', error);
        } finally {
          setIsLoading(false);
        }
      }
    };

    initializeSessionTracking();
  }, [spaceId]);

  // Subscribe to session events
  useEffect(() => {
    const unsubscribers = [
      subscribe('user_started_session', (data) => {
        if (!spaceId || data.space_id === spaceId) {
          const formattedSession = formatSessionData(data);
          setSessions(prev => {
            const filtered = prev.filter(s => s.session_id !== data.session_id);
            return [...filtered, formattedSession];
          });
        }
      }),
      subscribe('session_progress', (data) => {
        setSessions(prev => prev.map(session => {
          if (session.session_id === data.session_id) {
            return {
              ...session,
              progress: data.progress,
              time_remaining: data.time_remaining,
              efficiency: data.efficiency,
            };
          }
          return session;
        }));
      }),
      subscribe('user_stopped_session', (data) => {
        setSessions(prev => prev.map(session => {
          if (session.session_id === data.session_id) {
            return {
              ...session,
              status: 'stopped',
              completed: data.completed,
              actual_duration: data.actual_duration,
              efficiency: data.efficiency,
            };
          }
          return session;
        }));
      }),
      subscribe('active_sessions', (data) => {
        if (!spaceId || data.space_id === spaceId) {
          const formattedSessions = (data.sessions || []).map(formatSessionData);
          setSessions(formattedSessions);
        }
      })
    ];

    return () => {
      unsubscribers.forEach(unsubscribe => unsubscribe());
    };
  }, [spaceId, subscribe]);

  // Update time every second for real-time countdown
  useEffect(() => {
    const interval = setInterval(() => {
      setTimeTick(prev => prev + 1);
    }, 1000);

    return () => clearInterval(interval);
  }, []);

  // Refresh active sessions periodically
  useEffect(() => {
    if (connectionState.isConnected) {
      const interval = setInterval(() => {
        if (spaceId) {
          getActiveSessions(spaceId);
        }
      }, 30000); // Refresh every 30 seconds

      return () => clearInterval(interval);
    }
  }, [connectionState.isConnected, spaceId, getActiveSessions]);

  const formatSessionData = (data: any): FormattedSession => {
    const startTime = new Date(data.start_time);
    const now = new Date();
    const timeElapsed = Math.floor((now.getTime() - startTime.getTime()) / 1000);
    
    const timeRemaining = data.time_remaining || (data.duration * 60 - timeElapsed);
    const timeRemainingFormatted = formatTimeRemaining(timeRemaining);
    
    const progress = data.progress || Math.min(100, (timeElapsed / (data.duration * 60)) * 100);
    
    let progressColor = '#4CAF50';
    if (data.efficiency) {
      if (data.efficiency >= 90) progressColor = '#4CAF50';
      else if (data.efficiency >= 70) progressColor = '#FF9800';
      else progressColor = '#F44336';
    }

    return {
      ...data,
      timeElapsed,
      timeRemainingFormatted,
      isActive: data.status === 'active',
      progressColor,
      statusIcon: getStatusIcon(data.status),
    };
  };

  const formatTimeRemaining = (seconds: number): string => {
    if (seconds <= 0) return '00:00';
    
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const getStatusIcon = (status: string): string => {
    switch (status) {
      case 'active':
        return '▶️';
      case 'paused':
        return '⏸️';
      case 'completed':
        return '✅';
      case 'stopped':
        return '⏹️';
      default:
        return '❓';
    }
  };

  const handleSessionPress = (session: FormattedSession) => {
    onSessionPress?.(session);
  };

  const handleRefresh = () => {
    if (spaceId) {
      getActiveSessions(spaceId);
    }
    onRefresh?.();
  };

  const renderSession = ({ item: session }: { item: FormattedSession }) => (
    <TouchableOpacity
      style={[
        styles.sessionItem,
        session.user_id === currentUserId && styles.ownSession
      ]}
      onPress={() => handleSessionPress(session)}
      disabled={session.user_id === currentUserId}
    >
      <View style={styles.sessionHeader}>
        <View style={styles.sessionInfo}>
          <Text style={styles.sessionIcon}>{session.statusIcon}</Text>
          <View style={styles.sessionTextInfo}>
            <Text style={styles.sessionSubject}>{session.subject}</Text>
            <Text style={styles.sessionUser}>
              {session.username}
              {session.user_id === currentUserId && ' (You)'}
            </Text>
          </View>
        </View>
        
        <View style={styles.sessionTime}>
          <Text style={styles.timeRemaining}>
            {session.timeRemainingFormatted}
          </Text>
          <Text style={styles.sessionDuration}>
            / {session.duration}min
          </Text>
        </View>
      </View>

      {/* Progress Bar */}
      <View style={styles.progressContainer}>
        <View style={styles.progressBar}>
          <Animated.View 
            style={[
              styles.progressFill, 
              { 
                width: `${session.progress || 0}%`,
                backgroundColor: session.progressColor 
              }
            ]} 
          />
        </View>
        <Text style={styles.progressText}>
          {Math.floor(session.progress || 0)}%
        </Text>
      </View>

      {/* Session Details */}
      <View style={styles.sessionDetails}>
        {session.efficiency && (
          <View style={styles.detailItem}>
            <Text style={styles.detailLabel}>Efficiency:</Text>
            <Text style={[
              styles.detailValue,
              { color: session.progressColor }
            ]}>
              {session.efficiency}%
            </Text>
          </View>
        )}
        
        <View style={styles.detailItem}>
          <Text style={styles.detailLabel}>Time Elapsed:</Text>
          <Text style={styles.detailValue}>
            {formatTimeRemaining(session.timeElapsed)}
          </Text>
        </View>
        
        <View style={styles.detailItem}>
          <Text style={styles.detailLabel}>Status:</Text>
          <Text style={styles.detailValue}>
            {session.status}
          </Text>
        </View>
      </View>

      {session.isActive && (
        <View style={styles.activeIndicator}>
          <View style={styles.pulseDot} />
          <Text style={styles.activeText}>LIVE</Text>
        </View>
      )}
    </TouchableOpacity>
  );

  const renderEmptyState = () => (
    <View style={styles.emptyState}>
      <Text style={styles.emptyStateText}>
        {isLoading ? 'Loading sessions...' : 'No active sessions'}
      </Text>
      <Text style={styles.emptyStateSubtext}>
        {isLoading ? '' : 'Active study sessions will appear here'}
      </Text>
    </View>
  );

  if (!connectionState.isConnected) {
    return (
      <View style={styles.container}>
        <Text style={styles.errorText}>Connecting to session tracking...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>
          Study Sessions {spaceId && 'in Space'}
        </Text>
        <View style={styles.headerRight}>
          <Text style={styles.count}>
            {sessions.filter(s => s.isActive).length} active
          </Text>
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

      <FlatList
        data={sessions}
        renderItem={renderSession}
        keyExtractor={(item) => item.session_id}
        style={styles.sessionsList}
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
  count: {
    fontSize: 14,
    color: '#666',
    marginRight: 8,
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
  sessionsList: {
    flex: 1,
    paddingHorizontal: 16,
  },
  sessionItem: {
    backgroundColor: '#f9f9f9',
    borderRadius: 12,
    padding: 16,
    marginVertical: 6,
    borderWidth: 1,
    borderColor: '#e0e0e0',
    position: 'relative',
  },
  ownSession: {
    borderColor: '#007AFF',
    backgroundColor: '#f0f8ff',
  },
  sessionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  sessionInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  sessionIcon: {
    fontSize: 20,
    marginRight: 12,
  },
  sessionTextInfo: {
    flex: 1,
  },
  sessionSubject: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 2,
  },
  sessionUser: {
    fontSize: 14,
    color: '#666',
  },
  sessionTime: {
    alignItems: 'flex-end',
  },
  timeRemaining: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
  },
  sessionDuration: {
    fontSize: 12,
    color: '#999',
  },
  progressContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  progressBar: {
    flex: 1,
    height: 8,
    backgroundColor: '#e0e0e0',
    borderRadius: 4,
    marginRight: 12,
  },
  progressFill: {
    height: '100%',
    borderRadius: 4,
  },
  progressText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    minWidth: 40,
  },
  sessionDetails: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  detailItem: {
    flexDirection: 'row',
    marginRight: 16,
    marginBottom: 4,
  },
  detailLabel: {
    fontSize: 12,
    color: '#666',
    marginRight: 4,
  },
  detailValue: {
    fontSize: 12,
    fontWeight: '500',
    color: '#333',
  },
  activeIndicator: {
    position: 'absolute',
    top: 12,
    right: 12,
    flexDirection: 'row',
    alignItems: 'center',
  },
  pulseDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#4CAF50',
    marginRight: 6,
  },
  activeText: {
    fontSize: 10,
    fontWeight: '600',
    color: '#4CAF50',
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