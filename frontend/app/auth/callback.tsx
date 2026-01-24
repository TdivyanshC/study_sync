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

  // Check user status (username and onboarding)
  const checkUserStatus = async (userId: string) => {
    try {
      console.log('🔍 Checking user status for user:', userId);

      // Check username and onboarding status in the users table
      const { data, error } = await supabase
        .from('users')
        .select('username, onboarding_completed')
        .eq('id', userId)
        .single();

      // If no user found, return defaults (new user)
      if (error && error.code === 'PGRST116') {
        console.log('ℹ️ No user found, treating as new user');
        return { hasUsername: false, hasCompletedOnboarding: false };
      }

      // If other error, log but don't fail the auth process
      if (error) {
        console.warn('⚠️ Error checking user status:', error.message);
        return { hasUsername: false, hasCompletedOnboarding: false }; // Default to false for safety
      }

      return {
        hasUsername: !!(data?.username && data.username.trim()),
        hasCompletedOnboarding: data?.onboarding_completed || false
      };
    } catch (error) {
      console.warn('⚠️ Exception checking user status:', error);
      return { hasUsername: false, hasCompletedOnboarding: false }; // Default to false for safety, don't block auth
    }
  };

  useEffect(() => {
    const handleCallback = async () => {
      try {
        console.log('🔔 OAuth callback received');
        console.log('URL params:', JSON.stringify(params, null, 2));
        console.log('Available param keys:', Object.keys(params));

        // Check if we have a code parameter (PKCE flow)
        const code = params.code as string;

        if (!code || code.trim() === '') {
          console.error('❌ No code found in params or code is empty');
          console.log('🔄 Falling back to session detection...');

          // Fallback: Try to get existing session
          const { data: sessionData } = await supabase.auth.getSession();
          if (sessionData.session) {
            console.log('✅ Found existing session');
            const userStatus = await checkUserStatus(sessionData.session.user.id);
            // Navigate based on user status
            setTimeout(() => {
              if (!userStatus.hasUsername) {
                router.replace('/username-selection');
              } else if (userStatus.hasUsername && !userStatus.hasCompletedOnboarding) {
                router.replace('/onboarding-step1');
              } else {
                router.replace('/(tabs)');
              }
            }, 100);
            return;
          }

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
          
          // Check user status
          const userStatus = await checkUserStatus(data.session.user.id);

          // Navigate based on user status
          console.log('🧭 Navigation decision:', {
            email: data.session.user.email,
            hasUsername: userStatus.hasUsername,
            onboardingCompleted: userStatus.hasCompletedOnboarding
          });

          // Small delay to ensure smooth transition
          setTimeout(() => {
            if (!userStatus.hasUsername) {
              console.log('🔄 New user - navigating to username selection');
              router.replace('/username-selection');
            } else if (userStatus.hasUsername && !userStatus.hasCompletedOnboarding) {
              console.log('🔄 User has username but no onboarding - navigating to onboarding step 1');
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