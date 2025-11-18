"""
Tests for Gamification System
"""

import pytest
import asyncio
from unittest.mock import Mock, AsyncMock, patch
from datetime import datetime, timedelta, date
import json

# Import the classes we want to test
from services.gamification.xp_service import XPService
from controllers.gamification_controller import GamificationController
from types.gamification import (
    XPAwardRequest, XPSource, SessionCalculationRequest, 
    LeaderboardPeriod, AuditValidationRequest, OfflineSyncRequest
)
from utils.gamification_helpers import (
    StreakCalculator, XPValidator, AuditAnalyzer, 
    OfflineSyncManager, MilestoneChecker, LevelCalculator
)


class TestXPService:
    """Test cases for XPService"""
    
    @pytest.fixture
    def mock_supabase(self):
        """Create a mock Supabase client"""
        supabase = Mock()
        supabase.table = Mock()
        return supabase
    
    @pytest.fixture
    def xp_service(self, mock_supabase):
        """Create an XPService instance with mocked Supabase"""
        return XPService(mock_supabase)
    
    @pytest.mark.asyncio
    async def test_award_xp_success(self, xp_service, mock_supabase):
        """Test successful XP award"""
        # Setup mock responses
        mock_supabase.table.return_value.insert.return_value.execute.return_value = Mock(
            data=[{'id': 'xp-123'}],
            error=None
        )
        mock_supabase.table.return_value.select.return_value.eq.return_value.execute.return_value = Mock(
            data=[{'xp': 100, 'level': 2}],
            error=None
        )
        mock_supabase.table.return_value.update.return_value.eq.return_value.execute.return_value = Mock(
            data=None,
            error=None
        )
        
        # Test request
        request = XPAwardRequest(
            user_id='user-123',
            amount=50,
            source=XPSource.SESSION,
            metadata={'session_id': 'session-123'}
        )
        
        # Execute
        result = await xp_service.award_xp(request)
        
        # Assert
        assert result.success is True
        assert result.xp_history_id == 'xp-123'
        assert result.total_xp == 150  # 100 + 50
        assert result.level == 2
        assert 'Successfully awarded' in result.message
    
    @pytest.mark.asyncio
    async def test_award_xp_failure(self, xp_service, mock_supabase):
        """Test XP award failure"""
        # Setup mock to return error
        mock_supabase.table.return_value.insert.return_value.execute.return_value = Mock(
            data=None,
            error='Database error'
        )
        
        request = XPAwardRequest(
            user_id='user-123',
            amount=50,
            source=XPSource.SESSION
        )
        
        result = await xp_service.award_xp(request)
        
        assert result.success is False
        assert result.total_xp == 0
        assert 'Failed to record XP history' in result.message
    
    @pytest.mark.asyncio
    async def test_calculate_xp_for_session(self, xp_service, mock_supabase):
        """Test session XP calculation"""
        # Setup mock responses
        mock_supabase.table.return_value.select.return_value.eq.return_value.execute.return_value = Mock(
            data=[{
                'id': 'session-123',
                'user_id': 'user-123',
                'duration_minutes': 30
            }],
            error=None
        )
        
        # Mock the award_xp call within calculate_xp_for_session
        with patch.object(xp_service, 'award_xp') as mock_award_xp:
            mock_award_xp.return_value = Mock(
                success=True,
                xp_history_id='xp-456',
                total_xp=200,
                level=3,
                message='XP awarded'
            )
            
            request = SessionCalculationRequest(session_id='session-123')
            result = await xp_service.calculate_xp_for_session(request)
            
            assert result.success is True
            assert result.session_id == 'session-123'
            assert result.user_id == 'user-123'
            assert result.duration_minutes == 30
            assert result.calculation.total_xp == 40  # 30 base + 10 pomodoro
            assert result.xp_awarded.success is True
    
    @pytest.mark.asyncio
    async def test_get_xp_leaderboard(self, xp_service, mock_supabase):
        """Test XP leaderboard retrieval"""
        # Setup mock response
        mock_supabase.table.return_value.select.return_value.gte.return_value.lte.return_value.execute.return_value = Mock(
            data=[
                {
                    'user_id': 'user-1',
                    'amount': 100,
                    'users': {'username': 'Alice', 'xp': 500, 'level': 5}
                },
                {
                    'user_id': 'user-2',
                    'amount': 150,
                    'users': {'username': 'Bob', 'xp': 300, 'level': 3}
                }
            ],
            error=None
        )
        
        result = await xp_service.get_xp_leaderboard(LeaderboardPeriod.WEEKLY)
        
        assert result.success is True
        assert result.period == LeaderboardPeriod.WEEKLY
        assert len(result.entries) == 2
        assert result.entries[0].rank == 1
        assert result.entries[0].username == 'Bob'  # Higher period XP
        assert result.entries[1].username == 'Alice'
        assert result.total_users == 2


class TestGamificationController:
    """Test cases for GamificationController"""
    
    @pytest.fixture
    def mock_xp_service(self):
        """Create a mock XP service"""
        return Mock()
    
    @pytest.fixture
    def controller(self, mock_xp_service):
        """Create a controller instance with mocked service"""
        return GamificationController(mock_xp_service)
    
    def test_award_xp_controller_success(self, controller, mock_xp_service):
        """Test successful XP award through controller"""
        # Setup mock
        mock_xp_service.award_xp.return_value = Mock(
            success=True,
            xp_history_id='xp-123',
            total_xp=150,
            level=2,
            message='XP awarded'
        )
        
        # Test data
        request_data = {
            'user_id': 'user-123',
            'amount': 50,
            'source': 'session',
            'metadata': {'session_id': 'session-123'}
        }
        
        # Execute
        result = controller.award_xp(request_data)
        
        # Assert
        assert result['success'] is True
        assert result['data']['xp_history_id'] == 'xp-123'
        assert result['data']['total_xp'] == 150
        assert result['data']['amount_awarded'] == 50
    
    def test_award_xp_controller_missing_fields(self, controller):
        """Test XP award controller with missing fields"""
        # Test data missing required fields
        request_data = {
            'user_id': 'user-123',
            'amount': 50
            # Missing 'source'
        }
        
        # Should raise HTTPException
        with pytest.raises(Exception) as exc_info:
            controller.award_xp(request_data)
        
        assert 'Missing required fields' in str(exc_info.value)
    
    def test_calculate_session_xp_controller(self, controller, mock_xp_service):
        """Test session XP calculation through controller"""
        # Setup mock
        from types.gamification import XPCalculationDetails
        mock_xp_service.calculate_xp_for_session.return_value = Mock(
            success=True,
            session_id='session-123',
            user_id='user-123',
            duration_minutes=25,
            calculation=XPCalculationDetails(
                base_xp=25, bonus_pomodoro=10, bonus_daily_goal=0,
                milestone_500=0, milestone_10000=0, total_xp=35,
                calculation_metadata={}
            ),
            xp_awarded=Mock(success=True, total_xp=35, level=2, message='Success'),
            message='Calculated successfully'
        )
        
        request_data = {'session_id': 'session-123'}
        
        result = controller.calculate_session_xp(request_data)
        
        assert result['success'] is True
        assert result['data']['session_id'] == 'session-123'
        assert result['data']['calculation_details']['total_xp'] == 35
    
    def test_get_leaderboard_controller(self, controller, mock_xp_service):
        """Test leaderboard retrieval through controller"""
        # Setup mock
        from types.gamification import LeaderboardEntry
        mock_xp_service.get_xp_leaderboard.return_value = Mock(
            success=True,
            period=LeaderboardPeriod.WEEKLY,
            entries=[
                LeaderboardEntry(
                    rank=1, user_id='user-1', username='Alice',
                    xp=100, level=2, streak_multiplier=1.0
                )
            ],
            total_users=1,
            generated_at=datetime.now(),
            message='Leaderboard generated'
        )
        
        result = controller.get_leaderboard('weekly')
        
        assert result['success'] is True
        assert result['data']['period'] == 'weekly'
        assert len(result['data']['entries']) == 1
        assert result['data']['entries'][0]['username'] == 'Alice'


class TestHelperUtilities:
    """Test cases for helper utilities"""
    
    def test_streak_calculator(self):
        """Test streak calculation"""
        sessions = [
            {'created_at': (datetime.now() - timedelta(days=3)).isoformat()},
            {'created_at': (datetime.now() - timedelta(days=2)).isoformat()},
            {'created_at': (datetime.now() - timedelta(days=1)).isoformat()},
        ]
        
        current_streak, best_streak, multiplier = StreakCalculator.calculate_streak(sessions)
        
        assert current_streak == 3
        assert best_streak == 3
        assert multiplier == 1.3  # 1.0 + (3 * 0.1)
    
    def test_xp_validator(self):
        """Test XP validation"""
        # Valid amounts
        assert XPValidator.validate_xp_amount(10)[0] is True
        assert XPValidator.validate_xp_amount(1000)[0] is True
        
        # Invalid amounts
        assert XPValidator.validate_xp_amount(0)[0] is False
        assert XPValidator.validate_xp_amount(-10)[0] is False
        assert XPValidator.validate_xp_amount(20000)[0] is False
    
    def test_audit_analyzer(self):
        """Test audit analysis"""
        events = [
            {
                'event_type': 'start',
                'created_at': datetime.now().isoformat(),
                'event_payload': {}
            },
            {
                'event_type': 'heartbeat',
                'created_at': (datetime.now() + timedelta(seconds=120)).isoformat(),
                'event_payload': {}
            }
        ]
        
        analysis = AuditAnalyzer.analyze_session_patterns(events)
        
        assert analysis['total_events'] == 2
        assert 'start' in analysis['event_types']
        assert 'heartbeat' in analysis['event_types']
        assert 'pattern_score' in analysis
    
    def test_offline_sync_manager(self):
        """Test offline sync management"""
        events = [
            {
                'session_id': 'session-1',
                'event_type': 'heartbeat',
                'event_payload': {'timestamp': '123'},
                'created_at': datetime.now().isoformat()
            }
        ]
        
        prepared = OfflineSyncManager.prepare_offline_events(events)
        
        assert len(prepared) == 1
        assert 'offline_id' in prepared[0]
        assert prepared[0]['session_id'] == 'session-1'
    
    def test_milestone_checker(self):
        """Test milestone checking"""
        # Test crossing 500 XP milestone
        milestones = MilestoneChecker.check_milestones(520, 480)
        
        assert len(milestones) == 1
        assert milestones[0]['type'] == 'milestone_500'
        assert milestones[0]['threshold'] == 500
    
    def test_level_calculator(self):
        """Test level calculation"""
        # Test level calculation
        level = LevelCalculator.calculate_level(250)
        assert level == 3  # (250 // 100) + 1 = 2 + 1 = 3
        
        # Test level progress
        progress = LevelCalculator.get_level_progress(250)
        
        assert progress['current_level'] == 3
        assert progress['current_level_xp'] == 50
        assert progress['xp_needed_for_next'] == 50
        assert progress['progress_percentage'] == 50.0


class TestIntegration:
    """Integration tests for the complete gamification system"""
    
    @pytest.mark.asyncio
    async def test_complete_xp_flow(self):
        """Test complete XP award flow"""
        # This would be a full integration test with real Supabase
        # For now, we'll skip this as it requires a real database
        pass
    
    @pytest.mark.asyncio 
    async def test_offline_sync_flow(self):
        """Test offline synchronization flow"""
        # Mock offline events
        offline_events = [
            {
                'session_id': 'session-1',
                'event_type': 'start',
                'event_payload': {'timestamp': '123'},
                'created_at': datetime.now().isoformat()
            },
            {
                'session_id': 'session-1', 
                'event_type': 'heartbeat',
                'event_payload': {'timestamp': '124'},
                'created_at': (datetime.now() + timedelta(seconds=60)).isoformat()
            }
        ]
        
        sync_request = OfflineSyncRequest(
            user_id='user-123',
            events=offline_events,
            last_sync=None
        )
        
        # This would require a real XP service to test
        assert sync_request.user_id == 'user-123'
        assert len(sync_request.events) == 2


if __name__ == '__main__':
    # Run tests
    pytest.main([__file__, '-v'])