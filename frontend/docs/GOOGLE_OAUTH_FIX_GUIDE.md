# 🔧 Google OAuth Redirect Fix Guide

## 🎯 Root Cause Identified

Your Google OAuth redirect URL is configured to go to `localhost:8081` instead of your React Native app. This happens because:

1. **Supabase Default Redirect**: Supabase project has `localhost:8081` as the default redirect URL
2. **Google Cloud Console**: `localhost:8081` is likely configured as an authorized redirect URI
3. **Mismatch**: Your code generates `Linking.createURL('/')` but Supabase ignores it

## 🚨 Current Problem Flow

```
User clicks "Continue with Google" 
    ↓
Google OAuth Page
    ↓
User selects account
    ↓
Redirect to: http://localhost:8081/?code=xxx
    ↓
"Site cannot be reached" error
```

## ✅ Solutions (Choose One)

### Option 1: Fix Supabase Configuration (Recommended)

#### Steps:
1. **Go to Supabase Dashboard**
   - Visit: https://app.supabase.com/project/rekngekjsdsdvgmsznva/auth/settings

2. **Update Google OAuth Settings**
   - Go to Authentication → Providers → Google
   - Change redirect URL from `localhost:8081` to your Expo URL
   - For Expo Go: `exp://[your-ip]:8081/--/auth/callback`
   - For Expo Application: `yourapp://auth/callback`

#### For Development (Expo Go):
```
Redirect URL: exp://192.168.1.11:8081/--/auth/callback
```

#### For Production (Standalone App):
```
Redirect URL: yourapp://auth/callback
```

### Option 2: Update Google Cloud Console

1. **Go to Google Cloud Console**
   - Visit: https://console.cloud.google.com/apis/credentials

2. **Update OAuth 2.0 Client ID**
   - Add your Expo redirect URIs:
     - `exp://[your-ip]:8081/--/auth/callback` (for development)
     - `yourapp://auth/callback` (for production)

### Option 3: Universal Redirect Solution

If you want to handle redirects from any URL, update your `auth/callback.tsx`:

```typescript
import { useEffect } from 'react';
import { router, useRouter } from 'expo-router';
import * as Linking from 'expo-linking';
import { Platform } from 'react-native';
import { supabase } from '../../lib/supabase';

export default function AuthCallback() {
  const router = useRouter();

  useEffect(() => {
    const handleAuthCallback = async () => {
      try {
        // Handle both web and mobile redirects
        const url = Platform.OS === 'web' 
          ? window.location.href 
          : await Linking.getInitialURL();

        console.log('🔄 OAuth callback URL:', url);

        if (url) {
          const { data, error } = await supabase.auth.exchangeCodeForSession(url);
          
          if (error) {
            console.error('❌ OAuth error:', error);
            router.replace('/login');
            return;
          }

          if (data.session) {
            console.log('✅ OAuth success:', data.session.user?.email);
            router.replace('/home');
          }
        }
      } catch (error) {
        console.error('❌ Callback error:', error);
        router.replace('/login');
      }
    };

    // Handle both immediate and delayed URL loading
    const timer = setTimeout(handleAuthCallback, 1000);
    
    // Also listen for URL changes (for web)
    if (Platform.OS === 'web') {
      window.addEventListener('popstate', handleAuthCallback);
    }

    return () => {
      clearTimeout(timer);
      if (Platform.OS === 'web') {
        window.removeEventListener('popstate', handleAuthCallback);
      }
    };
  }, [router]);

  return null;
}
```

## 🔍 Debug Your Current Configuration

### Check Supabase Config:
1. Go to: https://app.supabase.com/project/rekngekjsdsdvgmsznva/auth/settings
2. Look at Google provider redirect URL
3. It should NOT be `localhost:8081`

### Check Google Cloud Console:
1. Go to: https://console.cloud.google.com/apis/credentials
2. Find your OAuth 2.0 Client ID
3. Authorized redirect URIs should include your Expo URLs

## 🧪 Testing the Fix

After making changes:

1. **Clear browser/app cache**
2. **Restart Expo development server**
3. **Test OAuth flow again**
4. **Check console logs** for redirect URL verification

## 📱 Expo-Specific Notes

### For Expo Go:
- Your IP address changes, so redirect URL needs to be updated
- Use: `exp://[current-ip]:8081/--/auth/callback`

### For Standalone App:
- Set a custom URL scheme: `yourapp://auth/callback`
- More stable for production

## 🆘 Quick Fix (Temporary)

If you need an immediate solution, modify your OAuth callback to handle the localhost redirect:

```typescript
// In auth/callback.tsx - Add this check
useEffect(() => {
  const handleCallback = async () => {
    // Check if we're on localhost
    const currentUrl = Platform.OS === 'web' 
      ? window.location.href 
      : await Linking.getInitialURL();

    if (currentUrl?.includes('localhost:8081')) {
      console.log('🔄 Detected localhost redirect, extracting code...');
      // Extract code from URL and handle it
      const urlObj = new URL(currentUrl);
      const code = urlObj.searchParams.get('code');
      
      if (code) {
        // Manually exchange the code
        const { data, error } = await supabase.auth.exchangeCodeForSession(currentUrl);
        // Handle success/error
      }
    }
  };
  
  handleCallback();
}, []);
```

## 🎯 Recommended Approach

**For Development:**
1. Fix Supabase Google provider redirect URL to your Expo IP
2. Update Google Cloud Console with same URL

**For Production:**
1. Configure custom URL scheme
2. Update both Supabase and Google Cloud Console with production URLs

This should resolve your `localhost:8081` redirect issue completely!