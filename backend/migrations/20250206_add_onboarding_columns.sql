-- Migration: Add onboarding columns to users table
-- Run this in Supabase SQL Editor to fix the missing onboarding_completed column

-- Add onboarding_completed column
ALTER TABLE users ADD COLUMN IF NOT EXISTS onboarding_completed BOOLEAN DEFAULT FALSE;

-- Add other onboarding fields mentioned in the documentation
ALTER TABLE users ADD COLUMN IF NOT EXISTS gender TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS age INTEGER;
ALTER TABLE users ADD COLUMN IF NOT EXISTS relationship_status TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS preferred_sessions JSONB;
ALTER TABLE users ADD COLUMN IF NOT EXISTS display_name TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS onboarding_completed_at TIMESTAMP WITH TIME ZONE;

-- Create index for faster lookups on onboarding status
CREATE INDEX IF NOT EXISTS idx_users_onboarding_status ON users(onboarding_completed) WHERE onboarding_completed = FALSE;

-- Verify the columns were added
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'users' AND column_name = 'onboarding_completed') THEN
        RAISE NOTICE '✅ onboarding_completed column added successfully';
    ELSE
        RAISE EXCEPTION '❌ onboarding_completed column not found';
    END IF;
END $$;

-- Also add missing updated_at column if not exists
ALTER TABLE users ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();
