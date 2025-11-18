# StudySync Database Migrations

This document provides step-by-step instructions for applying the gamification system database migrations to your StudySync Supabase instance.

## Overview

The gamification system introduces 4 new tables with comprehensive indexes and security policies:

- **xp_history**: Tracks XP changes over time with source attribution
- **session_audit**: Records suspicious activity and session validation  
- **session_events**: Heartbeat logging for timer verification
- **daily_user_metrics**: Aggregated daily performance data

## Prerequisites

- Access to your Supabase project database
- `psql` command line tool installed
- Your Supabase connection string

## Migration Files

The following migration files must be executed in this exact order:

1. `20251118_add_gamification_tables.sql` - Creates the 4 new tables
2. `20251118_indexes.sql` - Adds performance indexes
3. `20251118_rls_policies.sql` - Enables Row Level Security policies
4. `20251118_smoke_test.sql` - Optional validation tests

## Application Steps

### Step 1: Apply Table Creation Migration

Run the following command to create the new gamification tables:

```bash
psql <CONNECTION_STRING> -f migrations/20251118_add_gamification_tables.sql
```

This will create:
- `xp_history` table with UUID primary key, user foreign key, and JSONB metadata
- `session_audit` table for tracking session anomalies and fraud detection
- `session_events` table for timer heartbeat logging
- `daily_user_metrics` table for aggregated daily performance data

### Step 2: Apply Indexes Migration

Run the following command to create performance indexes:

```bash
psql <CONNECTION_STRING> -f migrations/20251118_indexes.sql
```

This creates 11 optimized indexes:
- `idx_xp_history_user_id`, `idx_xp_history_created_at` - XP history queries
- `idx_session_events_session_id`, `idx_session_events_user_id`, `idx_session_events_created_at` - Event queries
- `idx_session_audit_session_id`, `idx_session_audit_user_id`, `idx_session_audit_created_at` - Audit queries
- `idx_daily_metrics_user_id`, `idx_daily_metrics_date` - Metrics queries

### Step 3: Apply RLS Policies Migration

Run the following command to enable security policies:

```bash
psql <CONNECTION_STRING> -f migrations/20251118_rls_policies.sql
```

This enables Row Level Security and creates permissive policies:
- `ALTER TABLE ... ENABLE ROW LEVEL SECURITY`
- `CREATE POLICY "Allow all on ..." FOR ALL USING (true)`

**Note**: The permissive policies are for initial development. You should refine these policies based on your authentication system before production deployment.

### Step 4: (Optional) Run Smoke Tests

To validate that the migration was successful, run the smoke test:

```bash
psql <CONNECTION_STRING> -f migrations/20251118_smoke_test.sql
```

This will:
- Insert test records into each table
- Return record counts to confirm successful table creation

## Verification

After completing all migrations, you can verify the schema changes:

```sql
-- Check that all tables exist
SELECT table_name FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name IN ('xp_history', 'session_audit', 'session_events', 'daily_user_metrics');

-- Check table structures
\d xp_history
\d session_audit
\d session_events  
\d daily_user_metrics

-- Check indexes exist
SELECT indexname, tablename FROM pg_indexes 
WHERE tablename IN ('xp_history', 'session_audit', 'session_events', 'daily_user_metrics');
```

## Rollback

If you need to rollback these changes, run the following commands in reverse order:

```bash
psql <CONNECTION_STRING> -c "DROP POLICY IF EXISTS 'Allow all on xp_history' ON xp_history;"
psql <CONNECTION_STRING> -c "DROP POLICY IF EXISTS 'Allow all on session_audit' ON session_audit;"
psql <CONNECTION_STRING> -c "DROP POLICY IF EXISTS 'Allow all on session_events' ON session_events;"
psql <CONNECTION_STRING> -c "DROP POLICY IF EXISTS 'Allow all on daily_user_metrics' ON daily_user_metrics;"

psql <CONNECTION_STRING> -c "DROP TABLE IF EXISTS daily_user_metrics CASCADE;"
psql <CONNECTION_STRING> -c "DROP TABLE IF EXISTS session_events CASCADE;"
psql <CONNECTION_STRING> -c "DROP TABLE IF EXISTS session_audit CASCADE;"
psql <CONNECTION_STRING> -c "DROP TABLE IF EXISTS xp_history CASCADE;"
```

## Next Steps

After successful migration:

1. **Update Application Code**: Integrate the new tables into your backend API
2. **Refine RLS Policies**: Replace permissive policies with user-based security rules
3. **Set up Monitoring**: Add database alerts for the new tables
4. **Performance Testing**: Monitor query performance with the new indexes

## Support

If you encounter issues during migration:

1. Check that your database connection string is correct
2. Ensure `psql` has proper database permissions
3. Verify no foreign key constraint violations
4. Check Supabase logs for detailed error messages