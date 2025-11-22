-- Enable RLS for gamification tables
ALTER TABLE xp_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE session_audit ENABLE ROW LEVEL SECURITY;
ALTER TABLE session_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE daily_user_metrics ENABLE ROW LEVEL SECURITY;
ALTER TABLE study_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_badges ENABLE ROW LEVEL SECURITY;
ALTER TABLE badges ENABLE ROW LEVEL SECURITY;

-- Drop existing permissive policies if they exist
DROP POLICY IF EXISTS "Allow all on xp_history" ON xp_history;
DROP POLICY IF EXISTS "Allow all on session_audit" ON session_audit;
DROP POLICY IF EXISTS "Allow all on session_events" ON session_events;
DROP POLICY IF EXISTS "Allow all on daily_user_metrics" ON daily_user_metrics;
DROP POLICY IF EXISTS "Allow all on study_sessions" ON study_sessions;
DROP POLICY IF EXISTS "Allow all on user_badges" ON user_badges;
DROP POLICY IF EXISTS "Allow all on badges" ON badges;

-- RLS policies for gamification tables - User-specific access
CREATE POLICY "Users can view own XP history" ON xp_history FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own XP history" ON xp_history FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own XP history" ON xp_history FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own XP history" ON xp_history FOR DELETE USING (auth.uid() = user_id);

CREATE POLICY "Users can view own session audit" ON session_audit FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own session audit" ON session_audit FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own session audit" ON session_audit FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own session audit" ON session_audit FOR DELETE USING (auth.uid() = user_id);

CREATE POLICY "Users can view own session events" ON session_events FOR SELECT USING (
  session_id IN (SELECT id FROM study_sessions WHERE user_id = auth.uid())
);
CREATE POLICY "Users can insert own session events" ON session_events FOR INSERT WITH CHECK (
  session_id IN (SELECT id FROM study_sessions WHERE user_id = auth.uid())
);
CREATE POLICY "Users can update own session events" ON session_events FOR UPDATE USING (
  session_id IN (SELECT id FROM study_sessions WHERE user_id = auth.uid())
);
CREATE POLICY "Users can delete own session events" ON session_events FOR DELETE USING (
  session_id IN (SELECT id FROM study_sessions WHERE user_id = auth.uid())
);

CREATE POLICY "Users can view own daily metrics" ON daily_user_metrics FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own daily metrics" ON daily_user_metrics FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own daily metrics" ON daily_user_metrics FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own daily metrics" ON daily_user_metrics FOR DELETE USING (auth.uid() = user_id);

-- Study sessions user isolation
CREATE POLICY "Users can view own study sessions" ON study_sessions FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own study sessions" ON study_sessions FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own study sessions" ON study_sessions FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own study sessions" ON study_sessions FOR DELETE USING (auth.uid() = user_id);

-- User badges access
CREATE POLICY "Users can view own badges" ON user_badges FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own badges" ON user_badges FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own badges" ON user_badges FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own badges" ON user_badges FOR DELETE USING (auth.uid() = user_id);

-- Badges table is shared - everyone can read, only admins can modify
CREATE POLICY "Everyone can view badges" ON badges FOR SELECT USING (true);
CREATE POLICY "Only service role can modify badges" ON badges FOR ALL USING (auth.jwt() ->> 'role' = 'service_role');