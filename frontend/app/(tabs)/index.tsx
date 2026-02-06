import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Alert,
  RefreshControl,
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
import { supabase } from '../../lib/supabase';
import SessionSelectionModal from '../../components/SessionSelectionModal';

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

  // State for pull-to-refresh
  const [refreshing, setRefreshing] = useState(false);

  // Redirect to login if not authenticated
  useEffect(() => {
    if (!user) {
      console.log('No authenticated user, redirecting to login');
      router.replace('/login');
      return;
    }
  }, [user]);

  // Fetch today's metrics on component mount
  // Removed interval-based refresh to avoid excessive API calls and bundling
  useEffect(() => {
    if (!user) return;
    loadTodayMetrics();
  }, [user]);

  // Optional: Manual refresh trigger - can be called from UI
  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await loadTodayMetrics(true);
    } finally {
      setRefreshing(false);
    }
  }, [user]);

  // Track if initial load is complete
  const metricsLoadedRef = React.useRef(false);

  const loadTodayMetrics = async (isRefresh = false) => {
    if (!user) {
      console.log('No user available for metrics loading');
      return;
    }

    try {
      // Only show loading state on initial load, not on refreshes
      if (!isRefresh) {
        setTodayMetrics(prev => ({ ...prev, loading: true, error: null }));
      }
      
      console.log(`📊 Loading today's metrics for user: ${user.id}${isRefresh ? ' (refresh)' : ''}`);
      
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
        startSession('General Study');
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

  // State for user's preferred sessions
  const [preferredSessions, setPreferredSessions] = useState<any[]>([]);
  const [sessionsLoading, setSessionsLoading] = useState(true);
  
  // State for session selection modal
  const [sessionModalVisible, setSessionModalVisible] = useState(false);

  // Available session types with their metadata
  const SESSION_TYPES = {
    gym: { name: 'Gym Session', emoji: '💪', color: '#ff6b35' },
    meditation: { name: 'Meditation', emoji: '🧘', color: '#8b5cf6' },
    coding: { name: 'Coding', emoji: '💻', color: '#06d6a0' },
    cricket: { name: 'Cricket', emoji: '🏏', color: '#fbbf24' },
    singing: { name: 'Singing', emoji: '🎤', color: '#ec4899' },
    study: { name: 'Study Session', emoji: '📚', color: '#3b82f6' },
    yoga: { name: 'Yoga', emoji: '🧘‍♀️', color: '#10b981' },
    reading: { name: 'Reading', emoji: '📖', color: '#6366f1' },
    writing: { name: 'Writing', emoji: '✍️', color: '#f59e0b' },
    music: { name: 'Music Practice', emoji: '🎵', color: '#8b5cf6' },
    gaming: { name: 'Gaming', emoji: '🎮', color: '#ef4444' },
    cooking: { name: 'Cooking', emoji: '👨‍🍳', color: '#f97316' },
  };

  // Fetch user's preferred sessions
  const fetchPreferredSessions = async () => {
    if (!user) return;

    try {
      setSessionsLoading(true);
      console.log('🔍 Fetching preferred sessions for user:', user.id);

      const { data, error } = await supabase
        .from('users')
        .select('preferred_sessions')
        .eq('id', user.id)
        .single();

      if (error) {
        console.warn('⚠️ Error fetching preferred sessions:', error.message);
        setPreferredSessions([]);
        return;
      }

      const sessions = data?.preferred_sessions || [];
      console.log('✅ Preferred sessions fetched:', sessions);

      // Transform sessions into display format
      const sessionCards = sessions
        .map((sessionId: string) => {
          const sessionType = SESSION_TYPES[sessionId as keyof typeof SESSION_TYPES];
          if (sessionType) {
            return {
              id: sessionId,
              ...sessionType,
            };
          }
          return null;
        })
        .filter(Boolean);

      setPreferredSessions(sessionCards);
    } catch (error: any) {
      console.error('❌ Error fetching preferred sessions:', error);
      setPreferredSessions([]);
    } finally {
      setSessionsLoading(false);
    }
  };

  // Load preferred sessions when component mounts
  useEffect(() => {
    if (user) {
      fetchPreferredSessions();
    }
  }, [user]);

  // Handle session start for specific session type
  const handleSessionStart = (sessionType: string) => {
    openPopup({
      message: `Ready to start your ${SESSION_TYPES[sessionType as keyof typeof SESSION_TYPES]?.name || 'session'}?`,
      primaryButtonText: "Let's go! 🚀",
      secondaryButtonText: "Maybe later",
      animation: require("../../assets/animations/avatar 1-MJ2k6.json"),
      onPrimary: () => {
        closePopup();
        // Start session with session type name
        const sessionName = SESSION_TYPES[sessionType as keyof typeof SESSION_TYPES]?.name || 'Study Session';
        startSession(sessionName);
        router.push({
          pathname: '/timer',
          params: { modal: 'true', sessionType }
        });
      },
      onSecondary: () => closePopup(),
    });
  };

  // Handle adding new sessions
  const handleAddSessions = () => {
    setSessionModalVisible(true);
  };

  // Handle when a new session is added
  const handleSessionAdded = (newSession: any) => {
    setPreferredSessions(prev => [...prev, newSession]);
    console.log('✅ New session added:', newSession.name);
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
      <ScrollView 
        style={GlobalStyles.container} 
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >


        {/* Personalized Greeting */}
        <View style={styles.greetingCard}>
          <Text style={styles.greetingText}>
            What's up, {getUserDisplayName(user).split(' ')[0]}! 👋
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

        {/* Let's Roll Section */}
        <View style={[GlobalStyles.glassCard, styles.sessionsCard]}>
          <Text style={GlobalStyles.subtitle}>Let's Roll</Text>
          <Text style={GlobalStyles.textSecondary}>
            Choose your activity and get started
          </Text>

          {sessionsLoading ? (
            <View style={styles.loadingContainer}>
              <Text style={GlobalStyles.textMuted}>Loading your sessions...</Text>
            </View>
          ) : preferredSessions.length > 0 ? (
            <View style={styles.sessionsList}>
              {preferredSessions.map((session) => (
                <TouchableOpacity
                  key={session.id}
                  style={styles.sessionCard}
                  onPress={() => handleSessionStart(session.id)}
                  activeOpacity={0.7}
                >
                  <View style={styles.sessionContent}>
                    <View style={[styles.sessionIcon, { backgroundColor: session.color + '20' }]}>
                      <Text style={styles.sessionEmoji}>{session.emoji}</Text>
                    </View>
                    <View style={styles.sessionInfo}>
                      <Text style={styles.sessionName}>{session.name}</Text>
                    </View>
                    <TouchableOpacity
                      style={[styles.startButton, { backgroundColor: '#3b82f6' }]}
                      onPress={() => handleSessionStart(session.id)}
                    >
                      <Text style={styles.startButtonText}>Start</Text>
                    </TouchableOpacity>
                  </View>
                </TouchableOpacity>
              ))}
            </View>
          ) : (
            <View style={styles.emptyState}>
              <Ionicons name="time" size={48} color={Colors.textMuted} />
              <Text style={GlobalStyles.textMuted}>No preferred sessions set</Text>
              <Text style={GlobalStyles.textMuted}>Complete onboarding to see your activities</Text>
            </View>
          )}

          {/* Add More Sessions Card */}
          <TouchableOpacity
            style={styles.addSessionsCard}
            onPress={handleAddSessions}
            activeOpacity={0.7}
          >
            <View style={styles.addSessionsContent}>
              <View style={styles.addSessionsIcon}>
                <Ionicons name="add-circle" size={32} color={Colors.primary} />
              </View>
              <View style={styles.addSessionsInfo}>
                <Text style={styles.addSessionsTitle}>Add More Sessions</Text>
                <Text style={styles.addSessionsSubtitle}>Discover new activities to track</Text>
              </View>
              <Ionicons name="chevron-forward" size={20} color={Colors.textMuted} />
            </View>
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

        {/* Session Selection Modal */}
        <SessionSelectionModal
          visible={sessionModalVisible}
          onClose={() => setSessionModalVisible(false)}
          onSessionAdded={handleSessionAdded}
          currentSessions={preferredSessions.map(s => s.id)}
        />
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
  sessionsCard: {
    paddingVertical: 24,
  },
  sessionsList: {
    marginTop: 16,
    gap: 12,
  },
  sessionCard: {
    backgroundColor: Colors.surface,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: Colors.cardBorder,
    shadowColor: Colors.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  sessionContent: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
  },
  sessionIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  sessionEmoji: {
    fontSize: 24,
  },
  sessionInfo: {
    flex: 1,
  },
  sessionName: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.text,
  },
  startButton: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 20,
    minWidth: 70,
  },
  startButtonText: {
    color: 'white',
    fontSize: 14,
    fontWeight: '600',
    textAlign: 'center',
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 32,
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
  addSessionsCard: {
    backgroundColor: Colors.surface,
    borderRadius: 16,
    borderWidth: 2,
    borderColor: Colors.primary + '40',
    borderStyle: 'dashed',
    shadowColor: Colors.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
    marginTop: 16,
  },
  addSessionsContent: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
  },
  addSessionsIcon: {
    marginRight: 16,
  },
  addSessionsInfo: {
    flex: 1,
  },
  addSessionsTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.text,
  },
  addSessionsSubtitle: {
    fontSize: 14,
    color: Colors.textSecondary,
    marginTop: 2,
  },
});