-- Supabase Database Schema for StudySync

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Users table
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

-- Study sessions table
CREATE TABLE study_sessions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    space_id UUID REFERENCES spaces(id) ON DELETE CASCADE,
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    duration_minutes INTEGER NOT NULL,
    efficiency DECIMAL(5,2),
    confirmations_received INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Spaces table
CREATE TABLE spaces (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    created_by UUID REFERENCES users(id) ON DELETE CASCADE,
    visibility VARCHAR(50) DEFAULT 'public' CHECK (visibility IN ('public', 'private')),
    member_count INTEGER DEFAULT 1,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Space memberships junction table
CREATE TABLE space_memberships (
    space_id UUID REFERENCES spaces(id) ON DELETE CASCADE,
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    joined_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    PRIMARY KEY (space_id, user_id)
);

-- Badges table
CREATE TABLE badges (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    title VARCHAR(255) NOT NULL,
    description TEXT,
    icon_url VARCHAR(500),
    requirement_type VARCHAR(100) NOT NULL,
    requirement_value INTEGER NOT NULL
);

-- User badges junction table
CREATE TABLE user_badges (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    badge_id UUID REFERENCES badges(id) ON DELETE CASCADE,
    achieved_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(user_id, badge_id)
);

-- Space activity table (for real-time updates)
CREATE TABLE space_activity (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    space_id UUID REFERENCES spaces(id) ON DELETE CASCADE,
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    action VARCHAR(255) NOT NULL,
    progress INTEGER,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Space chat table
CREATE TABLE space_chat (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    space_id UUID REFERENCES spaces(id) ON DELETE CASCADE,
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    message TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Status checks table (for health monitoring)
CREATE TABLE status_checks (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    client_name VARCHAR(255) NOT NULL,
    timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Friends table for friend relationships
CREATE TABLE friends (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    friend_user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'blocked', 'pending')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(user_id, friend_user_id)
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_study_sessions_user_id ON study_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_study_sessions_created_at ON study_sessions(created_at);
CREATE INDEX IF NOT EXISTS idx_space_memberships_space_id ON space_memberships(space_id);
CREATE INDEX IF NOT EXISTS idx_space_memberships_user_id ON space_memberships(user_id);
CREATE INDEX IF NOT EXISTS idx_space_activity_space_id ON space_activity(space_id);
CREATE INDEX IF NOT EXISTS idx_space_activity_created_at ON space_activity(created_at);
CREATE INDEX IF NOT EXISTS idx_space_chat_space_id ON space_chat(space_id);
CREATE INDEX IF NOT EXISTS idx_space_chat_created_at ON space_chat(created_at);
CREATE INDEX IF NOT EXISTS idx_user_badges_user_id ON user_badges(user_id);
CREATE INDEX IF NOT EXISTS idx_spaces_created_by ON spaces(created_by);

-- Friends indexes
CREATE INDEX IF NOT EXISTS idx_friends_user_id ON friends(user_id);
CREATE INDEX IF NOT EXISTS idx_friends_friend_user_id ON friends(friend_user_id);
CREATE INDEX IF NOT EXISTS idx_friends_status ON friends(status);
CREATE INDEX IF NOT EXISTS idx_users_user_id ON users(user_id);

-- Onboarding and profile indexes
CREATE INDEX IF NOT EXISTS idx_users_onboarding_completed ON users(onboarding_completed);
CREATE INDEX IF NOT EXISTS idx_users_preferred_sessions ON users USING GIN(preferred_sessions);
CREATE INDEX IF NOT EXISTS idx_users_profile_updated_at ON users(profile_updated_at);

-- Insert default badges
INSERT INTO badges (title, description, requirement_type, requirement_value) VALUES
('First Steps', 'Complete your first study session', 'sessions_count', 1),
('Week Warrior', 'Maintain a 7-day study streak', 'streak_days', 7),
('Hour Hero', 'Study for 10 hours in a single day', 'daily_hours', 10),
('Level Up', 'Reach level 5', 'level', 5),
('Social Butterfly', 'Join 5 study spaces', 'spaces_joined', 5);

-- Row Level Security (RLS) policies
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE study_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE spaces ENABLE ROW LEVEL SECURITY;
ALTER TABLE space_memberships ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_badges ENABLE ROW LEVEL SECURITY;
ALTER TABLE space_activity ENABLE ROW LEVEL SECURITY;
ALTER TABLE space_chat ENABLE ROW LEVEL SECURITY;
ALTER TABLE friends ENABLE ROW LEVEL SECURITY;

-- Basic RLS policies (adjust as needed for your auth system)
-- For now, allowing all operations (you'll want to restrict based on user auth)
CREATE POLICY "Allow all operations on users" ON users FOR ALL USING (true);
CREATE POLICY "Allow all operations on study_sessions" ON study_sessions FOR ALL USING (true);
CREATE POLICY "Allow all operations on spaces" ON spaces FOR ALL USING (true);
CREATE POLICY "Allow all operations on space_memberships" ON space_memberships FOR ALL USING (true);
CREATE POLICY "Allow all operations on user_badges" ON user_badges FOR ALL USING (true);
CREATE POLICY "Allow all operations on space_activity" ON space_activity FOR ALL USING (true);
CREATE POLICY "Allow all operations on space_chat" ON space_chat FOR ALL USING (true);
CREATE POLICY "Allow all operations on friends" ON friends FOR ALL USING (true);



-- ================ GAMIFIED STUDY SYSTEM TABLES ================

-- XP History Table
CREATE TABLE IF NOT EXISTS xp_history (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  amount INTEGER NOT NULL,
  source VARCHAR(50) NOT NULL,  -- 'session', 'streak', 'daily_bonus', etc.
  meta JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Session Audit Table
CREATE TABLE IF NOT EXISTS session_audit (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  session_id UUID REFERENCES study_sessions(id) ON DELETE CASCADE,
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  suspicion_score INTEGER DEFAULT 0,
  reasons TEXT[] DEFAULT ARRAY[]::text[],
  events JSONB DEFAULT '{}'::jsonb,
  is_flagged BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Session Events Table
CREATE TABLE IF NOT EXISTS session_events (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  session_id UUID REFERENCES study_sessions(id) ON DELETE CASCADE,
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  event_type VARCHAR(50) NOT NULL,  -- 'heartbeat', 'pause', 'resume', 'end'
  event_payload JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Daily User Metrics Table
CREATE TABLE IF NOT EXISTS daily_user_metrics (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  total_minutes INTEGER DEFAULT 0,
  xp_earned INTEGER DEFAULT 0,
  streak_active BOOLEAN DEFAULT FALSE,
  space_breakdown JSONB DEFAULT '{}'::jsonb,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, date)
);

-- Indexes for gamification tables
CREATE INDEX IF NOT EXISTS idx_xp_history_user_id ON xp_history(user_id);
CREATE INDEX IF NOT EXISTS idx_xp_history_created_at ON xp_history(created_at);

CREATE INDEX IF NOT EXISTS idx_session_events_session_id ON session_events(session_id);
CREATE INDEX IF NOT EXISTS idx_session_events_user_id ON session_events(user_id);
CREATE INDEX IF NOT EXISTS idx_session_events_created_at ON session_events(created_at);

CREATE INDEX IF NOT EXISTS idx_session_audit_session_id ON session_audit(session_id);
CREATE INDEX IF NOT EXISTS idx_session_audit_user_id ON session_audit(user_id);
CREATE INDEX IF NOT EXISTS idx_session_audit_created_at ON session_audit(created_at);

CREATE INDEX IF NOT EXISTS idx_daily_metrics_user_id ON daily_user_metrics(user_id);
CREATE INDEX IF NOT EXISTS idx_daily_metrics_date ON daily_user_metrics(date);

-- RLS for gamification tables
ALTER TABLE xp_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE session_audit ENABLE ROW LEVEL SECURITY;
ALTER TABLE session_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE daily_user_metrics ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow all on xp_history" ON xp_history FOR ALL USING (true);
CREATE POLICY "Allow all on session_audit" ON session_audit FOR ALL USING (true);
CREATE POLICY "Allow all on session_events" ON session_events FOR ALL USING (true);
CREATE POLICY "Allow all on daily_user_metrics" ON daily_user_metrics FOR ALL USING (true);

-- Function to generate unique 6-digit alphanumeric user_id
CREATE OR REPLACE FUNCTION generate_user_id()
RETURNS VARCHAR(6) AS $
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
$ LANGUAGE plpgsql;

-- Trigger to automatically generate user_id for new users
CREATE OR REPLACE FUNCTION set_user_id()
RETURNS TRIGGER AS $
BEGIN
    IF NEW.user_id IS NULL OR NEW.user_id = '' THEN
        NEW.user_id := generate_user_id();
    END IF;
    RETURN NEW;
END;
$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_set_user_id
    BEFORE INSERT ON users
    FOR EACH ROW
    EXECUTE FUNCTION set_user_id();