import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Animated,
  Dimensions,
} from 'react-native';
import { gamificationApi, UserXPStats } from '../api/gamificationApi';
import { apiClient } from '../api/apiClient';
import { useXPEvents } from '../hooks/useXPEvents';
import { xpEventEmitter } from '../events/xpEvents';

const { width } = Dimensions.get('window');

interface XPCardProps {
  userId: string;
  onXPAnimationComplete?: () => void;
  showAnimation?: boolean;
}

interface XPAnimationState {
  isVisible: boolean;
  amount: number;
  source: string;
}

const XPCard: React.FC<XPCardProps> = ({ 
  userId, 
  onXPAnimationComplete,
  showAnimation = true 
}) => {
  const [xpStats, setXpStats] = useState<UserXPStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [xpAnimation, setXpAnimation] = useState<XPAnimationState>({
    isVisible: false,
    amount: 0,
    source: '',
  });
  
  // Animation values
  const [progressAnim] = useState(new Animated.Value(0));
  const [popupAnim] = useState(new Animated.Value(0));

  // XP calculation constants
  const XP_PER_LEVEL = 500;
  const MILESTONE_500 = 500;
  const MILESTONE_1000 = 1000;

  useEffect(() => {
    loadXPStats();
  }, [userId]);

  useEffect(() => {
    if (xpStats) {
      animateProgress();
    }
  }, [xpStats]);

  // Listen to real-time XP events
  useXPEvents({
    userId,
    onXPUpdated: (event) => {
      // Trigger XP animation
      if (event.amountAwarded > 0) {
        triggerXPAnimation(event.amountAwarded, event.source);
      }
      
      // Refresh XP stats to get updated values
      loadXPStats();
    },
    onLevelUp: (event) => {
      console.log('🎉 Level up!', event);
      // Refresh XP stats after level up
      loadXPStats();
    },
    onMilestone: (event) => {
      console.log('🏆 Milestone reached!', event);
      // Refresh XP stats after milestone
      loadXPStats();
    },
    enableDebug: false,
  });

  const loadXPStats = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const stats = await gamificationApi.getUserXPStats(userId);
      setXpStats(stats);
      
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load XP stats');
      console.error('Failed to load XP stats:', err);
    } finally {
      setLoading(false);
    }
  };

  const animateProgress = () => {
    if (!xpStats) return;

    Animated.timing(progressAnim, {
      toValue: xpStats.level_progress / XP_PER_LEVEL,
      duration: 1000,
      useNativeDriver: false,
    }).start();
  };

  const triggerXPAnimation = (amount: number, source: string) => {
    if (!showAnimation) return;

    setXpAnimation({
      isVisible: true,
      amount,
      source,
    });

    // Animate popup
    Animated.sequence([
      Animated.spring(popupAnim, {
        toValue: 1,
        tension: 100,
        friction: 8,
        useNativeDriver: true,
      }),
      Animated.delay(1500),
      Animated.timing(popupAnim, {
        toValue: 0,
        duration: 500,
        useNativeDriver: true,
      }),
    ]).start(() => {
      setXpAnimation({ isVisible: false, amount: 0, source: '' });
      onXPAnimationComplete?.();
    });
  };

  const getSourceLabel = (source: string) => {
    const labels: Record<string, string> = {
      session: 'Study Session',
      streak: 'Streak Bonus',
      daily_bonus: 'Daily Goal',
      milestone: 'Milestone',
    };
    return labels[source] || source;
  };

  const getLevelColor = (level: number) => {
    if (level <= 2) return '#3b82f6'; // Blue
    if (level <= 5) return '#8b5cf6'; // Purple
    if (level <= 10) return '#06d6a0'; // Green
    return '#f59e0b'; // Gold
  };

  if (loading) {
    return (
      <View style={styles.container}>
        <View style={styles.card}>
          <View style={styles.loadingContainer}>
            <Text style={styles.loadingText}>Loading XP...</Text>
          </View>
        </View>
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.container}>
        <View style={[styles.card, styles.errorCard]}>
          <Text style={styles.errorText}>⚠️ {error}</Text>
          <TouchableOpacity style={styles.retryButton} onPress={loadXPStats}>
            <Text style={styles.retryButtonText}>Retry</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  if (!xpStats) return null;

  const progressWidth = progressAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0%', '100%'],
  });

  const levelColor = getLevelColor(xpStats.level);

  return (
    <View style={styles.container}>
      <View style={styles.card}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.levelText}>Level {xpStats.level}</Text>
          <Text style={styles.totalXPText}>{xpStats.total_xp.toLocaleString()} XP</Text>
        </View>

        {/* Progress Bar */}
        <View style={styles.progressContainer}>
          <View style={styles.progressBar}>
            <Animated.View 
              style={[
                styles.progressFill,
                { 
                  width: progressWidth,
                  backgroundColor: levelColor,
                }
              ]} 
            />
          </View>
          <Text style={styles.progressText}>
            {xpStats.level_progress} / {XP_PER_LEVEL} XP to next level
          </Text>
        </View>

        {/* Today's Stats */}
        <View style={styles.todayStats}>
          <View style={styles.statItem}>
            <Text style={styles.statValue}>{xpStats.recent_30_days_xp}</Text>
            <Text style={styles.statLabel}>Today's XP</Text>
          </View>
          <View style={styles.statItem}>
            <Text style={styles.statValue}>{xpStats.current_streak}</Text>
            <Text style={styles.statLabel}>Day Streak</Text>
          </View>
          <View style={styles.statItem}>
            <Text style={styles.statValue}>{xpStats.next_level_xp}</Text>
            <Text style={styles.statLabel}>To Next Level</Text>
          </View>
        </View>

        {/* XP Sources */}
        <View style={styles.sourcesContainer}>
          <Text style={styles.sourcesTitle}>Recent Sources:</Text>
          {Object.entries(xpStats.xp_sources).slice(0, 3).map(([source, amount]) => (
            <View key={source} style={styles.sourceItem}>
              <Text style={styles.sourceLabel}>{getSourceLabel(source)}</Text>
              <Text style={styles.sourceAmount}>+{amount}</Text>
            </View>
          ))}
        </View>

        {/* XP Animation Popup */}
        {xpAnimation.isVisible && (
          <Animated.View 
            style={[
              styles.xpPopup,
              {
                opacity: popupAnim,
                transform: [
                  { scale: popupAnim },
                  { translateY: popupAnim.interpolate({
                      inputRange: [0, 1],
                      outputRange: [50, -20],
                    })
                  }
                ],
              }
            ]}
          >
            <Text style={styles.xpPopupText}>
              +{xpAnimation.amount} XP
            </Text>
            <Text style={styles.xpPopupSubtext}>
              {getSourceLabel(xpAnimation.source)}
            </Text>
          </Animated.View>
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
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    borderRadius: 16,
    padding: 20,
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
  },
  loadingContainer: {
    alignItems: 'center',
    paddingVertical: 40,
  },
  loadingText: {
    color: '#666',
    fontSize: 16,
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
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 15,
  },
  levelText: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#2c3e50',
  },
  totalXPText: {
    fontSize: 16,
    color: '#7f8c8d',
    fontWeight: '600',
  },
  progressContainer: {
    marginBottom: 20,
  },
  progressBar: {
    height: 8,
    backgroundColor: 'rgba(0, 0, 0, 0.1)',
    borderRadius: 4,
    overflow: 'hidden',
    marginBottom: 8,
  },
  progressFill: {
    height: '100%',
    borderRadius: 4,
  },
  progressText: {
    fontSize: 12,
    color: '#7f8c8d',
    textAlign: 'center',
  },
  todayStats: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: 20,
    paddingVertical: 15,
    backgroundColor: 'rgba(0, 0, 0, 0.02)',
    borderRadius: 12,
  },
  statItem: {
    alignItems: 'center',
  },
  statValue: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#2c3e50',
  },
  statLabel: {
    fontSize: 11,
    color: '#7f8c8d',
    marginTop: 2,
  },
  sourcesContainer: {
    marginTop: 10,
  },
  sourcesTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#2c3e50',
    marginBottom: 8,
  },
  sourceItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 4,
  },
  sourceLabel: {
    fontSize: 12,
    color: '#7f8c8d',
  },
  sourceAmount: {
    fontSize: 12,
    fontWeight: '600',
    color: '#27ae60',
  },
  xpPopup: {
    position: 'absolute',
    top: -20,
    right: 20,
    backgroundColor: 'rgba(46, 204, 113, 0.9)',
    paddingHorizontal: 15,
    paddingVertical: 8,
    borderRadius: 20,
    alignItems: 'center',
  },
  xpPopupText: {
    color: 'white',
    fontSize: 18,
    fontWeight: 'bold',
  },
  xpPopupSubtext: {
    color: 'white',
    fontSize: 10,
    opacity: 0.9,
  },
});

export default XPCard;