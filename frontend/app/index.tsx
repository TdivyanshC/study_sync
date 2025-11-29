import { useEffect } from 'react';
import { useRouter } from 'expo-router';
import { View, ActivityIndicator, StyleSheet } from 'react-native';
import { useAuth } from '../hooks/useAuth';
import { Colors } from '../constants/Colors';

// Index route that handles authentication and redirects
export default function IndexScreen() {
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (loading) return;

    // Check if we're on the auth callback route
    if (typeof window !== 'undefined') {
      const currentPath = window.location.pathname;
      const hasAuthCode = window.location.hash.includes('access_token') || 
                         window.location.search.includes('code=') ||
                         window.location.hash.includes('code=');
      
      console.log('📍 Index route analysis:', {
        currentPath,
        hasAuthCode,
        user: user?.email,
        loading
      });

      // If this is an OAuth callback, let the auth/callback route handle it
      if (currentPath.includes('/auth/callback') || hasAuthCode) {
        console.log('🔄 OAuth callback detected, allowing callback route to handle');
        return; // Don't redirect, let /auth/callback route process it
      }
    }

    // Normal authentication flow
    if (user) {
      console.log('✅ User authenticated, redirecting to home');
      router.replace('/home');
    } else {
      console.log('⚠️ No user found, redirecting to login');
      router.replace('/login');
    }
  }, [user, loading, router]);

  // Show loading while checking authentication
  return (
    <View style={styles.loadingContainer}>
      <ActivityIndicator size="large" color={Colors.primary} />
    </View>
  );
}

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: Colors.background,
  },
});