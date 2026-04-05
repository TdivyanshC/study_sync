import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  Alert,
} from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { Colors } from '../constants/Colors';
import ProgressBar from '../components/ProgressBar';
import { useAuth } from '../providers/AuthProvider';

interface SessionOption {
  id: string;
  name: string;
  emoji: string;
  color: string;
  description: string;
}

const SESSION_OPTIONS: SessionOption[] = [
  { id: 'gym', name: 'Gym Session', emoji: '💪', color: '#ff6b35', description: 'Physical fitness and workouts' },
  { id: 'meditation', name: 'Meditation', emoji: '🧘', color: '#8b5cf6', description: 'Mindfulness and relaxation' },
  { id: 'coding', name: 'Coding', emoji: '💻', color: '#06d6a0', description: 'Programming and development' },
  { id: 'cricket', name: 'Cricket', emoji: '🏏', color: '#fbbf24', description: 'Sports and outdoor activities' },
  { id: 'singing', name: 'Singing', emoji: '🎤', color: '#ec4899', description: 'Music and vocal practice' },
  { id: 'study', name: 'Study Session', emoji: '📚', color: '#3b82f6', description: 'Academic learning and reading' },
  { id: 'yoga', name: 'Yoga', emoji: '🧘‍♀️', color: '#10b981', description: 'Flexibility and breathing exercises' },
  { id: 'reading', name: 'Reading', emoji: '📖', color: '#6366f1', description: 'Books and literature' },
  { id: 'writing', name: 'Writing', emoji: '✍️', color: '#f59e0b', description: 'Creative and academic writing' },
  { id: 'music', name: 'Music Practice', emoji: '🎵', color: '#8b5cf6', description: 'Instrumental practice' },
  { id: 'gaming', name: 'Gaming', emoji: '🎮', color: '#ef4444', description: 'Video games and entertainment' },
  { id: 'cooking', name: 'Cooking', emoji: '👨‍🍳', color: '#f97316', description: 'Culinary skills and recipes' },
];

export default function OnboardingStep2() {
  const { markOnboardingCompleted } = useAuth();
  const params = useLocalSearchParams();

  // Extract step1 data from navigation params
  const username = params.username as string || '';
  const step1Data = {
    gender: params.gender as string || '',
    age: params.age as string || '',
    relationship: params.relationship as string || ''
  };

  const [selectedSessions, setSelectedSessions] = useState<string[]>([]);
  const [customSession, setCustomSession] = useState('');
  const [isCompleting, setIsCompleting] = useState(false);
  
  // Check if we have all required data, if not redirect back
  useEffect(() => {
    if (!username) {
      Alert.alert(
        'Missing Information',
        'Please complete username selection first.',
        [
          {
            text: 'Go Back',
            onPress: () => router.replace('/onboarding-username')
          }
        ]
      );
    } else if (!step1Data.gender || !step1Data.age || !step1Data.relationship) {
      Alert.alert(
        'Missing Information',
        'Please complete step 1 first.',
        [
          {
            text: 'Go Back',
            onPress: () => router.replace('/onboarding-step1')
          }
        ]
      );
    }
  }, [username, step1Data]);

  const handleSessionToggle = (sessionId: string) => {
    setSelectedSessions(prev => {
      if (prev.includes(sessionId)) {
        return prev.filter(id => id !== sessionId);
      } else {
        return [...prev, sessionId];
      }
    });
  };

  const handleCustomSessionAdd = () => {
    if (customSession.trim()) {
      // For custom sessions, we'll add them as a temporary selection
      // In a real app, you'd want to save these to the backend
      Alert.alert(
        'Custom Session',
        `Would you like to add "${customSession}" to your sessions?`,
        [
          {
            text: 'Cancel',
            style: 'cancel',
          },
          {
            text: 'Add',
            onPress: () => {
              // Add custom session logic here
              setCustomSession('');
              Alert.alert('Success', 'Custom session added! (This would be saved to your profile)');
            },
          },
        ]
      );
    }
  };

  const canFinish = selectedSessions.length >= 3;

  const handleFinish = async () => {
    if (!canFinish) {
      Alert.alert(
        'More Sessions Needed',
        'Please select at least 3 sessions to continue.',
        [{ text: 'OK' }]
      );
      return;
    }

    if (isCompleting) return; // Prevent multiple submissions
    
    setIsCompleting(true);
    
    try {
      // Prepare all onboarding data
      const step1DataFormatted = {
        gender: step1Data.gender,
        age: step1Data.age,
        relationship: step1Data.relationship
      };
      
      const step2DataFormatted = {
        preferred_sessions: selectedSessions
      };
      
      // Use the username the user entered as their display name
      const displayName = username;
      
      // Complete onboarding with all collected data
      await markOnboardingCompleted(
        step1DataFormatted,
        step2DataFormatted,
        displayName,
        username
      );
      
      Alert.alert(
        'Welcome! 🎉',
        'Your profile has been set up successfully. You can always modify these preferences later in settings.',
        [
          {
            text: 'Get Started',
            onPress: () => router.replace('/(tabs)'),
          },
        ]
      );
    } catch (error: any) {
      console.warn('Warning completing onboarding:', error);
      // Still proceed even if database save fails - show success but warn user
      Alert.alert(
        'Welcome! 🎉',
        'Your profile has been set up successfully. (Note: Some preferences may need to be re-saved)',
        [
          {
            text: 'Get Started',
            onPress: () => router.replace('/(tabs)'),
          },
        ]
      );
    } finally {
      setIsCompleting(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView 
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <ProgressBar currentStep={3} totalSteps={3} />
        
        <Text style={styles.title}>Choose Your Sessions</Text>
        <Text style={styles.subtitle}>
          Select at least 3 activities you'd like to track and get better at
        </Text>

        {/* Minimum Selection Info */}
        <View style={styles.infoContainer}>
          <Text style={styles.infoText}>
            Selected: {selectedSessions.length} / Minimum: 3
          </Text>
          {selectedSessions.length < 3 && (
            <Text style={styles.infoSubtext}>
              You need {3 - selectedSessions.length} more session{3 - selectedSessions.length !== 1 ? 's' : ''}
            </Text>
          )}
        </View>

        {/* Session Options */}
        <View style={styles.sessionsContainer}>
          {SESSION_OPTIONS.map((session) => (
            <TouchableOpacity
              key={session.id}
              style={[
                styles.sessionCard,
                selectedSessions.includes(session.id) && styles.sessionCardSelected,
                { borderColor: session.color }
              ]}
              onPress={() => handleSessionToggle(session.id)}
              activeOpacity={0.7}
            >
              <View style={[
                styles.sessionIconContainer,
                { backgroundColor: session.color + '20' }
              ]}>
                <Text style={styles.sessionEmoji}>{session.emoji}</Text>
              </View>
              <Text style={[
                styles.sessionName,
                selectedSessions.includes(session.id) && styles.sessionNameSelected
              ]}>
                {session.name}
              </Text>
              <Text style={[
                styles.sessionDescription,
                selectedSessions.includes(session.id) && styles.sessionDescriptionSelected
              ]}>
                {session.description}
              </Text>
              {selectedSessions.includes(session.id) && (
                <View style={styles.checkMark}>
                  <Text style={styles.checkMarkText}>✓</Text>
                </View>
              )}
            </TouchableOpacity>
          ))}
        </View>

        {/* Custom Session Section */}
        <View style={styles.customSection}>
          <Text style={styles.customTitle}>Can't find what you're looking for?</Text>
          <Text style={styles.customSubtitle}>Create your own custom session</Text>
          
          <View style={styles.customInputContainer}>
            <TouchableOpacity
              style={styles.customButton}
              onPress={handleCustomSessionAdd}
              disabled={!customSession.trim()}
            >
              <Text style={styles.customButtonText}>+ Add Custom Session</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Finish Button */}
        <TouchableOpacity
          style={[
            styles.finishButton,
            (!canFinish || isCompleting) && styles.finishButtonDisabled
          ]}
          onPress={handleFinish}
          disabled={!canFinish || isCompleting}
        >
          <Text style={[
            styles.finishButtonText,
            (!canFinish || isCompleting) && styles.finishButtonTextDisabled
          ]}>
            {isCompleting ? 'Setting up...' : (canFinish ? 'Finish Setup' : `Select ${3 - selectedSessions.length} More`)}
          </Text>
        </TouchableOpacity>

        {/* Skip Option */}
        <TouchableOpacity style={styles.skipButton}>
          <Text style={styles.skipButtonText}>Skip for now</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 40,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: Colors.text,
    textAlign: 'center',
    marginBottom: 8,
    paddingHorizontal: 24,
  },
  subtitle: {
    fontSize: 16,
    color: Colors.textSecondary,
    textAlign: 'center',
    marginBottom: 16,
    paddingHorizontal: 24,
  },
  infoContainer: {
    backgroundColor: Colors.surface,
    borderRadius: 12,
    padding: 16,
    marginHorizontal: 24,
    marginBottom: 24,
    alignItems: 'center',
  },
  infoText: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.text,
    marginBottom: 4,
  },
  infoSubtext: {
    fontSize: 14,
    color: Colors.textSecondary,
  },
  // Session Cards
  sessionsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: 24,
    gap: 12,
  },
  sessionCard: {
    width: '47%',
    backgroundColor: Colors.card,
    borderRadius: 16,
    padding: 16,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: 'transparent',
    shadowColor: Colors.shadow,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
    position: 'relative',
  },
  sessionCardSelected: {
    borderColor: Colors.primary,
    backgroundColor: Colors.primary + '10',
  },
  sessionIconContainer: {
    width: 50,
    height: 50,
    borderRadius: 25,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  sessionEmoji: {
    fontSize: 24,
  },
  sessionName: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.text,
    textAlign: 'center',
    marginBottom: 4,
  },
  sessionNameSelected: {
    color: Colors.primary,
  },
  sessionDescription: {
    fontSize: 11,
    color: Colors.textSecondary,
    textAlign: 'center',
    lineHeight: 14,
  },
  sessionDescriptionSelected: {
    color: Colors.primary,
  },
  checkMark: {
    position: 'absolute',
    top: 8,
    right: 8,
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: Colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  checkMarkText: {
    color: 'white',
    fontSize: 12,
    fontWeight: 'bold',
  },
  // Custom Session
  customSection: {
    marginTop: 32,
    paddingHorizontal: 24,
  },
  customTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: Colors.text,
    textAlign: 'center',
    marginBottom: 4,
  },
  customSubtitle: {
    fontSize: 14,
    color: Colors.textSecondary,
    textAlign: 'center',
    marginBottom: 16,
  },
  customInputContainer: {
    alignItems: 'center',
  },
  customButton: {
    backgroundColor: Colors.surface,
    borderRadius: 12,
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderWidth: 1,
    borderColor: Colors.cardBorder,
    shadowColor: Colors.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 4,
  },
  customButtonText: {
    color: Colors.text,
    fontSize: 14,
    fontWeight: '500',
  },
  // Finish Button
  finishButton: {
    backgroundColor: Colors.primary,
    borderRadius: 12,
    paddingVertical: 18,
    alignItems: 'center',
    marginHorizontal: 24,
    marginTop: 32,
    shadowColor: Colors.shadow,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  finishButtonDisabled: {
    backgroundColor: Colors.textMuted,
    opacity: 0.6,
  },
  finishButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  },
  finishButtonTextDisabled: {
    color: Colors.textSecondary,
  },
  // Skip Button
  skipButton: {
    paddingVertical: 16,
    alignItems: 'center',
    marginTop: 16,
  },
  skipButtonText: {
    color: Colors.textSecondary,
    fontSize: 14,
    textDecorationLine: 'underline',
  },
});