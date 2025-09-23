import React from 'react';
import { View, Text, StyleSheet, Platform } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withRepeat,
  withTiming,
  interpolate,
  Easing,
} from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '../constants/Colors';
import AnimatedProgressRing from './AnimatedProgressRing';

interface PremiumTimerProps {
  time: number; // in seconds
  isRunning: boolean;
  isBreak: boolean;
  targetDuration?: number; // target session duration in seconds (for progress ring)
}

const PremiumTimer: React.FC<PremiumTimerProps> = ({
  time,
  isRunning,
  isBreak,
  targetDuration = 25 * 60, // Default 25 minutes
}) => {
  const clockRotation = useSharedValue(0);
  const pulseScale = useSharedValue(1);
  const glowOpacity = useSharedValue(0);
  const breakBounce = useSharedValue(1);

  React.useEffect(() => {
    if (isRunning && !isBreak) {
      // Clock rotation animation
      clockRotation.value = withRepeat(
        withTiming(360, { duration: 2000, easing: Easing.linear }),
        -1,
        false
      );
      
      // Pulse animation for active state
      pulseScale.value = withRepeat(
        withSpring(1.05, { damping: 10, stiffness: 100 }),
        -1,
        true
      );
      
      // Glow effect
      glowOpacity.value = withRepeat(
        withTiming(0.6, { duration: 2000, easing: Easing.inOut(Easing.ease) }),
        -1,
        true
      );
    } else {
      clockRotation.value = withSpring(0);
      pulseScale.value = withSpring(1);
      glowOpacity.value = withTiming(0);
    }
  }, [isRunning, isBreak]);

  React.useEffect(() => {
    if (isBreak) {
      // Gentle bounce for break mode
      breakBounce.value = withRepeat(
        withSpring(1.1, { damping: 8, stiffness: 80 }),
        -1,
        true
      );
    } else {
      breakBounce.value = withSpring(1);
    }
  }, [isBreak]);

  const formatTime = (seconds: number) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const remainingSeconds = seconds % 60;
    
    if (hours > 0) {
      return {
        main: `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`,
        sub: remainingSeconds.toString().padStart(2, '0'),
      };
    }
    return {
      main: `${minutes.toString().padStart(2, '0')}:${remainingSeconds.toString().padStart(2, '0')}`,
      sub: null,
    };
  };

  const { main, sub } = formatTime(time);
  const progress = Math.min(time / targetDuration, 1);

  const clockStyle = useAnimatedStyle(() => ({
    transform: [{ rotate: `${clockRotation.value}deg` }],
  }));

  const timerStyle = useAnimatedStyle(() => ({
    transform: [{ scale: pulseScale.value * breakBounce.value }],
  }));

  const glowStyle = useAnimatedStyle(() => ({
    opacity: glowOpacity.value,
  }));

  const getTimerColor = () => {
    if (isBreak) return Colors.warning;
    if (isRunning) return Colors.primary;
    return Colors.textSecondary;
  };

  const getRingColor = () => {
    if (isBreak) return Colors.warning;
    return Colors.primary;
  };

  return (
    <View style={styles.container}>
      {/* Glow Effect */}
      <Animated.View 
        style={[
          styles.glow,
          { backgroundColor: getRingColor() + '30' },
          glowStyle
        ]} 
      />

      {/* Progress Ring */}
      <AnimatedProgressRing
        size={200}
        strokeWidth={8}
        progress={progress}
        color={getRingColor()}
        backgroundColor={Colors.surfaceElevated}
        animationDuration={500}
      >
        {/* Timer Content */}
        <Animated.View style={[styles.timerContent, timerStyle]}>
          {/* Clock Icon */}
          <Animated.View style={[styles.clockIcon, clockStyle]}>
            <Ionicons 
              name={isBreak ? 'bed' : 'time'} 
              size={32} 
              color={getTimerColor()} 
            />
          </Animated.View>

          {/* Time Display */}
          <Text 
            style={[
              styles.timeText, 
              { color: getTimerColor() }
            ]}
          >
            {main}
          </Text>
          
          {sub && (
            <Text style={[styles.subTimeText, { color: getTimerColor() }]}>
              .{sub}
            </Text>
          )}

          {/* Status Text */}
          <Text style={styles.statusText}>
            {isBreak ? '💤 Break Time' : isRunning ? '📚 Studying' : '⏸️ Ready'}
          </Text>
        </Animated.View>
      </AnimatedProgressRing>

      {/* Session Info */}
      <View style={styles.sessionInfo}>
        <Text style={styles.progressLabel}>
          Session Progress: {Math.round(progress * 100)}%
        </Text>
        <Text style={styles.targetLabel}>
          Target: {Math.floor(targetDuration / 60)} minutes
        </Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  glow: {
    position: 'absolute',
    width: 220,
    height: 220,
    borderRadius: 110,
    zIndex: 0,
  },
  timerContent: {
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 2,
  },
  clockIcon: {
    marginBottom: 8,
  },
  timeText: {
    fontSize: 36,
    fontWeight: 'bold',
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
    textAlign: 'center',
  },
  subTimeText: {
    fontSize: 20,
    fontWeight: '600',
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
    marginTop: -4,
  },
  statusText: {
    fontSize: 14,
    color: Colors.textSecondary,
    marginTop: 8,
    fontWeight: '600',
  },
  sessionInfo: {
    alignItems: 'center',
    marginTop: 24,
  },
  progressLabel: {
    fontSize: 14,
    color: Colors.textSecondary,
    fontWeight: '600',
  },
  targetLabel: {
    fontSize: 12,
    color: Colors.textMuted,
    marginTop: 4,
  },
});

export default PremiumTimer;