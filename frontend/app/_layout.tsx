import { Stack } from 'expo-router';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { PopupProvider } from '../providers/PopupProvider';
import { UserProvider } from '../providers/UserProvider';
import { AuthProvider } from '../providers/AuthProvider';
import * as Linking from 'expo-linking';
import { useEffect, useRef } from 'react';
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
  const processedUrls = useRef<Set<string>>(new Set());
  const isProcessing = useRef(false);

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
    // Prevent processing the same URL multiple times
    if (processedUrls.current.has(url)) {
      console.log('⏭️ URL already processed, skipping:', url);
      return;
    }

    // Mark URL as processed
    processedUrls.current.add(url);
    
    // Don't process if already navigating to auth callback
    if (isProcessing.current) {
      console.log('⏭️ Already processing a URL, skipping:', url);
      return;
    }

    console.log('🔗 Deep link handler processing URL:', url);
    
    // Handle Expo OAuth callback URLs (exp://...)
    if (url.includes('exp://') && url.includes('?code=')) {
      console.log('🔄 OAuth callback detected, navigating to auth callback');
      
      // Extract parameters from URL
      const urlObj = new URL(url);
      const params = Object.fromEntries(urlObj.searchParams.entries());
      
      console.log('📋 Extracted OAuth parameters:', params);
      
      // Navigate to auth callback with parameters
      isProcessing.current = true;
      setTimeout(() => {
        router.push({
          pathname: '/auth/callback',
          params: params
        });
        // Allow processing new URLs after a delay
        setTimeout(() => {
          isProcessing.current = false;
        }, 2000);
      }, 100);
      return;
    }
    
    // Handle custom scheme OAuth callbacks
    if (url.startsWith('studysync://') || url.startsWith('studysync://auth/callback')) {
      const fragment = url.split('#')[1];
      if (fragment) {
        const params = new URLSearchParams(fragment);
        const hasTokens = params.has('access_token') && params.has('refresh_token');
        
        if (hasTokens) {
          console.log('🔄 OAuth tokens found, navigating to auth callback');
          isProcessing.current = true;
          setTimeout(() => {
            router.push('/auth/callback');
            setTimeout(() => {
              isProcessing.current = false;
            }, 2000);
          }, 100);
          return;
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
              
              {/* Onboarding screens */}
              <Stack.Screen 
                name="onboarding-step1" 
                options={{ 
                  headerShown: false,
                  presentation: 'modal'
                }} 
              />
              <Stack.Screen 
                name="onboarding-step2" 
                options={{ 
                  headerShown: false,
                  presentation: 'modal'
                }} 
              />
              
              {/* Test screen for debugging */}
              <Stack.Screen 
                name="test-onboarding" 
                options={{ 
                  headerShown: false,
                  presentation: 'modal'
                }} 
              />
              
              {/* Username selection screen */}
              <Stack.Screen
                name="username-selection"
                options={{
                  headerShown: false,
                  presentation: 'modal'
                }}
              />
              
              {/* Existing routes */}
              <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
              <Stack.Screen name="timer" options={{ headerShown: false }} />
              <Stack.Screen name="spaces" options={{ headerShown: false }} />
              <Stack.Screen name="profile" options={{ headerShown: false }} />
              <Stack.Screen name="settings" options={{ headerShown: false }} />
              <Stack.Screen name="debug-navigation" options={{ headerShown: false }} />
            </Stack>
          </UserProvider>
        </PopupProvider>
      </QueryClientProvider>
    </AuthProvider>
  );
}
