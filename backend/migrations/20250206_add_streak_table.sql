-- Migration: Add user_streaks table for streak tracking
-- Run this in your Supabase SQL Editor

-- =====================================================
-- USER STREAKS TABLE
-- Daily login streak tracking
-- =====================================================
create table if not exists user_streaks (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references users(id) on delete cascade unique not null,
  current_streak int default 0,
  best_streak int default 0,
  last_updated date,
  streak_multiplier decimal(3,2) default 1.00,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Create indexes for performance
create index if not exists idx_user_streaks_user on user_streaks(user_id);
create index if not exists idx_user_streaks_updated on user_streaks(last_updated);

-- =====================================================
-- Verify existing columns in users table
-- =====================================================
-- The users table should have these columns:
-- id (uuid, primary key)
-- email (text, unique)
-- username (text, unique)
-- public_user_id (char(6), unique)
-- display_name (text)
-- gender (text)
-- age (integer)
-- relationship_status (text)
-- preferred_sessions (jsonb)
-- onboarding_completed (boolean)
-- onboarding_completed_at (timestamptz)
-- gmail_name (text)
-- avatar_url (text)
-- created_at (timestamptz)

-- If you see errors about user_id column, the column name is 'id' not 'user_id'
-- =====================================================
