-- Migration: Add onboarding data columns for step1 and step2 data
-- Run this in Supabase SQL Editor to fix the missing onboarding_step1_data and onboarding_step2_data columns

-- Add onboarding_step1_data column (JSONB for flexible data storage)
ALTER TABLE users ADD COLUMN IF NOT EXISTS onboarding_step1_data JSONB DEFAULT '{}'::jsonb;

-- Add onboarding_step2_data column (JSONB for flexible data storage)
ALTER TABLE users ADD COLUMN IF NOT EXISTS onboarding_step2_data JSONB DEFAULT '{}'::jsonb;

-- Create index for faster lookups on onboarding status
DROP INDEX IF EXISTS idx_users_onboarding_status;
CREATE INDEX IF NOT EXISTS idx_users_onboarding_status ON users(onboarding_completed) WHERE onboarding_completed = FALSE;

-- Verify the columns were added
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'users' AND column_name = 'onboarding_step1_data') THEN
        RAISE NOTICE '✅ onboarding_step1_data column added successfully';
    ELSE
        RAISE EXCEPTION '❌ onboarding_step1_data column not found';
    END IF;
    
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'users' AND column_name = 'onboarding_step2_data') THEN
        RAISE NOTICE '✅ onboarding_step2_data column added successfully';
    ELSE
        RAISE EXCEPTION '❌ onboarding_step2_data column not found';
    END IF;
END $$;
