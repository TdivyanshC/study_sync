"""
Gamification Helper Utilities
"""

import logging
import pytz
from datetime import datetime, timedelta, date
from typing import Dict, Any, List, Optional, Tuple
from supabase import create_client, Client

logger = logging.getLogger(__name__)


class XPConstants:
    """XP calculation constants"""
    
    # Base XP rates - Updated: 10 XP per 60 min = 1/6 XP per minute
    XP_PER_MINUTE = 1/6  # 10 XP per 60 minutes
    
    # Bonus XP amounts
    POMODORO_BONUS = 10  # 25-minute session bonus
    DAILY_GOAL_BONUS = 20  # 2-hour daily goal bonus
    MILESTONE_500 = 100  # Every 500 XP
    MILESTONE_10000 = 1000  # Every 10,000 XP
    
    # Thresholds
    POMODORO_THRESHOLD = 25  # minutes
    DAILY_GOAL_MINUTES = 120  # 2 hours
    XP_PER_LEVEL = 100  # XP needed per level
    
    # Streak multipliers - Updated based on user's request
    STREAK_MULTIPLIER_BASE = 1.0
    STREAK_MULTIPLIER_INCREMENT = 0.1  # 10% per day of streak
    STREAK_MULTIPLIER_MAX = 2.0  # Max 2x multiplier
    
    # Timezone settings for streak calculations
    IST_TIMEZONE = pytz.timezone("Asia/Kolkata")
    
    # 36-hour rule for streak break
    STREAK_BREAK_HOURS = 36


class StreakCalculator:
    """Utility class for calculating study streaks with IST timezone and 36-hour rule"""
    
    @staticmethod
    def calculate_streak(sessions: List[Dict[str, Any]]) -> Tuple[int, int, float]:
        """
        Calculate current and best streaks from session data using IST timezone
        
        Args:
            sessions: List of session dictionaries with 'created_at' field
            
        Returns:
            Tuple of (current_streak, best_streak, multiplier)
        """
        if not sessions:
            return 0, 0, 1.0
        
        # Convert to IST timezone for calculations
        ist_tz = XPConstants.IST_TIMEZONE
        today_ist = datetime.now(ist_tz).date()
        
        # Extract and sort dates in IST
        dates = set()
        for session in sessions:
            # Convert to IST timezone first
            session_dt = datetime.fromisoformat(session['created_at'].replace('Z', '+00:00'))
            session_dt_ist = session_dt.astimezone(ist_tz)
            session_date = session_dt_ist.date()
            dates.add(session_date)
        
        sorted_dates = sorted(dates)
        
        # Calculate best streak
        best_streak = StreakCalculator._find_best_streak(sorted_dates)
        
        # Calculate current streak using 36-hour rule
        current_streak = StreakCalculator._calculate_current_streak_36h(sessions, today_ist, ist_tz)
        
        # Calculate streak multiplier
        multiplier = min(
            1.0 + (current_streak * 0.1),
            2.0
        )
        
        return current_streak, best_streak, multiplier
    
    @staticmethod
    def _find_best_streak(dates: List[date]) -> int:
        """Find the best consecutive day streak"""
        if not dates:
            return 0
        
        best_streak = 1
        current_streak = 1
        
        for i in range(1, len(dates)):
            if (dates[i] - dates[i-1]).days == 1:
                current_streak += 1
                best_streak = max(best_streak, current_streak)
            else:
                current_streak = 1
        
        return best_streak
    
    @staticmethod
    def _calculate_current_streak_36h(sessions: List[Dict[str, Any]], today_ist: date, ist_tz) -> int:
        """Calculate current active streak using 36-hour rule"""
        if not sessions:
            return 0
        
        # Convert sessions to IST and sort by datetime
        ist_sessions = []
        for session in sessions:
            session_dt = datetime.fromisoformat(session['created_at'].replace('Z', '+00:00'))
            session_dt_ist = session_dt.astimezone(ist_tz)
            ist_sessions.append((session_dt_ist, session))
        
        # Sort by datetime (most recent first)
        ist_sessions.sort(key=lambda x: x[0], reverse=True)
        
        now_ist = datetime.now(ist_tz)
        
        # Check if last session was within 36 hours
        last_session_dt = ist_sessions[0][0]
        hours_since_last = (now_ist - last_session_dt).total_seconds() / 3600
        
        if hours_since_last > XPConstants.STREAK_BREAK_HOURS:
            return 0  # Streak broken due to 36-hour rule
        
        # Count consecutive days including today if within 36 hours
        streak = 1
        current_date = last_session_dt.date()
        
        # Check if we have a session today (within 36 hours)
        if (now_ist.date() - current_date).days == 0 and hours_since_last <= 36:
            streak = 1
        else:
            streak = 0
        
        # Count backwards from the previous day
        check_date = current_date - timedelta(days=1)
        for session_dt, _ in ist_sessions[1:]:
            session_date = session_dt.date()
            if session_date == check_date:
                streak += 1
                check_date -= timedelta(days=1)
            elif session_date < check_date:
                break  # Gap found, streak ends
        
        return streak
    
    @staticmethod
    def _calculate_current_streak(dates: List[date], today: date) -> int:
        """Calculate current active streak (legacy method)"""
        if not dates:
            return 0
        
        # Check if user studied today or yesterday
        last_date = dates[-1]
        days_since_last = (today - last_date).days
        
        if days_since_last > 1:
            return 0  # Streak broken
        
        # Count backwards from the most recent date
        streak = 1
        for i in range(len(dates) - 2, -1, -1):
            if (dates[i+1] - dates[i]).days == 1:
                streak += 1
            else:
                break
        
        return streak


class XPValidator:
    """Utility class for validating XP operations"""
    
    @staticmethod
    def validate_xp_amount(amount: int) -> Tuple[bool, str]:
        """
        Validate XP amount
        
        Args:
            amount: XP amount to validate
            
        Returns:
            Tuple of (is_valid, error_message)
        """
        if amount <= 0:
            return False, "XP amount must be positive"
        
        if amount > 10000:  # Arbitrary large limit
            return False, "XP amount too large"
        
        return True, ""
    
    @staticmethod
    def validate_xp_source(source: str) -> Tuple[bool, str]:
        """
        Validate XP source
        
        Args:
            source: XP source string
            
        Returns:
            Tuple of (is_valid, error_message)
        """
        valid_sources = [
            'session', 'streak', 'daily_bonus', 'milestone', 
            'achievement', 'admin', 'correction'
        ]
        
        if source not in valid_sources:
            return False, f"Invalid XP source. Must be one of: {', '.join(valid_sources)}"
        
        return True, ""
    
    @staticmethod
    def validate_session_duration(duration_minutes: int) -> Tuple[bool, str]:
        """
        Validate session duration
        
        Args:
            duration_minutes: Session duration in minutes
            
        Returns:
            Tuple of (is_valid, error_message)
        """
        if duration_minutes <= 0:
            return False, "Session duration must be positive"
        
        if duration_minutes > 1440:  # 24 hours
            return False, "Session duration cannot exceed 24 hours"
        
        return True, ""


class AuditAnalyzer:
    """Utility class for analyzing session audits"""
    
    @staticmethod
    def analyze_session_patterns(events: List[Dict[str, Any]]) -> Dict[str, Any]:
        """
        Analyze session events for patterns and anomalies
        
        Args:
            events: List of session events
            
        Returns:
            Analysis results dictionary
        """
        if not events:
            return {
                'total_events': 0,
                'anomalies': ['No events recorded'],
                'pattern_score': 0
            }
        
        analysis = {
            'total_events': len(events),
            'event_types': {},
            'time_gaps': [],
            'anomalies': [],
            'pattern_score': 100  # Start with perfect score
        }
        
        # Analyze event types
        for event in events:
            event_type = event['event_type']
            analysis['event_types'][event_type] = analysis['event_types'].get(event_type, 0) + 1
        
        # Analyze time gaps
        prev_time = None
        for event in events:
            current_time = datetime.fromisoformat(event['created_at'].replace('Z', '+00:00'))
            
            if prev_time:
                gap = (current_time - prev_time).total_seconds()
                analysis['time_gaps'].append(gap)
                
                # Check for suspicious gaps
                if gap > 600 and event['event_type'] != 'end':  # 10 minutes
                    analysis['anomalies'].append(f'Large gap: {gap:.0f} seconds without activity')
                    analysis['pattern_score'] -= 10
            
            prev_time = current_time
        
        # Check for missing essential events
        event_types = set(event['event_type'] for event in events)
        
        if 'start' not in event_types:
            analysis['anomalies'].append('Missing start event')
            analysis['pattern_score'] -= 20
        
        if 'end' not in event_types:
            analysis['anomalies'].append('Missing end event')
            analysis['pattern_score'] -= 30
        
        # Check for reasonable heartbeat intervals
        heartbeat_gaps = [gap for gap in analysis['time_gaps'] if 60 <= gap <= 300]  # 1-5 minutes
        if len(heartbeat_gaps) < len(events) * 0.5:  # Less than 50% reasonable gaps
            analysis['anomalies'].append('Irregular heartbeat intervals')
            analysis['pattern_score'] -= 15
        
        # Ensure score doesn't go below 0
        analysis['pattern_score'] = max(analysis['pattern_score'], 0)
        
        return analysis
    
    @staticmethod
    def calculate_suspicion_score(analysis: Dict[str, Any]) -> int:
        """
        Calculate suspicion score based on analysis
        
        Args:
            analysis: Session analysis results
            
        Returns:
            Suspicion score (0-100)
        """
        score = 100 - analysis['pattern_score']
        
        # Additional scoring based on anomalies
        anomaly_count = len(analysis['anomalies'])
        score += anomaly_count * 5
        
        # Cap at 100
        return min(score, 100)


class OfflineSyncManager:
    """Utility class for managing offline synchronization"""
    
    @staticmethod
    def prepare_offline_events(events: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
        """
        Prepare events for offline storage
        
        Args:
            events: List of session events
            
        Returns:
            Prepared events for offline storage
        """
        prepared_events = []
        
        for event in events:
            prepared_event = {
                'session_id': event.get('session_id'),
                'event_type': event.get('event_type'),
                'event_payload': event.get('event_payload', {}),
                'created_at': event.get('created_at'),
                'offline_id': f"{event.get('session_id')}_{event.get('created_at')}"  # Unique offline ID
            }
            prepared_events.append(prepared_event)
        
        return prepared_events
    
    @staticmethod
    def resolve_sync_conflicts(
        local_events: List[Dict[str, Any]], 
        server_events: List[Dict[str, Any]]
    ) -> Tuple[List[Dict[str, Any]], List[Dict[str, Any]]]:
        """
        Resolve conflicts between local and server events
        
        Args:
            local_events: Events from offline storage
            server_events: Events from server
            
        Returns:
            Tuple of (events_to_sync, conflicts_resolved)
        """
        # Create lookup for server events
        server_lookup = {
            f"{event['session_id']}_{event['created_at']}": event 
            for event in server_events
        }
        
        events_to_sync = []
        conflicts_resolved = 0
        
        for local_event in local_events:
            event_key = f"{local_event['session_id']}_{local_event['created_at']}"
            
            if event_key in server_lookup:
                # Conflict detected - server has this event
                conflicts_resolved += 1
                # Skip this event as it already exists on server
                continue
            
            # No conflict, safe to sync
            events_to_sync.append(local_event)
        
        return events_to_sync, conflicts_resolved


class MilestoneChecker:
    """Utility class for checking XP milestones"""
    
    @staticmethod
    def check_milestones(current_xp: int, previous_xp: int) -> List[Dict[str, Any]]:
        """
        Check if user has crossed any XP milestones
        
        Args:
            current_xp: Current total XP
            previous_xp: Previous total XP
            
        Returns:
            List of milestone achievements
        """
        milestones = []
        
        # Check 500 XP milestone
        if previous_xp < 500 <= current_xp:
            milestones.append({
                'type': 'milestone_500',
                'xp_reward': XPConstants.MILESTONE_500,
                'description': 'Reached 500 XP!',
                'threshold': 500
            })
        
        # Check 1000 XP milestone
        if previous_xp < 1000 <= current_xp:
            milestones.append({
                'type': 'milestone_1000',
                'xp_reward': XPConstants.MILESTONE_500,  # Same reward as 500
                'description': 'Reached 1000 XP!',
                'threshold': 1000
            })
        
        # Check 5000 XP milestone
        if previous_xp < 5000 <= current_xp:
            milestones.append({
                'type': 'milestone_5000',
                'xp_reward': XPConstants.MILESTONE_500,
                'description': 'Reached 5000 XP!',
                'threshold': 5000
            })
        
        # Check 10000 XP milestone
        if previous_xp < 10000 <= current_xp:
            milestones.append({
                'type': 'milestone_10000',
                'xp_reward': XPConstants.MILESTONE_10000,
                'description': 'Reached 10000 XP!',
                'threshold': 10000
            })
        
        return milestones
    
    @staticmethod
    def get_next_milestone(current_xp: int) -> Dict[str, Any]:
        """
        Get the next milestone for a user
        
        Args:
            current_xp: Current total XP
            
        Returns:
            Next milestone information
        """
        milestones = [500, 1000, 5000, 10000, 25000, 50000, 100000]
        
        for milestone in milestones:
            if current_xp < milestone:
                xp_needed = milestone - current_xp
                return {
                    'threshold': milestone,
                    'xp_needed': xp_needed,
                    'progress': (current_xp / milestone) * 100,
                    'reward': XPConstants.MILESTONE_500 if milestone <= 5000 else XPConstants.MILESTONE_10000
                }
        
        # User has passed all milestones
        return {
            'threshold': None,
            'xp_needed': 0,
            'progress': 100,
            'reward': 0,
            'message': 'Congratulations! You\'ve reached the highest milestone!'
        }


class LevelCalculator:
    """Utility class for level calculations"""
    
    @staticmethod
    def calculate_level(total_xp: int) -> int:
        """
        Calculate user level based on total XP
        
        Args:
            total_xp: Total XP
            
        Returns:
            User level
        """
        return (total_xp // XPConstants.XP_PER_LEVEL) + 1
    
    @staticmethod
    def get_level_progress(total_xp: int) -> Dict[str, Any]:
        """
        Get detailed level progress information
        
        Args:
            total_xp: Total XP
            
        Returns:
            Level progress information
        """
        level = LevelCalculator.calculate_level(total_xp)
        xp_for_current_level = (level - 1) * XPConstants.XP_PER_LEVEL
        xp_for_next_level = level * XPConstants.XP_PER_LEVEL
        
        current_level_xp = total_xp - xp_for_current_level
        xp_needed_for_next = xp_for_next_level - total_xp
        
        progress_percentage = (current_level_xp / XPConstants.XP_PER_LEVEL) * 100
        
        return {
            'current_level': level,
            'current_level_xp': current_level_xp,
            'xp_for_current_level': xp_for_current_level,
            'xp_for_next_level': xp_for_next_level,
            'xp_needed_for_next': xp_needed_for_next,
            'progress_percentage': round(progress_percentage, 2),
            'xp_per_level': XPConstants.XP_PER_LEVEL
        }