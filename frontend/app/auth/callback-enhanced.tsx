import { useEffect } from 'react';
import { View, ActivityIndicator, StyleSheet, Alert } from 'react-native';
import { router } from 'expo-router';
import * as Linking from 'expo-linking';
import { supabase } from '../../lib/supabase';

// Seamless OAuth callback with aggressive session detection
export default function AuthCallbackEnhanced() {
  // Check if user has completed onboarding
  const checkOnboardingStatus = async (userId: string) => {
    try {
      console.log('🔍 Checking onboarding status for user:', userId);
      
      // First check if the table exists and user has a profile
      const { data, error } = await supabase
        .from('user_profiles')
        .select('onboarding_completed')
        .eq('user_id', userId)
        .single();

      // If no profile exists yet (new user), create one and return false
      if (error && error.code === 'PGRST116') {
        console.log('ℹ️ No user profile found, creating profile for new user');
        await createUserProfile(userId);
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

  // Create user profile if it doesn't exist
  const createUserProfile = async (userId: string) => {
    try {
      console.log('📝 Creating user profile for:', userId);
      
      // Get user info for the profile
      const { data: userData } = await supabase.auth.getUser();
      const user = userData.user;
      
      const { error } = await supabase
        .from('user_profiles')
        .upsert({
          user_id: userId,
          email: user?.email || '',
          onboarding_completed: false,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        });

      if (error) {
        console.warn('⚠️ Error creating user profile:', error.message);
      } else {
        console.log('✅ User profile created successfully');
      }
    } catch (error) {
      console.warn('⚠️ Exception creating user profile:', error);
    }
  };

  // Helper function to navigate based on onboarding status
  const navigateBasedOnOnboarding = async (session: any) => {
    if (!session?.user) return;
    
    const completedOnboarding = await checkOnboardingStatus(session.user.id);
    
    setTimeout(() => {
      if (!completedOnboarding) {
        console.log('🔄 New user - navigating to onboarding step 1');
        router.replace('/onboarding-step1');
      } else {
        console.log('🔄 Returning user - navigating to home');
        router.replace('/home');
      }
    }, 100);
  };

  useEffect(() => {
    let checkInterval: any = null;
    let authSubscription: any;

    const checkSessionAndRedirect = async () => {
      try {
        console.log('🔄 Starting seamless session detection');

        // Method 1: Direct session check
        const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
        
        if (sessionError) {
          console.log('❌ Session check error:', sessionError.message);
        } else if (sessionData.session) {
          console.log('✅ Session found:', sessionData.session.user?.email);
          await navigateBasedOnOnboarding(sessionData.session);
          return;
        }

        // Method 2: Get current user
        const { data: userData, error: userError } = await supabase.auth.getUser();
        
        if (userError) {
          console.log('❌ User check error:', userError.message);
        } else if (userData.user) {
          console.log('✅ User found:', userData.user.email);
          
          // Try to get session again after user is found
          setTimeout(async () => {
            const { data } = await supabase.auth.getSession();
            if (data.session) {
              console.log('✅ Session created after user detection');
              await navigateBasedOnOnboarding(data.session);
            }
          }, 500);
          return;
        }

        // Method 3: Set up auth state listener
        authSubscription = supabase.auth.onAuthStateChange(async (event, session) => {
          console.log('🔔 Auth event:', event);
          if (session?.user) {
            console.log('✅ Auth state change:', session.user.email);
            await navigateBasedOnOnboarding(session);
          }
        });

        // Method 4: Periodic checking (every 1 second for 10 seconds)
        let checkCount = 0;
        checkInterval = setInterval(async () => {
          checkCount++;
          
          const { data } = await supabase.auth.getSession();
          if (data.session) {
            console.log('✅ Periodic check found session:', data.session.user?.email);
            clearInterval(checkInterval);
            await navigateBasedOnOnboarding(data.session);
          } else if (checkCount >= 10) {
            console.log('⏰ All methods exhausted, showing timeout');
            clearInterval(checkInterval);
            Alert.alert(
              'Authentication Issue',
              'We couldn\'t detect your session. Please try again.',
              [
                {
                  text: 'Try Again',
                  onPress: () => checkSessionAndRedirect()
                },
                {
                  text: 'Go to Login',
                  onPress: () => router.replace('/login')
                }
              ]
            );
          }
        }, 1000);

        // Ultimate fallback: Wait 8 seconds and try one more time
        setTimeout(async () => {
          if (checkCount < 10) {
            console.log('🆘 Fallback: Final session check');
            const { data } = await supabase.auth.getSession();
            if (data.session) {
              console.log('✅ Fallback found session:', data.session.user?.email);
              clearInterval(checkInterval);
              await navigateBasedOnOnboarding(data.session);
            } else {
              console.log('❌ Fallback: No session found');
            }
          }
        }, 8000);

      } catch (error: any) {
        console.error('❌ Fatal error:', error.message);
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
      console.log('📱 Initial URL:', url || 'No URL');
      checkSessionAndRedirect();
    });

    // Cleanup
    return () => {
      if (checkInterval) clearInterval(checkInterval);
      if (authSubscription?.data?.subscription) {
        authSubscription.data.subscription.unsubscribe();
      }
    };
  }, []);

  // Minimal loading screen - just a spinner, no text or debug info
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