# StudySync Gamification System

A comprehensive gamification backend system for the StudySync application featuring XP tracking, session auditing, offline synchronization, and leaderboards.

## 🎯 Overview

The gamification system enhances user engagement through:
- **XP System**: Award points for study sessions with milestone bonuses
- **Session Auditing**: Prevent cheating through event tracking and validation
- **Leaderboards**: Weekly, monthly, and all-time rankings
- **Offline Support**: Sync events when connectivity returns
- **Milestone Tracking**: Automatic achievement recognition

## 🏗️ Architecture

```
backend/
├── types/gamification.py          # Type definitions and Pydantic models
├── services/gamification/
│   └── xp_service.py              # Core business logic
├── controllers/
│   └── gamification_controller.py # Request handling layer
├── routes/
│   └── gamification_routes.py     # FastAPI route definitions
├── utils/
│   └── gamification_helpers.py    # Utility classes and functions
├── tests/
│   └── test_gamification.py       # Comprehensive test suite
└── server.py                      # Integrated FastAPI server
```

## 🚀 Key Features

### 1. XP Calculation (A1 Rules)
- **1 XP per minute** of study time
- **+10 XP bonus** for completing 25-minute sessions (Pomodoro)
- **+20 XP bonus** for daily 2-hour study goal
- **+100 XP milestone** every 500 XP earned
- **+1000 XP milestone** every 10,000 XP earned

### 2. Session Auditing
- Heartbeat logging every 5-10 seconds
- Suspicion score calculation (0-100)
- Soft/strict validation modes
- Fraud detection patterns

### 3. Offline Synchronization
- Local event storage
- Conflict resolution
- Batch synchronization

### 4. Leaderboards
- **Weekly**: Last 7 days
- **Monthly**: Last 30 days
- **All-Time**: Complete history
- Growth percentage tracking

## 📡 API Endpoints

### Core XP Operations

#### POST `/api/xp/award`
Award XP to a user with source attribution.

**Request:**
```json
{
    "user_id": "uuid-string",
    "amount": 50,
    "source": "session",
    "metadata": {
        "session_id": "session-uuid",
        "duration_minutes": 25
    }
}
```

**Response:**
```json
{
    "success": true,
    "data": {
        "xp_history_id": "xp-uuid",
        "total_xp": 150,
        "level": 2,
        "user_id": "user-uuid",
        "amount_awarded": 50
    },
    "message": "Successfully awarded 50 XP"
}
```

#### POST `/api/xp/calculate-session`
Calculate XP for a completed study session.

**Request:**
```json
{
    "session_id": "session-uuid"
}
```

**Response:**
```json
{
    "success": true,
    "data": {
        "session_id": "session-uuid",
        "user_id": "user-uuid",
        "duration_minutes": 30,
        "calculation_details": {
            "base_xp": 30,
            "bonus_pomodoro": 10,
            "bonus_daily_goal": 0,
            "milestone_500": 0,
            "milestone_10000": 0,
            "total_xp": 40,
            "calculation_metadata": {
                "duration_minutes": 30,
                "xp_per_minute": 1,
                "pomodoro_threshold": 25
            }
        },
        "xp_awarded": {
            "success": true,
            "total_xp": 190,
            "level": 2
        }
    },
    "message": "Successfully calculated 40 XP for session"
}
```

### Leaderboards

#### GET `/api/xp/leaderboard?period=weekly`
Get XP leaderboard for specified period.

**Query Parameters:**
- `period`: `weekly` | `monthly` | `all-time`

**Response:**
```json
{
    "success": true,
    "data": {
        "period": "weekly",
        "entries": [
            {
                "rank": 1,
                "user_id": "user-uuid",
                "username": "Alice",
                "xp": 150,
                "level": 2,
                "streak_multiplier": 1.2,
                "growth_percentage": 15.5
            }
        ],
        "total_users": 25,
        "generated_at": "2023-11-18T13:05:00Z"
    },
    "message": "Successfully generated weekly leaderboard"
}
```

### Session Auditing

#### POST `/api/xp/audit/validate`
Validate session for audit purposes.

**Request:**
```json
{
    "session_id": "session-uuid",
    "user_id": "user-uuid",
    "validation_mode": "soft"
}
```

**Response:**
```json
{
    "success": true,
    "data": {
        "session_id": "session-uuid",
        "user_id": "user-uuid",
        "is_valid": true,
        "suspicion_score": 15,
        "validation_details": {
            "total_events": 8,
            "time_gaps": [
                {
                    "from": "2023-11-18T12:00:00Z",
                    "to": "2023-11-18T12:02:00Z",
                    "gap_seconds": 120
                }
            ],
            "event_sequence": [...],
            "red_flags": []
        },
        "validation_mode": "soft"
    },
    "message": "Session validation passed (score: 15)"
}
```

### Offline Synchronization

#### POST `/api/xp/sync/offline`
Synchronize offline session events.

**Request:**
```json
{
    "user_id": "user-uuid",
    "events": [
        {
            "session_id": "session-uuid",
            "event_type": "heartbeat",
            "event_payload": {"timestamp": "123"},
            "created_at": "2023-11-18T12:00:00Z"
        }
    ],
    "last_sync": "2023-11-18T11:00:00Z"
}
```

**Response:**
```json
{
    "success": true,
    "data": {
        "synced_events": 1,
        "pending_events": 0,
        "conflicts_resolved": 0,
        "total_events": 1
    },
    "message": "Successfully synced 1 events"
}
```

### User Statistics

#### GET `/api/xp/stats/{user_id}`
Get comprehensive XP statistics.

**Response:**
```json
{
    "success": true,
    "data": {
        "user_id": "user-uuid",
        "username": "Alice",
        "total_xp": 1250,
        "level": 13,
        "current_streak": 5,
        "recent_30_days_xp": 340,
        "xp_sources": {
            "session": 800,
            "streak": 200,
            "milestone": 250
        },
        "next_level_xp": 50,
        "level_progress": 50
    },
    "message": "User XP statistics retrieved successfully"
}
```

#### GET `/api/xp/history/{user_id}`
Get user's XP history.

**Query Parameters:**
- `limit`: 1-200 (default: 50)

#### GET `/api/xp/metrics/daily/{user_id}`
Get user's daily metrics.

**Query Parameters:**
- `days`: 1-365 (default: 30)

## 🗄️ Database Schema

### Tables Created

1. **xp_history**: XP transaction log
2. **session_audit**: Session validation records
3. **session_events**: Timer heartbeat log
4. **daily_user_metrics**: Aggregated daily data

### Key Features

- **UUID Primary Keys**: `uuid_generate_v4()`
- **Foreign Key Constraints**: ON DELETE CASCADE
- **JSONB Columns**: Flexible metadata storage
- **Timezone-Aware**: All timestamps with timezone
- **Optimized Indexes**: Performance queries
- **RLS Enabled**: Row-level security policies

## 🛠️ Setup and Integration

### 1. Database Migration

Apply the migration files in order:

```bash
# 1. Create tables
psql <CONNECTION_STRING> -f migrations/20251118_add_gamification_tables.sql

# 2. Create indexes
psql <CONNECTION_STRING> -f migrations/20251118_indexes.sql

# 3. Enable RLS policies
psql <CONNECTION_STRING> -f migrations/20251118_rls_policies.sql

# 4. (Optional) Run smoke tests
psql <CONNECTION_STRING> -f migrations/20251118_smoke_test.sql
```

### 2. Server Integration

The gamification system is automatically integrated into the main FastAPI server:

```python
# Automatic initialization in server.py
if supabase:
    xp_service = XPService(supabase)
    gamification_router = create_gamification_routes(xp_service)
    app.include_router(gamification_router)
```

### 3. Frontend Integration

Example React Native usage:

```typescript
// Award XP
const awardXP = async (userId: string, amount: number, source: string) => {
  const response = await fetch('/api/xp/award', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      user_id: userId,
      amount,
      source,
      metadata: { session_id: 'session-123' }
    })
  });
  return response.json();
};

// Calculate Session XP
const calculateSessionXP = async (sessionId: string) => {
  const response = await fetch('/api/xp/calculate-session', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ session_id: sessionId })
  });
  return response.json();
};

// Get Leaderboard
const getLeaderboard = async (period: 'weekly' | 'monthly' | 'all-time') => {
  const response = await fetch(`/api/xp/leaderboard?period=${period}`);
  return response.json();
};
```

## 🔧 Testing

Run the comprehensive test suite:

```bash
cd backend
python -m pytest tests/test_gamification.py -v
```

Test coverage includes:
- Unit tests for all service methods
- Controller request handling
- Helper utility functions
- Integration workflows
- Error handling scenarios

## 📊 Performance Considerations

### Database Optimization
- **Indexing**: All query paths indexed
- **Connection Pooling**: Supabase handles automatically
- **Query Optimization**: Efficient JOINs and filtering

### Caching Strategy
- **User Stats**: Cache level/XP calculations
- **Leaderboards**: Cache for 1 hour
- **Daily Metrics**: Pre-aggregated views

### Rate Limiting
- **XP Awards**: 10 per minute per user
- **Session Calculations**: 100 per minute
- **Leaderboard Queries**: 50 per minute

## 🔒 Security Features

### Authentication
- **JWT Tokens**: All endpoints require valid tokens
- **User Isolation**: RLS policies enforce user access
- **Admin Functions**: Separate admin authentication

### Audit Logging
- **All Operations**: Logged with user attribution
- **Suspicious Activity**: Automatic flagging
- **Compliance**: GDPR-compliant data handling

## 🚦 Monitoring and Alerts

### Key Metrics
- **XP Distribution**: Track fairness and balance
- **Session Validation**: Monitor fraud attempts
- **Performance**: API response times
- **Error Rates**: System health indicators

### Alerts
- **High Fraud Scores**: >50% flagged sessions
- **Performance Degradation**: >2s response times
- **Database Issues**: Connection failures
- **Rate Limit Breaches**: Unusual activity patterns

## 📈 Future Enhancements

### Planned Features
- **Seasonal Events**: Special XP bonuses
- **Team Challenges**: Group-based competitions
- **Custom Badges**: User-created achievements
- **Analytics Dashboard**: Detailed insights
- **Social Features**: Friend challenges

### Scalability Improvements
- **Microservices**: Separate XP calculation service
- **Event Sourcing**: Complete audit trail
- **Real-time Updates**: WebSocket notifications
- **Advanced Caching**: Redis integration

## 🤝 Contributing

1. **Code Style**: Follow PEP 8 for Python
2. **Testing**: Write tests for new features
3. **Documentation**: Update API docs
4. **Performance**: Consider query optimization
5. **Security**: Follow security best practices

## 📄 License

This gamification system is part of the StudySync project and follows the same licensing terms.

---

**System Status**: ✅ Production Ready  
**Version**: 1.0.0  
**Last Updated**: 2023-11-18  
**Maintained By**: StudySync Development Team