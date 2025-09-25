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
import { format, formatDistanceToNow } from 'date-fns';

// Mock data for previous streaks and sessions
const mockStreakHistory = [
  {
    id: '1',
    name: 'Math Study Group',
    participants: ['You', 'Alice', 'Bob'],
    duration: '2h 45m',
    date: new Date(2024, 0, 15),
    subject: 'Calculus',
    status: 'completed',
  },
  {
    id: '2',
    name: 'Solo Focus Session',
    participants: ['You'],
    duration: '1h 30m',
    date: new Date(2024, 0, 14),
    subject: 'Programming',
    status: 'completed',
  },
  {
    id: '3',
    name: 'Physics Study Team',
    participants: ['You', 'Charlie', 'Diana'],
    duration: '3h 15m',
    date: new Date(2024, 0, 13),
    subject: 'Quantum Physics',
    status: 'completed',
  },
];

interface StreakCardProps {
  streak: typeof mockStreakHistory[0];
  onResume: () => void;
  onInvite: () => void;
}

const StreakCard: React.FC<StreakCardProps> = ({ streak, onResume, onInvite }) => {
  return (
    <View style={[GlobalStyles.glassCard, styles.streakCard]}>
      {/* Header */}
      <View style={styles.streakHeader}>
        <View style={styles.streakInfo}>
          <Text style={styles.streakTitle}>{streak.name}</Text>
          <Text style={GlobalStyles.textSecondary}>
            {formatDistanceToNow(streak.date, { addSuffix: true })}
          </Text>
        </View>
        <View style={styles.statusBadge}>
          <Ionicons name="checkmark-circle" size={16} color={Colors.success} />
          <Text style={[GlobalStyles.textMuted, { marginLeft: 4 }]}>
            {streak.status}
          </Text>
        </View>
      </View>

      {/* Content */}
      <View style={styles.streakContent}>
        <View style={styles.streakDetail}>
          <Ionicons name="time" size={16} color={Colors.textSecondary} />
          <Text style={[GlobalStyles.textSecondary, { marginLeft: 8 }]}>
            {streak.duration}
          </Text>
        </View>

        <View style={styles.streakDetail}>
          <Ionicons name="book" size={16} color={Colors.textSecondary} />
          <Text style={[GlobalStyles.textSecondary, { marginLeft: 8 }]}>
            {streak.subject}
          </Text>
        </View>

        <View style={styles.streakDetail}>
          <Ionicons name="people" size={16} color={Colors.textSecondary} />
          <Text style={[GlobalStyles.textSecondary, { marginLeft: 8 }]}>
            {streak.participants.length} participant{streak.participants.length > 1 ? 's' : ''}
          </Text>
        </View>
      </View>

      {/* Participants */}
      <View style={styles.participantsContainer}>
        {streak.participants.map((participant, index) => (
          <View key={index} style={styles.participantChip}>
            <Text style={styles.participantText}>{participant}</Text>
          </View>
        ))}
      </View>

      {/* Actions */}
      <View style={styles.actionsContainer}>
        <TouchableOpacity style={styles.actionButton} onPress={onResume}>
          <Ionicons name="refresh" size={18} color={Colors.primary} />
          <Text style={styles.actionButtonText}>Resume</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.actionButton} onPress={onInvite}>
          <Ionicons name="person-add" size={18} color={Colors.accent} />
          <Text style={[styles.actionButtonText, { color: Colors.accent }]}>
            Invite Same Team
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

export default function StreaksScreen() {
  const { stats } = useStudyStore();

  const handleResumeStreak = (streakId: string) => {
    // TODO: Implement resume streak functionality
    console.log('Resuming streak:', streakId);
  };

  const handleInviteTeam = (streakId: string) => {
    // TODO: Implement invite team functionality
    console.log('Inviting team for streak:', streakId);
  };

  const renderStreakCard = ({ item }: { item: typeof mockStreakHistory[0] }) => (
    <StreakCard
      streak={item}
      onResume={() => handleResumeStreak(item.id)}
      onInvite={() => handleInviteTeam(item.id)}
    />
  );

  return (
    <SafeAreaView style={GlobalStyles.safeArea}>
      <StatusBar style="light" backgroundColor={Colors.background} />

      {/* Header */}
      <View style={styles.header}>
        <Text style={GlobalStyles.title}>Study Streaks</Text>
        <Text style={GlobalStyles.textSecondary}>
          Your study history and achievements
        </Text>
      </View>

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

      {/* Streak History */}
      <View style={styles.historySection}>
        <Text style={[GlobalStyles.subtitle, { marginHorizontal: 16 }]}>
          Recent Sessions
        </Text>

        <FlatList
          data={mockStreakHistory}
          renderItem={renderStreakCard}
          keyExtractor={(item) => item.id}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingBottom: 100 }}
        />
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
  historySection: {
    flex: 1,
  },
  streakCard: {
    marginBottom: 16,
  },
  streakHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 16,
  },
  streakInfo: {
    flex: 1,
  },
  streakTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: Colors.text,
    marginBottom: 4,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(16, 185, 129, 0.1)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  streakContent: {
    marginBottom: 16,
  },
  streakDetail: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  participantsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: 16,
  },
  participantChip: {
    backgroundColor: 'rgba(99, 102, 241, 0.1)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    marginRight: 8,
    marginBottom: 8,
  },
  participantText: {
    color: Colors.primary,
    fontSize: 12,
    fontWeight: '600',
  },
  actionsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(99, 102, 241, 0.1)',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 12,
    flex: 0.48,
    justifyContent: 'center',
  },
  actionButtonText: {
    color: Colors.primary,
    fontSize: 14,
    fontWeight: '600',
    marginLeft: 6,
  },
});