"""
XP Service - Core business logic for gamification system with streak integration (Module B2)
"""

import logging
from datetime import datetime, timedelta, date
from typing import Dict, Any, List, Optional, Tuple
from supabase import create_client, Client

from types.gamification import (
    XPSource, XPAwardRequest, XPAwardResponse, XPCalculationDetails,
    SessionCalculationRequest, SessionCalculationResponse, LeaderboardPeriod,
    LeaderboardEntry, LeaderboardResponse, SessionEventType, AuditValidationRequest,
    AuditValidationResponse, OfflineSyncRequest, OfflineSyncResponse
)

# Import StreakService for Module B2 integration
try:
    from .streak_service import StreakService
except ImportError:
    # Fallback if streak service not available
    StreakService = None

logger = logging.getLogger(__name__)


class XPService:
    """Service for handling XP-related operations"""
    
    def __init__(self, supabase_client: Client):
        self.supabase = supabase_client
        
        # XP calculation constants
        self.XP_PER_MINUTE = 1
        self.POMODORO_BONUS = 10  # 25-minute session bonus
        self.DAILY_GOAL_BONUS = 20  # 2-hour daily goal bonus
        self.MILESTONE_500 = 100  # Every 500 XP milestone
        self.MILESTONE_10000 = 1000  # Every 10,000 XP milestone
        self.DAILY_GOAL_MINUTES = 120  # 2 hours
        
    async def award_xp(self, request: XPAwardRequest) -> XPAwardResponse:
        """
        Award XP to a user and update all related records
        
        Args:
            request: XP award request with user_id, amount, source, and metadata
            
        Returns:
            XPAwardResponse with success status and updated user stats
        """
        try:
            # 1. Insert XP history record
            xp_history_result = self.supabase.table('xp_history').insert({
                'user_id': request.user_id,
                'amount': request.amount,
                'source': request.source.value,
                'meta': request.metadata or {}
            }).execute()
            
            if xp_history_result.error:
                logger.error(f"Failed to insert XP history: {xp_history_result.error}")
                return XPAwardResponse(
                    success=False,
                    total_xp=0,
                    level=0,
                    message=f"Failed to record XP history: {xp_history_result.error}"
                )
            
            xp_history_id = xp_history_result.data[0]['id']
            
            # 2. Update user's total XP and recalculate level
            user_update_result = await self._update_user_xp_and_level(request.user_id, request.amount)
            
            if not user_update_result['success']:
                return XPAwardResponse(
                    success=False,
                    total_xp=0,
                    level=0,
                    message=user_update_result.get('message', 'Failed to update user XP')
                )
            
            total_xp = user_update_result['total_xp']
            level = user_update_result['level']
            
            # 3. Update daily metrics
            await self._update_daily_metrics(request.user_id, request.amount, request.source)
            
            # 4. Check for milestone achievements
            await self._check_milestone_achievements(request.user_id, total_xp)
            
            # 5. Emit XP updated event (if backend supports it)
            # Note: Backend event emitting would require websocket or similar
            # This is primarily for frontend integration
            
            logger.info(f"Successfully awarded {request.amount} XP to user {request.user_id}")
            
            return XPAwardResponse(
                success=True,
                xp_history_id=xp_history_id,
                total_xp=total_xp,
                level=level,
                message=f"Successfully awarded {request.amount} XP"
            )
            
        except Exception as e:
            logger.error(f"Error in award_xp: {str(e)}")
            return XPAwardResponse(
                success=False,
                total_xp=0,
                level=0,
                message=f"Internal error: {str(e)}"
            )
    
    async def calculate_xp_for_session(self, request: SessionCalculationRequest) -> SessionCalculationResponse:
        """
        Calculate XP for a completed study session using A1 rules
        
        Args:
            request: Session calculation request with session_id
            
        Returns:
            SessionCalculationResponse with detailed XP breakdown
        """
        try:
            # 1. Get session details
            session_result = self.supabase.table('study_sessions').select('*').eq('id', request.session_id).execute()
            
            if session_result.error or not session_result.data:
                return SessionCalculationResponse(
                    success=False,
                    session_id=request.session_id,
                    user_id="",
                    duration_minutes=0,
                    calculation=XPCalculationDetails(
                        base_xp=0, bonus_pomodoro=0, bonus_daily_goal=0,
                        milestone_500=0, milestone_10000=0, total_xp=0,
                        calculation_metadata={}
                    ),
                    xp_awarded=XPAwardResponse(success=False, total_xp=0, level=0, message="Session not found"),
                    message="Session not found"
                )
            
            session = session_result.data[0]
            user_id = session['user_id']
            duration_minutes = session['duration_minutes']
            
            # 2. Calculate XP components
            calculation_details = await self._calculate_xp_components(user_id, duration_minutes)
            
            # 3. Award the calculated XP
            xp_award_request = XPAwardRequest(
                user_id=user_id,
                amount=calculation_details.total_xp,
                source=XPSource.SESSION,
                metadata={
                    'session_id': request.session_id,
                    'duration_minutes': duration_minutes,
                    'calculation_breakdown': calculation_details.dict()
                }
            )
            
            xp_award_result = await self.award_xp(xp_award_request)
            
            # 4. Log session events for audit trail
            await self._log_session_events(request.session_id, user_id, SessionEventType.END.value, {
                'duration_minutes': duration_minutes,
                'xp_awarded': calculation_details.total_xp,
                'calculation_details': calculation_details.dict()
            })
            
            logger.info(f"Calculated XP for session {request.session_id}: {calculation_details.total_xp} XP")
            
            return SessionCalculationResponse(
                success=True,
                session_id=request.session_id,
                user_id=user_id,
                duration_minutes=duration_minutes,
                calculation=calculation_details,
                xp_awarded=xp_award_result,
                message=f"Successfully calculated {calculation_details.total_xp} XP for session"
            )
            
        except Exception as e:
            logger.error(f"Error in calculate_xp_for_session: {str(e)}")
            return SessionCalculationResponse(
                success=False,
                session_id=request.session_id,
                user_id="",
                duration_minutes=0,
                calculation=XPCalculationDetails(
                    base_xp=0, bonus_pomodoro=0, bonus_daily_goal=0,
                    milestone_500=0, milestone_10000=0, total_xp=0,
                    calculation_metadata={'error': str(e)}
                ),
                xp_awarded=XPAwardResponse(success=False, total_xp=0, level=0, message=str(e)),
                message=f"Internal error: {str(e)}"
            )
    
    async def get_xp_leaderboard(self, period: LeaderboardPeriod) -> LeaderboardResponse:
        """
        Get XP leaderboard for specified period
        
        Args:
            period: Leaderboard period (weekly, monthly, all-time)
            
        Returns:
            LeaderboardResponse with ranked user entries
        """
        try:
            # Calculate date range based on period
            end_date = datetime.now()
            if period == LeaderboardPeriod.WEEKLY:
                start_date = end_date - timedelta(weeks=1)
            elif period == LeaderboardPeriod.MONTHLY:
                start_date = end_date - timedelta(days=30)
            else:  # ALL_TIME
                start_date = datetime(2020, 1, 1)  # Far past date
            
            # Get XP data for the period
            xp_query = self.supabase.table('xp_history').select('''
                user_id,
                amount,
                created_at,
                users!inner(username, xp, level)
            ''').gte('created_at', start_date.isoformat()).lte('created_at', end_date.isoformat())
            
            if period == LeaderboardPeriod.ALL_TIME:
                # Get all-time data without date filters
                xp_query = self.supabase.table('xp_history').select('''
                    user_id,
                    amount,
                    created_at,
                    users!inner(username, xp, level)
                ''')
            
            xp_result = xp_query.execute()
            
            if xp_result.error:
                return LeaderboardResponse(
                    success=False,
                    period=period,
                    entries=[],
                    total_users=0,
                    generated_at=datetime.now(),
                    message=f"Failed to fetch XP data: {xp_result.error}"
                )
            
            # Aggregate XP by user
            user_xp_totals = {}
            for record in xp_result.data:
                user_id = record['user_id']
                amount = record['amount']
                username = record['users']['username']
                total_user_xp = record['users']['xp']
                level = record['users']['level']
                
                if user_id not in user_xp_totals:
                    user_xp_totals[user_id] = {
                        'username': username,
                        'period_xp': 0,
                        'total_xp': total_user_xp,
                        'level': level,
                        'growth_percentage': 0.0
                    }
                
                user_xp_totals[user_id]['period_xp'] += amount
            
            # Calculate growth percentages (simplified - would need previous period data)
            for user_id in user_xp_totals:
                # This is a simplified calculation - in reality you'd fetch previous period data
                user_xp_totals[user_id]['growth_percentage'] = 0.0  # Placeholder
            
            # Sort by period XP and create leaderboard
            sorted_users = sorted(
                user_xp_totals.items(),
                key=lambda x: x[1]['period_xp'],
                reverse=True
            )
            
            leaderboard_entries = []
            for rank, (user_id, user_data) in enumerate(sorted_users[:100], 1):  # Top 100
                leaderboard_entries.append(LeaderboardEntry(
                    rank=rank,
                    user_id=user_id,
                    username=user_data['username'],
                    xp=user_data['period_xp'],
                    level=user_data['level'],
                    streak_multiplier=1.0,  # Simplified - would calculate based on streak
                    growth_percentage=user_data['growth_percentage']
                ))
            
            logger.info(f"Generated {period.value} leaderboard with {len(leaderboard_entries)} entries")
            
            return LeaderboardResponse(
                success=True,
                period=period,
                entries=leaderboard_entries,
                total_users=len(user_xp_totals),
                generated_at=datetime.now(),
                message=f"Successfully generated {period.value} leaderboard"
            )
            
        except Exception as e:
            logger.error(f"Error in get_xp_leaderboard: {str(e)}")
            return LeaderboardResponse(
                success=False,
                period=period,
                entries=[],
                total_users=0,
                generated_at=datetime.now(),
                message=f"Internal error: {str(e)}"
            )
    
    async def validate_session_audit(self, request: AuditValidationRequest) -> AuditValidationResponse:
        """
        Validate session for audit purposes using session_events
        
        Args:
            request: Audit validation request
            
        Returns:
            AuditValidationResponse with validation results
        """
        try:
            # Get session events
            events_result = self.supabase.table('session_events').select('*').eq('session_id', request.session_id).order('created_at').execute()
            
            if events_result.error:
                return AuditValidationResponse(
                    session_id=request.session_id,
                    user_id=request.user_id,
                    is_valid=False,
                    suspicion_score=100,
                    validation_details={'error': events_result.error},
                    message="Failed to fetch session events"
                )
            
            events = events_result.data
            suspicion_score = 0
            validation_details = {
                'total_events': len(events),
                'time_gaps': [],
                'event_sequence': [],
                'red_flags': []
            }
            
            if not events:
                suspicion_score += 50
                validation_details['red_flags'].append('No session events recorded')
            
            # Analyze event patterns
            prev_event_time = None
            for event in events:
                event_time = datetime.fromisoformat(event['created_at'].replace('Z', '+00:00'))
                event_type = event['event_type']
                
                validation_details['event_sequence'].append({
                    'type': event_type,
                    'timestamp': event_time.isoformat(),
                    'payload': event['event_payload']
                })
                
                # Check for suspicious time gaps
                if prev_event_time:
                    time_gap = (event_time - prev_event_time).total_seconds()
                    validation_details['time_gaps'].append({
                        'from': prev_event_time.isoformat(),
                        'to': event_time.isoformat(),
                        'gap_seconds': time_gap
                    })
                    
                    # Flag unusually large gaps (more than 10 minutes without heartbeat)
                    if time_gap > 600 and event_type != SessionEventType.END.value:
                        suspicion_score += 10
                        validation_details['red_flags'].append(f'Large gap: {time_gap} seconds')
                
                prev_event_time = event_time
            
            # Check for essential events
            event_types = [event['event_type'] for event in events]
            if SessionEventType.START.value not in event_types:
                suspicion_score += 20
                validation_details['red_flags'].append('No start event recorded')
            
            if SessionEventType.END.value not in event_types:
                suspicion_score += 30
                validation_details['red_flags'].append('No end event recorded')
            
            # Cap suspicion score at 100
            suspicion_score = min(suspicion_score, 100)
            
            # Determine if session is valid based on suspicion score
            is_valid = suspicion_score < 50 if request.validation_mode == "soft" else suspicion_score == 0
            
            # Insert audit record
            audit_result = self.supabase.table('session_audit').insert({
                'session_id': request.session_id,
                'user_id': request.user_id,
                'suspicion_score': suspicion_score,
                'reasons': validation_details['red_flags'],
                'events': validation_details,
                'is_flagged': suspicion_score >= 50
            }).execute()
            
            if audit_result.error:
                logger.warning(f"Failed to insert audit record: {audit_result.error}")
            
            return AuditValidationResponse(
                session_id=request.session_id,
                user_id=request.user_id,
                is_valid=is_valid,
                suspicion_score=suspicion_score,
                validation_details=validation_details,
                message=f"Session validation {'passed' if is_valid else 'failed'} (score: {suspicion_score})"
            )
            
        except Exception as e:
            logger.error(f"Error in validate_session_audit: {str(e)}")
            return AuditValidationResponse(
                session_id=request.session_id,
                user_id=request.user_id,
                is_valid=False,
                suspicion_score=100,
                validation_details={'error': str(e)},
                message=f"Internal error: {str(e)}"
            )
    
    async def sync_offline_events(self, request: OfflineSyncRequest) -> OfflineSyncResponse:
        """
        Synchronize offline session events when user comes back online
        
        Args:
            request: Offline sync request with user_id and events list
            
        Returns:
            OfflineSyncResponse with sync results
        """
        try:
            synced_events = 0
            conflicts_resolved = 0
            
            for event_data in request.events:
                # Check if event already exists
                existing_result = self.supabase.table('session_events').select('id').eq(
                    'session_id', event_data['session_id']
                ).eq('event_type', event_data['event_type']).eq(
                    'created_at', event_data['created_at']
                ).execute()
                
                if existing_result.data:
                    conflicts_resolved += 1
                    continue  # Skip duplicate
                
                # Insert new event
                insert_result = self.supabase.table('session_events').insert({
                    'session_id': event_data['session_id'],
                    'user_id': request.user_id,
                    'event_type': event_data['event_type'],
                    'event_payload': event_data.get('event_payload', {}),
                    'created_at': event_data['created_at']
                }).execute()
                
                if insert_result.error:
                    logger.warning(f"Failed to sync event: {insert_result.error}")
                    continue
                
                synced_events += 1
            
            return OfflineSyncResponse(
                success=True,
                synced_events=synced_events,
                pending_events=len(request.events) - synced_events,
                conflicts_resolved=conflicts_resolved,
                message=f"Successfully synced {synced_events} events"
            )
            
        except Exception as e:
            logger.error(f"Error in sync_offline_events: {str(e)}")
            return OfflineSyncResponse(
                success=False,
                synced_events=0,
                pending_events=len(request.events),
                conflicts_resolved=0,
                message=f"Internal error: {str(e)}"
            )
    
    # Private helper methods
    
    async def _update_user_xp_and_level(self, user_id: str, xp_to_add: int) -> Dict[str, Any]:
        """Update user's total XP and recalculate level"""
        try:
            # Get current user data
            user_result = self.supabase.table('users').select('xp, level').eq('id', user_id).execute()
            
            if user_result.error or not user_result.data:
                return {'success': False, 'message': 'User not found'}
            
            user = user_result.data[0]
            current_xp = user.get('xp', 0)
            current_level = user.get('level', 1)
            
            new_xp = current_xp + xp_to_add
            new_level = new_xp // 100 + 1  # Level up every 100 XP
            
            # Update user
            update_result = self.supabase.table('users').update({
                'xp': new_xp,
                'level': new_level
            }).eq('id', user_id).execute()
            
            if update_result.error:
                return {'success': False, 'message': f'Failed to update user: {update_result.error}'}
            
            return {
                'success': True,
                'total_xp': new_xp,
                'level': new_level,
                'level_up': new_level > current_level
            }
            
        except Exception as e:
            return {'success': False, 'message': str(e)}
    
    async def _update_daily_metrics(self, user_id: str, xp_earned: int, source: XPSource):
        """Update daily user metrics"""
        try:
            today = date.today()
            
            # Upsert daily metrics
            result = self.supabase.table('daily_user_metrics').upsert({
                'user_id': user_id,
                'date': today.isoformat(),
                'xp_earned': xp_earned,
                'updated_at': datetime.now().isoformat()
            }, on_conflict='user_id,date').execute()
            
            if result.error:
                logger.warning(f"Failed to update daily metrics: {result.error}")
            
        except Exception as e:
            logger.warning(f"Error updating daily metrics: {str(e)}")
    
    async def _check_milestone_achievements(self, user_id: str, total_xp: int):
        """Check and award milestone achievements"""
        try:
            # Check 500 XP milestone
            if total_xp >= 500 and total_xp - 500 < 100:  # Just crossed 500 threshold
                await self.award_xp(XPAwardRequest(
                    user_id=user_id,
                    amount=self.MILESTONE_500,
                    source=XPSource.MILESTONE,
                    metadata={'milestone_type': '500_xp', 'total_xp': total_xp}
                ))
            
            # Check 10,000 XP milestone
            if total_xp >= 10000 and total_xp - 10000 < 1000:  # Just crossed 10,000 threshold
                await self.award_xp(XPAwardRequest(
                    user_id=user_id,
                    amount=self.MILESTONE_10000,
                    source=XPSource.MILESTONE,
                    metadata={'milestone_type': '10000_xp', 'total_xp': total_xp}
                ))
                
        except Exception as e:
            logger.warning(f"Error checking milestone achievements: {str(e)}")
    
    async def _calculate_xp_components(self, user_id: str, duration_minutes: int) -> XPCalculationDetails:
        """Calculate detailed XP components for a session with streak integration (Module B2)"""
        
        # Base XP: 1 XP per minute
        base_xp = duration_minutes * self.XP_PER_MINUTE
        
        # Pomodoro bonus: 10 XP for completing 25-minute session
        bonus_pomodoro = self.POMODORO_BONUS if duration_minutes >= 25 else 0
        
        # Daily goal bonus: 20 XP for reaching 2-hour daily goal
        bonus_daily_goal = 0
        try:
            today = date.today()
            daily_result = self.supabase.table('daily_user_metrics').select('total_minutes').eq(
                'user_id', user_id
            ).eq('date', today.isoformat()).execute()
            
            current_daily_minutes = 0
            if daily_result.data:
                current_daily_minutes = daily_result.data[0]['total_minutes']
            
            if (current_daily_minutes + duration_minutes) >= self.DAILY_GOAL_MINUTES:
                bonus_daily_goal = self.DAILY_GOAL_BONUS
                
        except Exception as e:
            logger.warning(f"Error checking daily goal: {str(e)}")
        
        # Module B2: Apply streak multiplier if streak service is available
        streak_multiplier = 1.0
        streak_bonus_xp = 0
        
        if self.streak_service:
            try:
                # Get streak multiplier from streak service
                streak_result = await self.streak_service.apply_streak_multiplier_to_xp(user_id, base_xp)
                if streak_result['success']:
                    streak_multiplier = streak_result['multiplier']
                    streak_bonus_xp = streak_result['bonus_xp']
                    base_xp = streak_result['final_xp']  # Update base with multiplier
            except Exception as e:
                logger.warning(f"Error applying streak multiplier: {str(e)}")
        
        # Milestone bonuses
        milestone_500 = 0
        milestone_10000 = 0
        
        # Get current XP to check milestones
        try:
            user_result = self.supabase.table('users').select('xp').eq('id', user_id).execute()
            if user_result.data:
                current_xp = user_result.data[0]['xp']
                new_total_xp = current_xp + base_xp + bonus_pomodoro + bonus_daily_goal
                
                # Check if crossing milestones
                if current_xp < 500 <= new_total_xp:
                    milestone_500 = self.MILESTONE_500
                if current_xp < 10000 <= new_total_xp:
                    milestone_10000 = self.MILESTONE_10000
                    
        except Exception as e:
            logger.warning(f"Error checking XP milestones: {str(e)}")
        
        total_xp = base_xp + bonus_pomodoro + bonus_daily_goal + milestone_500 + milestone_10000
        
        calculation_metadata = {
            'duration_minutes': duration_minutes,
            'xp_per_minute': self.XP_PER_MINUTE,
            'pomodoro_threshold': 25,
            'daily_goal_minutes': self.DAILY_GOAL_MINUTES,
            'streak_multiplier': streak_multiplier,
            'streak_bonus_xp': streak_bonus_xp,
            'calculated_at': datetime.now().isoformat()
        }
        
        return XPCalculationDetails(
            base_xp=base_xp,
            bonus_pomodoro=bonus_pomodoro,
            bonus_daily_goal=bonus_daily_goal,
            milestone_500=milestone_500,
            milestone_10000=milestone_10000,
            total_xp=total_xp,
            calculation_metadata=calculation_metadata
        )
    
    async def update_daily_streak(self, user_id: str) -> Dict[str, Any]:
        """Update user's daily streak (Module B2 integration)"""
        if not self.streak_service:
            return {'success': False, 'message': 'Streak service not available'}
        
        try:
            return await self.streak_service.update_daily_login_streak(user_id)
        except Exception as e:
            logger.error(f"Error updating daily streak: {str(e)}")
            return {'success': False, 'message': f'Internal error: {str(e)}'}
    
    async def check_streak_continuity(self, user_id: str) -> Dict[str, Any]:
        """Check user's streak continuity (Module B2 integration)"""
        if not self.streak_service:
            return {'success': False, 'message': 'Streak service not available'}
        
        try:
            return await self.streak_service.check_streak_continuity(user_id)
        except Exception as e:
            logger.error(f"Error checking streak continuity: {str(e)}")
            return {'success': False, 'message': f'Internal error: {str(e)}'}
    
    async def _log_session_events(self, session_id: str, user_id: str, event_type: str, payload: Dict[str, Any]):
        """Log session events for audit trail"""
        try:
            result = self.supabase.table('session_events').insert({
                'session_id': session_id,
                'user_id': user_id,
                'event_type': event_type,
                'event_payload': payload
            }).execute()
            
            if result.error:
                logger.warning(f"Failed to log session event: {result.error}")
                
        except Exception as e:
            logger.warning(f"Error logging session event: {str(e)}")