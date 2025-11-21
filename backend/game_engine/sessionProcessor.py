"""
Game Engine Session Processor - Unified Pipeline
Integrates A1 (XP), B2 (Streak), Soft (Audit), and D3 (Ranking) modules
"""

import logging
from datetime import datetime
from typing import Dict, Any, Optional
from supabase import Client

from services.gamification.xp_service import XPService
from services.gamification.streak_service import StreakService
from services.gamification.soft_audit_service import SoftAuditService
from services.gamification.ranking_service import RankingService
from models.gamification import SessionCalculationRequest

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
    handlers=[
        logging.FileHandler('logs/session_engine.log'),
        logging.StreamHandler()
    ]
)

logger = logging.getLogger(__name__)


class SessionProcessor:
    """
    Unified session processor that orchestrates all gamification modules
    """
    
    def __init__(self, supabase_client: Client):
        """
        Initialize session processor with all gamification services
        
        Args:
            supabase_client: Supabase client instance
        """
        self.supabase = supabase_client
        
        # Initialize all gamification services
        self.xp_service = XPService(supabase_client)
        self.streak_service = StreakService(supabase_client)
        self.soft_audit_service = SoftAuditService(supabase_client)
        self.ranking_service = RankingService(supabase_client)
        
        logger.info("SessionProcessor initialized with all gamification modules")
    
    async def process_session(self, user_id: str, session_id: str) -> Dict[str, Any]:
        """
        Process a completed study session through the unified pipeline
        
        Pipeline Steps:
        1. Fetch session events
        2. Run enhanced Soft Audit analyzer
        3. Compute XP (A1 rules)
        4. Update Streak (B2 rules)
        5. Recompute Ranking (D3 composite score)
        6. Insert XP history row
        7. Insert audit result
        8. Return session_summary object
        
        Args:
            user_id: User UUID
            session_id: Session UUID
            
        Returns:
            session_summary: Complete session processing results
        """
        logger.info(f"Starting session processing for user={user_id}, session={session_id}")
        
        try:
            # Step 1: Fetch session events
            session_events = await self._fetch_session_events(session_id)
            if not session_events['success']:
                return self._create_error_response(
                    user_id, session_id, 
                    "Failed to fetch session events", 
                    session_events.get('message', 'Unknown error')
                )
            
            logger.info(f"Fetched {session_events['event_count']} events for session {session_id}")
            
            # Step 2: Run enhanced Soft Audit analyzer (non-blocking)
            audit_result = await self._run_soft_audit(user_id, session_id)
            logger.info(f"Soft audit completed: score={audit_result.get('adjusted_suspicion_score', 0)}, valid={audit_result.get('is_valid', False)}")
            
            # Step 3: Compute XP (A1 rules)
            xp_result = await self._compute_xp(user_id, session_id)
            if not xp_result['success']:
                logger.warning(f"XP computation failed: {xp_result.get('message', 'Unknown error')}")
                # Continue processing even if XP fails
            
            logger.info(f"XP computed: {xp_result.get('total_xp', 0)} XP awarded")
            
            # Step 4: Update Streak (B2 rules)
            streak_result = await self._update_streak(user_id)
            logger.info(f"Streak updated: current={streak_result.get('current_streak', 0)}, broken={streak_result.get('streak_broken', False)}")
            
            # Step 5: Recompute Ranking (D3 composite score)
            ranking_result = await self._recompute_ranking(user_id)
            logger.info(f"Ranking updated: tier={ranking_result.get('tier', 'bronze')}, score={ranking_result.get('composite_score', 0)}")
            
            # Step 6 & 7: XP history and audit results are already inserted by individual services
            
            # Step 8: Build and return session_summary
            session_summary = self._build_session_summary(
                user_id=user_id,
                session_id=session_id,
                xp_result=xp_result,
                streak_result=streak_result,
                audit_result=audit_result,
                ranking_result=ranking_result
            )
            
            logger.info(f"Session processing completed successfully for session {session_id}")
            
            return session_summary
            
        except Exception as e:
            logger.error(f"Error processing session {session_id}: {str(e)}", exc_info=True)
            return self._create_error_response(
                user_id, session_id,
                "Internal processing error",
                str(e)
            )
    
    async def _fetch_session_events(self, session_id: str) -> Dict[str, Any]:
        """Fetch all events for a session"""
        try:
            events_result = self.supabase.table('session_events').select('*').eq(
                'session_id', session_id
            ).order('created_at').execute()
            
            if events_result.error:
                return {
                    'success': False,
                    'message': f'Database error: {events_result.error}',
                    'events': [],
                    'event_count': 0
                }
            
            return {
                'success': True,
                'events': events_result.data,
                'event_count': len(events_result.data)
            }
            
        except Exception as e:
            logger.error(f"Error fetching session events: {str(e)}")
            return {
                'success': False,
                'message': str(e),
                'events': [],
                'event_count': 0
            }
    
    async def _run_soft_audit(self, user_id: str, session_id: str) -> Dict[str, Any]:
        """
        Run soft audit analyzer (non-blocking)
        Even if audit fails, session processing continues
        """
        try:
            audit_result = await self.soft_audit_service.validate_session_soft_audit(
                session_id=session_id,
                user_id=user_id,
                validation_mode="soft"
            )
            
            return audit_result
            
        except Exception as e:
            logger.warning(f"Soft audit failed (non-blocking): {str(e)}")
            # Return safe defaults on audit failure
            return {
                'success': False,
                'is_valid': True,  # Default to valid to not block XP/streak
                'adjusted_suspicion_score': 0,
                'forgiveness_applied': {'total_forgiveness': 0},
                'validation_details': {'error': str(e)},
                'message': 'Audit skipped due to error'
            }
    
    async def _compute_xp(self, user_id: str, session_id: str) -> Dict[str, Any]:
        """Compute and award XP using A1 rules"""
        try:
            # Use XP service to calculate and award XP
            calculation_request = SessionCalculationRequest(session_id=session_id)
            xp_result = await self.xp_service.calculate_xp_for_session(calculation_request)
            
            if xp_result.success:
                return {
                    'success': True,
                    'xp_delta': xp_result.calculation.total_xp,
                    'xp_reason': self._generate_xp_reason(xp_result.calculation),
                    'total_xp': xp_result.xp_awarded.total_xp,
                    'level': xp_result.xp_awarded.level,
                    'calculation_details': xp_result.calculation.dict()
                }
            else:
                return {
                    'success': False,
                    'xp_delta': 0,
                    'xp_reason': 'XP calculation failed',
                    'total_xp': 0,
                    'level': 1,
                    'message': xp_result.message
                }
                
        except Exception as e:
            logger.error(f"Error computing XP: {str(e)}")
            return {
                'success': False,
                'xp_delta': 0,
                'xp_reason': 'Error calculating XP',
                'total_xp': 0,
                'level': 1,
                'message': str(e)
            }
    
    async def _update_streak(self, user_id: str) -> Dict[str, Any]:
        """Update streak using B2 rules (must not break from audit issues)"""
        try:
            streak_result = await self.streak_service.update_daily_login_streak(user_id)
            
            if streak_result['success']:
                return {
                    'success': True,
                    'current_streak': streak_result['current_streak'],
                    'best_streak': streak_result['best_streak'],
                    'streak_broken': streak_result['streak_broken'],
                    'streak_delta': 1 if not streak_result['streak_broken'] else -streak_result['current_streak'],
                    'milestone_reached': streak_result.get('milestone_reached'),
                    'streak_multiplier': streak_result['streak_multiplier'],
                    'streak_bonus_xp': streak_result['streak_bonus_xp']
                }
            else:
                # Return safe defaults if streak update fails
                return {
                    'success': False,
                    'current_streak': 0,
                    'best_streak': 0,
                    'streak_broken': False,
                    'streak_delta': 0,
                    'milestone_reached': None,
                    'streak_multiplier': 1.0,
                    'streak_bonus_xp': 0,
                    'message': streak_result.get('message', 'Streak update failed')
                }
                
        except Exception as e:
            logger.error(f"Error updating streak: {str(e)}")
            return {
                'success': False,
                'current_streak': 0,
                'best_streak': 0,
                'streak_broken': False,
                'streak_delta': 0,
                'milestone_reached': None,
                'streak_multiplier': 1.0,
                'streak_bonus_xp': 0,
                'message': str(e)
            }
    
    async def _recompute_ranking(self, user_id: str) -> Dict[str, Any]:
        """Recompute ranking using D3 composite score (only after XP + streak update)"""
        try:
            # Get current ranking status
            ranking_status = await self.ranking_service.get_user_ranking_status(user_id)
            
            if not ranking_status['success']:
                return {
                    'success': False,
                    'tier': 'bronze',
                    'composite_score': 0,
                    'progress_percent': 0,
                    'message': ranking_status.get('message', 'Ranking calculation failed')
                }
            
            current_ranking = ranking_status['current_ranking']
            progress = ranking_status['progress']
            
            # Check for promotion eligibility
            promotion_check = await self.ranking_service.check_promotion_eligibility(user_id)
            
            # Auto-promote if eligible
            promoted = False
            if promotion_check.get('eligible_for_promotion', False):
                promotion_result = await self.ranking_service.promote_user_if_eligible(user_id)
                if promotion_result.get('success', False) and promotion_result.get('promoted', False):
                    promoted = True
                    current_ranking = promotion_result['new_ranking']
            
            return {
                'success': True,
                'tier': current_ranking['tier'],
                'tier_info': current_ranking['tier_info'],
                'composite_score': promotion_check.get('composite_score', 0),
                'progress_percent': progress.get('progress_to_next', 0),
                'promoted': promoted,
                'next_tier': progress.get('next_tier'),
                'user_stats': current_ranking['user_stats']
            }
            
        except Exception as e:
            logger.error(f"Error recomputing ranking: {str(e)}")
            return {
                'success': False,
                'tier': 'bronze',
                'composite_score': 0,
                'progress_percent': 0,
                'promoted': False,
                'message': str(e)
            }
    
    def _generate_xp_reason(self, calculation) -> str:
        """Generate human-readable XP reason"""
        reasons = []
        
        if calculation.base_xp > 0:
            reasons.append(f"{calculation.base_xp} base XP")
        
        if calculation.bonus_pomodoro > 0:
            reasons.append(f"+{calculation.bonus_pomodoro} Pomodoro bonus")
        
        if calculation.bonus_daily_goal > 0:
            reasons.append(f"+{calculation.bonus_daily_goal} daily goal")
        
        if calculation.milestone_500 > 0:
            reasons.append(f"+{calculation.milestone_500} milestone (500 XP)")
        
        if calculation.milestone_10000 > 0:
            reasons.append(f"+{calculation.milestone_10000} milestone (10K XP)")
        
        return " | ".join(reasons) if reasons else "Session completed"
    
    def _build_session_summary(
        self,
        user_id: str,
        session_id: str,
        xp_result: Dict[str, Any],
        streak_result: Dict[str, Any],
        audit_result: Dict[str, Any],
        ranking_result: Dict[str, Any]
    ) -> Dict[str, Any]:
        """Build the final session_summary object"""
        
        # Extract audit patterns
        audit_patterns = []
        if audit_result.get('validation_details'):
            base_analysis = audit_result['validation_details'].get('base_analysis', {})
            audit_patterns = base_analysis.get('anomalies', [])
        
        # Build forgiveness info
        forgiveness_applied = audit_result.get('forgiveness_applied', {})
        forgiveness_percent = forgiveness_applied.get('total_forgiveness', 0) * 100
        
        # Build friendly audit messages
        audit_messages = self._generate_audit_messages(
            audit_result.get('adjusted_suspicion_score', 0),
            audit_result.get('is_valid', True),
            forgiveness_percent
        )
        
        return {
            'success': True,
            'user_id': user_id,
            'session_id': session_id,
            'processed_at': datetime.now().isoformat(),
            
            # XP Information
            'xp_delta': xp_result.get('xp_delta', 0),
            'xp_reason': xp_result.get('xp_reason', 'Session completed'),
            'total_xp': xp_result.get('total_xp', 0),
            'level': xp_result.get('level', 1),
            
            # Streak Information
            'streak_status': 'maintained' if not streak_result.get('streak_broken', False) else 'broken',
            'streak_delta': streak_result.get('streak_delta', 0),
            'current_streak': streak_result.get('current_streak', 0),
            'best_streak': streak_result.get('best_streak', 0),
            'streak_milestone': streak_result.get('milestone_reached'),
            
            # Audit Information
            'audit_risk': audit_result.get('adjusted_suspicion_score', 0),
            'audit_valid': audit_result.get('is_valid', True),
            'audit_patterns': audit_patterns,
            'forgiveness_percent': round(forgiveness_percent, 1),
            'audit_messages': audit_messages,
            
            # Ranking Information
            'ranking': {
                'tier': ranking_result.get('tier', 'bronze'),
                'tier_info': ranking_result.get('tier_info', {}),
                'score': ranking_result.get('composite_score', 0),
                'progress_percent': round(ranking_result.get('progress_percent', 0), 1),
                'promoted': ranking_result.get('promoted', False),
                'next_tier': ranking_result.get('next_tier')
            },
            
            # Notification hooks (placeholder)
            'notifications': {
                'xp_gained': xp_result.get('xp_delta', 0) > 0,
                'streak_maintained': not streak_result.get('streak_broken', False),
                'streak_milestone': streak_result.get('milestone_reached') is not None,
                'ranking_promoted': ranking_result.get('promoted', False),
                'confetti_trigger': ranking_result.get('promoted', False) or streak_result.get('milestone_reached') is not None
            }
        }
    
    def _generate_audit_messages(self, suspicion_score: int, is_valid: bool, forgiveness_percent: float) -> list:
        """Generate friendly, encouraging audit messages"""
        messages = []
        
        if is_valid:
            if suspicion_score < 20:
                messages.append("✨ Perfect session! Keep up the great work!")
            elif suspicion_score < 40:
                messages.append("👍 Great session! Everything looks good.")
            else:
                messages.append("✅ Session validated successfully.")
        else:
            messages.append("⚠️ Some irregularities detected. Please ensure consistent study patterns.")
        
        if forgiveness_percent > 0:
            messages.append(f"💝 {forgiveness_percent:.0f}% forgiveness applied based on your excellent history!")
        
        return messages
    
    def _create_error_response(
        self,
        user_id: str,
        session_id: str,
        error_type: str,
        error_message: str
    ) -> Dict[str, Any]:
        """Create error response for failed session processing"""
        return {
            'success': False,
            'user_id': user_id,
            'session_id': session_id,
            'error_type': error_type,
            'error_message': error_message,
            'processed_at': datetime.now().isoformat(),
            
            # Safe defaults
            'xp_delta': 0,
            'xp_reason': 'Processing failed',
            'total_xp': 0,
            'level': 1,
            'streak_status': 'unknown',
            'streak_delta': 0,
            'current_streak': 0,
            'audit_risk': 0,
            'audit_valid': False,
            'audit_patterns': [],
            'forgiveness_percent': 0,
            'audit_messages': [f"❌ {error_type}: {error_message}"],
            'ranking': {
                'tier': 'bronze',
                'score': 0,
                'progress_percent': 0,
                'promoted': False
            },
            'notifications': {
                'xp_gained': False,
                'streak_maintained': False,
                'streak_milestone': False,
                'ranking_promoted': False,
                'confetti_trigger': False
            }
        }
