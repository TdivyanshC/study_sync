import { Stack } from 'expo-router';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { PopupProvider } from '../providers/PopupProvider';
import { UserProvider } from '../providers/UserProvider';
import { AuthProvider } from '../providers/AuthProvider';

// Create a client
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5, // 5 minutes
      gcTime: 1000 * 60 * 10, // 10 minutes
    },
  },
});

export default function RootLayout() {
  return (
    <AuthProvider>
      <QueryClientProvider client={queryClient}>
        <PopupProvider>
          <UserProvider>
            <Stack screenOptions={{ headerShown: false }}>
              {/* Index route handles authentication redirects */}
              <Stack.Screen name="index" options={{ headerShown: false }} />
              
              {/* OAuth callback route */}
              <Stack.Screen 
                name="auth/callback" 
                options={{ 
                  headerShown: false,
                  presentation: 'modal'
                }} 
              />
              
              {/* Login screen */}
              <Stack.Screen 
                name="login" 
                options={{ 
                  headerShown: false,
                  presentation: 'modal'
                }} 
              />
              
              {/* Home screen - protected */}
              <Stack.Screen name="home" options={{ headerShown: false }} />
              
              {/* Existing routes */}
              <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
              <Stack.Screen name="timer" options={{ headerShown: false }} />
            </Stack>
          </UserProvider>
        </PopupProvider>
      </QueryClientProvider>
    </AuthProvider>
  );
}