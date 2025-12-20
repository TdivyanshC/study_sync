# Onboarding Completion Tracking Implementation

## Overview

This implementation provides a complete solution for tracking user onboarding completion and fixing OAuth user data mapping issues. The system uses a single `users` table approach with embedded onboarding fields.

## Key Features

1. **Onboarding Completion Tracking**: Users who complete onboarding won't see the onboarding flow again
2. **OAuth User Data Fix**: Google OAuth users now get proper email and username instead of placeholder IDs
3. **Single Table Architecture**: All user data including onboarding info is stored in the `users` table
4. **Backend API Support**: Complete REST API for onboarding data management
5. **Frontend Integration**: Updated React Native components to work with the new system

## Database Schema Changes

### Users Table Updates

The `users` table has been enhanced with the following onboarding-related fields:

```sql
-- Onboarding completion tracking
onboarding_completed BOOLEAN DEFAULT false NOT NULL
onboarding_completed_at TIMESTAMP WITH TIME ZONE

-- Personal information from onboarding step 1
gender VARCHAR(50)
age INTEGER
relationship_status VARCHAR(100)

-- Session preferences from onboarding step 2
preferred_sessions TEXT[] -- Array of session types user selected

-- Additional profile data
display_name VARCHAR(255)
avatar_url VARCHAR(500)
profile_updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
```

### Migration Instructions

Run the following migration to add the onboarding fields to your existing `users` table:

```sql
-- Add onboarding fields to existing users table
ALTER TABLE users 
ADD COLUMN onboarding_completed BOOLEAN DEFAULT false NOT NULL;

ALTER TABLE users 
ADD COLUMN onboarding_completed_at TIMESTAMP WITH TIME ZONE;

ALTER TABLE users 
ADD COLUMN gender VARCHAR(50);

ALTER TABLE users 
ADD COLUMN age INTEGER;

ALTER TABLE users 
ADD COLUMN relationship_status VARCHAR(100);

ALTER TABLE users 
ADD COLUMN preferred_sessions TEXT[];

ALTER TABLE users 
ADD COLUMN display_name VARCHAR(255);

ALTER TABLE users 
ADD COLUMN avatar_url VARCHAR(500);

ALTER TABLE users 
ADD COLUMN profile_updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();

-- Create indexes for better performance
CREATE INDEX idx_users_onboarding_completed ON users(onboarding_completed);
CREATE INDEX idx_users_preferred_sessions ON users USING GIN(preferred_sessions);
CREATE INDEX idx_users_profile_updated_at ON users(profile_updated_at);
```

## Backend Implementation

### New API Endpoints

The following onboarding endpoints have been added:

#### 1. Complete Onboarding
```
POST /api/onboarding/complete
```

**Request Body:**
```json
{
  "step1_data": {
    "gender": "male",
    "age": 25,
    "relationship_status": "single"
  },
  "step2_data": {
    "preferred_sessions": ["coding", "study", "reading"]
  },
  "display_name": "John Doe"
}
```

#### 2. Save Step 1 Data
```
POST /api/onboarding/step1
```

**Request Body:**
```json
{
  "gender": "female",
  "age": 30,
  "relationship_status": "married"
}
```

#### 3. Save Step 2 Data
```
POST /api/onboarding/step2
```

**Request Body:**
```json
{
  "preferred_sessions": ["meditation", "yoga", "reading"]
}
```

#### 4. Get Onboarding Status
```
GET /api/onboarding/status
```

**Response:**
```json
{
  "success": true,
  "onboarding_completed": false,
  "onboarding_completed_at": null,
  "profile_data": {
    "gender": "male",
    "age": 25,
    "relationship_status": "single",
    "preferred_sessions": ["coding", "study"],
    "display_name": "John Doe"
  }
}
```

### Backend Files Modified/Created

1. **`backend/routes/onboarding_routes.py`** - New onboarding API routes
2. **`backend/services/optimized_supabase_db.py`** - Added `update_user()` and `get_user()` methods
3. **`backend/server.py`** - Registered onboarding routes
4. **`backend/supabase_schema.sql`** - Updated schema with onboarding fields
5. **`backend/migrations/20251220_add_onboarding_to_users_table.sql`** - Migration script

## Frontend Implementation

### Updated Components

#### 1. AuthProvider (`frontend/providers/AuthProvider.tsx`)

**Key Changes:**
- Fixed OAuth user data mapping to extract real email and username from Google OAuth
- Updated `checkOnboardingStatus()` to use `users` table instead of `user_profiles`
- Enhanced `markOnboardingCompleted()` to properly update user data
- Improved error handling and logging

**OAuth Data Extraction:**
```typescript
// Extract real user data from OAuth response
const email = user.email || 
             user.user_metadata?.email || 
             user.app_metadata?.email || 
             '';

const username = user.user_metadata?.full_name ||
                user.user_metadata?.name ||
                user.app_metadata?.full_name ||
                user.app_metadata?.name ||
                user.email?.split('@')[0] ||
                '';
```

#### 2. OAuth Callback (`frontend/app/auth/callback.tsx`)

**Key Changes:**
- Updated to use `users` table for onboarding status checking
- Removed dependency on `user_profiles` table
- Better error handling for OAuth user creation

#### 3. Onboarding Steps (`frontend/app/onboarding-step1.tsx`, `frontend/app/onboarding-step2.tsx`)

**Key Changes:**
- Step 1: Collects gender, age, and relationship status
- Step 2: Collects session preferences (minimum 3 required)
- Both steps call `markOnboardingCompleted()` when finished

### Frontend Flow

1. **New User Authentication:**
   - User signs up via email/password or Google OAuth
   - System checks `onboarding_completed` field in `users` table
   - If `false` or null, redirect to onboarding step 1
   - If `true`, redirect to main app

2. **Onboarding Process:**
   - Step 1: Personal information collection
   - Step 2: Session preferences selection (minimum 3)
   - Final step: Mark onboarding as completed in database

3. **Returning Users:**
   - Direct navigation to main app
   - No onboarding flow shown

## OAuth User Data Fix

### Problem
Google OAuth users were getting placeholder emails like:
- `888db9f5-684a-4271-9c21-51d7e8d99b3a@oauth.user`
- Username like `oauth_user_888db9f5`

### Solution
Enhanced user data extraction from OAuth response:

```typescript
// Real Google OAuth data extraction
const email = user.email || 
             user.user_metadata?.email || 
             user.app_metadata?.email || 
             '';

const username = user.user_metadata?.full_name ||
                user.user_metadata?.name ||
                user.app_metadata?.full_name ||
                user.app_metadata?.name ||
                user.email?.split('@')[0] ||
                '';

const displayName = user.user_metadata?.full_name ||
                   user.user_metadata?.name ||
                   user.app_metadata?.full_name ||
                   user.app_metadata?.name ||
                   username ||
                   email;
```

## Testing Instructions

### 1. Database Migration
```bash
# Run the migration to add onboarding fields
psql -d your_database -f backend/migrations/20251220_add_onboarding_to_users_table.sql
```

### 2. Backend Testing
```bash
# Start the backend server
cd backend
python server.py

# Test onboarding endpoints
curl -X POST http://localhost:8000/api/onboarding/complete \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "step1_data": {
      "gender": "male",
      "age": 25,
      "relationship_status": "single"
    },
    "step2_data": {
      "preferred_sessions": ["coding", "study", "reading"]
    },
    "display_name": "John Doe"
  }'
```

### 3. Frontend Testing
```bash
# Start the frontend
cd frontend
npm start

# Test the flow:
# 1. Sign up with Google OAuth
# 2. Verify real email/username is captured
# 3. Complete onboarding steps
# 4. Verify no more onboarding on subsequent logins
```

## API Response Examples

### Successful Onboarding Completion
```json
{
  "success": true,
  "message": "Onboarding completed successfully",
  "user_id": "123e4567-e89b-12d3-a456-426614174000"
}
```

### Get Onboarding Status
```json
{
  "success": true,
  "onboarding_completed": true,
  "onboarding_completed_at": "2025-12-20T16:00:00Z",
  "profile_data": {
    "gender": "male",
    "age": 25,
    "relationship_status": "single",
    "preferred_sessions": ["coding", "study", "reading"],
    "display_name": "John Doe"
  }
}
```

## Error Handling

The implementation includes comprehensive error handling:

1. **Database Errors**: Graceful fallback to local state if database operations fail
2. **OAuth Errors**: Proper extraction of user data with fallbacks
3. **Network Errors**: Retry logic and timeout handling
4. **Validation Errors**: Input validation for all onboarding data

## Security Considerations

1. **Row Level Security (RLS)**: Updated to work with the `users` table structure
2. **Authentication**: All onboarding endpoints require valid JWT tokens
3. **Input Validation**: All user inputs are validated and sanitized
4. **SQL Injection Prevention**: Using parameterized queries through Supabase client

## Performance Optimizations

1. **Database Indexes**: Added indexes for `onboarding_completed` and `preferred_sessions`
2. **Query Caching**: Implemented caching for user data retrieval
3. **Connection Pooling**: Used connection pooling for database operations
4. **Efficient Updates**: Only update changed fields in user records

## Troubleshooting

### Common Issues

1. **Migration Fails**: Ensure the `users` table exists and has the basic structure
2. **OAuth Email Not Captured**: Check Google OAuth configuration and scopes
3. **Onboarding Status Not Updating**: Verify RLS policies allow updates
4. **Frontend Navigation Issues**: Check AuthProvider state management

### Debug Commands

```bash
# Check users table structure
\\d users

# Check onboarding status for a user
SELECT id, email, onboarding_completed, onboarding_completed_at FROM users WHERE id = 'USER_ID';

# Check RLS policies
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual 
FROM pg_policies 
WHERE tablename = 'users';
```

## Future Enhancements

1. **Onboarding Analytics**: Track completion rates and drop-off points
2. **Personalization**: Use onboarding data for personalized recommendations
3. **A/B Testing**: Test different onboarding flows
4. **Profile Updates**: Allow users to update onboarding data later
5. **Bulk Operations**: Support for bulk user data imports

## Support

For issues or questions:
1. Check the troubleshooting section
2. Review server logs for detailed error messages
3. Verify database connectivity and schema
4. Test API endpoints individually

This implementation provides a robust, scalable solution for onboarding completion tracking with proper OAuth user data handling.