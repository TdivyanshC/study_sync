import { createClient } from '@supabase/supabase-js';

// Environment detection for production vs development
const isProduction = process.env.NODE_ENV === 'production' ||
                     process.env.EXPO_PUBLIC_NODE_ENV === 'production' ||
                     __DEV__ === false;

const supabaseUrl = isProduction
  ? process.env.EXPO_PUBLIC_SUPABASE_URL_PROD || 'https://prod-project-id.supabase.co'
  : process.env.EXPO_PUBLIC_SUPABASE_URL || 'https://rekngekjsdsdvgmsznva.supabase.co';

const supabaseAnonKey = isProduction
  ? process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY_PROD || 'prod-anon-key-placeholder'
  : process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJla25nZWtqc2RzZHZnbXN6bnZhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjI2MTY4NTcsImV4cCI6MjA3ODE5Mjg1N30.KILcOHkkDN_QTgMqD9VSzCihQjrOrdCU4ISDpGQ8Ddg';

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables');
}

console.log(`Initializing Supabase client for ${isProduction ? 'PRODUCTION' : 'DEVELOPMENT'} environment`);

// Create and export the Supabase client (Singleton pattern)
// Enhanced Flow A configuration with PKCE for better mobile compatibility
export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    autoRefreshToken: true,  // Automatically refresh access tokens
    persistSession: true,    // Persist session to AsyncStorage automatically
    detectSessionInUrl: true, // Detect OAuth callback URLs
    flowType: 'pkce',  // Explicitly use PKCE flow for mobile apps
  }
});

console.log("✅ Using singleton Supabase client with Flow A OAuth");

// Export types for better TypeScript support
export type { User, Session } from '@supabase/supabase-js';