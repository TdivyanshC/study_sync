-- Add onboarding columns to existing users table
-- Run this in Supabase SQL Editor

-- Add missing columns if they don't exist
ALTER TABLE users ADD COLUMN IF NOT EXISTS gender TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS age INTEGER;
ALTER TABLE users ADD COLUMN IF NOT EXISTS relationship_status TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS preferred_sessions JSONB DEFAULT '[]'::jsonb;
ALTER TABLE users ADD COLUMN IF NOT EXISTS onboarding_completed BOOLEAN DEFAULT FALSE;
ALTER TABLE users ADD COLUMN IF NOT EXISTS onboarding_completed_at TIMESTAMP WITH TIME ZONE;
ALTER TABLE users ADD COLUMN IF NOT EXISTS display_name TEXT;

-- Create index for faster onboarding lookups
CREATE INDEX IF NOT EXISTS idx_users_onboarding_status ON users(onboarding_completed) WHERE onboarding_completed = FALSE;

-- Verify columns were added
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'users' 
ORDER BY ordinal_position;
