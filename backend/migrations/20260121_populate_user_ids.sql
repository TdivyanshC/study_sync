-- Migration: Populate user_id for existing users
-- Date: 2026-01-21
-- Description: Generates user_ids for users that don't have them

-- Update existing users to have user_ids
UPDATE users SET user_id = generate_user_id() WHERE user_id IS NULL OR user_id = '';

-- Verify the trigger is working for future inserts
-- The trigger should automatically generate user_ids for new users