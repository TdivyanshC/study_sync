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