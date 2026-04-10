import { useEffect } from 'react';
import { View, ActivityIndicator, StyleSheet, Alert } from 'react-native';
import { router } from 'expo-router';
import * as Linking from 'expo-linking';

// Seamless OAuth callback with aggressive session detection
export default function AuthCallbackEnhanced() {

  useEffect(() => {
    // Supabase removed - redirect to login
    console.log('🔄 Auth callback - redirecting to login (Supabase removed)');
    router.replace('/login');
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