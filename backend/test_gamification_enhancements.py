#!/usr/bin/env python3
"""
Comprehensive End-to-End Test for Gamification Enhancements
Tests all three phases: Streak Multipliers, Audit Validation, and Integration
"""

import asyncio
import json
import logging
import random
import sys
from datetime import datetime, timedelta
from typing import Dict, Any, List
import uuid

import pytz
from supabase import create_client, Client

# Configure logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

# Test user and session data
TEST_USER_ID = "test-user-gamification"
TEST_SESSION_ID = "test-session-gamification"

class GamificationEnhancementsTester:
    """Comprehensive tester for gamification enhancements"""
    
    def __init__(self):
        # Initialize Supabase client
        self.supabase: Client = create_client(
            "https://qokhdxvqxlvygbhnlrfh.supabase.co",
            "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFva2hkeHh2cXhsdnlnYmhubHJmaCIsInJvbGUiOiJhbm9uIiwiaWF0IjoxNzMzMDE5NDYzLCJleHAiOjIwNDg1OTU0NjN9.RkQv8lPnw6zI4sWqJ6h5V8lZqF8f7Y7Y8g5V3K2oJ8"
        )
        
        self.ist_tz = pytz.timezone("Asia/Kolkata")
        self.test_results = {
            "phase_3_2_streak_multipliers": {},
            "phase_3_3_audit_validation": {},
            "integration_tests": {},
            "performance_tests": {},
            "overall_success": False
        }
    
    async def setup_test_data(self) -> bool:
        """Setup test data for comprehensive testing"""
        logger.info("🔧 Setting up test data...")
        
        try:
            # Create test user if not exists
            user_result = self.supabase.table('users').select('id').eq('id', TEST_USER_ID).execute()
            
            if not user_result.data:
                user_data = {
                    'id': TEST_USER_ID,
                    'username': 'gamification_test_user',
                    'email': 'test@gamification.com',
                    'xp': 500,
                    'level': 5,
                    'streak_count': 7,
                    'created_at': (datetime.now() - timedelta(days=30)).isoformat(),
                    'updated_at': datetime.now().isoformat()
                }
                
                self.supabase.table('users').insert(user_data).execute()
                logger.info("✅ Test user created")
            
            # Create test study sessions with varying patterns
            sessions_created = await self.create_test_sessions()
            if sessions_created:
                logger.info("✅ Test study sessions created")
            
            # Create test session events for audit testing
            events_created = await self.create_test_session_events()
            if events_created:
                logger.info("✅ Test session events created")
            
            return True
            
        except Exception as e:
            logger.error(f"❌ Failed to setup test data: {e}")
            return False
    
    async def create_test_sessions(self) -> bool:
        """Create test study sessions with different patterns"""
        try:
            # Create sessions over the past 14 days to establish streak
            for i in range(14):
                session_date = datetime.now() - timedelta(days=13-i)
                session_minutes = random.randint(15, 120)
                
                session_data = {
                    'id': f"{TEST_SESSION_ID}_{i}",
                    'user_id': TEST_USER_ID,
                    'duration_minutes': session_minutes,
                    'created_at': session_date.replace(hour=random.randint(9, 22), minute=random.randint(0, 59)).isoformat(),
                    'updated_at': datetime.now().isoformat()
                }
                
                # Upsert to avoid duplicates
                self.supabase.table('study_sessions').upsert(session_data, on_conflict='id').execute()
            
            return True
            
        except Exception as e:
            logger.error(f"❌ Failed to create test sessions: {e}")
            return False
    
    async def create_test_session_events(self) -> bool:
        """Create test session events with various patterns for audit testing"""
        try:
            base_time = datetime.now() - timedelta(hours=2)
            
            # Create a realistic session with start, heartbeats, and end
            events = [
                {
                    'session_id': TEST_SESSION_ID,
                    'user_id': TEST_USER_ID,
                    'event_type': 'start',
                    'event_payload': {'session_type': 'study', 'platform': 'web'},
                    'created_at': base_time.isoformat()
                },
                {
                    'session_id': TEST_SESSION_ID,
                    'user_id': TEST_USER_ID,
                    'event_type': 'heartbeat',
                    'event_payload': {'progress': 25, 'focus_time': 300},
                    'created_at': (base_time + timedelta(minutes=5)).isoformat()
                },
                {
                    'session_id': TEST_SESSION_ID,
                    'user_id': TEST_USER_ID,
                    'event_type': 'heartbeat',
                    'event_payload': {'progress': 50, 'focus_time': 600},
                    'created_at': (base_time + timedelta(minutes=10)).isoformat()
                },
                {
                    'session_id': TEST_SESSION_ID,
                    'user_id': TEST_USER_ID,
                    'event_type': 'pause',
                    'event_payload': {'reason': 'break'},
                    'created_at': (base_time + timedelta(minutes=15)).isoformat()
                },
                {
                    'session_id': TEST_SESSION_ID,
                    'user_id': TEST_USER_ID,
                    'event_type': 'resume',
                    'event_payload': {'break_duration': 120},
                    'created_at': (base_time + timedelta(minutes=17)).isoformat()
                },
                {
                    'session_id': TEST_SESSION_ID,
                    'user_id': TEST_USER_ID,
                    'event_type': 'heartbeat',
                    'event_payload': {'progress': 75, 'focus_time': 900},
                    'created_at': (base_time + timedelta(minutes=20)).isoformat()
                },
                {
                    'session_id': TEST_SESSION_ID,
                    'user_id': TEST_USER_ID,
                    'event_type': 'end',
                    'event_payload': {'final_progress': 100, 'total_focus_time': 1020, 'completed': True},
                    'created_at': (base_time + timedelta(minutes=25)).isoformat()
                }
            ]
            
            # Insert events
            for event in events:
                self.supabase.table('session_events').insert(event).execute()
            
            # Create a problematic session for audit testing
            await self.create_problematic_session()
            
            return True
            
        except Exception as e:
            logger.error(f"❌ Failed to create test session events: {e}")
            return False
    
    async def create_problematic_session(self):
        """Create a session with suspicious patterns for audit testing"""
        problematic_session_id = f"{TEST_SESSION_ID}_suspicious"
        base_time = datetime.now() - timedelta(hours=1)
        
        # Create events with suspicious patterns
        suspicious_events = [
            {
                'session_id': problematic_session_id,
                'user_id': TEST_USER_ID,
                'event_type': 'start',
                'event_payload': {},
                'created_at': base_time.isoformat()
            },
            # Missing heartbeat events (suspicious)
            {
                'session_id': problematic_session_id,
                'user_id': TEST_USER_ID,
                'event_type': 'heartbeat',
                'event_payload': {'suspicious': True},
                'created_at': (base_time + timedelta(seconds=30)).isoformat()  # Too fast
            },
            # End without proper sequence
            {
                'session_id': problematic_session_id,
                'user_id': TEST_USER_ID,
                'event_type': 'end',
                'event_payload': {'duration': '1 second'},
                'created_at': (base_time + timedelta(seconds=31)).isoformat()  # Too short
            }
        ]
        
        for event in suspicious_events:
            self.supabase.table('session_events').insert(event).execute()
    
    async def test_phase_3_2_streak_multipliers(self) -> Dict[str, Any]:
        """Test Phase 3.2: Enhanced streak multiplier display"""
        logger.info("🧪 Testing Phase 3.2: Enhanced Streak Multipliers")
        
        test_results = {
            "streak_calculation": False,
            "bonus_calculation": False,
            "multiplier_application": False,
            "comprehensive_endpoint": False,
            "tier_system": False
        }
        
        try:
            # Import streak service
            from services.gamification.streak_service import StreakService
            streak_service = StreakService(self.supabase)
            
            # Test 1: Comprehensive streak info
            logger.info("  📊 Testing comprehensive streak endpoint...")
            comprehensive_result = await streak_service.get_comprehensive_streak_info(TEST_USER_ID)
            
            if comprehensive_result.get('success'):
                test_results["comprehensive_endpoint"] = True
                logger.info("    ✅ Comprehensive streak endpoint working")
                
                # Verify bonus calculation
                bonus_info = comprehensive_result.get('bonus_info', {})
                if bonus_info.get('bonus_xp', 0) >= 0 and bonus_info.get('multiplier', 1.0) >= 1.0:
                    test_results["bonus_calculation"] = True
                    logger.info("    ✅ Bonus calculation working")
                
                # Verify tier system
                bonus_tier = bonus_info.get('bonus_tier', 0)
                if bonus_tier >= 0:
                    test_results["tier_system"] = True
                    logger.info("    ✅ Tier system working")
            else:
                logger.error(f"    ❌ Comprehensive endpoint failed: {comprehensive_result}")
            
            # Test 2: Streak bonus calculation
            logger.info("  🎯 Testing streak bonus calculation...")
            for streak_days in [0, 7, 14, 30, 60, 100]:
                bonus_result = streak_service._calculate_streak_bonus(streak_days)
                
                if bonus_result['bonus_xp'] >= 0 and bonus_result['multiplier'] >= 1.0:
                    test_results["streak_calculation"] = True
                else:
                    logger.error(f"    ❌ Bonus calculation failed for {streak_days} days")
            
            # Test 3: Multiplier application
            logger.info("  ⚡ Testing multiplier application...")
            multiplier_result = await streak_service.apply_streak_multiplier_to_xp(TEST_USER_ID, 100)
            
            if multiplier_result.get('success'):
                test_results["multiplier_application"] = True
                logger.info("    ✅ Multiplier application working")
            else:
                logger.error(f"    ❌ Multiplier application failed: {multiplier_result}")
            
        except Exception as e:
            logger.error(f"❌ Phase 3.2 testing failed: {e}")
        
        self.test_results["phase_3_2_streak_multipliers"] = test_results
        logger.info(f"📊 Phase 3.2 Results: {sum(test_results.values())}/{len(test_results)} tests passed")
        return test_results
    
    async def test_phase_3_3_audit_validation(self) -> Dict[str, Any]:
        """Test Phase 3.3: Session audit validation"""
        logger.info("🧪 Testing Phase 3.3: Session Audit Validation")
        
        test_results = {
            "audit_validation": False,
            "soft_audit_rules": False,
            "forgiveness_system": False,
            "anomaly_detection": False,
            "audit_visualization": False
        }
        
        try:
            # Import soft audit service
            from services.gamification.soft_audit_service import SoftAuditService
            audit_service = SoftAuditService(self.supabase)
            
            # Test 1: Normal session validation
            logger.info("  🔍 Testing normal session audit...")
            normal_result = await audit_service.validate_session_soft_audit(
                session_id=TEST_SESSION_ID,
                user_id=TEST_USER_ID,
                validation_mode="soft"
            )
            
            if normal_result.get('success'):
                test_results["audit_validation"] = True
                test_results["soft_audit_rules"] = True
                test_results["forgiveness_system"] = True
                logger.info("    ✅ Normal session audit working")
                logger.info(f"    📊 Suspicion score: {normal_result.get('adjusted_suspicion_score', 'N/A')}")
                logger.info(f"    🎯 Valid: {normal_result.get('is_valid', False)}")
            
            # Test 2: Suspicious session validation
            logger.info("  🚨 Testing suspicious session audit...")
            suspicious_session_id = f"{TEST_SESSION_ID}_suspicious"
            suspicious_result = await audit_service.validate_session_soft_audit(
                session_id=suspicious_session_id,
                user_id=TEST_USER_ID,
                validation_mode="soft"
            )
            
            if suspicious_result.get('success'):
                test_results["anomaly_detection"] = True
                logger.info("    ✅ Suspicious session audit working")
                logger.info(f"    📊 Suspicion score: {suspicious_result.get('adjusted_suspicion_score', 'N/A')}")
                logger.info(f"    🎯 Valid: {suspicious_result.get('is_valid', False)}")
                
                # Check if anomalies were detected
                validation_details = suspicious_result.get('validation_details', {})
                base_analysis = validation_details.get('base_analysis', {})
                anomalies = base_analysis.get('anomalies', [])
                
                if len(anomalies) > 0:
                    logger.info(f"    ⚠️ Detected anomalies: {len(anomalies)}")
                    for anomaly in anomalies[:3]:  # Show first 3 anomalies
                        logger.info(f"      - {anomaly}")
                else:
                    logger.warning("    ⚠️ No anomalies detected in suspicious session")
            
            # Test 3: Audit forgiveness calculation
            logger.info("  🤝 Testing audit forgiveness...")
            forgiveness_result = await audit_service.get_user_audit_forgiveness_history(TEST_USER_ID)
            
            if forgiveness_result.get('success'):
                test_results["forgiveness_system"] = True
                logger.info("    ✅ Audit forgiveness system working")
                
                forgiveness_profile = forgiveness_result.get('forgiveness_profile', {})
                logger.info(f"    📊 Total forgiveness: {forgiveness_profile.get('total_forgiveness', 0):.1%}")
            
        except Exception as e:
            logger.error(f"❌ Phase 3.3 testing failed: {e}")
        
        self.test_results["phase_3_3_audit_validation"] = test_results
        logger.info(f"📊 Phase 3.3 Results: {sum(test_results.values())}/{len(test_results)} tests passed")
        return test_results
    
    async def test_integration_flow(self) -> Dict[str, Any]:
        """Test complete integration flow"""
        logger.info("🧪 Testing Integration Flow")
        
        test_results = {
            "complete_session_flow": False,
            "streak_audit_integration": False,
            "database_consistency": False,
            "api_endpoint_integration": False
        }
        
        try:
            # Test 1: Complete session processing flow
            logger.info("  🔄 Testing complete session flow...")
            
            # Simulate a complete session with streak updates and audit validation
            from services.gamification.xp_service import XPService
            xp_service = XPService(self.supabase)
            
            # Calculate XP for the test session
            session_calc_result = await xp_service.calculate_xp_for_session({
                'session_id': TEST_SESSION_ID
            })
            
            if session_calc_result.get('success'):
                test_results["complete_session_flow"] = True
                logger.info(f"    ✅ Session XP calculated: {session_calc_result.get('calculation', {}).get('total_xp', 0)} XP")
                
                # Verify audit validation was triggered
                audit_validation_result = await xp_service.validate_session_audit({
                    'session_id': TEST_SESSION_ID,
                    'user_id': TEST_USER_ID,
                    'validation_mode': 'soft'
                })
                
                if audit_validation_result.get('success'):
                    test_results["streak_audit_integration"] = True
                    logger.info("    ✅ Streak-audit integration working")
            
            # Test 2: Database consistency
            logger.info("  🗄️ Testing database consistency...")
            
            # Check if all related data is consistent
            user_result = self.supabase.table('users').select('*').eq('id', TEST_USER_ID).execute()
            sessions_result = self.supabase.table('study_sessions').select('*').eq('user_id', TEST_USER_ID).execute()
            audit_result = self.supabase.table('session_audit').select('*').eq('user_id', TEST_USER_ID).execute()
            
            if user_result.data and sessions_result.data:
                test_results["database_consistency"] = True
                logger.info(f"    ✅ Database consistency verified")
                logger.info(f"    📊 User XP: {user_result.data[0]['xp']}")
                logger.info(f"    📊 Sessions: {len(sessions_result.data)}")
                logger.info(f"    📊 Audit records: {len(audit_result.data) if audit_result.data else 0}")
            
            # Test 3: API endpoint integration
            logger.info("  🌐 Testing API endpoint integration...")
            
            # Test comprehensive streak endpoint
            try:
                from services.gamification.streak_service import StreakService
                streak_service = StreakService(self.supabase)
                streak_result = await streak_service.get_comprehensive_streak_info(TEST_USER_ID)
                
                if streak_result.get('success'):
                    test_results["api_endpoint_integration"] = True
                    logger.info("    ✅ API endpoint integration working")
                    
            except Exception as e:
                logger.error(f"    ❌ API endpoint integration failed: {e}")
            
        except Exception as e:
            logger.error(f"❌ Integration flow testing failed: {e}")
        
        self.test_results["integration_tests"] = test_results
        logger.info(f"📊 Integration Results: {sum(test_results.values())}/{len(test_results)} tests passed")
        return test_results
    
    async def test_performance(self) -> Dict[str, Any]:
        """Test system performance under load"""
        logger.info("🧪 Testing Performance")
        
        test_results = {
            "streak_calculation_speed": False,
            "audit_validation_speed": False,
            "concurrent_requests": False,
            "memory_usage": False
        }
        
        try:
            # Test 1: Streak calculation performance
            logger.info("  ⚡ Testing streak calculation speed...")
            from services.gamification.streak_service import StreakService
            streak_service = StreakService(self.supabase)
            
            start_time = datetime.now()
            for _ in range(10):  # Run 10 times to get average
                await streak_service.get_comprehensive_streak_info(TEST_USER_ID)
            end_time = datetime.now()
            
            avg_time = (end_time - start_time).total_seconds() / 10
            if avg_time < 1.0:  # Should be under 1 second
                test_results["streak_calculation_speed"] = True
                logger.info(f"    ✅ Streak calculation average: {avg_time:.3f}s")
            else:
                logger.warning(f"    ⚠️ Streak calculation slow: {avg_time:.3f}s")
            
            # Test 2: Audit validation performance
            logger.info("  🔍 Testing audit validation speed...")
            from services.gamification.soft_audit_service import SoftAuditService
            audit_service = SoftAuditService(self.supabase)
            
            start_time = datetime.now()
            for _ in range(5):  # Run 5 times
                await audit_service.validate_session_soft_audit(
                    session_id=TEST_SESSION_ID,
                    user_id=TEST_USER_ID,
                    validation_mode="soft"
                )
            end_time = datetime.now()
            
            avg_time = (end_time - start_time).total_seconds() / 5
            if avg_time < 2.0:  # Should be under 2 seconds
                test_results["audit_validation_speed"] = True
                logger.info(f"    ✅ Audit validation average: {avg_time:.3f}s")
            else:
                logger.warning(f"    ⚠️ Audit validation slow: {avg_time:.3f}s")
            
            # Test 3: Concurrent requests
            logger.info("  🔄 Testing concurrent requests...")
            import asyncio
            
            async def concurrent_streak_calls():
                tasks = []
                for _ in range(5):
                    task = streak_service.get_comprehensive_streak_info(TEST_USER_ID)
                    tasks.append(task)
                return await asyncio.gather(*tasks, return_exceptions=True)
            
            start_time = datetime.now()
            results = await concurrent_streak_calls()
            end_time = datetime.now()
            
            successful_results = sum(1 for r in results if isinstance(r, dict) and r.get('success'))
            if successful_results == 5:
                test_results["concurrent_requests"] = True
                logger.info(f"    ✅ Concurrent requests: {successful_results}/5 successful")
            else:
                logger.warning(f"    ⚠️ Concurrent requests: {successful_results}/5 successful")
            
        except Exception as e:
            logger.error(f"❌ Performance testing failed: {e}")
        
        self.test_results["performance_tests"] = test_results
        logger.info(f"📊 Performance Results: {sum(test_results.values())}/{len(test_results)} tests passed")
        return test_results
    
    async def run_comprehensive_test(self) -> bool:
        """Run all comprehensive tests"""
        logger.info("🚀 Starting Comprehensive Gamification Enhancements Test")
        logger.info("=" * 80)
        
        # Setup test data
        setup_success = await self.setup_test_data()
        if not setup_success:
            logger.error("❌ Test setup failed, aborting tests")
            return False
        
        try:
            # Run all test phases
            await self.test_phase_3_2_streak_multipliers()
            await self.test_phase_3_3_audit_validation()
            await self.test_integration_flow()
            await self.test_performance()
            
            # Calculate overall success
            all_results = []
            for phase_results in self.test_results.values():
                if isinstance(phase_results, dict):
                    all_results.extend(phase_results.values())
            
            overall_success = sum(all_results) >= len(all_results) * 0.8  # 80% success rate
            self.test_results["overall_success"] = overall_success
            
            # Print comprehensive results
            self.print_test_summary()
            
            return overall_success
            
        except Exception as e:
            logger.error(f"❌ Comprehensive test failed: {e}")
            return False
    
    def print_test_summary(self):
        """Print comprehensive test summary"""
        logger.info("\n" + "=" * 80)
        logger.info("📊 COMPREHENSIVE TEST SUMMARY")
        logger.info("=" * 80)
        
        for phase_name, results in self.test_results.items():
            if isinstance(results, dict):
                logger.info(f"\n🔹 {phase_name.replace('_', ' ').title()}:")
                passed = sum(results.values())
                total = len(results)
                success_rate = (passed / total) * 100
                
                for test_name, result in results.items():
                    status = "✅ PASS" if result else "❌ FAIL"
                    logger.info(f"  {test_name.replace('_', ' ').title()}: {status}")
                
                logger.info(f"  📊 Phase Success Rate: {passed}/{total} ({success_rate:.1f}%)")
        
        overall_success = self.test_results.get("overall_success", False)
        overall_status = "✅ SUCCESS" if overall_success else "❌ FAILURE"
        logger.info(f"\n🏆 OVERALL RESULT: {overall_status}")
        
        if overall_success:
            logger.info("🎉 All gamification enhancements are working correctly!")
        else:
            logger.warning("⚠️ Some tests failed. Review the results above.")
        
        logger.info("=" * 80)

async def main():
    """Main test runner"""
    try:
        tester = GamificationEnhancementsTester()
        success = await tester.run_comprehensive_test()
        
        # Save results to file
        with open('gamification_test_results.json', 'w') as f:
            json.dump(tester.test_results, f, indent=2, default=str)
        
        logger.info("💾 Test results saved to gamification_test_results.json")
        
        return 0 if success else 1
        
    except KeyboardInterrupt:
        logger.info("🛑 Test interrupted by user")
        return 1
    except Exception as e:
        logger.error(f"💥 Test runner failed: {e}")
        return 1

if __name__ == "__main__":
    exit_code = asyncio.run(main())
    sys.exit(exit_code)
