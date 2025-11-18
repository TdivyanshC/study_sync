from fastapi import FastAPI, APIRouter, HTTPException
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from supabase import create_client, Client
import os
import logging
from pathlib import Path
from pydantic import BaseModel, Field
from typing import List, Optional
import uuid
from datetime import datetime, timedelta
import socketio
import bcrypt
import jwt
from services.supabase_db import supabase_db

# Import gamification components
from services.gamification.xp_service import XPService
from services.gamification.ranking_service import RankingService
from routes.gamification_routes import create_gamification_routes
from routes.ranking_routes import create_ranking_routes
from routes.session_routes import session_bp


ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# Supabase connection
supabase_url = os.environ['SUPABASE_URL']
supabase_key = os.environ['SUPABASE_SERVICE_KEY']

# Initialize Supabase client with error handling
supabase = None
try:
    supabase: Client = create_client(supabase_url, supabase_key)
    print("Supabase client initialized successfully")
except Exception as e:
    print(f"Failed to initialize Supabase client: {e}")
    print("Please check your SUPABASE_URL and SUPABASE_SERVICE_KEY in .env")
    print("The server will start but Supabase operations will fail")

# JWT secret
JWT_SECRET = os.environ.get('JWT_SECRET', 'your_jwt_secret_key')

# Socket.IO server
sio = socketio.AsyncServer(
    cors_allowed_origins="*",
    async_mode='asgi'
)

# Create the main app without a prefix
app = FastAPI()

# Create a router with the /api prefix
api_router = APIRouter(prefix="/api")

# Socket.IO app
socket_app = socketio.ASGIApp(sio, app)


# Define Models
class StatusCheck(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    client_name: str
    timestamp: datetime = Field(default_factory=datetime.utcnow)

class StatusCheckCreate(BaseModel):
    client_name: str

class StudySession(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    space_id: Optional[str] = None
    user_id: str
    duration_minutes: int
    efficiency: Optional[float] = None
    confirmations_received: int = Field(default=0)
    created_at: datetime = Field(default_factory=datetime.utcnow)

    model_config = {
        "validate_assignment": True,
        "json_encoders": {
            datetime: lambda v: v.isoformat()
        }
    }

class SessionCreate(BaseModel):
    space_id: Optional[str] = None
    user_id: str
    duration_minutes: int
    efficiency: Optional[float] = None

class UserSignup(BaseModel):
    username: str
    email: str
    password: str

class UserLogin(BaseModel):
    email: str
    password: str

class Profile(BaseModel):
    user_id: str
    username: str
    xp: int
    level: int
    streak_count: int
    total_hours: float
    efficiency: float
    badges: List[dict]

class StreakData(BaseModel):
    current_streak: int
    best_streak: int
    average_efficiency: float

class Badge(BaseModel):
    id: str
    title: str
    description: str
    icon_url: Optional[str]
    requirement_type: str
    requirement_value: int

class Space(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    name: str
    created_by: str
    visibility: str = Field(default="public")
    member_count: int = Field(default=1)
    created_at: datetime = Field(default_factory=datetime.utcnow)

class SpaceCreate(BaseModel):
    name: str
    created_by: str
    visibility: str = Field(default="public")

class SpaceJoin(BaseModel):
    user_id: str

class SpaceActivity(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()), alias="_id")
    space_id: str
    user_id: str
    action: str
    progress: Optional[int] = None
    created_at: datetime = Field(default_factory=datetime.utcnow)

class SpaceActivityCreate(BaseModel):
    user_id: str
    action: str
    progress: Optional[int] = None

class SpaceChat(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()), alias="_id")
    space_id: str
    user_id: str
    message: str
    created_at: datetime = Field(default_factory=datetime.utcnow)

class SpaceChatCreate(BaseModel):
    user_id: str
    message: str

class DashboardResponse(BaseModel):
    profile: dict
    streak: StreakData
    spaces: List[dict]
    recent_sessions: List[dict]

# Socket.IO Events
@sio.event
async def connect(sid, environ):
    print(f"Client connected: {sid}")
    await sio.emit('connected', {'message': 'Connected to Study Together server'}, to=sid)

@sio.event
async def disconnect(sid):
    print(f"Client disconnected: {sid}")

@sio.event
async def join_space(sid, data):
    space_id = data.get('space_id')
    await sio.enter_room(sid, space_id)
    await sio.emit('space_joined', {'space_id': space_id}, to=sid)
    print(f"Client {sid} joined space {space_id}")

@sio.event
async def send_message(sid, data):
    space_id = data.get('space_id')
    user_id = data.get('user_id')
    message = data.get('message')
    # Save to Supabase
    chat = SpaceChat(space_id=space_id, user_id=user_id, message=message)
    result = supabase.table('space_chat').insert(chat.dict()).execute()
    saved_chat = result.data[0]
    # Broadcast
    await sio.emit('new_message', {
        'space_id': space_id,
        'user_id': user_id,
        'message': message,
        'created_at': saved_chat['created_at']
    }, room=space_id)

@sio.event
async def activity_update(sid, data):
    space_id = data.get('space_id')
    user_id = data.get('user_id')
    action = data.get('action')
    progress = data.get('progress')
    # Save to Supabase
    activity = SpaceActivity(space_id=space_id, user_id=user_id, action=action, progress=progress)
    result = supabase.table('space_activity').insert(activity.dict()).execute()
    saved_activity = result.data[0]
    # Broadcast
    await sio.emit('activity_received', {
        'space_id': space_id,
        'user_id': user_id,
        'action': action,
        'progress': progress,
        'created_at': saved_activity['created_at']
    }, room=space_id)

@sio.event
async def session_started(sid, data):
    # Broadcast to all clients in the same room
    room = data.get('room', 'general')
    await sio.emit('user_started_session', {
        'user_id': data.get('user_id'),
        'subject': data.get('subject'),
        'timestamp': datetime.utcnow().isoformat()
    }, room=room)

@sio.event
async def session_stopped(sid, data):
    # Broadcast to all clients in the same room
    room = data.get('room', 'general')
    await sio.emit('user_stopped_session', {
        'user_id': data.get('user_id'),
        'duration': data.get('duration'),
        'timestamp': datetime.utcnow().isoformat()
    }, room=room)

# API Routes
@api_router.get("/")
async def root():
    return {"message": "Study Together API"}

@api_router.post("/status", response_model=StatusCheck)
async def create_status_check(input: StatusCheckCreate):
    status_dict = input.dict()
    status_obj = StatusCheck(**status_dict)
    result = supabase.table('status_checks').insert(status_obj.dict()).execute()
    return StatusCheck(**result.data[0])

@api_router.get("/status", response_model=List[StatusCheck])
async def get_status_checks():
    result = supabase.table('status_checks').select('*').execute()
    return [StatusCheck(**item) for item in result.data]

# Auth endpoints
@api_router.post("/auth/signup")
async def signup(user_data: UserSignup):
    # Check if user already exists
    existing_result = supabase_db.fetch_data('users', {'eq_email': user_data.email})
    if existing_result['success'] and existing_result['data']:
        return {
            "success": False,
            "message": "User already exists",
            "data": None
        }

    # Hash password and create user
    hashed_password = hash_password(user_data.password)
    user_dict = {
        "username": user_data.username,
        "email": user_data.email,
        "password_hash": hashed_password
    }

    result = supabase_db.insert_data('users', user_dict)
    if not result['success']:
        return result

    user = result['data'][0] if result['data'] else None
    if not user:
        return {
            "success": False,
            "message": "Failed to create user",
            "data": None
        }

    # Create JWT token
    token = create_jwt_token(user['id'])

    return {
        "success": True,
        "message": "User created successfully",
        "data": {
            "token": token,
            "user": {"id": user['id'], "username": user['username'], "email": user['email']}
        }
    }

@api_router.post("/auth/login")
async def login(user_data: UserLogin):
    # Find user by email
    result = supabase_db.fetch_data('users', {'eq_email': user_data.email})
    if not result['success'] or not result['data']:
        return {
            "success": False,
            "message": "Invalid credentials",
            "data": None
        }

    user = result['data'][0]

    # Verify password
    if not verify_password(user_data.password, user['password_hash']):
        return {
            "success": False,
            "message": "Invalid credentials",
            "data": None
        }

    # Create JWT token
    token = create_jwt_token(user['id'])

    return {
        "success": True,
        "message": "Login successful",
        "data": {
            "token": token,
            "user": {"id": user['id'], "username": user['username'], "email": user['email']}
        }
    }

# Study Session endpoints
@api_router.post("/session/start")
async def start_session(session_data: SessionCreate):
    session_dict = {
        "space_id": session_data.space_id,
        "user_id": session_data.user_id,
        "duration_minutes": session_data.duration_minutes,
        "efficiency": session_data.efficiency
    }

    result = supabase_db.insert_data('study_sessions', session_dict)
    if not result['success']:
        return result

    return {
        "success": True,
        "message": "Study session started successfully",
        "data": result['data'][0] if result['data'] else None
    }

@api_router.post("/session/confirm")
async def confirm_session(session_id: str, user_id: str):
    # First get current confirmations count
    fetch_result = supabase_db.fetch_data('study_sessions', {'eq_id': session_id})
    if not fetch_result['success'] or not fetch_result['data']:
        return {
            "success": False,
            "message": "Session not found",
            "data": None
        }

    current_confirmations = fetch_result['data'][0]['confirmations_received']

    # Update confirmations count
    update_result = supabase_db.update_data('study_sessions',
        {'eq_id': session_id},
        {'confirmations_received': current_confirmations + 1}
    )

    if not update_result['success']:
        return update_result

    # Check for badge achievements
    await check_and_award_badges(user_id)

    return {
        "success": True,
        "message": "Session confirmed successfully",
        "data": None
    }

@api_router.post("/session/end")
async def end_session(session_id: str, duration_minutes: int, efficiency: Optional[float] = None):
    # Update session with final duration and efficiency
    update_data = {'duration_minutes': duration_minutes}
    if efficiency is not None:
        update_data['efficiency'] = efficiency

    result = supabase_db.update_data('study_sessions', {'eq_id': session_id}, update_data)
    if not result['success']:
        return result

    # Get session data for XP calculation
    session_result = supabase_db.fetch_data('study_sessions', {'eq_id': session_id})
    if not session_result['success'] or not session_result['data']:
        return {
            "success": False,
            "message": "Failed to retrieve updated session",
            "data": None
        }

    session = session_result['data'][0]
    user_id = session['user_id']

    # Calculate XP and update user stats
    xp_gained = duration_minutes * 10  # 10 XP per minute
    level_up = await update_user_stats(user_id, xp_gained, duration_minutes)

    # Check for badge achievements
    await check_and_award_badges(user_id)

    return {
        "success": True,
        "message": "Session ended successfully",
        "data": {
            "xp_gained": xp_gained,
            "level_up": level_up
        }
    }

@api_router.get("/sessions/{user_id}")
async def get_user_sessions(user_id: str):
    result = supabase.table('study_sessions').select('*').eq('user_id', user_id).order('created_at', desc=True).limit(100).execute()
    return result.data

# Streak endpoint
@api_router.get("/streaks/{user_id}", response_model=StreakData)
async def get_user_streaks(user_id: str):
    result = supabase.table('study_sessions').select('created_at, efficiency').eq('user_id', user_id).order('created_at').execute()
    sessions = result.data

    if not sessions:
        return StreakData(current_streak=0, best_streak=0, average_efficiency=0.0)

    # Get unique dates and efficiencies
    dates = set()
    efficiencies = []
    for session in sessions:
        dates.add(datetime.fromisoformat(session['created_at'].replace('Z', '+00:00')).date())
        if session.get('efficiency'):
            efficiencies.append(session['efficiency'])

    sorted_dates = sorted(dates)
    today = datetime.utcnow().date()

    # Calculate best streak
    best_streak = 0
    streak = 0
    prev_date = None
    for date in sorted_dates:
        if prev_date and (date - prev_date).days == 1:
            streak += 1
        else:
            streak = 1
        best_streak = max(best_streak, streak)
        prev_date = date

    # Calculate current streak
    current_streak = 0
    if sorted_dates:
        last_date = sorted_dates[-1]
        days_since_last = (today - last_date).days
        if days_since_last <= 1:
            # Find the streak ending at last_date
            streak = 1
            for i in range(len(sorted_dates) - 2, -1, -1):
                if (sorted_dates[i+1] - sorted_dates[i]).days == 1:
                    streak += 1
                else:
                    break
            current_streak = streak

    # Average efficiency
    average_efficiency = sum(efficiencies) / len(efficiencies) if efficiencies else 0.0

    return StreakData(
        current_streak=current_streak,
        best_streak=best_streak,
        average_efficiency=round(average_efficiency, 2)
    )

@api_router.get("/profile/{user_id}")
async def get_user_profile(user_id: str):
    # Get user data
    user_result = supabase.table('users').select('*').eq('id', user_id).execute()
    if not user_result.data:
        raise HTTPException(status_code=404, detail="User not found")
    user = user_result.data[0]

    # Calculate stats from study sessions
    sessions_result = supabase.table('study_sessions').select('duration_minutes, efficiency, created_at').eq('user_id', user_id).execute()
    sessions = sessions_result.data

    total_hours = sum(session['duration_minutes'] for session in sessions) / 60.0
    total_efficiency = sum(session['efficiency'] for session in sessions if session['efficiency']) if sessions else 0
    avg_efficiency = total_efficiency / len([s for s in sessions if s['efficiency']]) if sessions else 0

    # Calculate level and XP (simple formula)
    xp = int(total_hours * 10)  # 10 XP per hour
    level = xp // 100 + 1  # Level up every 100 XP

    # Get user badges
    badges_result = supabase.table('user_badges').select('badges(*)').eq('user_id', user_id).execute()
    badges = [item['badges'] for item in badges_result.data]

    # Get streak data
    streak_result = await get_user_streaks(user_id)

    return {
        "user_id": user_id,
        "username": user['username'],
        "xp": xp,
        "level": level,
        "streak_count": streak_result.current_streak,
        "total_hours": round(total_hours, 2),
        "efficiency": round(avg_efficiency, 2),
        "badges": badges
    }

@api_router.get("/dashboard/{user_id}")
async def get_user_dashboard(user_id: str):
    # Get profile
    profile = await get_user_profile(user_id)

    # Get streak data
    streak = await get_user_streaks(user_id)

    # Get spaces
    spaces_result = supabase.table('space_members').select('spaces(*)').eq('user_id', user_id).execute()
    spaces = [item['spaces'] for item in spaces_result.data]

    # Get recent sessions
    sessions_result = supabase.table('study_sessions').select('*').eq('user_id', user_id).order('created_at', desc=True).limit(3).execute()
    recent_sessions = sessions_result.data

    return {
        "profile": profile,
        "streak": streak.dict(),
        "spaces": spaces,
        "recent_sessions": recent_sessions
    }

# Space endpoints
@api_router.post("/spaces/create")
async def create_space(space_data: SpaceCreate):
    space_dict = {
        "name": space_data.name,
        "created_by": space_data.created_by,
        "visibility": space_data.visibility
    }

    result = supabase_db.insert_data('spaces', space_dict)
    if not result['success']:
        return result

    space_data_response = result['data'][0]

    # Add creator to space_members
    member_dict = {
        'space_id': space_data_response['id'],
        'user_id': space_data_response['created_by']
    }
    member_result = supabase_db.insert_data('space_members', member_dict)
    if not member_result['success']:
        return {
            "success": False,
            "message": "Space created but failed to add creator as member",
            "data": space_data_response
        }

    return {
        "success": True,
        "message": "Space created successfully",
        "data": space_data_response
    }

@api_router.post("/spaces/join")
async def join_space(join_data: SpaceJoin):
    # Check if space exists
    space_result = supabase_db.fetch_data('spaces', {'eq_id': join_data.space_id})
    if not space_result['success'] or not space_result['data']:
        return {
            "success": False,
            "message": "Space not found",
            "data": None
        }

    space = space_result['data'][0]

    # Check if already a member
    member_result = supabase_db.fetch_data('space_members', {
        'eq_space_id': join_data.space_id,
        'eq_user_id': join_data.user_id
    })
    if member_result['success'] and member_result['data']:
        return {
            "success": False,
            "message": "Already a member of this space",
            "data": None
        }

    # Add to space_members
    member_dict = {
        'space_id': join_data.space_id,
        'user_id': join_data.user_id
    }
    insert_result = supabase_db.insert_data('space_members', member_dict)
    if not insert_result['success']:
        return insert_result

    # Update member count
    update_result = supabase_db.update_data('spaces',
        {'eq_id': join_data.space_id},
        {'member_count': space['member_count'] + 1}
    )
    if not update_result['success']:
        return {
            "success": False,
            "message": "Joined space but failed to update member count",
            "data": None
        }

    return {
        "success": True,
        "message": "Successfully joined space",
        "data": None
    }

@api_router.get("/spaces/{user_id}", response_model=List[Space])
async def get_user_spaces(user_id: str):
    result = supabase.table('space_members').select('spaces(*)').eq('user_id', user_id).execute()
    return [Space(**item['spaces']) for item in result.data]

@api_router.post("/spaces/{space_id}/activity", response_model=SpaceActivity)
async def log_space_activity(space_id: str, activity_data: SpaceActivityCreate):
    activity = SpaceActivity(
        space_id=space_id,
        user_id=activity_data.user_id,
        action=activity_data.action,
        progress=activity_data.progress
    )
    result = supabase.table('space_activity').insert(activity.dict()).execute()
    return SpaceActivity(**result.data[0])

@api_router.get("/spaces/{space_id}/activity", response_model=List[SpaceActivity])
async def get_space_activity(space_id: str):
    result = supabase.table('space_activity').select('*').eq('space_id', space_id).order('created_at', desc=True).limit(20).execute()
    return [SpaceActivity(**item) for item in result.data]

@api_router.post("/spaces/{space_id}/chat", response_model=SpaceChat)
async def send_chat_message(space_id: str, chat_data: SpaceChatCreate):
    chat = SpaceChat(
        space_id=space_id,
        user_id=chat_data.user_id,
        message=chat_data.message
    )
    result = supabase.table('space_chat').insert(chat.dict()).execute()
    return SpaceChat(**result.data[0])

@api_router.get("/spaces/{space_id}/chat", response_model=List[SpaceChat])
async def get_space_chat(space_id: str):
    result = supabase.table('space_chat').select('*').eq('space_id', space_id).order('created_at', desc=True).limit(20).execute()
    return [SpaceChat(**item) for item in result.data]

# Badge and achievement functions
async def check_and_award_badges(user_id: str):
    # Get user stats
    sessions_result = supabase.table('study_sessions').select('duration_minutes, created_at').eq('user_id', user_id).execute()
    sessions = sessions_result.data

    # Check for 7-day streak badge
    streak_data = await get_user_streaks(user_id)
    if streak_data.current_streak >= 7:
        await award_badge_if_not_exists(user_id, '7 Day Streak')

    # Check for 10-hour grind badge (study time in last 24 hours)
    yesterday = datetime.utcnow() - timedelta(days=1)
    recent_sessions = [s for s in sessions if datetime.fromisoformat(s['created_at'].replace('Z', '+00:00')) > yesterday]
    total_recent_hours = sum(s['duration_minutes'] for s in recent_sessions) / 60.0
    if total_recent_hours >= 10:
        await award_badge_if_not_exists(user_id, '10 Hour Grind')

    # Check for first session badge
    if len(sessions) >= 1:
        await award_badge_if_not_exists(user_id, 'First Steps')

async def award_badge_if_not_exists(user_id: str, badge_title: str):
    # Check if user already has this badge
    existing = supabase.table('user_badges').select('id').eq('user_id', user_id).eq('badges.title', badge_title).execute()
    if existing.data:
        return

    # Get badge
    badge_result = supabase.table('badges').select('id').eq('title', badge_title).execute()
    if not badge_result.data:
        return

    badge_id = badge_result.data[0]['id']

    # Award badge
    supabase.table('user_badges').insert({
        'user_id': user_id,
        'badge_id': badge_id
    }).execute()

@api_router.post("/populate/dummy")
async def populate_dummy_data():
    # Create dummy users
    users = [
        {"username": "Alice", "email": "alice@example.com", "password_hash": hash_password("password")},
        {"username": "Bob", "email": "bob@example.com", "password_hash": hash_password("password")},
        {"username": "Charlie", "email": "charlie@example.com", "password_hash": hash_password("password")},
    ]

    user_ids = []
    for user in users:
        result = supabase.table('users').insert(user).execute()
        user_ids.append(result.data[0]['id'])

    # Create dummy spaces
    spaces = [
        {"name": "Math Study Group", "created_by": user_ids[0], "visibility": "public"},
        {"name": "Science Club", "created_by": user_ids[1], "visibility": "public"},
        {"name": "General Study", "created_by": user_ids[0], "visibility": "public"},
    ]

    space_ids = []
    for space in spaces:
        result = supabase.table('spaces').insert(space).execute()
        space_ids.append(result.data[0]['id'])

    # Add members to spaces
    members = [
        {"space_id": space_ids[0], "user_id": user_ids[0]},
        {"space_id": space_ids[0], "user_id": user_ids[1]},
        {"space_id": space_ids[1], "user_id": user_ids[1]},
        {"space_id": space_ids[1], "user_id": user_ids[2]},
        {"space_id": space_ids[2], "user_id": user_ids[0]},
        {"space_id": space_ids[2], "user_id": user_ids[1]},
        {"space_id": space_ids[2], "user_id": user_ids[2]},
    ]

    for member in members:
        supabase.table('space_members').insert(member).execute()

    # Create dummy sessions
    sessions = [
        {"user_id": user_ids[0], "space_id": space_ids[0], "duration_minutes": 60, "efficiency": 90.0, "created_at": (datetime.utcnow() - timedelta(days=1)).isoformat()},
        {"user_id": user_ids[0], "space_id": space_ids[0], "duration_minutes": 45, "efficiency": 85.0, "created_at": (datetime.utcnow() - timedelta(days=2)).isoformat()},
        {"user_id": user_ids[1], "space_id": space_ids[1], "duration_minutes": 50, "efficiency": 95.0, "created_at": (datetime.utcnow() - timedelta(days=1)).isoformat()},
        {"user_id": user_ids[1], "space_id": space_ids[1], "duration_minutes": 40, "efficiency": 88.0, "created_at": (datetime.utcnow() - timedelta(days=3)).isoformat()},
        {"user_id": user_ids[2], "space_id": space_ids[2], "duration_minutes": 30, "efficiency": 80.0, "created_at": (datetime.utcnow() - timedelta(days=1)).isoformat()},
    ]

    for session in sessions:
        supabase.table('study_sessions').insert(session).execute()

    return {"message": "Dummy data populated successfully"}

@api_router.post("/test/seed")
async def seed_test_data():
    try:
        # 1. Insert user
        user_result = supabase.table("users").insert([
            {"username": "test_user", "email": "test_user@example.com", "password_hash": "hashed123"}
        ]).select().single().execute()

        if user_result.error:
            raise Exception(f"User insert error: {user_result.error}")

        user = user_result.data

        # 2. Insert space
        space_result = supabase.table("spaces").insert([
            {"name": "Demo Project Space", "created_by": user['id'], "visibility": "public"}
        ]).select().single().execute()

        if space_result.error:
            raise Exception(f"Space insert error: {space_result.error}")

        space = space_result.data

        # 3. Add user to space_members
        member_result = supabase.table("space_members").insert([
            {"space_id": space['id'], "user_id": user['id']}
        ]).execute()

        if member_result.error:
            raise Exception(f"Space member insert error: {member_result.error}")

        # 4. Insert study session
        session_result = supabase.table("study_sessions").insert([
            {"space_id": space['id'], "user_id": user['id'], "duration_minutes": 45, "efficiency": 92.5}
        ]).execute()

        if session_result.error:
            raise Exception(f"Study session insert error: {session_result.error}")

        return {
            "success": True,
            "message": "Mock data inserted successfully",
            "user": user,
            "space": space
        }

    except Exception as e:
        return {
            "success": False,
            "error": str(e)
        }

@api_router.post("/test/insert-sample-data")
async def insert_sample_data():
    if supabase is None:
        return {
            "success": False,
            "error": "Supabase client not initialized. Check your environment variables."
        }

    try:
        # 1. Insert user
        user_result = supabase.table("users").insert([
            {
                "username": "john_doe",
                "email": "john@example.com",
                "password_hash": "superhashedpassword123"
            }
        ]).select().single().execute()

        if user_result.error:
            raise Exception(f"User insert error: {user_result.error}")

        user = user_result.data

        # 2. Insert space
        space_result = supabase.table("spaces").insert([
            {
                "name": "AP Study Sync Demo Space",
                "created_by": user['id'],
                "visibility": "public"
            }
        ]).select().single().execute()

        if space_result.error:
            raise Exception(f"Space insert error: {space_result.error}")

        space = space_result.data

        # 3. Link user to space
        member_result = supabase.table("space_members").insert([
            {
                "space_id": space['id'],
                "user_id": user['id']
            }
        ]).select().single().execute()

        if member_result.error:
            raise Exception(f"Space member insert error: {member_result.error}")

        member = member_result.data

        # 4. Insert study session
        session_result = supabase.table("study_sessions").insert([
            {
                "space_id": space['id'],
                "user_id": user['id'],
                "duration_minutes": 25,
                "efficiency": 87.3
            }
        ]).select().single().execute()

        if session_result.error:
            raise Exception(f"Study session insert error: {session_result.error}")

        session = session_result.data

        return {
            "success": True,
            "message": "Sample data successfully inserted",
            "user": user,
            "space": space,
            "member": member,
            "session": session
        }

    except Exception as e:
        return {
            "success": False,
            "error": str(e)
        }

# Initialize Gamification and Ranking Services
if supabase:
    try:
        # Initialize Gamification Service
        xp_service = XPService(supabase)
        gamification_router = create_gamification_routes(xp_service)
        app.include_router(gamification_router)
        print("Gamification system initialized successfully")
        
        # Initialize Ranking Service (Module D3)
        ranking_service = RankingService(supabase)
        ranking_router = create_ranking_routes(ranking_service)
        app.include_router(ranking_router)
        print("Ranking system (Module D3) initialized successfully")
        
        # Initialize Session Processing Routes (Unified Game Engine)
        app.include_router(session_bp)
        print("Session processing engine initialized successfully")
        
    except Exception as e:
        print(f"Failed to initialize gamification/ranking systems: {e}")
        print("Gamification and ranking features will not be available")
else:
    print("Cannot initialize gamification/ranking systems: Supabase client not available")

# Include the router in the main app
app.include_router(api_router)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

# Helper functions
def hash_password(password: str) -> str:
    return bcrypt.hashpw(password.encode('utf-8'), bcrypt.gensalt()).decode('utf-8')

def verify_password(password: str, hashed: str) -> bool:
    return bcrypt.checkpw(password.encode('utf-8'), hashed.encode('utf-8'))

def create_jwt_token(user_id: str) -> str:
    payload = {
        "user_id": user_id,
        "exp": datetime.utcnow() + timedelta(days=7)
    }
    return jwt.encode(payload, JWT_SECRET, algorithm="HS256")

def verify_jwt_token(token: str) -> Optional[str]:
    try:
        payload = jwt.decode(token, JWT_SECRET, algorithms=["HS256"])
        return payload.get("user_id")
    except jwt.ExpiredSignatureError:
        return None
    except jwt.InvalidTokenError:
        return None

async def update_user_stats(user_id: str, xp_gained: int, minutes_studied: int) -> bool:
    """Update user XP, level, and streak. Returns True if leveled up."""
    # Get current user data
    user_result = supabase_db.fetch_data('users', {'eq_id': user_id})
    if not user_result['success'] or not user_result['data']:
        return False

    user = user_result['data'][0]
    current_xp = user.get('xp', 0)
    current_level = user.get('level', 1)
    current_streak = user.get('streak_count', 0)

    new_xp = current_xp + xp_gained
    new_level = new_xp // 100 + 1  # Level up every 100 XP

    # Update streak (simplified - in real app would check consecutive days)
    new_streak = current_streak + 1

    update_result = supabase_db.update_data('users', {'eq_id': user_id}, {
        'xp': new_xp,
        'level': new_level,
        'streak_count': new_streak
    })

    return update_result['success'] and new_level > current_level

# Export the socket app for Uvicorn
app = socket_app

# Add bcrypt and jwt to requirements if not already there
# Note: These should be added to requirements.txt
# bcrypt==4.0.1
# PyJWT==2.8.0
