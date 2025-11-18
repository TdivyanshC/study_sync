"""
Soft Audit Service - Enhanced session audit with streak/XP integration (Module Soft)
"""

import logging
from datetime import datetime, timedelta, date
from typing import Dict, Any, List, Optional, Tuple
from supabase import create_client, Client

from utils.gamification_helpers import AuditAnalyzer, StreakCalculator
from .streak_service import StreakService

logger = logging.getLogger(__name__)


class SoftAuditService:
    """Enhanced service for soft session auditing with streak/XP forgiveness"""
    
    def __init__(self, supabase_client: Client):
        self.supabase = supabase_client
        
        # Initialize streak service if available
        try:
            self.streak_service = StreakService(supabase_client)
        except:
            self.streak_service = None
        
        # Soft audit thresholds
        self.SUSPICION_THRESHOLD_SOFT = 70  # Higher threshold for soft mode
        self.SUSPICION_THRESHOLD_STRICT = 30  # Lower threshold for strict mode
        
        # Forgiveness multipliers based on user history
        self.STREAK_FORGIVENESS_MULTIPLIER = 0.1  # 10% forgiveness per streak day
        self.XP_FORGIVENESS_MULTIPLIER = 0.05  # 5% forgiveness per 1000 XP
        self.HISTORY_FORGIVENESS_MAX = 0.5  # Maximum 50% forgiveness
        
        # Pattern weights for suspicious behavior
        self.PATTERN_WEIGHTS = {
            'missing_start_event': 25,
            'missing_end_event': 30,
            'large_time_gap': 15,
            'irregular_heartbeat': 10,
            'no_events': 50,
            'suspicious_duration': 20
        }
    
    async def validate_session_soft_audit(
        self, 
        session_id: str, 
        user_id: str, 
        validation_mode: str = "soft"
    ) -> Dict[str, Any]:
        """
        Enhanced session validation with soft audit logic and streak/XP forgiveness
        
        Args:
            session_id: Session UUID
            user_id: User UUID
            validation_mode: "soft" or "strict"
            
        Returns:
            Enhanced validation results with forgiveness applied
        """
        try:
            # 1. Get session events
            events_result = self.supabase.table('session_events').select('*').eq(
                'session_id', session_id
            ).order('created_at').execute()
            
            if events_result.error:
                return self._create_error_response(session_id, user_id, events_result.error)
            
            events = events_result.data
            
            # 2. Analyze session patterns
            analysis = AuditAnalyzer.analyze_session_patterns(events)
            base_suspicion_score = AuditAnalyzer.calculate_suspicion_score(analysis)
            
            # 3. Apply soft audit forgiveness based on user history
            forgiveness_result = await self._calculate_audit_forgiveness(user_id)
            
            # 4. Apply forgiveness to suspicion score
            adjusted_suspicion_score = self._apply_forgiveness(
                base_suspicion_score, 
                forgiveness_result
            )
            
            # 5. Determine validation outcome
            threshold = (self.SUSPICION_THRESHOLD_SOFT if validation_mode == "soft" 
                        else self.SUSPICION_THRESHOLD_STRICT)
            
            is_valid = adjusted_suspicion_score < threshold
            
            # 6. Generate enhanced validation details
            validation_details = self._generate_enhanced_validation_details(
                analysis, 
                adjusted_suspicion_score, 
                forgiveness_result,
                validation_mode
            )
            
            # 7. Insert audit record with enhanced data
            await self._insert_enhanced_audit_record(
                session_id, 
                user_id, 
                adjusted_suspicion_score, 
                validation_details, 
                is_valid,
                forgiveness_result
            )
            
            # 8. Return enhanced response
            return {
                'success': True,
                'session_id': session_id,
                'user_id': user_id,
                'is_valid': is_valid,
                'validation_mode': validation_mode,
                'base_suspicion_score': base_suspicion_score,
                'adjusted_suspicion_score': adjusted_suspicion_score,
                'forgiveness_applied': forgiveness_result,
                'suspicion_threshold': threshold,
                'validation_details': validation_details,
                'message': self._generate_validation_message(is_valid, adjusted_suspicion_score, threshold)
            }
            
        except Exception as e:
            logger.error(f"Error in soft audit validation: {str(e)}")
            return self._create_error_response(session_id, user_id, str(e))
    
    async def get_user_audit_forgiveness_history(self, user_id: str, days: int = 30) -> Dict[str, Any]:
        """
        Get user's audit forgiveness eligibility based on history
        
        Args:
            user_id: User UUID
            days: Number of days to look back
            
        Returns:
            User's audit forgiveness profile
        """
        try:
            end_date = datetime.now()
            start_date = end_date - timedelta(days=days)
            
            # Get user's streak history
            streak_result = await self._get_user_streak_history(user_id)
            
            # Get user's XP history
            xp_result = await self._get_user_xp_history(user_id)
            
            # Get user's audit history
            audit_result = await self._get_user_audit_history(user_id, start_date, end_date)
            
            # Calculate forgiveness factors
            streak_forgiveness = min(
                streak_result['current_streak'] * self.STREAK_FORGIVENESS_MULTIPLIER,
                self.HISTORY_FORGIVENESS_MAX
            )
            
            xp_forgiveness = min(
                (xp_result['total_xp'] / 1000) * self.XP_FORGIVENESS_MULTIPLIER,
                self.HISTORY_FORGIVENESS_MAX
            )
            
            # Historical good behavior bonus
            clean_sessions = sum(1 for audit in audit_result['recent_audits'] 
                               if audit['suspicion_score'] < 30)
            total_sessions = len(audit_result['recent_audits'])
            good_behavior_bonus = (clean_sessions / max(total_sessions, 1)) * 0.2  # Max 20% bonus
            
            total_forgiveness = min(
                streak_forgiveness + xp_forgiveness + good_behavior_bonus,
                self.HISTORY_FORGIVENESS_MAX
            )
            
            return {
                'success': True,
                'user_id': user_id,
                'forgiveness_profile': {
                    'streak_forgiveness': round(streak_forgiveness, 3),
                    'xp_forgiveness': round(xp_forgiveness, 3),
                    'good_behavior_bonus': round(good_behavior_bonus, 3),
                    'total_forgiveness': round(total_forgiveness, 3),
                    'max_forgiveness': self.HISTORY_FORGIVENESS_MAX
                },
                'user_history': {
                    'current_streak': streak_result['current_streak'],
                    'best_streak': streak_result['best_streak'],
                    'total_xp': xp_result['total_xp'],
                    'clean_sessions_rate': round((clean_sessions / max(total_sessions, 1)) * 100, 2)
                },
                'audit_history': audit_result,
                'message': f'User eligible for {round(total_forgiveness * 100, 1)}% audit forgiveness'
            }
            
        except Exception as e:
            logger.error(f"Error calculating audit forgiveness: {str(e)}")
            return {'success': False, 'message': f'Internal error: {str(e)}'}
    
    async def _calculate_audit_forgiveness(self, user_id: str) -> Dict[str, Any]:
        """Calculate audit forgiveness based on user history"""
        try:
            # Get streak information
            streak_data = {'current_streak': 0, 'best_streak': 0}
            if self.streak_service:
                streak_result = await self.streak_service.check_streak_continuity(user_id)
                if streak_result['success']:
                    streak_data = {
                        'current_streak': streak_result.get('current_streak', 0),
                        'best_streak': streak_result.get('current_streak', 0)
                    }
            
            # Get XP information
            user_result = self.supabase.table('users').select('xp, level').eq('id', user_id).execute()
            xp_data = {'total_xp': 0, 'level': 1}
            if not user_result.error and user_result.data:
                xp_data = {
                    'total_xp': user_result.data[0]['xp'],
                    'level': user_result.data[0]['level']
                }
            
            # Get recent audit history
            thirty_days_ago = datetime.now() - timedelta(days=30)
            audit_result = self.supabase.table('session_audit').select('suspicion_score').eq(
                'user_id', user_id
            ).gte('created_at', thirty_days_ago.isoformat()).execute()
            
            # Calculate forgiveness factors
            streak_forgiveness = min(
                streak_data['current_streak'] * self.STREAK_FORGIVENESS_MULTIPLIER,
                self.HISTORY_FORGIVENESS_MAX
            )
            
            xp_forgiveness = min(
                xp_data['total_xp'] / 1000 * self.XP_FORGIVENESS_MULTIPLIER,
                self.HISTORY_FORGIVENESS_MAX
            )
            
            # Good behavior bonus based on recent clean sessions
            clean_sessions = 0
            total_sessions = 0
            if not audit_result.error:
                for record in audit_result.data:
                    total_sessions += 1
                    if record['suspicion_score'] < 30:  # Clean session
                        clean_sessions += 1
            
            good_behavior_bonus = (clean_sessions / max(total_sessions, 1)) * 0.2
            
            total_forgiveness = min(
                streak_forgiveness + xp_forgiveness + good_behavior_bonus,
                self.HISTORY_FORGIVENESS_MAX
            )
            
            return {
                'streak_forgiveness': streak_forgiveness,
                'xp_forgiveness': xp_forgiveness,
                'good_behavior_bonus': good_behavior_bonus,
                'total_forgiveness': total_forgiveness,
                'user_stats': {
                    'current_streak': streak_data['current_streak'],
                    'total_xp': xp_data['total_xp'],
                    'clean_sessions': clean_sessions,
                    'total_sessions': total_sessions
                }
            }
            
        except Exception as e:
            logger.warning(f"Error calculating audit forgiveness: {str(e)}")
            return {
                'streak_forgiveness': 0,
                'xp_forgiveness': 0,
                'good_behavior_bonus': 0,
                'total_forgiveness': 0,
                'user_stats': {'current_streak': 0, 'total_xp': 0, 'clean_sessions': 0, 'total_sessions': 0}
            }
    
    def _apply_forgiveness(self, base_score: int, forgiveness: Dict[str, Any]) -> int:
        """Apply forgiveness to suspicion score"""
        forgiveness_rate = forgiveness['total_forgiveness']
        adjusted_score = int(base_score * (1 - forgiveness_rate))
        return max(adjusted_score, 0)  # Don't go below 0
    
    def _generate_enhanced_validation_details(
        self, 
        analysis: Dict[str, Any], 
        adjusted_score: int, 
        forgiveness: Dict[str, Any],
        validation_mode: str
    ) -> Dict[str, Any]:
        """Generate enhanced validation details"""
        return {
            'base_analysis': analysis,
            'adjusted_suspicion_score': adjusted_score,
            'forgiveness_details': {
                'streak_forgiveness': f"{forgiveness['streak_forgiveness']:.1%}",
                'xp_forgiveness': f"{forgiveness['xp_forgiveness']:.1%}",
                'good_behavior_bonus': f"{forgiveness['good_behavior_bonus']:.1%}",
                'total_forgiveness': f"{forgiveness['total_forgiveness']:.1%}"
            },
            'user_history_summary': forgiveness['user_stats'],
            'validation_context': {
                'mode': validation_mode,
                'is_soft_audit': validation_mode == 'soft',
                'forgiveness_applied': forgiveness['total_forgiveness'] > 0
            },
            'recommendation': self._generate_recommendation(adjusted_score, forgiveness, validation_mode)
        }
    
    def _generate_recommendation(self, score: int, forgiveness: Dict[str, Any], mode: str) -> str:
        """Generate human-readable recommendation"""
        if score < 30:
            return "Session appears legitimate with no significant concerns."
        elif score < 60:
            return "Minor irregularities detected, but within acceptable range."
        elif score < 80:
            return "Several suspicious patterns detected. Consider review."
        else:
            return "High suspicion score. Recommend manual review."
    
    def _generate_validation_message(self, is_valid: bool, score: int, threshold: int) -> str:
        """Generate validation message"""
        if is_valid:
            return f"Session validated successfully (score: {score}/{threshold})"
        else:
            return f"Session flagged for review (score: {score}/{threshold})"
    
    async def _insert_enhanced_audit_record(
        self, 
        session_id: str, 
        user_id: str, 
        score: int, 
        details: Dict[str, Any], 
        is_valid: bool,
        forgiveness: Dict[str, Any]
    ):
        """Insert enhanced audit record"""
        try:
            self.supabase.table('session_audit').insert({
                'session_id': session_id,
                'user_id': user_id,
                'suspicion_score': score,
                'reasons': details['base_analysis'].get('anomalies', []),
                'events': details,
                'is_flagged': not is_valid,
                'audit_mode': 'soft',
                'forgiveness_applied': forgiveness['total_forgiveness'],
                'created_at': datetime.now().isoformat()
            }).execute()
        except Exception as e:
            logger.warning(f"Failed to insert enhanced audit record: {str(e)}")
    
    def _create_error_response(self, session_id: str, user_id: str, error: str) -> Dict[str, Any]:
        """Create error response"""
        return {
            'success': False,
            'session_id': session_id,
            'user_id': user_id,
            'is_valid': False,
            'validation_mode': 'soft',
            'base_suspicion_score': 100,
            'adjusted_suspicion_score': 100,
            'forgiveness_applied': None,
            'suspicion_threshold': self.SUSPICION_THRESHOLD_SOFT,
            'validation_details': {'error': error},
            'message': f"Audit validation failed: {error}"
        }
    
    async def _get_user_streak_history(self, user_id: str) -> Dict[str, int]:
        """Get user's streak history"""
        try:
            # Simplified streak history - in practice would query more sophisticated
            sessions_result = self.supabase.table('study_sessions').select('created_at').eq(
                'user_id', user_id
            ).order('created_at').execute()
            
            if sessions_result.error:
                return {'current_streak': 0, 'best_streak': 0}
            
            sessions = sessions_result.data
            current_streak, best_streak, _ = StreakCalculator.calculate_streak(sessions)
            
            return {'current_streak': current_streak, 'best_streak': best_streak}
        except:
            return {'current_streak': 0, 'best_streak': 0}
    
    async def _get_user_xp_history(self, user_id: str) -> Dict[str, int]:
        """Get user's XP history"""
        try:
            user_result = self.supabase.table('users').select('xp').eq('id', user_id).execute()
            if user_result.error or not user_result.data:
                return {'total_xp': 0}
            
            return {'total_xp': user_result.data[0]['xp']}
        except:
            return {'total_xp': 0}
    
    async def _get_user_audit_history(self, user_id: str, start_date: datetime, end_date: datetime) -> Dict[str, Any]:
        """Get user's audit history"""
        try:
            audit_result = self.supabase.table('session_audit').select('*').eq(
                'user_id', user_id
            ).gte('created_at', start_date.isoformat()).lte('created_at', end_date.isoformat()).order('created_at', desc=True).execute()
            
            if audit_result.error:
                return {'recent_audits': []}
            
            return {
                'recent_audits': [
                    {
                        'session_id': record['session_id'],
                        'suspicion_score': record['suspicion_score'],
                        'is_flagged': record['is_flagged'],
                        'created_at': record['created_at']
                    }
                    for record in audit_result.data[:10]  # Last 10 audits
                ]
            }
        except:
            return {'recent_audits': []}