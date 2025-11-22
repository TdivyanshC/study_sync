"""
Badge Service - Comprehensive badge management system (Module B1)
Handles badge definitions, awarding logic, and badge collection management
"""

import logging
from datetime import datetime, timedelta
from typing import Dict, Any, List, Optional, Tuple
from supabase import Client

logger = logging.getLogger(__name__)


# Simple event emitter for badge events
class BadgeEventEmitter:
    def __init__(self):
        self.listeners = {}
    
    def emitBadgeUnlocked(self, event):
        if 'badge_unlocked' in self.listeners:
            for callback in self.listeners['badge_unlocked']:
                try:
                    callback(event)
                except Exception as e:
                    logger.warning(f"Error in badge unlocked listener: {e}")
    
    def emitBadgeNotification(self, event):
        if 'badge_notification' in self.listeners:
            for callback in self.listeners['badge_notification']:
                try:
                    callback(event)
                except Exception as e:
                    logger.warning(f"Error in badge notification listener: {e}")


# Global event emitter instance
badge_event_emitter = BadgeEventEmitter()


# Event classes
class BadgeUnlockedEvent:
    def __init__(self, userId, badge, earnedAt, totalBadges, timestamp):
        self.userId = userId
        self.badge = badge
        self.earnedAt = earnedAt
        self.totalBadges = totalBadges
        self.timestamp = timestamp


class BadgeNotificationEvent:
    def __init__(self, userId, type, badgeId, title, message, icon, timestamp):
        self.userId = userId
        self.type = type
        self.badgeId = badgeId
        self.title = title
        self.message = message
        self.icon = icon
        self.timestamp = timestamp


class BadgeService:
    """Service for managing badge system operations"""
    
    def __init__(self, supabase_client: Client):
        self.supabase = supabase_client
        
        # Badge definitions - comprehensive set of badges
        self.badge_definitions = {
            "first_session": {
                "title": "First Steps",
                "description": "Complete your first study session",
                "icon": "🎯",
                "requirement_type": "session_count",
                "requirement_value": 1,
                "category": "milestone"
            },
            "7_day_streak": {
                "title": "7 Day Streak",
                "description": "Study for 7 consecutive days",
                "icon": "🔥",
                "requirement_type": "streak_days",
                "requirement_value": 7,
                "category": "streak"
            },
            "30_day_streak": {
                "title": "Monthly Master",
                "description": "Study for 30 consecutive days",
                "icon": "👑",
                "requirement_type": "streak_days",
                "requirement_value": 30,
                "category": "streak"
            },
            "100_day_streak": {
                "title": "Century Club",
                "description": "Study for 100 consecutive days",
                "icon": "💎",
                "requirement_type": "streak_days",
                "requirement_value": 100,
                "category": "streak"
            },
            "10_hour_grind": {
                "title": "10 Hour Grind",
                "description": "Study 10 hours in a single day",
                "icon": "⚡",
                "requirement_type": "daily_minutes",
                "requirement_value": 600,  # 10 hours
                "category": "session"
            },
            "level_5": {
                "title": "Level Up",
                "description": "Reach level 5",
                "icon": "⭐",
                "requirement_type": "level",
                "requirement_value": 5,
                "category": "milestone"
            },
            "level_10": {
                "title": "Power User",
                "description": "Reach level 10",
                "icon": "🚀",
                "requirement_type": "level",
                "requirement_value": 10,
                "category": "milestone"
            },
            "100_xp": {
                "title": "Rookie",
                "description": "Earn 100 XP total",
                "icon": "🌟",
                "requirement_type": "total_xp",
                "requirement_value": 100,
                "category": "xp"
            },
            "1000_xp": {
                "title": "Expert",
                "description": "Earn 1,000 XP total",
                "icon": "🎓",
                "requirement_type": "total_xp",
                "requirement_value": 1000,
                "category": "xp"
            },
            "5000_xp": {
                "title": "Master",
                "description": "Earn 5,000 XP total",
                "icon": "🏆",
                "requirement_type": "total_xp",
                "requirement_value": 5000,
                "category": "xp"
            },
            "50_sessions": {
                "title": "Dedicated Student",
                "description": "Complete 50 study sessions",
                "icon": "📚",
                "requirement_type": "session_count",
                "requirement_value": 50,
                "category": "session"
            },
            "100_sessions": {
                "title": "Study Warrior",
                "description": "Complete 100 study sessions",
                "icon": "⚔️",
                "requirement_type": "session_count",
                "requirement_value": 100,
                "category": "session"
            }
        }
    
    async def check_and_award_badges(self, user_id: str) -> List[Dict[str, Any]]:
        """
        Check if user qualifies for any badges and award them
        
        Args:
            user_id: User UUID
            
        Returns:
            List of newly awarded badges
        """
        try:
            # Get user's current stats
            user_stats = await self._get_user_stats(user_id)
            newly_awarded = []
            
            for badge_key, badge_def in self.badge_definitions.items():
                # Check if user already has this badge
                existing_badge = await self._check_existing_badge(user_id, badge_key)
                if existing_badge:
                    continue
                
                # Check if user qualifies for badge
                qualifies = await self._check_badge_qualification(
                    user_id, badge_key, badge_def, user_stats
                )
                
                if qualifies:
                    # Award the badge
                    awarded_badge = await self._award_badge(user_id, badge_key, badge_def)
                    if awarded_badge:
                        newly_awarded.append(awarded_badge)
                        
                        # Emit badge events
                        await self._emit_badge_events(user_id, awarded_badge, len(newly_awarded))
            
            if newly_awarded:
                logger.info(f"Awarded {len(newly_awarded)} new badges to user {user_id}")
            
            return newly_awarded
            
        except Exception as e:
            logger.error(f"Error checking and awarding badges: {str(e)}")
            return []
    
    async def get_user_badges(self, user_id: str) -> Dict[str, Any]:
        """
        Get all badges for a user including progress information
        
        Args:
            user_id: User UUID
            
        Returns:
            User's badge collection with progress
        """
        try:
            # Get user's current badges
            user_badges_result = self.supabase.table('user_badges').select('''
                id,
                badge_id,
                achieved_at,
                badges (
                    id,
                    title,
                    description,
                    icon_url,
                    requirement_type,
                    requirement_value,
                    category
                )
            ''').eq('user_id', user_id).execute()
            
            if not user_badges_result.data:
                return {
                    'success': True,
                    'badges': [],
                    'total_badges': 0,
                    'badge_categories': {},
                    'recent_badges': []
                }
            
            # Get user's current stats for progress calculation
            user_stats = await self._get_user_stats(user_id)
            
            # Format badge data
            badges = []
            badge_categories = {}
            for record in user_badges_result.data:
                badge = record['badges']
                progress = await self._calculate_badge_progress(badge, user_stats)
                
                badge_data = {
                    'id': record['id'],
                    'badge_id': record['badge_id'],
                    'achieved_at': record['achieved_at'],
                    'title': badge['title'],
                    'description': badge['description'],
                    'icon': badge['icon_url'],
                    'category': badge['category'],
                    'requirement_type': badge['requirement_type'],
                    'requirement_value': badge['requirement_value'],
                    'progress': progress,
                    'is_achieved': True
                }
                
                badges.append(badge_data)
                
                # Count by category
                category = badge['category']
                if category not in badge_categories:
                    badge_categories[category] = 0
                badge_categories[category] += 1
            
            # Sort by achievement date (most recent first)
            badges.sort(key=lambda x: x['achieved_at'], reverse=True)
            recent_badges = badges[:5]  # Last 5 badges
            
            return {
                'success': True,
                'badges': badges,
                'total_badges': len(badges),
                'badge_categories': badge_categories,
                'recent_badges': recent_badges
            }
            
        except Exception as e:
            logger.error(f"Error getting user badges: {str(e)}")
            return {
                'success': False,
                'badges': [],
                'total_badges': 0,
                'badge_categories': {},
                'recent_badges': [],
                'error': str(e)
            }
    
    async def get_badge_leaderboard(self, limit: int = 50) -> Dict[str, Any]:
        """
        Get badge collection leaderboard
        
        Args:
            limit: Maximum number of users to return
            
        Returns:
            Leaderboard of users by badge count
        """
        try:
            # Get users with their badge counts
            result = self.supabase.table('users').select('''
                id,
                username,
                xp,
                level
            ''').execute()
            
            if not result.data:
                return {
                    'success': False,
                    'leaderboard': [],
                    'message': 'No users found'
                }
            
            # Get badge counts for each user
            leaderboard = []
            for user in result.data:
                user_id = user['id']
                
                # Get badge count
                badge_count_result = self.supabase.table('user_badges').select('id').eq(
                    'user_id', user_id
                ).execute()
                
                badge_count = len(badge_count_result.data)
                
                leaderboard.append({
                    'user_id': user_id,
                    'username': user['username'],
                    'badge_count': badge_count,
                    'level': user['level'],
                    'total_xp': user['xp']
                })
            
            # Sort by badge count (descending) then by total XP
            leaderboard.sort(key=lambda x: (x['badge_count'], x['total_xp']), reverse=True)
            leaderboard = leaderboard[:limit]
            
            # Add rank
            for i, entry in enumerate(leaderboard, 1):
                entry['rank'] = i
            
            return {
                'success': True,
                'leaderboard': leaderboard,
                'total_users': len(leaderboard),
                'generated_at': datetime.now().isoformat()
            }
            
        except Exception as e:
            logger.error(f"Error getting badge leaderboard: {str(e)}")
            return {
                'success': False,
                'leaderboard': [],
                'error': str(e)
            }
    
    # Private helper methods
    
    async def _get_user_stats(self, user_id: str) -> Dict[str, Any]:
        """Get comprehensive user statistics for badge checking"""
        try:
            # Get basic user info
            user_result = self.supabase.table('users').select('xp, level, streak_count').eq(
                'id', user_id
            ).execute()
            
            if not user_result.data:
                return {}
            
            user = user_result.data[0]
            
            # Get session count
            sessions_result = self.supabase.table('study_sessions').select('id').eq(
                'user_id', user_id
            ).execute()
            session_count = len(sessions_result.data) if sessions_result.data else 0
            
            # Get daily minutes (last 24 hours)
            yesterday = datetime.now() - timedelta(days=1)
            daily_sessions_result = self.supabase.table('study_sessions').select('duration_minutes').eq(
                'user_id', user_id
            ).gte('created_at', yesterday.isoformat()).execute()
            
            daily_minutes = 0
            if daily_sessions_result.data:
                daily_minutes = sum(session['duration_minutes'] for session in daily_sessions_result.data)
            
            # Get current streak
            current_streak = user.get('streak_count', 0)
            
            return {
                'total_xp': user.get('xp', 0),
                'level': user.get('level', 1),
                'session_count': session_count,
                'daily_minutes': daily_minutes,
                'current_streak': current_streak
            }
            
        except Exception as e:
            logger.warning(f"Error getting user stats: {str(e)}")
            return {
                'total_xp': 0,
                'level': 1,
                'session_count': 0,
                'daily_minutes': 0,
                'current_streak': 0
            }
    
    async def _check_existing_badge(self, user_id: str, badge_key: str) -> Optional[Dict[str, Any]]:
        """Check if user already has a specific badge"""
        try:
            # First ensure badge exists
            badge_result = self.supabase.table('badges').select('id').eq(
                'title', self.badge_definitions[badge_key]['title']
            ).execute()
            
            if not badge_result.data:
                return None
            
            badge_id = badge_result.data[0]['id']
            
            # Check if user has it
            user_badge_result = self.supabase.table('user_badges').select('*').eq(
                'user_id', user_id
            ).eq('badge_id', badge_id).execute()
            
            return user_badge_result.data[0] if user_badge_result.data else None
            
        except Exception as e:
            logger.warning(f"Error checking existing badge: {str(e)}")
            return None
    
    async def _check_badge_qualification(self, user_id: str, badge_key: str, badge_def: Dict, user_stats: Dict) -> bool:
        """Check if user qualifies for a specific badge"""
        try:
            requirement_type = badge_def['requirement_type']
            requirement_value = badge_def['requirement_value']
            
            if requirement_type == 'session_count':
                return user_stats.get('session_count', 0) >= requirement_value
            
            elif requirement_type == 'streak_days':
                return user_stats.get('current_streak', 0) >= requirement_value
            
            elif requirement_type == 'level':
                return user_stats.get('level', 1) >= requirement_value
            
            elif requirement_type == 'total_xp':
                return user_stats.get('total_xp', 0) >= requirement_value
            
            elif requirement_type == 'daily_minutes':
                return user_stats.get('daily_minutes', 0) >= requirement_value
            
            return False
            
        except Exception as e:
            logger.warning(f"Error checking badge qualification: {str(e)}")
            return False
    
    async def _award_badge(self, user_id: str, badge_key: str, badge_def: Dict) -> Optional[Dict[str, Any]]:
        """Award a badge to a user"""
        try:
            # Ensure badge exists in badges table
            existing_badge = self.supabase.table('badges').select('id').eq(
                'title', badge_def['title']
            ).execute()
            
            if not existing_badge.data:
                # Create the badge
                new_badge = self.supabase.table('badges').insert({
                    'title': badge_def['title'],
                    'description': badge_def['description'],
                    'icon_url': badge_def['icon'],
                    'requirement_type': badge_def['requirement_type'],
                    'requirement_value': badge_def['requirement_value'],
                    'category': badge_def['category']
                }).execute()
                
                if not new_badge.data:
                    logger.warning(f"Failed to create badge: {badge_def['title']}")
                    return None
                
                badge_id = new_badge.data[0]['id']
            else:
                badge_id = existing_badge.data[0]['id']
            
            # Award badge to user
            user_badge = self.supabase.table('user_badges').insert({
                'user_id': user_id,
                'badge_id': badge_id,
                'achieved_at': datetime.now().isoformat()
            }).execute()
            
            if not user_badge.data:
                logger.warning(f"Failed to award badge to user: {badge_def['title']}")
                return None
            
            # Return awarded badge data
            return {
                'badge_key': badge_key,
                'badge_id': badge_id,
                'title': badge_def['title'],
                'description': badge_def['description'],
                'icon': badge_def['icon'],
                'category': badge_def['category'],
                'achieved_at': user_badge.data[0]['achieved_at']
            }
            
        except Exception as e:
            logger.error(f"Error awarding badge: {str(e)}")
            return None
    
    async def _calculate_badge_progress(self, badge: Dict, user_stats: Dict) -> Dict[str, Any]:
        """Calculate progress towards a badge"""
        try:
            requirement_type = badge['requirement_type']
            requirement_value = badge['requirement_value']
            current_value = 0
            
            if requirement_type == 'session_count':
                current_value = user_stats.get('session_count', 0)
            elif requirement_type == 'streak_days':
                current_value = user_stats.get('current_streak', 0)
            elif requirement_type == 'level':
                current_value = user_stats.get('level', 1)
            elif requirement_type == 'total_xp':
                current_value = user_stats.get('total_xp', 0)
            elif requirement_type == 'daily_minutes':
                current_value = user_stats.get('daily_minutes', 0)
            
            progress_percent = min((current_value / requirement_value) * 100, 100)
            
            return {
                'current': current_value,
                'target': requirement_value,
                'percentage': round(progress_percent, 1),
                'is_complete': current_value >= requirement_value
            }
            
        except Exception as e:
            logger.warning(f"Error calculating badge progress: {str(e)}")
            return {
                'current': 0,
                'target': requirement_value,
                'percentage': 0,
                'is_complete': False
            }
    
    async def _emit_badge_events(self, user_id: str, badge: Dict, position: int):
        """Emit badge-related events"""
        try:
            # Badge unlocked event
            unlocked_event = BadgeUnlockedEvent(
                userId=user_id,
                badge={
                    'id': badge['badge_id'],
                    'title': badge['title'],
                    'description': badge['description'],
                    'icon_url': badge['icon']
                },
                earnedAt=datetime.fromisoformat(badge['achieved_at']),
                totalBadges=position,
                timestamp=datetime.now()
            )
            badge_event_emitter.emitBadgeUnlocked(unlocked_event)
            
            # Badge notification event
            notification_event = BadgeNotificationEvent(
                userId=user_id,
                type='unlocked',
                badgeId=badge['badge_id'],
                title='Achievement Unlocked!',
                message=f"You earned the {badge['title']} badge!",
                icon=badge['icon'],
                timestamp=datetime.now()
            )
            badge_event_emitter.emitBadgeNotification(notification_event)
            
        except Exception as e:
            logger.warning(f"Error emitting badge events: {str(e)}")