"""
Streak Routes - FastAPI route definitions for streak management
"""

import logging
from fastapi import APIRouter, HTTPException, Query
from typing import Dict, Any

from services.gamification.streak_service import StreakService
from services.gamification.xp_service import XPService

logger = logging.getLogger(__name__)


def create_streak_routes(xp_service: XPService) -> APIRouter:
    """
    Create and configure the streak router
    
    Args:
        xp_service: Initialized XP service instance
        
    Returns:
        Configured APIRouter for streak endpoints
    """
    # Create router
    router = APIRouter(prefix="/streak", tags=["streak"])
    
    @router.post("/update/{user_id}")
    async def update_daily_streak_endpoint(user_id: str):
        """
        Update user's daily login streak
        
        **Path Parameters:**
        - user_id: User UUID
        """
        try:
            if not user_id:
                raise HTTPException(status_code=400, detail="Missing user_id")
            
            # Get streak service from XP service
            streak_service = xp_service.streak_service
            if not streak_service:
                raise HTTPException(status_code=500, detail="Streak service not available")
            
            # Update daily streak
            result = await streak_service.update_daily_login_streak(user_id)
            
            if not result['success']:
                raise HTTPException(status_code=500, detail=result.get('message', 'Failed to update streak'))
            
            return {
                "success": True,
                "data": result,
                "message": result.get('message', 'Streak updated successfully')
            }
            
        except HTTPException:
            raise
        except Exception as e:
            logger.error(f"Error in update_daily_streak_endpoint: {str(e)}")
            raise HTTPException(status_code=500, detail=f"Internal server error: {str(e)}")
    
    @router.get("/continuity/{user_id}")
    async def check_streak_continuity_endpoint(user_id: str):
        """
        Check if user's streak is still active or has been broken
        
        **Path Parameters:**
        - user_id: User UUID
        """
        try:
            if not user_id:
                raise HTTPException(status_code=400, detail="Missing user_id")
            
            # Get streak service from XP service
            streak_service = xp_service.streak_service
            if not streak_service:
                raise HTTPException(status_code=500, detail="Streak service not available")
            
            # Check streak continuity
            result = await streak_service.check_streak_continuity(user_id)
            
            if not result['success']:
                raise HTTPException(status_code=500, detail=result.get('message', 'Failed to check streak continuity'))
            
            return {
                "success": True,
                "data": result,
                "message": result.get('message', 'Streak continuity checked successfully')
            }
            
        except HTTPException:
            raise
        except Exception as e:
            logger.error(f"Error in check_streak_continuity_endpoint: {str(e)}")
            raise HTTPException(status_code=500, detail=f"Internal server error: {str(e)}")
    
    @router.post("/apply-multiplier")
    async def apply_streak_multiplier_endpoint(request_data: Dict[str, Any]):
        """
        Apply streak multiplier to base XP
        
        **Request Body:**
        ```json
        {
            "user_id": "uuid",
            "base_xp": 100
        }
        ```
        """
        try:
            user_id = request_data.get('user_id')
            base_xp = request_data.get('base_xp')
            
            if not user_id:
                raise HTTPException(status_code=400, detail="Missing user_id")
            
            if base_xp is None:
                raise HTTPException(status_code=400, detail="Missing base_xp")
            
            # Get streak service from XP service
            streak_service = xp_service.streak_service
            if not streak_service:
                raise HTTPException(status_code=500, detail="Streak service not available")
            
            # Apply streak multiplier
            result = await streak_service.apply_streak_multiplier_to_xp(user_id, base_xp)
            
            if not result['success']:
                raise HTTPException(status_code=500, detail=result.get('message', 'Failed to apply streak multiplier'))
            
            return {
                "success": True,
                "data": result,
                "message": result.get('message', 'Streak multiplier applied successfully')
            }
            
        except HTTPException:
            raise
        except Exception as e:
            logger.error(f"reak_multiplier_endpointError in apply_st: {str(e)}")
            raise HTTPException(status_code=500, detail=f"Internal server error: {str(e)}")
    
    return router