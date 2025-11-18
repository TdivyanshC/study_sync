-- Smoke test for xp_history
INSERT INTO xp_history (user_id, amount, source, meta)
VALUES ((SELECT id FROM users LIMIT 1), 50, 'test', jsonb_build_object('info','ok'));

-- Smoke test for daily_user_metrics
INSERT INTO daily_user_metrics (user_id, date, total_minutes, xp_earned, streak_active)
VALUES ((SELECT id FROM users LIMIT 1), NOW()::date, 60, 20, true)
ON CONFLICT (user_id, date) DO UPDATE SET total_minutes = 60;

-- Smoke test for session_events
INSERT INTO session_events (session_id, user_id, event_type, event_payload)
VALUES ((SELECT id FROM study_sessions LIMIT 1), (SELECT user_id FROM study_sessions LIMIT 1), 'heartbeat', jsonb_build_object('sample','ok'));

-- Smoke test for session_audit
INSERT INTO session_audit (session_id, user_id, suspicion_score, reasons)
VALUES ((SELECT id FROM study_sessions LIMIT 1), (SELECT user_id FROM study_sessions LIMIT 1), 0, ARRAY['test']);

SELECT 'xp_history', count(*) FROM xp_history;
SELECT 'session_events', count(*) FROM session_events;
SELECT 'session_audit', count(*) FROM session_audit;
SELECT 'daily_user_metrics', count(*) FROM daily_user_metrics;