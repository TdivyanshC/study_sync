-- Enable RLS for gamification tables
ALTER TABLE xp_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE session_audit ENABLE ROW LEVEL SECURITY;
ALTER TABLE session_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE daily_user_metrics ENABLE ROW LEVEL SECURITY;

-- RLS policies for gamification tables
CREATE POLICY "Allow all on xp_history" ON xp_history FOR ALL USING (true);
CREATE POLICY "Allow all on session_audit" ON session_audit FOR ALL USING (true);
CREATE POLICY "Allow all on session_events" ON session_events FOR ALL USING (true);
CREATE POLICY "Allow all on daily_user_metrics" ON daily_user_metrics FOR ALL USING (true);