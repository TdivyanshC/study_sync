"""
Friends Service - Business logic for friends functionality
"""

import logging
from typing import List, Optional, Dict, Any
from datetime import datetime, timedelta
from supabase import Client

from models.friends import (
    UserSearchResult, AddFriendResponse, RemoveFriendResponse, 
    FriendProfile, FriendListItem, FriendStats, FriendActivityFeedItem
)

logger = logging.getLogger(__name__)


class FriendsService:
    """Service for managing friends relationships and operations"""
    
    def __init__(self, supabase: Client):
        self.supabase = supabase
        
    async def search_users(self, query: str, current_user_id: str, limit: int = 10) -> Dict[str, Any]:
        """
        Search for users by username or user_id
        
        Args:
            query: Search query
            current_user_id: ID of the current user
            limit: Maximum number of results
            
        Returns:
            Dictionary containing search results
        """
        try:
            # Search by user_id first, then by username
            search_result = self.supabase.table('users').select(
                'id, user_id, username, display_name, avatar_url, xp, level, streak_count, '
                'current_activity, activity_started_at, total_hours_today'
            ).or_(
                f'user_id.ilike.%{query}%,username.ilike.%{query}%'
            ).limit(limit).execute()
            
            if not search_result.data:
                return {
                    "success": True,
                    "query": query,
                    "results": [],
                    "total_found": 0,
                    "message": "No users found"
                }
            
            # Get current friends to mark them
            friends_result = self.supabase.table('friends').select('friend_user_id').eq(
                'user_id', current_user_id
            ).eq('status', 'active').execute()
            
            friend_user_ids = {friend['friend_user_id'] for friend in friends_result.data} if friends_result.data else set()
            
            results = []
            for user in search_result.data:
                # Skip current user
                if user['id'] == current_user_id:
                    continue
                    
                # Calculate hours today from study sessions
                today_minutes = await self._get_today_minutes(user['id'])
                hours_today = round(today_minutes / 60, 1) if today_minutes >= 60 else today_minutes / 60
                
                result = UserSearchResult(
                    id=user['id'],
                    user_id=user['user_id'],
                    username=user['username'],
                    display_name=user.get('display_name'),
                    avatar_url=user.get('avatar_url'),
                    xp=user['xp'],
                    level=user['level'],
                    streak_count=user['streak_count'],
                    current_activity=user.get('current_activity'),
                    activity_started_at=user.get('activity_started_at'),
                    total_hours_today=hours_today,
                    is_friend=user['id'] in friend_user_ids
                )
                results.append(result)
            
            return {
                "success": True,
                "query": query,
                "results": results,
                "total_found": len(results),
                "message": f"Found {len(results)} users"
            }
            
        except Exception as e:
            logger.error(f"Error searching users: {str(e)}")
            return {
                "success": False,
                "query": query,
                "results": [],
                "total_found": 0,
                "message": f"Search failed: {str(e)}"
            }
    
    async def add_friend(self, current_user_id: str, friend_user_id: str) -> Dict[str, Any]:
        """
        Add a friend relationship
        
        Args:
            current_user_id: ID of the current user
            friend_user_id: user_id of the friend to add
            
        Returns:
            Dictionary containing the result
        """
        try:
            # Find the friend's actual user ID from their user_id
            friend_result = self.supabase.table('users').select('id').eq('user_id', friend_user_id).execute()
            
            if not friend_result.data:
                return {
                    "success": False,
                    "message": "User not found"
                }
            
            friend_id = friend_result.data[0]['id']
            
            # Check if friendship already exists
            existing_friend = self.supabase.table('friends').select('id, status').or_(
                f'and(user_id.eq.{current_user_id},friend_user_id.eq.{friend_id}),'
                f'and(user_id.eq.{friend_id},friend_user_id.eq.{current_user_id})'
            ).execute()
            
            if existing_friend.data:
                friend_record = existing_friend.data[0]
                if friend_record['status'] == 'active':
                    return {
                        "success": False,
                        "message": "Already friends with this user"
                    }
                elif friend_record['status'] == 'pending':
                    return {
                        "success": False,
                        "message": "Friend request already pending"
                    }
                else:
                    # Reactivate blocked friendship
                    update_result = self.supabase.table('friends').update({
                        'status': 'active',
                        'updated_at': datetime.now().isoformat()
                    }).eq('id', friend_record['id']).execute()
                    
                    return {
                        "success": True,
                        "friend_id": friend_record['id'],
                        "message": "Friend re-added successfully"
                    }
            
            # Create new friendship
            friend_data = {
                'user_id': current_user_id,
                'friend_user_id': friend_id,
                'status': 'active'
            }
            
            create_result = self.supabase.table('friends').insert(friend_data).execute()
            
            if create_result.data:
                return {
                    "success": True,
                    "friend_id": create_result.data[0]['id'],
                    "message": "Friend added successfully"
                }
            else:
                return {
                    "success": False,
                    "message": "Failed to add friend"
                }
                
        except Exception as e:
            logger.error(f"Error adding friend: {str(e)}")
            return {
                "success": False,
                "message": f"Failed to add friend: {str(e)}"
            }
    
    async def remove_friend(self, current_user_id: str, friend_user_id: str) -> Dict[str, Any]:
        """
        Remove a friend relationship
        
        Args:
            current_user_id: ID of the current user
            friend_user_id: user_id of the friend to remove
            
        Returns:
            Dictionary containing the result
        """
        try:
            # Find the friend's actual user ID
            friend_result = self.supabase.table('users').select('id').eq('user_id', friend_user_id).execute()
            
            if not friend_result.data:
                return {
                    "success": False,
                    "message": "User not found"
                }
            
            friend_id = friend_result.data[0]['id']
            
            # Remove friendship (either direction)
            delete_result = self.supabase.table('friends').delete().or_(
                f'and(user_id.eq.{current_user_id},friend_user_id.eq.{friend_id}),'
                f'and(user_id.eq.{friend_id},friend_user_id.eq.{current_user_id})'
            ).execute()
            
            if delete_result.data:
                return {
                    "success": True,
                    "message": "Friend removed successfully"
                }
            else:
                return {
                    "success": False,
                    "message": "Friend relationship not found"
                }
                
        except Exception as e:
            logger.error(f"Error removing friend: {str(e)}")
            return {
                "success": False,
                "message": f"Failed to remove friend: {str(e)}"
            }
    
    async def get_friends_list(self, user_id: str) -> Dict[str, Any]:
        """
        Get list of friends for a user
        
        Args:
            user_id: ID of the user
            
        Returns:
            Dictionary containing friends list
        """
        try:
            # Get friends with user details
            friends_result = self.supabase.table('friends').select('''
                friend_user_id,
                created_at,
                users!friends_friend_user_id_fkey (
                    user_id,
                    username,
                    display_name,
                    avatar_url,
                    xp,
                    level,
                    current_activity,
                    activity_started_at,
                    total_hours_today
                )
            ''').eq('user_id', user_id).eq('status', 'active').execute()
            
            if not friends_result.data:
                return {
                    "success": True,
                    "friends": [],
                    "total_friends": 0,
                    "message": "No friends found"
                }
            
            friends = []
            for friend_record in friends_result.data:
                friend_user = friend_record['users']
                
                # Calculate today's hours from study sessions
                today_minutes = await self._get_today_minutes(friend_record['friend_user_id'])
                hours_today = round(today_minutes / 60, 1) if today_minutes >= 60 else today_minutes / 60
                
                friend_item = FriendListItem(
                    user_id=friend_user['user_id'],
                    username=friend_user['username'],
                    display_name=friend_user.get('display_name'),
                    avatar_url=friend_user.get('avatar_url'),
                    xp=friend_user['xp'],
                    level=friend_user['level'],
                    current_activity=friend_user.get('current_activity'),
                    activity_started_at=friend_user.get('activity_started_at'),
                    total_hours_today=hours_today,
                    friend_since=friend_record['created_at']
                )
                friends.append(friend_item)
            
            return {
                "success": True,
                "friends": friends,
                "total_friends": len(friends),
                "message": f"Found {len(friends)} friends"
            }
            
        except Exception as e:
            logger.error(f"Error getting friends list: {str(e)}")
            return {
                "success": False,
                "friends": [],
                "total_friends": 0,
                "message": f"Failed to get friends: {str(e)}"
            }
    
    async def get_friend_profile(self, current_user_id: str, friend_user_id: str) -> Dict[str, Any]:
        """
        Get detailed profile of a friend
        
        Args:
            current_user_id: ID of the current user
            friend_user_id: user_id of the friend
            
        Returns:
            Dictionary containing friend profile
        """
        try:
            # Check if they are friends
            friendship_result = self.supabase.table('friends').select('created_at, status').or_(
                f'and(user_id.eq.{current_user_id},users!friends_friend_user_id_fkey.user_id.eq.{friend_user_id}),'
                f'and(users!friends_friend_user_id_fkey.user_id.eq.{friend_user_id},friend_user_id.eq.{current_user_id})'
            ).eq('status', 'active').execute()
            
            if not friendship_result.data:
                return {
                    "success": False,
                    "message": "User is not your friend"
                }
            
            # Get friend details
            friend_result = self.supabase.table('users').select(
                'id, user_id, username, display_name, avatar_url, xp, level, streak_count, '
                'current_activity, activity_started_at, total_hours_today'
            ).eq('user_id', friend_user_id).execute()
            
            if not friend_result.data:
                return {
                    "success": False,
                    "message": "User not found"
                }
            
            friend_user = friend_result.data[0]
            
            # Calculate today's hours
            today_minutes = await self._get_today_minutes(friend_user['id'])
            hours_today = round(today_minutes / 60, 1) if today_minutes >= 60 else today_minutes / 60
            
            friend_profile = FriendProfile(
                id=friend_user['id'],
                user_id=friend_user['user_id'],
                username=friend_user['username'],
                display_name=friend_user.get('display_name'),
                avatar_url=friend_user.get('avatar_url'),
                xp=friend_user['xp'],
                level=friend_user['level'],
                streak_count=friend_user['streak_count'],
                current_activity=friend_user.get('current_activity'),
                activity_started_at=friend_user.get('activity_started_at'),
                total_hours_today=hours_today,
                friend_since=friendship_result.data[0]['created_at'],
                status='active'
            )
            
            return {
                "success": True,
                "friend": friend_profile,
                "message": "Friend profile retrieved successfully"
            }
            
        except Exception as e:
            logger.error(f"Error getting friend profile: {str(e)}")
            return {
                "success": False,
                "message": f"Failed to get friend profile: {str(e)}"
            }
    
    async def get_friend_stats(self, user_id: str) -> Dict[str, Any]:
        """
        Get friends statistics for a user
        
        Args:
            user_id: ID of the user
            
        Returns:
            Dictionary containing friend statistics
        """
        try:
            # Get total friends count
            total_friends_result = self.supabase.table('friends').select('id').eq(
                'user_id', user_id
            ).eq('status', 'active').execute()
            
            total_friends = len(total_friends_result.data) if total_friends_result.data else 0
            
            # Get friends with current activities
            friends_result = self.supabase.table('friends').select('''
                users!friends_friend_user_id_fkey (
                    current_activity
                )
            ''').eq('user_id', user_id).eq('status', 'active').execute()
            
            active_friends_today = 0
            friends_studying_now = 0
            friends_in_gym_now = 0
            friends_coding_now = 0
            
            if friends_result.data:
                for friend_record in friends_result.data:
                    activity = friend_record['users'].get('current_activity')
                    if activity:
                        active_friends_today += 1
                        if 'study' in activity.lower():
                            friends_studying_now += 1
                        elif 'gym' in activity.lower() or 'workout' in activity.lower():
                            friends_in_gym_now += 1
                        elif 'code' in activity.lower() or 'coding' in activity.lower():
                            friends_coding_now += 1
            
            stats = FriendStats(
                total_friends=total_friends,
                active_friends_today=active_friends_today,
                friends_studying_now=friends_studying_now,
                friends_in_gym_now=friends_in_gym_now,
                friends_coding_now=friends_coding_now
            )
            
            return {
                "success": True,
                "stats": stats,
                "message": "Friend statistics retrieved successfully"
            }
            
        except Exception as e:
            logger.error(f"Error getting friend stats: {str(e)}")
            return {
                "success": False,
                "stats": None,
                "message": f"Failed to get friend stats: {str(e)}"
            }
    
    async def update_user_activity(self, user_id: str, activity: str) -> Dict[str, Any]:
        """
        Update user's current activity
        
        Args:
            user_id: ID of the user
            activity: Current activity
            
        Returns:
            Dictionary containing the result
        """
        try:
            update_data = {
                'current_activity': activity,
                'activity_started_at': datetime.now().isoformat()
            }
            
            result = self.supabase.table('users').update(update_data).eq('id', user_id).execute()
            
            if result.data:
                return {
                    "success": True,
                    "user_id": user_id,
                    "activity": {
                        "current_activity": activity,
                        "activity_started_at": update_data['activity_started_at']
                    },
                    "message": "Activity updated successfully"
                }
            else:
                return {
                    "success": False,
                    "message": "Failed to update activity"
                }
                
        except Exception as e:
            logger.error(f"Error updating user activity: {str(e)}")
            return {
                "success": False,
                "message": f"Failed to update activity: {str(e)}"
            }
    
    async def _get_today_minutes(self, user_id: str) -> int:
        """
        Get total study minutes for today for a user
        
        Args:
            user_id: ID of the user
            
        Returns:
            Total minutes studied today
        """
        try:
            import pytz
            from datetime import datetime, timedelta
            
            # Use IST timezone for calculations
            ist_tz = pytz.timezone("Asia/Kolkata")
            today_ist = datetime.now(ist_tz).date()
            
            today_start = datetime.combine(today_ist, datetime.min.time()).replace(tzinfo=ist_tz)
            today_end = today_start + timedelta(days=1)
            
            sessions_result = self.supabase.table('study_sessions').select('duration_minutes').eq(
                'user_id', user_id
            ).gte('created_at', today_start.isoformat()).lt('created_at', today_end.isoformat()).execute()
            
            if sessions_result.data:
                return sum(session['duration_minutes'] for session in sessions_result.data)
            return 0
            
        except Exception as e:
            logger.error(f"Error getting today minutes for user {user_id}: {str(e)}")
            return 0