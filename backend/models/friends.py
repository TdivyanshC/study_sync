"""
Type definitions for the friends system
"""

from pydantic import BaseModel, Field
from typing import Optional, Dict, Any, List
from datetime import datetime, date
from enum import Enum


class FriendStatus(str, Enum):
    """Friend relationship status"""
    ACTIVE = "active"
    BLOCKED = "blocked"
    PENDING = "pending"


class UserSearchRequest(BaseModel):
    """Request model for searching users"""
    query: str = Field(..., description="Search query (username or user_id)")
    limit: int = Field(10, ge=1, le=50, description="Maximum number of results")


class UserSearchResult(BaseModel):
    """Individual user search result"""
    id: str
    user_id: str
    username: str
    display_name: Optional[str] = None
    avatar_url: Optional[str] = None
    xp: int
    level: int
    streak_count: int
    current_activity: Optional[str] = None
    activity_started_at: Optional[datetime] = None
    total_hours_today: float
    is_friend: bool = False


class UserSearchResponse(BaseModel):
    """Response model for user search"""
    success: bool
    query: str
    results: List[UserSearchResult]
    total_found: int
    message: str


class AddFriendRequest(BaseModel):
    """Request model for adding a friend"""
    friend_user_id: str = Field(..., description="The user_id of the friend to add")


class AddFriendResponse(BaseModel):
    """Response model for adding a friend"""
    success: bool
    friend_id: Optional[str] = None
    message: str
    status: str


class RemoveFriendRequest(BaseModel):
    """Request model for removing a friend"""
    friend_user_id: str = Field(..., description="The user_id of the friend to remove")


class RemoveFriendResponse(BaseModel):
    """Response model for removing a friend"""
    success: bool
    message: str


class FriendActivityUpdate(BaseModel):
    """Friend activity update"""
    current_activity: str
    activity_started_at: datetime


class FriendActivityResponse(BaseModel):
    """Response model for friend activity"""
    success: bool
    user_id: str
    activity: Optional[FriendActivityUpdate] = None
    message: str


class FriendProfile(BaseModel):
    """Friend profile information"""
    id: str
    user_id: str
    username: str
    display_name: Optional[str] = None
    avatar_url: Optional[str] = None
    xp: int
    level: int
    streak_count: int
    current_activity: Optional[str] = None
    activity_started_at: Optional[datetime] = None
    total_hours_today: float
    friend_since: datetime
    status: FriendStatus


class FriendProfileResponse(BaseModel):
    """Response model for friend profile"""
    success: bool
    friend: FriendProfile
    message: str


class FriendListItem(BaseModel):
    """Individual friend list item"""
    user_id: str
    username: str
    display_name: Optional[str] = None
    avatar_url: Optional[str] = None
    xp: int
    level: int
    current_activity: Optional[str] = None
    activity_started_at: Optional[datetime] = None
    total_hours_today: float
    friend_since: datetime


class FriendListResponse(BaseModel):
    """Response model for getting friends list"""
    success: bool
    friends: List[FriendListItem]
    total_friends: int
    message: str


class FriendStats(BaseModel):
    """Friend statistics"""
    total_friends: int
    active_friends_today: int
    friends_studying_now: int
    friends_in_gym_now: int
    friends_coding_now: int


class FriendStatsResponse(BaseModel):
    """Response model for friend statistics"""
    success: bool
    stats: FriendStats
    message: str


class FriendActivityFeedItem(BaseModel):
    """Friend activity feed item"""
    friend_user_id: str
    friend_name: str
    activity_type: str
    activity_description: str
    hours_spent: float
    timestamp: datetime


class FriendActivityFeedResponse(BaseModel):
    """Response model for friend activity feed"""
    success: bool
    activities: List[FriendActivityFeedItem]
    total_activities: int
    message: str