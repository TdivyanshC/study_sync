#!/usr/bin/env python3
"""
Backend Testing Suite for Study Together App
Tests API endpoints, Socket.IO WebSocket functionality, and MongoDB integration
"""

import asyncio
import aiohttp
import socketio
import json
import sys
from datetime import datetime, timedelta
from typing import Dict, Any, List
import uuid

# Configuration
BASE_URL = "https://studystreak-4.preview.emergentagent.com"
API_BASE_URL = f"{BASE_URL}/api"
SOCKET_URL = BASE_URL

class StudyTogetherTester:
    def __init__(self):
        self.session = None
        self.sio = None
        self.test_results = []
        self.test_user_id = f"test_user_{uuid.uuid4().hex[:8]}"
        self.created_sessions = []
        
    async def setup(self):
        """Initialize HTTP session and Socket.IO client"""
        self.session = aiohttp.ClientSession()
        self.sio = socketio.AsyncClient()
        
        # Setup Socket.IO event handlers for testing
        @self.sio.event
        async def connect():
            print("✓ Socket.IO connected successfully")
            
        @self.sio.event
        async def disconnect():
            print("✓ Socket.IO disconnected")
            
        @self.sio.event
        async def connected(data):
            print(f"✓ Received connected event: {data}")
            
        @self.sio.event
        async def room_joined(data):
            print(f"✓ Joined room: {data}")
            
        @self.sio.event
        async def session_started(data):
            print(f"✓ Received session_started event: {data}")
            
        @self.sio.event
        async def session_ended(data):
            print(f"✓ Received session_ended event: {data}")
            
        @self.sio.event
        async def user_started_session(data):
            print(f"✓ Received user_started_session broadcast: {data}")
            
        @self.sio.event
        async def user_stopped_session(data):
            print(f"✓ Received user_stopped_session broadcast: {data}")
    
    async def cleanup(self):
        """Clean up resources"""
        if self.sio and self.sio.connected:
            await self.sio.disconnect()
        if self.session:
            await self.session.close()
    
    def log_test(self, test_name: str, success: bool, details: str = ""):
        """Log test results"""
        status = "✓ PASS" if success else "✗ FAIL"
        print(f"{status}: {test_name}")
        if details:
            print(f"   Details: {details}")
        
        self.test_results.append({
            "test": test_name,
            "success": success,
            "details": details,
            "timestamp": datetime.utcnow().isoformat()
        })
    
    async def test_api_health_check(self):
        """Test GET /api/ endpoint"""
        try:
            async with self.session.get(f"{API_BASE_URL}/") as response:
                if response.status == 200:
                    data = await response.json()
                    expected_message = "Study Together API"
                    if data.get("message") == expected_message:
                        self.log_test("API Health Check", True, f"Response: {data}")
                        return True
                    else:
                        self.log_test("API Health Check", False, f"Unexpected message: {data}")
                        return False
                else:
                    self.log_test("API Health Check", False, f"Status: {response.status}")
                    return False
        except Exception as e:
            self.log_test("API Health Check", False, f"Exception: {str(e)}")
            return False
    
    async def test_create_study_session(self):
        """Test POST /api/sessions endpoint"""
        try:
            session_data = {
                "user_id": self.test_user_id,
                "subject": "Mathematics"
            }
            
            async with self.session.post(
                f"{API_BASE_URL}/sessions",
                json=session_data,
                headers={"Content-Type": "application/json"}
            ) as response:
                if response.status == 200:
                    data = await response.json()
                    
                    # Validate response structure
                    required_fields = ["id", "user_id", "start_time", "duration", "is_active"]
                    missing_fields = [field for field in required_fields if field not in data]
                    
                    if not missing_fields:
                        self.created_sessions.append(data["id"])
                        self.log_test("Create Study Session", True, 
                                    f"Session created with ID: {data['id']}")
                        return data
                    else:
                        self.log_test("Create Study Session", False, 
                                    f"Missing fields: {missing_fields}")
                        return None
                else:
                    response_text = await response.text()
                    self.log_test("Create Study Session", False, 
                                f"Status: {response.status}, Response: {response_text}")
                    return None
        except Exception as e:
            self.log_test("Create Study Session", False, f"Exception: {str(e)}")
            return None
    
    async def test_update_study_session(self, session_id: str):
        """Test PUT /api/sessions/{session_id} endpoint"""
        try:
            update_data = {
                "duration": 1800,  # 30 minutes
                "is_active": False,
                "end_time": datetime.utcnow().isoformat()
            }
            
            async with self.session.put(
                f"{API_BASE_URL}/sessions/{session_id}",
                json=update_data,
                headers={"Content-Type": "application/json"}
            ) as response:
                if response.status == 200:
                    data = await response.json()
                    
                    # Validate update was applied
                    if (data.get("duration") == 1800 and 
                        data.get("is_active") == False):
                        self.log_test("Update Study Session", True, 
                                    f"Session updated successfully: {data['id']}")
                        return True
                    else:
                        self.log_test("Update Study Session", False, 
                                    f"Update not applied correctly: {data}")
                        return False
                else:
                    response_text = await response.text()
                    self.log_test("Update Study Session", False, 
                                f"Status: {response.status}, Response: {response_text}")
                    return False
        except Exception as e:
            self.log_test("Update Study Session", False, f"Exception: {str(e)}")
            return False
    
    async def test_get_user_sessions(self):
        """Test GET /api/sessions/{user_id} endpoint"""
        try:
            async with self.session.get(f"{API_BASE_URL}/sessions/{self.test_user_id}") as response:
                if response.status == 200:
                    data = await response.json()
                    
                    if isinstance(data, list):
                        session_count = len(data)
                        self.log_test("Get User Sessions", True, 
                                    f"Retrieved {session_count} sessions for user {self.test_user_id}")
                        return data
                    else:
                        self.log_test("Get User Sessions", False, 
                                    f"Expected list, got: {type(data)}")
                        return None
                else:
                    response_text = await response.text()
                    self.log_test("Get User Sessions", False, 
                                f"Status: {response.status}, Response: {response_text}")
                    return None
        except Exception as e:
            self.log_test("Get User Sessions", False, f"Exception: {str(e)}")
            return None
    
    async def test_socket_connection(self):
        """Test Socket.IO connection"""
        try:
            await self.sio.connect(SOCKET_URL)
            
            if self.sio.connected:
                self.log_test("Socket.IO Connection", True, "Connected successfully")
                return True
            else:
                self.log_test("Socket.IO Connection", False, "Failed to connect")
                return False
        except Exception as e:
            self.log_test("Socket.IO Connection", False, f"Exception: {str(e)}")
            return False
    
    async def test_socket_room_joining(self):
        """Test Socket.IO room joining functionality"""
        try:
            if not self.sio.connected:
                self.log_test("Socket.IO Room Joining", False, "Not connected to socket")
                return False
            
            test_room = f"test_room_{uuid.uuid4().hex[:8]}"
            await self.sio.emit('join_room', {'room': test_room})
            
            # Wait a bit for the response
            await asyncio.sleep(1)
            
            self.log_test("Socket.IO Room Joining", True, f"Joined room: {test_room}")
            return True
        except Exception as e:
            self.log_test("Socket.IO Room Joining", False, f"Exception: {str(e)}")
            return False
    
    async def test_socket_session_events(self):
        """Test Socket.IO session broadcasting events"""
        try:
            if not self.sio.connected:
                self.log_test("Socket.IO Session Events", False, "Not connected to socket")
                return False
            
            # Test session_started event
            session_data = {
                'user_id': self.test_user_id,
                'subject': 'Physics',
                'room': 'general'
            }
            await self.sio.emit('session_started', session_data)
            
            # Wait for broadcast
            await asyncio.sleep(1)
            
            # Test session_stopped event
            stop_data = {
                'user_id': self.test_user_id,
                'duration': 2400,
                'room': 'general'
            }
            await self.sio.emit('session_stopped', stop_data)
            
            # Wait for broadcast
            await asyncio.sleep(1)
            
            self.log_test("Socket.IO Session Events", True, "Session events emitted successfully")
            return True
        except Exception as e:
            self.log_test("Socket.IO Session Events", False, f"Exception: {str(e)}")
            return False
    
    async def test_invalid_session_update(self):
        """Test updating non-existent session"""
        try:
            fake_session_id = str(uuid.uuid4())
            update_data = {"duration": 1000}
            
            async with self.session.put(
                f"{API_BASE_URL}/sessions/{fake_session_id}",
                json=update_data,
                headers={"Content-Type": "application/json"}
            ) as response:
                if response.status == 404:
                    self.log_test("Invalid Session Update", True, "Correctly returned 404 for non-existent session")
                    return True
                else:
                    self.log_test("Invalid Session Update", False, 
                                f"Expected 404, got {response.status}")
                    return False
        except Exception as e:
            self.log_test("Invalid Session Update", False, f"Exception: {str(e)}")
            return False
    
    async def run_all_tests(self):
        """Run all backend tests"""
        print("=" * 60)
        print("STUDY TOGETHER BACKEND TESTING SUITE")
        print("=" * 60)
        print(f"Testing against: {BASE_URL}")
        print(f"Test User ID: {self.test_user_id}")
        print("=" * 60)
        
        await self.setup()
        
        # Test API endpoints
        print("\n🔍 TESTING API ENDPOINTS")
        print("-" * 30)
        
        health_ok = await self.test_api_health_check()
        
        if health_ok:
            # Create a session for testing
            session_data = await self.test_create_study_session()
            
            if session_data:
                session_id = session_data["id"]
                
                # Test updating the session
                await self.test_update_study_session(session_id)
                
                # Test retrieving user sessions
                await self.test_get_user_sessions()
            
            # Test error handling
            await self.test_invalid_session_update()
        
        # Test Socket.IO functionality
        print("\n🔌 TESTING SOCKET.IO WEBSOCKET")
        print("-" * 30)
        
        socket_connected = await self.test_socket_connection()
        
        if socket_connected:
            await self.test_socket_room_joining()
            await self.test_socket_session_events()
        
        await self.cleanup()
        
        # Print summary
        print("\n" + "=" * 60)
        print("TEST SUMMARY")
        print("=" * 60)
        
        passed = sum(1 for result in self.test_results if result["success"])
        total = len(self.test_results)
        
        print(f"Tests Passed: {passed}/{total}")
        print(f"Success Rate: {(passed/total)*100:.1f}%")
        
        if passed < total:
            print("\n❌ FAILED TESTS:")
            for result in self.test_results:
                if not result["success"]:
                    print(f"  • {result['test']}: {result['details']}")
        
        print("\n✅ PASSED TESTS:")
        for result in self.test_results:
            if result["success"]:
                print(f"  • {result['test']}")
        
        return passed == total

async def main():
    """Main test runner"""
    tester = StudyTogetherTester()
    success = await tester.run_all_tests()
    
    if success:
        print("\n🎉 ALL TESTS PASSED!")
        sys.exit(0)
    else:
        print("\n💥 SOME TESTS FAILED!")
        sys.exit(1)

if __name__ == "__main__":
    asyncio.run(main())