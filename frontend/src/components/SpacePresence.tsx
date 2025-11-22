import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, Alert } from 'react-native';
import { useSocket } from '../hooks/useSocket';
import { SocketSpacePresence } from '../../services/socketService';

interface User {
  id: string;
  username: string;
  avatar?: string;
  status: 'online' | 'away' | 'offline';
  last_seen?: string;
}

interface SpacePresenceProps {
  spaceId: string;
  currentUserId: string;
  onUserPress?: (user: User) => void;
  onRefresh?: () => void;
}

export const SpacePresence: React.FC<SpacePresenceProps> = ({
  spaceId,
  currentUserId,
  onUserPress,
  onRefresh
}) => {
  const [users, setUsers] = useState<User[]>([]);
  const [presence, setPresence] = useState<SocketSpacePresence | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  
  const {
    connectionState,
    joinSpace,
    leaveSpace,
    getSpacePresence,
    subscribe,
    isInSpace
  } = useSocket({
    autoConnect: true,
    onError: (error) => {
      Alert.alert('Connection Error', 'Failed to connect to real-time features');
    }
  });

  // Join space on mount
  useEffect(() => {
    const initializeSpace = async () => {
      setIsLoading(true);
      try {
        if (!isInSpace(spaceId)) {
          await joinSpace(spaceId);
        }
        getSpacePresence(spaceId);
      } catch (error) {
        console.error('Failed to join space:', error);
      } finally {
        setIsLoading(false);
      }
    };

    initializeSpace();

    return () => {
      // Cleanup will be handled by the hook
    };
  }, [spaceId]);

  // Subscribe to presence updates
  useEffect(() => {
    const unsubscribers = [
      subscribe('space_presence', (data: SocketSpacePresence) => {
        if (data.space_id === spaceId) {
          setPresence(data);
          fetchUserDetails(data.online_users);
        }
      }),
      subscribe('user_joined_space', (data) => {
        if (data.space_id === spaceId) {
          getSpacePresence(spaceId); // Refresh presence
        }
      }),
      subscribe('user_left_space', (data) => {
        if (data.space_id === spaceId) {
          getSpacePresence(spaceId); // Refresh presence
        }
      })
    ];

    return () => {
      unsubscribers.forEach(unsubscribe => unsubscribe());
    };
  }, [spaceId, subscribe]);

  // Fetch user details for online users
  const fetchUserDetails = async (userIds: string[]) => {
    try {
      // This would typically fetch from your API
      // For now, we'll create mock user data
      const mockUsers: User[] = userIds.map(userId => ({
        id: userId,
        username: `User_${userId.slice(0, 8)}`,
        status: 'online'
      }));
      setUsers(mockUsers);
    } catch (error) {
      console.error('Failed to fetch user details:', error);
    }
  };

  const handleRefresh = () => {
    getSpacePresence(spaceId);
    onRefresh?.();
  };

  const handleUserPress = (user: User) => {
    onUserPress?.(user);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'online':
        return '#4CAF50';
      case 'away':
        return '#FF9800';
      case 'offline':
        return '#9E9E9E';
      default:
        return '#9E9E9E';
    }
  };

  const renderUser = ({ item: user }: { item: User }) => (
    <TouchableOpacity
      style={styles.userItem}
      onPress={() => handleUserPress(user)}
      disabled={user.id === currentUserId}
    >
      <View style={styles.avatarContainer}>
        <View 
          style={[
            styles.statusIndicator, 
            { backgroundColor: getStatusColor(user.status) }
          ]} 
        />
        <Text style={styles.avatarText}>
          {user.username.charAt(0).toUpperCase()}
        </Text>
      </View>
      <View style={styles.userInfo}>
        <Text style={styles.username}>
          {user.username}
          {user.id === currentUserId && ' (You)'}
        </Text>
        <Text style={styles.statusText}>{user.status}</Text>
      </View>
    </TouchableOpacity>
  );

  if (!connectionState.isConnected) {
    return (
      <View style={styles.container}>
        <Text style={styles.errorText}>Connecting to real-time features...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Online Members</Text>
        <View style={styles.headerRight}>
          <Text style={styles.count}>
            {presence?.total_online || 0} online
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

      {presence && presence.online_users.length > 0 ? (
        <FlatList
          data={users}
          renderItem={renderUser}
          keyExtractor={(item) => item.id}
          style={styles.list}
          showsVerticalScrollIndicator={false}
        />
      ) : (
        <View style={styles.emptyState}>
          <Text style={styles.emptyText}>
            {isLoading ? 'Loading...' : 'No users currently online'}
          </Text>
        </View>
      )}

      {presence && (
        <Text style={styles.timestamp}>
          Last updated: {new Date(presence.timestamp).toLocaleTimeString()}
        </Text>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 16,
    margin: 16,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
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
  list: {
    maxHeight: 200,
  },
  userItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 4,
  },
  avatarContainer: {
    position: 'relative',
    marginRight: 12,
  },
  avatarText: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#e0e0e0',
    textAlign: 'center',
    lineHeight: 40,
    fontSize: 16,
    fontWeight: '600',
    color: '#666',
  },
  statusIndicator: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 12,
    height: 12,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: 'white',
  },
  userInfo: {
    flex: 1,
  },
  username: {
    fontSize: 16,
    fontWeight: '500',
    color: '#333',
  },
  statusText: {
    fontSize: 12,
    color: '#666',
    textTransform: 'capitalize',
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 20,
  },
  emptyText: {
    fontSize: 14,
    color: '#999',
    textAlign: 'center',
  },
  timestamp: {
    fontSize: 12,
    color: '#999',
    textAlign: 'center',
    marginTop: 12,
    fontStyle: 'italic',
  },
  errorText: {
    fontSize: 14,
    color: '#999',
    textAlign: 'center',
    padding: 20,
  },
});