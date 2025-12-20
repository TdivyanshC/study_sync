-- Manual Database Fix for StudySync
-- Copy and run this entire script in your Supabase SQL Editor

-- Step 1: Fix password_hash column to allow NULL values for OAuth users
ALTER TABLE users ALTER COLUMN password_hash DROP NOT NULL;

-- Step 2: Add missing updated_at column to users table
ALTER TABLE users ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();

-- Step 3: Add missing current_streak column to daily_user_metrics table  
ALTER TABLE daily_user_metrics ADD COLUMN IF NOT EXISTS current_streak INTEGER DEFAULT 0;

-- Step 4: Create auto-update trigger for updated_at column
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Drop existing trigger if it exists and create new one
DROP TRIGGER IF EXISTS update_users_updated_at ON users;
CREATE TRIGGER update_users_updated_at 
    BEFORE UPDATE ON users 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

-- Step 5: Add proper indexes for performance
CREATE INDEX IF NOT EXISTS idx_users_updated_at ON users(updated_at);
CREATE INDEX IF NOT EXISTS idx_daily_user_metrics_user_date ON daily_user_metrics(user_id, date);
CREATE INDEX IF NOT EXISTS idx_daily_user_metrics_current_streak ON daily_user_metrics(current_streak);

-- Step 6: Update any existing OAuth users to have proper password_hash values
UPDATE users 
SET password_hash = 'oauth_user_' || SUBSTRING(id::text, 1, 8)
WHERE password_hash IS NULL OR password_hash = '';

-- Step 7: Refresh the schema cache (this happens automatically in Supabase)
-- No manual action needed for this step

-- Step 8: Verify the changes
DO $$
BEGIN
    -- Check if columns were added successfully
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'users' AND column_name = 'updated_at'
    ) THEN
        RAISE NOTICE '✅ updated_at column added successfully to users table';
    ELSE
        RAISE NOTICE '❌ updated_at column not found in users table';
    END IF;
    
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'daily_user_metrics' AND column_name = 'current_streak'
    ) THEN
        RAISE NOTICE '✅ current_streak column added successfully to daily_user_metrics table';
    ELSE
        RAISE NOTICE '❌ current_streak column not found in daily_user_metrics table';
    END IF;
    
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'users' AND column_name = 'password_hash' AND is_nullable = 'YES'
    ) THEN
        RAISE NOTICE '❌ password_hash column is still NOT NULL';
    ELSE
        RAISE NOTICE '✅ password_hash column is now nullable';
    END IF;
END
$$;