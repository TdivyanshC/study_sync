import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Dimensions,
} from 'react-native';
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
import { useTimer, useStudyStore } from '../../hooks/useStudySession';
import { router } from 'expo-router';

const { width } = Dimensions.get('window');

// Enhanced Burning Fire Animation Component
const BurningFlame = ({ isActive }: { isActive: boolean }) => {
  const scale1 = useSharedValue(1);
  const scale2 = useSharedValue(1);
  const scale3 = useSharedValue(1);
  const opacity1 = useSharedValue(1);
  const opacity2 = useSharedValue(0.8);
  const opacity3 = useSharedValue(0.6);
  const translateX = useSharedValue(0);

  React.useEffect(() => {
    if (isActive) {
      // Main flame - more dynamic
      scale1.value = withRepeat(
        withTiming(1.3, { duration: 600, easing: Easing.inOut(Easing.ease) }),
        -1,
        true
      );
      opacity1.value = withRepeat(
        withTiming(0.8, { duration: 500, easing: Easing.inOut(Easing.ease) }),
        -1,
        true
      );

      // Middle flame
      scale2.value = withRepeat(
        withTiming(1.2, { duration: 700, easing: Easing.inOut(Easing.ease) }),
        -1,
        true
      );
      opacity2.value = withRepeat(
        withTiming(0.6, { duration: 600, easing: Easing.inOut(Easing.ease) }),
        -1,
        true
      );

      // Inner flame
      scale3.value = withRepeat(
        withTiming(1.1, { duration: 800, easing: Easing.inOut(Easing.ease) }),
        -1,
        true
      );
      opacity3.value = withRepeat(
        withTiming(0.4, { duration: 700, easing: Easing.inOut(Easing.ease) }),
        -1,
        true
      );

      // Sway motion
      translateX.value = withRepeat(
        withTiming(10, { duration: 2000, easing: Easing.inOut(Easing.ease) }),
        -1,
        true
      );
    } else {
      scale1.value = withTiming(1);
      scale2.value = withTiming(1);
      scale3.value = withTiming(1);
      opacity1.value = withTiming(1);
      opacity2.value = withTiming(0.8);
      opacity3.value = withTiming(0.6);
    }
  }, [isActive]);

  const animatedStyle1 = useAnimatedStyle(() => ({
    transform: [{ scale: scale1.value }, { translateX: translateX.value }],
    opacity: opacity1.value,
  }));

  const animatedStyle2 = useAnimatedStyle(() => ({
    transform: [{ scale: scale2.value }, { translateX: translateX.value * 0.8 }],
    opacity: opacity2.value,
  }));

  const animatedStyle3 = useAnimatedStyle(() => ({
    transform: [{ scale: scale3.value }, { translateX: translateX.value * 0.6 }],
    opacity: opacity3.value,
  }));

  return (
    <View style={styles.flameContainer}>
      {/* Outer flame */}
      <Animated.View style={[styles.flameLayer, animatedStyle1]}>
        <Ionicons name="flame" size={150} color="#ff4500" />
      </Animated.View>
      {/* Middle flame */}
      <Animated.View style={[styles.flameLayer, animatedStyle2]}>
        <Ionicons name="flame" size={120} color="#ff6347" />
      </Animated.View>
      {/* Inner flame */}
      <Animated.View style={[styles.flameLayer, animatedStyle3]}>
        <Ionicons name="flame" size={90} color="#ffd700" />
      </Animated.View>
      {/* Core */}
      <Ionicons name="flame" size={60} color="#ffffff" />
    </View>
  );
};

export default function TimerScreen() {
  const { formattedTime, isRunning } = useTimer();
  const { currentSession, stopSession, takeBreak } = useStudyStore();

  const handleCompleteTask = () => {
    stopSession();
    router.back();
  };

  const handlePause = () => {
    takeBreak();
  };

  return (
    <View style={[GlobalStyles.safeArea, { backgroundColor: Colors.background, paddingTop: 50 }]}>
      <StatusBar style="light" translucent backgroundColor="transparent" />

      <View style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={GlobalStyles.title}>Focus Session</Text>
          <Text style={GlobalStyles.textSecondary}>
            Stay focused and productive
          </Text>
        </View>

        {/* Burning Flame Animation */}
        <View style={styles.flameWrapper}>
          <BurningFlame isActive={isRunning && !currentSession?.isBreak} />
        </View>

        {/* Timer Display */}
        <View style={styles.timerContainer}>
          <Text style={styles.timerText}>{formattedTime}</Text>
          <Text style={GlobalStyles.textSecondary}>
            {currentSession?.isBreak ? 'On Break' : 'Studying'}
          </Text>
        </View>

        {/* Action Buttons */}
        <View style={styles.buttonContainer}>
          <TouchableOpacity
            style={[GlobalStyles.glassCard, styles.actionButton]}
            onPress={handlePause}
          >
            <Ionicons name="pause" size={20} color={Colors.warning} />
            <Text style={[styles.buttonText, { color: Colors.warning }]}>Pause</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[GlobalStyles.glassCard, styles.actionButton]}
            onPress={handleCompleteTask}
          >
            <Ionicons name="checkmark" size={20} color={Colors.success} />
            <Text style={[styles.buttonText, { color: Colors.success }]}>Complete Task</Text>
          </TouchableOpacity>
        </View>

        {/* Session Info */}
        {currentSession && (
          <View style={styles.sessionInfo}>
            <Text style={GlobalStyles.textMuted}>
              Subject: {currentSession.subject || 'General Study'}
            </Text>
          </View>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 40,
    backgroundColor: Colors.background,
  },
  header: {
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  timerContainer: {
    alignItems: 'center',
    marginTop: 20,
  },
  timerText: {
    fontSize: 48,
    fontWeight: 'bold',
    color: Colors.text,
    fontFamily: 'monospace',
    marginBottom: 10,
  },
  flameWrapper: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  flameContainer: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  flameLayer: {
    position: 'absolute',
  },
  buttonContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    width: '100%',
    paddingHorizontal: 20,
    marginBottom: 40,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 16,
    paddingHorizontal: 24,
    borderRadius: 16,
    minWidth: width * 0.35,
    justifyContent: 'center',
    marginHorizontal: 8,
  },
  buttonText: {
    fontSize: 16,
    fontWeight: 'bold',
    marginLeft: 8,
  },
  sessionInfo: {
    alignItems: 'center',
    paddingHorizontal: 20,
    marginBottom: 20,
  },
});