import { useEffect, useState } from 'react';
import { View, Text, ActivityIndicator, StyleSheet, Alert } from 'react-native';
import { router } from 'expo-router';
import * as Linking from 'expo-linking';
import { supabase } from '../../lib/supabase';

// Enhanced OAuth callback with aggressive session detection
export default function AuthCallbackEnhanced() {
  const [status, setStatus] = useState('Initializing...');
  const [step, setStep] = useState(1);
  const [debugInfo, setDebugInfo] = useState<string[]>([]);

  const addDebugInfo = (info: string) => {
    console.log('🔍 DEBUG:', info);
    setDebugInfo(prev => [...prev, info]);
  };

  useEffect(() => {
    let checkInterval: NodeJS.Timeout;
    let authSubscription: any;
    let timeoutId: NodeJS.Timeout;

    const checkSessionAndRedirect = async () => {
      try {
        addDebugInfo('🔄 Starting session detection');
        setStatus('Initializing authentication...');
        setStep(1);

        // Method 1: Direct session check
        addDebugInfo('📋 Method 1: Direct session check');
        const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
        
        if (sessionError) {
          addDebugInfo(`❌ Session check error: ${sessionError.message}`);
        } else if (sessionData.session) {
          addDebugInfo(`✅ Method 1 SUCCESS: Session found - ${sessionData.session.user?.email}`);
          setStatus('Session detected! Redirecting...');
          setStep(8);
          router.replace('/home');
          return;
        } else {
          addDebugInfo('⏳ Method 1: No session found yet');
        }

        // Method 2: Get current user
        addDebugInfo('📋 Method 2: Get current user');
        const { data: userData, error: userError } = await supabase.auth.getUser();
        
        if (userError) {
          addDebugInfo(`❌ User check error: ${userError.message}`);
        } else if (userData.user) {
          addDebugInfo(`✅ Method 2 SUCCESS: User found - ${userData.user.email}`);
          setStatus('User detected! Creating session...');
          setStep(7);
          
          // Try to get session again after user is found
          setTimeout(async () => {
            const { data } = await supabase.auth.getSession();
            if (data.session) {
              addDebugInfo('✅ Session created after user detection');
              router.replace('/home');
            }
          }, 1000);
          return;
        } else {
          addDebugInfo('⏳ Method 2: No user found yet');
        }

        // Method 3: Set up auth state listener
        addDebugInfo('📋 Method 3: Setting up auth state listener');
        setStatus('Waiting for authentication...');
        setStep(6);

        authSubscription = supabase.auth.onAuthStateChange((event, session) => {
          addDebugInfo(`🔔 Auth event: ${event}`);
          if (session?.user) {
            addDebugInfo(`✅ Method 3 SUCCESS: Auth state change - ${session.user.email}`);
            setStatus('Authentication successful! Redirecting...');
            setStep(7);
            router.replace('/home');
          }
        });

        // Method 4: Periodic checking (every 1 second for 15 seconds)
        addDebugInfo('📋 Method 4: Periodic session checking');
        setStatus('Checking for session...');
        setStep(5);

        let checkCount = 0;
        checkInterval = setInterval(async () => {
          checkCount++;
          addDebugInfo(`🔄 Periodic check ${checkCount}/15`);
          
          const { data } = await supabase.auth.getSession();
          if (data.session) {
            addDebugInfo(`✅ Method 4 SUCCESS: Periodic check found session - ${data.session.user?.email}`);
            clearInterval(checkInterval);
            setStatus('Session found! Redirecting...');
            setStep(8);
            router.replace('/home');
          } else if (checkCount >= 15) {
            addDebugInfo('⏰ All methods exhausted, showing timeout');
            clearInterval(checkInterval);
            setStatus('Authentication timeout');
            Alert.alert(
              'Authentication Issue',
              'We couldn\'t detect your session. This might be a timing issue. Please try again.',
              [
                {
                  text: 'Try Again',
                  onPress: () => {
                    setDebugInfo([]);
                    setStep(1);
                    checkSessionAndRedirect();
                  }
                },
                {
                  text: 'Go to Login',
                  onPress: () => router.replace('/login')
                }
              ]
            );
          }
        }, 1000);

        // Ultimate fallback: Wait 10 seconds and try one more time
        setTimeout(async () => {
          if (checkCount < 15) {
            addDebugInfo('🆘 Fallback: Final session check');
            const { data } = await supabase.auth.getSession();
            if (data.session) {
              addDebugInfo(`✅ Fallback SUCCESS: Final check found session - ${data.session.user?.email}`);
              clearInterval(checkInterval);
              router.replace('/home');
            } else {
              addDebugInfo('❌ Fallback: No session found');
            }
          }
        }, 10000);

      } catch (error: any) {
        addDebugInfo(`❌ Fatal error: ${error.message}`);
        setStatus(`Error: ${error.message}`);
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

    // Get initial URL for debugging
    Linking.getInitialURL().then(url => {
      addDebugInfo(`📱 Initial URL: ${url || 'No URL'}`);
      checkSessionAndRedirect();
    });

    // Cleanup
    return () => {
      if (checkInterval) clearInterval(checkInterval);
      if (authSubscription?.data?.subscription) {
        authSubscription.data.subscription.unsubscribe();
      }
      if (timeoutId) clearTimeout(timeoutId);
    };
  }, []);

  return (
    <View style={styles.container}>
      <View style={styles.content}>
        <ActivityIndicator size="large" color="#3498db" />
        <Text style={styles.title}>Completing sign in...</Text>
        <Text style={styles.status}>{status}</Text>
        <Text style={styles.step}>Step {step}/8</Text>
        
        {/* Debug Info Display */}
        <View style={styles.debugContainer}>
          <Text style={styles.debugTitle}>Debug Information:</Text>
          {debugInfo.map((info, index) => (
            <Text key={index} style={styles.debugText}>
              {info}
            </Text>
          ))}
        </View>

        <View style={styles.stepsContainer}>
          <Text style={styles.stepsTitle}>OAuth Process:</Text>
          <Text style={step >= 1 ? styles.stepActive : styles.stepInactive}>✓ Initialize</Text>
          <Text style={step >= 2 ? styles.stepActive : styles.stepInactive}>✓ Session check</Text>
          <Text style={step >= 3 ? styles.stepActive : styles.stepInactive}>✓ User detection</Text>
          <Text style={step >= 4 ? styles.stepActive : styles.stepInactive}>✓ Auth listener</Text>
          <Text style={step >= 5 ? styles.stepActive : styles.stepInactive}>✓ Periodic check</Text>
          <Text style={step >= 6 ? styles.stepActive : styles.stepInactive}>✓ Wait for auth</Text>
          <Text style={step >= 7 ? styles.stepActive : styles.stepInactive}>✓ Auth success</Text>
          <Text style={step >= 8 ? styles.stepActive : styles.stepInactive}>✓ Redirect home</Text>
        </View>
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
  debugContainer: {
    width: '100%',
    backgroundColor: '#f1f3f4',
    borderRadius: 8,
    padding: 15,
    marginBottom: 20,
    maxHeight: 150,
  },
  debugTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#2c3e50',
    marginBottom: 10,
  },
  debugText: {
    fontSize: 12,
    color: '#5a6c7d',
    marginBottom: 2,
    fontFamily: 'monospace',
  },
  stepsContainer: {
    width: '100%',
    backgroundColor: '#ffffff',
    borderRadius: 10,
    padding: 20,
    borderWidth: 1,
    borderColor: '#e9ecef',
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
});