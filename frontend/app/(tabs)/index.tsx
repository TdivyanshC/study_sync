import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '../../constants/Colors';
import { GlobalStyles } from '../../constants/Theme';
import { router } from 'expo-router';
import { useStudyStore } from '../../hooks/useStudySession';
import { usePopup } from '../../providers/PopupProvider';
import { getRandomJoke } from '../../data/jokes';
import { gamificationApi } from '../../src/api/gamificationApi';
import { DEMO_USER } from '../../lib/constants';

export default function Index() {
  const { startSession } = useStudyStore();
  const { openPopup, closePopup } = usePopup();
  
  // State for today's metrics
  const [todayMetrics, setTodayMetrics] = useState({
    hoursStudied: 0,
    streak: 0,
    xp: 0,
    level: 0,
    hoursDisplay: "0h",
    loading: true,
  });

  // Fetch today's metrics on component mount and when screen is focused
  useEffect(() => {
    loadTodayMetrics();
    
    // Refresh data when user returns to this screen
    const interval = setInterval(() => {
      loadTodayMetrics();
    }, 30000); // Refresh every 30 seconds
    
    return () => clearInterval(interval);
  }, []);

  const loadTodayMetrics = async () => {
    try {
      const userId = DEMO_USER;
      
      // Use new gamification summary API
      const response = await fetch(`http://localhost:8000/api/xp/summary/${userId}`);
      const result = await response.json();
      
      if (result.success && result.data) {
        const data = result.data;
        
        // Format hours according to user requirements
        const minutes = data.today.minutes_studied;
        let hoursDisplay: string;
        
        if (minutes === 0) {
          hoursDisplay = "0h";
        } else if (minutes < 1) {
          hoursDisplay = "Just started!";
        } else if (minutes < 60) {
          hoursDisplay = `${minutes} min`;
        } else {
          const hours = Math.round((minutes / 60) * 10) / 10; // 1 decimal place
          hoursDisplay = `${hours}h`;
        }
        
        setTodayMetrics({
          hoursStudied: data.today.hours_studied,
          streak: data.streak.current,
          xp: data.xp.total,
          level: data.xp.level,
          hoursDisplay,
          loading: false,
        });
      } else {
        throw new Error('API returned invalid data');
      }
    } catch (error) {
      console.error('Failed to load today metrics:', error);
      // Set to 0 if error
      setTodayMetrics({
        hoursStudied: 0,
        streak: 0,
        xp: 0,
        level: 0,
        hoursDisplay: "0h",
        loading: false,
      });
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