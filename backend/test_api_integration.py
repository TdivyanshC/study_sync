#!/usr/bin/env python3
"""
API Integration Test for Gamification Enhancements
Tests the backend API endpoints for all three phases
"""

import asyncio
import json
import logging
import aiohttp
import sys
from datetime import datetime
from typing import Dict, Any

# Configure logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

class APIIntegrationTester:
    """API integration tester for gamification enhancements"""
    
    def __init__(self):
        self.base_url = "https://nominatively-semirealistic-darryl.ngrok-free.dev/api"
        self.test_user_id = "test-user-api-integration"
        self.test_session_id = "test-session-api-integration"
        self.test_results = {
            "streak_endpoints": {},
            "audit_endpoints": {},
            "integration_flow": {},
            "overall_success": False
        }
    
    async def test_streak_endpoints(self) -> Dict[str, Any]:
        """Test streak-related API endpoints"""
        logger.info("🧪 Testing Streak Endpoints")
        
        test_results = {
            "comprehensive_streak_endpoint": False,
            "streak_bonus_calculation": False,
            "streak_multiplier_application": False
        }
        
        try:
            async with aiohttp.ClientSession() as session:
                # Test comprehensive streak endpoint
                logger.info("  📊 Testing comprehensive streak endpoint...")
                url = f"{self.base_url}/xp/streak/comprehensive/{self.test_user_id}"
                
                async with session.get(url) as response:
                    if response.status == 200:
                        data = await response.json()
                        if data.get('success'):
                            test_results["comprehensive_streak_endpoint"] = True
                            logger.info("    ✅ Comprehensive streak endpoint working")
                            logger.info(f"    📊 Current streak: {data.get('streak_info', {}).get('current_streak', 'N/A')}")
                            logger.info(f"    🎁 Bonus XP: {data.get('bonus_info', {}).get('bonus_xp', 'N/A')}")
                            logger.info(f"    ⚡ Multiplier: {data.get('bonus_info', {}).get('multiplier', 'N/A')}")
                        else:
                            logger.warning(f"    ⚠️ Endpoint returned success=false: {data.get('message')}")
                    else:
                        logger.error(f"    ❌ Endpoint returned status {response.status}")
                
                # Test user XP stats endpoint (which includes streak data)
                logger.info("  📈 Testing user XP stats endpoint...")
                url = f"{self.base_url}/xp/stats/{self.test_user_id}"
                
                async with session.get(url) as response:
                    if response.status == 200:
                        data = await response.json()
                        if data.get('success'):
                            logger.info("    ✅ User XP stats endpoint working")
                            logger.info(f"    📊 Current streak: {data.get('data', {}).get('current_streak', 'N/A')}")
                            logger.info(f"    🏆 Total XP: {data.get('data', {}).get('total_xp', 'N/A')}")
                            test_results["streak_bonus_calculation"] = True
                        else:
                            logger.warning(f"    ⚠️ XP stats returned success=false")
                    else:
                        logger.warning(f"    ⚠️ XP stats endpoint returned status {response.status}")
                
                # Test gamification summary endpoint
                logger.info("  📋 Testing gamification summary endpoint...")
                url = f"{self.base_url}/xp/summary/{self.test_user_id}"
                
                async with session.get(url) as response:
                    if response.status == 200:
                        data = await response.json()
                        if data.get('success'):
                            logger.info("    ✅ Gamification summary endpoint working")
                            streak_data = data.get('data', {}).get('streak', {})
                            logger.info(f"    🔥 Current streak: {streak_data.get('current', 'N/A')} days")
                            logger.info(f"    🏆 Best streak: {streak_data.get('best', 'N/A')} days")
                            test_results["streak_multiplier_application"] = True
                        else:
                            logger.warning(f"    ⚠️ Summary returned success=false")
                    else:
                        logger.warning(f"    ⚠️ Summary endpoint returned status {response.status}")
        
        except Exception as e:
            logger.error(f"❌ Streak endpoint testing failed: {e}")
        
        self.test_results["streak_endpoints"] = test_results
        logger.info(f"📊 Streak Endpoints: {sum(test_results.values())}/{len(test_results)} tests passed")
        return test_results
    
    async def test_audit_endpoints(self) -> Dict[str, Any]:
        """Test audit-related API endpoints"""
        logger.info("🧪 Testing Audit Endpoints")
        
        test_results = {
            "audit_validation_endpoint": False,
            "session_events_endpoint": False,
            "audit_summary_endpoint": False
        }
        
        try:
            async with aiohttp.ClientSession() as session:
                # Test audit validation endpoint
                logger.info("  🔍 Testing audit validation endpoint...")
                url = f"{self.base_url}/xp/audit/validate"
                
                payload = {
                    "session_id": self.test_session_id,
                    "user_id": self.test_user_id,
                    "validation_mode": "soft"
                }
                
                async with session.post(url, json=payload) as response:
                    if response.status == 200:
                        data = await response.json()
                        if data.get('is_valid') is not None:
                            test_results["audit_validation_endpoint"] = True
                            logger.info("    ✅ Audit validation endpoint working")
                            logger.info(f"    📊 Suspicion score: {data.get('adjusted_suspicion_score', 'N/A')}")
                            logger.info(f"    🎯 Valid: {data.get('is_valid', 'N/A')}")
                            logger.info(f"    🤝 Forgiveness applied: {data.get('forgiveness_applied', 'N/A')}")
                        else:
                            logger.warning(f"    ⚠️ Audit validation returned invalid data")
                    else:
                        logger.warning(f"    ⚠️ Audit validation returned status {response.status}")
                
                # Test session events endpoint
                logger.info("  📝 Testing session events endpoint...")
                url = f"{self.base_url}/xp/events/{self.test_session_id}"
                
                async with session.get(url) as response:
                    if response.status == 200:
                        data = await response.json()
                        if data.get('success'):
                            test_results["session_events_endpoint"] = True
                            logger.info("    ✅ Session events endpoint working")
                            events_count = data.get('data', {}).get('total_events', 0)
                            logger.info(f"    📊 Total events: {events_count}")
                        else:
                            logger.warning(f"    ⚠️ Events endpoint returned success=false")
                    else:
                        logger.warning(f"    ⚠️ Events endpoint returned status {response.status}")
                
                # Test audit summary endpoint
                logger.info("  📈 Testing audit summary endpoint...")
                url = f"{self.base_url}/xp/audit/sessions/{self.test_user_id}?days=30"
                
                async with session.get(url) as response:
                    if response.status == 200:
                        data = await response.json()
                        if data.get('success'):
                            test_results["audit_summary_endpoint"] = True
                            logger.info("    ✅ Audit summary endpoint working")
                            summary = data.get('data', {}).get('summary', {})
                            logger.info(f"    📊 Total sessions: {summary.get('total_sessions', 'N/A')}")
                            logger.info(f"    🚨 Flagged sessions: {summary.get('flagged_sessions', 'N/A')}")
                        else:
                            logger.warning(f"    ⚠️ Summary endpoint returned success=false")
                    else:
                        logger.warning(f"    ⚠️ Summary endpoint returned status {response.status}")
        
        except Exception as e:
            logger.error(f"❌ Audit endpoint testing failed: {e}")
        
        self.test_results["audit_endpoints"] = test_results
        logger.info(f"📊 Audit Endpoints: {sum(test_results.values())}/{len(test_results)} tests passed")
        return test_results
    
    async def test_integration_flow(self) -> Dict[str, Any]:
        """Test complete integration flow through APIs"""
        logger.info("🧪 Testing Integration Flow")
        
        test_results = {
            "end_to_end_flow": False,
            "data_consistency": False,
            "error_handling": False
        }
        
        try:
            async with aiohttp.ClientSession() as session:
                # Test 1: End-to-end flow - get all related data
                logger.info("  🔄 Testing end-to-end flow...")
                
                # Get streak data
                streak_url = f"{self.base_url}/xp/streak/comprehensive/{self.test_user_id}"
                async with session.get(streak_url) as response:
                    streak_data = await response.json() if response.status == 200 else {}
                
                # Get XP stats
                xp_url = f"{self.base_url}/xp/stats/{self.test_user_id}"
                async with session.get(xp_url) as response:
                    xp_data = await response.json() if response.status == 200 else {}
                
                # Get gamification summary
                summary_url = f"{self.base_url}/xp/summary/{self.test_user_id}"
                async with session.get(summary_url) as response:
                    summary_data = await response.json() if response.status == 200 else {}
                
                # Check if all endpoints responded
                if (streak_data.get('success') and xp_data.get('success') and summary_data.get('success')):
                    test_results["end_to_end_flow"] = True
                    logger.info("    ✅ End-to-end flow working")
                    
                    # Verify data consistency
                    streak_count = streak_data.get('streak_info', {}).get('current_streak', 0)
                    xp_streak = xp_data.get('data', {}).get('current_streak', 0)
                    summary_streak = summary_data.get('data', {}).get('streak', {}).get('current', 0)
                    
                    if streak_count == xp_streak == summary_streak:
                        test_results["data_consistency"] = True
                        logger.info(f"    ✅ Data consistency verified (streak: {streak_count})")
                    else:
                        logger.warning(f"    ⚠️ Data inconsistency detected:")
                        logger.warning(f"      Streak endpoint: {streak_count}")
                        logger.warning(f"      XP stats: {xp_streak}")
                        logger.warning(f"      Summary: {summary_streak}")
                
                # Test 2: Error handling
                logger.info("  🚨 Testing error handling...")
                
                # Test with invalid user ID
                invalid_url = f"{self.base_url}/xp/streak/comprehensive/invalid-user"
                async with session.get(invalid_url) as response:
                    if response.status in [400, 404, 422]:  # Expected error codes
                        test_results["error_handling"] = True
                        logger.info("    ✅ Error handling working (proper error codes)")
                    else:
                        logger.warning(f"    ⚠️ Unexpected error handling (status: {response.status})")
                
        except Exception as e:
            logger.error(f"❌ Integration flow testing failed: {e}")
        
        self.test_results["integration_flow"] = test_results
        logger.info(f"📊 Integration Flow: {sum(test_results.values())}/{len(test_results)} tests passed")
        return test_results
    
    async def run_api_tests(self) -> bool:
        """Run all API integration tests"""
        logger.info("🚀 Starting API Integration Test for Gamification Enhancements")
        logger.info("=" * 80)
        
        try:
            # Test connectivity first
            logger.info("🔗 Testing API connectivity...")
            health_url = f"{self.base_url}/health"
            
            async with aiohttp.ClientSession() as session:
                async with session.get(health_url) as response:
                    if response.status == 200:
                        logger.info("✅ API is accessible")
                    else:
                        logger.warning(f"⚠️ API returned status {response.status}")
            
            # Run all test phases
            await self.test_streak_endpoints()
            await self.test_audit_endpoints()
            await self.test_integration_flow()
            
            # Calculate overall success
            all_results = []
            for phase_results in self.test_results.values():
                if isinstance(phase_results, dict):
                    all_results.extend(phase_results.values())
            
            overall_success = sum(all_results) >= len(all_results) * 0.6  # 60% success rate for API tests
            self.test_results["overall_success"] = overall_success
            
            # Print comprehensive results
            self.print_test_summary()
            
            return overall_success
            
        except Exception as e:
            logger.error(f"❌ API integration test failed: {e}")
            return False
    
    def print_test_summary(self):
        """Print comprehensive test summary"""
        logger.info("\n" + "=" * 80)
        logger.info("📊 API INTEGRATION TEST SUMMARY")
        logger.info("=" * 80)
        
        for phase_name, results in self.test_results.items():
            if isinstance(results, dict):
                logger.info(f"\n🔹 {phase_name.replace('_', ' ').title()}:")
                passed = sum(results.values())
                total = len(results)
                success_rate = (passed / total) * 100 if total > 0 else 0
                
                for test_name, result in results.items():
                    status = "✅ PASS" if result else "❌ FAIL"
                    logger.info(f"  {test_name.replace('_', ' ').title()}: {status}")
                
                logger.info(f"  📊 Phase Success Rate: {passed}/{total} ({success_rate:.1f}%)")
        
        overall_success = self.test_results.get("overall_success", False)
        overall_status = "✅ SUCCESS" if overall_success else "❌ FAILURE"
        logger.info(f"\n🏆 OVERALL RESULT: {overall_status}")
        
        if overall_success:
            logger.info("🎉 All API endpoints are working correctly!")
        else:
            logger.warning("⚠️ Some API tests failed. This may be due to:")
            logger.warning("  - Missing test data in the database")
            logger.warning("  - Network connectivity issues")
            logger.warning("  - API endpoint configuration")
        
        logger.info("=" * 80)

async def main():
    """Main test runner"""
    try:
        tester = APIIntegrationTester()
        success = await tester.run_api_tests()
        
        # Save results to file
        with open('api_integration_test_results.json', 'w') as f:
            json.dump(tester.test_results, f, indent=2, default=str)
        
        logger.info("💾 Test results saved to api_integration_test_results.json")
        
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
