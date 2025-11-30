#!/usr/bin/env node

/**
 * OAuth Configuration Test Script
 * Tests if all required environment variables are properly configured
 */

console.log('🔍 Testing OAuth Configuration...\n');

// Test 1: Check Google Web Client ID
const googleClientId = process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID;
console.log('1. Google Web Client ID:');
if (!googleClientId || googleClientId === 'your_google_web_client_id_here') {
  console.log('   ❌ MISSING or PLACEHOLDER');
  console.log('   🔧 ACTION REQUIRED: Configure Google Web Client ID in .env file');
  console.log('   📖 See: frontend/docs/OAUTH_CALLBACK_FIX_APPLIED.md');
} else {
  console.log('   ✅ CONFIGURED:', googleClientId.substring(0, 20) + '...');
}

// Test 2: Check Supabase URL
const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
console.log('\n2. Supabase URL:');
if (!supabaseUrl) {
  console.log('   ❌ MISSING');
} else {
  console.log('   ✅ CONFIGURED:', supabaseUrl);
}

// Test 3: Check Supabase Anon Key
const supabaseKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;
console.log('\n3. Supabase Anon Key:');
if (!supabaseKey) {
  console.log('   ❌ MISSING');
} else {
  console.log('   ✅ CONFIGURED:', supabaseKey.substring(0, 20) + '...');
}

// Test 4: Check Expo Proxy URL
const expoProxyUrl = 'https://auth.expo.io/@tdivyanshc/study-sync';
console.log('\n4. Expo Proxy URL:');
console.log('   ✅ CONFIGURED:', expoProxyUrl);

// Overall Status
console.log('\n' + '='.repeat(50));
if (!googleClientId || googleClientId === 'your_google_web_client_id_here') {
  console.log('🚨 STATUS: OAuth NOT READY');
  console.log('🔧 REQUIRED: Configure Google Web Client ID');
  console.log('\n📖 Next Steps:');
  console.log('1. Go to Google Cloud Console');
  console.log('2. Create OAuth 2.0 Web Application');
  console.log('3. Add redirect URI: https://rekngekjsdsdvgmsznva.supabase.co/auth/v1/callback');
  console.log('4. Copy Client ID to .env file');
  console.log('5. Run this test again');
} else {
  console.log('✅ STATUS: OAuth READY FOR TESTING');
  console.log('🎉 You can now test Google login in your Expo app!');
}

console.log('\n🧪 To test:');
console.log('cd frontend && npm start');
console.log('Then open Expo Go and tap "Continue with Google"');
console.log('='.repeat(50));