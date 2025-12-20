import { useEffect } from 'react';
import { useRouter } from 'expo-router';
import { View, ActivityIndicator, Text, StyleSheet } from 'react-native';
import { useAuth } from '../hooks/useAuth';
import { Colors } from '../constants/Colors';

// Index route that handles authentication and redirects
export default function IndexScreen() {
  const { user, loading, isInitialized } = useAuth();
  const router = useRouter();

  useEffect(() => {
    console.log('📍 Index route state:', {
      user: user?.email,
      loading,
      isInitialized,
      hasUser: !!user
    });

    // Don't make any navigation decisions until initialization is complete
    if (!isInitialized) {
      console.log('⏳ Waiting for auth initialization...');
      return;
    }

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
        loading,
        isInitialized
      });

      // If this is an OAuth callback, let the auth/callback route handle it
      if (currentPath.includes('/auth/callback') || hasAuthCode) {
        console.log('🔄 OAuth callback detected, allowing callback route to handle');
        return; // Don't redirect, let /auth/callback route process it
      }
    }

    // Normal authentication flow - navigation handled by AuthProvider ONLY
    // Do NOT handle navigation here to avoid conflicts with AuthProvider
    console.log('ℹ️ Index: User state changed, AuthProvider will handle navigation');
  }, [user, loading, isInitialized, router]);

  // Show loading while checking authentication or during initialization
  return (
    <View style={styles.loadingContainer}>
      <ActivityIndicator size="large" color={Colors.primary} />
      <Text style={styles.loadingText}>
        {!isInitialized ? 'Initializing...' : 'Checking authentication...'}
      </Text>
      {!isInitialized && (
        <Text style={styles.subText}>
          Setting up your session
        </Text>
      )}
      {isInitialized && !user && (
        <Text style={styles.subText}>
          Redirecting to login...
        </Text>
      )}
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
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: Colors.text,
    textAlign: 'center',
  },
  subText: {
    marginTop: 8,
    fontSize: 14,
    color: Colors.text + '80', // Semi-transparent
    textAlign: 'center',
  },
});