# 🔍 Expo + Supabase Google OAuth Issues Analysis

## 🚨 Critical Issues Identified

### 1. **PKCE WebCrypto Warning (Expo Go)**
**Problem**: The OAuth flow uses PKCE by default, which causes WebCrypto warnings in Expo Go because it falls back to `plain` code challenge method.

**Location**: `providers/AuthProvider.tsx:120-154`
```typescript
const { data, error } = await supabase.auth.signInWithOAuth({
  provider: 'google',
  options: { 
    redirectTo: redirectUrl
  }
});
```

**Fix**: Add `useProxy: true` for Expo Go environments to use Expo's AuthSession proxy.

### 2. **Redirect URL Generation Issues**
**Problem**: The redirect URL format changes between development and production, but there's no environment-specific handling.

**Current Flow**:
- Development: `exp://[IP]:8081/--/auth/callback`
- Production: `com.studystreak.app://auth/callback`
- But Supabase/Google may be configured for `localhost:8081`

**Location**: `providers/AuthProvider.tsx:31-35`
```typescript
const getRedirectUrl = () => {
  const redirectUrl = Linking.createURL('auth/callback');
  console.log("✅ Generated redirect URL:", redirectUrl);
  return redirectUrl;
};
```

### 3. **Overly Complex Callback Handler**
**Problem**: The callback handler has multiple polling mechanisms, timeouts, and complex session checking that can interfere with successful OAuth completion.

**Location**: `app/auth/callback.tsx:32-98`
- Multiple `checkForSession` attempts
- Complex auth state change listeners
- 90-second timeout with periodic polling

### 4. **Flow Type Mismatch**
**Problem**: Supabase client uses `implicit` flow but OAuth implementation doesn't consistently handle this.

**Location**: `lib/supabase.ts:28`
```typescript
flowType: 'implicit' // Using implicit flow for better Expo compatibility
```

But the OAuth call doesn't specify flow type, creating inconsistency.

## 🎯 Precise Fixes Required

### Fix 1: Add useProxy for Expo Go (PKCE Warning Solution)

**File**: `frontend/providers/AuthProvider.tsx`
**Change**: Add environment detection and useProxy configuration

```typescript
const loginWithGoogle = async (): Promise<void> => {
  setLoading(true);

  try {
    const redirectUrl = getRedirectUrl();
    console.log("🔄 Starting OAuth flow...");
    console.log("Redirect URL:", redirectUrl);

    // Detect if running in Expo Go (development) vs standalone build
    const isExpoGo = __DEV__ && !window.location; // Basic Expo Go detection
    const useProxy = isExpoGo || Platform.OS === 'web';

    const { data, error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { 
        redirectTo: redirectUrl,
        ...(useProxy && { useProxy: true }), // Fix for PKCE warnings in Expo Go
      }
    });

    if (error) throw error;

    console.log("✅ OAuth URL generated successfully");
    
    if (data?.url) {
      console.log("🔗 Opening OAuth URL:", data.url);
      console.log("🔄 PKCE Code Challenge:", data.url.includes('code_challenge') ? 'Present' : 'Missing');
      
      // Use Expo AuthSession proxy for Expo Go to avoid PKCE issues
      if (useProxy) {
        await WebBrowser.openAuthSessionAsync(data.url, redirectUrl);
      } else {
        // Direct OAuth flow for standalone builds
        await WebBrowser.openAuthSessionAsync(data.url);
      }
      
      console.log("🌐 OAuth browser opened, waiting for redirect...");
    }
  } catch (e) {
    console.error("❌ OAuth Login Error:", e);
  } finally {
    setLoading(false);
  }
};
```

### Fix 2: Simplify Callback Handler (Remove Complex Polling)

**File**: `frontend/app/auth/callback.tsx`
**Change**: Replace complex polling with direct session handling

```typescript
import { useEffect } from 'react';
import { router } from 'expo-router';
import { supabase } from '../../lib/supabase';

export default function AuthCallback() {
  useEffect(() => {
    const handleAuthCallback = async () => {
      try {
        console.log('🔄 OAuth callback triggered, checking session...');
        
        // Wait a moment for Supabase to process the callback
        const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
        
        if (sessionError) {
          console.error('❌ Session check error:', sessionError);
          router.replace('/login');
          return;
        }

        if (sessionData.session) {
          console.log('✅ Session found:', sessionData.session.user?.email);
          router.replace('/home');
          return;
        }

        // Set up a listener for auth state changes
        const { data: { subscription } } = supabase.auth.onAuthStateChange(
          (event, session) => {
            console.log('🔄 Auth state changed:', event);
            
            if (session) {
              console.log('✅ OAuth session created:', session.user?.email);
              router.replace('/home');
            } else if (event === 'INITIAL_SESSION') {
              // If no session after initial session event, redirect to login
              console.log('📋 No initial session found');
              router.replace('/login');
            }
          }
        );

        // Clean up listener after 30 seconds if no session
        const timeout = setTimeout(() => {
          subscription.unsubscribe();
          console.log('⏰ OAuth timeout, redirecting to login');
          router.replace('/login');
        }, 30000);

        return () => {
          clearTimeout(timeout);
          subscription.unsubscribe();
        };
        
      } catch (error) {
        console.error('❌ OAuth callback error:', error);
        router.replace('/login');
      }
    };

    // Small delay to ensure component is mounted
    const timer = setTimeout(handleAuthCallback, 100);
    return () => clearTimeout(timer);
  }, []);

  return null; // This component doesn't render anything
}
```

### Fix 3: Add Environment-Specific Redirect URL Debugging

**File**: `frontend/providers/AuthProvider.tsx`
**Change**: Add better logging for redirect URL debugging

```typescript
const getRedirectUrl = () => {
  const redirectUrl = Linking.createURL('auth/callback');
  
  // Log environment details for debugging
  const isExpoGo = __DEV__ && typeof window === 'undefined';
  const isWeb = typeof window !== 'undefined';
  const isStandalone = !__DEV__ && !isWeb;
  
  console.log("🔧 Environment Details:");
  console.log("  - Is Expo Go:", isExpoGo);
  console.log("  - Is Web:", isWeb);
  console.log("  - Is Standalone:", isStandalone);
  console.log("  - Redirect URL:", redirectUrl);
  
  return redirectUrl;
};
```

### Fix 4: Ensure Proper Flow Type Consistency

**File**: `frontend/lib/supabase.ts`
**Change**: Ensure flow type matches OAuth implementation

```typescript
export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: true,
    flowType: 'implicit' // Consistent with OAuth implementation
  }
});
```

## 🔧 Configuration Requirements

### Supabase Dashboard Settings:
1. **Site URL**: Set to your production domain or `http://localhost:8081` for dev
2. **Additional Redirect URLs**:
   ```
   http://localhost:8081/auth/callback
   exp://[YOUR_IP]:8081/--/auth/callback
   com.studystreak.app://auth/callback
   ```

### Google Cloud Console Settings:
1. **Authorized JavaScript origins**:
   - `http://localhost:8081` (development)
   - `https://your-production-domain.com` (production)
2. **Authorized redirect URIs**:
   - `https://rekngekjsdsdvgmsznva.supabase.co/auth/v1/callback`

## 🧪 Testing Checklist

After implementing fixes:

1. **Clear browser cache and restart Expo**
2. **Test in Expo Go** - should use proxy and avoid PKCE warnings
3. **Check console logs** for redirect URL verification
4. **Test with existing Google accounts** - should handle correctly
5. **Test standalone build** - should use direct OAuth flow

## 📱 Environment-Specific Behavior

- **Expo Go**: Uses proxy, handles PKCE warnings
- **Web**: Uses proxy, works with browser OAuth
- **Standalone**: Uses direct OAuth flow

These changes should resolve the white screen, OAuth timeout, and PKCE warning issues while maintaining compatibility with both Expo Go and standalone builds.