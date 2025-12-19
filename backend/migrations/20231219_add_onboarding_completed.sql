-- Add onboarding_completed column to user_profiles table
-- This migration adds tracking for whether users have completed the onboarding process

ALTER TABLE user_profiles 
ADD COLUMN onboarding_completed boolean DEFAULT false NOT NULL;

-- Create index for faster lookups
CREATE INDEX idx_user_profiles_onboarding_completed ON user_profiles(onboarding_completed);

-- Add comment for documentation
COMMENT ON COLUMN user_profiles.onboarding_completed IS 'Tracks whether the user has completed the onboarding process';