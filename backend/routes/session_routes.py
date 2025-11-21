"""
Session Routes - API endpoints for unified session processing
"""

from fastapi import APIRouter, HTTPException, Depends
from functools import wraps
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
async def process_session(session_id: str):
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
        # For now, use a default user_id - in production this would come from auth
        user_id = "default-user"  # Placeholder - replace with actual user ID from auth
        
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
async def get_session_status(session_id: str):
    """
    Get processing status for a session
    
    GET /session/status/{session_id}
    
    Returns:
        Session processing status
    """
    try:
        # For now, use a default user_id - in production this would come from auth
        user_id = "default-user"  # Placeholder - replace with actual user ID from auth
        
        # Get session from database
        session_result = supabase.table('study_sessions').select('*').eq(
            'id', session_id
        ).execute()
        
        if session_result.error or not session_result.data:
            raise HTTPException(status_code=404, detail="Session not found")
        
        session = session_result.data[0]
        
        # Check if session has been processed (has XP history entry)
        xp_history_result = supabase.table('xp_history').select('*').eq(
            'meta->>session_id', session_id
        ).execute()
        
        processed = bool(xp_history_result.data)
        
        return {
            'success': True,
            'session_id': session_id,
            'user_id': user_id,
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
async def reprocess_session(session_id: str):
    """
    Reprocess a session (admin/debug endpoint)
    
    POST /session/reprocess/{session_id}
    
    Returns:
        Reprocessed session summary
    """
    try:
        # For now, use a default user_id - in production this would come from auth
        user_id = "default-user"  # Placeholder - replace with actual user ID from auth
        
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
