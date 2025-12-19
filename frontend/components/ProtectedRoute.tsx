import React from 'react';
import { View, ActivityIndicator, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { useAuth } from '../hooks/useAuth';
import { Colors } from '../constants/Colors';

interface ProtectedRouteProps {
  children: React.ReactNode;
}

export default function ProtectedRoute({ children }: ProtectedRouteProps) {
  const { user, loading, isInitialized } = useAuth();
  const router = useRouter();

  React.useEffect(() => {
    // Only redirect after initialization is complete
    if (isInitialized && !loading && !user) {
      console.log('No authenticated user after initialization, redirecting to login');
      router.replace('/login');
    }
  }, [user, loading, isInitialized, router]);

  // Show loading spinner while checking authentication or during initialization
  if (loading || !isInitialized) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={Colors.primary} />
      </View>
    );
  }

  // If no user and initialized, don't render anything (redirect will happen)
  if (!user) {
    return null;
  }

  // User is authenticated, render the protected content
  return <>{children}</>;
}

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: Colors.background,
  },
});