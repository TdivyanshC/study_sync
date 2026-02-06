# Backend Onboarding Flow Analysis & Fixes

## Executive Summary

The frontend has a complete user authentication and onboarding flow, but the backend was missing critical routes and database columns to support it. This document details the issues found and the fixes implemented.

## Flow Analysis

### User Authentication & Onboarding Flow
```
1. User logs in (email or Google OAuth)
   ↓
2. Auth callback checks if user exists in Supabase Auth
   ↓
3. Backend checks users table for existing record
   ├─→ User EXISTS → Navigate to Home (/(tabs))
   └─→ User NOT FOUND → Navigate to username-selection
   ↓
4. Username Selection Screen
   ├─→ User enters username
   ├─→ Frontend checks availability
   └─→ Save username → Navigate to onboarding-step1
   ↓
5. Onboarding Step 1 (Gender/Age/Relationship)
   ├─→ User selects gender, age, relationship status
   └─→ Continue → Navigate to onboarding-step2
   ↓
6. Onboarding Step 2 (Session Selection)
   ├─→ User selects at least 3 sessions
   └─→ Finish → Call markOnboardingCompleted() → Navigate to Home
```

## Issues Identified

### Issue 1: Missing `/onboarding/complete` Route
**Location**: [`frontend/providers/AuthProvider.tsx:523`](frontend/providers/AuthProvider.tsx:523)

**Problem**: Frontend calls `POST ${getApiBaseUrl()}/onboarding/complete` but this route didn't exist.

**Impact**: API calls failed, forcing fallback to direct database updates.

### Issue 2: Backend Controller Was Incomplete
**Location**: [`backend/src/controllers/user.controller.ts`](backend/src/controllers/user.controller.ts)

**Problem**: `completeOnboarding` method only updated `username`.

**Needed**: Update `gender`, `age`, `relationship_status`, `preferred_sessions`, `onboarding_completed`, `onboarding_completed_at`.

### Issue 3: Database Schema Missing Columns
**Location**: [`backend/sql/schema.sql`](backend/sql/schema.sql)

**Problem**: Schema only had basic user fields.

**Missing Columns**:
- `gender` (TEXT)
- `age` (INTEGER)
- `relationship_status` (TEXT)
- `preferred_sessions` (JSONB)
- `onboarding_completed` (BOOLEAN)
- `onboarding_completed_at` (TIMESTAMPTZ)
- `display_name` (TEXT)

### Issue 4: Session Types Not Created
**Problem**: When users select sessions, no `session_types` entries were created.

**Impact**: Users couldn't track sessions even after selecting them.

## Complexity Analysis

### Time Complexity
- **User lookup**: O(1) - indexed by `id`
- **User update**: O(1) - single row update
- **Session type creation**: O(n) - where n = number of selected sessions
- **Onboarding check**: O(1) - indexed by `onboarding_completed`

### Space Complexity
- **User data**: O(1) per user
- **Session types**: O(n) where n = number of custom sessions per user
- **Indexes**: O(m) where m = number of indexed columns

## Fixes Implemented

### 1. Updated Database Schema
**File**: [`backend/sql/schema.sql`](backend/sql/schema.sql)

Added required columns to users table:
```sql
ALTER TABLE users ADD COLUMN IF NOT EXISTS gender TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS age INTEGER;
ALTER TABLE users ADD COLUMN IF NOT EXISTS relationship_status TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS preferred_sessions JSONB DEFAULT '[]'::jsonb;
ALTER TABLE users ADD COLUMN IF NOT EXISTS onboarding_completed BOOLEAN DEFAULT FALSE;
ALTER TABLE users ADD COLUMN IF NOT EXISTS onboarding_completed_at TIMESTAMPTZ;
ALTER TABLE users ADD COLUMN IF NOT EXISTS display_name TEXT;
```

Added new index for onboarding optimization:
```sql
CREATE INDEX IF NOT EXISTS idx_users_onboarding ON users(onboarding_completed) WHERE onboarding_completed = false;
```

### 2. Enhanced User Controller
**File**: [`backend/src/controllers/user.controller.ts`](backend/src/controllers/user.controller.ts)

Updated `completeOnboarding` method to:
- Accept full onboarding data (step1_data, step2_data, display_name)
- Update all user profile fields
- Auto-create session_types for selected sessions

Added helper method `createSessionTypesForUser` with O(n) complexity.

### 3. Created New Onboarding Route
**File**: [`backend/src/routes/onboarding.routes.ts`](backend/src/routes/onboarding.routes.ts)

New route: `POST /api/onboarding/complete`

### 4. Updated Main Routes
**File**: [`backend/src/index.ts`](backend/src/index.ts)

Added onboarding routes to main app:
```typescript
app.use('/api/onboarding', onboardingRoutes);
```

## API Endpoint Details

### POST /api/onboarding/complete

**Headers**:
```
Content-Type: application/json
Authorization: Bearer <access_token>
```

**Request Body**:
```json
{
  "step1_data": {
    "gender": "male",
    "age": "25",
    "relationship": "Single"
  },
  "step2_data": {
    "preferred_sessions": ["gym", "meditation", "coding"]
  },
  "display_name": "john_doe"
}
```

**Response**:
```json
{
  "success": true,
  "user": {
    "id": "uuid",
    "username": "john_doe",
    "gender": "male",
    "age": 25,
    "relationship_status": "Single",
    "preferred_sessions": ["gym", "meditation", "coding"],
    "onboarding_completed": true,
    "onboarding_completed_at": "2026-02-06T06:00:00Z"
  },
  "message": "Onboarding completed successfully"
}
```

## Session Type Mapping

The backend now automatically creates session types for these predefined sessions:

| Session ID | Name | Icon | Color |
|------------|------|------|-------|
| gym | Gym Session | 💪 | #ff6b35 |
| meditation | Meditation | 🧘 | #8b5cf6 |
| coding | Coding | 💻 | #06d6a0 |
| cricket | Cricket | 🏏 | #fbbf24 |
| singing | Singing | 🎤 | #ec4899 |
| study | Study Session | 📚 | #3b82f6 |
| yoga | Yoga | 🧘‍♀️ | #10b981 |
| reading | Reading | 📖 | #6366f1 |
| writing | Writing | ✍️ | #f59e0b |
| music | Music Practice | 🎵 | #8b5cf6 |
| gaming | Gaming | 🎮 | #ef4444 |
| cooking | Cooking | 👨‍🍳 | #f97316 |

## Deployment Steps

1. **Update Database Schema**:
   Run the migration SQL or update your Supabase schema.

2. **Restart Backend**:
   ```bash
   cd backend && npx tsx src/index.ts
   ```

3. **Test the Flow**:
   - Login with new account
   - Complete username selection
   - Complete onboarding steps
   - Verify data in database

## Verification Checklist

- [ ] New users get routed to username selection
- [ ] Username selection saves to database
- [ ] Onboarding step 1 saves gender/age/relationship
- [ ] Onboarding step 2 saves preferred sessions
- [ ] Session types are auto-created
- [ ] Users can track sessions after onboarding
- [ ] Returning users bypass onboarding

## Frontend Components Verified

- [`frontend/app/login.tsx`](frontend/app/login.tsx) - Login screen ✓
- [`frontend/app/auth/callback.tsx`](frontend/app/auth/callback.tsx) - Auth callback ✓
- [`frontend/app/username-selection.tsx`](frontend/app/username-selection.tsx) - Username selection ✓
- [`frontend/app/onboarding-step1.tsx`](frontend/app/onboarding-step1.tsx) - Step 1 ✓
- [`frontend/app/onboarding-step2.tsx`](frontend/app/onboarding-step2.tsx) - Step 2 ✓
- [`frontend/providers/AuthProvider.tsx`](frontend/providers/AuthProvider.tsx) - Auth provider ✓
