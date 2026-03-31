import { useEffect, useState, useRef } from 'react';
import { useRouter } from 'expo-router';
import { View, ActivityIndicator, Text, StyleSheet, Animated, Image, Easing } from 'react-native';
import { useAuth } from '../hooks/useAuth';
import { Colors } from '../constants/Colors';

// Animated Splash Component - shows animated logo during app initialization
function AppSplash() {
  const [showSplash, setShowSplash] = useState(true);
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(0.8)).current;

  useEffect(() => {
    // Entry animation - fade in and scale up
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 600,
        useNativeDriver: true,
        easing: Easing.out(Easing.ease),
      }),
      Animated.spring(scaleAnim, {
        toValue: 1,
        friction: 8,
        tension: 40,
        useNativeDriver: true,
      }),
    ]).start();
  }, []);

  const handleFinish = () => {
    // Exit animation - fade out like YouTube
    Animated.timing(fadeAnim, {
      toValue: 0,
      duration: 400,
      useNativeDriver: true,
      easing: Easing.in(Easing.ease),
    }).start(() => {
      setShowSplash(false);
    });
  };

  useEffect(() => {
    const timer = setTimeout(() => {
      handleFinish();
    }, 1500);
    return () => clearTimeout(timer);
  }, []);

  if (!showSplash) return null;

  return (
    <Animated.View
      style={[
        styles.splashContainer,
        {
          opacity: fadeAnim,
          transform: [{ scale: scaleAnim }],
        },
      ]}
    >
      <Image
        source={require('../assets/images/prodify.png')}
        style={styles.splashLogo}
        resizeMode="contain"
      />
    </Animated.View>
  );
}

// Index route that handles authentication and redirects
export default function IndexScreen() {
  const { user, loading, isInitialized } = useAuth();
  const router = useRouter();
  const [showSplash, setShowSplash] = useState(true);

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
    if (typeof window !== 'undefined' && window.location) {
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

  // Show animated splash first, then loading state
  return (
    <View style={styles.loadingContainer}>
      <AppSplash />
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
  splashContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: Colors.background,
    zIndex: 1000,
  },
  splashLogo: {
    width: 200,
    height: 200,
  },
});