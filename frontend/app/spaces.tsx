import React, { useState, useEffect, useRef, useCallback, Suspense } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Modal,
  TextInput,
  FlatList,
  Animated,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '../constants/Colors';
import { GlobalStyles } from '../constants/Theme';
import { apiService, Space } from '../services/apiService';
import { useStudyStore } from '../hooks/useStudySession';
import { realtimeClient } from '../services/realtimeClient';
import ActivityCard from '../components/ActivityCard';
import ChatInput from '../components/ChatInput';
import BadgePopup from '../components/BadgePopup';
import { DEMO_USER } from '../lib/constants';

// Use real user ID from populated data
const USER_ID = DEMO_USER;

interface ExtendedSpace extends Space {
  isJoined: boolean;
  active: number;
  currentSession: boolean;
  icon: string;
  description?: string;
  members: number;
}

interface SpaceCardProps {
  space: ExtendedSpace;
  onJoin: () => void;
  onEnter: () => void;
  onStartStreak: () => void;
}

const SpaceCard: React.FC<SpaceCardProps> = ({ space, onJoin, onEnter, onStartStreak }) => {
  return (
    <View style={[GlobalStyles.glassCard, styles.spaceCard]}>
      {/* Header */}
      <View style={styles.spaceHeader}>
        <View style={styles.spaceIcon}>
          <Text style={styles.iconText}>{space.icon}</Text>
        </View>
        <View style={styles.spaceInfo}>
          <Text style={styles.spaceName}>{space.name}</Text>
          <Text style={GlobalStyles.textSecondary}>{space.description}</Text>
        </View>
        {space.currentSession && (
          <View style={styles.liveBadge}>
            <Text style={styles.liveText}>LIVE</Text>
          </View>
        )}
      </View>

      {/* Stats */}
      <View style={styles.spaceStats}>
        <View style={styles.statItem}>
          <Ionicons name="people" size={16} color={Colors.textSecondary} />
          <Text style={[GlobalStyles.textSecondary, { marginLeft: 6 }]}>
            {space.members} members
          </Text>
        </View>
        <View style={styles.statItem}>
          <Ionicons 
            name="radio-button-on" 
            size={16} 
            color={space.active > 0 ? Colors.success : Colors.textMuted} 
          />
          <Text style={[GlobalStyles.textSecondary, { marginLeft: 6 }]}>
            {space.active} active now
          </Text>
        </View>
      </View>

      {/* Actions */}
      <View style={styles.spaceActions}>
        {space.isJoined ? (
          <>
            <TouchableOpacity style={styles.primaryButton} onPress={onEnter}>
              <Ionicons name="enter" size={18} color={Colors.text} />
              <Text style={styles.primaryButtonText}>Enter Space</Text>
            </TouchableOpacity>
            
            <TouchableOpacity style={styles.secondaryButton} onPress={onStartStreak}>
              <Ionicons name="flame" size={18} color={Colors.fire} />
              <Text style={[styles.secondaryButtonText, { color: Colors.fire }]}>
                Start Streak
              </Text>
            </TouchableOpacity>
          </>
        ) : (
          <TouchableOpacity style={styles.joinButton} onPress={onJoin}>
            <Ionicons name="add" size={18} color={Colors.primary} />
            <Text style={styles.joinButtonText}>Join Space</Text>
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
};

export default function SpacesScreen() {
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [spaceName, setSpaceName] = useState('');
  const [spaceDescription, setSpaceDescription] = useState('');
  const [spaces, setSpaces] = useState<ExtendedSpace[]>([]);
  const [loading, setLoading] = useState(true);
  const [activityFeed, setActivityFeed] = useState<any[]>([]);
  const [onlineUsers, setOnlineUsers] = useState<string[]>([]);
  const [chatMessages, setChatMessages] = useState<any[]>([]);
  const [selectedSpaceId, setSelectedSpaceId] = useState<string | null>(null);
  const [badgePopup, setBadgePopup] = useState<{ visible: boolean; title: string; description?: string }>({
    visible: false,
    title: '',
    description: ''
  });

  const { showNotification } = useStudyStore();
  const queryClient = useQueryClient();
  const activityAnimations = useRef<{ [key: string]: Animated.Value }>({});

  useEffect(() => {
    // Spaces are loaded via React Query in the useQuery hook below
    console.log('Loading spaces...');

    // Subscribe to badge achievements for current user
    const unsubscribeBadges = realtimeClient.subscribeToBadges(USER_ID, (badge) => {
      setBadgePopup({
        visible: true,
        title: badge.badges.title,
        description: badge.badges.description
      });
    });

    return () => {
      unsubscribeBadges();
      // Clean up all realtime subscriptions when component unmounts
      realtimeClient.unsubscribeAll();
    };
  }, []);

  // Subscribe to activities for all spaces
  useEffect(() => {
    if (!spaces.length) return;

    const unsubscribeActivities: (() => void)[] = [];

    spaces.forEach(space => {
      const unsubscribe = realtimeClient.subscribeToActivity(space.id, (activity) => {
        // Create fade-in animation for new activity
        const animKey = `${activity.id}_${Date.now()}`;
        activityAnimations.current[animKey] = new Animated.Value(0);

        setActivityFeed(prev => {
          const newFeed = [activity, ...prev].slice(0, 10); // Keep only latest 10
          return newFeed;
        });

        // Animate in
        Animated.timing(activityAnimations.current[animKey], {
          toValue: 1,
          duration: 500,
          useNativeDriver: true,
        }).start();
      });
      unsubscribeActivities.push(unsubscribe);
    });

    return () => {
      unsubscribeActivities.forEach(unsubscribe => unsubscribe());
    };
  }, [spaces.map(s => s.id).join(',')]); // Only re-subscribe when space IDs change

  // Use React Query for caching spaces data
  const { data: spacesData, isLoading: spacesLoading, error: spacesError } = useQuery({
    queryKey: ['userSpaces', USER_ID],
    queryFn: async () => {
      console.time('fetchSpaces');
      const userSpaces = await apiService.getUserSpaces(USER_ID);
      console.timeEnd('fetchSpaces');

      // Transform spaces to include UI properties
      const extendedSpaces: ExtendedSpace[] = userSpaces.map(space => ({
        ...space,
        isJoined: true, // Since these are user's spaces
        active: Math.floor(Math.random() * 10), // Mock active users
        currentSession: Math.random() > 0.5, // Mock current session
        icon: ['💻', '📐', '⚛️', '🌍', '📚', '🎨'][Math.floor(Math.random() * 6)],
        description: 'Study group space', // Mock description
        members: space.member_count,
      }));

      return extendedSpaces;
    },
    staleTime: 1000 * 60 * 5, // 5 minutes
  });

  // Update local state when query data changes
  useEffect(() => {
    if (spacesData) {
      setSpaces(spacesData);
    }
    setLoading(spacesLoading);
    if (spacesError) {
      console.error('Failed to load spaces:', spacesError);
      showNotification('Failed to load spaces', 'warning');
    }
  }, [spacesData, spacesLoading, spacesError, showNotification]);

  const handleJoinSpace = useCallback(async (spaceId: string) => {
    try {
      await apiService.joinSpace(spaceId, USER_ID);

      // Log activity to space_activity table
      await apiService.logSpaceActivity(spaceId, USER_ID, 'joined_space');

      showNotification('Successfully joined space!', 'success');
      // Invalidate React Query cache to refetch spaces
      queryClient.invalidateQueries({ queryKey: ['userSpaces', USER_ID] });
    } catch (error) {
      console.error('Failed to join space:', error);
      showNotification('Failed to join space', 'warning');
    }
  }, [showNotification]);

  // Subscribe to current space realtime events
  useEffect(() => {
    if (!selectedSpaceId) return;

    const unsubscribeChat = realtimeClient.subscribeToChat(selectedSpaceId, (chat) => {
      setChatMessages(prev => [...prev, chat].slice(-20)); // Keep last 20 messages
    });

    const unsubscribePresence = realtimeClient.trackPresence(
      selectedSpaceId,
      USER_ID,
      (onlineUsers) => setOnlineUsers(onlineUsers)
    );

    return () => {
      unsubscribeChat();
      unsubscribePresence();
    };
  }, [selectedSpaceId]);

  const handleEnterSpace = useCallback((spaceId: string) => {
    console.log('Entering space:', spaceId);
    setSelectedSpaceId(spaceId);
    setChatMessages([]);
    setOnlineUsers([]);
  }, []);

  const handleSendMessage = useCallback(async (message: string) => {
    if (!selectedSpaceId) return;

    try {
      await apiService.sendChatMessage(selectedSpaceId, USER_ID, message);
      // Message will appear via realtime subscription
    } catch (error) {
      console.error('Failed to send message:', error);
      showNotification('Failed to send message', 'warning');
    }
  }, [selectedSpaceId, showNotification]);

  const handleStartStreak = useCallback((spaceId: string) => {
    // TODO: Start timer in this space and log activity
    console.log('Starting streak in space:', spaceId);

    // Could log activity when starting a session
    // await apiService.logSpaceActivity(spaceId, USER_ID, 'started_session');
  }, []);

  const handleCreateSpace = useCallback(async () => {
    try {
      await apiService.createSpace({
        name: spaceName,
        created_by: USER_ID,
        visibility: 'public',
      });

      showNotification('Space created successfully!', 'success');
      setShowCreateModal(false);
      setSpaceName('');
      setSpaceDescription('');
      // Invalidate React Query cache to refetch spaces
      queryClient.invalidateQueries({ queryKey: ['userSpaces', USER_ID] });
    } catch (error) {
      console.error('Failed to create space:', error);
      showNotification('Failed to create space', 'warning');
    }
  }, [spaceName, showNotification, queryClient]);

  const renderSpaceCard = useCallback(({ item }: { item: ExtendedSpace }) => (
    <SpaceCard
      space={item}
      onJoin={() => handleJoinSpace(item.id)}
      onEnter={() => handleEnterSpace(item.id)}
      onStartStreak={() => handleStartStreak(item.id)}
    />
  ), [handleJoinSpace, handleEnterSpace, handleStartStreak]);

  return (
    <SafeAreaView style={GlobalStyles.safeArea}>
      <StatusBar style="light" backgroundColor={Colors.background} />
      
      {/* Header */}
      <View style={styles.header}>
        <Text style={[GlobalStyles.title, { fontSize: 32, color: 'red' }]}>SPACES SCREEN</Text>
        <Text style={GlobalStyles.title}>Study Spaces</Text>
        <Text style={GlobalStyles.textSecondary}>
          Join groups and study together
        </Text>

        {/* Online Users Indicator */}
        <View style={styles.onlineIndicator}>
          <Ionicons
            name="people"
            size={16}
            color={onlineUsers.length > 0 ? Colors.success : Colors.textMuted}
          />
          <Text style={[GlobalStyles.textMuted, { marginLeft: 6 }]}>
            {onlineUsers.length} online
          </Text>

          {/* Online User Avatars */}
          {onlineUsers.length > 0 && (
            <View style={styles.onlineAvatars}>
              {onlineUsers.slice(0, 3).map((userId, index) => (
                <View key={userId} style={[styles.onlineAvatar, { marginLeft: index > 0 ? -8 : 0 }]}>
                  <Text style={styles.onlineAvatarText}>
                    {userId.charAt(0).toUpperCase()}
                  </Text>
                  <View style={styles.onlineDot} />
                </View>
              ))}
              {onlineUsers.length > 3 && (
                <View style={[styles.onlineAvatar, styles.onlineAvatarMore]}>
                  <Text style={styles.onlineAvatarText}>
                    +{onlineUsers.length - 3}
                  </Text>
                </View>
              )}
            </View>
          )}
        </View>
      </View>

      {/* Create Space Button */}
      <TouchableOpacity 
        style={[GlobalStyles.glassCard, styles.createButton]}
        onPress={() => setShowCreateModal(true)}
      >
        <Ionicons name="add-circle" size={32} color={Colors.primary} />
        <Text style={styles.createButtonText}>Create New Space</Text>
        <Text style={GlobalStyles.textMuted}>
          Start your own study group
        </Text>
      </TouchableOpacity>

      {/* Activity Feed */}
      {activityFeed.length > 0 && (
        <View style={[GlobalStyles.glassCard, { marginHorizontal: 16, marginBottom: 16 }]}>
          <Text style={[GlobalStyles.subtitle, { marginBottom: 12 }]}>Live Activity</Text>
          <ScrollView style={{ maxHeight: 200 }}>
            {activityFeed.slice(0, 5).map((activity, index) => {
              const animKey = `${activity.id}_${activity.created_at}`;
              const opacity = activityAnimations.current[animKey] || new Animated.Value(1);

              return (
                <Animated.View key={`${activity.id}_${index}`} style={{ opacity }}>
                  <ActivityCard
                    userId={activity.user_id}
                    action={activity.action}
                    timestamp={activity.created_at}
                  />
                </Animated.View>
              );
            })}
          </ScrollView>
        </View>
      )}

      {/* Chat Section */}
      {selectedSpaceId && (
        <View style={[GlobalStyles.glassCard, { marginHorizontal: 16, marginBottom: 16, flex: 1 }]}>
          <Text style={[GlobalStyles.subtitle, { marginBottom: 12 }]}>
            Space Chat
          </Text>

          {/* Chat Messages */}
          <ScrollView style={{ maxHeight: 200, marginBottom: 12 }}>
            {chatMessages.map((message, index) => (
              <View key={index} style={styles.messageItem}>
                <View style={styles.messageHeader}>
                  <Text style={styles.messageUser}>{message.user_id}</Text>
                  <Text style={styles.messageTime}>
                    {new Date(message.created_at).toLocaleTimeString()}
                  </Text>
                </View>
                <Text style={styles.messageText}>{message.message}</Text>
              </View>
            ))}
          </ScrollView>

          {/* Chat Input */}
          <ChatInput onSendMessage={handleSendMessage} />
        </View>
      )}

      {/* Spaces List */}
      <FlatList
        data={spaces}
        renderItem={renderSpaceCard}
        keyExtractor={(item) => item.id}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 100 }}
        ListEmptyComponent={
          !loading ? (
            <View style={styles.emptyState}>
              <Text style={styles.emptyText}>No spaces yet</Text>
              <Text style={GlobalStyles.textMuted}>Create your first study space!</Text>
            </View>
          ) : null
        }
      />

      {/* Create Space Modal */}
      <Modal
        visible={showCreateModal}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setShowCreateModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Create New Space</Text>
              <TouchableOpacity onPress={() => setShowCreateModal(false)}>
                <Ionicons name="close" size={24} color={Colors.textSecondary} />
              </TouchableOpacity>
            </View>

            <TextInput
              style={styles.input}
              placeholder="Space name"
              placeholderTextColor={Colors.textMuted}
              value={spaceName}
              onChangeText={setSpaceName}
            />

            <TextInput
              style={[styles.input, styles.textArea]}
              placeholder="Description (optional)"
              placeholderTextColor={Colors.textMuted}
              value={spaceDescription}
              onChangeText={setSpaceDescription}
              multiline
              numberOfLines={3}
            />

            <View style={styles.modalActions}>
              <TouchableOpacity 
                style={styles.cancelButton}
                onPress={() => setShowCreateModal(false)}
              >
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>

              <TouchableOpacity 
                style={[
                  styles.createModalButton,
                  { opacity: spaceName.trim() ? 1 : 0.5 }
                ]}
                onPress={handleCreateSpace}
                disabled={!spaceName.trim()}
              >
                <Text style={styles.createModalButtonText}>Create</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Badge Achievement Popup */}
      <BadgePopup
        visible={badgePopup.visible}
        badgeTitle={badgePopup.title}
        badgeDescription={badgePopup.description}
        onClose={() => setBadgePopup({ visible: false, title: '', description: '' })}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  header: {
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 16,
    alignItems: 'center',
  },
  createButton: {
    alignItems: 'center',
    paddingVertical: 24,
    marginHorizontal: 16,
    marginBottom: 20,
  },
  createButtonText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: Colors.text,
    marginTop: 8,
    marginBottom: 4,
  },
  spaceCard: {
    marginBottom: 16,
  },
  spaceHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 16,
  },
  spaceIcon: {
    width: 48,
    height: 48,
    borderRadius: 12,
    backgroundColor: Colors.surfaceElevated,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 16,
  },
  iconText: {
    fontSize: 24,
  },
  spaceInfo: {
    flex: 1,
  },
  spaceName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: Colors.text,
    marginBottom: 4,
  },
  liveBadge: {
    backgroundColor: Colors.error,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  liveText: {
    color: Colors.text,
    fontSize: 10,
    fontWeight: 'bold',
  },
  spaceStats: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  statItem: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  spaceActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  primaryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.primary,
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 12,
    flex: 0.48,
    justifyContent: 'center',
  },
  primaryButtonText: {
    color: Colors.text,
    fontSize: 14,
    fontWeight: '600',
    marginLeft: 6,
  },
  secondaryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 107, 53, 0.1)',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 12,
    flex: 0.48,
    justifyContent: 'center',
  },
  secondaryButtonText: {
    fontSize: 14,
    fontWeight: '600',
    marginLeft: 6,
  },
  joinButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(99, 102, 241, 0.1)',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 12,
    flex: 1,
    justifyContent: 'center',
  },
  joinButtonText: {
    color: Colors.primary,
    fontSize: 14,
    fontWeight: '600',
    marginLeft: 6,
  },
  // Modal Styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: Colors.surface,
    borderRadius: 20,
    padding: 24,
    width: '90%',
    maxWidth: 400,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 24,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: Colors.text,
  },
  input: {
    backgroundColor: Colors.surfaceElevated,
    borderRadius: 12,
    padding: 16,
    color: Colors.text,
    fontSize: 16,
    marginBottom: 16,
  },
  textArea: {
    height: 80,
    textAlignVertical: 'top',
  },
  modalActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 16,
  },
  cancelButton: {
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 12,
    backgroundColor: Colors.surfaceElevated,
    flex: 0.45,
    alignItems: 'center',
  },
  cancelButtonText: {
    color: Colors.textSecondary,
    fontSize: 16,
    fontWeight: '600',
  },
  createModalButton: {
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 12,
    backgroundColor: Colors.primary,
    flex: 0.45,
    alignItems: 'center',
  },
  createModalButtonText: {
    color: Colors.text,
    fontSize: 16,
    fontWeight: '600',
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 40,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: Colors.text,
    marginBottom: 8,
  },
  activityItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: Colors.surfaceElevated,
  },
  activityText: {
    fontSize: 14,
    color: Colors.text,
    flex: 1,
  },
  onlineIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
  },
  messageItem: {
    backgroundColor: Colors.surfaceElevated,
    borderRadius: 12,
    padding: 12,
    marginBottom: 8,
  },
  messageHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  messageUser: {
    fontSize: 14,
    fontWeight: 'bold',
    color: Colors.primary,
  },
  messageTime: {
    fontSize: 12,
    color: Colors.textMuted,
  },
  messageText: {
    fontSize: 14,
    color: Colors.text,
    lineHeight: 18,
  },
  onlineAvatars: {
    flexDirection: 'row',
    marginLeft: 12,
  },
  onlineAvatar: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: Colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: Colors.surface,
  },
  onlineAvatarText: {
    fontSize: 10,
    fontWeight: 'bold',
    color: Colors.text,
  },
  onlineAvatarMore: {
    backgroundColor: Colors.surfaceElevated,
  },
  onlineDot: {
    position: 'absolute',
    bottom: -2,
    right: -2,
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: Colors.success,
    borderWidth: 1,
    borderColor: Colors.surface,
  },
});