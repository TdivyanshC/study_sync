-- Migration: Separate Google Auth Name from Custom Username
-- Date: 2026-01-21
-- Description: Renames 'username' to 'auth_name' for Google auth, adds new 'username' field for custom usernames

-- Rename username column to auth_name (for Google auth display name)
ALTER TABLE users RENAME COLUMN username TO auth_name;

-- Add new username column for custom chosen usernames
ALTER TABLE users ADD COLUMN IF NOT EXISTS username VARCHAR(255) UNIQUE;

-- Update indexes
DROP INDEX IF EXISTS idx_users_username;
CREATE INDEX IF NOT EXISTS idx_users_auth_name ON users(auth_name);
CREATE INDEX IF NOT EXISTS idx_users_username ON users(username);

-- Function to set default username from auth_name for existing users
UPDATE users SET username = auth_name WHERE username IS NULL AND auth_name IS NOT NULL;

-- Make username NOT NULL after populating existing data
-- Note: Run this manually after verifying data migration
-- ALTER TABLE users ALTER COLUMN username SET NOT NULL;