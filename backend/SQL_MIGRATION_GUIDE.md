# StudySync Database Migration Guide

## Overview
This guide provides the SQL queries needed to update your Supabase database to support the new features: multiple session types (gym, singing, dancing), enhanced friend system, space session tracking, and username separation.

## Prerequisites
- Access to Supabase dashboard or psql
- Current StudySync database schema
- Backup of current data (recommended)

## Migration Steps

### Step 1: Add Session Types and Space Sessions
Run the migration file: `migrations/20260121_add_session_types_and_spaces.sql`

### Step 2: Separate Auth Names from Usernames
Run the migration file: `migrations/20260121_separate_auth_username.sql`

### Step 3: Populate User IDs for Existing Users
Run the migration file: `migrations/20260121_populate_user_ids.sql`

## What Each Migration Does

### Migration 1: Session Types & Spaces
- Adds `session_type` column to `study_sessions` table
- Creates `space_sessions` table for individual space tracking
- Creates `friend_requests` table for friend request system
- Adds new badges for different session types
- Creates utility functions for activity tracking and productivity

### Migration 2: Username Separation
- Renames `username` column to `auth_name` (Google OAuth names)
- Adds new `username` column for custom chosen usernames
- Updates indexes to support both fields
- Migrates existing data

### Migration 3: User ID Population
- Generates unique user_ids for existing users who don't have them
- Ensures all users have proper 6-digit alphanumeric IDs

## Verification Queries

After running all migrations, verify with these queries:

```sql
-- Check new tables exist
SELECT table_name FROM information_schema.tables
WHERE table_schema = 'public'
AND table_name IN ('space_sessions', 'friend_requests');

-- Check new columns exist
SELECT column_name FROM information_schema.columns
WHERE table_name = 'study_sessions' AND column_name = 'session_type';

SELECT column_name FROM information_schema.columns
WHERE table_name = 'users' AND column_name IN ('auth_name', 'username');

-- Check user_ids are populated
SELECT COUNT(*) as users_with_user_id FROM users WHERE user_id IS NOT NULL AND user_id != '';

-- Check new functions exist
SELECT routine_name FROM information_schema.routines
WHERE routine_schema = 'public'
AND routine_name IN ('update_user_activity', 'clear_user_activity', 'get_space_productivity_hours', 'get_user_productivity_stats');

-- Check new badges were added
SELECT title FROM badges WHERE title IN ('Gym Enthusiast', 'Voice of Gold', 'Dance Master');
```

## Testing the Migration

1. **Test Session Types**:
   ```bash
   curl -X POST http://localhost:8000/api/session/start \
     -H "Content-Type: application/json" \
     -d '{"user_id": "your-user-id", "session_type": "gym", "duration_minutes": 30}'
   ```

2. **Test Space Sessions**:
   ```bash
   curl -X POST http://localhost:8000/api/session/space/start \
     -H "Content-Type: application/json" \
     -d '{"space_id": "space-id", "user_id": "user-id", "session_type": "study", "duration_minutes": 25}'
   ```

3. **Test Username System**:
   ```bash
   curl -X POST http://localhost:8000/api/auth/signup \
     -H "Content-Type: application/json" \
     -d '{"auth_name": "John Doe", "username": "StudyMaster2024", "email": "john@example.com", "password": "password123"}'
   ```

4. **Test Friend System**:
   ```bash
   curl "http://localhost:8000/api/friends/search?query=StudyMaster2024&current_user_id=user-id"
   ```

## Rollback Plan

If you need to rollback any migration:

### Rollback Migration 3 (User IDs):
```sql
-- This is safe to rollback as user_ids can be regenerated
UPDATE users SET user_id = NULL WHERE user_id IS NOT NULL;
```

### Rollback Migration 2 (Usernames):
```sql
-- Drop new username column
ALTER TABLE users DROP COLUMN IF EXISTS username;

-- Rename auth_name back to username
ALTER TABLE users RENAME COLUMN auth_name TO username;
```

### Rollback Migration 1 (Session Types & Spaces):
```sql
-- Drop new tables
DROP TABLE IF EXISTS space_sessions;
DROP TABLE IF EXISTS friend_requests;

-- Drop new functions
DROP FUNCTION IF EXISTS update_user_activity(UUID, VARCHAR, TIMESTAMP WITH TIME ZONE);
DROP FUNCTION IF EXISTS clear_user_activity(UUID);
DROP FUNCTION IF EXISTS get_space_productivity_hours(UUID);
DROP FUNCTION IF EXISTS get_user_productivity_stats(UUID);

-- Remove new badges
DELETE FROM badges WHERE title IN ('Gym Enthusiast', 'Voice of Gold', 'Dance Master');

-- Remove session_type column
ALTER TABLE study_sessions DROP COLUMN IF EXISTS session_type;
```

## Support

If you encounter issues during migration:
1. Check Supabase logs for error details
2. Verify all prerequisites are met
3. Ensure you have proper permissions
4. Contact the development team with error logs

## Order of Execution

**IMPORTANT**: Run the migrations in this exact order:
1. `20260121_add_session_types_and_spaces.sql`
2. `20260121_separate_auth_username.sql`
3. `20260121_populate_user_ids.sql`

Each migration depends on the previous one being completed successfully.