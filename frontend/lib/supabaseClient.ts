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
  : process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJla25nZWtqc2RzZHZnbXN6bnZhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjI2MTY4NTcsImV4cCI6MjA3ODE5Mjg1N30.YourAnonKeyHere';

console.log(`Initializing Supabase client for ${isProduction ? 'PRODUCTION' : 'DEVELOPMENT'} environment`);

export const supabase = createClient(supabaseUrl, supabaseAnonKey);