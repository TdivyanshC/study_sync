import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  FlatList,
  TextInput,
  Alert,
  ActivityIndicator,
  Image,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '../../constants/Colors';
import { GlobalStyles } from '../../constants/Theme';
import { useAuth } from '../../hooks/useAuth';
import { router } from 'expo-router';
import { friendsService, UserSearchResult, FriendListItem, FriendStats } from '../../src/services/friendsService';

interface FriendCardProps {
  friend: FriendListItem;
  onRemoveFriend: (friendUserId: string) => void;
  onViewProfile: (friendUserId: string) => void;
  onChallengeFriend: (friendUserId: string) => void;
  onMotivateFriend: (friendUserId: string) => void;
}

const FriendCard: React.FC<FriendCardProps> = ({ friend, onRemoveFriend, onViewProfile, onChallengeFriend, onMotivateFriend }) => {
  const getActivityIcon = (activity?: string) => {
    return friendsService.getActivityIcon(activity);
  };

  const getActivityColor = (activity?: string) => {
    return friendsService.getActivityColor(activity);
  };

  const formatHours = (hours: number) => {
    return friendsService.formatHours(hours);
  };

  const getActivityDescription = (activity?: string) => {
    return friendsService.getActivityDescription(activity);
  };

  return (
    <View style={[styles.friendCard, {
      borderLeftWidth: 3,
      borderLeftColor: getActivityColor(friend.current_activity)
    }]}>
      {/* Header with avatar and name */}
      <View style={styles.friendHeader}>
        <View style={styles.avatarContainer}>
          {friend.avatar_url ? (
            <Image source={{ uri: friend.avatar_url }} style={styles.avatar} />
          ) : (
            <View style={[styles.avatarPlaceholder, { backgroundColor: getActivityColor(friend.current_activity) }]}>
              <Text style={styles.avatarText}>
                {(friend.display_name || friend.username).charAt(0).toUpperCase()}
              </Text>
            </View>
          )}
        </View>
        
        <View style={styles.friendInfo}>
          <Text style={styles.friendName}>
            {friend.display_name || friend.username}
          </Text>
          <Text style={styles.friendUsername}>@{friend.username}</Text>
          
          {/* Activity and stats */}
          <View style={styles.activityRow}>
            <Ionicons 
              name={getActivityIcon(friend.current_activity) as any} 
              size={14} 
              color={getActivityColor(friend.current_activity)} 
            />
            <Text style={[styles.activityText, { color: getActivityColor(friend.current_activity) }]}>
              {getActivityDescription(friend.current_activity)}
            </Text>
          </View>
        </View>

        <TouchableOpacity 
          style={styles.moreButton}
          onPress={() => onViewProfile(friend.user_id)}
        >
          <Ionicons name="ellipsis-horizontal" size={20} color={Colors.textSecondary} />
        </TouchableOpacity>
      </View>

      {/* Stats Row */}
      <View style={styles.statsRow}>
        <View style={styles.statItem}>
          <Text style={styles.statValue}>{friend.xp.toLocaleString()}</Text>
          <Text style={styles.statLabel}>XP</Text>
        </View>
        
        <View style={styles.statDivider} />
        
        <View style={styles.statItem}>
          <Text style={styles.statValue}>Lv.{friend.level}</Text>
          <Text style={styles.statLabel}>Level</Text>
        </View>
        
        <View style={styles.statDivider} />
        
        <View style={styles.statItem}>
          <Text style={styles.statValue}>{formatHours(friend.total_hours_today)}</Text>
          <Text style={styles.statLabel}>Today</Text>
        </View>
      </View>

      {/* Activity started */}
      {friend.activity_started_at && (
        <Text style={styles.activityStarted}>
          Started {new Date(friend.activity_started_at).toLocaleTimeString()}
        </Text>
      )}

      {/* Actions */}
      <View style={styles.actionsRow}>
        <TouchableOpacity 
          style={styles.actionButton}
          onPress={() => onChallengeFriend(friend.user_id)}
        >
          <Ionicons name="trophy-outline" size={16} color={Colors.accent} />
          <Text style={[styles.actionText, { color: Colors.accent }]}>Challenge</Text>
        </TouchableOpacity>

        <TouchableOpacity 
          style={styles.actionButton}
          onPress={() => onMotivateFriend(friend.user_id)}
        >
          <Ionicons name="heart-outline" size={16} color={Colors.fire} />
          <Text style={[styles.actionText, { color: Colors.fire }]}>Motivate</Text>
        </TouchableOpacity>

        <TouchableOpacity 
          style={styles.actionButton}
          onPress={() => onViewProfile(friend.user_id)}
        >
          <Ionicons name="person-outline" size={16} color={Colors.primary} />
          <Text style={styles.actionText}>Profile</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

interface SearchResultCardProps {
  user: UserSearchResult;
  onAddFriend: (friendUserId: string) => void;
}

const SearchResultCard: React.FC<SearchResultCardProps> = ({ user, onAddFriend }) => {
  const getActivityIcon = (activity?: string) => {
    return friendsService.getActivityIcon(activity);
  };

  const getActivityColor = (activity?: string) => {
    return friendsService.getActivityColor(activity);
  };

  const formatHours = (hours: number) => {
    return friendsService.formatHours(hours);
  };

  return (
    <View style={styles.searchResultCard}>
      <View style={styles.searchResultHeader}>
        <View style={styles.searchResultInfo}>
          <Text style={styles.searchResultName}>
            {user.display_name || user.username}
          </Text>
          <Text style={styles.searchResultUsername}>
            @{user.username} • ID: {user.user_id}
          </Text>
          
          <View style={styles.searchResultStats}>
            <Text style={styles.searchResultStat}>
              {user.xp} XP • Lv.{user.level} • {formatHours(user.total_hours_today)} today
            </Text>
          </View>
          
          {user.current_activity && (
            <View style={styles.searchResultActivity}>
              <Ionicons 
                name={getActivityIcon(user.current_activity) as any} 
                size={12} 
                color={getActivityColor(user.current_activity)} 
              />
              <Text style={[styles.searchResultActivityText, { color: getActivityColor(user.current_activity) }]}>
                {friendsService.getActivityDescription(user.current_activity)}
              </Text>
            </View>
          )}
        </View>

        <View style={styles.searchResultActions}>
          {!user.is_friend ? (
            <TouchableOpacity 
              style={styles.addFriendButton}
              onPress={() => onAddFriend(user.user_id)}
            >
              <Ionicons name="person-add" size={16} color={Colors.text} />
              <Text style={styles.addFriendText}>Add Friend</Text>
            </TouchableOpacity>
          ) : (
            <View style={styles.friendBadge}>
              <Ionicons name="checkmark-circle" size={16} color={Colors.success} />
              <Text style={styles.friendBadgeText}>Friends</Text>
            </View>
          )}
        </View>
      </View>
    </View>
  );
};

export default function FriendsScreen() {
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<UserSearchResult[]>([]);
  const [friendsList, setFriendsList] = useState<FriendListItem[]>([]);
  const [friendStats, setFriendStats] = useState<FriendStats | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isSearching, setIsSearching] = useState(false);
  const [activeTab, setActiveTab] = useState<'friends' | 'search'>('friends');

  // Get current user from auth - uses MongoDB ObjectId
  const { user } = useAuth();
  const currentUserId = user?.id;
  console.log('🔍 Friends page userId:', currentUserId);
  console.log('🔍 Is MongoDB ObjectId?', /^[a-f0-9]{24}$/.test(currentUserId || ''));
  console.log('🔍 Is UUID (Supabase)?', /^[0-9a-f]{8}-/.test(currentUserId || ''));

  // Redirect to login if not authenticated
  useEffect(() => {
    if (!user) {
      console.log('No authenticated user, redirecting to login');
      router.replace('/login');
      return;
    }
  }, [user]);

  useEffect(() => {
    if (!currentUserId) return;
    loadFriendsData();
  }, [currentUserId]);

  const loadFriendsData = async () => {
    if (!currentUserId) return;
    setIsLoading(true);
    try {
      const response = await friendsService.getAllUsers(currentUserId);
      if (response.success) {
        setFriendsList(response.users || response.results || response.data || []);
      }
    } catch (error) {
      console.error('Error loading users:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSearch = async () => {
    if (!searchQuery.trim() || !currentUserId) return;

    setIsSearching(true);
    try {
      const response = await friendsService.searchUsers(searchQuery, currentUserId, 20);
      if (response.success) {
        setSearchResults(response.results);
      }
    } catch (error) {
      console.error('Error searching users:', error);
      Alert.alert('Error', 'Failed to search users');
    } finally {
      setIsSearching(false);
    }
  };

  const handleAddFriend = async (friendUserId: string) => {
    if (!currentUserId) return;
    try {
      const response = await friendsService.addFriend(currentUserId, friendUserId);
      if (response.success) {
        Alert.alert('Success', response.message);
        // Refresh search results and friends list
        await loadFriendsData();
        if (searchQuery) {
          await handleSearch();
        }
      } else {
        Alert.alert('Error', response.message);
      }
    } catch (error) {
      console.error('Error adding friend:', error);
      Alert.alert('Error', 'Failed to add friend');
    }
  };

  const handleRemoveFriend = async (friendUserId: string) => {
    Alert.alert(
      'Remove Friend',
      'Are you sure you want to remove this friend?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Remove',
          style: 'destructive',
          onPress: async () => {
            if (!currentUserId) return;
            try {
              const response = await friendsService.removeFriend(currentUserId, friendUserId);
              if (response.success) {
                Alert.alert('Success', response.message);
                await loadFriendsData();
              } else {
                Alert.alert('Error', response.message);
              }
            } catch (error) {
              console.error('Error removing friend:', error);
              Alert.alert('Error', 'Failed to remove friend');
            }
          },
        },
      ]
    );
  };

  const handleViewProfile = (friendUserId: string) => {
    // Navigate to friend profile screen
    router.push({
      pathname: '/profile',
      params: { userId: friendUserId, isFriendProfile: 'true' }
    });
  };

  const handleChallengeFriend = (friendUserId: string) => {
    // Show challenge options
    Alert.alert(
      'Challenge Friend',
      'What type of challenge would you like to send?',
      [
        {
          text: 'Study Session Challenge',
          onPress: () => {
            Alert.alert('Challenge Sent!', 'Your friend has been invited to a study session!');
            // Could navigate to timer with challenge context
            // router.push({ pathname: '/timer', params: { challengeId: friendUserId } });
          }
        },
        {
          text: 'Streak Battle',
          onPress: () => {
            Alert.alert('Challenge Sent!', 'Your friend has been challenged to a streak battle!');
          }
        },
        {
          text: 'XP Race',
          onPress: () => {
            Alert.alert('Challenge Sent!', 'Your friend has been challenged to an XP race!');
          }
        },
        { text: 'Cancel', style: 'cancel' }
      ]
    );
  };

  const handleMotivateFriend = (friendUserId: string) => {
    // Show motivation options
    Alert.alert(
      'Motivate Friend',
      'Send some encouragement!',
      [
        {
          text: '💪 You\'ve got this!',
          onPress: () => sendMotivation(friendUserId, '💪 You\'ve got this!')
        },
        {
          text: '🔥 Keep the streak going!',
          onPress: () => sendMotivation(friendUserId, '🔥 Keep the streak going!')
        },
        {
          text: '🌟 You\'re doing amazing!',
          onPress: () => sendMotivation(friendUserId, '🌟 You\'re doing amazing!')
        },
        {
          text: 'Custom Message',
          onPress: () => showCustomMotivationDialog(friendUserId)
        },
        { text: 'Cancel', style: 'cancel' }
      ]
    );
  };

  const sendMotivation = (friendUserId: string, message: string) => {
    Alert.alert('Motivation Sent!', `You sent: "${message}"`);
    // In a real app, this would send a notification or message to the friend
  };

  const showCustomMotivationDialog = (friendUserId: string) => {
    Alert.prompt(
      'Custom Motivation',
      'Write a personal message of encouragement:',
      [
        {
          text: 'Cancel',
          style: 'cancel'
        },
        {
          text: 'Send',
          onPress: (message) => {
            if (message && message.trim()) {
              sendMotivation(friendUserId, message.trim());
            }
          }
        }
      ],
      'plain-text',
      '',
      'default'
    );
  };

  const renderFriendCard = ({ item }: { item: FriendListItem }) => (
    <FriendCard
      friend={item}
      onRemoveFriend={handleRemoveFriend}
      onViewProfile={handleViewProfile}
      onChallengeFriend={handleChallengeFriend}
      onMotivateFriend={handleMotivateFriend}
    />
  );

  const renderSearchResult = ({ item }: { item: UserSearchResult }) => (
    <SearchResultCard
      user={item}
      onAddFriend={handleAddFriend}
    />
  );

  const renderTabContent = () => {
    if (isLoading) {
      return (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={Colors.primary} />
          <Text style={styles.loadingText}>Loading friends...</Text>
        </View>
      );
    }

    if (activeTab === 'friends') {
      if (friendsList.length === 0) {
        return (
          <View style={styles.emptyState}>
            <Ionicons name="people-outline" size={64} color={Colors.textMuted} />
            <Text style={styles.emptyStateTitle}>No Friends Yet</Text>
            <Text style={styles.emptyStateText}>
              Start by searching for friends using their username or user ID
            </Text>
            <TouchableOpacity 
              style={styles.switchToSearchButton}
              onPress={() => setActiveTab('search')}
            >
              <Text style={styles.switchToSearchText}>Find Friends</Text>
            </TouchableOpacity>
          </View>
        );
      }

      return (
        <FlatList
          data={friendsList}
          renderItem={renderFriendCard}
          keyExtractor={(item) => item.user_id}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingBottom: 100 }}
        />
      );
    }

    // Search tab
    return (
      <View style={styles.searchContainer}>
        {isSearching && (
          <View style={styles.searchLoading}>
            <ActivityIndicator size="small" color={Colors.primary} />
            <Text style={styles.searchLoadingText}>Searching...</Text>
          </View>
        )}

        {searchResults.length > 0 && (
          <FlatList
            data={searchResults}
            renderItem={renderSearchResult}
            keyExtractor={(item) => item.id}
            showsVerticalScrollIndicator={false}
            contentContainerStyle={{ paddingBottom: 100 }}
          />
        )}

        {searchQuery && searchResults.length === 0 && !isSearching && (
          <View style={styles.noResults}>
            <Ionicons name="search-outline" size={48} color={Colors.textMuted} />
            <Text style={styles.noResultsText}>No users found</Text>
            <Text style={styles.noResultsSubtext}>
              Try searching with a different username or user ID
            </Text>
          </View>
        )}
      </View>
    );
  };

  return (
    <SafeAreaView style={GlobalStyles.safeArea}>
      <StatusBar style="light" backgroundColor={Colors.background} />

      {/* Header */}
      <View style={styles.header}>
        <Text style={GlobalStyles.title}>Friends</Text>
        <Text style={GlobalStyles.textSecondary}>
          Connect and study together
        </Text>
      </View>

      {/* Stats Cards */}
      {friendStats && (
        <View style={styles.statsContainer}>
          <View style={[GlobalStyles.glassCard, styles.statCard]}>
            <View style={styles.statRow}>
              <View style={styles.statItem}>
                <Ionicons name="people" size={24} color={Colors.primary} />
                <Text style={styles.statNumber}>{friendStats.total_friends}</Text>
                <Text style={GlobalStyles.textMuted}>Friends</Text>
              </View>

              <View style={styles.statItem}>
                <Ionicons name="flash" size={24} color={Colors.fire} />
                <Text style={styles.statNumber}>{friendStats.active_friends_today}</Text>
                <Text style={GlobalStyles.textMuted}>Active</Text>
              </View>

              <View style={styles.statItem}>
                <Ionicons name="fitness" size={24} color={Colors.accent} />
                <Text style={styles.statNumber}>{friendStats.friends_studying_now}</Text>
                <Text style={GlobalStyles.textMuted}>Studying</Text>
              </View>
            </View>
          </View>
        </View>
      )}

      {/* Search Bar */}
      <View style={styles.searchBarContainer}>
        <View style={styles.searchBar}>
          <Ionicons name="search" size={20} color={Colors.textMuted} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search by username or user ID..."
            placeholderTextColor={Colors.textMuted}
            value={searchQuery}
            onChangeText={setSearchQuery}
            onSubmitEditing={handleSearch}
            returnKeyType="search"
          />
          {searchQuery && (
            <TouchableOpacity onPress={() => setSearchQuery('')}>
              <Ionicons name="close-circle" size={20} color={Colors.textMuted} />
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* Tab Navigation */}
      <View style={styles.tabContainer}>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'friends' && styles.activeTab]}
          onPress={() => setActiveTab('friends')}
        >
          <Ionicons 
            name="people" 
            size={20} 
            color={activeTab === 'friends' ? Colors.primary : Colors.textSecondary} 
          />
          <Text style={[styles.tabText, activeTab === 'friends' && styles.activeTabText]}>
            Friends ({friendsList.length})
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.tab, activeTab === 'search' && styles.activeTab]}
          onPress={() => setActiveTab('search')}
        >
          <Ionicons 
            name="search" 
            size={20} 
            color={activeTab === 'search' ? Colors.primary : Colors.textSecondary} 
          />
          <Text style={[styles.tabText, activeTab === 'search' && styles.activeTabText]}>
            Find Friends
          </Text>
        </TouchableOpacity>
      </View>

      {/* Content */}
      <View style={styles.content}>
        {renderTabContent()}
      </View>
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
  statsContainer: {
    paddingHorizontal: 16,
    marginBottom: 16,
  },
  statCard: {
    padding: 16,
  },
  statRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  statItem: {
    alignItems: 'center',
  },
  statNumber: {
    fontSize: 20,
    fontWeight: 'bold',
    color: Colors.text,
    marginVertical: 4,
  },
  searchBarContainer: {
    paddingHorizontal: 16,
    marginBottom: 16,
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.06)',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  searchInput: {
    flex: 1,
    marginLeft: 12,
    fontSize: 16,
    color: Colors.text,
  },
  tabContainer: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    marginBottom: 16,
  },
  tab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    backgroundColor: 'rgba(255, 255, 255, 0.06)',
    borderRadius: 12,
    marginHorizontal: 4,
  },
  activeTab: {
    backgroundColor: Colors.primary,
  },
  tabText: {
    marginLeft: 8,
    fontSize: 14,
    fontWeight: '600',
    color: Colors.textSecondary,
  },
  activeTabText: {
    color: Colors.text,
  },
  content: {
    flex: 1,
    paddingHorizontal: 16,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: Colors.textSecondary,
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
  },
  emptyStateTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: Colors.text,
    marginTop: 16,
    marginBottom: 8,
  },
  emptyStateText: {
    fontSize: 16,
    color: Colors.textSecondary,
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: 24,
  },
  switchToSearchButton: {
    backgroundColor: Colors.primary,
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 12,
  },
  switchToSearchText: {
    color: Colors.text,
    fontSize: 16,
    fontWeight: '600',
  },
  searchContainer: {
    flex: 1,
  },
  searchLoading: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
  },
  searchLoadingText: {
    marginLeft: 8,
    fontSize: 14,
    color: Colors.textSecondary,
  },
  noResults: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
  },
  noResultsText: {
    fontSize: 18,
    fontWeight: '600',
    color: Colors.text,
    marginTop: 16,
    marginBottom: 8,
  },
  noResultsSubtext: {
    fontSize: 14,
    color: Colors.textSecondary,
    textAlign: 'center',
    lineHeight: 20,
  },
  friendCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.06)',
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  friendHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  avatarContainer: {
    marginRight: 12,
  },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
  },
  avatarPlaceholder: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: Colors.text,
  },
  friendInfo: {
    flex: 1,
  },
  friendName: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.text,
    marginBottom: 2,
  },
  friendUsername: {
    fontSize: 14,
    color: Colors.textSecondary,
    marginBottom: 6,
  },
  activityRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  activityText: {
    fontSize: 12,
    fontWeight: '500',
    marginLeft: 4,
  },
  moreButton: {
    padding: 4,
  },
  statsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    marginBottom: 12,
    paddingVertical: 8,
    backgroundColor: 'rgba(255, 255, 255, 0.04)',
    borderRadius: 8,
  },
  statValue: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.text,
  },
  statLabel: {
    fontSize: 11,
    color: Colors.textMuted,
    marginTop: 2,
  },
  statDivider: {
    width: 1,
    height: 24,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
  },
  activityStarted: {
    fontSize: 11,
    color: Colors.textMuted,
    marginBottom: 12,
  },
  actionsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 8,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    flex: 1,
    justifyContent: 'center',
  },
  removeButton: {
    backgroundColor: 'rgba(239, 68, 68, 0.1)',
  },
  actionText: {
    fontSize: 11,
    fontWeight: '500',
    marginLeft: 4,
    color: Colors.primary,
  },
  searchResultCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.06)',
    borderRadius: 12,
    padding: 16,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  searchResultHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  searchResultInfo: {
    flex: 1,
    marginRight: 12,
  },
  searchResultName: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.text,
    marginBottom: 2,
  },
  searchResultUsername: {
    fontSize: 13,
    color: Colors.textSecondary,
    marginBottom: 6,
  },
  searchResultStats: {
    marginBottom: 6,
  },
  searchResultStat: {
    fontSize: 12,
    color: Colors.textSecondary,
  },
  searchResultActivity: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  searchResultActivityText: {
    fontSize: 11,
    fontWeight: '500',
    marginLeft: 4,
  },
  searchResultActions: {
    alignItems: 'flex-end',
  },
  addFriendButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.primary,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
  },
  addFriendText: {
    color: Colors.text,
    fontSize: 12,
    fontWeight: '600',
    marginLeft: 4,
  },
  friendBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(16, 185, 129, 0.1)',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
  },
  friendBadgeText: {
    color: Colors.success,
    fontSize: 12,
    fontWeight: '600',
    marginLeft: 4,
  },
});