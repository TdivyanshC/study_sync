-- Migration: Add session types, space sessions, and friend requests
-- Date: 2026-01-21
-- Description: Adds support for multiple session types (gym, singing, dancing), space session tracking, and friend request system

-- Add session_type column to study_sessions table
ALTER TABLE study_sessions ADD COLUMN IF NOT EXISTS session_type VARCHAR(50) DEFAULT 'study';

-- Create space_sessions table for tracking individual space sessions
CREATE TABLE IF NOT EXISTS space_sessions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    space_id UUID REFERENCES spaces(id) ON DELETE CASCADE,
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    session_type VARCHAR(50) NOT NULL,
    duration_minutes INTEGER NOT NULL,
    clocked_in_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    clocked_out_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create friend_requests table
CREATE TABLE IF NOT EXISTS friend_requests (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    sender_id UUID REFERENCES users(id) ON DELETE CASCADE,
    receiver_id UUID REFERENCES users(id) ON DELETE CASCADE,
    status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'declined')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(sender_id, receiver_id)
);

-- Add indexes for new tables
CREATE INDEX IF NOT EXISTS idx_space_sessions_space_id ON space_sessions(space_id);
CREATE INDEX IF NOT EXISTS idx_space_sessions_user_id ON space_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_space_sessions_session_type ON space_sessions(session_type);
CREATE INDEX IF NOT EXISTS idx_friend_requests_sender_id ON friend_requests(sender_id);
CREATE INDEX IF NOT EXISTS idx_friend_requests_receiver_id ON friend_requests(receiver_id);
CREATE INDEX IF NOT EXISTS idx_friend_requests_status ON friend_requests(status);

-- Add index for session_type on study_sessions
CREATE INDEX IF NOT EXISTS idx_study_sessions_session_type ON study_sessions(session_type);

-- Enable RLS on new tables
ALTER TABLE space_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE friend_requests ENABLE ROW LEVEL SECURITY;

-- Add RLS policies for new tables
CREATE POLICY "Allow all operations on space_sessions" ON space_sessions FOR ALL USING (true);
CREATE POLICY "Allow all operations on friend_requests" ON friend_requests FOR ALL USING (true);

-- Update existing badges to include new session types
INSERT INTO badges (title, description, requirement_type, requirement_value) VALUES
('Gym Enthusiast', 'Complete 10 gym sessions', 'gym_sessions', 10),
('Voice of Gold', 'Complete 10 singing sessions', 'singing_sessions', 10),
('Dance Master', 'Complete 10 dancing sessions', 'dancing_sessions', 10)
ON CONFLICT (title) DO NOTHING;

-- Function to update user activity status
CREATE OR REPLACE FUNCTION update_user_activity(user_uuid UUID, activity_type VARCHAR, started_at TIMESTAMP WITH TIME ZONE DEFAULT NOW())
RETURNS VOID AS $$
BEGIN
    UPDATE users
    SET current_activity = activity_type,
        activity_started_at = started_at
    WHERE id = user_uuid;
END;
$$ LANGUAGE plpgsql;

-- Function to clear user activity
CREATE OR REPLACE FUNCTION clear_user_activity(user_uuid UUID)
RETURNS VOID AS $$
BEGIN
    UPDATE users
    SET current_activity = NULL,
        activity_started_at = NULL
    WHERE id = user_uuid;
END;
$$ LANGUAGE plpgsql;

-- Function to calculate space productivity hours
CREATE OR REPLACE FUNCTION get_space_productivity_hours(space_uuid UUID)
RETURNS TABLE(user_id UUID, username VARCHAR, total_hours DECIMAL) AS $$
BEGIN
    RETURN QUERY
    SELECT
        ss.user_id,
        u.username,
        ROUND(SUM(ss.duration_minutes)::DECIMAL / 60, 2) as total_hours
    FROM space_sessions ss
    JOIN users u ON ss.user_id = u.id
    WHERE ss.space_id = space_uuid
    GROUP BY ss.user_id, u.username
    ORDER BY total_hours DESC;
END;
$$ LANGUAGE plpgsql;

-- Function to get user's productivity stats
CREATE OR REPLACE FUNCTION get_user_productivity_stats(user_uuid UUID)
RETURNS TABLE(
    total_hours DECIMAL,
    weekly_hours DECIMAL,
    today_hours DECIMAL,
    current_streak INTEGER,
    efficiency DECIMAL
) AS $$
DECLARE
    week_start TIMESTAMP;
    today_start TIMESTAMP;
BEGIN
    week_start := date_trunc('week', NOW());
    today_start := date_trunc('day', NOW());

    RETURN QUERY
    SELECT
        ROUND(COALESCE(SUM(duration_minutes), 0)::DECIMAL / 60, 2) as total_hours,
        ROUND(COALESCE(SUM(CASE WHEN created_at >= week_start THEN duration_minutes END), 0)::DECIMAL / 60, 2) as weekly_hours,
        ROUND(COALESCE(SUM(CASE WHEN created_at >= today_start THEN duration_minutes END), 0)::DECIMAL / 60, 2) as today_hours,
        COALESCE(u.streak_count, 0) as current_streak,
        ROUND(AVG(COALESCE(efficiency, 0)), 2) as efficiency
    FROM study_sessions ss
    JOIN users u ON ss.user_id = u.id
    WHERE ss.user_id = user_uuid;
END;
$$ LANGUAGE plpgsql;