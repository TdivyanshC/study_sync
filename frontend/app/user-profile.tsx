import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Image,
  ActivityIndicator,
  Alert,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useAuth } from '../hooks/useAuth';
import { Colors } from '../constants/Colors';
import { GlobalStyles } from '../constants/Theme';
import { friendsService, UserProfile } from '../src/services/friendsService';
import { useLocalSearchParams } from 'expo-router';

// Helper to format hours display
const formatHours = (hours: number): string => {
  if (hours === 0) return "0h";
  if (hours < 1) return `${Math.round(hours * 60)}m`;
  return `${hours.toFixed(1)}h`.replace('.0h', 'h');
};

// Helper to get time since start (e.g., "2h 30m")
const getTimeSinceStart = (dateString: string | undefined): string => {
  if (!dateString) return '';
  const start = new Date(dateString);
  const now = new Date();
  const diffMs = now.getTime() - start.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  if (diffMins < 60) return `${diffMins}m`;
  const diffHours = Math.floor(diffMins / 60);
  const remainingMins = diffMins % 60;
  return remainingMins > 0 ? `${diffHours}h ${remainingMins}m` : `${diffHours}h`;
};

export default function UserProfileScreen() {
  const { user: currentUser } = useAuth();
  const { userId } = useLocalSearchParams<{ userId: string }>();

  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState(false);

  useEffect(() => {
    if (!userId) {
      setError('User ID is required');
      setLoading(false);
      return;
    }
    loadProfile();
  }, [userId]);

  const loadProfile = async () => {
    if (!userId) return;
    setLoading(true);
    setError(null);
    try {
      const response = await friendsService.getUserProfile(userId);
      if (response.success && response.user) {
        setProfile(response.user);
      } else {
        setError('Failed to load profile');
      }
    } catch (err: any) {
      console.error('Error loading profile:', err);
      setError(err.message || 'Failed to load profile');
    } finally {
      setLoading(false);
    }
  };

  const handleAddFriend = async () => {
    if (!currentUser || !userId) return;
    setActionLoading(true);
    try {
      const response = await friendsService.addFriend(currentUser.id, userId);
      if (response.success) {
        Alert.alert('Success', 'Friend request sent!');
        await loadProfile();
      } else {
        Alert.alert('Error', response.message || 'Failed to send friend request');
      }
    } catch (err: any) {
      console.error('Error adding friend:', err);
      Alert.alert('Error', 'Failed to send friend request');
    } finally {
      setActionLoading(false);
    }
  };

  const handleAcceptRequest = async () => {
    if (!profile?.friendship_id) return;
    setActionLoading(true);
    try {
      const response = await friendsService.acceptRequest(profile.friendship_id);
      if (response.success) {
        Alert.alert('Success', 'Friend request accepted!');
        await loadProfile();
      } else {
        Alert.alert('Error', response.message || 'Failed to accept request');
      }
    } catch (err: any) {
      console.error('Error accepting request:', err);
      Alert.alert('Error', 'Failed to accept request');
    } finally {
      setActionLoading(false);
    }
  };

  const handleRejectRequest = async () => {
    if (!profile?.friendship_id) return;
    setActionLoading(true);
    try {
      const response = await friendsService.rejectRequest(profile.friendship_id);
      if (response.success) {
        Alert.alert('Success', 'Friend request rejected');
        await loadProfile();
      } else {
        Alert.alert('Error', response.message || 'Failed to reject request');
      }
    } catch (err: any) {
      console.error('Error rejecting request:', err);
      Alert.alert('Error', 'Failed to reject request');
    } finally {
      setActionLoading(false);
    }
  };

  const getCharacterInfo = (level: number) => {
    const characters = [
      { name: 'Beginner Scholar', icon: '🎓', minXP: 0, maxXP: 399 },
      { name: 'Focused Knight', icon: '⚔️', minXP: 400, maxXP: 1199 },
      { name: 'Master Sage', icon: '🧙‍♂️', minXP: 1200, maxXP: 2399 },
      { name: 'Legendary Mentor', icon: '👑', minXP: 2400, maxXP: 99999 },
    ];
    return characters[Math.min(level - 1, characters.length - 1)];
  };

  const formatHours = (hours: number) => {
    if (hours === 0) return '0h';
    if (hours < 1) return `${Math.round(hours * 60)}m`;
    if (hours < 10) return `${hours.toFixed(1)}h`;
    return `${Math.round(hours)}h`;
  };

  const getActivityIcon = (activity?: string) => {
    if (!activity) return 'person';
    const lower = activity.toLowerCase();
    if (lower.includes('gym') || lower.includes('workout')) return 'fitness';
    if (lower.includes('study') || lower.includes('study_session')) return 'book';
    if (lower.includes('code') || lower.includes('coding')) return 'code-slash';
    if (lower.includes('read') || lower.includes('reading')) return 'library';
    if (lower.includes('exercise') || lower.includes('running')) return 'walk';
    return 'person';
  };

  const getActivityColor = (activity?: string) => {
    if (!activity) return '#6366f1';
    const lower = activity.toLowerCase();
    if (lower.includes('gym') || lower.includes('workout')) return '#FF6B6B';
    if (lower.includes('study') || lower.includes('study_session')) return '#4ECDC4';
    if (lower.includes('code') || lower.includes('coding')) return '#45B7D1';
    if (lower.includes('read') || lower.includes('reading')) return '#96CEB4';
    if (lower.includes('exercise') || lower.includes('running')) return '#FFEAA7';
    return '#6366f1';
  };

  const getActivityDescription = (activity?: string) => {
    if (!activity) return 'Available';
    const lower = activity.toLowerCase();
    if (lower.includes('gym') || lower.includes('workout')) return 'Gym Session';
    if (lower.includes('study') || lower.includes('study_session')) return 'Study Session';
    if (lower.includes('code') || lower.includes('coding')) return 'Coding Session';
    if (lower.includes('read') || lower.includes('reading')) return 'Reading Session';
    if (lower.includes('exercise') || lower.includes('running')) return 'Exercise';
    return activity.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase());
  };

  if (loading) {
    return (
      <SafeAreaView style={[GlobalStyles.safeArea, styles.center]}>
        <ActivityIndicator size="large" color={Colors.primary} />
        <Text style={styles.loadingText}>Loading profile...</Text>
      </SafeAreaView>
    );
  }

  if (error || !profile) {
    return (
      <SafeAreaView style={[GlobalStyles.safeArea, styles.center]}>
        <Ionicons name="alert-circle-outline" size={64} color={Colors.error} />
        <Text style={styles.errorText}>{error || 'Profile not found'}</Text>
        <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
          <Text style={styles.backButtonText}>Go Back</Text>
        </TouchableOpacity>
      </SafeAreaView>
    );
  }

  const character = getCharacterInfo(profile.level);
  const isOwnProfile = currentUser && profile.user_id === currentUser.id;

  return (
    <SafeAreaView style={GlobalStyles.safeArea}>
      <StatusBar style="light" backgroundColor={Colors.background} />
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
        {/* Header with back button */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backIcon}>
            <Ionicons name="arrow-back" size={24} color={Colors.text} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Profile</Text>
          <View style={styles.backIcon} /> {/* Spacer for centering */}
        </View>

        {/* Profile Card */}
        <View style={[GlobalStyles.glassCard, styles.profileCard]}>
          {/* Avatar */}
          <View style={styles.avatarContainer}>
            {profile.avatar_url ? (
              <Image source={{ uri: profile.avatar_url }} style={styles.avatar} />
            ) : (
              <View style={[styles.avatarPlaceholder, { backgroundColor: getActivityColor(profile.current_activity) }]}>
                <Text style={styles.avatarText}>
                  {(profile.display_name || profile.username).charAt(0).toUpperCase()}
                </Text>
              </View>
            )}
          </View>

          {/* Username and Display Name */}
          <Text style={styles.username}>@{profile.username}</Text>
          {profile.display_name && (
            <Text style={styles.displayName}>{profile.display_name}</Text>
          )}

          {/* Character Badge */}
          <View style={styles.characterBadge}>
            <Text style={styles.characterEmoji}>{character.icon}</Text>
            <Text style={styles.characterName}>{character.name}</Text>
            <Text style={styles.levelText}>Level {profile.level}</Text>
          </View>

          {/* XP Progress */}
          <View style={styles.xpContainer}>
            <View style={styles.xpBar}>
              <View
                style={[
                  styles.xpProgress,
                  {
                    width: `${Math.min(
                      ((profile.xp - character.minXP) / (character.maxXP - character.minXP)) * 100,
                      100
                    )}%`,
                    backgroundColor: Colors.primary,
                  },
                ]}
              />
            </View>
            <Text style={GlobalStyles.textMuted}>
              {profile.xp} / {character.maxXP} XP
            </Text>
          </View>
        </View>

        {/* Stats Grid */}
        <View style={[GlobalStyles.glassCard, styles.statsCard]}>
          <View style={styles.statItem}>
            <Ionicons name="flame" size={24} color={Colors.fire} />
            <Text style={styles.statValue}>{profile.streak_count}</Text>
            <Text style={styles.statLabel}>Day Streak</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statItem}>
            <Ionicons name="time" size={24} color={Colors.primary} />
            <Text style={styles.statValue}>{formatHours(profile.total_hours_today)}</Text>
            <Text style={styles.statLabel}>Today</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statItem}>
            <Ionicons name="trending-up" size={24} color={Colors.success} />
            <Text style={styles.statValue}>{profile.xp.toLocaleString()}</Text>
            <Text style={styles.statLabel}>Total XP</Text>
          </View>
        </View>

        {/* Current Activity */}
        {profile.current_activity && (
          <View style={[GlobalStyles.glassCard, styles.activityCard]}>
            <Text style={styles.sectionTitle}>Current Activity</Text>
            <View style={styles.activityRow}>
              <Ionicons
                name={getActivityIcon(profile.current_activity) as any}
                size={20}
                color={getActivityColor(profile.current_activity)}
              />
              <Text style={[styles.activityText, { color: getActivityColor(profile.current_activity) }]}>
                {getActivityDescription(profile.current_activity)}
              </Text>
              {profile.activity_started_at && (
                <Text style={GlobalStyles.textMuted}>
                  • Started {new Date(profile.activity_started_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </Text>
              )}
            </View>
          </View>
        )}

        {/* Friendship Info */}
        {profile.is_friend && profile.friend_since && (
          <View style={[GlobalStyles.glassCard, styles.friendInfoCard]}>
            <Ionicons name="checkmark-circle" size={20} color={Colors.success} />
            <Text style={styles.friendInfoText}>
              Friends since {new Date(profile.friend_since).toLocaleDateString()}
            </Text>
          </View>
        )}

        {/* Action Button */}
        <View style={styles.actionContainer}>
          {isOwnProfile ? (
            <TouchableOpacity
              style={[styles.actionButton, styles.disabledButton]}
              disabled
            >
              <Ionicons name="person" size={20} color={Colors.text} />
              <Text style={styles.actionButtonText}>This is you</Text>
            </TouchableOpacity>
          ) : profile.relationship_status === 'none' ? (
            <TouchableOpacity
              style={[styles.actionButton, styles.addFriendButton]}
              onPress={handleAddFriend}
              disabled={actionLoading}
            >
              <Ionicons name="person-add" size={20} color="#fff" />
              <Text style={[styles.actionButtonText, { color: '#fff' }]}>Add Friend</Text>
            </TouchableOpacity>
          ) : profile.relationship_status === 'pending_sent' ? (
            <View style={[styles.actionButton, styles.pendingButton]}>
              <Ionicons name="time" size={20} color={Colors.text} />
              <Text style={styles.actionButtonText}>Friend Request Sent</Text>
            </View>
          ) : profile.relationship_status === 'pending_received' ? (
            <View style={styles.rowButtons}>
              <TouchableOpacity
                style={[styles.actionButton, styles.acceptButton, { flex: 1, marginRight: 8 }]}
                onPress={handleAcceptRequest}
                disabled={actionLoading}
              >
                <Ionicons name="checkmark" size={20} color="#fff" />
                <Text style={[styles.actionButtonText, { color: '#fff' }]}>Accept</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.actionButton, styles.rejectButton, { flex: 1, marginLeft: 8 }]}
                onPress={() => {
                  Alert.alert(
                    'Reject Request',
                    'Are you sure you want to reject this friend request?',
                    [
                      { text: 'Cancel', style: 'cancel' },
                      { text: 'Reject', style: 'destructive', onPress: handleRejectRequest },
                    ]
                  );
                }}
                disabled={actionLoading}
              >
                <Ionicons name="close" size={20} color={Colors.text} />
                <Text style={styles.actionButtonText}>Reject</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <TouchableOpacity
              style={[styles.actionButton, styles.friendsButton]}
              disabled
            >
              <Ionicons name="checkmark-circle" size={20} color={Colors.success} />
              <Text style={styles.actionButtonText}>Already Friends</Text>
            </TouchableOpacity>
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  scrollContent: {
    paddingBottom: 40,
  },
  center: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: Colors.textSecondary,
  },
  errorText: {
    marginTop: 16,
    fontSize: 16,
    color: Colors.error,
    textAlign: 'center',
    marginHorizontal: 32,
  },
  backButton: {
    marginTop: 24,
    paddingVertical: 12,
    paddingHorizontal: 24,
    backgroundColor: Colors.surface,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.cardBorder,
  },
  backButtonText: {
    color: Colors.primary,
    fontWeight: '600',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: Colors.text,
  },
  backIcon: {
    width: 32,
    height: 32,
    justifyContent: 'center',
    alignItems: 'center',
  },
  profileCard: {
    alignItems: 'center',
    paddingVertical: 32,
    marginHorizontal: 16,
    marginBottom: 16,
  },
  avatarContainer: {
    marginBottom: 16,
  },
  avatar: {
    width: 100,
    height: 100,
    borderRadius: 50,
    borderWidth: 3,
    borderColor: Colors.primary,
  },
  avatarPlaceholder: {
    width: 100,
    height: 100,
    borderRadius: 50,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 3,
    borderColor: Colors.primary,
  },
  avatarText: {
    fontSize: 40,
    fontWeight: 'bold',
    color: '#fff',
  },
  username: {
    fontSize: 18,
    fontWeight: '600',
    color: Colors.text,
    marginBottom: 4,
  },
  displayName: {
    fontSize: 16,
    color: Colors.textSecondary,
    marginBottom: 16,
  },
  characterBadge: {
    alignItems: 'center',
    marginBottom: 16,
  },
  characterEmoji: {
    fontSize: 48,
    marginBottom: 8,
  },
  characterName: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.text,
    marginBottom: 4,
  },
  levelText: {
    fontSize: 14,
    color: Colors.primary,
    fontWeight: '500',
  },
  xpContainer: {
    width: '100%',
    alignItems: 'center',
    marginTop: 8,
  },
  xpBar: {
    width: '100%',
    height: 8,
    backgroundColor: Colors.surfaceElevated,
    borderRadius: 4,
    overflow: 'hidden',
    marginBottom: 8,
  },
  xpProgress: {
    height: '100%',
    borderRadius: 4,
  },
  statsCard: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    paddingVertical: 20,
    marginHorizontal: 16,
    marginBottom: 16,
  },
  statItem: {
    alignItems: 'center',
    flex: 1,
  },
  statValue: {
    fontSize: 20,
    fontWeight: 'bold',
    color: Colors.text,
    marginTop: 4,
  },
  statLabel: {
    fontSize: 12,
    color: Colors.textSecondary,
    marginTop: 2,
  },
  statDivider: {
    width: 1,
    height: '80%',
    backgroundColor: Colors.cardBorder,
  },
  activityCard: {
    marginHorizontal: 16,
    marginBottom: 16,
    padding: 16,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.text,
    marginBottom: 12,
  },
  activityRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
  },
  activityText: {
    marginLeft: 8,
    fontSize: 16,
    fontWeight: '500',
  },
  friendInfoCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginHorizontal: 16,
    marginBottom: 16,
    padding: 12,
    backgroundColor: 'rgba(16, 185, 129, 0.1)',
    borderWidth: 1,
    borderColor: Colors.success,
  },
  friendInfoText: {
    marginLeft: 8,
    color: Colors.success,
    fontWeight: '500',
  },
  actionContainer: {
    paddingHorizontal: 16,
    marginTop: 8,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    borderRadius: 12,
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.cardBorder,
  },
  actionButtonText: {
    marginLeft: 8,
    fontSize: 16,
    fontWeight: '600',
    color: Colors.text,
  },
  disabledButton: {
    opacity: 0.6,
  },
  addFriendButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    borderRadius: 12,
    backgroundColor: Colors.primary,
  },
  addFriendButtonText: {
    marginLeft: 8,
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
  },
  pendingButton: {
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.textMuted,
  },
  friendsButton: {
    backgroundColor: Colors.success,
    borderWidth: 0,
  },
  rowButtons: {
    flexDirection: 'row',
  },
  acceptButton: {
    backgroundColor: Colors.success,
    borderWidth: 0,
    flex: 1,
  },
  rejectButton: {
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.error,
    flex: 1,
  },
});
