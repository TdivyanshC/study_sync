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
import { StatusBar } from 'expo-status-bar';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '../constants/Colors';
import { GlobalStyles } from '../constants/Theme';
import { router } from 'expo-router';
import { useAuth } from '../hooks/useAuth';
import { metricsService } from '../services/metricsService';
import { xpService } from '../services/xpService';
import { streakService } from '../services/streakService';
import { spaceService } from '../services/spaceService';

// Character levels mapping
const getCharacterInfo = (level: number) => {
  const characters = [
    { name: 'Beginner Scholar', icon: '🎓', minXP: 0, maxXP: 399 },
    { name: 'Focused Knight', icon: '⚔️', minXP: 400, maxXP: 1199 },
    { name: 'Master Sage', icon: '🧙‍♂️', minXP: 1200, maxXP: 2399 },
    { name: 'Legendary Mentor', icon: '👑', minXP: 2400, maxXP: 99999 },
  ];
  return characters[Math.min(level - 1, characters.length - 1)];
};

// Calculate next streak milestone
const getNextStreakMilestone = (currentStreak: number) => {
  if (currentStreak === 0) return 3;
  if (currentStreak >= 3 && currentStreak < 7) return 7;
  if (currentStreak >= 7 && currentStreak < 30) return 30;
  if (currentStreak >= 30 && currentStreak < 60) return 60;
  if (currentStreak >= 60 && currentStreak < 100) return 100;
  if (currentStreak >= 100) return 365;
  return 3;
};

interface Achievement {
  id: string;
  title: string;
  description: string;
  icon: string;
  color: string;
  unlocked: boolean;
  date?: string | null;
}

interface AchievementCardProps {
  achievement: Achievement;
}

const AchievementCard: React.FC<AchievementCardProps> = ({ achievement }) => {
  return (
    <View style={[styles.achievementCard, { opacity: achievement.unlocked ? 1 : 0.5 }]}>
      <View style={[styles.achievementIcon, { backgroundColor: achievement.color + '20' }]}>
        <Ionicons 
          name={achievement.icon as any} 
          size={24} 
          color={achievement.unlocked ? achievement.color : Colors.textMuted} 
        />
      </View>
      
      <View style={styles.achievementInfo}>
        <Text style={[styles.achievementTitle, { 
          color: achievement.unlocked ? Colors.text : Colors.textMuted 
        }]}>
          {achievement.title}
        </Text>
        <Text style={GlobalStyles.textMuted}>{achievement.description}</Text>
        {achievement.unlocked && achievement.date && (
          <Text style={styles.achievementDate}>{achievement.date}</Text>
        )}
      </View>
      
      {achievement.unlocked && (
        <Ionicons name="checkmark-circle" size={20} color={Colors.success} />
      )}
    </View>
  );
};

export default function ProfileScreen() {
  const { user } = useAuth();
  
  // State for profile data
  const [profileData, setProfileData] = useState<{
    level: number;
    xp: number;
    streak: number;
    totalHours: number;
    badges: Achievement[];
    loading: boolean;
    error: string | null;
  }>({
    level: 1,
    xp: 0,
    streak: 0,
    totalHours: 0,
    badges: [],
    loading: true,
    error: null,
  });

  // Redirect to login if not authenticated
  useEffect(() => {
    if (!user) {
      console.log('No authenticated user, redirecting to login');
      router.replace('/login');
      return;
    }
  }, [user]);

  // Load profile data
  useEffect(() => {
    if (!user) return;
    
    loadProfileData();
  }, [user]);

  const loadProfileData = async () => {
    if (!user) return;

    try {
      setProfileData(prev => ({ ...prev, loading: true, error: null }));
      
      console.log(`👤 Loading profile data for user: ${user.id}`);
      
      // Load all profile data concurrently
      const [xpStats, streakData, badgesData] = await Promise.all([
        metricsService.getXPStats(user.id).catch(err => {
          console.error('Failed to get XP stats:', err);
          return { total_xp: 0, level: 1 };
        }),
        metricsService.getStreakData(user.id).catch(err => {
          console.error('Failed to get streak data:', err);
          return { data: { current_streak: 0 } };
        }),
        spaceService.getUserBadges(user.id).catch(err => {
          console.error('Failed to get badges:', err);
          return { data: { badges: [] } };
        })
      ]);

      // Transform badges data to achievement format
      const achievements = badgesData.data?.badges?.map((badge: any, index: number) => ({
        id: badge.id || `badge-${index}`,
        title: badge.title || 'Achievement',
        description: badge.description || 'Badge earned',
        icon: 'trophy',
        color: Colors.streak,
        unlocked: badge.is_achieved || false,
        date: badge.achieved_at ? new Date(badge.achieved_at).toLocaleDateString() : null,
      })) || [];

      // Calculate total hours based on XP (approximation)
      const totalHours = Math.floor((xpStats.total_xp || 0) * 6 / 60);

      setProfileData({
        level: xpStats.level || 1,
        xp: xpStats.total_xp || 0,
        streak: streakData.data?.current_streak || 0,
        totalHours,
        badges: achievements,
        loading: false,
        error: null,
      });

      console.log('✅ Profile data loaded:', {
        level: xpStats.level,
        xp: xpStats.total_xp,
        streak: streakData.data?.current_streak,
        badges: achievements.length
      });

    } catch (error: any) {
      console.error('❌ Failed to load profile data:', error);
      
      let errorMessage = 'Failed to load profile';
      if (error.message?.includes('Network')) {
        errorMessage = 'Network error - check your connection';
      } else if (error.message?.includes('Authentication')) {
        errorMessage = 'Authentication error - please login again';
        router.replace('/login');
      }
      
      setProfileData(prev => ({
        ...prev,
        loading: false,
        error: errorMessage,
      }));
      
      if (!error.message?.includes('Authentication')) {
        Alert.alert('Error', errorMessage);
      }
    }
  };

  // Show loading while checking authentication
  if (!user) {
    return (
      <View style={styles.loadingContainer}>
        <Text style={styles.loadingText}>Checking authentication...</Text>
      </View>
    );
  }

  const character = getCharacterInfo(profileData.level);
  
  // Calculate XP progress for next level
  const currentXP = profileData.xp;
  const xpForCurrentLevel = (profileData.level - 1) * 100;
  const xpForNextLevel = profileData.level * 100;
  const currentLevelProgress = Math.max(0, currentXP - xpForCurrentLevel);
  const xpNeededForNext = Math.max(0, xpForNextLevel - currentXP);
  const progressPercent = (currentLevelProgress / 100) * 100;

  // Calculate streak milestones
  const nextMilestone = getNextStreakMilestone(profileData.streak);
  const daysToNextMilestone = Math.max(0, nextMilestone - profileData.streak);

  const unlockedAchievements = profileData.badges.filter(a => a.unlocked);

  return (
    <SafeAreaView style={GlobalStyles.safeArea}>
      <StatusBar style="light" backgroundColor={Colors.background} />
      <ScrollView style={GlobalStyles.container} showsVerticalScrollIndicator={false}>
        
        {/* Header */}
        <View style={styles.header}>
          <Text style={GlobalStyles.title}>Profile</Text>
          <Text style={GlobalStyles.textSecondary}>Your study journey</Text>
          {/* Show user email for debugging */}
          {__DEV__ && (
            <Text style={styles.userDebugText}>
              Logged in as: {user.email}
            </Text>
          )}
        </View>

        {/* Error Banner */}
        {profileData.error && (
          <View style={styles.errorBanner}>
            <Ionicons name="warning" size={20} color={Colors.error} />
            <Text style={styles.errorText}>{profileData.error}</Text>
          </View>
        )}

        {/* Character Card */}
        <View style={[GlobalStyles.glassCard, styles.characterCard]}>
          <View style={styles.characterIcon}>
            <Text style={styles.characterEmoji}>{character.icon}</Text>
          </View>
          
          <Text style={styles.characterName}>{character.name}</Text>
          <Text style={styles.characterLevel}>Level {profileData.level}</Text>
          
          {/* XP Progress */}
          <View style={styles.xpContainer}>
            <View style={styles.xpBar}>
              <View style={[styles.xpProgress, { width: `${Math.min(progressPercent, 100)}%` }]} />
            </View>
            <Text style={GlobalStyles.textMuted}>
              {currentLevelProgress} / 100 XP {xpNeededForNext > 0 ? `(${xpNeededForNext} to next level)` : '(Max level!)'}
            </Text>
          </View>
        </View>

        {/* Stats Overview */}
        <View style={[GlobalStyles.glassCard, styles.statsOverview]}>
          <Text style={GlobalStyles.subtitle}>Study Statistics</Text>
          
          <View style={styles.statsGrid}>
            <View style={styles.statBox}>
              <Ionicons name="time" size={28} color={Colors.primary} />
              <Text style={styles.statNumber}>
                {profileData.loading ? '...' : `${profileData.totalHours}h`}
              </Text>
              <Text style={GlobalStyles.textMuted}>Total Hours</Text>
            </View>
            
            <View style={styles.statBox}>
              <Ionicons name="flame" size={28} color={Colors.fire} />
              <Text style={styles.statNumber}>
                {profileData.loading ? '...' : profileData.streak}
              </Text>
              <Text style={GlobalStyles.textMuted}>Current Streak</Text>
            </View>
            
            <View style={styles.statBox}>
              <Ionicons name="trending-up" size={28} color={Colors.success} />
              <Text style={styles.statNumber}>85%</Text>
              <Text style={GlobalStyles.textMuted}>Avg Efficiency</Text>
            </View>
            
            <View style={styles.statBox}>
              <Ionicons name="trophy" size={28} color={Colors.streak} />
              <Text style={styles.statNumber}>
                {profileData.loading ? '...' : unlockedAchievements.length}
              </Text>
              <Text style={GlobalStyles.textMuted}>Achievements</Text>
            </View>
          </View>
        </View>

        {/* Streak Milestone Card */}
        <View style={[GlobalStyles.glassCard, styles.performanceCard]}>
          <Text style={GlobalStyles.subtitle}>Study Streak</Text>
          
          <View style={styles.performanceStats}>
            <View style={styles.performanceStat}>
              <Text style={styles.performanceNumber}>{profileData.streak}</Text>
              <Text style={GlobalStyles.textMuted}>Current Streak</Text>
            </View>
            
            <View style={styles.performanceStat}>
              <Text style={styles.performanceNumber}>{nextMilestone}</Text>
              <Text style={GlobalStyles.textMuted}>Next Milestone</Text>
            </View>
            
            <View style={styles.performanceStat}>
              <Text style={styles.performanceNumber}>{daysToNextMilestone}</Text>
              <Text style={GlobalStyles.textMuted}>Days to Go</Text>
            </View>
          </View>
        </View>

        {/* Recent Performance */}
        <View style={[GlobalStyles.glassCard, styles.performanceCard]}>
          <Text style={GlobalStyles.subtitle}>This Week</Text>
          
          <View style={styles.performanceStats}>
            <View style={styles.performanceStat}>
              <Text style={styles.performanceNumber}>{Math.floor(profileData.totalHours / 7)}h</Text>
              <Text style={GlobalStyles.textMuted}>Avg/Day</Text>
            </View>
            
            <View style={styles.performanceStat}>
              <Text style={styles.performanceNumber}>{profileData.streak}</Text>
              <Text style={GlobalStyles.textMuted}>Current Streak</Text>
            </View>
            
            <View style={styles.performanceStat}>
              <Text style={styles.performanceNumber}>
                {profileData.loading ? '...' : profileData.xp}
              </Text>
              <Text style={GlobalStyles.textMuted}>Total XP</Text>
            </View>
          </View>
        </View>

        {/* Achievements */}
        <View style={[GlobalStyles.glassCard, { marginBottom: 100 }]}>
          <Text style={GlobalStyles.subtitle}>Achievements & Badges</Text>
          <Text style={[GlobalStyles.textMuted, { marginBottom: 20 }]}>
            {unlockedAchievements.length} of {profileData.badges.length || 0} unlocked
          </Text>
          
          {profileData.badges.length > 0 ? (
            profileData.badges.map(achievement => (
              <AchievementCard key={achievement.id} achievement={achievement} />
            ))
          ) : (
            <View style={styles.noDataContainer}>
              <Ionicons name="trophy-outline" size={48} color={Colors.textMuted} />
              <Text style={GlobalStyles.textMuted}>
                {profileData.loading ? 'Loading achievements...' : 'No achievements yet. Keep studying!'}
              </Text>
            </View>
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
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
  characterCard: {
    alignItems: 'center',
    paddingVertical: 32,
    marginHorizontal: 16,
    marginBottom: 20,
  },
  characterIcon: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: Colors.surfaceElevated,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  characterEmoji: {
    fontSize: 40,
  },
  characterName: {
    fontSize: 24,
    fontWeight: 'bold',
    color: Colors.text,
    marginBottom: 4,
  },
  characterLevel: {
    fontSize: 16,
    color: Colors.primary,
    fontWeight: '600',
    marginBottom: 20,
  },
  xpContainer: {
    width: '100%',
    alignItems: 'center',
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
    backgroundColor: Colors.primary,
    borderRadius: 4,
  },
  statsOverview: {
    marginHorizontal: 16,
    marginBottom: 20,
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  statBox: {
    width: '48%',
    alignItems: 'center',
    paddingVertical: 20,
    backgroundColor: Colors.surfaceElevated,
    borderRadius: 12,
    marginBottom: 12,
  },
  statNumber: {
    fontSize: 24,
    fontWeight: 'bold',
    color: Colors.text,
    marginVertical: 8,
  },
  performanceCard: {
    marginHorizontal: 16,
    marginBottom: 20,
  },
  performanceStats: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  performanceStat: {
    alignItems: 'center',
  },
  performanceNumber: {
    fontSize: 28,
    fontWeight: 'bold',
    color: Colors.accent,
    marginBottom: 4,
  },
  achievementCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surfaceElevated,
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
  },
  achievementIcon: {
    width: 48,
    height: 48,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 16,
  },
  achievementInfo: {
    flex: 1,
  },
  achievementTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  achievementDate: {
    fontSize: 12,
    color: Colors.accent,
    fontWeight: '600',
    marginTop: 4,
  },
  noDataContainer: {
    alignItems: 'center',
    paddingVertical: 32,
  },
});