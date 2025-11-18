"""
Ranking Routes - FastAPI route definitions for Module D3: Ranking System
"""

import logging
from fastapi import APIRouter, HTTPException, Query
from typing import Dict, Any

from services.gamification.ranking_service import RankingService

logger = logging.getLogger(__name__)


def create_ranking_routes(ranking_service: RankingService) -> APIRouter:
    """
    Create and configure the ranking router
    
    Args:
        ranking_service: Initialized Ranking service instance
        
    Returns:
        Configured APIRouter for ranking endpoints
    """
    # Create router
    router = APIRouter(prefix="/ranking", tags=["ranking"])
    
    @router.get("/status/{user_id}")
    async def get_ranking_status_endpoint(user_id: str):
        """
        Get comprehensive ranking status for a user
        
        **Path Parameters:**
        - user_id: User UUID
        
        **Returns:**
        Complete ranking information including current tier, progress, and next milestones
        """
        try:
            if not user_id:
                raise HTTPException(status_code=400, detail="Missing user_id")
            
            result = await ranking_service.get_user_ranking_status(user_id)
            
            if not result['success']:
                raise HTTPException(status_code=404, detail=result.get('message', 'User not found'))
            
            return {
                "success": True,
                "data": result,
                "message": "Ranking status retrieved successfully"
            }
            
        except HTTPException:
            raise
        except Exception as e:
            logger.error(f"Error in get_ranking_status_endpoint: {str(e)}")
            raise HTTPException(status_code=500, detail=f"Internal server error: {str(e)}")
    
    @router.post("/promotion/check/{user_id}")
    async def check_promotion_eligibility_endpoint(user_id: str):
        """
        Check if user is eligible for tier promotion
        
        **Path Parameters:**
        - user_id: User UUID
        
        **Returns:**
        Promotion eligibility status and requirements
        """
        try:
            if not user_id:
                raise HTTPException(status_code=400, detail="Missing user_id")
            
            result = await ranking_service.check_promotion_eligibility(user_id)
            
            if not result['success']:
                raise HTTPException(status_code=404, detail=result.get('message', 'User not found'))
            
            return {
                "success": True,
                "data": result,
                "message": "Promotion eligibility checked successfully"
            }
            
        except HTTPException:
            raise
        except Exception as e:
            logger.error(f"Error in check_promotion_eligibility_endpoint: {str(e)}")
            raise HTTPException(status_code=500, detail=f"Internal server error: {str(e)}")
    
    @router.post("/promote/{user_id}")
    async def promote_user_endpoint(user_id: str):
        """
        Promote user to next tier if eligible
        
        **Path Parameters:**
        - user_id: User UUID
        
        **Returns:**
        Promotion result with updated tier information
        """
        try:
            if not user_id:
                raise HTTPException(status_code=400, detail="Missing user_id")
            
            result = await ranking_service.promote_user_if_eligible(user_id)
            
            if not result['success']:
                raise HTTPException(status_code=400, detail=result.get('message', 'Promotion failed'))
            
            return {
                "success": True,
                "data": result,
                "message": result.get('message', 'User promoted successfully')
            }
            
        except HTTPException:
            raise
        except Exception as e:
            logger.error(f"Error in promote_user_endpoint: {str(e)}")
            raise HTTPException(status_code=500, detail=f"Internal server error: {str(e)}")
    
    @router.post("/downgrades/process")
    async def process_downgrades_endpoint():
        """
        Process automatic downgrades for inactive users
        
        **Returns:**
        Summary of downgrades processed
        """
        try:
            result = await ranking_service.process_downgrades()
            
            if not result['success']:
                raise HTTPException(status_code=500, detail=result.get('message', 'Failed to process downgrades'))
            
            return {
                "success": True,
                "data": result,
                "message": f"Processed {result.get('downgrade_count', 0)} downgrades"
            }
            
        except HTTPException:
            raise
        except Exception as e:
            logger.error(f"Error in process_downgrades_endpoint: {str(e)}")
            raise HTTPException(status_code=500, detail=f"Internal server error: {str(e)}")
    
    @router.get("/leaderboard")
    async def get_leaderboard_endpoint(
        limit: int = Query(50, ge=1, le=200, description="Number of users to return (1-200)")
    ):
        """
        Get ranking leaderboard
        
        **Query Parameters:**
        - limit: Number of users (1-200, default: 50)
        
        **Returns:**
        Leaderboard with user rankings
        """
        try:
            result = await ranking_service.get_leaderboard(limit)
            
            if not result['success']:
                raise HTTPException(status_code=500, detail=result.get('message', 'Failed to get leaderboard'))
            
            return {
                "success": True,
                "data": result,
                "message": f"Retrieved top {len(result.get('leaderboard', []))} users"
            }
            
        except HTTPException:
            raise
        except Exception as e:
            logger.error(f"Error in get_leaderboard_endpoint: {str(e)}")
            raise HTTPException(status_code=500, detail=f"Internal server error: {str(e)}")
    
    @router.get("/tiers")
    async def get_ranking_tiers_endpoint():
        """
        Get all available ranking tiers and their requirements
        
        **Returns:**
        Complete tier structure and requirements
        """
        try:
            from services.gamification.ranking_service import RankingConstants
            
            return {
                "success": True,
                "data": {
                    "tiers": RankingConstants.TIERS,
                    "promotion_requirements": RankingConstants.PROMOTION_REQUIREMENTS,
                    "downgrade_thresholds": RankingConstants.DOWNGRADE_THRESHOLDS,
                    "scoring_weights": {
                        "xp_weight": RankingConstants.XP_WEIGHT,
                        "streak_weight": RankingConstants.STREAK_WEIGHT
                    }
                },
                "message": "Ranking tier information retrieved successfully"
            }
            
        except Exception as e:
            logger.error(f"Error in get_ranking_tiers_endpoint: {str(e)}")
            raise HTTPException(status_code=500, detail=f"Internal server error: {str(e)}")
    
    @router.get("/user/{user_id}/progress")
    async def get_user_progress_endpoint(user_id: str):
        """
        Get detailed progress information for user
        
        **Path Parameters:**
        - user_id: User UUID
        
        **Returns:**
        Detailed progress towards next tier and milestones
        """
        try:
            if not user_id:
                raise HTTPException(status_code=400, detail="Missing user_id")
            
            # Get basic ranking status
            ranking_status = await ranking_service.get_user_ranking_status(user_id)
            if not ranking_status['success']:
                raise HTTPException(status_code=404, detail=ranking_status.get('message', 'User not found'))
            
            # Get promotion eligibility
            eligibility = await ranking_service.check_promotion_eligibility(user_id)
            
            return {
                "success": True,
                "data": {
                    "user_id": user_id,
                    "current_ranking": ranking_status['current_ranking'],
                    "progress": ranking_status['progress'],
                    "next_milestones": ranking_status['next_milestones'],
                    "promotion_eligibility": eligibility,
                    "leaderboard_position": ranking_status['leaderboard']
                },
                "message": "User progress information retrieved successfully"
            }
            
        except HTTPException:
            raise
        except Exception as e:
            logger.error(f"Error in get_user_progress_endpoint: {str(e)}")
            raise HTTPException(status_code=500, detail=f"Internal server error: {str(e)}")
    
    @router.get("/events/{user_id}")
    async def get_user_ranking_events_endpoint(
        user_id: str,
        limit: int = Query(20, ge=1, le=100, description="Number of events to return (1-100)")
    ):
        """
        Get user's ranking event history (promotions, downgrades)
        
        **Path Parameters:**
        - user_id: User UUID
        
        **Query Parameters:**
        - limit: Number of events (1-100, default: 20)
        
        **Returns:**
        User's ranking event history
        """
        try:
            if not user_id:
                raise HTTPException(status_code=400, detail="Missing user_id")
            
            # Get ranking events from database
            result = ranking_service.supabase.table('ranking_events').select('*').eq(
                'user_id', user_id
            ).order('created_at', desc=True).limit(limit).execute()
            
            if result.error:
                raise HTTPException(status_code=500, detail=f"Database error: {result.error}")
            
            events = []
            for record in result.data:
                events.append({
                    "id": record['id'],
                    "event_type": record['event_type'],
                    "from_tier": record.get('from_tier'),
                    "to_tier": record.get('to_tier'),
                    "reason": record.get('reason'),
                    "created_at": record['created_at']
                })
            
            return {
                "success": True,
                "data": {
                    "user_id": user_id,
                    "events": events,
                    "total_events": len(events)
                },
                "message": f"Retrieved {len(events)} ranking events"
            }
            
        except HTTPException:
            raise
        except Exception as e:
            logger.error(f"Error in get_user_ranking_events_endpoint: {str(e)}")
            raise HTTPException(status_code=500, detail=f"Internal server error: {str(e)}")
    
    return router