import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { router } from 'expo-router';
import { Colors } from '../constants/Colors';
import ProgressBar from '../components/ProgressBar';
import { useAuth } from '../providers/AuthProvider';

export default function OnboardingUsername() {
  const [username, setUsername] = useState('');
  const [loading, setLoading] = useState(false);
  const { user } = useAuth();

  const validateUsername = (username: string) => {
    if (!username.trim()) {
      return 'Username cannot be empty';
    }
    if (username.length < 3) {
      return 'Username must be at least 3 characters';
    }
    if (username.length > 20) {
      return 'Username must be less than 20 characters';
    }
    if (!/^[a-zA-Z0-9_]+$/.test(username)) {
      return 'Username can only contain letters, numbers, and underscores';
    }
    return null;
  };

  const checkUsernameAvailability = async (username: string) => {
    try {
      const { supabase } = await import('../lib/supabase');
      const { data, error } = await supabase
        .from('users')
        .select('username')
        .eq('username', username.toLowerCase())
        .neq('id', user?.id) // Exclude current user if editing
        .single();

      if (error && error.code !== 'PGRST116') {
        throw error;
      }

      return !data; // Available if no data found
    } catch (error) {
      console.error('Error checking username availability:', error);
      return false; // Assume unavailable on error
    }
  };

  const handleContinue = async () => {
    const validationError = validateUsername(username);
    if (validationError) {
      Alert.alert('Invalid Username', validationError);
      return;
    }

    setLoading(true);
    try {
      const isAvailable = await checkUsernameAvailability(username);
      if (!isAvailable) {
        Alert.alert('Username Taken', 'This username is already taken. Please choose another one.');
        setLoading(false);
        return;
      }

      // Update username in database
      const { supabase } = await import('../lib/supabase');
      const { error } = await supabase
        .from('users')
        .update({ username: username.toLowerCase() })
        .eq('id', user?.id);

      if (error) {
        throw error;
      }

      // Navigate to next step
      router.push({
        pathname: '/onboarding-step1',
        params: { username }
      });
    } catch (error: any) {
      console.error('Error saving username:', error);
      Alert.alert('Error', 'Failed to save username. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <ProgressBar currentStep={1} totalSteps={3} />
      
      <View style={styles.content}>
        {/* Avatar Placeholder */}
        <View style={styles.avatarContainer}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>
              {username.charAt(0).toUpperCase() || '?'}
            </Text>
          </View>
        </View>

        {/* Title */}
        <Text style={styles.title}>Choose your username</Text>
        <Text style={styles.subtitle}>
          This will be your unique identifier in the app
        </Text>

        {/* Username Input */}
        <View style={styles.inputContainer}>
          <TextInput
            style={styles.input}
            value={username}
            onChangeText={setUsername}
            placeholder="Enter username"
            placeholderTextColor={Colors.textMuted}
            autoCapitalize="none"
            autoCorrect={false}
            maxLength={20}
            editable={!loading}
          />
          <Text style={styles.characterCount}>
            {username.length}/20
          </Text>
        </View>

        {/* Continue Button */}
        <TouchableOpacity
          style={[
            styles.continueButton,
            (!username.trim() || loading) && styles.continueButtonDisabled
          ]}
          onPress={handleContinue}
          disabled={!username.trim() || loading}
        >
          {loading ? (
            <ActivityIndicator size="small" color="white" />
          ) : (
            <Text style={[
              styles.continueButtonText,
              !username.trim() && styles.continueButtonTextDisabled
            ]}>
              Continue
            </Text>
          )}
        </TouchableOpacity>

        {/* Helper Text */}
        <Text style={styles.helperText}>
          Usernames can contain letters, numbers, and underscores
        </Text>
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
    justifyContent: 'center',
    paddingHorizontal: 24,
  },
  avatarContainer: {
    alignItems: 'center',
    marginBottom: 32,
  },
  avatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: Colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: Colors.shadow,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  avatarText: {
    fontSize: 32,
    fontWeight: 'bold',
    color: 'white',
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: Colors.text,
    textAlign: 'center',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: Colors.textSecondary,
    textAlign: 'center',
    marginBottom: 32,
  },
  inputContainer: {
    marginBottom: 24,
  },
  input: {
    backgroundColor: Colors.surface,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 16,
    fontSize: 16,
    color: Colors.text,
    borderWidth: 1,
    borderColor: Colors.cardBorder,
    shadowColor: Colors.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 4,
  },
  characterCount: {
    fontSize: 12,
    color: Colors.textMuted,
    textAlign: 'right',
    marginTop: 4,
  },
  continueButton: {
    backgroundColor: Colors.primary,
    borderRadius: 12,
    paddingVertical: 18,
    alignItems: 'center',
    marginBottom: 16,
    shadowColor: Colors.shadow,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  continueButtonDisabled: {
    backgroundColor: Colors.textMuted,
    opacity: 0.6,
  },
  continueButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  },
  continueButtonTextDisabled: {
    color: Colors.textSecondary,
  },
  helperText: {
    fontSize: 14,
    color: Colors.textMuted,
    textAlign: 'center',
  },
});