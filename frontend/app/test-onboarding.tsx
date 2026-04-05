import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
} from 'react-native';
import { router } from 'expo-router';
import { Colors } from '../constants/Colors';

export default function TestOnboarding() {
  const goToUsername = () => {
    router.push('/onboarding-username');
  };

  const goToStep1 = () => {
    router.push('/onboarding-step1');
  };

  const goToStep2 = () => {
    router.push('/onboarding-step2');
  };

  const goToHome = () => {
    router.replace('/(tabs)');
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        <Text style={styles.title}>🧪 Test Onboarding Flow</Text>
        <Text style={styles.subtitle}>
          Use these buttons to test the onboarding flow manually
        </Text>

        <TouchableOpacity style={styles.testButton} onPress={goToUsername}>
          <Text style={styles.testButtonText}>Go to Username</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.testButton} onPress={goToStep1}>
          <Text style={styles.testButtonText}>Go to Step 1</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.testButton} onPress={goToStep2}>
          <Text style={styles.testButtonText}>Go to Step 2</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.testButton} onPress={goToHome}>
          <Text style={styles.testButtonText}>Go to Home</Text>
        </TouchableOpacity>

        <View style={styles.infoBox}>
          <Text style={styles.infoTitle}>Flow Test:</Text>
          <Text style={styles.infoText}>1. Login → Should redirect to Username</Text>
          <Text style={styles.infoText}>2. Enter username → Should go to Step 1</Text>
          <Text style={styles.infoText}>3. Fill Step 1 → Should go to Step 2</Text>
          <Text style={styles.infoText}>4. Select 3+ sessions → Should go to Home</Text>
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
    marginBottom: 16,
  },
  subtitle: {
    fontSize: 16,
    color: Colors.textSecondary,
    textAlign: 'center',
    marginBottom: 32,
  },
  testButton: {
    backgroundColor: Colors.primary,
    borderRadius: 12,
    paddingVertical: 16,
    paddingHorizontal: 24,
    alignItems: 'center',
    marginBottom: 16,
  },
  testButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  infoBox: {
    backgroundColor: Colors.surface,
    borderRadius: 12,
    padding: 16,
    marginTop: 32,
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