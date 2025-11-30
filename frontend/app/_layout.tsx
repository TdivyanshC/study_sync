import { Stack } from 'expo-router';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { PopupProvider } from '../providers/PopupProvider';
import { UserProvider } from '../providers/UserProvider';
import { AuthProvider } from '../providers/AuthProvider';
import * as Linking from 'expo-linking';
import { useEffect } from 'react';
import { router } from 'expo-router';

// Create a client
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5, // 5 minutes
      gcTime: 1000 * 60 * 10, // 10 minutes
    },
  },
});

// Deep link handler component
function DeepLinkHandler() {
  useEffect(() => {
    // Handle initial URL
    const handleInitialUrl = async () => {
      const initialUrl = await Linking.getInitialURL();
      if (initialUrl) {
        console.log('Initial deep link:', initialUrl);
        handleUrl(initialUrl);
      }
    };

    // Handle incoming URLs
    const subscription = Linking.addEventListener('url', ({ url }) => {
      console.log('Deep link received:', url);
      handleUrl(url);
    });

    handleInitialUrl();

    return () => subscription.remove();
  }, []);

  const handleUrl = (url: string) => {
    // If this is our OAuth callback URL, navigate to the auth callback screen
    if (url.startsWith('studysync://') || url.startsWith('studysync://auth/callback')) {
      // Parse URL to check for auth parameters
      const fragment = url.split('#')[1];
      if (fragment) {
        const params = new URLSearchParams(fragment);
        const hasTokens = params.has('access_token') && params.has('refresh_token');
        
        if (hasTokens) {
          // Navigate to auth callback screen to handle the OAuth response
          router.push('/auth/callback');
        }
      }
    }
  };

  return null;
}

export default function RootLayout() {
  return (
    <AuthProvider>
      <QueryClientProvider client={queryClient}>
        <PopupProvider>
          <UserProvider>
            <DeepLinkHandler />
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