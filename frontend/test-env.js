#!/usr/bin/env node

/**
 * Advanced Environment Variable Diagnostic Tool
 * This script reads .env files directly to debug configuration issues
 */

const fs = require('fs');
const path = require('path');

console.log('🔍 Advanced Environment Variable Diagnostic\n');

// Function to parse .env file manually
function parseEnvFile(filePath) {
  try {
    const content = fs.readFileSync(filePath, 'utf8');
    const lines = content.split('\n');
    const env = {};
    
    lines.forEach(line => {
      line = line.trim();
      if (line && !line.startsWith('#') && line.includes('=')) {
        const [key, ...valueParts] = line.split('=');
        env[key.trim()] = valueParts.join('=').trim();
      }
    });
    
    return env;
  } catch (error) {
    console.log(`❌ Error reading ${filePath}: ${error.message}`);
    return null;
  }
}

// Test 1: Check .env file directly
console.log('1. 📁 Checking .env file directly:');
const envPath = path.join(__dirname, '.env');
const envVars = parseEnvFile(envPath);

if (envVars) {
  console.log('   ✅ .env file found and parsed');
  const googleClientId = envVars.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID;
  console.log(`   📋 Google Client ID from file: "${googleClientId}"`);
  
  if (!googleClientId || googleClientId === 'your_google_web_client_id_here' || googleClientId === 'placeholder_will_be_updated_by_user') {
    console.log('   ❌ Still showing placeholder value');
    console.log('   🔧 ACTION: Please update the .env file with your actual Google Client ID');
  } else {
    console.log('   ✅ Google Client ID appears to be configured');
  }
} else {
  console.log('   ❌ Could not parse .env file');
}

// Test 2: Check process.env
console.log('\n2. 🔄 Checking process.env:');
const processClientId = process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID;
console.log(`   📋 process.env Google Client ID: "${processClientId || 'undefined'}"`);

// Test 3: Check other important env vars
console.log('\n3. 🔗 Other Environment Variables:');
const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

console.log(`   📋 Supabase URL: "${supabaseUrl || 'undefined'}"`);
console.log(`   📋 Supabase Key: "${supabaseKey ? supabaseKey.substring(0, 20) + '...' : 'undefined'}"`);

// Test 4: Check for multiple .env files
console.log('\n4. 📂 Checking for other .env files:');
const envFiles = ['.env', '.env.local', '.env.development', '.env.production'];
envFiles.forEach(file => {
  const filePath = path.join(__dirname, file);
  if (fs.existsSync(filePath)) {
    console.log(`   ✅ Found: ${file}`);
  }
});

// Overall assessment
console.log('\n' + '='.repeat(60));
if (envVars && envVars.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID && 
    envVars.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID !== 'your_google_web_client_id_here' &&
    envVars.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID !== 'placeholder_will_be_updated_by_user') {
  console.log('✅ STATUS: Environment Configuration Appears Correct');
  console.log('🎉 Google OAuth should work! Try running: npm start');
} else {
  console.log('🚨 STATUS: Environment Configuration Issue Detected');
  console.log('🔧 NEXT STEPS:');
  console.log('1. Make sure you saved the .env file after editing');
  console.log('2. Restart your development server after updating .env');
  console.log('3. Ensure the format is exactly: EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID=your_actual_client_id');
}

console.log('\n💡 If you\'ve updated the .env file, restart the development server with:');
console.log('npm start');
console.log('='.repeat(60));