import { useEffect } from 'react';
import { View, ActivityIndicator, StyleSheet } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { supabase } from '../../lib/supabase';

/**
 * Seamless OAuth callback handler for PKCE flow
 * 
 * This component handles the OAuth callback with minimal user interface.
 * It processes the authentication and navigates directly without showing
 * detailed progress steps.
 */
export default function AuthCallback() {
  const params = useLocalSearchParams();

  // Check if user has completed onboarding
  const checkOnboardingStatus = async (userId: string) => {
    try {
      console.log('🔍 Checking onboarding status for user:', userId);
      
      // Check if user has completed onboarding in the users table
      const { data, error } = await supabase
        .from('users')
        .select('onboarding_completed')
        .eq('id', userId)
        .single();

      // If no user found, return false (new user)
      if (error && error.code === 'PGRST116') {
        console.log('ℹ️ No user found, treating as new user');
        return false;
      }

      // If other error, log but don't fail the auth process
      if (error) {
        console.warn('⚠️ Error checking onboarding status:', error.message);
        return false; // Default to false for safety
      }

      const completed = data?.onboarding_completed || false;
      console.log('✅ Onboarding status:', completed);
      return completed;
    } catch (error) {
      console.warn('⚠️ Exception checking onboarding status:', error);
      return false; // Default to false for safety, don't block auth
    }
  };

  useEffect(() => {
    const handleCallback = async () => {
      try {
        console.log('🔔 OAuth callback received');
        console.log('URL params:', params);

        // Check if we have a code parameter (PKCE flow)
        const code = params.code as string;
        
        if (!code) {
          console.error('❌ No code found in params');
          router.replace('/login');
          return;
        }

        console.log('✅ Authorization code received');

        // Explicitly exchange the code for tokens to ensure session is established
        const { data, error } = await supabase.auth.exchangeCodeForSession(code);
        
        if (error) {
          console.error('❌ Code exchange failed:', error.message);
          router.replace('/login');
          return;
        }
        
        if (data.session && data.session.user) {
          console.log('✅ Session established:', data.session.user.email);
          
          // Check onboarding status
          const completedOnboarding = await checkOnboardingStatus(data.session.user.id);
          
          // Navigate based on onboarding status
          console.log('🧭 Navigation decision:', {
            email: data.session.user.email,
            onboardingCompleted: completedOnboarding
          });
          
          // Small delay to ensure smooth transition
          setTimeout(() => {
            if (!completedOnboarding) {
              console.log('🔄 New user - navigating to onboarding step 1');
              router.replace('/onboarding-step1');
            } else {
              console.log('🔄 Returning user - navigating to home');
              router.replace('/(tabs)');
            }
          }, 100);
        } else {
          console.error('❌ No session returned');
          router.replace('/login');
        }

      } catch (error: any) {
        console.error('❌ OAuth callback error:', error.message);
        router.replace('/login');
      }
    };

    handleCallback();
  }, []);

  // Minimal loading screen - just a spinner, no text or steps
  return (
    <View style={styles.container}>
      <ActivityIndicator size="large" color="#3498db" />
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
});