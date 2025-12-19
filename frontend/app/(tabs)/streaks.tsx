import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  FlatList,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '../../constants/Colors';
import { GlobalStyles } from '../../constants/Theme';
import { useStudyStore } from '../../hooks/useStudySession';

// Mock data for friends with satirical styling
const mockFriends = [
  {
    id: '1',
    name: 'Alex "The Crusher" Thompson',
    rank: 3,
    currentStreak: 15,
    longestStreak: 23,
    activity: 'gym',
    activityText: 'Gym Session',
    status: 'active',
    motivation: '🔥 Crushing it at the gym like it owes him money',
    xp: 2847,
  },
  {
    id: '2',
    name: 'Sarah "Code Ninja" Chen',
    rank: 1,
    currentStreak: 28,
    longestStreak: 31,
    activity: 'coding',
    activityText: 'Coding Session',
    status: 'active',
    motivation: '💻 Debugging life one commit at a time',
    xp: 3421,
  },
  {
    id: '3',
    name: 'Marcus "Procrastination King" Williams',
    rank: 5,
    currentStreak: 2,
    longestStreak: 7,
    activity: 'procrastinating',
    activityText: 'Procrastinating Mode',
    status: 'inactive',
    motivation: '😴 Currently contemplating the meaning of procrastination',
    xp: 1245,
  },
  {
    id: '4',
    name: 'Emma "Bookworm Supreme" Rodriguez',
    rank: 2,
    currentStreak: 12,
    longestStreak: 19,
    activity: 'study',
    activityText: 'Study Session',
    status: 'active',
    motivation: '📚 Reading faster than her future problems can catch up',
    xp: 3102,
  },
  {
    id: '5',
    name: 'Jake "Gym Rat" Morrison',
    rank: 4,
    currentStreak: 8,
    longestStreak: 14,
    activity: 'gym',
    activityText: 'Gym Session',
    status: 'active',
    motivation: '💪 Lifting weights and lifting spirits',
    xp: 2134,
  },
  {
    id: '6',
    name: 'Lily "Zen Master" Park',
    rank: 6,
    currentStreak: 1,
    longestStreak: 5,
    activity: 'procrastinating',
    activityText: 'Procrastinating Mode',
    status: 'inactive',
    motivation: '🧘 Meditating on why she started this whole study thing',
    xp: 876,
  },
];

interface FriendCardProps {
  friend: typeof mockFriends[0];
  onChallenge: () => void;
  onMotivate: () => void;
}

const FriendCard: React.FC<FriendCardProps> = ({ friend, onChallenge, onMotivate }) => {
  const getActivityIcon = (activity: string) => {
    switch (activity) {
      case 'gym':
        return 'fitness';
      case 'study':
        return 'book';
      case 'coding':
        return 'code-slash';
      case 'procrastinating':
        return 'bed';
      default:
        return 'person';
    }
  };

  const getActivityColor = (activity: string, status: string) => {
    if (status === 'inactive') return Colors.textMuted;
    switch (activity) {
      case 'gym':
        return '#FF6B6B';
      case 'study':
        return '#4ECDC4';
      case 'coding':
        return '#45B7D1';
      case 'procrastinating':
        return '#FFA726';
      default:
        return Colors.primary;
    }
  };

  return (
    <View style={[styles.friendCard, {
      borderLeftWidth: 3,
      borderLeftColor: getActivityColor(friend.activity, friend.status)
    }]}>
      {/* Name and Activity */}
      <View style={styles.nameRow}>
        <Text style={styles.friendName}>{friend.name}</Text>
        <View style={styles.activityBadge}>
          <Ionicons 
            name={getActivityIcon(friend.activity)} 
            size={16} 
            color={getActivityColor(friend.activity, friend.status)} 
          />
          <Text style={[styles.activityText, {
            color: getActivityColor(friend.activity, friend.status)
          }]}>
            {friend.activityText}
          </Text>
        </View>
      </View>

      {/* Stats Row */}
      <View style={styles.friendStatsRow}>
        <Text style={styles.statText}>#{friend.rank}</Text>
        <Text style={styles.statDivider}>•</Text>
        <Text style={styles.statText}>{friend.currentStreak}🔥</Text>
        <Text style={styles.statDivider}>•</Text>
        <Text style={styles.statText}>{friend.xp} XP</Text>
      </View>

      {/* Motivation */}
      <Text style={styles.motivationText}>{friend.motivation}</Text>

      {/* Actions */}
      <View style={styles.actionsRow}>
        <TouchableOpacity style={styles.actionButton} onPress={onChallenge}>
          <Ionicons name="trophy-outline" size={16} color={Colors.accent} />
          <Text style={styles.actionText}>Challenge</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.actionButton} onPress={onMotivate}>
          <Ionicons name="heart-outline" size={16} color={Colors.success} />
          <Text style={[styles.actionText, { color: Colors.success }]}>Motivate</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

export default function StreaksScreen() {
  const { stats } = useStudyStore();

  const handleChallengeFriend = (friendId: string) => {
    // TODO: Implement challenge friend functionality
    console.log('Challenging friend:', friendId);
  };

  const handleMotivateFriend = (friendId: string) => {
    // TODO: Implement motivate friend functionality
    console.log('Motivating friend:', friendId);
  };

  const renderFriendCard = ({ item }: { item: typeof mockFriends[0] }) => (
    <FriendCard
      friend={item}
      onChallenge={() => handleChallengeFriend(item.id)}
      onMotivate={() => handleMotivateFriend(item.id)}
    />
  );

  return (
    <SafeAreaView style={GlobalStyles.safeArea}>
      <StatusBar style="light" backgroundColor={Colors.background} />



      {/* Current Streak Stats */}
      <View style={[GlobalStyles.glassCard, styles.statsCard]}>
        <Text style={GlobalStyles.subtitle}>Current Performance</Text>
        <View style={styles.statsRow}>
          <View style={styles.statItem}>
            <Ionicons name="flame" size={32} color={Colors.fire} />
            <Text style={styles.statNumber}>{stats.currentStreak}</Text>
            <Text style={GlobalStyles.textMuted}>Days</Text>
          </View>

          <View style={styles.statItem}>
            <Ionicons name="trophy" size={32} color={Colors.streak} />
            <Text style={styles.statNumber}>{stats.longestStreak}</Text>
            <Text style={GlobalStyles.textMuted}>Best Streak</Text>
          </View>

          <View style={styles.statItem}>
            <Ionicons name="trending-up" size={32} color={Colors.success} />
            <Text style={styles.statNumber}>{stats.efficiency}%</Text>
            <Text style={GlobalStyles.textMuted}>Efficiency</Text>
          </View>
        </View>
      </View>

      {/* Friend Activity */}
      <View style={styles.friendsSection}>
        <Text style={[GlobalStyles.subtitle, { marginHorizontal: 16 }]}>
          Study Crew Activity
        </Text>
        <Text style={[GlobalStyles.textMuted, { marginHorizontal: 16, marginBottom: 12, fontSize: 12 }]}>
          Watch your friends grind (or procrastinate) in real-time
        </Text>

        <FlatList
          data={mockFriends}
          renderItem={renderFriendCard}
          keyExtractor={(item) => item.id}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingBottom: 100 }}
        />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({

  statsCard: {
    marginHorizontal: 16,
    marginBottom: 20,
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginTop: 16,
  },
  statItem: {
    alignItems: 'center',
  },
  statNumber: {
    fontSize: 24,
    fontWeight: 'bold',
    color: Colors.text,
    marginVertical: 8,
  },
  friendsSection: {
    flex: 1,
  },
  friendCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.06)',
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    marginHorizontal: 16,
  },
  nameRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  friendName: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.text,
    flex: 1,
    marginRight: 12,
  },
  activityBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 12,
  },
  activityText: {
    fontSize: 12,
    fontWeight: '500',
    marginLeft: 6,
  },
  friendStatsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  statText: {
    fontSize: 14,
    color: Colors.textSecondary,
    fontWeight: '500',
  },
  statDivider: {
    fontSize: 14,
    color: Colors.textMuted,
    marginHorizontal: 8,
  },
  motivationText: {
    fontSize: 13,
    color: Colors.textSecondary,
    fontStyle: 'italic',
    marginBottom: 14,
    lineHeight: 18,
  },
  actionsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 12,
    flex: 0.48,
    justifyContent: 'center',
  },
  actionText: {
    fontSize: 13,
    fontWeight: '500',
    marginLeft: 8,
    color: Colors.accent,
  },
});