"""
Gamification Routes - FastAPI route definitions
"""

import logging
from fastapi import APIRouter, HTTPException, Query
from typing import Dict, Any

from controllers.gamification_controller import GamificationController
from services.gamification.xp_service import XPService

logger = logging.getLogger(__name__)


def create_gamification_routes(xp_service: XPService) -> APIRouter:
    """
    Create and configure the gamification router
    
    Args:
        xp_service: Initialized XP service instance
        
    Returns:
        Configured APIRouter for gamification endpoints
    """
    # Create controller
    controller = GamificationController(xp_service)
    
    # Create router
    router = APIRouter(prefix="/xp", tags=["gamification"])
    
    @router.post("/award")
    async def award_xp_endpoint(request_data: Dict[str, Any]):
        """
        Award XP to a user
        
        **Request Body:**
        ```json
        {
            "user_id": "uuid",
            "amount": 50,
            "source": "session",
            "metadata": {"session_id": "uuid", "duration": 25}
        }
        ```
        """
        return await controller.award_xp(request_data)
    
    @router.post("/calculate-session")
    async def calculate_session_xp_endpoint(request_data: Dict[str, Any]):
        """
        Calculate XP for a completed study session
        
        **Request Body:**
        ```json
        {
            "session_id": "uuid"
        }
        ```
        """
        return await controller.calculate_session_xp(request_data)
    
    @router.get("/leaderboard")
    async def get_leaderboard_endpoint(
        period: str = Query(..., description="Leaderboard period: weekly, monthly, or all-time")
    ):
        """
        Get XP leaderboard for specified period
        
        **Query Parameters:**
        - period: weekly | monthly | all-time
        """
        return await controller.get_leaderboard(period)
    
    @router.post("/audit/validate")
    async def validate_session_audit_endpoint(request_data: Dict[str, Any]):
        """
        Validate session for audit purposes
        
        **Request Body:**
        ```json
        {
            "session_id": "uuid",
            "user_id": "uuid",
            "validation_mode": "soft"
        }
        ```
        """
        return await controller.validate_audit(request_data)
    
    @router.post("/sync/offline")
    async def sync_offline_events_endpoint(request_data: Dict[str, Any]):
        """
        Synchronize offline session events
        
        **Request Body:**
        ```json
        {
            "user_id": "uuid",
            "events": [
                {
                    "session_id": "uuid",
                    "event_type": "heartbeat",
                    "event_payload": {"timestamp": "2023-..."},
                    "created_at": "2023-..."
                }
            ],
            "last_sync": "2023-..."
        }
        ```
        """
        return await controller.sync_offline_events(request_data)
    
    @router.get("/history/{user_id}")
    async def get_user_xp_history_endpoint(
        user_id: str,
        limit: int = Query(50, ge=1, le=200, description="Maximum number of records to return")
    ):
        """
        Get user's XP history
        
        **Path Parameters:**
        - user_id: User UUID
        
        **Query Parameters:**
        - limit: Number of records (1-200, default: 50)
        """
        return await controller.get_user_xp_history(user_id, limit)
    
    @router.get("/metrics/daily/{user_id}")
    async def get_user_daily_metrics_endpoint(
        user_id: str,
        days: int = Query(30, ge=1, le=365, description="Number of days to look back (1-365)")
    ):
        """
        Get user's daily metrics
        
        **Path Parameters:**
        - user_id: User UUID
        
        **Query Parameters:**
        - days: Days to look back (1-365, default: 30)
        """
        return await controller.get_user_daily_metrics(user_id, days)
    
    @router.get("/stats/{user_id}")
    async def get_user_xp_stats_endpoint(user_id: str):
        """
        Get comprehensive XP statistics for a user
        
        **Path Parameters:**
        - user_id: User UUID
        """
        try:
            if not user_id:
                raise HTTPException(status_code=400, detail="Missing user_id")
            
            # Get user profile
            user_result = xp_service.supabase.table('users').select('username, xp, level, streak_count').eq('id', user_id).execute()
            
            if user_result.error or not user_result.data:
                raise HTTPException(status_code=404, detail="User not found")
            
            user = user_result.data[0]
            
            # Get recent XP history (last 30 days)
            from datetime import datetime, timedelta
            thirty_days_ago = (datetime.now() - timedelta(days=30)).isoformat()
            
            xp_history_result = xp_service.supabase.table('xp_history').select('amount, source, created_at').eq(
                'user_id', user_id
            ).gte('created_at', thirty_days_ago).execute()
            
            recent_xp_total = 0
            xp_sources = {}
            if not xp_history_result.error:
                for record in xp_history_result.data:
                    recent_xp_total += record['amount']
                    source = record['source']
                    xp_sources[source] = xp_sources.get(source, 0) + record['amount']
            
            # Get current streak
            streak_result = xp_service.supabase.table('study_sessions').select('created_at').eq(
                'user_id', user_id
            ).order('created_at', desc=True).limit(100).execute()
            
            current_streak = 0
            if not streak_result.error and streak_result.data:
                # Calculate streak logic (simplified)
                dates = []
                for record in streak_result.data:
                    session_date = datetime.fromisoformat(record['created_at'].replace('Z', '+00:00')).date()
                    dates.append(session_date)
                
                # Find consecutive days
                unique_dates = sorted(set(dates))
                today = datetime.now().date()
                
                streak = 0
                for date in reversed(unique_dates):
                    if (today - date).days == streak:
                        streak += 1
                    else:
                        break
                current_streak = streak
            
            return {
                "success": True,
                "data": {
                    "user_id": user_id,
                    "username": user['username'],
                    "total_xp": user['xp'],
                    "level": user['level'],
                    "current_streak": current_streak,
                    "recent_30_days_xp": recent_xp_total,
                    "xp_sources": xp_sources,
                    "next_level_xp": (user['level'] * 100) - user['xp'],
                    "level_progress": user['xp'] % 100
                },
                "message": "User XP statistics retrieved successfully"
            }
            
        except HTTPException:
            raise
        except Exception as e:
            logger.error(f"Error in get_user_xp_stats_endpoint: {str(e)}")
            raise HTTPException(status_code=500, detail=f"Internal server error: {str(e)}")
    
    @router.get("/events/{session_id}")
    async def get_session_events_endpoint(session_id: str):
        """
        Get all events for a study session (for audit/debugging)
        
        **Path Parameters:**
        - session_id: Session UUID
        """
        try:
            if not session_id:
                raise HTTPException(status_code=400, detail="Missing session_id")
            
            # Get session events
            result = xp_service.supabase.table('session_events').select('*').eq(
                'session_id', session_id
            ).order('created_at').execute()
            
            if result.error:
                raise HTTPException(status_code=500, detail=f"Database error: {result.error}")
            
            events = []
            for record in result.data:
                events.append({
                    'id': record['id'],
                    'event_type': record['event_type'],
                    'event_payload': record['event_payload'],
                    'created_at': record['created_at']
                })
            
            return {
                "success": True,
                "data": {
                    "session_id": session_id,
                    "events": events,
                    "total_events": len(events)
                },
                "message": f"Retrieved {len(events)} session events"
            }
            
        except HTTPException:
            raise
        except Exception as e:
            logger.error(f"Error in get_session_events_endpoint: {str(e)}")
            raise HTTPException(status_code=500, detail=f"Internal server error: {str(e)}")
    
    @router.get("/audit/sessions/{user_id}")
    async def get_user_audit_summary_endpoint(
        user_id: str,
        days: int = Query(30, ge=1, le=365, description="Number of days to look back")
    ):
        """
        Get audit summary for user's sessions
        
        **Path Parameters:**
        - user_id: User UUID
        
        **Query Parameters:**
        - days: Days to look back (1-365, default: 30)
        """
        try:
            if not user_id:
                raise HTTPException(status_code=400, detail="Missing user_id")
            
            from datetime import datetime, timedelta
            
            # Calculate date range
            end_date = datetime.now()
            start_date = end_date - timedelta(days=days)
            
            # Get audit records
            result = xp_service.supabase.table('session_audit').select('*').eq(
                'user_id', user_id
            ).gte('created_at', start_date.isoformat()).lte('created_at', end_date.isoformat()).order('created_at', desc=True).execute()
            
            if result.error:
                raise HTTPException(status_code=500, detail=f"Database error: {result.error}")
            
            # Aggregate audit statistics
            total_sessions = len(result.data)
            flagged_sessions = sum(1 for record in result.data if record['is_flagged'])
            avg_suspicion_score = sum(record['suspicion_score'] for record in result.data) / total_sessions if total_sessions > 0 else 0
            
            # Most common reasons
            all_reasons = []
            for record in result.data:
                all_reasons.extend(record['reasons'])
            
            reason_counts = {}
            for reason in all_reasons:
                reason_counts[reason] = reason_counts.get(reason, 0) + 1
            
            common_reasons = sorted(reason_counts.items(), key=lambda x: x[1], reverse=True)[:5]
            
            return {
                "success": True,
                "data": {
                    "user_id": user_id,
                    "date_range": {
                        "start_date": start_date.isoformat(),
                        "end_date": end_date.isoformat(),
                        "days": days
                    },
                    "summary": {
                        "total_sessions": total_sessions,
                        "flagged_sessions": flagged_sessions,
                        "flagged_percentage": (flagged_sessions / total_sessions * 100) if total_sessions > 0 else 0,
                        "avg_suspicion_score": round(avg_suspicion_score, 2)
                    },
                    "common_reasons": [{"reason": reason, "count": count} for reason, count in common_reasons],
                    "recent_audits": [
                        {
                            "session_id": record['session_id'],
                            "suspicion_score": record['suspicion_score'],
                            "is_flagged": record['is_flagged'],
                            "reasons": record['reasons'],
                            "created_at": record['created_at']
                        }
                        for record in result.data[:10]  # Last 10 audits
                    ]
                },
                "message": f"Retrieved audit summary for {total_sessions} sessions"
            }
            
        except HTTPException:
            raise
        except Exception as e:
            logger.error(f"Error in get_user_audit_summary_endpoint: {str(e)}")
            raise HTTPException(status_code=500, detail=f"Internal server error: {str(e)}")
    
    return router