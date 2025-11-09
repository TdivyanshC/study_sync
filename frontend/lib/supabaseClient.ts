import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL || 'https://rekngekjsdsdvgmsznva.supabase.co';
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJla25nZWtqc2RzZHZnbXN6bnZhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjI2MTY4NTcsImV4cCI6MjA3ODE5Mjg1N30.YourAnonKeyHere';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);