"""
Streak Service - Enhanced streak management for Module B2
"""

import logging
from datetime import datetime, timedelta, date
from typing import Dict, Any, List, Optional, Tuple
from supabase import create_client, Client

from utils.gamification_helpers import StreakCalculator, XPConstants

logger = logging.getLogger(__name__)


class StreakService:
    """Enhanced service for managing daily study streaks"""
    
    def __init__(self, supabase_client: Client):
        self.supabase = supabase_client
        
        # Streak bonus constants
        self.STREAK_BONUS_BASE = 5  # Base XP bonus for streak
        self.STREAK_BONUS_MULTIPLIER = 2  # Bonus increases every 7 days
        self.STREAK_BONUS_MAX = 50  # Maximum bonus XP
        
        # Streak milestones for special recognition
        self.STREAK_MILESTONES = [3, 7, 14, 30, 60, 100, 365]
    
    async def update_daily_login_streak(self, user_id: str) -> Dict[str, Any]:
        """
        Update user's daily login streak
        
        Args:
            user_id: User UUID
            
        Returns:
            Dictionary with updated streak information
        """
        try:
            today = date.today()
            
            # Get user's study sessions to calculate streak
            sessions_result = self.supabase.table('study_sessions').select('created_at').eq(
                'user_id', user_id
            ).order('created_at').execute()
            
            if not sessions_result.data:
                logger.error("Failed to fetch sessions")
                return {'success': False, 'message': 'Failed to fetch sessions'}
            
            sessions = sessions_result.data
            current_streak, best_streak, multiplier = StreakCalculator.calculate_streak(sessions)
            
            # Check if streak was just broken
            streak_broken = False
            if current_streak == 0 and sessions:
                # Check if there were sessions but streak is broken due to inactivity
                last_session_date = datetime.fromisoformat(
                    sessions[-1]['created_at'].replace('Z', '+00:00')
                ).date()
                days_since_last = (today - last_session_date).days
                if days_since_last > 1:
                    streak_broken = True
            
            # Check for milestone achievements
            milestone_reached = None
            if current_streak > 0:
                milestone_reached = self._check_milestone_reached(user_id, current_streak, best_streak)
            
            # Update user's streak in profile
            await self._update_user_streak(user_id, current_streak)
            
            # Create or update daily streak record
            await self._record_daily_streak(user_id, today, current_streak, streak_broken)
            
            return {
                'success': True,
                'current_streak': current_streak,
                'best_streak': best_streak,
                'streak_broken': streak_broken,
                'milestone_reached': milestone_reached,
                'streak_multiplier': multiplier,
                'streak_bonus_xp': self._calculate_streak_bonus(current_streak),
                'message': f'Streak updated: {current_streak} days'
            }
            
        except Exception as e:
            logger.error(f"Error updating daily login streak: {str(e)}")
            return {'success': False, 'message': f'Internal error: {str(e)}'}
    
    async def check_streak_continuity(self, user_id: str) -> Dict[str, Any]:
        """
        Check if user's streak is still active or has been broken
        
        Args:
            user_id: User UUID
            
        Returns:
            Dictionary with streak continuity information
        """
        try:
            today = date.today()
            yesterday = today - timedelta(days=1)
            
            # Check if user has activity today or yesterday
            activity_result = self.supabase.table('study_sessions').select('created_at').eq(
                'user_id', user_id
            ).gte('created_at', yesterday.isoformat()).execute()
            
            has_recent_activity = bool(activity_result.data)
            
            # Get current streak
            sessions_result = self.supabase.table('study_sessions').select('created_at').eq(
                'user_id', user_id
            ).order('created_at').execute()
            
            if not sessions_result.data:
                return {'success': False, 'message': 'Failed to check streak continuity'}
            
            sessions = sessions_result.data
            current_streak, _, _ = StreakCalculator.calculate_streak(sessions)
            
            # Determine if streak is still active
            streak_active = has_recent_activity or current_streak == 0
            
            # Calculate time until streak breaks (24 hours from last activity)
            time_until_break = None
            if not has_recent_activity and sessions:
                last_activity = datetime.fromisoformat(
                    sessions[-1]['created_at'].replace('Z', '+00:00')
                )
                break_time = last_activity + timedelta(hours=24)
                time_until_break = break_time.isoformat()
            
            return {
                'success': True,
                'streak_active': streak_active,
                'has_recent_activity': has_recent_activity,
                'current_streak': current_streak,
                'time_until_break': time_until_break,
                'message': 'Streak continuity checked'
            }
            
        except Exception as e:
            logger.error(f"Error checking streak continuity: {str(e)}")
            return {'success': False, 'message': f'Internal error: {str(e)}'}
    
    async def get_streak_bonus_xp(self, user_id: str) -> Dict[str, Any]:
        """
        Calculate and return streak bonus XP
        
        Args:
            user_id: User UUID
            
        Returns:
            Dictionary with streak bonus information
        """
        try:
            # Get current streak
            sessions_result = self.supabase.table('study_sessions').select('created_at').eq(
                'user_id', user_id
            ).order('created_at').execute()
            
            if not sessions_result.data:
                return {'success': False, 'message': 'Failed to calculate streak bonus'}
            
            sessions = sessions_result.data
            current_streak, best_streak, multiplier = StreakCalculator.calculate_streak(sessions)
            
            # Calculate streak bonus
            bonus_xp = self._calculate_streak_bonus(current_streak)
            bonus_applied = bonus_xp > 0
            
            return {
                'success': True,
                'current_streak': current_streak,
                'best_streak': best_streak,
                'streak_multiplier': multiplier,
                'bonus_xp': bonus_xp,
                'bonus_applied': bonus_applied,
                'message': f'Streak bonus: {bonus_xp} XP for {current_streak}-day streak'
            }
            
        except Exception as e:
            logger.error(f"Error calculating streak bonus: {str(e)}")
            return {'success': False, 'message': f'Internal error: {str(e)}'}
    
    async def apply_streak_multiplier_to_xp(self, user_id: str, base_xp: int) -> Dict[str, Any]:
        """
        Apply streak multiplier to base XP
        
        Args:
            user_id: User UUID
            base_xp: Base XP amount to multiply
            
        Returns:
            Dictionary with multiplied XP information
        """
        try:
            # Get streak multiplier
            sessions_result = self.supabase.table('study_sessions').select('created_at').eq(
                'user_id', user_id
            ).order('created_at').execute()
            
            if not sessions_result.data:
                return {'success': False, 'message': 'Failed to apply streak multiplier'}
            
            sessions = sessions_result.data
            current_streak, _, multiplier = StreakCalculator.calculate_streak(sessions)
            
            # Apply multiplier
            final_xp = int(base_xp * multiplier)
            bonus_xp = final_xp - base_xp
            
            return {
                'success': True,
                'base_xp': base_xp,
                'multiplier': multiplier,
                'final_xp': final_xp,
                'bonus_xp': bonus_xp,
                'current_streak': current_streak,
                'message': f'Applied {multiplier}x multiplier: {base_xp} → {final_xp} XP'
            }
            
        except Exception as e:
            logger.error(f"Error applying streak multiplier: {str(e)}")
            return {'success': False, 'message': f'Internal error: {str(e)}'}
    
    async def get_streak_analytics(self, user_id: str, days: int = 30) -> Dict[str, Any]:
        """
        Get detailed streak analytics
        
        Args:
            user_id: User UUID
            days: Number of days to analyze
            
        Returns:
            Dictionary with streak analytics
        """
        try:
            end_date = date.today()
            start_date = end_date - timedelta(days=days)
            
            # Get daily streak records
            daily_result = self.supabase.table('daily_user_metrics').select('*').eq(
                'user_id', user_id
            ).gte('date', start_date.isoformat()).lte('date', end_date.isoformat()).order('date').execute()
            
            if not daily_result.data:
                return {'success': False, 'message': 'Failed to fetch streak analytics'}
            
            daily_records = daily_result.data
            
            # Analyze streak patterns
            analytics = self._analyze_streak_patterns(daily_records, start_date, end_date)
            
            return {
                'success': True,
                'analytics': analytics,
                'date_range': {
                    'start_date': start_date.isoformat(),
                    'end_date': end_date.isoformat(),
                    'days': days
                },
                'message': f'Streak analytics for {days} days'
            }
            
        except Exception as e:
            logger.error(f"Error generating streak analytics: {str(e)}")
            return {'success': False, 'message': f'Internal error: {str(e)}'}
    
    def _calculate_streak_bonus(self, current_streak: int) -> int:
        """Calculate streak bonus XP"""
        if current_streak <= 0:
            return 0
        
        # Bonus increases every 7 days, max 50 XP
        bonus_periods = current_streak // 7
        bonus_xp = min(bonus_periods * self.STREAK_BONUS_MULTIPLIER, self.STREAK_BONUS_MAX)
        
        return bonus_xp
    
    def _check_milestone_reached(self, user_id: str, current_streak: int, best_streak: int) -> Optional[str]:
        """Check if a milestone was just reached"""
        if current_streak in self.STREAK_MILESTONES and current_streak > (best_streak - current_streak):
            return f"{current_streak}_day_streak"
        return None
    
    async def _update_user_streak(self, user_id: str, current_streak: int):
        """Update user's streak count in profile"""
        try:
            self.supabase.table('users').update({
                'streak_count': current_streak,
                'updated_at': datetime.now().isoformat()
            }).eq('id', user_id).execute()
        except Exception as e:
            logger.warning(f"Failed to update user streak: {str(e)}")
    
    async def _record_daily_streak(self, user_id: str, date: date, streak: int, broken: bool):
        """Record daily streak information"""
        try:
            self.supabase.table('daily_user_metrics').upsert({
                'user_id': user_id,
                'date': date.isoformat(),
                'streak_active': not broken,
                'current_streak': streak,
                'updated_at': datetime.now().isoformat()
            }, on_conflict='user_id,date').execute()
        except Exception as e:
            logger.warning(f"Failed to record daily streak: {str(e)}")
    
    def _analyze_streak_patterns(self, daily_records: List[Dict], start_date: date, end_date: date) -> Dict[str, Any]:
        """Analyze streak patterns from daily records"""
        if not daily_records:
            return {
                'active_days': 0,
                'streak_days': 0,
                'broken_days': 0,
                'longest_current_streak': 0,
                'average_streak_length': 0.0,
                'streak_consistency': 0.0
            }
        
        active_days = sum(1 for record in daily_records if record.get('streak_active', False))
        total_days = len(daily_records)
        
        # Calculate current streak
        current_streak = 0
        for record in reversed(daily_records):
            if record.get('streak_active', False):
                current_streak += 1
            else:
                break
        
        # Calculate average streak length and consistency
        streak_lengths = []
        current_length = 0
        
        for record in daily_records:
            if record.get('streak_active', False):
                current_length += 1
            else:
                if current_length > 0:
                    streak_lengths.append(current_length)
                    current_length = 0
        
        # Don't forget the last streak
        if current_length > 0:
            streak_lengths.append(current_length)
        
        average_streak = sum(streak_lengths) / len(streak_lengths) if streak_lengths else 0.0
        consistency = (active_days / total_days) * 100 if total_days > 0 else 0.0
        
        return {
            'active_days': active_days,
            'streak_days': active_days,
            'broken_days': total_days - active_days,
            'longest_current_streak': current_streak,
            'average_streak_length': round(average_streak, 2),
            'streak_consistency': round(consistency, 2),
            'total_days': total_days
        }