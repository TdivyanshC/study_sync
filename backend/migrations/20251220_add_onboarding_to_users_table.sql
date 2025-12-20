-- Add onboarding fields to existing users table
-- This keeps everything in one table for simplicity

-- Add onboarding completion tracking
ALTER TABLE users 
ADD COLUMN onboarding_completed BOOLEAN DEFAULT false NOT NULL;

-- Add onboarding completion timestamp
ALTER TABLE users 
ADD COLUMN onboarding_completed_at TIMESTAMP WITH TIME ZONE;

-- Add personal information from onboarding step 1
ALTER TABLE users 
ADD COLUMN gender VARCHAR(50);

ALTER TABLE users 
ADD COLUMN age INTEGER;

ALTER TABLE users 
ADD COLUMN relationship_status VARCHAR(100);

-- Add session preferences from onboarding step 2
ALTER TABLE users 
ADD COLUMN preferred_sessions TEXT[]; -- Array of session types user selected

-- Add additional profile fields
ALTER TABLE users 
ADD COLUMN display_name VARCHAR(255);

ALTER TABLE users 
ADD COLUMN avatar_url VARCHAR(500);

-- Update updated_at timestamp to track profile changes
ALTER TABLE users 
ADD COLUMN profile_updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_users_onboarding_completed ON users(onboarding_completed);
CREATE INDEX IF NOT EXISTS idx_users_preferred_sessions ON users USING GIN(preferred_sessions);

-- Update the users table comment
COMMENT ON TABLE users IS 'User accounts with embedded onboarding and profile data';
COMMENT ON COLUMN users.onboarding_completed IS 'Tracks whether the user has completed the onboarding process';
COMMENT ON COLUMN users.onboarding_completed_at IS 'Timestamp when onboarding was completed';
COMMENT ON COLUMN users.preferred_sessions IS 'Array of session types the user selected during onboarding';
COMMENT ON COLUMN users.profile_updated_at IS 'Last time the user profile was updated';