-- Complete Friends System Schema with 6-digit User IDs - FIXED VERSION
-- Run this entire script in your Supabase SQL editor

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Check if users table exists, if not create it with user_id column
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'users') THEN
        -- Create users table with user_id column
        CREATE TABLE users (
            id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
            user_id VARCHAR(6) UNIQUE NOT NULL, -- 6-digit alphanumeric user ID
            username VARCHAR(255) UNIQUE NOT NULL,
            email VARCHAR(255) UNIQUE NOT NULL,
            password_hash VARCHAR(255) NOT NULL,
            xp INTEGER DEFAULT 0,
            level INTEGER DEFAULT 1,
            streak_count INTEGER DEFAULT 0,
            created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
            
            -- Onboarding completion tracking
            onboarding_completed BOOLEAN DEFAULT false NOT NULL,
            onboarding_completed_at TIMESTAMP WITH TIME ZONE,
            
            -- Personal information from onboarding step 1
            gender VARCHAR(50),
            age INTEGER,
            relationship_status VARCHAR(100),
            
            -- Session preferences from onboarding step 2
            preferred_sessions TEXT[], -- Array of session types user selected
            
            -- Additional profile data
            display_name VARCHAR(255),
            avatar_url VARCHAR(500),
            
            -- Profile update tracking
            profile_updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
            
            -- Friend activity tracking
            current_activity VARCHAR(100), -- e.g., 'gym_session', 'study_session', 'coding'
            activity_started_at TIMESTAMP WITH TIME ZONE,
            total_hours_today INTEGER DEFAULT 0
        );
    ELSE
        -- Add user_id column if it doesn't exist
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'users' AND column_name = 'user_id') THEN
            ALTER TABLE users ADD COLUMN user_id VARCHAR(6) UNIQUE;
        END IF;
        
        -- Add missing columns if they don't exist
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'users' AND column_name = 'onboarding_completed') THEN
            ALTER TABLE users ADD COLUMN onboarding_completed BOOLEAN DEFAULT false NOT NULL;
        END IF;
        
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'users' AND column_name = 'onboarding_completed_at') THEN
            ALTER TABLE users ADD COLUMN onboarding_completed_at TIMESTAMP WITH TIME ZONE;
        END IF;
        
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'users' AND column_name = 'gender') THEN
            ALTER TABLE users ADD COLUMN gender VARCHAR(50);
        END IF;
        
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'users' AND column_name = 'age') THEN
            ALTER TABLE users ADD COLUMN age INTEGER;
        END IF;
        
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'users' AND column_name = 'relationship_status') THEN
            ALTER TABLE users ADD COLUMN relationship_status VARCHAR(100);
        END IF;
        
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'users' AND column_name = 'preferred_sessions') THEN
            ALTER TABLE users ADD COLUMN preferred_sessions TEXT[];
        END IF;
        
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'users' AND column_name = 'display_name') THEN
            ALTER TABLE users ADD COLUMN display_name VARCHAR(255);
        END IF;
        
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'users' AND column_name = 'avatar_url') THEN
            ALTER TABLE users ADD COLUMN avatar_url VARCHAR(500);
        END IF;
        
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'users' AND column_name = 'profile_updated_at') THEN
            ALTER TABLE users ADD COLUMN profile_updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();
        END IF;
        
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'users' AND column_name = 'current_activity') THEN
            ALTER TABLE users ADD COLUMN current_activity VARCHAR(100);
        END IF;
        
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'users' AND column_name = 'activity_started_at') THEN
            ALTER TABLE users ADD COLUMN activity_started_at TIMESTAMP WITH TIME ZONE;
        END IF;
        
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'users' AND column_name = 'total_hours_today') THEN
            ALTER TABLE users ADD COLUMN total_hours_today INTEGER DEFAULT 0;
        END IF;
    END IF;
END $$;

-- Function to generate unique 6-digit alphanumeric user_id - FIXED SYNTAX
CREATE OR REPLACE FUNCTION generate_user_id()
RETURNS VARCHAR(6) AS $$
DECLARE
    chars TEXT := 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    result TEXT := '';
    i INTEGER;
    unique_check BOOLEAN := false;
    temp_id VARCHAR(6);
BEGIN
    WHILE NOT unique_check LOOP
        result := '';
        FOR i IN 1..6 LOOP
            result := result || substr(chars, floor(random() * length(chars) + 1)::integer, 1);
        END LOOP;
        
        -- Check if this user_id already exists
        SELECT EXISTS(SELECT 1 FROM users WHERE user_id = result) INTO unique_check;
        
        IF NOT unique_check THEN
            temp_id := result;
        END IF;
    END LOOP;
    
    RETURN temp_id;
END;
$$ LANGUAGE plpgsql;

-- Trigger to automatically generate user_id for new users - FIXED SYNTAX
CREATE OR REPLACE FUNCTION set_user_id()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.user_id IS NULL OR NEW.user_id = '' THEN
        NEW.user_id := generate_user_id();
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger if it doesn't exist
DROP TRIGGER IF EXISTS trigger_set_user_id ON users;
CREATE TRIGGER trigger_set_user_id
    BEFORE INSERT ON users
    FOR EACH ROW
    EXECUTE FUNCTION set_user_id();

-- Friends table for friend relationships
CREATE TABLE IF NOT EXISTS friends (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    friend_user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'blocked', 'pending')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(user_id, friend_user_id)
);

-- Friends indexes for performance
CREATE INDEX IF NOT EXISTS idx_friends_user_id ON friends(user_id);
CREATE INDEX IF NOT EXISTS idx_friends_friend_user_id ON friends(friend_user_id);
CREATE INDEX IF NOT EXISTS idx_friends_status ON friends(status);
CREATE INDEX IF NOT EXISTS idx_users_user_id ON users(user_id);

-- Enable Row Level Security
ALTER TABLE friends ENABLE ROW LEVEL SECURITY;

-- Basic RLS policy (allows all operations for now - adjust based on your auth system)
DROP POLICY IF EXISTS "Allow all operations on friends" ON friends;
CREATE POLICY "Allow all operations on friends" ON friends FOR ALL USING (true);

-- Enable RLS on users table
ALTER TABLE users ENABLE ROW LEVEL SECURITY;

-- Basic RLS policy for users
DROP POLICY IF EXISTS "Allow all operations on users" ON users;
CREATE POLICY "Allow all operations on users" ON users FOR ALL USING (true);

-- Generate user_id for existing users who don't have one
UPDATE users SET user_id = generate_user_id() WHERE user_id IS NULL OR user_id = '';

-- Add some default badges if they don't exist
INSERT INTO badges (title, description, requirement_type, requirement_value) 
SELECT 'First Steps', 'Complete your first study session', 'sessions_count', 1
WHERE NOT EXISTS (SELECT 1 FROM badges WHERE title = 'First Steps');

INSERT INTO badges (title, description, requirement_type, requirement_value) 
SELECT 'Week Warrior', 'Maintain a 7-day study streak', 'streak_days', 7
WHERE NOT EXISTS (SELECT 1 FROM badges WHERE title = 'Week Warrior');

INSERT INTO badges (title, description, requirement_type, requirement_value) 
SELECT 'Hour Hero', 'Study for 10 hours in a single day', 'daily_hours', 10
WHERE NOT EXISTS (SELECT 1 FROM badges WHERE title = 'Hour Hero');

INSERT INTO badges (title, description, requirement_type, requirement_value) 
SELECT 'Level Up', 'Reach level 5', 'level', 5
WHERE NOT EXISTS (SELECT 1 FROM badges WHERE title = 'Level Up');

INSERT INTO badges (title, description, requirement_type, requirement_value) 
SELECT 'Social Butterfly', 'Join 5 study spaces', 'spaces_joined', 5
WHERE NOT EXISTS (SELECT 1 FROM badges WHERE title = 'Social Butterfly');

-- Create additional tables if they don't exist (for gamification)
CREATE TABLE IF NOT EXISTS study_sessions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    duration_minutes INTEGER NOT NULL,
    efficiency DECIMAL(5,2),
    confirmations_received INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS xp_history (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    amount INTEGER NOT NULL,
    source VARCHAR(50) NOT NULL,
    meta JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_study_sessions_user_id ON study_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_xp_history_user_id ON xp_history(user_id);
CREATE INDEX IF NOT EXISTS idx_users_username ON users(username);
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);

-- Enable RLS on additional tables
ALTER TABLE study_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE xp_history ENABLE ROW LEVEL SECURITY;

-- RLS policies for additional tables
DROP POLICY IF EXISTS "Allow all operations on study_sessions" ON study_sessions;
CREATE POLICY "Allow all operations on study_sessions" ON study_sessions FOR ALL USING (true);

DROP POLICY IF EXISTS "Allow all operations on xp_history" ON xp_history;
CREATE POLICY "Allow all operations on xp_history" ON xp_history FOR ALL USING (true);

-- Success message
SELECT 'Friends system with 6-digit user IDs has been successfully set up!' as status;