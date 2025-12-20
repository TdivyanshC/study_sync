import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
} from 'react-native';
import { router } from 'expo-router';
import { useAuth } from '../providers/AuthProvider';
import { Colors } from '../constants/Colors';

export default function DebugNavigation() {
  const { user, hasCompletedOnboarding, hasNavigated, navigationLocked } = useAuth();

  const forceNavigateToOnboarding = () => {
    console.log('🧪 Force navigating to onboarding step 1');
    router.replace('/onboarding-step1');
  };

  const forceNavigateToHome = () => {
    console.log('🧪 Force navigating to home');
    router.replace('/(tabs)');
  };

  const goBack = () => {
    router.back();
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        <Text style={styles.title}>🔧 Navigation Debug</Text>
        
        <View style={styles.statusBox}>
          <Text style={styles.statusTitle}>Current State:</Text>
          <Text style={styles.statusText}>User: {user?.email || 'None'}</Text>
          <Text style={styles.statusText}>Onboarding Completed: {hasCompletedOnboarding ? 'Yes' : 'No'}</Text>
          <Text style={styles.statusText}>Has Navigated: {hasNavigated ? 'Yes' : 'No'}</Text>
          <Text style={styles.statusText}>Navigation Locked: {navigationLocked ? 'Yes' : 'No'}</Text>
        </View>

        <View style={styles.buttonContainer}>
          <TouchableOpacity style={styles.testButton} onPress={forceNavigateToOnboarding}>
            <Text style={styles.testButtonText}>Force: Go to Onboarding</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.testButton} onPress={forceNavigateToHome}>
            <Text style={styles.testButtonText}>Force: Go to Home</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.backButton} onPress={goBack}>
            <Text style={styles.backButtonText}>← Back</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.infoBox}>
          <Text style={styles.infoTitle}>Debug Info:</Text>
          <Text style={styles.infoText}>• This screen helps debug navigation issues</Text>
          <Text style={styles.infoText}>• Use force buttons to test navigation</Text>
          <Text style={styles.infoText}>• Check console logs for detailed info</Text>
          <Text style={styles.infoText}>• Navigation should be controlled by AuthProvider only</Text>
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  content: {
    flex: 1,
    padding: 24,
    justifyContent: 'center',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: Colors.text,
    textAlign: 'center',
    marginBottom: 32,
  },
  statusBox: {
    backgroundColor: Colors.surface,
    borderRadius: 12,
    padding: 16,
    marginBottom: 24,
  },
  statusTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: Colors.text,
    marginBottom: 8,
  },
  statusText: {
    fontSize: 14,
    color: Colors.textSecondary,
    marginBottom: 4,
  },
  buttonContainer: {
    gap: 12,
    marginBottom: 24,
  },
  testButton: {
    backgroundColor: Colors.primary,
    borderRadius: 12,
    paddingVertical: 16,
    paddingHorizontal: 24,
    alignItems: 'center',
  },
  testButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  backButton: {
    backgroundColor: Colors.surface,
    borderRadius: 12,
    paddingVertical: 16,
    paddingHorizontal: 24,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: Colors.cardBorder,
  },
  backButtonText: {
    color: Colors.text,
    fontSize: 16,
    fontWeight: '600',
  },
  infoBox: {
    backgroundColor: Colors.card,
    borderRadius: 12,
    padding: 16,
  },
  infoTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: Colors.text,
    marginBottom: 8,
  },
  infoText: {
    fontSize: 14,
    color: Colors.textSecondary,
    marginBottom: 4,
  },
});