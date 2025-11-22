"""
Badge Routes - FastAPI route definitions for badge operations
"""

import logging
from fastapi import APIRouter, HTTPException, Query
from typing import Dict, Any

from controllers.badge_controller import BadgeController
from services.gamification.badge_service import BadgeService

logger = logging.getLogger(__name__)


def create_badge_routes(badge_service: BadgeService) -> APIRouter:
    """
    Create and configure the badge router
    
    Args:
        badge_service: Initialized Badge service instance
        
    Returns:
        Configured APIRouter for badge endpoints
    """
    # Create controller
    controller = BadgeController(badge_service)
    
    # Create router
    router = APIRouter(prefix="/badges", tags=["badges"])
    
    @router.get("/user/{user_id}")
    async def get_user_badges_endpoint(user_id: str):
        """
        Get all badges for a user
        
        **Path Parameters:**
        - user_id: User UUID
        """
        return await controller.get_user_badges(user_id)
    
    @router.post("/check")
    async def check_and_award_badges_endpoint(request_data: Dict[str, Any]):
        """
        Check and award badges for a user
        
        **Request Body:**
        ```json
        {
            "user_id": "uuid"
        }
        ```
        """
        return await controller.check_and_award_badges(request_data)
    
    @router.get("/leaderboard")
    async def get_badge_leaderboard_endpoint(
        limit: str = Query("50", description="Maximum number of users to return")
    ):
        """
        Get badge collection leaderboard
        
        **Query Parameters:**
        - limit: Number of users (1-100, default: 50)
        """
        return await controller.get_badge_leaderboard(limit)
    
    return router