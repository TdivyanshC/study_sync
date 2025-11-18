"""
Type definitions for the gamification system
"""

from pydantic import BaseModel, Field
from typing import Optional, Dict, Any, List
from datetime import datetime, date
from enum import Enum


class XPSource(str, Enum):
    """XP source types"""
    SESSION = "session"
    STREAK = "streak"
    DAILY_BONUS = "daily_bonus"
    MILESTONE = "milestone"
    ACHIEVEMENT = "achievement"
    ADMIN = "admin"


class LeaderboardPeriod(str, Enum):
    """Leaderboard periods"""
    WEEKLY = "weekly"
    MONTHLY = "monthly"
    ALL_TIME = "all-time"


class SessionEventType(str, Enum):
    """Session event types"""
    HEARTBEAT = "heartbeat"
    START = "start"
    PAUSE = "pause"
    RESUME = "resume"
    END = "end"
    AUDIT_CHECK = "audit_check"


class XPAwardRequest(BaseModel):
    """Request model for awarding XP"""
    user_id: str
    amount: int
    source: XPSource
    metadata: Optional[Dict[str, Any]] = {}


class XPAwardResponse(BaseModel):
    """Response model for XP award"""
    success: bool
    xp_history_id: Optional[str] = None
    total_xp: int
    level: int
    message: str


class SessionCalculationRequest(BaseModel):
    """Request model for session XP calculation"""
    session_id: str


class XPCalculationDetails(BaseModel):
    """Detailed XP calculation breakdown"""
    base_xp: int
    bonus_pomodoro: int
    bonus_daily_goal: int
    milestone_500: int
    milestone_10000: int
    total_xp: int
    calculation_metadata: Dict[str, Any]


class SessionCalculationResponse(BaseModel):
    """Response model for session XP calculation"""
    success: bool
    session_id: str
    user_id: str
    duration_minutes: int
    calculation: XPCalculationDetails
    xp_awarded: XPAwardResponse
    message: str


class LeaderboardEntry(BaseModel):
    """Individual leaderboard entry"""
    rank: int
    user_id: str
    username: str
    xp: int
    level: int
    streak_multiplier: float
    growth_percentage: Optional[float] = None


class LeaderboardResponse(BaseModel):
    """Response model for leaderboard"""
    success: bool
    period: LeaderboardPeriod
    entries: List[LeaderboardEntry]
    total_users: int
    generated_at: datetime
    message: str


class XPHistoryEntry(BaseModel):
    """XP history entry"""
    id: str
    user_id: str
    amount: int
    source: XPSource
    metadata: Dict[str, Any]
    created_at: datetime


class DailyMetricsEntry(BaseModel):
    """Daily user metrics entry"""
    id: str
    user_id: str
    date: date
    total_minutes: int
    xp_earned: int
    streak_active: bool
    space_breakdown: Dict[str, int]
    updated_at: datetime


class SessionAuditEntry(BaseModel):
    """Session audit entry"""
    id: str
    session_id: str
    user_id: str
    suspicion_score: int
    reasons: List[str]
    events: Dict[str, Any]
    is_flagged: bool
    created_at: datetime


class SessionEventEntry(BaseModel):
    """Session event entry"""
    id: str
    session_id: str
    user_id: str
    event_type: SessionEventType
    event_payload: Dict[str, Any]
    created_at: datetime


class AuditValidationRequest(BaseModel):
    """Request model for audit validation"""
    session_id: str
    user_id: str
    validation_mode: str = "soft"  # soft, strict


class AuditValidationResponse(BaseModel):
    """Response model for audit validation"""
    session_id: str
    user_id: str
    is_valid: bool
    suspicion_score: int
    validation_details: Dict[str, Any]
    message: str


class OfflineSyncRequest(BaseModel):
    """Request model for offline sync"""
    user_id: str
    events: List[Dict[str, Any]]
    last_sync: Optional[datetime] = None


class OfflineSyncResponse(BaseModel):
    """Response model for offline sync"""
    success: bool
    synced_events: int
    pending_events: int
    conflicts_resolved: int
    message: str


# Streak-related types for Module B2

class StreakUpdateRequest(BaseModel):
    """Request model for updating user streak"""
    user_id: str


class StreakUpdateResponse(BaseModel):
    """Response model for streak update"""
    success: bool
    current_streak: int
    best_streak: int
    streak_broken: bool
    milestone_reached: Optional[str] = None
    streak_multiplier: float
    streak_bonus_xp: int
    message: str


class StreakContinuityRequest(BaseModel):
    """Request model for checking streak continuity"""
    user_id: str


class StreakContinuityResponse(BaseModel):
    """Response model for streak continuity check"""
    success: bool
    streak_active: bool
    has_recent_activity: bool
    current_streak: int
    time_until_break: Optional[str] = None
    message: str


class StreakBonusRequest(BaseModel):
    """Request model for streak bonus calculation"""
    user_id: str


class StreakBonusResponse(BaseModel):
    """Response model for streak bonus"""
    success: bool
    current_streak: int
    best_streak: int
    streak_multiplier: float
    bonus_xp: int
    bonus_applied: bool
    message: str


class StreakAnalyticsResponse(BaseModel):
    """Response model for streak analytics"""
    success: bool
    analytics: Dict[str, Any]
    date_range: Dict[str, Any]
    message: str


class StreakMilestoneEvent(BaseModel):
    """Streak milestone achievement event"""
    user_id: str
    milestone_type: str  # e.g., "7_day_streak", "30_day_streak"
    current_streak: int
    bonus_awarded: int
    timestamp: datetime


class StreakBrokenEvent(BaseModel):
    """Streak broken event"""
    user_id: str
    broken_streak_length: int
    days_inactive: int
    timestamp: datetime


# Soft Audit types for Module Soft

class SoftAuditValidationRequest(BaseModel):
    """Enhanced request model for soft audit validation"""
    session_id: str
    user_id: str
    validation_mode: str = "soft"  # soft, strict


class SoftAuditValidationResponse(BaseModel):
    """Enhanced response model for soft audit validation"""
    success: bool
    session_id: str
    user_id: str
    is_valid: bool
    validation_mode: str
    base_suspicion_score: int
    adjusted_suspicion_score: int
    forgiveness_applied: Optional[Dict[str, Any]] = None
    suspicion_threshold: int
    validation_details: Dict[str, Any]
    message: str


class AuditForgivenessRequest(BaseModel):
    """Request model for audit forgiveness calculation"""
    user_id: str


class AuditForgivenessResponse(BaseModel):
    """Response model for audit forgiveness"""
    success: bool
    user_id: str
    forgiveness_profile: Dict[str, Any]
    user_history: Dict[str, Any]
    audit_history: Dict[str, Any]
    message: str


class AuditForgivenessEvent(BaseModel):
    """Audit forgiveness event"""
    user_id: str
    forgiveness_rate: float
    streak_contribution: float
    xp_contribution: float
    behavior_contribution: float
    timestamp: datetime


class SoftAuditFlagEvent(BaseModel):
    """Soft audit flag event (non-punitive)"""
    user_id: str
    session_id: str
    suspicion_score: int
    adjusted_score: int
    forgiveness_applied: float
    is_valid: bool
    recommendations: List[str]
    timestamp: datetime