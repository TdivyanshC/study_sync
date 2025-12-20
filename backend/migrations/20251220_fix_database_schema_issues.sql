-- Migration to fix database schema issues for OAuth users and missing columns
-- Created: 2025-12-20

-- Fix 1: Make password_hash nullable for OAuth users (Google, etc.)
ALTER TABLE users ALTER COLUMN password_hash DROP NOT NULL;

-- Fix 2: Add missing updated_at column to users table
ALTER TABLE users ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();

-- Fix 3: Add missing current_streak column to daily_user_metrics table  
ALTER TABLE daily_user_metrics ADD COLUMN IF NOT EXISTS current_streak INTEGER DEFAULT 0;

-- Fix 4: Update existing records to have proper values
-- For OAuth users, set password_hash to NULL instead of empty string
UPDATE users SET password_hash = NULL WHERE password_hash = 'oauth_user_no_password' OR password_hash = '';

-- Fix 5: Create index for updated_at column if it doesn't exist
CREATE INDEX IF NOT EXISTS idx_users_updated_at ON users(updated_at);

-- Fix 6: Add any missing columns that the application expects
-- Make sure onboarding_completed_at is not nullable
ALTER TABLE users ALTER COLUMN onboarding_completed SET DEFAULT false;

-- Fix 7: Update RLS policies to handle the new columns properly
-- Drop existing policy if it exists and recreate with updated columns
DROP POLICY IF EXISTS "Allow all operations on users" ON users;
CREATE POLICY "Allow all operations on users" ON users FOR ALL USING (true);

-- Fix 8: Add trigger to automatically update updated_at column
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Drop trigger if it exists and create new one
DROP TRIGGER IF EXISTS update_users_updated_at ON users;
CREATE TRIGGER update_users_updated_at 
    BEFORE UPDATE ON users 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

-- Fix 9: Ensure daily_user_metrics has proper constraints
ALTER TABLE daily_user_metrics ALTER COLUMN user_id SET NOT NULL;
ALTER TABLE daily_user_metrics ALTER COLUMN date SET NOT NULL;

-- Fix 10: Add missing indexes for better performance
CREATE INDEX IF NOT EXISTS idx_daily_user_metrics_user_date ON daily_user_metrics(user_id, date);
CREATE INDEX IF NOT EXISTS idx_daily_user_metrics_current_streak ON daily_user_metrics(current_streak);

COMMENT ON COLUMN users.password_hash IS 'Nullable for OAuth users (Google, etc.). Set to NULL for users who sign in via OAuth providers.';
COMMENT ON COLUMN daily_user_metrics.current_streak IS 'Current streak count for the user on this date';