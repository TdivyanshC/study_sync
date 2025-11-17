import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Dimensions,
  ActivityIndicator,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { Ionicons } from '@expo/vector-icons';
import LottieView from 'lottie-react-native';
import { Colors } from '../../constants/Colors';
import { GlobalStyles } from '../../constants/Theme';
import { useTimer, useStudyStore } from '../../hooks/useStudySession';
import { useUser } from '../../providers/UserProvider';
import { router } from 'expo-router';

const { width } = Dimensions.get('window');

// Available lottie animations
const availableAnimations = [
  require('../../assets/animations/avatar 1.json'),
  require('../../assets/animations/Clock Lottie Animation.json'),
  require('../../assets/animations/Loading 50 _ Among Us.json'),
  require('../../assets/animations/Progress of loading hand.json'),
  require('../../assets/animations/Running.json'),
  require('../../assets/animations/Yin Yang.json'),
];

// Loading Indicator Component
const LoadingIndicator: React.FC = () => (
  <View style={styles.loadingContainer}>
    <ActivityIndicator size="large" color={Colors.primary} />
    <Text style={styles.loadingText}>Loading timer...</Text>
  </View>
);

// Lottie Animation Component
const AnimatedLottie = ({ isActive, animationSource }: { isActive: boolean; animationSource: any }) => {
  const lottieRef = useRef<LottieView>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    if (isActive) {
      setTimeout(() => setReady(true), 100);
    } else {
      setReady(false);
    }
  }, [isActive]);

  return (
    <View style={styles.lottieContainer}>
      {ready && (
        <LottieView
          ref={lottieRef}
          source={JSON.parse(JSON.stringify(animationSource))}
          autoPlay={isActive}
          loop={isActive}
          renderMode="HARDWARE"
          resizeMode="cover"
          enableMergePathsAndroidForKitKatAndAbove={true}
          style={styles.lottie}
        />
      )}
    </View>
  );
};

// Main Timer Screen Component
function TimerScreen() {
  // Use UserProvider for safe user data
  const user = useUser();
  const { formattedTime, isRunning, start, stop, reset } = useTimer();
  const { currentSession, stopSession, takeBreak, resumeFromBreak } = useStudyStore();
  
  // State for animation selection
  const [currentAnimation, setCurrentAnimation] = useState(availableAnimations[0]);
  const [isStudying, setIsStudying] = useState(false);

  // Show loading state while user data is being loaded
  if (!user?.isLoaded) {
    return <LoadingIndicator />;
  }

  // Select random animation on component mount
  useEffect(() => {
    const randomIndex = Math.floor(Math.random() * availableAnimations.length);
    setCurrentAnimation(availableAnimations[randomIndex]);
  }, []);

  // Sync timer with session state
  useEffect(() => {
    if (currentSession && !currentSession.isBreak && !isStudying) {
      // Session started, begin studying
      setIsStudying(true);
      start(); // Start the timer
    } else if (!currentSession || currentSession.isBreak) {
      // Session paused or ended
      setIsStudying(false);
      stop(); // Stop the timer
    }
  }, [currentSession, start, stop]);

  // Defensive error handling for all handlers
  const handleCompleteTask = React.useCallback(() => {
    try {
      reset(); // Reset timer to 0
      stopSession();
      router.back();
    } catch (error) {
      console.error('Error completing task:', error);
      reset(); // Reset timer even on error
      router.back();
    }
  }, [stopSession, reset]);

  const handlePause = React.useCallback(() => {
    try {
      takeBreak();
    } catch (error) {
      console.error('Error pausing timer:', error);
      // Graceful fallback - no crash
    }
  }, [takeBreak]);

  const handleResume = React.useCallback(() => {
    try {
      resumeFromBreak();
    } catch (error) {
      console.error('Error resuming timer:', error);
      // Graceful fallback - no crash
    }
  }, [resumeFromBreak]);

  const handleBack = React.useCallback(() => {
    try {
      reset(); // Reset timer when going back
      router.back();
    } catch (error) {
      console.error('Error navigating back:', error);
      reset();
      router.back();
    }
  }, [reset]);

  return (
    <View style={styles.customSafeArea}>
      <StatusBar style="light" translucent backgroundColor="transparent" />

      <View style={styles.container}>
        {/* Timer Display */}
        <View style={styles.timerContainer}>
          <Text style={styles.timerText}>{formattedTime}</Text>
          <Text style={GlobalStyles.textSecondary}>
            {currentSession?.isBreak ? 'On Break' : 'Studying'}
          </Text>
        </View>

        {/* Lottie Animation */}
        <View style={styles.animationWrapper}>
          <AnimatedLottie
            isActive={isStudying && !currentSession?.isBreak}
            animationSource={currentAnimation}
          />
        </View>

        {/* Action Buttons */}
        <View style={styles.buttonContainer}>
          {currentSession?.isBreak ? (
            // Show Resume button when on break
            <TouchableOpacity
              style={[GlobalStyles.glassCard, styles.actionButton]}
              onPress={handleResume}
            >
              <Ionicons name="play" size={20} color={Colors.primary} />
              <Text style={[styles.buttonText, { color: Colors.primary }]}>Resume</Text>
            </TouchableOpacity>
          ) : (
            // Show Pause button when actively studying
            <TouchableOpacity
              style={[GlobalStyles.glassCard, styles.actionButton]}
              onPress={handlePause}
            >
              <Ionicons name="pause" size={20} color={Colors.warning} />
              <Text style={[styles.buttonText, { color: Colors.warning }]}>Pause</Text>
            </TouchableOpacity>
          )}

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

        {/* Back Button */}
        <TouchableOpacity style={styles.backButton} onPress={handleBack}>
          <Ionicons name="arrow-back" size={24} color={Colors.text} />
          <Text style={styles.backButtonText}>Back</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  customSafeArea: {
    flex: 1,
    backgroundColor: Colors.background,
    paddingTop: 0,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: Colors.background,
    gap: 16,
  },
  loadingText: {
    color: Colors.text,
    fontSize: 16,
    marginTop: 8,
  },
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 0,
    paddingBottom: 20,
    paddingHorizontal: 0,
    backgroundColor: Colors.background,
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
  lottieContainer: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  lottie: {
    width: 200,
    height: 200,
  },
  animationWrapper: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
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
  backButton: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    backgroundColor: Colors.surfaceElevated,
    borderRadius: 12,
    marginBottom: 20,
  },
  backButtonText: {
    color: Colors.text,
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
  },
});

export default TimerScreen;