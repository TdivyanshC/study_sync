import { useEffect, useRef, useState } from 'react';
import { View, ActivityIndicator, StyleSheet, Text, TouchableOpacity } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { Colors } from '../../constants/Colors';

/**
 * OAuth callback handler for PKCE flow
 * 
 * With PKCE flow, we need to manually exchange the authorization code
 * for a session when the OAuth callback URL is received.
 */
export default function AuthCallback() {
  const params = useLocalSearchParams();
  const hasProcessed = useRef(false);
  const [error, setError] = useState<string | null>(null);
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');

  const handleRetry = () => {
    hasProcessed.current = false;
    setError(null);
    setStatus('loading');
  };

  const handleGoToLogin = () => {
    router.replace('/login');
  };

  useEffect(() => {
    // Supabase removed - redirect to login
    console.log('🔔 OAuth callback - redirecting to login (Supabase removed)');
    router.replace('/login');
  }, []);

  // If there's an error, show retry option
  if (status === 'error') {
    return (
      <View style={styles.container}>
        <Text style={styles.errorText}>Authentication Error</Text>
        <Text style={styles.subText}>{error || 'An unknown error occurred'}</Text>
        <TouchableOpacity style={styles.button} onPress={handleRetry}>
          <Text style={styles.buttonText}>Retry</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.button} onPress={handleGoToLogin}>
          <Text style={styles.buttonText}>Go to Login</Text>
        </TouchableOpacity>
      </View>
    );
  }

  // Loading screen - session will be handled by AuthProvider
  return (
    <View style={styles.container}>
      <ActivityIndicator size="large" color={Colors.primary} />
      <Text style={styles.loadingText}>Completing sign in...</Text>
      <Text style={styles.subText}>Please wait while we verify your account</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: Colors.background,
    padding: 20,
  },
  loadingText: {
    marginTop: 16,
    fontSize: 18,
    fontWeight: '600',
    color: Colors.text,
    textAlign: 'center',
  },
  subText: {
    marginTop: 8,
    fontSize: 14,
    color: Colors.text + '80',
    textAlign: 'center',
  },
  errorText: {
    fontSize: 20,
    fontWeight: '700',
    color: '#FF4444',
    marginBottom: 16,
    textAlign: 'center',
  },
  button: {
    backgroundColor: Colors.primary,
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
    marginTop: 16,
  },
  buttonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
});
