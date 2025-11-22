"""
Badge Controller - Request handling layer for badge operations
"""

import logging
from typing import Dict, Any
from fastapi import HTTPException

from services.gamification.badge_service import BadgeService

logger = logging.getLogger(__name__)


class BadgeController:
    """Controller for badge endpoints"""
    
    def __init__(self, badge_service: BadgeService):
        self.badge_service = badge_service
    
    async def get_user_badges(self, user_id: str) -> Dict[str, Any]:
        """
        Get all badges for a user
        
        Args:
            user_id: User UUID
            
        Returns:
            API response dictionary
        """
        try:
            if not user_id:
                raise HTTPException(status_code=400, detail="Missing user_id")
            
            result = await self.badge_service.get_user_badges(user_id)
            
            return {
                "success": result.get('success', False),
                "data": {
                    "badges": result.get('badges', []),
                    "total_badges": result.get('total_badges', 0),
                    "badge_categories": result.get('badge_categories', {}),
                    "recent_badges": result.get('recent_badges', [])
                },
                "message": result.get('message', 'Retrieved user badges')
            }
            
        except HTTPException:
            raise
        except Exception as e:
            logger.error(f"Error in get_user_badges: {str(e)}")
            raise HTTPException(status_code=500, detail=f"Internal server error: {str(e)}")
    
    async def check_and_award_badges(self, request_data: Dict[str, Any]) -> Dict[str, Any]:
        """
        Check and award badges for a user
        
        Args:
            request_data: Raw request data
            
        Returns:
            API response dictionary
        """
        try:
            user_id = request_data.get('user_id')
            
            if not user_id:
                raise HTTPException(
                    status_code=400,
                    detail="Missing required field: user_id"
                )
            
            # Check and award badges
            new_badges = await self.badge_service.check_and_award_badges(user_id)
            
            return {
                "success": True,
                "data": {
                    "new_badges": new_badges,
                    "badge_count": len(new_badges),
                    "message": f"Awarded {len(new_badges)} new badges"
                },
                "message": "Badge check completed successfully"
            }
            
        except HTTPException:
            raise
        except Exception as e:
            logger.error(f"Error in check_and_award_badges: {str(e)}")
            raise HTTPException(status_code=500, detail=f"Internal server error: {str(e)}")
    
    async def get_badge_leaderboard(self, limit: str = "50") -> Dict[str, Any]:
        """
        Get badge collection leaderboard
        
        Args:
            limit: Maximum number of users to return
            
        Returns:
            API response dictionary
        """
        try:
            # Parse limit
            try:
                limit_int = int(limit)
                if limit_int < 1 or limit_int > 100:
                    raise ValueError("Limit must be between 1 and 100")
            except ValueError:
                raise HTTPException(
                    status_code=400,
                    detail="Invalid limit parameter. Must be a number between 1 and 100"
                )
            
            # Get leaderboard
            result = await self.badge_service.get_badge_leaderboard(limit_int)
            
            return {
                "success": result.get('success', False),
                "data": {
                    "leaderboard": result.get('leaderboard', []),
                    "total_users": result.get('total_users', 0),
                    "generated_at": result.get('generated_at', '')
                },
                "message": result.get('message', 'Retrieved badge leaderboard')
            }
            
        except HTTPException:
            raise
        except Exception as e:
            logger.error(f"Error in get_badge_leaderboard: {str(e)}")
            raise HTTPException(status_code=500, detail=f"Internal server error: {str(e)}")