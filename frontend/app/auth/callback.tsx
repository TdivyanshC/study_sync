import { useEffect, useRef, useState } from 'react';
import { View, ActivityIndicator, StyleSheet, Text, TouchableOpacity } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { supabase } from '../../lib/supabase';
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
    if (hasProcessed.current) return;
    hasProcessed.current = true;

    const handleCallback = async () => {
      try {
        console.log('🔔 OAuth callback received');
        console.log('URL params:', JSON.stringify(params, null, 2));

        // Check if we have a code in the URL
        const codeFromParams = params.code as string;
        const hasCode = codeFromParams && codeFromParams.trim().length > 0;

        if (hasCode) {
          console.log('✅ Authorization code found in URL');
          console.log('🔄 Manually exchanging code for session...');
          
          setStatus('loading');

          try {
            // Manually exchange the authorization code for a session
            // This is required for PKCE flow in Expo/React Native
            const { data, error: exchangeError } = await supabase.auth.exchangeCodeForSession(codeFromParams);

            if (exchangeError) {
              console.error('❌ Code exchange error:', exchangeError.message);
              
              // If exchange fails, try to get existing session anyway
              const { data: sessionData } = await supabase.auth.getSession();
              if (sessionData.session) {
                console.log('✅ Found existing session after exchange failure');
                setStatus('success');
              } else {
                setError(`Failed to establish session: ${exchangeError.message}`);
                setStatus('error');
              }
            } else if (data.session) {
              console.log('✅ Session established successfully via code exchange');
              console.log('📧 User email:', data.session.user.email);
              setStatus('success');
            } else {
              console.warn('⚠️ No session returned from code exchange');
              setError('Session establishment returned no session');
              setStatus('error');
            }
          } catch (exchangeCatchError: any) {
            console.error('❌ Code exchange exception:', exchangeCatchError);
            
            // Try to get existing session as fallback
            const { data: sessionData } = await supabase.auth.getSession();
            if (sessionData.session) {
              console.log('✅ Found existing session after exchange exception');
              setStatus('success');
            } else {
              setError(`Failed to establish session: ${exchangeCatchError.message}`);
              setStatus('error');
            }
          }
          
          // Add a safety timeout - if we don't navigate within 5 seconds, check status
          const safetyTimeout = setTimeout(async () => {
            console.log('⏰ Safety timeout reached, verifying session...');
            const { data: sessionData } = await supabase.auth.getSession();
            if (!sessionData.session && status !== 'error') {
              console.log('⚠️ Still no session after timeout, showing error');
              setError('Session establishment timed out. Please try again.');
              setStatus('error');
            }
          }, 5000);

          return () => {
            clearTimeout(safetyTimeout);
          };
        } else {
          console.log('⚠️ No code found in URL params');
          console.log('🔄 Checking for existing session...');
          
          // Try to get existing session
          const { data: sessionData } = await supabase.auth.getSession();
          if (sessionData.session) {
            console.log('✅ Found existing session');
            setStatus('success');
          } else {
            console.log('❌ No session found');
            setError('No authentication code or session found');
            setStatus('error');
          }
        }

      } catch (err: any) {
        console.error('❌ Callback error:', err.message);
        setError(err.message);
        setStatus('error');
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
