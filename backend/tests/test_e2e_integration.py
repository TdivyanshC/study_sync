"""
End-to-End Integration Tests for StudySync Application

This module contains comprehensive E2E tests covering critical user flows:
- User registration and authentication
- Study session lifecycle
- Gamification features (XP, badges, streaks)
- Space collaboration
- Real-time features
"""

import pytest
import asyncio
import uuid
from datetime import datetime, timedelta
from typing import Dict, Any
import requests
import time

# Test configuration
BASE_URL = "http://localhost:8000"
API_BASE = f"{BASE_URL}/api"


class TestUserFlows:
    """Test complete user workflows"""
    
    @pytest.fixture
    def test_user_data(self):
        """Generate unique test user data"""
        unique_id = str(uuid.uuid4())[:8]
        return {
            "username": f"testuser_{unique_id}",
            "email": f"test_{unique_id}@example.com",
            "password": "SecurePass123"
        }
    
    def test_user_registration_flow(self, test_user_data):
        """Test complete user registration flow"""
        # Step 1: Register new user
        response = requests.post(
            f"{API_BASE}/auth/register",
            json=test_user_data,
            timeout=10
        )
        
        assert response.status_code in [200, 201], f"Registration failed: {response.text}"
        data = response.json()
        assert data.get("success") is True
        assert "user_id" in data.get("data", {})
        
        user_id = data["data"]["user_id"]
        
        # Step 2: Verify user profile was created
        profile_response = requests.get(
            f"{API_BASE}/users/{user_id}",
            timeout=10
        )
        
        assert profile_response.status_code == 200
        profile_data = profile_response.json()
        assert profile_data["data"]["username"] == test_user_data["username"]
        assert profile_data["data"]["xp"] == 0  # New user starts with 0 XP
        assert profile_data["data"]["level"] == 1  # New user starts at level 1
        
        return user_id
    
    def test_authentication_flow(self, test_user_data):
        """Test user authentication flow"""
        # First register the user
        register_response = requests.post(
            f"{API_BASE}/auth/register",
            json=test_user_data,
            timeout=10
        )
        assert register_response.status_code in [200, 201]
        
        # Then attempt login
        login_response = requests.post(
            f"{API_BASE}/auth/login",
            json={
                "email": test_user_data["email"],
                "password": test_user_data["password"]
            },
            timeout=10
        )
        
        assert login_response.status_code == 200
        login_data = login_response.json()
        assert "token" in login_data.get("data", {})
        assert "user_id" in login_data.get("data", {})


class TestStudySessionFlows:
    """Test study session workflows"""
    
    @pytest.fixture
    def authenticated_user(self):
        """Create and authenticate a test user"""
        unique_id = str(uuid.uuid4())[:8]
        user_data = {
            "username": f"sessionuser_{unique_id}",
            "email": f"session_{unique_id}@example.com",
            "password": "SecurePass123"
        }
        
        response = requests.post(
            f"{API_BASE}/auth/register",
            json=user_data,
            timeout=10
        )
        
        data = response.json()
        return {
            "user_id": data["data"]["user_id"],
            "username": user_data["username"]
        }
    
    def test_complete_study_session_flow(self, authenticated_user):
        """Test complete study session lifecycle"""
        user_id = authenticated_user["user_id"]
        
        # Step 1: Start a study session
        session_start = {
            "user_id": user_id,
            "duration_minutes": 25,
            "subject": "Mathematics"
        }
        
        start_response = requests.post(
            f"{API_BASE}/sessions/start",
            json=session_start,
            timeout=10
        )
        
        assert start_response.status_code in [200, 201]
        session_data = start_response.json()
        assert session_data.get("success") is True
        session_id = session_data["data"]["session_id"]
        
        # Step 2: Send heartbeat events
        heartbeat_response = requests.post(
            f"{API_BASE}/sessions/{session_id}/heartbeat",
            json={"timestamp": datetime.now().isoformat()},
            timeout=10
        )
        
        assert heartbeat_response.status_code == 200
        
        # Step 3: Complete the session
        complete_response = requests.post(
            f"{API_BASE}/sessions/{session_id}/complete",
            json={
                "efficiency": 85.0,
                "completed_at": datetime.now().isoformat()
            },
            timeout=10
        )
        
        assert complete_response.status_code == 200
        complete_data = complete_response.json()
        
        # Step 4: Verify XP was awarded
        assert "xp_awarded" in complete_data.get("data", {})
        xp_awarded = complete_data["data"]["xp_awarded"]
        assert xp_awarded > 0
        
        # Step 5: Verify user XP was updated
        user_response = requests.get(
            f"{API_BASE}/users/{user_id}",
            timeout=10
        )
        
        user_data = user_response.json()
        assert user_data["data"]["xp"] >= xp_awarded
        
        return session_id
    
    def test_session_with_audit_events(self, authenticated_user):
        """Test session with comprehensive audit trail"""
        user_id = authenticated_user["user_id"]
        
        # Start session
        session_response = requests.post(
            f"{API_BASE}/sessions/start",
            json={
                "user_id": user_id,
                "duration_minutes": 30
            },
            timeout=10
        )
        
        session_id = session_response.json()["data"]["session_id"]
        
        # Send multiple audit events
        events = [
            {"event_type": "focus_start", "timestamp": datetime.now().isoformat()},
            {"event_type": "heartbeat", "timestamp": (datetime.now() + timedelta(seconds=60)).isoformat()},
            {"event_type": "focus_end", "timestamp": (datetime.now() + timedelta(seconds=120)).isoformat()}
        ]
        
        for event in events:
            audit_response = requests.post(
                f"{API_BASE}/sessions/{session_id}/audit",
                json=event,
                timeout=10
            )
            assert audit_response.status_code == 200
        
        # Complete session
        complete_response = requests.post(
            f"{API_BASE}/sessions/{session_id}/complete",
            json={"efficiency": 90.0},
            timeout=10
        )
        
        assert complete_response.status_code == 200
        
        # Verify audit trail
        audit_response = requests.get(
            f"{API_BASE}/sessions/{session_id}/audit",
            timeout=10
        )
        
        assert audit_response.status_code == 200
        audit_data = audit_response.json()
        assert len(audit_data["data"]) >= len(events)


class TestGamificationFlows:
    """Test gamification feature workflows"""
    
    @pytest.fixture
    def user_with_sessions(self):
        """Create user and complete multiple sessions"""
        unique_id = str(uuid.uuid4())[:8]
        user_data = {
            "username": f"gamuser_{unique_id}",
            "email": f"gam_{unique_id}@example.com",
            "password": "SecurePass123"
        }
        
        response = requests.post(
            f"{API_BASE}/auth/register",
            json=user_data,
            timeout=10
        )
        
        user_id = response.json()["data"]["user_id"]
        
        # Complete 3 sessions
        session_ids = []
        for i in range(3):
            session_response = requests.post(
                f"{API_BASE}/sessions/start",
                json={
                    "user_id": user_id,
                    "duration_minutes": 25
                },
                timeout=10
            )
            
            session_id = session_response.json()["data"]["session_id"]
            session_ids.append(session_id)
            
            # Complete session
            requests.post(
                f"{API_BASE}/sessions/{session_id}/complete",
                json={"efficiency": 85.0},
                timeout=10
            )
            
            time.sleep(0.5)  # Small delay between sessions
        
        return {"user_id": user_id, "session_ids": session_ids}
    
    def test_xp_accumulation_flow(self, user_with_sessions):
        """Test XP accumulation across multiple sessions"""
        user_id = user_with_sessions["user_id"]
        
        # Get user profile
        response = requests.get(
            f"{API_BASE}/users/{user_id}",
            timeout=10
        )
        
        user_data = response.json()["data"]
        
        # Verify XP was accumulated
        assert user_data["xp"] > 0
        
        # Get XP history
        xp_history_response = requests.get(
            f"{API_BASE}/gamification/xp/history/{user_id}",
            timeout=10
        )
        
        assert xp_history_response.status_code == 200
        xp_history = xp_history_response.json()["data"]
        assert len(xp_history) >= 3  # At least 3 XP awards
    
    def test_badge_earning_flow(self, user_with_sessions):
        """Test badge earning workflow"""
        user_id = user_with_sessions["user_id"]
        
        # Get user badges
        badges_response = requests.get(
            f"{API_BASE}/gamification/badges/{user_id}",
            timeout=10
        )
        
        assert badges_response.status_code == 200
        badges_data = badges_response.json()
        
        # User should have earned at least the "First Session" badge
        earned_badges = badges_data.get("data", {}).get("earned_badges", [])
        assert len(earned_badges) > 0
    
    def test_streak_tracking_flow(self, user_with_sessions):
        """Test streak tracking workflow"""
        user_id = user_with_sessions["user_id"]
        
        # Get streak information
        streak_response = requests.get(
            f"{API_BASE}/gamification/streaks/{user_id}",
            timeout=10
        )
        
        assert streak_response.status_code == 200
        streak_data = streak_response.json()["data"]
        
        # Verify streak data
        assert "current_streak" in streak_data
        assert "best_streak" in streak_data
        assert streak_data["current_streak"] >= 1
    
    def test_leaderboard_flow(self, user_with_sessions):
        """Test leaderboard functionality"""
        # Get weekly leaderboard
        leaderboard_response = requests.get(
            f"{API_BASE}/gamification/leaderboard/weekly",
            timeout=10
        )
        
        assert leaderboard_response.status_code == 200
        leaderboard_data = leaderboard_response.json()
        
        # Verify leaderboard structure
        assert "entries" in leaderboard_data.get("data", {})
        entries = leaderboard_data["data"]["entries"]
        
        # Verify user appears in leaderboard
        user_id = user_with_sessions["user_id"]
        user_in_leaderboard = any(
            entry["user_id"] == user_id for entry in entries
        )
        assert user_in_leaderboard


class TestSpaceCollaboration:
    """Test space collaboration features"""
    
    @pytest.fixture
    def space_with_users(self):
        """Create a space with multiple users"""
        # Create space owner
        owner_id = str(uuid.uuid4())[:8]
        owner_data = {
            "username": f"owner_{owner_id}",
            "email": f"owner_{owner_id}@example.com",
            "password": "SecurePass123"
        }
        
        owner_response = requests.post(
            f"{API_BASE}/auth/register",
            json=owner_data,
            timeout=10
        )
        owner_user_id = owner_response.json()["data"]["user_id"]
        
        # Create space
        space_response = requests.post(
            f"{API_BASE}/spaces/create",
            json={
                "name": f"Test Space {owner_id}",
                "created_by": owner_user_id,
                "visibility": "public"
            },
            timeout=10
        )
        
        space_id = space_response.json()["data"]["space_id"]
        
        return {
            "space_id": space_id,
            "owner_id": owner_user_id
        }
    
    def test_space_creation_and_join_flow(self, space_with_users):
        """Test space creation and joining workflow"""
        space_id = space_with_users["space_id"]
        
        # Create a new user
        member_id = str(uuid.uuid4())[:8]
        member_data = {
            "username": f"member_{member_id}",
            "email": f"member_{member_id}@example.com",
            "password": "SecurePass123"
        }
        
        member_response = requests.post(
            f"{API_BASE}/auth/register",
            json=member_data,
            timeout=10
        )
        member_user_id = member_response.json()["data"]["user_id"]
        
        # Join space
        join_response = requests.post(
            f"{API_BASE}/spaces/{space_id}/join",
            json={"user_id": member_user_id},
            timeout=10
        )
        
        assert join_response.status_code == 200
        
        # Verify membership
        members_response = requests.get(
            f"{API_BASE}/spaces/{space_id}/members",
            timeout=10
        )
        
        members = members_response.json()["data"]
        member_ids = [m["user_id"] for m in members]
        assert member_user_id in member_ids


class TestOfflineSync:
    """Test offline synchronization features"""
    
    def test_offline_event_sync_flow(self):
        """Test offline event synchronization"""
        # Create user
        unique_id = str(uuid.uuid4())[:8]
        user_data = {
            "username": f"offline_{unique_id}",
            "email": f"offline_{unique_id}@example.com",
            "password": "SecurePass123"
        }
        
        response = requests.post(
            f"{API_BASE}/auth/register",
            json=user_data,
            timeout=10
        )
        user_id = response.json()["data"]["user_id"]
        
        # Simulate offline events
        offline_events = [
            {
                "session_id": str(uuid.uuid4()),
                "event_type": "start",
                "event_payload": {"timestamp": datetime.now().isoformat()},
                "created_at": datetime.now().isoformat()
            },
            {
                "session_id": str(uuid.uuid4()),
                "event_type": "heartbeat",
                "event_payload": {"timestamp": (datetime.now() + timedelta(seconds=60)).isoformat()},
                "created_at": (datetime.now() + timedelta(seconds=60)).isoformat()
            }
        ]
        
        # Sync offline events
        sync_response = requests.post(
            f"{API_BASE}/sync/offline",
            json={
                "user_id": user_id,
                "events": offline_events
            },
            timeout=10
        )
        
        assert sync_response.status_code == 200
        sync_data = sync_response.json()
        assert sync_data.get("success") is True
        assert "synced_count" in sync_data.get("data", {})


class TestPerformance:
    """Test performance and load handling"""
    
    def test_concurrent_session_creation(self):
        """Test handling of concurrent session creation"""
        # Create multiple users
        users = []
        for i in range(5):
            unique_id = str(uuid.uuid4())[:8]
            user_data = {
                "username": f"perf_{unique_id}",
                "email": f"perf_{unique_id}@example.com",
                "password": "SecurePass123"
            }
            
            response = requests.post(
                f"{API_BASE}/auth/register",
                json=user_data,
                timeout=10
            )
            users.append(response.json()["data"]["user_id"])
        
        # Create sessions concurrently
        import concurrent.futures
        
        def create_session(user_id):
            start_time = time.time()
            response = requests.post(
                f"{API_BASE}/sessions/start",
                json={
                    "user_id": user_id,
                    "duration_minutes": 25
                },
                timeout=10
            )
            end_time = time.time()
            return {
                "success": response.status_code in [200, 201],
                "duration": end_time - start_time
            }
        
        with concurrent.futures.ThreadPoolExecutor(max_workers=5) as executor:
            results = list(executor.map(create_session, users))
        
        # Verify all sessions were created successfully
        assert all(r["success"] for r in results)
        
        # Verify response times are reasonable (< 2 seconds)
        assert all(r["duration"] < 2.0 for r in results)


class TestErrorHandling:
    """Test error handling and resilience"""
    
    def test_invalid_user_id_handling(self):
        """Test handling of invalid user IDs"""
        invalid_user_id = "invalid-uuid"
        
        response = requests.get(
            f"{API_BASE}/users/{invalid_user_id}",
            timeout=10
        )
        
        assert response.status_code == 400
        error_data = response.json()
        assert error_data.get("error") is True
        assert "error_code" in error_data
    
    def test_duplicate_registration_handling(self):
        """Test handling of duplicate user registration"""
        unique_id = str(uuid.uuid4())[:8]
        user_data = {
            "username": f"duplicate_{unique_id}",
            "email": f"duplicate_{unique_id}@example.com",
            "password": "SecurePass123"
        }
        
        # First registration
        response1 = requests.post(
            f"{API_BASE}/auth/register",
            json=user_data,
            timeout=10
        )
        assert response1.status_code in [200, 201]
        
        # Duplicate registration
        response2 = requests.post(
            f"{API_BASE}/auth/register",
            json=user_data,
            timeout=10
        )
        
        assert response2.status_code == 409  # Conflict
        error_data = response2.json()
        assert error_data.get("error") is True
        assert "already exists" in error_data.get("message", "").lower()
    
    def test_missing_required_fields(self):
        """Test handling of missing required fields"""
        incomplete_data = {
            "username": "testuser"
            # Missing email and password
        }
        
        response = requests.post(
            f"{API_BASE}/auth/register",
            json=incomplete_data,
            timeout=10
        )
        
        assert response.status_code == 400
        error_data = response.json()
        assert error_data.get("error") is True
        assert "validation" in error_data.get("error_code", "").lower()


# Pytest configuration
@pytest.fixture(scope="session", autouse=True)
def setup_test_environment():
    """Setup test environment before running tests"""
    print("\n=== Setting up E2E test environment ===")
    
    # Wait for server to be ready
    max_retries = 30
    for i in range(max_retries):
        try:
            response = requests.get(f"{BASE_URL}/health", timeout=2)
            if response.status_code == 200:
                print("✓ Server is ready")
                break
        except requests.RequestException:
            if i < max_retries - 1:
                time.sleep(1)
            else:
                pytest.skip("Server is not available")
    
    yield
    
    print("\n=== E2E tests completed ===")


if __name__ == "__main__":
    # Run tests with verbose output
    pytest.main([__file__, "-v", "-s", "--tb=short"])
