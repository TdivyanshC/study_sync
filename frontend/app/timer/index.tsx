import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Dimensions,
  ActivityIndicator,
  Modal,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import LottieView from 'lottie-react-native';
import { Colors } from '../../constants/Colors';
import { GlobalStyles } from '../../constants/Theme';
import { useTimer, useStudyStore } from '../../hooks/useStudySession';
import { useUser } from '../../providers/UserProvider';
import { router } from 'expo-router';
import { sessionApi, SessionSummary } from '../../src/api/sessionApi';
import { supabase } from '../../lib/supabaseClient';
import SessionCompleteScreen from '../../components/SessionCompleteScreen';
import BadgePopup from '../../components/BadgePopup';

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
  
  // State for session completion
  const [showCompleteScreen, setShowCompleteScreen] = useState(false);
  const [sessionSummary, setSessionSummary] = useState<SessionSummary | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  
  // State for badge management
  const [newBadges, setNewBadges] = useState<any[]>([]);
  const [showBadgePopup, setShowBadgePopup] = useState(false);
  const [currentBadgeIndex, setCurrentBadgeIndex] = useState(0);
  
  // Auto-save timer state
  const [lastAutoSave, setLastAutoSave] = useState<Date | null>(null);

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

  // Auto-save functionality - save session every 30 seconds when running
  useEffect(() => {
    if (!isStudying || !currentSession?.id) {
      return;
    }

    const autoSaveInterval = setInterval(async () => {
      try {
        const now = new Date();
        const timeSinceLastSave = lastAutoSave ? (now.getTime() - lastAutoSave.getTime()) / 1000 : Infinity;
        
        // Save every 30 seconds
        if (timeSinceLastSave >= 30) {
          console.log('Auto-saving session progress...');
          
          // Send heartbeat/auto-save to backend
          await sessionApi.saveSessionProgress(currentSession.id, {
            last_heartbeat: now.toISOString(),
            auto_save: true
          });
          
          setLastAutoSave(now);
        }
      } catch (error) {
        console.error('Auto-save failed:', error);
        // Don't show error to user for auto-save failures
      }
    }, 5000); // Check every 5 seconds

    return () => clearInterval(autoSaveInterval);
  }, [isStudying, currentSession?.id, lastAutoSave]);

  // Defensive error handling for all handlers
  const handleCompleteTask = React.useCallback(async () => {
    try {
      setIsProcessing(true);
      
      // Stop the session and get session ID
      const sessionId = currentSession?.id;
      if (!sessionId) {
        console.error('No session ID found');
        reset();
        stopSession();
        router.back();
        return;
      }
      
      // Calculate session duration
      const timeParts = formattedTime.split(':');
      const sessionDuration = parseInt(timeParts[0]) * 60 + parseInt(timeParts[1]);
      
      // Stop the timer
      reset();
      stopSession();
      
      // First, create the session in backend with proper gamification
      console.log('Creating session in backend with duration:', sessionDuration, 'minutes');
      
      try {
        // Create session in Supabase with user association
        const { data: newSession, error: sessionError } = await supabase
          .from('study_sessions')
          .insert({
            user_id: user.id,
            space_id: currentSession?.spaceId || null,
            duration_minutes: sessionDuration,
            efficiency: 85.0, // Default efficiency
            created_at: new Date().toISOString()
          })
          .select()
          .single();

        if (sessionError) {
          throw new Error(`Failed to create session: ${sessionError.message}`);
        }

        console.log('✅ Session created in backend:', newSession.id);

        // Now process the session through unified game engine
        console.log('Processing session through gamification:', newSession.id);
        const summary = await sessionApi.processSession(newSession.id, user.id);
        
        // Check for new badges after session completion
        console.log('Checking for new badges...');
        const { gamificationApi } = await import('../../src/api/gamificationApi');
        const badgeResponse = await gamificationApi.checkAndAwardBadges(user.id);
        
        // Store newly unlocked badges for popup display
        const unlockedBadges = badgeResponse.data?.new_badges || [];
        setNewBadges(unlockedBadges);
        if (unlockedBadges.length > 0) {
          console.log(`🎖️ Found ${unlockedBadges.length} new badges!`);
          
          // Emit badge events
          const { badgeEventEmitter } = await import('../../src/events/badgeEvents');
          unlockedBadges.forEach((badge, index) => {
            badgeEventEmitter.emitBadgeUnlocked({
              userId: user.id,
              badge: {
                id: badge.badge_id,
                title: badge.title,
                description: badge.description,
                icon_url: badge.icon
              },
              earnedAt: new Date(),
              totalBadges: index + 1,
              timestamp: new Date()
            });
          });
        }
        
        // Show completion screen with results
        setSessionSummary(summary);
        setShowCompleteScreen(true);
        
        // Emit XP event to update frontend components
        if (summary.xp_delta > 0) {
          // Import the event emitter
          const { xpEventEmitter } = await import('../../src/events/xpEvents');
          
          // Determine if this was a level up (estimate old level)
          const estimatedOldLevel = Math.floor((summary.total_xp - summary.xp_delta) / 100);
          const newLevel = summary.level;
          const levelUp = newLevel > estimatedOldLevel;
          
          // Emit XP updated event
          xpEventEmitter.emitXPUpdated({
            userId: user.id,
            amountAwarded: summary.xp_delta,
            totalXP: summary.total_xp,
            level: summary.level,
            source: 'session',
            timestamp: new Date(),
            levelUp
          });
          
          // If level up occurred, emit level up event
          if (levelUp) {
            xpEventEmitter.emitLevelUp({
              userId: user.id,
              oldLevel: estimatedOldLevel,
              newLevel,
              totalXP: summary.total_xp,
              timestamp: new Date()
            });
          }
          
          // Check for milestone achievements
          if (summary.total_xp >= 500 && summary.total_xp < 1000) {
            xpEventEmitter.emitMilestone({
              userId: user.id,
              milestoneType: '500_xp',
              totalXP: summary.total_xp,
              bonusAwarded: 100,
              timestamp: new Date()
            });
          } else if (summary.total_xp >= 10000) {
            xpEventEmitter.emitMilestone({
              userId: user.id,
              milestoneType: '10000_xp',
              totalXP: summary.total_xp,
              bonusAwarded: 1000,
              timestamp: new Date()
            });
          }
        }
        
      } catch (error) {
        console.error('Failed to create/process session:', error);
        // Still show a basic completion screen with error info
        setSessionSummary({
          success: false,
          user_id: user.id,
          session_id: currentSession?.id || '',
          processed_at: new Date().toISOString(),
          xp_delta: 0,
          xp_reason: `Session creation failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
          total_xp: 0,
          level: 1,
          streak_status: 'unknown' as const,
          streak_delta: 0,
          current_streak: 0,
          best_streak: 0,
          audit_risk: 0,
          audit_valid: false,
          audit_patterns: [],
          forgiveness_percent: 0,
          audit_messages: [],
          ranking: {
            tier: 'bronze',
            tier_info: {
              name: 'Bronze',
              emoji: '🥉',
              color: '#CD7F32',
              min_xp: 0,
              min_streak: 0
            },
            score: 0,
            progress_percent: 0,
            promoted: false
          },
          notifications: {
            xp_gained: false,
            streak_maintained: false,
            streak_milestone: false,
            ranking_promoted: false,
            confetti_trigger: false
          }
        });
        setShowCompleteScreen(true);
      }
      
    } catch (error) {
      console.error('Error completing task:', error);
      // Fallback: just go back without showing results
      reset();
      router.back();
    } finally {
      setIsProcessing(false);
    }
  }, [currentSession, stopSession, reset, user.id, formattedTime]);
  
  // Handle closing the completion screen
  const handleCloseCompleteScreen = React.useCallback(() => {
    setShowCompleteScreen(false);
    setSessionSummary(null);
    
    // Check if we have new badges to show
    if (newBadges.length > 0 && !showBadgePopup) {
      setCurrentBadgeIndex(0);
      setShowBadgePopup(true);
      return; // Don't navigate back yet, show badges first
    }
    
    // Invalidate and refresh home screen data
    // This will trigger a refresh of the home screen metrics
    console.log('Refreshing home screen data after session completion...');
    
    // Navigate back to home screen and trigger refresh
    router.back();
    
    // You could also use a global state management solution here
    // For now, the home screen will refresh automatically when it comes into focus
  }, [newBadges, showBadgePopup]);

  // Handle closing badge popup
  const handleCloseBadgePopup = React.useCallback(() => {
    setShowBadgePopup(false);
    
    // Show next badge if available
    const nextIndex = currentBadgeIndex + 1;
    if (nextIndex < newBadges.length) {
      setCurrentBadgeIndex(nextIndex);
      setTimeout(() => setShowBadgePopup(true), 300);
    } else {
      // All badges shown, proceed to home screen
      setNewBadges([]);
      setCurrentBadgeIndex(0);
      router.back();
    }
  }, [currentBadgeIndex, newBadges]);

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
            disabled={isProcessing}
          >
            {isProcessing ? (
              <ActivityIndicator size="small" color={Colors.success} />
            ) : (
              <>
                <Ionicons name="checkmark" size={20} color={Colors.success} />
                <Text style={[styles.buttonText, { color: Colors.success }]}>Complete Task</Text>
              </>
            )}
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
      
      {/* Session Complete Modal */}
      <Modal
        visible={showCompleteScreen}
        animationType="fade"
        transparent={true}
        onRequestClose={handleCloseCompleteScreen}
      >
        {sessionSummary && (
          <SessionCompleteScreen
            summary={sessionSummary}
            onClose={handleCloseCompleteScreen}
          />
        )}
      </Modal>
      
      {/* Badge Popup */}
      {newBadges.length > 0 && (
        <BadgePopup
          visible={showBadgePopup}
          badgeTitle={newBadges[currentBadgeIndex]?.title || ''}
          badgeDescription={newBadges[currentBadgeIndex]?.description}
          onClose={handleCloseBadgePopup}
        />
      )}
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
    paddingTop: 40,
    paddingBottom: 0,
    paddingHorizontal: 0,
    backgroundColor: Colors.background,
  },
  timerContainer: {
    alignItems: 'center',
    marginTop: 0,
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
    width: 280,
    height: 280,
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