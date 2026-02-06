import { useEffect, useRef, useState } from 'react';
import { View, ActivityIndicator, StyleSheet, Text, TouchableOpacity, Alert } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import * as Linking from 'expo-linking';
import { supabase } from '../../lib/supabase';

/**
 * OAuth callback handler for PKCE flow
 * 
 * With detectSessionInUrl: true in the Supabase config,
 * the session exchange happens automatically when the
 * OAuth callback URL is received.
 * 
 * This component waits for the session to be established
 * and then navigation is handled by AuthProvider's
 * onAuthStateChange listener.
 */
export default function AuthCallback() {
  const params = useLocalSearchParams();
  const hasProcessed = useRef(false);
  const [error, setError] = useState<string | null>(null);

  const handleRetry = () => {
    hasProcessed.current = false;
    setError(null);
  };

  const handleGoToLogin = () => {
    router.replace('/login');
  };

  useEffect(() => {
    if (hasProcessed.current) return;
    hasProcessed.current = true;

    const handleCallback = async () => {
      try {
        console.log('🔔 OAuth callback received');
        console.log('URL params:', JSON.stringify(params, null, 2));

        // Check if we have a code in the URL
        const codeFromParams = params.code as string;
        const hasCode = codeFromParams && codeFromParams.trim();

        if (hasCode) {
          console.log('✅ Authorization code found in URL');
          console.log('📝 Supabase will automatically exchange the code for a session');
          console.log('🔄 Waiting for auth state change...');
        } else {
          console.log('⚠️ No code found in URL params');
          console.log('🔄 Checking for existing session...');
          
          // Try to get existing session
          const { data: sessionData } = await supabase.auth.getSession();
          if (sessionData.session) {
            console.log('✅ Found existing session');
          } else {
            console.log('❌ No session found');
            setError('No authentication code or session found');
          }
        }

        // The session will be automatically established by Supabase's
        // detectSessionInUrl: true setting
        // The AuthProvider's onAuthStateChange listener will handle
        // the navigation based on user status

      } catch (err: any) {
        console.error('❌ Callback error:', err.message);
        setError(err.message);
      }
    };

    // Small delay to ensure params are loaded
    const initTimeout = setTimeout(() => {
      handleCallback();
    }, 100);

    return () => {
      clearTimeout(initTimeout);
    };
  }, [params]);

  // If there's an error, show retry option
  if (error) {
    return (
      <View style={styles.container}>
        <Text style={styles.errorText}>Authentication Error</Text>
        <Text style={styles.subText}>{error}</Text>
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
      <ActivityIndicator size="large" color="#3498db" />
      <Text style={styles.text}>Completing sign in...</Text>
      <Text style={styles.subText}>Please wait while we verify your account</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f8f9fa',
  },
  text: {
    marginTop: 16,
    fontSize: 16,
    color: '#1f2937',
    fontWeight: '600',
  },
  subText: {
    marginTop: 8,
    fontSize: 14,
    color: '#6b7280',
  },
  errorText: {
    fontSize: 18,
    color: '#dc2626',
    fontWeight: '600',
    marginBottom: 8,
  },
  button: {
    backgroundColor: '#3498db',
    borderRadius: 8,
    paddingVertical: 12,
    paddingHorizontal: 24,
    marginTop: 16,
  },
  buttonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
});
