import { useEffect } from 'react';
import { router } from 'expo-router';
import * as Linking from 'expo-linking';

// Clean OAuth callback - Supabase handles everything automatically
export default function AuthCallback() {
  useEffect(() => {
    const handleAuthCallback = async () => {
      try {
        console.log('🔄 OAuth callback triggered');
        
        // Wait a moment for Supabase to process the callback
        // The onAuthStateChange listener in AuthProvider will handle the session
        console.log('⏳ Waiting for Supabase to process OAuth callback...');
        
        // Small delay to ensure component is fully mounted
        const timer = setTimeout(() => {
          console.log('✅ OAuth callback processing complete');
          // Navigation will happen automatically via onAuthStateChange in AuthProvider
        }, 500);
        
        return () => clearTimeout(timer);
      } catch (error) {
        console.error('❌ OAuth callback error:', error);
        router.replace('/login');
      }
    };

    // Process callback when component mounts
    const timer = setTimeout(handleAuthCallback, 100);
    return () => clearTimeout(timer);
  }, []);

  // Minimal loading screen while OAuth is processed
  return null;
}