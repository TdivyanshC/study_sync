"""
Friends Routes - FastAPI route definitions for friends functionality
"""

import logging
import os
from fastapi import APIRouter, HTTPException, Query, Depends
from typing import Dict, Any

from services.friends_service import FriendsService
from services.supabase_db import SupabaseDB

logger = logging.getLogger(__name__)


def create_friends_routes(supabase_db: SupabaseDB) -> APIRouter:
    """
    Create and configure the friends router
    
    Args:
        supabase_db: Initialized SupabaseDB instance
        
    Returns:
        Configured APIRouter for friends endpoints
    """
    # Create service
    from supabase import create_client, Client
    
    # Create a supabase client for the friends service
    supabase_url = os.environ['SUPABASE_URL']
    supabase_key = os.environ['SUPABASE_SERVICE_KEY']
    supabase_client: Client = create_client(supabase_url, supabase_key)
    
    friends_service = FriendsService(supabase_client)
    
    # Create router
    router = APIRouter(prefix="/friends", tags=["friends"])
    
    @router.get("/search")
    async def search_users_endpoint(
        query: str = Query(..., description="Search query (username or user_id)"),
        limit: int = Query(10, ge=1, le=50, description="Maximum number of results"),
        current_user_id: str = Query(..., description="ID of the current user")
    ):
        """
        Search for users by username or user_id
        
        **Query Parameters:**
        - query: Search query (required)
        - limit: Number of results (1-50, default: 10)
        - current_user_id: ID of current user (required)
        """
        try:
            if not query:
                raise HTTPException(status_code=400, detail="Search query is required")
            
            if not current_user_id:
                raise HTTPException(status_code=400, detail="Current user ID is required")
            
            return await friends_service.search_users(query, current_user_id, limit)
            
        except HTTPException:
            raise
        except Exception as e:
            logger.error(f"Error in search_users_endpoint: {str(e)}")
            raise HTTPException(status_code=500, detail=f"Internal server error: {str(e)}")
    
    @router.post("/add")
    async def add_friend_endpoint(request_data: Dict[str, Any]):
        """
        Add a friend
        
        **Request Body:**
        ```json
        {
            "current_user_id": "uuid",
            "friend_user_id": "ABC123"
        }
        ```
        """
        try:
            current_user_id = request_data.get("current_user_id")
            friend_user_id = request_data.get("friend_user_id")
            
            if not current_user_id:
                raise HTTPException(status_code=400, detail="Current user ID is required")
            
            if not friend_user_id:
                raise HTTPException(status_code=400, detail="Friend user ID is required")
            
            return await friends_service.add_friend(current_user_id, friend_user_id)
            
        except HTTPException:
            raise
        except Exception as e:
            logger.error(f"Error in add_friend_endpoint: {str(e)}")
            raise HTTPException(status_code=500, detail=f"Internal server error: {str(e)}")
    
    @router.delete("/remove")
    async def remove_friend_endpoint(request_data: Dict[str, Any]):
        """
        Remove a friend
        
        **Request Body:**
        ```json
        {
            "current_user_id": "uuid",
            "friend_user_id": "ABC123"
        }
        ```
        """
        try:
            current_user_id = request_data.get("current_user_id")
            friend_user_id = request_data.get("friend_user_id")
            
            if not current_user_id:
                raise HTTPException(status_code=400, detail="Current user ID is required")
            
            if not friend_user_id:
                raise HTTPException(status_code=400, detail="Friend user ID is required")
            
            return await friends_service.remove_friend(current_user_id, friend_user_id)
            
        except HTTPException:
            raise
        except Exception as e:
            logger.error(f"Error in remove_friend_endpoint: {str(e)}")
            raise HTTPException(status_code=500, detail=f"Internal server error: {str(e)}")
    
    @router.get("/list")
    async def get_friends_list_endpoint(
        user_id: str = Query(..., description="ID of the user")
    ):
        """
        Get list of friends for a user
        
        **Query Parameters:**
        - user_id: ID of the user (required)
        """
        try:
            if not user_id:
                raise HTTPException(status_code=400, detail="User ID is required")
            
            return await friends_service.get_friends_list(user_id)
            
        except HTTPException:
            raise
        except Exception as e:
            logger.error(f"Error in get_friends_list_endpoint: {str(e)}")
            raise HTTPException(status_code=500, detail=f"Internal server error: {str(e)}")
    
    @router.get("/profile/{friend_user_id}")
    async def get_friend_profile_endpoint(
        friend_user_id: str,
        current_user_id: str = Query(..., description="ID of the current user")
    ):
        """
        Get detailed profile of a friend
        
        **Path Parameters:**
        - friend_user_id: user_id of the friend
        
        **Query Parameters:**
        - current_user_id: ID of the current user (required)
        """
        try:
            if not current_user_id:
                raise HTTPException(status_code=400, detail="Current user ID is required")
            
            return await friends_service.get_friend_profile(current_user_id, friend_user_id)
            
        except HTTPException:
            raise
        except Exception as e:
            logger.error(f"Error in get_friend_profile_endpoint: {str(e)}")
            raise HTTPException(status_code=500, detail=f"Internal server error: {str(e)}")
    
    @router.get("/stats")
    async def get_friend_stats_endpoint(
        user_id: str = Query(..., description="ID of the user")
    ):
        """
        Get friends statistics for a user
        
        **Query Parameters:**
        - user_id: ID of the user (required)
        """
        try:
            if not user_id:
                raise HTTPException(status_code=400, detail="User ID is required")
            
            return await friends_service.get_friend_stats(user_id)
            
        except HTTPException:
            raise
        except Exception as e:
            logger.error(f"Error in get_friend_stats_endpoint: {str(e)}")
            raise HTTPException(status_code=500, detail=f"Internal server error: {str(e)}")
    
    @router.post("/activity")
    async def update_user_activity_endpoint(request_data: Dict[str, Any]):
        """
        Update user's current activity
        
        **Request Body:**
        ```json
        {
            "user_id": "uuid",
            "activity": "study_session"
        }
        ```
        """
        try:
            user_id = request_data.get("user_id")
            activity = request_data.get("activity")
            
            if not user_id:
                raise HTTPException(status_code=400, detail="User ID is required")
            
            if not activity:
                raise HTTPException(status_code=400, detail="Activity is required")
            
            return await friends_service.update_user_activity(user_id, activity)
            
        except HTTPException:
            raise
        except Exception as e:
            logger.error(f"Error in update_user_activity_endpoint: {str(e)}")
            raise HTTPException(status_code=500, detail=f"Internal server error: {str(e)}")
    
    @router.get("/activity/feed")
    async def get_friend_activity_feed_endpoint(
        user_id: str = Query(..., description="ID of the user"),
        limit: int = Query(20, ge=1, le=100, description="Number of activities to return")
    ):
        """
        Get activity feed of friends
        
        **Query Parameters:**
        - user_id: ID of the user (required)
        - limit: Number of activities (1-100, default: 20)
        """
        try:
            if not user_id:
                raise HTTPException(status_code=400, detail="User ID is required")
            
            # Get friends and their recent activities
            friends_result = await friends_service.get_friends_list(user_id)
            
            if not friends_result["success"]:
                return friends_result
            
            activities = []
            for friend in friends_result["friends"]:
                if friend.current_activity:
                    # Calculate time since activity started
                    if friend.activity_started_at:
                        activity_time = friend.activity_started_at
                        hours_spent = friend.total_hours_today
                    else:
                        activity_time = friend.friend_since
                        hours_spent = 0
                    
                    activity_item = {
                        "friend_user_id": friend.user_id,
                        "friend_name": friend.display_name or friend.username,
                        "activity_type": friend.current_activity,
                        "activity_description": f"Currently {friend.current_activity.replace('_', ' ')}",
                        "hours_spent": hours_spent,
                        "timestamp": activity_time
                    }
                    activities.append(activity_item)
            
            # Sort by most recent
            activities.sort(key=lambda x: x["timestamp"], reverse=True)
            
            return {
                "success": True,
                "activities": activities[:limit],
                "total_activities": len(activities),
                "message": f"Retrieved {min(len(activities), limit)} friend activities"
            }
            
        except HTTPException:
            raise
        except Exception as e:
            logger.error(f"Error in get_friend_activity_feed_endpoint: {str(e)}")
            raise HTTPException(status_code=500, detail=f"Internal server error: {str(e)}")
    
    return router