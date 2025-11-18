"""
Gamification Controller - Request handling layer
"""

import logging
from typing import Dict, Any
from fastapi import HTTPException

from services.gamification.xp_service import XPService
from types.gamification import (
    XPAwardRequest, SessionCalculationRequest, LeaderboardPeriod,
    AuditValidationRequest, OfflineSyncRequest
)

logger = logging.getLogger(__name__)


class GamificationController:
    """Controller for gamification endpoints"""
    
    def __init__(self, xp_service: XPService):
        self.xp_service = xp_service
    
    async def award_xp(self, request_data: Dict[str, Any]) -> Dict[str, Any]:
        """
        Handle XP award requests
        
        Args:
            request_data: Raw request data
            
        Returns:
            API response dictionary
        """
        try:
            # Validate and parse request
            user_id = request_data.get('user_id')
            amount = request_data.get('amount')
            source = request_data.get('source')
            metadata = request_data.get('metadata', {})
            
            if not user_id or not amount or not source:
                raise HTTPException(
                    status_code=400,
                    detail="Missing required fields: user_id, amount, source"
                )
            
            # Create request object
            award_request = XPAwardRequest(
                user_id=user_id,
                amount=int(amount),
                source=source,
                metadata=metadata
            )
            
            # Process XP award
            result = await self.xp_service.award_xp(award_request)
            
            return {
                "success": result.success,
                "data": {
                    "xp_history_id": result.xp_history_id,
                    "total_xp": result.total_xp,
                    "level": result.level,
                    "user_id": user_id,
                    "amount_awarded": amount
                },
                "message": result.message
            }
            
        except HTTPException:
            raise
        except Exception as e:
            logger.error(f"Error in award_xp controller: {str(e)}")
            raise HTTPException(status_code=500, detail=f"Internal server error: {str(e)}")
    
    async def calculate_session_xp(self, request_data: Dict[str, Any]) -> Dict[str, Any]:
        """
        Handle session XP calculation requests
        
        Args:
            request_data: Raw request data
            
        Returns:
            API response dictionary
        """
        try:
            # Validate and parse request
            session_id = request_data.get('session_id')
            
            if not session_id:
                raise HTTPException(
                    status_code=400,
                    detail="Missing required field: session_id"
                )
            
            # Create request object
            calc_request = SessionCalculationRequest(session_id=session_id)
            
            # Process XP calculation
            result = await self.xp_service.calculate_xp_for_session(calc_request)
            
            return {
                "success": result.success,
                "data": {
                    "session_id": result.session_id,
                    "user_id": result.user_id,
                    "duration_minutes": result.duration_minutes,
                    "calculation_details": result.calculation.dict(),
                    "xp_awarded": result.xp_awarded.dict() if result.xp_awarded.success else None
                },
                "message": result.message
            }
            
        except HTTPException:
            raise
        except Exception as e:
            logger.error(f"Error in calculate_session_xp controller: {str(e)}")
            raise HTTPException(status_code=500, detail=f"Internal server error: {str(e)}")
    
    async def get_leaderboard(self, period: str) -> Dict[str, Any]:
        """
        Handle leaderboard requests
        
        Args:
            period: Leaderboard period string
            
        Returns:
            API response dictionary
        """
        try:
            # Validate period
            try:
                leaderboard_period = LeaderboardPeriod(period)
            except ValueError:
                raise HTTPException(
                    status_code=400,
                    detail=f"Invalid period '{period}'. Must be one of: weekly, monthly, all-time"
                )
            
            # Get leaderboard
            result = await self.xp_service.get_xp_leaderboard(leaderboard_period)
            
            return {
                "success": result.success,
                "data": {
                    "period": result.period.value,
                    "entries": [entry.dict() for entry in result.entries],
                    "total_users": result.total_users,
                    "generated_at": result.generated_at.isoformat()
                },
                "message": result.message
            }
            
        except HTTPException:
            raise
        except Exception as e:
            logger.error(f"Error in get_leaderboard controller: {str(e)}")
            raise HTTPException(status_code=500, detail=f"Internal server error: {str(e)}")
    
    async def validate_audit(self, request_data: Dict[str, Any]) -> Dict[str, Any]:
        """
        Handle session audit validation requests
        
        Args:
            request_data: Raw request data
            
        Returns:
            API response dictionary
        """
        try:
            # Validate and parse request
            session_id = request_data.get('session_id')
            user_id = request_data.get('user_id')
            validation_mode = request_data.get('validation_mode', 'soft')
            
            if not session_id or not user_id:
                raise HTTPException(
                    status_code=400,
                    detail="Missing required fields: session_id, user_id"
                )
            
            if validation_mode not in ['soft', 'strict']:
                raise HTTPException(
                    status_code=400,
                    detail="Invalid validation_mode. Must be 'soft' or 'strict'"
                )
            
            # Create request object
            audit_request = AuditValidationRequest(
                session_id=session_id,
                user_id=user_id,
                validation_mode=validation_mode
            )
            
            # Process audit validation
            result = await self.xp_service.validate_session_audit(audit_request)
            
            return {
                "success": True,  # Audit validation always returns success with details
                "data": {
                    "session_id": result.session_id,
                    "user_id": result.user_id,
                    "is_valid": result.is_valid,
                    "suspicion_score": result.suspicion_score,
                    "validation_details": result.validation_details,
                    "validation_mode": validation_mode
                },
                "message": result.message
            }
            
        except HTTPException:
            raise
        except Exception as e:
            logger.error(f"Error in validate_audit controller: {str(e)}")
            raise HTTPException(status_code=500, detail=f"Internal server error: {str(e)}")
    
    async def sync_offline_events(self, request_data: Dict[str, Any]) -> Dict[str, Any]:
        """
        Handle offline event synchronization requests
        
        Args:
            request_data: Raw request data
            
        Returns:
            API response dictionary
        """
        try:
            # Validate and parse request
            user_id = request_data.get('user_id')
            events = request_data.get('events', [])
            last_sync = request_data.get('last_sync')
            
            if not user_id:
                raise HTTPException(
                    status_code=400,
                    detail="Missing required field: user_id"
                )
            
            if not isinstance(events, list):
                raise HTTPException(
                    status_code=400,
                    detail="Events must be a list"
                )
            
            # Create request object
            sync_request = OfflineSyncRequest(
                user_id=user_id,
                events=events,
                last_sync=last_sync
            )
            
            # Process offline sync
            result = await self.xp_service.sync_offline_events(sync_request)
            
            return {
                "success": result.success,
                "data": {
                    "synced_events": result.synced_events,
                    "pending_events": result.pending_events,
                    "conflicts_resolved": result.conflicts_resolved,
                    "total_events": len(events)
                },
                "message": result.message
            }
            
        except HTTPException:
            raise
        except Exception as e:
            logger.error(f"Error in sync_offline_events controller: {str(e)}")
            raise HTTPException(status_code=500, detail=f"Internal server error: {str(e)}")
    
    async def get_user_xp_history(self, user_id: str, limit: int = 50) -> Dict[str, Any]:
        """
        Get user's XP history
        
        Args:
            user_id: User ID
            limit: Maximum number of records to return
            
        Returns:
            API response dictionary
        """
        try:
            if not user_id:
                raise HTTPException(status_code=400, detail="Missing user_id")
            
            # Query XP history
            result = self.xp_service.supabase.table('xp_history').select('*').eq(
                'user_id', user_id
            ).order('created_at', desc=True).limit(limit).execute()
            
            if result.error:
                raise HTTPException(status_code=500, detail=f"Database error: {result.error}")
            
            # Format response
            xp_history = []
            for record in result.data:
                xp_history.append({
                    'id': record['id'],
                    'amount': record['amount'],
                    'source': record['source'],
                    'metadata': record['meta'],
                    'created_at': record['created_at']
                })
            
            return {
                "success": True,
                "data": {
                    "user_id": user_id,
                    "xp_history": xp_history,
                    "total_records": len(xp_history)
                },
                "message": f"Retrieved {len(xp_history)} XP history records"
            }
            
        except HTTPException:
            raise
        except Exception as e:
            logger.error(f"Error in get_user_xp_history controller: {str(e)}")
            raise HTTPException(status_code=500, detail=f"Internal server error: {str(e)}")
    
    async def get_user_daily_metrics(self, user_id: str, days: int = 30) -> Dict[str, Any]:
        """
        Get user's daily metrics
        
        Args:
            user_id: User ID
            days: Number of days to look back
            
        Returns:
            API response dictionary
        """
        try:
            if not user_id:
                raise HTTPException(status_code=400, detail="Missing user_id")
            
            from datetime import datetime, timedelta
            
            # Calculate date range
            end_date = datetime.now().date()
            start_date = end_date - timedelta(days=days)
            
            # Query daily metrics
            result = self.xp_service.supabase.table('daily_user_metrics').select('*').eq(
                'user_id', user_id
            ).gte('date', start_date.isoformat()).lte('date', end_date.isoformat()).order('date').execute()
            
            if result.error:
                raise HTTPException(status_code=500, detail=f"Database error: {result.error}")
            
            # Format response
            daily_metrics = []
            for record in result.data:
                daily_metrics.append({
                    'date': record['date'],
                    'total_minutes': record['total_minutes'],
                    'xp_earned': record['xp_earned'],
                    'streak_active': record['streak_active'],
                    'space_breakdown': record['space_breakdown'],
                    'updated_at': record['updated_at']
                })
            
            return {
                "success": True,
                "data": {
                    "user_id": user_id,
                    "daily_metrics": daily_metrics,
                    "date_range": {
                        "start_date": start_date.isoformat(),
                        "end_date": end_date.isoformat(),
                        "days": days
                    }
                },
                "message": f"Retrieved daily metrics for {len(daily_metrics)} days"
            }
            
        except HTTPException:
            raise
        except Exception as e:
            logger.error(f"Error in get_user_daily_metrics controller: {str(e)}")
            raise HTTPException(status_code=500, detail=f"Internal server error: {str(e)}")