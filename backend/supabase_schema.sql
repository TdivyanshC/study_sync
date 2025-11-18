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

-- Indexes for performance
CREATE INDEX idx_study_sessions_user_id ON study_sessions(user_id);
CREATE INDEX idx_study_sessions_created_at ON study_sessions(created_at);
CREATE INDEX idx_space_memberships_space_id ON space_memberships(space_id);
CREATE INDEX idx_space_memberships_user_id ON space_memberships(user_id);
CREATE INDEX idx_space_activity_space_id ON space_activity(space_id);
CREATE INDEX idx_space_activity_created_at ON space_activity(created_at);
CREATE INDEX idx_space_chat_space_id ON space_chat(space_id);
CREATE INDEX idx_space_chat_created_at ON space_chat(created_at);
CREATE INDEX idx_user_badges_user_id ON user_badges(user_id);
CREATE INDEX idx_spaces_created_by ON spaces(created_by);

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

-- Basic RLS policies (adjust as needed for your auth system)
-- For now, allowing all operations (you'll want to restrict based on user auth)
CREATE POLICY "Allow all operations on users" ON users FOR ALL USING (true);
CREATE POLICY "Allow all operations on study_sessions" ON study_sessions FOR ALL USING (true);
CREATE POLICY "Allow all operations on spaces" ON spaces FOR ALL USING (true);
CREATE POLICY "Allow all operations on space_memberships" ON space_memberships FOR ALL USING (true);
CREATE POLICY "Allow all operations on user_badges" ON user_badges FOR ALL USING (true);
CREATE POLICY "Allow all operations on space_activity" ON space_activity FOR ALL USING (true);
CREATE POLICY "Allow all operations on space_chat" ON space_chat FOR ALL USING (true);

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