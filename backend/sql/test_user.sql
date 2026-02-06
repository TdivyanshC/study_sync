-- Add test user to Supabase database
-- Run this SQL in the Supabase SQL Editor

-- First, create a test user in auth.users (Supabase auth)
-- This creates a user with email confirmation already done

-- Insert into the users table (custom users table)
INSERT INTO users (id, email, gmail_name, username, public_user_id, avatar_url)
VALUES (
  'a1b2c3d4-e5f6-7890-abcd-ef1234567890', -- UUID (must reference auth.users)
  'testuser@studysync.com',                 -- email
  'Test User',                              -- gmail_name
  'testuser',                               -- username (unique)
  'USR001',                                 -- public_user_id (6 chars, unique)
  null                                      -- avatar_url
);

-- Verify the insertion
SELECT * FROM users WHERE username = 'testuser';
