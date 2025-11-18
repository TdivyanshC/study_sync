"""
Session Routes - API endpoints for unified session processing
"""

from flask import Blueprint, request, jsonify
from functools import wraps
import logging
import os
from supabase import create_client

from game_engine.sessionProcessor import SessionProcessor

logger = logging.getLogger(__name__)

# Create Blueprint
session_bp = Blueprint('session', __name__, url_prefix='/session')

# Initialize Supabase client
supabase_url = os.getenv('SUPABASE_URL')
supabase_key = os.getenv('SUPABASE_SERVICE_KEY')
supabase = create_client(supabase_url, supabase_key)

# Initialize session processor
session_processor = SessionProcessor(supabase)


def require_auth(f):
    """Decorator to require JWT authentication"""
    @wraps(f)
    def decorated_function(*args, **kwargs):
        # Get authorization header
        auth_header = request.headers.get('Authorization')
        
        if not auth_header:
            return jsonify({
                'success': False,
                'error': 'Missing authorization header'
            }), 401
        
        try:
            # Extract token
            token = auth_header.replace('Bearer ', '')
            
            # Verify token with Supabase
            user = supabase.auth.get_user(token)
            
            if not user:
                return jsonify({
                    'success': False,
                    'error': 'Invalid token'
                }), 401
            
            # Add user to request context
            request.user_id = user.user.id
            
        except Exception as e:
            logger.error(f"Auth error: {str(e)}")
            return jsonify({
                'success': False,
                'error': 'Authentication failed'
            }), 401
        
        return f(*args, **kwargs)
    
    return decorated_function


@session_bp.route('/process/<session_id>', methods=['POST'])
@require_auth
async def process_session(session_id: str):
    """
    Process a completed study session through the unified game engine pipeline
    
    POST /session/process/{session_id}
    
    Headers:
        Authorization: Bearer <JWT_TOKEN>
    
    Returns:
        session_summary: Complete session processing results including:
            - XP gained
            - Streak status
            - Audit results
            - Ranking updates
            - Notification triggers
    """
    try:
        user_id = request.user_id
        
        logger.info(f"Processing session {session_id} for user {user_id}")
        
        # Process session through unified pipeline
        session_summary = await session_processor.process_session(user_id, session_id)
        
        # Return session summary
        if session_summary.get('success', False):
            return jsonify(session_summary), 200
        else:
            return jsonify(session_summary), 400
            
    except Exception as e:
        logger.error(f"Error in process_session endpoint: {str(e)}", exc_info=True)
        return jsonify({
            'success': False,
            'error': 'Internal server error',
            'message': str(e)
        }), 500


@session_bp.route('/status/<session_id>', methods=['GET'])
@require_auth
async def get_session_status(session_id: str):
    """
    Get processing status for a session
    
    GET /session/status/{session_id}
    
    Headers:
        Authorization: Bearer <JWT_TOKEN>
    
    Returns:
        Session processing status
    """
    try:
        user_id = request.user_id
        
        # Get session from database
        session_result = supabase.table('study_sessions').select('*').eq(
            'id', session_id
        ).eq('user_id', user_id).execute()
        
        if session_result.error or not session_result.data:
            return jsonify({
                'success': False,
                'error': 'Session not found'
            }), 404
        
        session = session_result.data[0]
        
        # Check if session has been processed (has XP history entry)
        xp_history_result = supabase.table('xp_history').select('*').eq(
            'meta->>session_id', session_id
        ).execute()
        
        processed = bool(xp_history_result.data)
        
        return jsonify({
            'success': True,
            'session_id': session_id,
            'user_id': user_id,
            'processed': processed,
            'session_data': session,
            'xp_awarded': xp_history_result.data[0] if processed else None
        }), 200
        
    except Exception as e:
        logger.error(f"Error in get_session_status endpoint: {str(e)}")
        return jsonify({
            'success': False,
            'error': 'Internal server error',
            'message': str(e)
        }), 500


@session_bp.route('/reprocess/<session_id>', methods=['POST'])
@require_auth
async def reprocess_session(session_id: str):
    """
    Reprocess a session (admin/debug endpoint)
    
    POST /session/reprocess/{session_id}
    
    Headers:
        Authorization: Bearer <JWT_TOKEN>
    
    Returns:
        Reprocessed session summary
    """
    try:
        user_id = request.user_id
        
        logger.warning(f"Reprocessing session {session_id} for user {user_id}")
        
        # Delete existing XP history for this session
        supabase.table('xp_history').delete().eq(
            'meta->>session_id', session_id
        ).execute()
        
        # Delete existing audit record
        supabase.table('session_audit').delete().eq(
            'session_id', session_id
        ).execute()
        
        # Reprocess session
        session_summary = await session_processor.process_session(user_id, session_id)
        
        return jsonify({
            'success': True,
            'reprocessed': True,
            'session_summary': session_summary
        }), 200
        
    except Exception as e:
        logger.error(f"Error in reprocess_session endpoint: {str(e)}")
        return jsonify({
            'success': False,
            'error': 'Internal server error',
            'message': str(e)
        }), 500


@session_bp.route('/health', methods=['GET'])
def health_check():
    """
    Health check endpoint for session processing service
    
    GET /session/health
    
    Returns:
        Service health status
    """
    try:
        return jsonify({
            'success': True,
            'service': 'session_processor',
            'status': 'healthy',
            'modules': {
                'xp_engine': 'active',
                'streak_engine': 'active',
                'soft_audit': 'active',
                'ranking_system': 'active'
            }
        }), 200
    except Exception as e:
        return jsonify({
            'success': False,
            'service': 'session_processor',
            'status': 'unhealthy',
            'error': str(e)
        }), 500
