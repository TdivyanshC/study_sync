-- Supabase Database Schema for StudySync

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Users table
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    username VARCHAR(255) UNIQUE NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    xp INTEGER DEFAULT 0,
    level INTEGER DEFAULT 1,
    streak_count INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
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

-- Space members junction table
CREATE TABLE space_members (
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

-- Indexes for performance
CREATE INDEX idx_study_sessions_user_id ON study_sessions(user_id);
CREATE INDEX idx_study_sessions_created_at ON study_sessions(created_at);
CREATE INDEX idx_space_members_space_id ON space_members(space_id);
CREATE INDEX idx_space_members_user_id ON space_members(user_id);
CREATE INDEX idx_space_activity_space_id ON space_activity(space_id);
CREATE INDEX idx_space_chat_space_id ON space_chat(space_id);
CREATE INDEX idx_user_badges_user_id ON user_badges(user_id);

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
ALTER TABLE space_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_badges ENABLE ROW LEVEL SECURITY;
ALTER TABLE space_activity ENABLE ROW LEVEL SECURITY;
ALTER TABLE space_chat ENABLE ROW LEVEL SECURITY;

-- Basic RLS policies (adjust as needed for your auth system)
-- For now, allowing all operations (you'll want to restrict based on user auth)
CREATE POLICY "Allow all operations on users" ON users FOR ALL USING (true);
CREATE POLICY "Allow all operations on study_sessions" ON study_sessions FOR ALL USING (true);
CREATE POLICY "Allow all operations on spaces" ON spaces FOR ALL USING (true);
CREATE POLICY "Allow all operations on space_members" ON space_members FOR ALL USING (true);
CREATE POLICY "Allow all operations on user_badges" ON user_badges FOR ALL USING (true);
CREATE POLICY "Allow all operations on space_activity" ON space_activity FOR ALL USING (true);
CREATE POLICY "Allow all operations on space_chat" ON space_chat FOR ALL USING (true);