"""
Ranking Service - Module D3: Ranking System
Implements tier-based ranking with XP + Streak promotion and auto-downgrade
"""

import logging
from datetime import datetime, timedelta
from typing import Dict, Any, List, Optional, Tuple
from supabase import create_client, Client

logger = logging.getLogger(__name__)


class RankingConstants:
    """Ranking tier constants and thresholds"""
    
    # Tier structure
    TIERS = {
        'bronze': {
            'name': 'Bronze',
            'emoji': '🥉',
            'color': '#CD7F32',
            'min_xp': 0,
            'min_streak': 0,
            'promotion_threshold_xp': 500,
            'promotion_threshold_streak': 3
        },
        'silver': {
            'name': 'Silver',
            'emoji': '🥈',
            'color': '#C0C0C0',
            'min_xp': 500,
            'min_streak': 3,
            'promotion_threshold_xp': 2000,
            'promotion_threshold_streak': 7
        },
        'gold': {
            'name': 'Gold',
            'emoji': '🥇',
            'color': '#FFD700',
            'min_xp': 2000,
            'min_streak': 7,
            'promotion_threshold_xp': 5000,
            'promotion_threshold_streak': 14
        },
        'platinum': {
            'name': 'Platinum',
            'emoji': '💎',
            'color': '#E5E4E2',
            'min_xp': 5000,
            'min_streak': 14,
            'promotion_threshold_xp': 15000,
            'promotion_threshold_streak': 30
        },
        'diamond': {
            'name': 'Diamond',
            'emoji': '💎',
            'color': '#B9F2FF',
            'min_xp': 15000,
            'min_streak': 30,
            'promotion_threshold_xp': None,  # Max tier
            'promotion_threshold_streak': None
        }
    }
    
    # Downgrade thresholds (inactive period in days)
    DOWNGRADE_THRESHOLDS = {
        'silver': 14,
        'gold': 10,
        'platinum': 7,
        'diamond': 5
    }
    
    # Composite scoring for promotion
    XP_WEIGHT = 0.7
    STREAK_WEIGHT = 0.3
    
    # Promotion requirements (minimum values for each tier)
    PROMOTION_REQUIREMENTS = {
        'bronze_to_silver': {'xp': 500, 'streak': 3},
        'silver_to_gold': {'xp': 2000, 'streak': 7},
        'gold_to_platinum': {'xp': 5000, 'streak': 14},
        'platinum_to_diamond': {'xp': 15000, 'streak': 30}
    }


class RankingService:
    """Service for managing user ranking tiers and promotions"""
    
    def __init__(self, supabase_client: Client):
        self.supabase = supabase_client
        
    async def get_user_ranking_status(self, user_id: str) -> Dict[str, Any]:
        """
        Get comprehensive ranking status for a user
        
        Args:
            user_id: User UUID
            
        Returns:
            Complete ranking information including current tier, progress, and next milestones
        """
        try:
            # Get user data
            user_result = self.supabase.table('users').select('*').eq('id', user_id).execute()
            if user_result.error or not user_result.data:
                return {'success': False, 'message': 'User not found'}
            
            user = user_result.data[0]
            user_xp = user.get('xp', 0)
            user_level = user.get('level', 1)
            
            # Calculate current streak
            current_streak = await self._calculate_user_streak(user_id)
            
            # Determine current tier
            current_tier = self._determine_tier(user_xp, current_streak)
            
            # Calculate progress to next tier
            progress = self._calculate_tier_progress(user_xp, current_streak, current_tier)
            
            # Check if user should be downgraded
            downgrade_info = await self._check_downgrade_needed(user_id, current_tier, user_xp, current_streak)
            
            # Get ranking leaderboard position
            leaderboard_position = await self._get_leaderboard_position(user_id, user_xp)
            
            # Calculate next milestones
            next_milestones = self._calculate_next_milestones(user_xp, current_streak, current_tier)
            
            return {
                'success': True,
                'user_id': user_id,
                'current_ranking': {
                    'tier': current_tier,
                    'tier_info': RankingConstants.TIERS[current_tier],
                    'user_stats': {
                        'xp': user_xp,
                        'level': user_level,
                        'current_streak': current_streak
                    }
                },
                'progress': progress,
                'leaderboard': {
                    'position': leaderboard_position,
                    'total_users': await self._get_total_active_users()
                },
                'next_milestones': next_milestones,
                'downgrade_info': downgrade_info,
                'ranking_api_endpoint': '/ranking/status',
                'timestamp': datetime.now().isoformat()
            }
            
        except Exception as e:
            logger.error(f"Error getting ranking status for user {user_id}: {str(e)}")
            return {'success': False, 'message': f'Internal error: {str(e)}'}
    
    async def check_promotion_eligibility(self, user_id: str) -> Dict[str, Any]:
        """
        Check if user is eligible for tier promotion
        
        Args:
            user_id: User UUID
            
        Returns:
            Promotion eligibility status and requirements
        """
        try:
            # Get current ranking status
            ranking_status = await self.get_user_ranking_status(user_id)
            if not ranking_status['success']:
                return ranking_status
            
            current_tier = ranking_status['current_ranking']['tier']
            user_stats = ranking_status['current_ranking']['user_stats']
            
            # Check if already at max tier
            if current_tier == 'diamond':
                return {
                    'success': True,
                    'user_id': user_id,
                    'current_tier': current_tier,
                    'eligible_for_promotion': False,
                    'message': 'Already at highest tier (Diamond)',
                    'next_tier': None,
                    'requirements': None
                }
            
            # Determine next tier
            tier_order = ['bronze', 'silver', 'gold', 'platinum', 'diamond']
            current_index = tier_order.index(current_tier)
            next_tier = tier_order[current_index + 1]
            
            # Get promotion requirements
            promotion_key = f"{current_tier}_to_{next_tier}"
            requirements = RankingConstants.PROMOTION_REQUIREMENTS.get(promotion_key, {})
            
            # Check eligibility
            xp_requirement = requirements.get('xp', 0)
            streak_requirement = requirements.get('streak', 0)
            
            xp_met = user_stats['xp'] >= xp_requirement
            streak_met = user_stats['current_streak'] >= streak_requirement
            eligible = xp_met and streak_met
            
            return {
                'success': True,
                'user_id': user_id,
                'current_tier': current_tier,
                'next_tier': next_tier,
                'eligible_for_promotion': eligible,
                'requirements': {
                    'xp': {
                        'required': xp_requirement,
                        'current': user_stats['xp'],
                        'met': xp_met,
                        'remaining': max(0, xp_requirement - user_stats['xp'])
                    },
                    'streak': {
                        'required': streak_requirement,
                        'current': user_stats['current_streak'],
                        'met': streak_met,
                        'remaining': max(0, streak_requirement - user_stats['current_streak'])
                    }
                },
                'message': f"Eligible for promotion to {RankingConstants.TIERS[next_tier]['name']}" if eligible else f"Need {xp_requirement} XP and {streak_requirement} day streak for {RankingConstants.TIERS[next_tier]['name']}",
                'composite_score': self._calculate_composite_score(user_stats['xp'], user_stats['current_streak'])
            }
            
        except Exception as e:
            logger.error(f"Error checking promotion eligibility for user {user_id}: {str(e)}")
            return {'success': False, 'message': f'Internal error: {str(e)}'}
    
    async def promote_user_if_eligible(self, user_id: str) -> Dict[str, Any]:
        """
        Promote user to next tier if eligible
        
        Args:
            user_id: User UUID
            
        Returns:
            Promotion result with updated tier information
        """
        try:
            # Check eligibility
            eligibility = await self.check_promotion_eligibility(user_id)
            if not eligibility['success']:
                return eligibility
            
            if not eligibility['eligible_for_promotion']:
                return {
                    'success': False,
                    'user_id': user_id,
                    'message': 'Not eligible for promotion yet',
                    'current_tier': eligibility['current_tier'],
                    'requirements': eligibility['requirements']
                }
            
            current_tier = eligibility['current_tier']
            new_tier = eligibility['next_tier']
            
            # Record promotion event
            await self._record_promotion_event(user_id, current_tier, new_tier)
            
            # Update user ranking record
            await self._update_user_ranking_record(user_id, new_tier)
            
            # Get updated status
            updated_status = await self.get_user_ranking_status(user_id)
            
            return {
                'success': True,
                'user_id': user_id,
                'promoted': True,
                'from_tier': current_tier,
                'to_tier': new_tier,
                'new_ranking': updated_status['current_ranking'],
                'message': f"Congratulations! Promoted from {RankingConstants.TIERS[current_tier]['name']} to {RankingConstants.TIERS[new_tier]['name']}!",
                'celebration_data': {
                    'tier_emoji': RankingConstants.TIERS[new_tier]['emoji'],
                    'tier_color': RankingConstants.TIERS[new_tier]['color'],
                    'new_title': f"{RankingConstants.TIERS[new_tier]['name']} Scholar"
                }
            }
            
        except Exception as e:
            logger.error(f"Error promoting user {user_id}: {str(e)}")
            return {'success': False, 'message': f'Internal error: {str(e)}'}
    
    async def process_downgrades(self) -> Dict[str, Any]:
        """
        Process automatic downgrades for inactive users
        
        Returns:
            Summary of downgrades processed
        """
        try:
            downgraded_users = []
            
            # Get all users with their current tiers
            users_result = self.supabase.table('users').select('id, xp, updated_at').execute()
            if users_result.error:
                return {'success': False, 'message': 'Failed to fetch users'}
            
            for user in users_result.data:
                user_id = user['id']
                user_xp = user.get('xp', 0)
                
                # Calculate current streak
                current_streak = await self._calculate_user_streak(user_id)
                
                # Determine current tier
                current_tier = self._determine_tier(user_xp, current_streak)
                
                # Check if downgrade is needed
                downgrade_info = await self._check_downgrade_needed(user_id, current_tier, user_xp, current_streak)
                
                if downgrade_info['should_downgrade']:
                    # Perform downgrade
                    new_tier = downgrade_info['new_tier']
                    await self._record_downgrade_event(user_id, current_tier, new_tier, downgrade_info['reason'])
                    await self._update_user_ranking_record(user_id, new_tier)
                    
                    downgraded_users.append({
                        'user_id': user_id,
                        'from_tier': current_tier,
                        'to_tier': new_tier,
                        'reason': downgrade_info['reason'],
                        'inactive_days': downgrade_info['inactive_days']
                    })
            
            return {
                'success': True,
                'downgrade_count': len(downgraded_users),
                'downgraded_users': downgraded_users,
                'processed_at': datetime.now().isoformat()
            }
            
        except Exception as e:
            logger.error(f"Error processing downgrades: {str(e)}")
            return {'success': False, 'message': f'Internal error: {str(e)}'}
    
    async def get_leaderboard(self, limit: int = 50) -> Dict[str, Any]:
        """
        Get ranking leaderboard
        
        Args:
            limit: Number of users to return
            
        Returns:
            Leaderboard with user rankings
        """
        try:
            # Get top users by XP
            users_result = self.supabase.table('users').select('id, xp, level').order('xp', desc=True).limit(limit).execute()
            if users_result.error:
                return {'success': False, 'message': 'Failed to fetch leaderboard'}
            
            leaderboard = []
            for i, user in enumerate(users_result.data):
                user_id = user['id']
                user_xp = user.get('xp', 0)
                
                # Calculate current streak
                current_streak = await self._calculate_user_streak(user_id)
                
                # Determine tier
                tier = self._determine_tier(user_xp, current_streak)
                
                leaderboard.append({
                    'position': i + 1,
                    'user_id': user_id,
                    'xp': user_xp,
                    'level': user.get('level', 1),
                    'current_streak': current_streak,
                    'tier': tier,
                    'tier_info': RankingConstants.TIERS[tier]
                })
            
            return {
                'success': True,
                'leaderboard': leaderboard,
                'total_users': len(leaderboard),
                'generated_at': datetime.now().isoformat()
            }
            
        except Exception as e:
            logger.error(f"Error getting leaderboard: {str(e)}")
            return {'success': False, 'message': f'Internal error: {str(e)}'}
    
    def _determine_tier(self, xp: int, streak: int) -> str:
        """Determine tier based on XP and streak"""
        tier_order = ['bronze', 'silver', 'gold', 'platinum', 'diamond']
        
        for tier in reversed(tier_order):
            tier_info = RankingConstants.TIERS[tier]
            if xp >= tier_info['min_xp'] and streak >= tier_info['min_streak']:
                return tier
        
        return 'bronze'  # Default tier
    
    def _calculate_composite_score(self, xp: int, streak: int) -> float:
        """Calculate composite score for promotion eligibility"""
        normalized_xp = min(xp / 15000, 1.0)  # Normalize to max tier
        normalized_streak = min(streak / 30, 1.0)  # Normalize to max streak
        
        return (normalized_xp * RankingConstants.XP_WEIGHT + 
                normalized_streak * RankingConstants.STREAK_WEIGHT)
    
    def _calculate_tier_progress(self, xp: int, streak: int, current_tier: str) -> Dict[str, Any]:
        """Calculate progress to next tier"""
        tier_order = ['bronze', 'silver', 'gold', 'platinum', 'diamond']
        current_index = tier_order.index(current_tier)
        
        if current_index >= len(tier_order) - 1:  # Already at max tier
            return {
                'at_max_tier': True,
                'progress_to_next': 100,
                'next_tier': None
            }
        
        next_tier = tier_order[current_index + 1]
        current_tier_info = RankingConstants.TIERS[current_tier]
        next_tier_info = RankingConstants.TIERS[next_tier]
        
        # Calculate XP progress
        xp_range = next_tier_info['promotion_threshold_xp'] - current_tier_info['promotion_threshold_xp']
        xp_progress = ((xp - current_tier_info['promotion_threshold_xp']) / xp_range * 100) if xp_range > 0 else 100
        
        # Calculate streak progress
        streak_range = next_tier_info['promotion_threshold_streak'] - current_tier_info['promotion_threshold_streak']
        streak_progress = ((streak - current_tier_info['promotion_threshold_streak']) / streak_range * 100) if streak_range > 0 else 100
        
        # Overall progress (weighted average)
        overall_progress = (xp_progress * RankingConstants.XP_WEIGHT + 
                          streak_progress * RankingConstants.STREAK_WEIGHT)
        
        return {
            'at_max_tier': False,
            'progress_to_next': min(overall_progress, 100),
            'next_tier': next_tier,
            'next_tier_info': next_tier_info,
            'xp_progress': max(xp_progress, 0),
            'streak_progress': max(streak_progress, 0),
            'requirements': {
                'xp': next_tier_info['promotion_threshold_xp'],
                'streak': next_tier_info['promotion_threshold_streak']
            }
        }
    
    def _calculate_next_milestones(self, xp: int, streak: int, current_tier: str) -> Dict[str, Any]:
        """Calculate next achievement milestones"""
        tier_order = ['bronze', 'silver', 'gold', 'platinum', 'diamond']
        current_index = tier_order.index(current_tier)
        
        # Next tier milestone
        next_tier = None
        if current_index < len(tier_order) - 1:
            next_tier = tier_order[current_index + 1]
            next_tier_info = RankingConstants.TIERS[next_tier]
            next_milestone = {
                'type': 'tier_promotion',
                'target': next_tier,
                'target_name': next_tier_info['name'],
                'target_emoji': next_tier_info['emoji'],
                'xp_needed': max(0, next_tier_info['promotion_threshold_xp'] - xp),
                'streak_needed': max(0, next_tier_info['promotion_threshold_streak'] - streak)
            }
        else:
            next_milestone = {
                'type': 'max_tier',
                'target': 'diamond_master',
                'message': 'Maintain your Diamond status!'
            }
        
        # Streak milestones
        streak_milestones = []
        streak_targets = [7, 14, 30, 60, 100]
        for target in streak_targets:
            if streak < target:
                streak_milestones.append({
                    'type': 'streak',
                    'target': f'{target}_days',
                    'current': streak,
                    'needed': target - streak
                })
                if len(streak_milestones) >= 2:  # Limit to next 2
                    break
        
        return {
            'next_tier': next_milestone,
            'streak_milestones': streak_milestones[:2],
            'xp_milestones': [
                {
                    'type': 'xp_round',
                    'target': f'{((xp // 1000) + 1) * 1000}_xp',
                    'current': xp,
                    'needed': ((xp // 1000) + 1) * 1000 - xp
                }
            ]
        }
    
    async def _calculate_user_streak(self, user_id: str) -> int:
        """Calculate user's current study streak"""
        try:
            # Get recent sessions
            sessions_result = self.supabase.table('study_sessions').select('created_at').eq(
                'user_id', user_id
            ).order('created_at', desc=True).limit(100).execute()
            
            if sessions_result.error or not sessions_result.data:
                return 0
            
            from datetime import date
            sessions = sessions_result.data
            
            # Calculate streak (simplified version)
            streak = 0
            current_date = date.today()
            
            for session in sessions:
                session_date = datetime.fromisoformat(session['created_at'].replace('Z', '+00:00')).date()
                days_diff = (current_date - session_date).days
                
                if days_diff == streak:  # Consecutive day
                    streak += 1
                elif days_diff > streak:
                    break  # Streak broken
            
            return streak
            
        except Exception as e:
            logger.warning(f"Error calculating streak for user {user_id}: {str(e)}")
            return 0
    
    async def _check_downgrade_needed(self, user_id: str, current_tier: str, xp: int, streak: int) -> Dict[str, Any]:
        """Check if user should be downgraded due to inactivity"""
        if current_tier == 'bronze':
            return {
                'should_downgrade': False,
                'reason': None,
                'inactive_days': 0,
                'new_tier': current_tier
            }
        
        # Check inactive period
        try:
            user_result = self.supabase.table('users').select('updated_at').eq('id', user_id).execute()
            if user_result.error or not user_result.data:
                return {'should_downgrade': False, 'reason': 'No data', 'inactive_days': 0, 'new_tier': current_tier}
            
            last_update = datetime.fromisoformat(user_result.data[0]['updated_at'].replace('Z', '+00:00'))
            inactive_days = (datetime.now() - last_update).days
            
            # Check against downgrade threshold for tier
            downgrade_threshold = RankingConstants.DOWNGRADE_THRESHOLDS.get(current_tier, 30)
            
            if inactive_days > downgrade_threshold:
                # Determine new tier based on current XP and streak
                new_tier = self._determine_tier(xp, streak)
                
                if new_tier != current_tier:
                    return {
                        'should_downgrade': True,
                        'reason': f'Inactive for {inactive_days} days (threshold: {downgrade_threshold})',
                        'inactive_days': inactive_days,
                        'new_tier': new_tier,
                        'downgrade_threshold': downgrade_threshold
                    }
            
            return {
                'should_downgrade': False,
                'reason': f'Active within {downgrade_threshold} days',
                'inactive_days': inactive_days,
                'new_tier': current_tier,
                'downgrade_threshold': downgrade_threshold
            }
            
        except Exception as e:
            logger.warning(f"Error checking downgrade for user {user_id}: {str(e)}")
            return {
                'should_downgrade': False,
                'reason': 'Error checking status',
                'inactive_days': 0,
                'new_tier': current_tier
            }
    
    async def _get_leaderboard_position(self, user_id: str, user_xp: int) -> int:
        """Get user's position on leaderboard"""
        try:
            # Count users with higher XP
            higher_users_result = self.supabase.table('users').select('id', count='exact').gt('xp', user_xp).execute()
            if higher_users_result.error:
                return 0
            
            higher_count = higher_users_result.count or 0
            return higher_count + 1
            
        except Exception as e:
            logger.warning(f"Error getting leaderboard position for user {user_id}: {str(e)}")
            return 0
    
    async def _get_total_active_users(self) -> int:
        """Get total number of active users"""
        try:
            users_result = self.supabase.table('users').select('id', count='exact').execute()
            return users_result.count or 0
        except:
            return 0
    
    async def _record_promotion_event(self, user_id: str, from_tier: str, to_tier: str):
        """Record promotion event"""
        try:
            self.supabase.table('ranking_events').insert({
                'user_id': user_id,
                'event_type': 'promotion',
                'from_tier': from_tier,
                'to_tier': to_tier,
                'created_at': datetime.now().isoformat()
            }).execute()
        except Exception as e:
            logger.warning(f"Failed to record promotion event: {str(e)}")
    
    async def _record_downgrade_event(self, user_id: str, from_tier: str, to_tier: str, reason: str):
        """Record downgrade event"""
        try:
            self.supabase.table('ranking_events').insert({
                'user_id': user_id,
                'event_type': 'downgrade',
                'from_tier': from_tier,
                'to_tier': to_tier,
                'reason': reason,
                'created_at': datetime.now().isoformat()
            }).execute()
        except Exception as e:
            logger.warning(f"Failed to record downgrade event: {str(e)}")
    
    async def _update_user_ranking_record(self, user_id: str, new_tier: str):
        """Update user's ranking record"""
        try:
            # Check if ranking record exists
            existing_result = self.supabase.table('user_rankings').select('id').eq('user_id', user_id).execute()
            
            if existing_result.data:
                # Update existing record
                self.supabase.table('user_rankings').update({
                    'current_tier': new_tier,
                    'updated_at': datetime.now().isoformat()
                }).eq('user_id', user_id).execute()
            else:
                # Create new record
                self.supabase.table('user_rankings').insert({
                    'user_id': user_id,
                    'current_tier': new_tier,
                    'promotion_count': 0,
                    'downgrade_count': 0,
                    'created_at': datetime.now().isoformat(),
                    'updated_at': datetime.now().isoformat()
                }).execute()
                
        except Exception as e:
            logger.warning(f"Failed to update user ranking record: {str(e)}")