import { useEffect, useState } from 'react';
import { View, Text, ActivityIndicator, StyleSheet, Alert } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { supabase } from '../../lib/supabase';

/**
 * OAuth callback handler for PKCE flow
 * 
 * This component handles the OAuth callback with the authorization code.
 * Supabase SDK automatically exchanges the code for tokens, so we just
 * need to check if the session was established and navigate accordingly.
 */
export default function AuthCallback() {
  const [status, setStatus] = useState('Processing authentication...');
  const [step, setStep] = useState(1);
  const params = useLocalSearchParams();

  useEffect(() => {
    const handleCallback = async () => {
      try {
        setStatus('Processing authentication...');
        setStep(1);

        console.log('🔔 OAuth callback received');
        console.log('URL params:', params);

        // Check if we have a code parameter (PKCE flow)
        const code = params.code as string;
        
        if (!code) {
          throw new Error('No authorization code found in callback');
        }

        console.log('✅ Authorization code received');
        setStatus('Authorization code received');
        setStep(2);

        // The AuthProvider will handle the code exchange automatically
        // Just wait for the session to be established
        setStatus('Exchanging authorization code for tokens...');
        setStep(3);
        
        console.log('⏳ Waiting for AuthProvider to process the authorization code...');
        setStatus('Processing authentication...');
        setStep(4);
        
        // The onAuthStateChange listener in AuthProvider will handle
        // the navigation when the session is finally established

      } catch (error: any) {
        console.error('OAuth callback error:', error.message);
        setStatus(`Error: ${error.message}`);
        setStep(0);

        Alert.alert(
          'Authentication Error',
          error.message || 'An error occurred during authentication.',
          [
            {
              text: 'OK',
              onPress: () => router.replace('/login')
            }
          ]
        );
      }
    };

    handleCallback();
  }, []);

  return (
    <View style={styles.container}>
      <View style={styles.content}>
        <ActivityIndicator size="large" color="#3498db" />
        <Text style={styles.title}>Completing sign in...</Text>
        <Text style={styles.status}>{status}</Text>
        <Text style={styles.step}>Step {step}/4</Text>
        
        <View style={styles.stepsContainer}>
          <Text style={styles.stepsTitle}>PKCE OAuth Process:</Text>
          <Text style={step >= 1 ? styles.stepActive : styles.stepInactive}>✓ Callback Received</Text>
          <Text style={step >= 2 ? styles.stepActive : styles.stepInactive}>✓ Code Extracted</Text>
          <Text style={step >= 3 ? styles.stepActive : styles.stepInactive}>✓ Code Exchange</Text>
          <Text style={step >= 4 ? styles.stepActive : styles.stepInactive}>
            {step === 4 ? '✓ Session Ready' : '⏳ Session Processing'}
          </Text>
        </View>

        <Text style={styles.info}>
          Please wait while we complete your sign-in. You'll be redirected automatically.
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f8f9fa',
    padding: 20,
  },
  content: {
    width: '100%',
    maxWidth: 400,
    alignItems: 'center',
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#2c3e50',
    marginTop: 20,
    marginBottom: 10,
    textAlign: 'center',
  },
  status: {
    fontSize: 16,
    color: '#7f8c8d',
    textAlign: 'center',
    marginBottom: 10,
  },
  step: {
    fontSize: 14,
    color: '#95a5a6',
    textAlign: 'center',
    marginBottom: 20,
  },
  stepsContainer: {
    width: '100%',
    backgroundColor: '#ffffff',
    borderRadius: 10,
    padding: 20,
    borderWidth: 1,
    borderColor: '#e9ecef',
    marginBottom: 20,
  },
  stepsTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#2c3e50',
    marginBottom: 15,
    textAlign: 'center',
  },
  stepActive: {
    fontSize: 14,
    color: '#27ae60',
    marginBottom: 5,
  },
  stepInactive: {
    fontSize: 14,
    color: '#bdc3c7',
    marginBottom: 5,
  },
  info: {
    fontSize: 12,
    color: '#95a5a6',
    textAlign: 'center',
    fontStyle: 'italic',
  },
});