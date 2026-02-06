-- Database Fix for StudySync
-- Run this SQL in your Supabase SQL Editor to fix the issues

-- 1. Fix public_user_id column size (char(6) -> varchar(10))
ALTER TABLE users ALTER COLUMN public_user_id TYPE VARCHAR(10);

-- 2. Verify the fix
SELECT column_name, data_type, character_maximum_length
FROM information_schema.columns
WHERE table_name = 'users' AND column_name = 'public_user_id';

-- 3. If there are existing users with long public_user_id values, truncate them
UPDATE users SET public_user_id = LEFT(public_user_id, 7) WHERE LENGTH(public_user_id) > 7;

-- 4. Verify existing public_user_id values are valid length
SELECT id, public_user_id, LENGTH(public_user_id) as len FROM users WHERE LENGTH(public_user_id) > 7;
