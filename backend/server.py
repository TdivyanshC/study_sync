from fastapi import FastAPI, APIRouter, HTTPException
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
from pathlib import Path
from pydantic import BaseModel, Field
from typing import List, Optional
import uuid
from datetime import datetime, timedelta
import socketio


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
    start_time: datetime = Field(default_factory=datetime.utcnow)
    end_time: Optional[datetime] = None
    duration: int = 0  # seconds
    is_active: bool = True
    is_break: bool = False
    subject: Optional[str] = None

class StudySessionCreate(BaseModel):
    user_id: str
    subject: Optional[str] = None

class StudySessionUpdate(BaseModel):
    duration: Optional[int] = None
    is_active: Optional[bool] = None
    is_break: Optional[bool] = None
    end_time: Optional[datetime] = None

# Socket.IO Events
@sio.event
async def connect(sid, environ):
    print(f"Client connected: {sid}")
    await sio.emit('connected', {'message': 'Connected to Study Together server'}, to=sid)

@sio.event
async def disconnect(sid):
    print(f"Client disconnected: {sid}")

@sio.event
async def join_room(sid, data):
    room = data.get('room', 'general')
    await sio.enter_room(sid, room)
    await sio.emit('room_joined', {'room': room}, to=sid)
    print(f"Client {sid} joined room {room}")

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
@api_router.post("/sessions", response_model=StudySession)
async def create_session(session_data: StudySessionCreate):
    session_dict = session_data.dict()
    session_obj = StudySession(**session_dict)
    
    # Store in database
    await db.study_sessions.insert_one(session_obj.dict())
    
    # Emit real-time notification
    await sio.emit('session_started', {
        'session_id': session_obj.id,
        'user_id': session_obj.user_id,
        'subject': session_obj.subject,
        'timestamp': session_obj.start_time.isoformat()
    })
    
    return session_obj

@api_router.put("/sessions/{session_id}", response_model=StudySession)
async def update_session(session_id: str, update_data: StudySessionUpdate):
    update_dict = {k: v for k, v in update_data.dict().items() if v is not None}
    
    if update_data.end_time:
        update_dict['end_time'] = update_data.end_time
    
    result = await db.study_sessions.update_one(
        {"id": session_id},
        {"$set": update_dict}
    )
    
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Session not found")
    
    updated_session = await db.study_sessions.find_one({"id": session_id})
    session_obj = StudySession(**updated_session)
    
    # Emit real-time update if session ended
    if update_data.is_active == False:
        await sio.emit('session_ended', {
            'session_id': session_obj.id,
            'user_id': session_obj.user_id,
            'duration': session_obj.duration,
            'timestamp': datetime.utcnow().isoformat()
        })
    
    return session_obj

@api_router.get("/sessions/{user_id}", response_model=List[StudySession])
async def get_user_sessions(user_id: str):
    sessions = await db.study_sessions.find({"user_id": user_id}).to_list(100)
    return [StudySession(**session) for session in sessions]

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
