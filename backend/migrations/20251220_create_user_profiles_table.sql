-- Create user_profiles table for storing onboarding and profile data
-- This table is separate from the main users table to keep auth data clean

CREATE TABLE IF NOT EXISTS user_profiles (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE UNIQUE NOT NULL,
    email VARCHAR(255) NOT NULL,
    username VARCHAR(255),
    
    -- Onboarding data
    onboarding_completed BOOLEAN DEFAULT false NOT NULL,
    onboarding_completed_at TIMESTAMP WITH TIME ZONE,
    
    -- Personal information (from onboarding step 1)
    gender VARCHAR(50),
    age INTEGER,
    relationship_status VARCHAR(100),
    
    -- Session preferences (from onboarding step 2)
    preferred_sessions TEXT[], -- Array of session types user selected
    
    -- Additional profile data
    avatar_url VARCHAR(500),
    display_name VARCHAR(255),
    
    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_user_profiles_user_id ON user_profiles(user_id);
CREATE INDEX IF NOT EXISTS idx_user_profiles_onboarding_completed ON user_profiles(onboarding_completed);
CREATE INDEX IF NOT EXISTS idx_user_profiles_email ON user_profiles(email);

-- Enable RLS
ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;

-- RLS policy for user_profiles
CREATE POLICY "Users can view own profile" ON user_profiles
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own profile" ON user_profiles
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own profile" ON user_profiles
    FOR UPDATE USING (auth.uid() = user_id);

-- Add helpful comments
COMMENT ON TABLE user_profiles IS 'Extended user profile information including onboarding data and preferences';
COMMENT ON COLUMN user_profiles.user_id IS 'Reference to users table - one-to-one relationship';
COMMENT ON COLUMN user_profiles.onboarding_completed IS 'Tracks whether the user has completed the onboarding process';
COMMENT ON COLUMN user_profiles.onboarding_completed_at IS 'Timestamp when onboarding was completed';
COMMENT ON COLUMN user_profiles.preferred_sessions IS 'Array of session types the user selected during onboarding';