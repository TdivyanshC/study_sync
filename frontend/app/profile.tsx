import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Image,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '../constants/Colors';
import { GlobalStyles } from '../constants/Theme';
import { useUser } from '../providers/UserProvider';

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

// Mock achievements data
const mockAchievements = [
  {
    id: '1',
    title: '10-Hour Day',
    description: 'Study for 10 hours in a single day',
    icon: 'trophy',
    color: Colors.streak,
    unlocked: true,
    date: 'Jan 10, 2024',
  },
  {
    id: '2',
    title: '7-Day Streak',
    description: 'Maintain a 7-day study streak',
    icon: 'flame',
    color: Colors.fire,
    unlocked: true,
    date: 'Jan 8, 2024',
  },
  {
    id: '3',
    title: 'Early Bird',
    description: 'Start studying before 7 AM',
    icon: 'sunny',
    color: Colors.warning,
    unlocked: false,
    date: null,
  },
  {
    id: '4',
    title: 'Night Owl',
    description: 'Study after 10 PM for 5 days',
    icon: 'moon',
    color: Colors.primary,
    unlocked: false,
    date: null,
  },
  {
    id: '5',
    title: 'Team Player',
    description: 'Join 3 different study spaces',
    icon: 'people',
    color: Colors.accent,
    unlocked: true,
    date: 'Jan 5, 2024',
  },
  {
    id: '6',
    title: 'Marathon Runner',
    description: 'Study for 100 hours total',
    icon: 'medal',
    color: Colors.success,
    unlocked: true,
    date: 'Dec 28, 2023',
  },
];

interface AchievementCardProps {
  achievement: typeof mockAchievements[0];
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
  // Use UserProvider for consistent user data across the app
  const user = useUser();

  // Provide safe fallbacks for all user data
  const safeUser = {
    level: user?.level ?? 1,
    xp: user?.xp ?? 0,
    streak: user?.streak ?? 0,
  };

  const character = getCharacterInfo(safeUser.level);

  // Calculate XP progress for next level (100 XP per level)
  const currentXP = safeUser.xp;
  const xpForCurrentLevel = (safeUser.level - 1) * 100;
  const xpForNextLevel = safeUser.level * 100;
  const currentLevelProgress = currentXP - xpForCurrentLevel;
  const xpNeededForNext = xpForNextLevel - currentXP;
  const progressPercent = (currentLevelProgress / 100) * 100;

  // Calculate total hours based on new XP formula (10 XP per 60 min = 1/6 XP per min)
  const totalHours = Math.floor(currentXP * 6 / 60); // Reverse of 1/6 XP per minute

  // Calculate streak milestones
  const nextMilestone = getNextStreakMilestone(safeUser.streak);
  const daysToNextMilestone = Math.max(0, nextMilestone - safeUser.streak);

  const unlockedAchievements = mockAchievements.filter(a => a.unlocked);

  return (
    <SafeAreaView style={GlobalStyles.safeArea}>
      <StatusBar style="light" backgroundColor={Colors.background} />
      <ScrollView style={GlobalStyles.container} showsVerticalScrollIndicator={false}>
        
        {/* Header */}
        <View style={styles.header}>
          <Text style={[GlobalStyles.title, { fontSize: 32, color: 'red' }]}>PROFILE SCREEN</Text>
          <Text style={GlobalStyles.title}>Profile</Text>
          <Text style={GlobalStyles.textSecondary}>Your study journey</Text>
        </View>

        {/* Character Card */}
        <View style={[GlobalStyles.glassCard, styles.characterCard]}>
          <View style={styles.characterIcon}>
            <Text style={styles.characterEmoji}>{character.icon}</Text>
          </View>
          
          <Text style={styles.characterName}>{character.name}</Text>
          <Text style={styles.characterLevel}>Level {safeUser.level}</Text>
          
          {/* XP Progress */}
          <View style={styles.xpContainer}>
            <View style={styles.xpBar}>
              <View style={[styles.xpProgress, { width: `${Math.min(progressPercent, 100)}%` }]} />
            </View>
            <Text style={GlobalStyles.textMuted}>
              {currentLevelProgress} / 100 XP
            </Text>
          </View>
        </View>

        {/* Stats Overview */}
        <View style={[GlobalStyles.glassCard, styles.statsOverview]}>
          <Text style={GlobalStyles.subtitle}>Study Statistics</Text>
          
          <View style={styles.statsGrid}>
            <View style={styles.statBox}>
              <Ionicons name="time" size={28} color={Colors.primary} />
              <Text style={styles.statNumber}>{totalHours}h</Text>
              <Text style={GlobalStyles.textMuted}>Total Hours</Text>
            </View>
            
            <View style={styles.statBox}>
              <Ionicons name="flame" size={28} color={Colors.fire} />
              <Text style={styles.statNumber}>{safeUser.streak}</Text>
              <Text style={GlobalStyles.textMuted}>Current Streak</Text>
            </View>
            
            <View style={styles.statBox}>
              <Ionicons name="trending-up" size={28} color={Colors.success} />
              <Text style={styles.statNumber}>85%</Text>
              <Text style={GlobalStyles.textMuted}>Avg Efficiency</Text>
            </View>
            
            <View style={styles.statBox}>
              <Ionicons name="trophy" size={28} color={Colors.streak} />
              <Text style={styles.statNumber}>{unlockedAchievements.length}</Text>
              <Text style={GlobalStyles.textMuted}>Achievements</Text>
            </View>
          </View>
        </View>

        {/* Streak Milestone Card */}
        <View style={[GlobalStyles.glassCard, styles.performanceCard]}>
          <Text style={GlobalStyles.subtitle}>Study Streak</Text>
          
          <View style={styles.performanceStats}>
            <View style={styles.performanceStat}>
              <Text style={styles.performanceNumber}>{safeUser.streak}</Text>
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
              <Text style={styles.performanceNumber}>{totalHours}h</Text>
              <Text style={GlobalStyles.textMuted}>Hours Studied</Text>
            </View>
            
            <View style={styles.performanceStat}>
              <Text style={styles.performanceNumber}>{safeUser.streak}</Text>
              <Text style={GlobalStyles.textMuted}>Current Streak</Text>
            </View>
            
            <View style={styles.performanceStat}>
              <Text style={styles.performanceNumber}>{Math.floor(totalHours / 7)}h</Text>
              <Text style={GlobalStyles.textMuted}>Avg/Day</Text>
            </View>
          </View>
        </View>

        {/* Achievements */}
        <View style={[GlobalStyles.glassCard, { marginBottom: 100 }]}>
          <Text style={GlobalStyles.subtitle}>Achievements & Badges</Text>
          <Text style={[GlobalStyles.textMuted, { marginBottom: 20 }]}>
            {unlockedAchievements.length} of {mockAchievements.length} unlocked
          </Text>
          
          {mockAchievements.map(achievement => (
            <AchievementCard key={achievement.id} achievement={achievement} />
          ))}
        </View>
      </ScrollView>
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
});