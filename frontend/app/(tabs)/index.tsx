import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Dimensions,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { Ionicons } from '@expo/vector-icons';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withTiming,
  Easing,
} from 'react-native-reanimated';
import { Colors } from '../../constants/Colors';
import { GlobalStyles } from '../../constants/Theme';
import { useStudyStore, useAppInitialization } from '../../hooks/useStudySession';
import NotificationBanner from '../../components/NotificationBanner';
import { router } from 'expo-router';

const { width } = Dimensions.get('window');

// Character levels based on study hours
const getCharacterLevel = (totalHours: number) => {
  if (totalHours < 100) return { name: 'Beginner Scholar', level: 1, icon: '🎓' };
  if (totalHours < 200) return { name: 'Focused Knight', level: 2, icon: '⚔️' };
  if (totalHours < 300) return { name: 'Master Sage', level: 3, icon: '🧙‍♂️' };
  return { name: 'Legendary Mentor', level: 4, icon: '👑' };
};

// Fire animation component
const FireAnimation = ({ isActive }: { isActive: boolean }) => {
  const scale = useSharedValue(1);
  const opacity = useSharedValue(1);

  React.useEffect(() => {
    if (isActive) {
      scale.value = withRepeat(
        withTiming(1.2, { duration: 1000, easing: Easing.ease }),
        -1,
        true
      );
      opacity.value = withRepeat(
        withTiming(0.8, { duration: 800, easing: Easing.ease }),
        -1,
        true
      );
    } else {
      scale.value = withTiming(1);
      opacity.value = withTiming(1);
    }
  }, [isActive]);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
    opacity: opacity.value,
  }));

  return (
    <Animated.View style={animatedStyle}>
      <Ionicons
        name="flame"
        size={32}
        color={isActive ? Colors.fire : Colors.textMuted}
      />
    </Animated.View>
  );
};

// Clock animation component
const ClockAnimation = ({ isRunning }: { isRunning: boolean }) => {
  const rotation = useSharedValue(0);

  React.useEffect(() => {
    if (isRunning) {
      rotation.value = withRepeat(
        withTiming(360, { duration: 2000, easing: Easing.linear }),
        -1,
        false
      );
    } else {
      rotation.value = withTiming(0);
    }
  }, [isRunning]);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ rotate: `${rotation.value}deg` }],
  }));

  return (
    <Animated.View style={animatedStyle}>
      <Ionicons
        name="time"
        size={28}
        color={isRunning ? Colors.primary : Colors.textMuted}
      />
    </Animated.View>
  );
};

// Weekly graph with real data
const WeeklyGraph = ({ sessions }: { sessions: any[] }) => {
  // Group sessions by day of week
  const weeklyData = [0, 0, 0, 0, 0, 0, 0]; // Mon to Sun
  const today = new Date();

  sessions.forEach(session => {
    const sessionDate = new Date(session.created_at);
    const dayOfWeek = sessionDate.getDay(); // 0 = Sun, 1 = Mon, etc.
    // Convert to Mon-Sun format (0 = Mon, 6 = Sun)
    const adjustedDay = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
    weeklyData[adjustedDay] += session.duration_minutes / 60; // Convert to hours
  });

  const totalHours = weeklyData.reduce((sum, hours) => sum + hours, 0);

  return (
    <View style={styles.graphContainer}>
      <Text style={[GlobalStyles.subtitle, { textAlign: 'center', marginBottom: 20 }]}>
        This Week: {totalHours.toFixed(1)}h
      </Text>
      <View style={styles.barsContainer}>
        {weeklyData.map((value, index) => (
          <View key={index} style={styles.barWrapper}>
            <View
              style={[
                styles.bar,
                {
                  height: Math.max((value / Math.max(...weeklyData, 1)) * 80, 4), // Min height of 4
                  backgroundColor: index === 6 ? Colors.primary : Colors.surfaceElevated
                }
              ]}
            />
            <Text style={styles.barLabel}>
              {['M', 'T', 'W', 'T', 'F', 'S', 'S'][index]}
            </Text>
          </View>
        ))}
      </View>
    </View>
  );
};

export default function HomeScreen() {
  // Initialize the app (Socket.IO, load dashboard data)
  useAppInitialization();

  const {
    stats,
    dashboardData,
    isConnectedToSocket,
    notification,
    hideNotification,
    logSession
  } = useStudyStore();

  const character = getCharacterLevel(stats.weeklyHours);

  const handleLogSession = () => {
    // For demo, log a sample session
    logSession('Mathematics', 60, 85);
  };

  return (
    <SafeAreaView style={GlobalStyles.safeArea}>
      <StatusBar style="light" backgroundColor={Colors.background} />

      {/* Notification Banner */}
      <NotificationBanner
        message={notification.message}
        type={notification.type}
        visible={notification.visible}
        onHide={hideNotification}
      />

      <ScrollView style={GlobalStyles.container} showsVerticalScrollIndicator={false}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={GlobalStyles.title}>Study Together</Text>
          <View style={styles.statusRow}>
            <Text style={GlobalStyles.textSecondary}>Stay focused, stay connected</Text>
            {/* Connection Status Indicator */}
            <View style={styles.connectionStatus}>
              <Ionicons
                name={isConnectedToSocket ? 'wifi' : 'wifi-outline'}
                size={16}
                color={isConnectedToSocket ? Colors.success : Colors.textMuted}
              />
              <Text style={[
                styles.connectionText,
                { color: isConnectedToSocket ? Colors.success : Colors.textMuted }
              ]}>
                {isConnectedToSocket ? 'Live' : 'Offline'}
              </Text>
            </View>
          </View>
        </View>

        {/* Weekly Analysis Graph */}
        <View style={[GlobalStyles.glassCard, { marginTop: 20 }]}>
          <WeeklyGraph sessions={dashboardData?.recent_sessions || []} />
        </View>

        {/* Stats Cards Row */}
        <View style={styles.statsRow}>
          {/* Efficiency Card */}
          <View style={[GlobalStyles.glassCard, styles.statCard]}>
            <Text style={styles.statNumber}>{stats.efficiency}%</Text>
            <Text style={GlobalStyles.textSecondary}>Efficiency</Text>
          </View>

          {/* Streak Card */}
          <View style={[GlobalStyles.glassCard, styles.statCard]}>
            <View style={styles.streakHeader}>
              <FireAnimation isActive={stats.currentStreak > 0} />
              <Text style={styles.statNumber}>{stats.currentStreak}</Text>
            </View>
            <Text style={GlobalStyles.textSecondary}>Day Streak</Text>
            <Text style={styles.characterText}>{character.name}</Text>
          </View>
        </View>

        {/* Quick Actions Section */}
        <View style={[GlobalStyles.glassCard, styles.timerCard]}>
          <Text style={[GlobalStyles.subtitle, { textAlign: 'center', marginBottom: 20 }]}>
            Quick Actions
          </Text>

          <TouchableOpacity
            style={[styles.mainButton, { backgroundColor: Colors.primary }]}
            onPress={handleLogSession}
          >
            <Ionicons
              name="add"
              size={24}
              color={Colors.text}
              style={{ marginRight: 12 }}
            />
            <Text style={styles.mainButtonText}>
              Log Study Session
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.secondaryButton, { marginTop: 12 }]}
            onPress={() => router.push('/spaces')}
          >
            <Ionicons name="people" size={20} color={Colors.primary} />
            <Text style={[styles.secondaryButtonText, { marginLeft: 8, color: Colors.primary }]}>
              View Spaces
            </Text>
          </TouchableOpacity>
        </View>

        {/* Today's Progress */}
        <View style={[GlobalStyles.glassCard, { marginBottom: 100 }]}>
          <Text style={GlobalStyles.subtitle}>Today's Progress</Text>
          <View style={styles.progressRow}>
            <View style={styles.progressItem}>
              <Text style={styles.progressNumber}>{stats.todayHours}h</Text>
              <Text style={GlobalStyles.textMuted}>Time Studied</Text>
            </View>
            <View style={styles.progressItem}>
              <Text style={styles.progressNumber}>{character.level}</Text>
              <Text style={GlobalStyles.textMuted}>Level</Text>
            </View>
            <View style={styles.progressItem}>
              <Text style={styles.progressNumber}>{stats.xp}</Text>
              <Text style={GlobalStyles.textMuted}>XP</Text>
            </View>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  header: {
    paddingHorizontal: 20,
    paddingTop: 20,
    alignItems: 'center',
  },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    width: '100%',
    marginTop: 4,
  },
  connectionStatus: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  connectionText: {
    fontSize: 12,
    fontWeight: '600',
    marginLeft: 4,
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    marginTop: 16,
  },
  statCard: {
    flex: 1,
    marginHorizontal: 4,
    alignItems: 'center',
    paddingVertical: 20,
  },
  statNumber: {
    fontSize: 32,
    fontWeight: 'bold',
    color: Colors.text,
    marginBottom: 4,
  },
  streakHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  characterText: {
    fontSize: 10,
    color: Colors.accent,
    fontWeight: '600',
    textAlign: 'center',
    marginTop: 4,
  },
  timerCard: {
    alignItems: 'center',
    paddingVertical: 40,
    marginTop: 16,
  },
  timerHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  timerText: {
    fontSize: 48,
    fontWeight: 'bold',
    color: Colors.text,
    marginLeft: 16,
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
  },
  mainButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.primary,
    paddingVertical: 20,
    paddingHorizontal: 40,
    borderRadius: 16,
    minWidth: width * 0.7,
    justifyContent: 'center',
  },
  mainButtonText: {
    color: Colors.text,
    fontSize: 18,
    fontWeight: 'bold',
  },
  secondaryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.error,
  },
  secondaryButtonText: {
    color: Colors.error,
    fontSize: 14,
    fontWeight: '600',
  },
  progressRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginTop: 20,
  },
  progressItem: {
    alignItems: 'center',
  },
  progressNumber: {
    fontSize: 24,
    fontWeight: 'bold',
    color: Colors.accent,
    marginBottom: 4,
  },
  graphContainer: {
    alignItems: 'center',
  },
  barsContainer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    width: '100%',
    height: 100,
  },
  barWrapper: {
    alignItems: 'center',
    flex: 1,
  },
  bar: {
    width: 20,
    backgroundColor: Colors.surfaceElevated,
    borderRadius: 4,
    marginBottom: 8,
  },
  barLabel: {
    fontSize: 12,
    color: Colors.textMuted,
    fontWeight: '500',
  },
});