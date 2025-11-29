/**
 * MINIMAL AUTHENTICATION EXAMPLE USING useAuth HOOK
 * 
 * This file shows the clean, minimal implementation of Google OAuth using Supabase Flow A
 * No complex configurations, no manual URL handling, no PKCE setup needed!
 * All authentication is handled through the useAuth hook in AuthProvider.tsx
 */

// ================================================
// 1. CLEAN USE AUTH HOOK USAGE
// ================================================

// Basic Google login (Flow A) - use inside React component
function ExampleGoogleLoginComponent() {
  // Note: This function shows how to use the useAuth hook
  // Import and use it inside your React component:
  // const { loginWithGoogle, loading } = useAuth();
  
  // const handleGoogleLogin = async () => {
  //   try {
  //     await loginWithGoogle();
  //     // That's it! OAuth Flow A handles everything automatically
  //     // No manual redirect handling needed
  //   } catch (error) {
  //     console.error('Login failed:', error);
  //   }
  // };
  
  console.log('Use this pattern in your React components');
}

// Email/password login
async function exampleEmailLogin() {
  // Note: For email login, you would use the auth service directly
  // since it's not exposed through the useAuth hook
  // const { user, session } = await AuthService.loginWithEmail('user@example.com', 'password');
  console.log('Email login handled through AuthProvider');
}

// Check authentication status - using the hook
function exampleCheckAuth() {
  const { user, session } = useAuth();
  if (user) {
    console.log('Current user:', user.email);
  }
}

// Clean logout - using the hook
function exampleLogout() {
  const { logout } = useAuth();
  return logout(); // Returns a Promise
}

// ================================================
// 2. SIMPLE NAVIGATION SETUP
// ================================================

// Clean navigation that works with OAuth Flow A
// Navigation is handled automatically by AuthProvider.tsx
// No additional setup needed!

// ================================================
// 3. MINIMAL LOGIN SCREEN
// ================================================

import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, Alert } from 'react-native';
import { useAuth } from '../providers/AuthProvider';

export function MinimalLoginScreen() {
  const { loginWithGoogle, loading } = useAuth();

  const handleGoogleLogin = async () => {
    try {
      await loginWithGoogle();
      // OAuth Flow A handles the redirect automatically
      // User will be redirected back to the app and then to home
    } catch (error: any) {
      Alert.alert('Login Failed', error.message);
    }
  };

  return (
    <View style={{ padding: 20 }}>
      <Text style={{ fontSize: 24, marginBottom: 20 }}>Welcome Back</Text>
      
      {/* Clean Google Login Button */}
      <TouchableOpacity 
        onPress={handleGoogleLogin}
        disabled={loading}
        style={{
          backgroundColor: '#4285f4',
          padding: 15,
          borderRadius: 8,
          marginBottom: 20
        }}
      >
        <Text style={{ color: 'white', textAlign: 'center' }}>
          {loading ? 'Signing in...' : 'Continue with Google'}
        </Text>
      </TouchableOpacity>
    </View>
  );
}

// ================================================
// 4. CONFIGURATION SUMMARY
// ================================================

/**
 * FLOW A OAUTH CONFIGURATION SUMMARY
 * 
 * ✅ COMPLETE - No additional setup needed!
 * 
 * What works out of the box:
 * - Expo Go development
 * - Dev Client builds
 * - Production builds
 * - iOS and Android
 * - Automatic session management
 * - Automatic token refresh
 * 
 * Expected redirect URLs (automatically handled):
 * - exp://127.0.0.1:8081
 * - exp://192.168.x.x:8081
 * - https://auth.expo.io/@tdivyanshc/study-sync
 * 
 * Supabase configuration:
 * - Site URL: https://rekngekjsdsdvgmsznva.supabase.co/auth/v1/callback
 * - Web Client ID: Configured in Supabase Google provider
 * - Client Secret: Configured in Supabase Google provider
 * 
 * No Android client IDs needed!
 * No SHA-1 fingerprints needed!
 * No local dev URLs to configure!
 * 
 * All authentication is handled through AuthProvider.tsx and the useAuth hook
 */

export default {
  ExampleGoogleLoginComponent,
  exampleEmailLogin,
  exampleCheckAuth,
  exampleLogout,
  MinimalLoginScreen,
};