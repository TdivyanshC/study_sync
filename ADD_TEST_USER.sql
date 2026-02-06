-- Add a test user to the users table
-- Run this in Supabase SQL Editor

-- Insert test user (replace with actual auth.users id)
INSERT INTO users (
  id,
  email,
  username,
  public_user_id,
  display_name,
  gender,
  age,
  relationship_status,
  preferred_sessions,
  onboarding_completed,
  onboarding_completed_at,
  created_at
) VALUES (
  '11111111-1111-1111-1111-111111111111', -- Replace with actual auth.users id
  'test@example.com',
  'testuser',
  'ABC123',
  'Test User',
  'male',
  25,
  'Single',
  '["gym", "meditation", "coding"]'::jsonb,
  true,
  NOW(),
  NOW()
) ON CONFLICT (id) DO UPDATE SET
  email = EXCLUDED.email,
  username = EXCLUDED.username,
  display_name = EXCLUDED.display_name,
  gender = EXCLUDED.gender,
  age = EXCLUDED.age,
  relationship_status = EXCLUDED.relationship_status,
  preferred_sessions = EXCLUDED.preferred_sessions,
  onboarding_completed = EXCLUDED.onboarding_completed,
  onboarding_completed_at = EXCLUDED.onboarding_completed_at;

-- Verify the user was added
SELECT id, email, username, gender, age, relationship_status, onboarding_completed 
FROM users 
WHERE email = 'test@example.com';
