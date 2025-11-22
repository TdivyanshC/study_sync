import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Animated,
  Dimensions,
} from 'react-native';
import { useStreakEvents } from '../hooks/useStreakEvents';
import { streakEventEmitter } from '../events/streakEvents';
import { gamificationApi } from '../api/gamificationApi';
import { buildApiUrl } from '../lib/apiConfig';

const { width } = Dimensions.get('window');

interface StreakData {
  current_streak: number;
  best_streak: number;
  streak_active: boolean;
  streak_multiplier?: number;
  streak_bonus_xp?: number;
  bonus_applied?: boolean;
  streak_bonus_details?: {
    bonus_reason: string;
    bonus_tier: number;
    next_tier_streak: number;
    tier_progress: number;
    is_bonus_active: boolean;
  };
}

interface ComprehensiveStreakData {
  success: boolean;
  message: string;
  streak_info: {
    current_streak: number;
    best_streak: number;
    streak_active: boolean;
    hours_since_last?: number;
  };
  bonus_info: {
    multiplier: number;
    bonus_xp: number;
    bonus_reason: string;
    bonus_tier: number;
    is_bonus_active: boolean;
  };
  milestone_info: {
    next_milestone: number | null;
    days_to_next: number | null;
    tier_progress: number;
    progress_percentage: number;
  };
  today_stats: {
    minutes_studied: number;
    xp_earned: number;
    daily_goal_progress: number;
  };
}

interface StreakWidgetProps {
  userId: string;
  onStreakUpdate?: (streakData: StreakData) => void;
}

interface StreakAnimationState {
  isVisible: boolean;
  type: 'fire' | 'milestone' | 'new_record';
}

const StreakWidget: React.FC<StreakWidgetProps> = ({
  userId,
  onStreakUpdate
}) => {
  const [streakData, setStreakData] = useState<StreakData>({
    current_streak: 0,
    best_streak: 0,
    streak_active: false,
    streak_multiplier: 1.0,
    streak_bonus_xp: 0,
    bonus_applied: false,
    streak_bonus_details: {
      bonus_reason: '',
      bonus_tier: 0,
      next_tier_streak: 7,
      tier_progress: 0,
      is_bonus_active: false,
    },
  });
  const [comprehensiveData, setComprehensiveData] = useState<ComprehensiveStreakData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [streakAnimation, setStreakAnimation] = useState<StreakAnimationState>({
    isVisible: false,
    type: 'fire',
  });
  
  // Animation values
  const [fireAnim] = useState(new Animated.Value(1));
  const [pulseAnim] = useState(new Animated.Value(1));
  const [bounceAnim] = useState(new Animated.Value(1));

  // Streak milestones
  const STREAK_MILESTONES = [3, 7, 14, 30, 60, 100];

  // Integrate streak event listeners
  useStreakEvents({
    userId,
    onStreakUpdated: (event) => {
      console.log('[StreakWidget] Streak updated:', event);
      const newStreakData = {
        current_streak: event.currentStreak,
        best_streak: event.bestStreak,
        streak_active: !event.streakBroken,
      };
      setStreakData(newStreakData);
      onStreakUpdate?.(newStreakData);
      
      // Trigger animation
      if (event.currentStreak > 0) {
        animateFire();
      }
    },
    onStreakMilestone: (event) => {
      console.log('[StreakWidget] Milestone reached:', event);
      triggerStreakAnimation('milestone');
    },
    onStreakBroken: (event) => {
      console.log('[StreakWidget] Streak broken:', event);
      setStreakData(prev => ({
        ...prev,
        streak_active: false,
      }));
    },
    onStreakBonus: (event) => {
      console.log('[StreakWidget] Streak bonus:', event);
      triggerStreakAnimation('fire');
    },
    enableDebug: true,
  });

  useEffect(() => {
    loadStreakData();
  }, [userId]);

  useEffect(() => {
    // Animate fire when streak changes
    if (streakData.current_streak > 0) {
      animateFire();
    }
  }, [streakData.current_streak]);

  const loadStreakData = async () => {
    try {
      setLoading(true);
      setError(null);
      
      // Get comprehensive streak data from the new endpoint
      const comprehensiveStreakUrl = buildApiUrl(`/xp/streak/comprehensive/${userId}`);
      const response = await fetch(comprehensiveStreakUrl);
      const comprehensiveData: ComprehensiveStreakData = await response.json();
      
      if (comprehensiveData.success) {
        setComprehensiveData(comprehensiveData);
        
        // Transform comprehensive data to match existing interface
        const newStreakData: StreakData = {
          current_streak: comprehensiveData.streak_info.current_streak,
          best_streak: comprehensiveData.streak_info.best_streak,
          streak_active: comprehensiveData.streak_info.streak_active,
          streak_multiplier: comprehensiveData.bonus_info.multiplier,
          streak_bonus_xp: comprehensiveData.bonus_info.bonus_xp,
          bonus_applied: comprehensiveData.bonus_info.is_bonus_active,
          streak_bonus_details: {
            bonus_reason: comprehensiveData.bonus_info.bonus_reason,
            bonus_tier: comprehensiveData.bonus_info.bonus_tier,
            next_tier_streak: comprehensiveData.milestone_info.next_milestone || 7,
            tier_progress: comprehensiveData.milestone_info.tier_progress,
            is_bonus_active: comprehensiveData.bonus_info.is_bonus_active,
          },
        };
        
        setStreakData(newStreakData);
        onStreakUpdate?.(newStreakData);
        
        // Trigger animation if bonus is active
        if (comprehensiveData.bonus_info.is_bonus_active) {
          animateBonus();
        }
      } else {
        throw new Error(comprehensiveData.message || 'Failed to load comprehensive streak data');
      }
      
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load streak data');
      console.error('Failed to load streak data:', err);
    } finally {
      setLoading(false);
    }
  };

  const animateBonus = () => {
    // Bonus animation - glowing golden effect
    Animated.sequence([
      Animated.timing(fireAnim, {
        toValue: 1.3,
        duration: 300,
        useNativeDriver: true,
      }),
      Animated.timing(fireAnim, {
        toValue: 1,
        duration: 300,
        useNativeDriver: true,
      }),
    ]).start();

    // Bonus pulse animation
    Animated.sequence([
      Animated.spring(pulseAnim, {
        toValue: 1.2,
        tension: 150,
        friction: 6,
        useNativeDriver: true,
      }),
      Animated.spring(pulseAnim, {
        toValue: 1,
        tension: 150,
        friction: 6,
        useNativeDriver: true,
      }),
    ]).start();
  };

  const animateFire = () => {
    // Fire animation - glowing effect
    Animated.sequence([
      Animated.timing(fireAnim, {
        toValue: 1.2,
        duration: 200,
        useNativeDriver: true,
      }),
      Animated.timing(fireAnim, {
        toValue: 1,
        duration: 200,
        useNativeDriver: true,
      }),
    ]).start();

    // Pulse animation for streak number
    Animated.sequence([
      Animated.spring(pulseAnim, {
        toValue: 1.1,
        tension: 100,
        friction: 8,
        useNativeDriver: true,
      }),
      Animated.spring(pulseAnim, {
        toValue: 1,
        tension: 100,
        friction: 8,
        useNativeDriver: true,
      }),
    ]).start();
  };

  const triggerStreakAnimation = (type: StreakAnimationState['type']) => {
    setStreakAnimation({ isVisible: true, type });
    
    // Bounce animation
    Animated.sequence([
      Animated.spring(bounceAnim, {
        toValue: 1.3,
        tension: 100,
        friction: 8,
        useNativeDriver: true,
      }),
      Animated.spring(bounceAnim, {
        toValue: 1,
        tension: 100,
        friction: 8,
        useNativeDriver: true,
      }),
    ]).start(() => {
      setTimeout(() => {
        setStreakAnimation({ isVisible: false, type: 'fire' });
      }, 2000);
    });
  };

  const getStreakLevel = (streak: number) => {
    if (streak >= 100) return { level: 'Legendary', icon: '👑', color: '#ffd700' };
    if (streak >= 60) return { level: 'Master', icon: '🔥', color: '#ff6b35' };
    if (streak >= 30) return { level: 'Expert', icon: '⭐', color: '#4ecdc4' };
    if (streak >= 14) return { level: 'Advanced', icon: '💪', color: '#45b7d1' };
    if (streak >= 7) return { level: 'Intermediate', icon: '🚀', color: '#96ceb4' };
    if (streak >= 3) return { level: 'Growing', icon: '🌱', color: '#ffeaa7' };
    return { level: 'Beginner', icon: '✨', color: '#ddd' };
  };

  const getMilestoneProgress = (streak: number) => {
    const nextMilestone = STREAK_MILESTONES.find(m => m > streak);
    const lastMilestone = [...STREAK_MILESTONES].reverse().find(m => m <= streak) || 0;
    
    if (nextMilestone) {
      const progress = (streak - lastMilestone) / (nextMilestone - lastMilestone);
      return {
        progress: Math.min(progress, 1),
        nextMilestone,
        daysToNext: nextMilestone - streak,
      };
    }
    
    return {
      progress: 1,
      nextMilestone: null,
      daysToNext: 0,
    };
  };

  const getAnimationEmoji = (type: StreakAnimationState['type']) => {
    switch (type) {
      case 'fire': return '🔥';
      case 'milestone': return '🎉';
      case 'new_record': return '🏆';
      default: return '🎉';
    }
  };

  if (loading) {
    return (
      <View style={styles.container}>
        <View style={styles.card}>
          <Text style={styles.loadingText}>Loading streak...</Text>
        </View>
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.container}>
        <View style={[styles.card, styles.errorCard]}>
          <Text style={styles.errorText}>⚠️ {error}</Text>
          <TouchableOpacity style={styles.retryButton} onPress={loadStreakData}>
            <Text style={styles.retryButtonText}>Retry</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  const streakLevel = getStreakLevel(streakData.current_streak);
  const milestoneProgress = getMilestoneProgress(streakData.current_streak);

  return (
    <View style={styles.container}>
      <View style={[styles.card, { borderColor: streakLevel.color }]}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.title}>Study Streak</Text>
          <Text style={styles.streakLevel}>{streakLevel.level}</Text>
        </View>

        {/* Main Streak Display */}
        <View style={styles.streakDisplay}>
          <Animated.View 
            style={[
              styles.fireContainer,
              {
                transform: [
                  { scale: Animated.multiply(fireAnim, pulseAnim) },
                ],
              }
            ]}
          >
            <Text style={[styles.fireEmoji, { color: streakLevel.color }]}>
              {streakLevel.icon}
            </Text>
          </Animated.View>
          
          <Animated.View style={{ transform: [{ scale: bounceAnim }] }}>
            <Text style={[styles.streakNumber, { color: streakLevel.color }]}>
              {streakData.current_streak}
            </Text>
          </Animated.View>
          
          <Text style={styles.streakLabel}>days</Text>
        </View>

        {/* Best Streak */}
        {streakData.best_streak > 0 && (
          <View style={styles.bestStreakContainer}>
            <Text style={styles.bestStreakText}>
              🏆 Best: {streakData.best_streak} days
            </Text>
          </View>
        )}

        {/* Milestone Progress */}
        {milestoneProgress.nextMilestone && (
          <View style={styles.milestoneContainer}>
            <Text style={styles.milestoneText}>
              Next milestone: {milestoneProgress.nextMilestone} days
            </Text>
            <View style={styles.progressBar}>
              <View 
                style={[
                  styles.progressFill, 
                  { 
                    width: `${milestoneProgress.progress * 100}%`,
                    backgroundColor: streakLevel.color,
                  }
                ]} 
              />
            </View>
            <Text style={styles.milestoneSubtext}>
              {milestoneProgress.daysToNext} days to go
            </Text>
          </View>
        )}

        {/* Streak Bonus Display */}
        {comprehensiveData?.bonus_info.is_bonus_active && (
          <View style={styles.bonusContainer}>
            <Text style={styles.bonusTitle}>🎁 Active Streak Bonus</Text>
            <View style={styles.bonusDetails}>
              <Text style={styles.bonusReason}>{comprehensiveData.bonus_info.bonus_reason}</Text>
              <View style={styles.bonusRow}>
                <Text style={styles.bonusText}>
                  ✨ {comprehensiveData.bonus_info.multiplier}x Multiplier
                </Text>
                {comprehensiveData.bonus_info.bonus_xp > 0 && (
                  <Text style={styles.bonusText}>
                    +{comprehensiveData.bonus_info.bonus_xp} XP
                  </Text>
                )}
              </View>
              {comprehensiveData.milestone_info.next_milestone && (
                <Text style={styles.bonusNextTier}>
                  Next tier in {comprehensiveData.milestone_info.days_to_next} days 
                  ({comprehensiveData.milestone_info.progress_percentage}% progress)
                </Text>
              )}
            </View>
          </View>
        )}

        {/* Streak Status */}
        <View style={styles.statusContainer}>
          {streakData.streak_active ? (
            <View style={styles.activeStatus}>
              <Text style={styles.activeText}>🔥 Streak Active</Text>
              <Text style={styles.statusSubtext}>
                Keep it up! Don't break your streak.
              </Text>
            </View>
          ) : (
            <View style={styles.inactiveStatus}>
              <Text style={styles.inactiveText}>💤 Streak Broken</Text>
              <Text style={styles.statusSubtext}>
                Start a new session to rebuild your streak.
              </Text>
            </View>
          )}
        </View>

        {/* Streak Animation Overlay */}
        {streakAnimation.isVisible && (
          <View style={styles.animationOverlay}>
            <Text style={styles.animationEmoji}>
              {getAnimationEmoji(streakAnimation.type)}
            </Text>
            <Text style={styles.animationText}>
              {streakAnimation.type === 'fire' && 'Streak Updated!'}
              {streakAnimation.type === 'milestone' && 'Milestone Reached!'}
              {streakAnimation.type === 'new_record' && 'New Record!'}
            </Text>
          </View>
        )}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginHorizontal: 20,
    marginVertical: 10,
  },
  card: {
    backgroundColor: 'white',
    borderRadius: 16,
    padding: 20,
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  errorCard: {
    alignItems: 'center',
    paddingVertical: 30,
  },
  errorText: {
    color: '#e74c3c',
    fontSize: 14,
    textAlign: 'center',
    marginBottom: 15,
  },
  retryButton: {
    backgroundColor: '#3498db',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
  },
  retryButtonText: {
    color: 'white',
    fontWeight: '600',
  },
  loadingText: {
    color: '#666',
    fontSize: 16,
    textAlign: 'center',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 15,
  },
  title: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#2c3e50',
  },
  streakLevel: {
    fontSize: 14,
    color: '#7f8c8d',
    fontWeight: '600',
  },
  streakDisplay: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 15,
  },
  fireContainer: {
    marginRight: 15,
  },
  fireEmoji: {
    fontSize: 32,
  },
  streakNumber: {
    fontSize: 48,
    fontWeight: 'bold',
    marginRight: 8,
  },
  streakLabel: {
    fontSize: 16,
    color: '#7f8c8d',
    fontWeight: '600',
  },
  bestStreakContainer: {
    alignItems: 'center',
    marginBottom: 15,
  },
  bestStreakText: {
    fontSize: 14,
    color: '#f39c12',
    fontWeight: '600',
  },
  milestoneContainer: {
    marginBottom: 15,
  },
  milestoneText: {
    fontSize: 14,
    color: '#2c3e50',
    fontWeight: '600',
    marginBottom: 5,
    textAlign: 'center',
  },
  progressBar: {
    height: 6,
    backgroundColor: 'rgba(0, 0, 0, 0.1)',
    borderRadius: 3,
    overflow: 'hidden',
    marginBottom: 5,
  },
  progressFill: {
    height: '100%',
    borderRadius: 3,
  },
  milestoneSubtext: {
    fontSize: 12,
    color: '#7f8c8d',
    textAlign: 'center',
  },
  statusContainer: {
    marginTop: 10,
  },
  activeStatus: {
    alignItems: 'center',
    paddingVertical: 10,
    backgroundColor: 'rgba(46, 204, 113, 0.1)',
    borderRadius: 8,
  },
  inactiveStatus: {
    alignItems: 'center',
    paddingVertical: 10,
    backgroundColor: 'rgba(149, 165, 166, 0.1)',
    borderRadius: 8,
  },
  activeText: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#27ae60',
  },
  inactiveText: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#95a5a6',
  },
  statusSubtext: {
    fontSize: 12,
    color: '#7f8c8d',
    marginTop: 2,
    textAlign: 'center',
  },
  animationOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(46, 204, 113, 0.9)',
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  animationEmoji: {
    fontSize: 48,
    marginBottom: 10,
  },
  animationText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: 'white',
  },
  bonusContainer: {
    marginTop: 10,
    padding: 12,
    backgroundColor: 'rgba(255, 215, 0, 0.15)',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#ffd700',
  },
  bonusTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#ff8c00',
    textAlign: 'center',
    marginBottom: 8,
  },
  bonusDetails: {
    alignItems: 'center',
  },
  bonusReason: {
    fontSize: 13,
    fontWeight: '600',
    color: '#ff8c00',
    marginBottom: 6,
  },
  bonusRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 20,
    marginBottom: 6,
  },
  bonusText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#ff8c00',
  },
  bonusNextTier: {
    fontSize: 11,
    color: '#ff8c00',
    textAlign: 'center',
    opacity: 0.8,
  },
});

export default StreakWidget;