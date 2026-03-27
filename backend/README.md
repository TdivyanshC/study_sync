# StudySync Backend

A scalable backend API for StudySync built with Express.js and MongoDB.

## Architecture

```
backend/
├── src/
│   ├── config/         # Environment and database configuration
│   ├── controllers/     # Request handlers
│   ├── middleware/     # Auth, rate limiting, error handling
│   ├── routes/         # API route definitions
│   ├── services/       # Business logic
│   ├── utils/          # Helper functions
│   └── index.ts        # Entry point
├── src/models/         # MongoDB models
└── package.json
```

## API Endpoints

### Authentication
- `POST /api/auth/callback` - Sync user on OAuth callback
- `GET /api/auth/profile` - Get current user profile
- `PATCH /api/auth/profile` - Update user profile

### Users
- `GET /api/users/:user_id` - Get user by ID
- `GET /api/users/public/:public_id` - Get user by public ID
- `POST /api/users/onboarding` - Complete onboarding

### Sessions
- `POST /api/sessions/start` - Start a session
- `POST /api/sessions/end` - End a session
- `GET /api/sessions/active` - Get active session
- `GET /api/sessions` - Get user sessions
- `GET /api/sessions/today` - Get today's total

### Stats
- `GET /api/stats` - Get productivity stats
- `GET /api/stats/streaks` - Get streak data
- `GET /api/stats/today` - Get today's metrics

### Spaces
- `POST /api/spaces` - Create a space
- `GET /api/spaces` - Get user's spaces
- `GET /api/spaces/:space_id` - Get space details
- `POST /api/spaces/join` - Join a space
- `GET /api/spaces/:space_id/members` - Get space members
- `GET /api/spaces/:space_id/activity` - Get space activity
- `GET /api/spaces/:space_id/stats` - Get space stats
- `DELETE /api/spaces/:space_id` - Delete space

### Friendships
- `GET /api/friends` - Get friends list
- `GET /api/friends/pending` - Get pending requests
- `POST /api/friends/request` - Send friend request
- `POST /api/friends/accept` - Accept friend request
- `POST /api/friends/reject` - Reject friend request
- `DELETE /api/friends/remove` - Remove friend

## Setup

1. Install dependencies:
```bash
npm install
```

2. Configure environment variables:
```bash
cp .env.example .env
# Edit .env with your MongoDB connection string
```

3. Start development server:
```bash
npm run dev
```

## Environment Variables

| Variable | Description |
|----------|-------------|
| `MONGODB_URI` | MongoDB connection string |
| `PORT` | Server port (default: 3000) |
| `NODE_ENV` | Environment (development/production) |
| `CORS_ORIGIN` | CORS origin |

## Performance

- Index-first queries on all foreign keys and timestamps
- Parallel queries for dashboard data aggregation
- No derived totals stored - always calculate from source
- Rate limiting on sensitive endpoints
- Efficient joins with proper indexing

## License

MIT
