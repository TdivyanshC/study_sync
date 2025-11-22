"""
Session Routes - API endpoints for unified session processing
"""

from fastapi import APIRouter, HTTPException, Query
import logging
import os
from typing import Optional, Dict, Any
from supabase import create_client

from game_engine.sessionProcessor import SessionProcessor

logger = logging.getLogger(__name__)

# Create FastAPI Router
session_router = APIRouter(prefix="/session", tags=["session"])

# Initialize Supabase client
supabase_url = os.getenv('SUPABASE_URL')
supabase_key = os.getenv('SUPABASE_SERVICE_KEY')
supabase = create_client(supabase_url, supabase_key)

# Initialize session processor
session_processor = SessionProcessor(supabase)


# Simple dependency for user authentication (you can expand this as needed)
async def get_current_user():
    # This is a placeholder - implement your actual JWT verification logic here
    # For now, we'll return None to allow the endpoints to work without auth
    return None


@session_router.post("/process/{session_id}")
async def process_session(session_id: str, user_id: Optional[str] = Query(None, description="User ID")):
    """
    Process a completed study session through the unified game engine pipeline
    
    POST /session/process/{session_id}
    
    Returns:
        session_summary: Complete session processing results including:
            - XP gained
            - Streak status
            - Audit results
            - Ranking updates
            - Notification triggers
    """
    try:
        # Extract user_id from query params or use provided default
        if not user_id:
            # For now, use a real user ID from the database - in production this would come from auth
            # Get a real user from the database
            user_result = supabase.table('users').select('id').limit(1).execute()
            if user_result.data:
                user_id = user_result.data[0]['id']
            else:
                raise HTTPException(status_code=400, detail="No users found in database")
        
        logger.info(f"Processing session {session_id} for user {user_id}")
        
        # Process session through unified pipeline
        session_summary = await session_processor.process_session(user_id, session_id)
        
        # Return session summary
        if session_summary.get('success', False):
            return session_summary
        else:
            raise HTTPException(status_code=400, detail=session_summary.get('error', 'Processing failed'))
            
    except Exception as e:
        logger.error(f"Error in process_session endpoint: {str(e)}", exc_info=True)
        raise HTTPException(
            status_code=500, 
            detail=f"Internal server error: {str(e)}"
        )


@session_router.get("/status/{session_id}")
async def get_session_status(session_id: str, user_id: Optional[str] = Query(None, description="User ID")):
    """
    Get processing status for a session
    
    GET /session/status/{session_id}
    
    Returns:
        Session processing status
    """
    try:
        # Get session from database
        session_result = supabase.table('study_sessions').select('*').eq(
            'id', session_id
        ).execute()
        
        if session_result.error or not session_result.data:
            raise HTTPException(status_code=404, detail="Session not found")
        
        session = session_result.data[0]
        
        # Use the user_id from the session data, or fallback to provided user_id
        actual_user_id = session['user_id'] if not user_id else user_id
        
        # Check if session has been processed (has XP history entry)
        xp_history_result = supabase.table('xp_history').select('*').eq(
            'meta->>session_id', session_id
        ).eq('user_id', actual_user_id).execute()
        
        processed = bool(xp_history_result.data)
        
        return {
            'success': True,
            'session_id': session_id,
            'user_id': actual_user_id,
            'processed': processed,
            'session_data': session,
            'xp_awarded': xp_history_result.data[0] if processed else None
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error in get_session_status endpoint: {str(e)}")
        raise HTTPException(
            status_code=500,
            detail=f"Internal server error: {str(e)}"
        )


@session_router.post("/reprocess/{session_id}")
async def reprocess_session(session_id: str, user_id: Optional[str] = Query(None, description="User ID")):
    """
    Reprocess a session (admin/debug endpoint)
    
    POST /session/reprocess/{session_id}
    
    Returns:
        Reprocessed session summary
    """
    try:
        # Get actual user_id from session data or use provided
        if not user_id:
            # Get the session to extract user_id
            session_result = supabase.table('study_sessions').select('user_id').eq('id', session_id).execute()
            if session_result.data:
                user_id = session_result.data[0]['user_id']
            else:
                raise HTTPException(status_code=404, detail="Session not found")
        
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
        
        return {
            'success': True,
            'reprocessed': True,
            'session_summary': session_summary
        }
        
    except Exception as e:
        logger.error(f"Error in reprocess_session endpoint: {str(e)}")
        raise HTTPException(
            status_code=500,
            detail=f"Internal server error: {str(e)}"
        )


@session_router.get("/health")
async def health_check():
    """
    Health check endpoint for session processing service
    
    GET /session/health
    
    Returns:
        Service health status
    """
    try:
        return {
            'success': True,
            'service': 'session_processor',
            'status': 'healthy',
            'modules': {
                'xp_engine': 'active',
                'streak_engine': 'active',
                'soft_audit': 'active',
                'ranking_system': 'active'
            }
        }
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Service unhealthy: {str(e)}"
        )
