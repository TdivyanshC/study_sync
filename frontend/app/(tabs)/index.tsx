import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '../../constants/Colors';
import { GlobalStyles } from '../../constants/Theme';
import { router } from 'expo-router';
import { useStudyStore } from '../../hooks/useStudySession';
import { usePopup } from '../../providers/PopupProvider';
import { useAuth } from '../../hooks/useAuth';
import { getRandomJoke } from '../../data/jokes';
import { metricsService } from '../../services/metricsService';

// Helper function to get user's display name
const getUserDisplayName = (user: any): string => {
  if (!user) return 'there';
  
  // Try to get name from user metadata first
  if (user.user_metadata?.full_name) {
    return user.user_metadata.full_name;
  }
  
  if (user.user_metadata?.name) {
    return user.user_metadata.name;
  }
  
  // Fallback to email username (part before @)
  if (user.email) {
    const emailUsername = user.email.split('@')[0];
    // Capitalize first letter and handle underscores/dots
    return emailUsername
      .split(/[._]/)
      .map((part: string) => part.charAt(0).toUpperCase() + part.slice(1).toLowerCase())
      .join(' ');
  }
  
  // Final fallback
  return 'there';
};

export default function Index() {
  const { startSession } = useStudyStore();
  const { openPopup, closePopup } = usePopup();
  const { user } = useAuth();
  
  // State for today's metrics
  const [todayMetrics, setTodayMetrics] = useState({
    hoursStudied: 0,
    streak: 0,
    xp: 0,
    level: 0,
    hoursDisplay: "0h",
    loading: true,
    error: null as string | null,
  });

  // Redirect to login if not authenticated
  useEffect(() => {
    if (!user) {
      console.log('No authenticated user, redirecting to login');
      router.replace('/login');
      return;
    }
  }, [user]);

  // Fetch today's metrics on component mount and when screen is focused
  useEffect(() => {
    if (!user) return;
    
    loadTodayMetrics();
    
    // Refresh data when user returns to this screen
    const interval = setInterval(() => {
      loadTodayMetrics();
    }, 30000); // Refresh every 30 seconds
    
    return () => clearInterval(interval);
  }, [user]);

  const loadTodayMetrics = async () => {
    if (!user) {
      console.log('No user available for metrics loading');
      return;
    }

    try {
      setTodayMetrics(prev => ({ ...prev, loading: true, error: null }));
      
      console.log(`📊 Loading today's metrics for user: ${user.id}`);
      
      // Use our service layer to get authenticated user data
      const [todayData, xpStats, streakData] = await Promise.all([
        metricsService.getTodayMetrics(user.id).catch(err => {
          console.error('Failed to get today metrics:', err);
          return { total_focus_time: 0, tasks_completed: 0 };
        }),
        metricsService.getXPStats(user.id).catch(err => {
          console.error('Failed to get XP stats:', err);
          return { total_xp: 0, level: 0 };
        }),
        metricsService.getStreakData(user.id).catch(err => {
          console.error('Failed to get streak data:', err);
          return { data: { current_streak: 0 } };
        })
      ]);

      // Format hours according to user requirements
      const minutes = todayData.total_focus_time || 0;
      let hoursDisplay: string;
      
      if (minutes === 0) {
        hoursDisplay = "0h";
      } else if (minutes < 1) {
        hoursDisplay = "Just started!";
      } else if (minutes < 60) {
        hoursDisplay = `${Math.round(minutes)} min`;
      } else {
        const hours = Math.round((minutes / 60) * 10) / 10; // 1 decimal place
        hoursDisplay = `${hours}h`;
      }
      
      setTodayMetrics({
        hoursStudied: minutes,
        streak: streakData.data?.current_streak || 0,
        xp: xpStats.total_xp || 0,
        level: xpStats.level || 0,
        hoursDisplay,
        loading: false,
        error: null,
      });

      console.log('✅ Today metrics loaded successfully:', {
        minutes,
        streak: streakData.data?.current_streak,
        xp: xpStats.total_xp,
        level: xpStats.level
      });

    } catch (error: any) {
      console.error('❌ Failed to load today metrics:', error);
      
      // Show user-friendly error
      let errorMessage = 'Failed to load today\'s progress';
      if (error.message?.includes('Network')) {
        errorMessage = 'Network error - check your connection';
      } else if (error.message?.includes('Authentication')) {
        errorMessage = 'Authentication error - please login again';
        // Redirect to login if auth error
        router.replace('/login');
      }
      
      setTodayMetrics(prev => ({
        ...prev,
        loading: false,
        error: errorMessage,
      }));
      
      // Show alert for non-auth errors
      if (!error.message?.includes('Authentication')) {
        Alert.alert('Error', errorMessage);
      }
    }
  };

  const handleStartSession = () => {
    openPopup({
      message: getRandomJoke(),
      primaryButtonText: "Yeah I'm serious ",
      secondaryButtonText: "Wait let me check ",
      animation: require("../../assets/animations/avatar 1-MJ2k6.json"),
      onPrimary: () => {
        closePopup();
        startSession();
        router.push({
          pathname: '/timer',
          params: { modal: 'true' }
        });
      },
      onSecondary: () => closePopup(),
    });
  };

  const handleViewSpaces = () => {
    router.push('/spaces');
  };

  // Show loading while checking authentication
  if (!user) {
    return (
      <View style={styles.loadingContainer}>
        <Text style={styles.loadingText}>Checking authentication...</Text>
      </View>
    );
  }

  return (
    <View style={{ flex: 1 }}>
      <SafeAreaView style={GlobalStyles.safeArea}>
      <ScrollView style={GlobalStyles.container} showsVerticalScrollIndicator={false}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={GlobalStyles.title}>Study Together</Text>
          <Text style={GlobalStyles.textSecondary}>
            Your journey to academic excellence
          </Text>
        </View>

        {/* Personalized Greeting */}
        <View style={styles.greetingCard}>
          <Text style={styles.greetingText}>
            What's up, {getUserDisplayName(user)}! 👋
          </Text>
          <Text style={styles.greetingSubtext}>
            Ready to crush your study goals today?
          </Text>
        </View>

        {/* Error Banner */}
        {todayMetrics.error && (
          <View style={styles.errorBanner}>
            <Ionicons name="warning" size={20} color={Colors.error} />
            <Text style={styles.errorText}>{todayMetrics.error}</Text>
          </View>
        )}

        {/* Welcome Card */}
        <View style={[GlobalStyles.glassCard, styles.welcomeCard]}>
          <Ionicons name="school" size={48} color={Colors.primary} />
          <Text style={styles.welcomeTitle}>Welcome Back!</Text>
          <Text style={GlobalStyles.textSecondary}>
            Ready to start your study session? Let's make today productive.
          </Text>
        </View>

        {/* Quick Stats */}
        <View style={[GlobalStyles.glassCard, styles.statsCard]}>
          <Text style={GlobalStyles.subtitle}>Today's Progress</Text>
          <View style={styles.statsRow}>
            <View style={styles.statItem}>
              <Ionicons name="time" size={24} color={Colors.accent} />
              <Text style={styles.statNumber}>
                {todayMetrics.loading ? '...' : todayMetrics.hoursDisplay}
              </Text>
              <Text style={GlobalStyles.textMuted}>Studied</Text>
            </View>
            <View style={styles.statItem}>
              <Ionicons name="flame" size={24} color={Colors.fire} />
              <Text style={styles.statNumber}>
                {todayMetrics.loading ? '...' : todayMetrics.streak}
              </Text>
              <Text style={GlobalStyles.textMuted}>Streak</Text>
            </View>
            <View style={styles.statItem}>
              <Ionicons name="trophy" size={24} color={Colors.streak} />
              <Text style={styles.statNumber}>
                {todayMetrics.loading ? '...' : todayMetrics.xp}
              </Text>
              <Text style={GlobalStyles.textMuted}>XP</Text>
            </View>
          </View>
        </View>

        {/* Quick Actions */}
        <View style={[GlobalStyles.glassCard, styles.actionsCard]}>
          <Text style={GlobalStyles.subtitle}>Quick Actions</Text>

          <TouchableOpacity
            style={[GlobalStyles.button, styles.primaryButton]}
            onPress={handleStartSession}
          >
            <Ionicons name="play" size={20} color={Colors.text} />
            <Text style={GlobalStyles.buttonText}>Start Study Session</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.secondaryButton}
            onPress={handleViewSpaces}
          >
            <Ionicons name="people" size={20} color={Colors.primary} />
            <Text style={[GlobalStyles.text, { marginLeft: 8 }]}>Join Study Spaces</Text>
          </TouchableOpacity>
        </View>

        {/* Motivational Quote */}
        <View style={[GlobalStyles.glassCard, styles.quoteCard]}>
          <Ionicons name="bulb" size={32} color={Colors.accent} />
          <Text style={styles.quoteText}>
            "The beautiful thing about learning is that no one can take it away from you."
          </Text>
          <Text style={GlobalStyles.textMuted}>- B.B. King</Text>
        </View>
      </ScrollView>
    </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: Colors.background,
  },
  loadingText: {
    fontSize: 16,
    color: Colors.textSecondary,
  },
  userDebugText: {
    fontSize: 12,
    color: Colors.textMuted,
    marginTop: 8,
  },
  greetingCard: {
    marginHorizontal: 20,
    marginBottom: 16,
    padding: 20,
    backgroundColor: 'rgba(99, 102, 241, 0.1)',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(99, 102, 241, 0.2)',
  },
  greetingText: {
    fontSize: 24,
    fontWeight: 'bold',
    color: Colors.text,
    marginBottom: 4,
  },
  greetingSubtext: {
    fontSize: 16,
    color: Colors.textSecondary,
  },
  errorBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(239, 68, 68, 0.1)',
    borderRadius: 8,
    padding: 12,
    marginHorizontal: 20,
    marginBottom: 16,
  },
  errorText: {
    color: Colors.error,
    fontSize: 14,
    marginLeft: 8,
    flex: 1,
  },
  header: {
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 16,
    alignItems: 'center',
  },
  welcomeCard: {
    alignItems: 'center',
    paddingVertical: 32,
  },
  welcomeTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: Colors.text,
    marginTop: 16,
    marginBottom: 8,
  },
  statsCard: {
    paddingVertical: 24,
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
    color: Colors.accent,
    marginVertical: 8,
  },
  actionsCard: {
    alignItems: 'center',
    paddingVertical: 32,
  },
  primaryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
    minWidth: 200,
  },
  secondaryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.primary,
    backgroundColor: 'rgba(99, 102, 241, 0.1)',
  },
  quoteCard: {
    alignItems: 'center',
    paddingVertical: 32,
    marginBottom: 100,
  },
  quoteText: {
    fontSize: 16,
    fontStyle: 'italic',
    color: Colors.textSecondary,
    textAlign: 'center',
    marginTop: 16,
    marginBottom: 8,
    lineHeight: 24,
  },
});