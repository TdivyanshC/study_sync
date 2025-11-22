from fastapi import FastAPI, APIRouter, HTTPException, Query, Request
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from supabase import create_client, Client
import os
import logging
from pathlib import Path

# Try to import PUBLIC_BASE_URL from main.py if available
try:
    from main import PUBLIC_BASE_URL
except ImportError:
    # Fallback if main.py is not available
    PUBLIC_BASE_URL = os.environ.get('PUBLIC_BASE_URL', 'http://127.0.0.1:8000')
from pydantic import BaseModel, Field
from typing import List, Optional
import uuid
from datetime import datetime, timedelta, date
import socketio
import bcrypt
import jwt
from services.supabase_db import supabase_db

# Import validation and error handling components
from utils.error_classes import *
from utils.validation_schemas import *
from utils.security_validation import SecurityValidator, global_rate_limiter
from utils.security_hardening import (
    InputValidationEngine, AuthenticationManager, APIKeyManager, 
    SecurityHeadersManager, ThreatDetectionEngine
)
from middleware.error_handler import (
    ErrorHandlerMiddleware, 
    RequestValidationMiddleware, 
    RateLimitMiddleware,
    setup_error_handlers
)
from services.validation_service import DatabaseValidationService

# Import gamification components
from services.gamification.xp_service import XPService
from services.gamification.ranking_service import RankingService
from services.gamification.badge_service import BadgeService
from routes.gamification_routes import create_gamification_routes
from routes.ranking_routes import create_ranking_routes
from routes.badge_routes import create_badge_routes
from routes.session_routes import session_router
from routes.tunnel import tunnel_router

# Import monitoring components (Phase 6.2)
from utils.monitoring_service import monitoring_service
from middleware.monitoring_middleware import setup_monitoring_middleware, health_check_detailed
from routes.monitoring_routes import create_monitoring_routes


ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

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

# JWT secret - Enhanced security configuration
JWT_SECRET = os.environ.get('JWT_SECRET')
if not JWT_SECRET or len(JWT_SECRET) < 32:
    # Generate secure secret if not provided or weak
    import secrets
    JWT_SECRET = secrets.token_urlsafe(64)
    print("WARNING: Generated secure JWT secret for development. Set JWT_SECRET in production!")

# Initialize Security Components
authentication_manager = AuthenticationManager(JWT_SECRET)
api_key_manager = APIKeyManager()
threat_detector = ThreatDetectionEngine()
security_headers_manager = SecurityHeadersManager()

# Socket.IO server
sio = socketio.AsyncServer(
    cors_allowed_origins="*",
    async_mode='asgi'
)

# Create the main app without a prefix
app = FastAPI(
    title="StudySync API",
    description="StudySync backend API with comprehensive validation and error handling",
    version="1.0.0"
)

# Create a router with the /api prefix
api_router = APIRouter(prefix="/api")

# Socket.IO app
socket_app = socketio.ASGIApp(sio, app)

# Initialize validation service
validation_service = DatabaseValidationService(supabase_db)

# Setup error handlers
setup_error_handlers(app)

# Add enhanced security middleware
app.add_middleware(ErrorHandlerMiddleware, include_traceback=False)
app.add_middleware(RequestValidationMiddleware)
app.add_middleware(RateLimitMiddleware, requests_per_minute=100, requests_per_hour=1000)

# Add security headers middleware
@app.middleware("http")
async def add_security_headers(request, call_next):
    response = await call_next(request)
    security_headers = security_headers_manager.get_security_headers()
    for header, value in security_headers.items():
        response.headers[header] = value
    return response

# Add threat detection middleware
@app.middleware("http")
async def threat_detection_middleware(request, call_next):
    # Get client information
    client_ip = request.client.host if request.client else "unknown"
    user_agent = request.headers.get("User-Agent", "")
    
    # Analyze request for threats
    request_data = {
        "path": request.url.path,
        "method": request.method,
        "headers": dict(request.headers),
        "query_params": dict(request.query_params)
    }
    
    threat_analysis = threat_detector.analyze_request_patterns(
        client_ip, request_data, user_agent
    )
    
    # Log threat detection
    if threat_analysis['threat_level'] in ['medium', 'high']:
        logger.warning(f"Threat detected from {client_ip}: {threat_analysis}")
    
    # Continue processing (could add blocking logic here)
    response = await call_next(request)
    return response


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
    space_id: str
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

class TodayMetrics(BaseModel):
    session_id: Optional[str] = None
    total_focus_time: int
    tasks_completed: int

# Socket.IO Events and Room Management
# Track connected users and their rooms
connected_users = {}  # sid -> {user_id, spaces, last_seen}
user_sockets = {}     # user_id -> [sids]
space_users = {}      # space_id -> {user_id: sid}

@sio.event
async def connect(sid, environ):
    print(f"Client connected: {sid}")
    connected_users[sid] = {
        'user_id': None,
        'spaces': set(),
        'last_seen': datetime.utcnow(),
        'status': 'online'
    }
    await sio.emit('connected', {
        'message': 'Connected to Study Together server',
        'sid': sid,
        'timestamp': datetime.utcnow().isoformat()
    }, to=sid)

@sio.event
async def disconnect(sid):
    print(f"Client disconnected: {sid}")
    
    # Clean up user from spaces
    if sid in connected_users:
        user_data = connected_users[sid]
        user_id = user_data.get('user_id')
        spaces = user_data.get('spaces', set())
        
        # Remove from space users tracking
        for space_id in spaces:
            if space_id in space_users and user_id in space_users[space_id]:
                del space_users[space_id][user_id]
                # Broadcast user left space
                await sio.emit('user_left_space', {
                    'space_id': space_id,
                    'user_id': user_id,
                    'timestamp': datetime.utcnow().isoformat()
                }, room=space_id)
        
        # Remove from user sockets tracking
        if user_id and user_id in user_sockets:
            user_sockets[user_id] = [s for s in user_sockets[user_id] if s != sid]
            if not user_sockets[user_id]:
                del user_sockets[user_id]
        
        del connected_users[sid]

@sio.event
async def authenticate_user(sid, data):
    """Authenticate user and establish identity"""
    try:
        token = data.get('token')
        user_id = verify_jwt_token(token)
        
        if not user_id:
            await sio.emit('auth_error', {'message': 'Invalid token'}, to=sid)
            return False
        
        # Update user tracking
        if sid in connected_users:
            connected_users[sid]['user_id'] = user_id
            connected_users[sid]['last_seen'] = datetime.utcnow()
            
            if user_id not in user_sockets:
                user_sockets[user_id] = []
            user_sockets[user_id].append(sid)
        
        await sio.emit('authenticated', {
            'user_id': user_id,
            'message': 'Authentication successful'
        }, to=sid)
        
        print(f"User {user_id} authenticated on socket {sid}")
        return True
        
    except Exception as e:
        print(f"Authentication error for {sid}: {e}")
        await sio.emit('auth_error', {'message': 'Authentication failed'}, to=sid)
        return False

@sio.event
async def join_space(sid, data):
    """Join a study space and track presence"""
    try:
        space_id = data.get('space_id')
        user_id = data.get('user_id')
        
        if not space_id or not user_id:
            await sio.emit('error', {'message': 'Missing space_id or user_id'}, to=sid)
            return
        
        # Join the socket room
        await sio.enter_room(sid, space_id)
        
        # Update tracking data
        if sid in connected_users:
            connected_users[sid]['spaces'].add(space_id)
            connected_users[sid]['user_id'] = user_id
            connected_users[sid]['last_seen'] = datetime.utcnow()
        
        # Track space users
        if space_id not in space_users:
            space_users[space_id] = {}
        space_users[space_id][user_id] = sid
        
        # Add user to tracking if not exists
        if user_id not in user_sockets:
            user_sockets[user_id] = []
        if sid not in user_sockets[user_id]:
            user_sockets[user_id].append(sid)
        
        # Get online users in this space
        online_users = list(space_users[space_id].keys())
        
        # Broadcast to room that user joined
        await sio.emit('user_joined_space', {
            'space_id': space_id,
            'user_id': user_id,
            'timestamp': datetime.utcnow().isoformat()
        }, room=space_id)
        
        # Send confirmation to user
        await sio.emit('space_joined', {
            'space_id': space_id,
            'online_users': online_users,
            'message': f'Successfully joined space {space_id}'
        }, to=sid)
        
        print(f"User {user_id} joined space {space_id}")
        
    except Exception as e:
        print(f"Error joining space: {e}")
        await sio.emit('error', {'message': 'Failed to join space'}, to=sid)

@sio.event
async def heartbeat(sid, data):
    """Handle heartbeat to maintain connection and update last seen"""
    try:
        if sid in connected_users:
            connected_users[sid]['last_seen'] = datetime.utcnow()
            connected_users[sid]['status'] = 'online'
        
        await sio.emit('heartbeat_ack', {
            'timestamp': datetime.utcnow().isoformat()
        }, to=sid)
        
    except Exception as e:
        print(f"Error handling heartbeat: {e}")

@sio.event
async def send_message(sid, data):
    """Send a message to a space with real-time delivery"""
    try:
        space_id = data.get('space_id')
        user_id = data.get('user_id')
        message = data.get('message')
        
        if not all([space_id, user_id, message]):
            await sio.emit('error', {'message': 'Missing required fields'}, to=sid)
            return
        
        # Sanitize message content
        sanitized_message = InputValidationEngine.validate_and_sanitize_input(
            message, 'message', {'max_length': 1000}
        )
        
        # Save to Supabase
        chat = SpaceChat(space_id=space_id, user_id=user_id, message=sanitized_message)
        result = supabase.table('space_chat').insert(chat.dict()).execute()
        saved_chat = result.data[0]
        
        # Get user info for message metadata
        user_result = supabase.table('users').select('username').eq('id', user_id).execute()
        username = user_result.data[0]['username'] if user_result.data else 'Unknown'
        
        # Broadcast to all users in the space
        message_data = {
            'id': saved_chat['id'],
            'space_id': space_id,
            'user_id': user_id,
            'username': username,
            'message': sanitized_message,
            'created_at': saved_chat['created_at'],
            'timestamp': datetime.utcnow().isoformat()
        }
        
        await sio.emit('new_message', message_data, room=space_id)
        
        print(f"Message sent in space {space_id} by user {user_id}")
        
    except Exception as e:
        print(f"Error sending message: {e}")
        await sio.emit('error', {'message': 'Failed to send message'}, to=sid)

# Track active study sessions
active_sessions = {}  # session_id -> {user_id, space_id, start_time, duration, subject}

@sio.event
async def session_started(sid, data):
    """Broadcast when a user starts a study session"""
    try:
        session_id = data.get('session_id')
        user_id = data.get('user_id')
        space_id = data.get('space_id')
        subject = data.get('subject', 'General Study')
        duration = data.get('duration', 25)  # minutes
        
        if not session_id or not user_id:
            await sio.emit('error', {'message': 'Missing session_id or user_id'}, to=sid)
            return
        
        # Track active session
        active_sessions[session_id] = {
            'user_id': user_id,
            'space_id': space_id,
            'start_time': datetime.utcnow(),
            'duration': duration,
            'subject': subject,
            'status': 'active'
        }
        
        # Broadcast to space or all users if no space
        session_data = {
            'session_id': session_id,
            'user_id': user_id,
            'space_id': space_id,
            'subject': subject,
            'duration': duration,
            'timestamp': datetime.utcnow().isoformat()
        }
        
        if space_id and space_id in space_users:
            await sio.emit('user_started_session', session_data, room=space_id)
        else:
            await sio.emit('user_started_session', session_data)
        
        print(f"User {user_id} started session {session_id}")
        
    except Exception as e:
        print(f"Error handling session start: {e}")

@sio.event
async def session_stopped(sid, data):
    """Broadcast when a user stops a study session"""
    try:
        session_id = data.get('session_id')
        actual_duration = data.get('actual_duration', 0)
        completed = data.get('completed', False)
        
        if not session_id or session_id not in active_sessions:
            return
        
        session_data = active_sessions[session_id]
        user_id = session_data['user_id']
        
        # Broadcast session end
        end_data = {
            'session_id': session_id,
            'user_id': user_id,
            'space_id': session_data['space_id'],
            'actual_duration': actual_duration,
            'completed': completed,
            'timestamp': datetime.utcnow().isoformat()
        }
        
        if session_data['space_id'] and session_data['space_id'] in space_users:
            await sio.emit('user_stopped_session', end_data, room=session_data['space_id'])
        else:
            await sio.emit('user_stopped_session', end_data)
        
        # Remove from active sessions
        del active_sessions[session_id]
        
        print(f"User {user_id} stopped session {session_id}")
        
    except Exception as e:
        print(f"Error handling session stop: {e}")


# API Routes
@api_router.get("/")
async def root():
    return {"message": "StudySync API"}

@api_router.get("/health")
async def health():
    """
    Health check endpoint for backend connectivity
    """
    try:
        # Check database connectivity
        db_status = "connected"
        if supabase:
            try:
                result = supabase.table('users').select('id').limit(1).execute()
                db_status = "connected" if result.data is not None else "error"
            except Exception as e:
                db_status = f"error: {str(e)}"
        else:
            db_status = "not_configured"

        return {
            "status": "ok",
            "timestamp": datetime.utcnow().isoformat(),
            "database": db_status,
            "services": ["backend", "api", "gamification"],
            "uptime": "healthy",
            "version": "1.0.0"
        }
    except Exception as e:
        return {
            "status": "error", 
            "timestamp": datetime.utcnow().isoformat(),
            "database": "unreachable",
            "services": ["backend"],
            "uptime": "degraded",
            "version": "1.0.0",
            "error": str(e)
        }

@api_router.post("/auth/signup")
async def signup(user_data: UserSignup):
    try:
        # Enhanced input validation with security hardening
        validated_username = InputValidationEngine.validate_and_sanitize_input(
            user_data.username, 'username', 
            validation_rules={'max_length': 50, 'min_length': 3}
        )
        validated_email = InputValidationEngine.validate_and_sanitize_input(
            user_data.email, 'email',
            validation_rules={'max_length': 255}
        )
        
        # Validate email format
        import re
        email_pattern = r'^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$'
        if not re.match(email_pattern, validated_email):
            raise ValidationError("Invalid email format", field="email")
        
        # Enhanced password validation
        is_valid_password, password_errors = authentication_manager.validate_password_strength(
            user_data.password
        )
        if not is_valid_password:
            raise ValidationError(
                "Password does not meet security requirements",
                field="password",
                details={"errors": password_errors}
            )
        
        # Check if user already exists (prevent enumeration)
        existing_result = await supabase_db.fetch_data('users', {'eq_email': validated_email})
        if existing_result['success'] and existing_result['data']:
            # Use generic error message to prevent user enumeration
            return {
                "success": False,
                "message": "An account with this email already exists",
                "data": None
            }

        # Check username uniqueness
        existing_username = await supabase_db.fetch_data('users', {'eq_username': validated_username})
        if existing_username['success'] and existing_username['data']:
            return {
                "success": False,
                "message": "Username is already taken",
                "data": None
            }

        # Hash password using enhanced security
        hashed_password = authentication_manager.hash_password(user_data.password)
        user_dict = {
            "username": validated_username,
            "email": validated_email,
            "password_hash": hashed_password
        }

        result = await supabase_db.insert_data('users', user_dict)
        if not result['success']:
            raise DatabaseError(
                f"Failed to create user: {result['message']}",
                operation="insert",
                table="users"
            )

        user = result['data'][0] if result['data'] else None
        if not user:
            raise DatabaseError("Failed to create user - no data returned")

        # Create enhanced JWT token
        token = authentication_manager.create_jwt_token(
            user['id'], 
            additional_claims={"username": user['username'], "email": user['email']}
        )

        logger.info(f"User created successfully: {validated_email}")
        
        return {
            "success": True,
            "message": "User created successfully",
            "data": {
                "token": token,
                "user": {"id": user['id'], "username": user['username'], "email": user['email']}
            }
        }

    except (ValidationError, DatabaseError):
        raise
    except Exception as e:
        logger.error(f"Unexpected error in signup: {str(e)}")
        raise DatabaseError(
            f"Unexpected error during user signup: {str(e)}",
            operation="user_signup"
        )

@api_router.post("/auth/login")
async def login(user_data: UserLogin):
    try:
        # Enhanced input validation
        validated_email = InputValidationEngine.validate_and_sanitize_input(
            user_data.email, 'email', 
            validation_rules={'max_length': 255}
        )
        
        # Find user by email
        result = supabase_db.fetch_data('users', {'eq_email': validated_email})
        if not result['success'] or not result['data']:
            # Use generic error message to prevent user enumeration
            return {
                "success": False,
                "message": "Invalid credentials",
                "data": None
            }

        user = result['data'][0]

        # Verify password using enhanced security
        if not authentication_manager.verify_password(user_data.password, user['password_hash']):
            return {
                "success": False,
                "message": "Invalid credentials",
                "data": None
            }

        # Create enhanced JWT token
        token = authentication_manager.create_jwt_token(
            user['id'],
            additional_claims={"username": user['username'], "email": user['email']}
        )

        return {
            "success": True,
            "message": "Login successful",
            "data": {
                "token": token,
                "user": {"id": user['id'], "username": user['username'], "email": user['email']}
            }
        }
        
    except Exception as e:
        logger.error(f"Unexpected error in login: {str(e)}")
        return {
            "success": False,
            "message": "An error occurred during login",
            "data": None
        }

# Study Session endpoints
@api_router.post("/session/start")
async def start_session(session_data: SessionCreate):
    try:
        # Enhanced validation
        if session_data.space_id:
            session_data.space_id = InputValidationEngine.validate_and_sanitize_input(
                session_data.space_id, 'space_id'
            )
        
        # Business logic validation
        if session_data.duration_minutes > 1440:  # 24 hours
            raise ValidationError(
                "Session duration cannot exceed 24 hours",
                field="duration_minutes",
                value=session_data.duration_minutes
            )
        
        # Check if user exists
        user_check = await supabase_db.fetch_data('users', {
            'eq_id': session_data.user_id
        })
        
        if not user_check['success'] or not user_check['data']:
            raise NotFoundError("User", session_data.user_id)
        
        # Check space if provided
        if session_data.space_id:
            space_check = await supabase_db.fetch_data('spaces', {
                'eq_id': session_data.space_id
            })
            
            if not space_check['success'] or not space_check['data']:
                raise NotFoundError("Space", session_data.space_id)
        
        # Insert session
        session_dict = {
            "space_id": session_data.space_id,
            "user_id": session_data.user_id,
            "duration_minutes": session_data.duration_minutes,
            "efficiency": session_data.efficiency
        }

        result = await supabase_db.insert_data('study_sessions', session_dict)
        if not result['success']:
            raise DatabaseError(
                f"Failed to create session: {result['message']}",
                operation="insert",
                table="study_sessions"
            )

        logger.info(f"Study session created: {session_data.user_id}")
        
        return {
            "success": True,
            "message": "Study session started successfully",
            "data": result['data'][0] if result['data'] else None
        }

    except (ValidationError, NotFoundError, DatabaseError):
        raise
    except Exception as e:
        logger.error(f"Unexpected error in start_session: {str(e)}")
        raise DatabaseError(
            f"Unexpected error during session creation: {str(e)}",
            operation="start_session"
        )

@api_router.post("/session/confirm")
async def confirm_session(session_id: str, user_id: str):
    try:
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
        
    except Exception as e:
        logger.error(f"Error in confirm_session: {str(e)}")
        return {
            "success": False,
            "message": "An error occurred while confirming session",
            "data": None
        }

@api_router.post("/session/end")
async def end_session(session_id: str, duration_minutes: int, efficiency: Optional[float] = None):
    try:
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
        
    except Exception as e:
        logger.error(f"Error in end_session: {str(e)}")
        return {
            "success": False,
            "message": "An error occurred while ending session",
            "data": None
        }

@api_router.get("/sessions/{user_id}")
async def get_user_sessions(user_id: str):
    try:
        # Validate user_id
        InputValidationEngine.validate_and_sanitize_input(user_id, 'user_id')
        
        result = supabase.table('study_sessions').select('*').eq('user_id', user_id).order('created_at', desc=True).limit(100).execute()
        return result.data
    except Exception as e:
        logger.error(f"Error getting user sessions: {str(e)}")
        return []

# Metrics endpoint
@api_router.get("/metrics/today", response_model=TodayMetrics)
async def get_today_metrics(user_id: str = Query(..., description="User ID to fetch metrics for")):
    """
    Get today's study metrics for a user.
    Returns session_id, total_focus_time, and tasks_completed for today's sessions.
    """
    try:
        logger.debug(f"Fetching today's metrics for user: {user_id}")
        
        # Validate user_id format (should be UUID)
        import uuid
        try:
            uuid.UUID(user_id)
        except (ValueError, TypeError):
            logger.warning(f"Invalid UUID format provided: {user_id}")
            # Return empty metrics for invalid user ID format
            return TodayMetrics(
                session_id=None,
                total_focus_time=0,
                tasks_completed=0
            )
        
        # Get today's date in UTC
        today = datetime.utcnow().date()
        today_start = datetime.combine(today, datetime.min.time())
        today_end = datetime.combine(today, datetime.max.time())
        
        try:
            # Query sessions for today
            result = supabase.table('study_sessions').select('id, duration_minutes, created_at').eq('user_id', user_id).gte('created_at', today_start.isoformat()).lte('created_at', today_end.isoformat()).order('created_at', desc=True).execute()
            
            sessions = result.data if result.data else []
            
        except Exception as db_error:
            logger.error(f"Database error fetching sessions for user {user_id}: {db_error}")
            # Return empty metrics on database errors instead of crashing
            return TodayMetrics(
                session_id=None,
                total_focus_time=0,
                tasks_completed=0
            )
        
        if not sessions:
            return TodayMetrics(
                session_id=None,
                total_focus_time=0,
                tasks_completed=0
            )
        
        # Calculate total focus time (sum of all session durations)
        total_focus_time = sum(session['duration_minutes'] for session in sessions)
        
        # Get the most recent session ID
        latest_session_id = sessions[0]['id'] if sessions else None
        
        # For now, we'll assume 1 task completed per session
        # In a real implementation, you might track tasks separately
        tasks_completed = len(sessions)
        
        logger.debug(f"Found {len(sessions)} sessions for user {user_id}, total focus time: {total_focus_time} minutes")
        
        return TodayMetrics(
            session_id=latest_session_id,
            total_focus_time=total_focus_time,
            tasks_completed=tasks_completed
        )
        
    except Exception as e:
        logger.error(f"Error fetching today's metrics for user {user_id}: {e}")
        # Return empty metrics instead of crashing on unexpected errors
        return TodayMetrics(
            session_id=None,
            total_focus_time=0,
            tasks_completed=0
        )

# Streak endpoint
@api_router.get("/streaks/{user_id}", response_model=StreakData)
async def get_user_streaks(user_id: str):
    try:
        # Validate user_id
        InputValidationEngine.validate_and_sanitize_input(user_id, 'user_id')
        
        result = supabase.table('study_sessions').select('created_at, efficiency').eq('user_id', user_id).order('created_at').execute()
        sessions = result.data if result.data else []

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
        
    except Exception as e:
        logger.error(f"Error calculating user streaks: {str(e)}")
        return StreakData(current_streak=0, best_streak=0, average_efficiency=0.0)

@api_router.get("/profile/{user_id}")
async def get_user_profile(user_id: str):
    try:
        # Validate user_id
        InputValidationEngine.validate_and_sanitize_input(user_id, 'user_id')
        
        # Get user data
        user_result = supabase.table('users').select('*').eq('id', user_id).execute()
        if not user_result.data:
            raise HTTPException(status_code=404, detail="User not found")
        user = user_result.data[0]

        # Calculate stats from study sessions
        sessions_result = supabase.table('study_sessions').select('duration_minutes, efficiency, created_at').eq('user_id', user_id).execute()
        sessions = sessions_result.data if sessions_result.data else []

        total_hours = sum(session['duration_minutes'] for session in sessions) / 60.0
        total_efficiency = sum(session['efficiency'] for session in sessions if session['efficiency']) if sessions else 0
        avg_efficiency = total_efficiency / len([s for s in sessions if s['efficiency']]) if sessions else 0

        # Calculate level and XP (simple formula)
        xp = int(total_hours * 10)  # 10 XP per hour
        level = xp // 100 + 1  # Level up every 100 XP

        # Get user badges
        badges_result = supabase.table('user_badges').select('badges(*)').eq('user_id', user_id).execute()
        badges = [item['badges'] for item in badges_result.data] if badges_result.data else []

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
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error getting user profile: {str(e)}")
        raise HTTPException(status_code=500, detail="Internal server error")

@api_router.get("/dashboard/{user_id}")
async def get_user_dashboard(user_id: str):
    try:
        # Validate user_id
        InputValidationEngine.validate_and_sanitize_input(user_id, 'user_id')
        
        # Get profile
        profile = await get_user_profile(user_id)

        # Get streak data
        streak = await get_user_streaks(user_id)

        # Get spaces
        spaces_result = supabase.table('space_members').select('spaces(*)').eq('user_id', user_id).execute()
        spaces = [item['spaces'] for item in spaces_result.data] if spaces_result.data else []

        # Get recent sessions
        sessions_result = supabase.table('study_sessions').select('*').eq('user_id', user_id).order('created_at', desc=True).limit(3).execute()
        recent_sessions = sessions_result.data if sessions_result.data else []

        return {
            "profile": profile,
            "streak": streak.dict(),
            "spaces": spaces,
            "recent_sessions": recent_sessions
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error getting user dashboard: {str(e)}")
        raise HTTPException(status_code=500, detail="Internal server error")

# Space endpoints
@api_router.post("/spaces/create")
async def create_space(space_data: SpaceCreate):
    try:
        # Enhanced input validation
        validated_name = InputValidationEngine.validate_and_sanitize_input(
            space_data.name, 'name', 
            validation_rules={'max_length': 100, 'min_length': 1}
        )
        
        space_dict = {
            "name": validated_name,
            "created_by": space_data.created_by,
            "visibility": space_data.visibility
        }

        result = await supabase_db.insert_data('spaces', space_dict)
        if not result['success']:
            return result

        space_data_response = result['data'][0]

        # Add creator to space_members
        member_dict = {
            'space_id': space_data_response['id'],
            'user_id': space_data_response['created_by']
        }
        member_result = await supabase_db.insert_data('space_members', member_dict)
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
        
    except Exception as e:
        logger.error(f"Error creating space: {str(e)}")
        return {
            "success": False,
            "message": "An error occurred while creating space",
            "data": None
        }

@api_router.post("/spaces/join")
async def join_space(join_data: SpaceJoin):
    try:
        # Enhanced input validation
        validated_space_id = InputValidationEngine.validate_and_sanitize_input(
            join_data.space_id, 'space_id'
        )
        
        # Check if space exists
        space_result = supabase_db.fetch_data('spaces', {'eq_id': validated_space_id})
        if not space_result['success'] or not space_result['data']:
            return {
                "success": False,
                "message": "Space not found",
                "data": None
            }

        space = space_result['data'][0]

        # Check if already a member
        member_result = supabase_db.fetch_data('space_members', {
            'eq_space_id': validated_space_id,
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
            'space_id': validated_space_id,
            'user_id': join_data.user_id
        }
        insert_result = await supabase_db.insert_data('space_members', member_dict)
        if not insert_result['success']:
            return insert_result

        # Update member count
        update_result = supabase_db.update_data('spaces',
            {'eq_id': validated_space_id},
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
        
    except Exception as e:
        logger.error(f"Error joining space: {str(e)}")
        return {
            "success": False,
            "message": "An error occurred while joining space",
            "data": None
        }

@api_router.get("/spaces/{user_id}", response_model=List[Space])
async def get_user_spaces(user_id: str):
    try:
        # Validate user_id
        InputValidationEngine.validate_and_sanitize_input(user_id, 'user_id')
        
        result = supabase.table('space_members').select('spaces(*)').eq('user_id', user_id).execute()
        return [Space(**item['spaces']) for item in result.data] if result.data else []
    except Exception as e:
        logger.error(f"Error getting user spaces: {str(e)}")
        return []

@api_router.post("/spaces/{space_id}/activity", response_model=SpaceActivity)
async def log_space_activity(space_id: str, activity_data: SpaceActivityCreate):
    try:
        # Enhanced input validation
        validated_space_id = InputValidationEngine.validate_and_sanitize_input(space_id, 'space_id')
        validated_user_id = InputValidationEngine.validate_and_sanitize_input(
            activity_data.user_id, 'user_id'
        )
        validated_action = InputValidationEngine.validate_and_sanitize_input(
            activity_data.action, 'action', 
            validation_rules={'max_length': 200}
        )
        
        activity = SpaceActivity(
            space_id=validated_space_id,
            user_id=validated_user_id,
            action=validated_action,
            progress=activity_data.progress
        )
        result = supabase.table('space_activity').insert(activity.dict()).execute()
        return SpaceActivity(**result.data[0]) if result.data else None
    except Exception as e:
        logger.error(f"Error logging space activity: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to log activity")

@api_router.get("/spaces/{space_id}/activity", response_model=List[SpaceActivity])
async def get_space_activity(space_id: str):
    try:
        # Validate space_id
        InputValidationEngine.validate_and_sanitize_input(space_id, 'space_id')
        
        result = supabase.table('space_activity').select('*').eq('space_id', space_id).order('created_at', desc=True).limit(20).execute()
        return [SpaceActivity(**item) for item in result.data] if result.data else []
    except Exception as e:
        logger.error(f"Error getting space activity: {str(e)}")
        return []

@api_router.post("/spaces/{space_id}/chat", response_model=SpaceChat)
async def send_chat_message(space_id: str, chat_data: SpaceChatCreate):
    try:
        # Enhanced input validation
        validated_space_id = InputValidationEngine.validate_and_sanitize_input(space_id, 'space_id')
        validated_user_id = InputValidationEngine.validate_and_sanitize_input(
            chat_data.user_id, 'user_id'
        )
        validated_message = InputValidationEngine.validate_and_sanitize_input(
            chat_data.message, 'message',
            validation_rules={'max_length': 1000}
        )
        
        chat = SpaceChat(
            space_id=validated_space_id,
            user_id=validated_user_id,
            message=validated_message
        )
        result = supabase.table('space_chat').insert(chat.dict()).execute()
        return SpaceChat(**result.data[0]) if result.data else None
    except Exception as e:
        logger.error(f"Error sending chat message: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to send message")

@api_router.get("/spaces/{space_id}/chat", response_model=List[SpaceChat])
async def get_space_chat(space_id: str):
    try:
        # Validate space_id
        InputValidationEngine.validate_and_sanitize_input(space_id, 'space_id')
        
        result = supabase.table('space_chat').select('*').eq('space_id', space_id).order('created_at', desc=True).limit(20).execute()
        return [SpaceChat(**item) for item in result.data] if result.data else []
    except Exception as e:
        logger.error(f"Error getting space chat: {str(e)}")
        return []


# Badge and achievement functions
async def check_and_award_badges(user_id: str):
    try:
        # Get user stats
        sessions_result = supabase.table('study_sessions').select('duration_minutes, created_at').eq('user_id', user_id).execute()
        sessions = sessions_result.data if sessions_result.data else []

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
            
    except Exception as e:
        logger.error(f"Error checking badges for user {user_id}: {str(e)}")

async def award_badge_if_not_exists(user_id: str, badge_title: str):
    try:
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
        
    except Exception as e:
        logger.error(f"Error awarding badge {badge_title} to user {user_id}: {str(e)}")


# Test endpoints
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


# Initialize Gamification and Ranking Services
if supabase:
    try:
        # Initialize Gamification Service
        xp_service = XPService(supabase)
        gamification_router = create_gamification_routes(xp_service)
        api_router.include_router(gamification_router)  # Mount on /api/xp
        print("Gamification system initialized successfully")
        
        # Initialize Badge Service (Module B1)
        badge_service = BadgeService(supabase)
        badge_router = create_badge_routes(badge_service)
        api_router.include_router(badge_router)  # Mount on /api/badges
        print("Badge system initialized successfully")
        
        # Initialize Ranking Service (Module D3)
        ranking_service = RankingService(supabase)
        ranking_router = create_ranking_routes(ranking_service)
        app.include_router(ranking_router)
        print("Ranking system (Module D3) initialized successfully")
        
        # Initialize Session Processing Routes (Unified Game Engine)
        api_router.include_router(session_router)  # Mount under /api
        print("Session processing engine initialized successfully")
        
    except Exception as e:
        print(f"Failed to initialize gamification/badge/ranking systems: {e}")
        print("Gamification, badge, and ranking features will not be available")
else:
    print("Cannot initialize gamification/badge/ranking systems: Supabase client not available")

# Include the tunnel router in the API router with /api prefix
api_router.include_router(tunnel_router)

# Include monitoring routes (Phase 6.2)
monitoring_router = create_monitoring_routes()
api_router.include_router(monitoring_router)

# Include the API router in the main app
app.include_router(api_router)

# Setup monitoring middleware (Phase 6.2)
try:
    setup_monitoring_middleware(app, collect_system_metrics=True)
    print("✅ Monitoring and analytics system initialized successfully")
    
    # Start the monitoring service
    @app.on_event("startup")
    async def startup_monitoring():
        await monitoring_service.start_monitoring()
        print("✅ Monitoring service started")
    
    @app.on_event("shutdown")
    async def shutdown_monitoring():
        await monitoring_service.stop_monitoring()
        print("✅ Monitoring service stopped")
        
except Exception as e:
    print(f"⚠️  Failed to initialize monitoring system: {e}")
    print("Monitoring features will not be available")

# Enhanced CORS configuration with security considerations
cors_origins = ["*"]  # Configure this based on your frontend domain in production
cors_headers = [
    "Content-Type", "Authorization", "X-Requested-With", "Accept",
    "Origin", "Access-Control-Request-Method", "Access-Control-Request-Headers"
]
cors_methods = ["GET", "POST", "PUT", "DELETE", "OPTIONS", "HEAD", "PATCH"]

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=cors_origins,
    allow_methods=cors_methods,
    allow_headers=cors_headers,
    expose_headers=["X-Total-Count", "X-Request-ID", "X-Response-Time"],
)

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
    try:
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
        
    except Exception as e:
        logger.error(f"Error updating user stats: {str(e)}")
        return False

# The app is already configured as a Socket.IO ASGI application
# socket_app = socketio.ASGIApp(sio, app)  # This is already defined at line 99

# Add bcrypt and jwt to requirements if not already there
# Note: These should be added to requirements.txt
# bcrypt==4.0.1
# PyJWT==2.8.0
