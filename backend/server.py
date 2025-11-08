from fastapi import FastAPI, APIRouter, HTTPException
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
from pathlib import Path
from pydantic import BaseModel, Field, validator
from typing import List, Optional
import uuid
from datetime import datetime, timedelta
import socketio
from bson import ObjectId


ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# MongoDB connection
mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

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
    user_id: str
    subject: str
    duration_minutes: int
    efficiency: Optional[float] = None
    created_at: datetime = Field(default_factory=datetime.utcnow)

    class Config:
        allow_population_by_field_name = True
        json_encoders = {
            datetime: lambda v: v.isoformat()
        }

class SessionCreate(BaseModel):
    user_id: str
    subject: str
    duration_minutes: int
    efficiency: Optional[float] = None

class Profile(BaseModel):
    user_id: str
    username: str
    xp: int
    level: int
    streak: int
    total_hours: float
    efficiency: float
    achievements: List[str]

class StreakData(BaseModel):
    current_streak: int
    best_streak: int
    average_efficiency: float

class Space(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()), alias="_id")
    name: str
    description: str
    created_by: str
    members: List[str]
    created_at: datetime = Field(default_factory=datetime.utcnow)

class SpaceCreate(BaseModel):
    name: str
    description: str
    created_by: str

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
    # Save to db
    chat = SpaceChat(space_id=space_id, user_id=user_id, message=message)
    await db.space_chat.insert_one(chat.dict(by_alias=True))
    # Broadcast
    await sio.emit('new_message', {
        'space_id': space_id,
        'user_id': user_id,
        'message': message,
        'created_at': chat.created_at.isoformat()
    }, room=space_id)

@sio.event
async def activity_update(sid, data):
    space_id = data.get('space_id')
    user_id = data.get('user_id')
    action = data.get('action')
    progress = data.get('progress')
    # Save to db
    activity = SpaceActivity(space_id=space_id, user_id=user_id, action=action, progress=progress)
    await db.space_activity.insert_one(activity.dict(by_alias=True))
    # Broadcast
    await sio.emit('activity_received', {
        'space_id': space_id,
        'user_id': user_id,
        'action': action,
        'progress': progress,
        'created_at': activity.created_at.isoformat()
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
    _ = await db.status_checks.insert_one(status_obj.dict())
    return status_obj

@api_router.get("/status", response_model=List[StatusCheck])
async def get_status_checks():
    status_checks = await db.status_checks.find().to_list(1000)
    return [StatusCheck(**status_check) for status_check in status_checks]

# Study Session endpoints
@api_router.post("/sessions/add", response_model=StudySession)
async def add_session(session_data: SessionCreate):
    session = StudySession(
        user_id=session_data.user_id,
        subject=session_data.subject,
        duration_minutes=session_data.duration_minutes,
        efficiency=session_data.efficiency
    )
    await db.sessions.insert_one(session.dict(by_alias=True))
    return session

@api_router.get("/sessions/{user_id}")
async def get_user_sessions(user_id: str):
    sessions = await db.sessions.find({"user_id": user_id}).sort("created_at", -1).to_list(100)
    # Convert MongoDB documents to dictionaries with proper JSON serialization
    converted_sessions = []
    for session in sessions:
        session_dict = {k: str(v) if isinstance(v, ObjectId) else v for k, v in session.items()}
        converted_sessions.append(session_dict)
    return converted_sessions

# Streak endpoint
@api_router.get("/streaks/{user_id}", response_model=StreakData)
async def get_user_streaks(user_id: str):
    sessions = await db.sessions.find({"user_id": user_id}).sort("created_at", 1).to_list(1000)
    if not sessions:
        return StreakData(current_streak=0, best_streak=0, average_efficiency=0.0)
    
    # Get unique dates and efficiencies
    dates = set()
    efficiencies = []
    for session in sessions:
        dates.add(session['created_at'].date())
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

@api_router.get("/dashboard/{user_id}")
async def get_user_dashboard(user_id: str):
    # Fetch profile
    profile_doc = await db.profiles.find_one({"user_id": user_id})
    if not profile_doc:
        profile = {"user_id": user_id, "username": "Unknown", "xp": 0, "level": 1, "streak": 0, "total_hours": 0.0, "efficiency": 0.0, "achievements": []}
    else:
        # Convert ObjectId to string for JSON serialization
        profile = {k: str(v) if k == '_id' else v for k, v in profile_doc.items()}

    # Fetch streak data (reuse logic)
    sessions = await db.sessions.find({"user_id": user_id}).sort("created_at", 1).to_list(1000)
    if sessions:
        dates = set()
        efficiencies = []
        for session in sessions:
            dates.add(session['created_at'].date())
            if session.get('efficiency'):
                efficiencies.append(session['efficiency'])

        sorted_dates = sorted(dates)
        today = datetime.utcnow().date()

        # Best streak
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

        # Current streak
        current_streak = 0
        if sorted_dates:
            last_date = sorted_dates[-1]
            days_since_last = (today - last_date).days
            if days_since_last <= 1:
                streak = 1
                for i in range(len(sorted_dates) - 2, -1, -1):
                    if (sorted_dates[i+1] - sorted_dates[i]).days == 1:
                        streak += 1
                    else:
                        break
                current_streak = streak

        average_efficiency = sum(efficiencies) / len(efficiencies) if efficiencies else 0.0
        streak_data = {
            "current_streak": current_streak,
            "best_streak": best_streak,
            "average_efficiency": round(average_efficiency, 2)
        }
    else:
        streak_data = {"current_streak": 0, "best_streak": 0, "average_efficiency": 0.0}

    # Fetch active spaces
    spaces_cursor = db.spaces.find({"members": user_id}, {"_id": 1, "name": 1, "description": 1})
    spaces_docs = await spaces_cursor.to_list(100)
    # Convert ObjectId to string for JSON serialization
    spaces = [{k: str(v) if k == '_id' else v for k, v in space.items()} for space in spaces_docs]

    # Fetch last 3 sessions
    recent_sessions_cursor = db.sessions.find({"user_id": user_id}, {"_id": 1, "subject": 1, "duration_minutes": 1, "created_at": 1}).sort("created_at", -1).limit(3)
    recent_sessions_docs = await recent_sessions_cursor.to_list(3)
    # Convert ObjectId to string for JSON serialization
    recent_sessions = [{k: str(v) if k == '_id' else v for k, v in session.items()} for session in recent_sessions_docs]

    return {
        "profile": profile,
        "streak": streak_data,
        "spaces": spaces,
        "recent_sessions": recent_sessions
    }

# Space endpoints
@api_router.post("/spaces/create", response_model=Space)
async def create_space(space_data: SpaceCreate):
    space = Space(
        name=space_data.name,
        description=space_data.description,
        created_by=space_data.created_by,
        members=[space_data.created_by]
    )
    await db.spaces.insert_one(space.dict(by_alias=True))
    return space

@api_router.post("/spaces/{space_id}/join")
async def join_space(space_id: str, join_data: SpaceJoin):
    space = await db.spaces.find_one({"_id": space_id})
    if not space:
        raise HTTPException(status_code=404, detail="Space not found")
    if join_data.user_id in space['members']:
        return {"message": "Already a member"}
    await db.spaces.update_one(
        {"_id": space_id},
        {"$push": {"members": join_data.user_id}}
    )
    return {"message": "Joined successfully"}

@api_router.get("/spaces/{user_id}", response_model=List[Space])
async def get_user_spaces(user_id: str):
    spaces = await db.spaces.find({"members": user_id}).to_list(100)
    return [Space(**space) for space in spaces]

@api_router.post("/spaces/{space_id}/activity", response_model=SpaceActivity)
async def log_space_activity(space_id: str, activity_data: SpaceActivityCreate):
    activity = SpaceActivity(
        space_id=space_id,
        user_id=activity_data.user_id,
        action=activity_data.action,
        progress=activity_data.progress
    )
    await db.space_activity.insert_one(activity.dict(by_alias=True))
    return activity

@api_router.get("/spaces/{space_id}/activity", response_model=List[SpaceActivity])
async def get_space_activity(space_id: str):
    activities = await db.space_activity.find({"space_id": space_id}).sort("created_at", -1).limit(20).to_list(20)
    return [SpaceActivity(**activity) for activity in activities]

@api_router.post("/spaces/{space_id}/chat", response_model=SpaceChat)
async def send_chat_message(space_id: str, chat_data: SpaceChatCreate):
    chat = SpaceChat(
        space_id=space_id,
        user_id=chat_data.user_id,
        message=chat_data.message
    )
    await db.space_chat.insert_one(chat.dict(by_alias=True))
    return chat

@api_router.get("/spaces/{space_id}/chat", response_model=List[SpaceChat])
async def get_space_chat(space_id: str):
    messages = await db.space_chat.find({"space_id": space_id}).sort("created_at", -1).limit(20).to_list(20)
    return [SpaceChat(**msg) for msg in messages]

# Profile endpoints
@api_router.post("/profiles/dummy", response_model=Profile)
async def create_dummy_profile():
    dummy_profile = Profile(
        user_id="dummy_user_123",
        username="DummyUser",
        xp=100,
        level=5,
        streak=7,
        total_hours=25.5,
        efficiency=85.2,
        achievements=["First Study Session", "Week Streak"]
    )
    await db.profiles.insert_one(dummy_profile.dict())
    return dummy_profile

@api_router.get("/profiles/{user_id}", response_model=Profile)
async def get_profile(user_id: str):
    profile = await db.profiles.find_one({"user_id": user_id})
    if not profile:
        raise HTTPException(status_code=404, detail="Profile not found")
    return Profile(**profile)

@api_router.post("/populate/dummy")
async def populate_dummy_data():
    # Dummy profiles
    profiles = [
        Profile(user_id="user1", username="Alice", xp=150, level=6, streak=8, total_hours=30.5, efficiency=88.0, achievements=["First Session", "Week Streak"]),
        Profile(user_id="user2", username="Bob", xp=200, level=8, streak=12, total_hours=45.0, efficiency=92.0, achievements=["Month Streak", "High Efficiency"]),
        Profile(user_id="user3", username="Charlie", xp=100, level=5, streak=5, total_hours=20.0, efficiency=85.0, achievements=["First Achievement"]),
    ]
    for profile in profiles:
        await db.profiles.insert_one(profile.dict())
    
    # Dummy spaces
    spaces = [
        Space(name="Math Study Group", description="Group for math enthusiasts", created_by="user1", members=["user1", "user2"]),
        Space(name="Science Club", description="Discussing science topics", created_by="user2", members=["user2", "user3"]),
        Space(name="General Study", description="All subjects welcome", created_by="user1", members=["user1", "user2", "user3"]),
    ]
    for space in spaces:
        await db.spaces.insert_one(space.dict(by_alias=True))
    
    # Dummy sessions
    sessions = [
        StudySession(user_id="user1", subject="Math", duration_minutes=60, efficiency=90.0, created_at=datetime.utcnow() - timedelta(days=1)),
        StudySession(user_id="user1", subject="Physics", duration_minutes=45, efficiency=85.0, created_at=datetime.utcnow() - timedelta(days=2)),
        StudySession(user_id="user2", subject="Chemistry", duration_minutes=50, efficiency=95.0, created_at=datetime.utcnow() - timedelta(days=1)),
        StudySession(user_id="user2", subject="Biology", duration_minutes=40, efficiency=88.0, created_at=datetime.utcnow() - timedelta(days=3)),
        StudySession(user_id="user3", subject="History", duration_minutes=30, efficiency=80.0, created_at=datetime.utcnow() - timedelta(days=1)),
    ]
    for session in sessions:
        await db.sessions.insert_one(session.dict())
    
    return {"message": "Dummy data populated successfully"}

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

@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()

# Export the socket app for Uvicorn
app = socket_app
