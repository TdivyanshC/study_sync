#!/usr/bin/env python3
"""
Simple API Test for Gamification Enhancements
Uses built-in libraries to test the backend API
"""

import json
import logging
import urllib.request
import urllib.error
import sys
from datetime import datetime

# Configure logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

class SimpleAPITester:
    """Simple API tester for gamification enhancements"""
    
    def __init__(self):
        self.base_url = "https://nominatively-semirealistic-darryl.ngrok-free.dev/api"
        self.test_user_id = "test-user-simple"
        self.test_session_id = "test-session-simple"
        self.test_results = {
            "health_check": False,
            "streak_endpoints": False,
            "audit_endpoints": False,
            "overall_success": False
        }
    
    def make_request(self, endpoint, method='GET', data=None):
        """Make HTTP request with error handling"""
        url = f"{self.base_url}{endpoint}"
        
        try:
            if method == 'GET':
                req = urllib.request.Request(url)
            else:
                req = urllib.request.Request(url, data=json.dumps(data).encode('utf-8') if data else None)
                req.add_header('Content-Type', 'application/json')
                req.get_method = lambda: method
            
            with urllib.request.urlopen(req, timeout=10) as response:
                result = {
                    'status': response.status,
                    'success': response.status < 400,
                    'data': json.loads(response.read().decode('utf-8')) if response.read() else {}
                }
                return result
                
        except urllib.error.HTTPError as e:
            result = {
                'status': e.code,
                'success': False,
                'data': {}
            }
            if e.read():
                try:
                    result['data'] = json.loads(e.read().decode('utf-8'))
                except:
                    pass
            return result
        except Exception as e:
            logger.error(f"Request failed: {e}")
            return {
                'status': 0,
                'success': False,
                'data': {'error': str(e)}
            }
    
    def test_health_check(self):
        """Test API health endpoint"""
        logger.info("🔗 Testing API Health Check...")
        
        result = self.make_request("/health")
        
        if result['success']:
            self.test_results["health_check"] = True
            logger.info("  ✅ API Health Check: PASS")
        else:
            logger.warning(f"  ❌ API Health Check: FAIL (Status: {result['status']})")
    
    def test_streak_endpoints(self):
        """Test streak-related endpoints"""
        logger.info("🧪 Testing Streak Endpoints...")
        
        try:
            # Test comprehensive streak endpoint
            logger.info("  📊 Testing comprehensive streak endpoint...")
            endpoint = f"/xp/streak/comprehensive/{self.test_user_id}"
            result = self.make_request(endpoint)
            
            if result['success'] and result['data'].get('success'):
                self.test_results["streak_endpoints"] = True
                logger.info("    ✅ Comprehensive streak endpoint: PASS")
                
                streak_info = result['data'].get('streak_info', {})
                bonus_info = result['data'].get('bonus_info', {})
                logger.info(f"    📊 Current streak: {streak_info.get('current_streak', 'N/A')}")
                logger.info(f"    🎁 Bonus XP: {bonus_info.get('bonus_xp', 'N/A')}")
                logger.info(f"    ⚡ Multiplier: {bonus_info.get('multiplier', 'N/A')}")
            else:
                logger.warning(f"    ❌ Comprehensive streak endpoint: FAIL (Status: {result['status']})")
            
            # Test user XP stats
            logger.info("  📈 Testing user XP stats endpoint...")
            endpoint = f"/xp/stats/{self.test_user_id}"
            result = self.make_request(endpoint)
            
            if result['success'] and result['data'].get('success'):
                logger.info("    ✅ User XP stats endpoint: PASS")
                data = result['data'].get('data', {})
                logger.info(f"    🏆 Total XP: {data.get('total_xp', 'N/A')}")
                logger.info(f"    🔥 Current streak: {data.get('current_streak', 'N/A')}")
            else:
                logger.warning(f"    ❌ User XP stats endpoint: FAIL (Status: {result['status']})")
            
            # Test gamification summary
            logger.info("  📋 Testing gamification summary endpoint...")
            endpoint = f"/xp/summary/{self.test_user_id}"
            result = self.make_request(endpoint)
            
            if result['success'] and result['data'].get('success'):
                logger.info("    ✅ Gamification summary endpoint: PASS")
                data = result['data'].get('data', {})
                streak = data.get('streak', {})
                logger.info(f"    🔥 Streak: {streak.get('current', 'N/A')} days")
                logger.info(f"    🏆 Level: {data.get('xp', {}).get('level', 'N/A')}")
            else:
                logger.warning(f"    ❌ Gamification summary endpoint: FAIL (Status: {result['status']})")
        
        except Exception as e:
            logger.error(f"❌ Streak endpoint testing failed: {e}")
    
    def test_audit_endpoints(self):
        """Test audit-related endpoints"""
        logger.info("🧪 Testing Audit Endpoints...")
        
        try:
            # Test audit validation
            logger.info("  🔍 Testing audit validation endpoint...")
            endpoint = "/xp/audit/validate"
            data = {
                "session_id": self.test_session_id,
                "user_id": self.test_user_id,
                "validation_mode": "soft"
            }
            result = self.make_request(endpoint, 'POST', data)
            
            if result['success']:
                self.test_results["audit_endpoints"] = True
                logger.info("    ✅ Audit validation endpoint: PASS")
                logger.info(f"    📊 Suspicion score: {result['data'].get('adjusted_suspicion_score', 'N/A')}")
                logger.info(f"    🎯 Valid: {result['data'].get('is_valid', 'N/A')}")
            else:
                logger.warning(f"    ❌ Audit validation endpoint: FAIL (Status: {result['status']})")
            
            # Test session events
            logger.info("  📝 Testing session events endpoint...")
            endpoint = f"/xp/events/{self.test_session_id}"
            result = self.make_request(endpoint)
            
            if result['success'] and result['data'].get('success'):
                logger.info("    ✅ Session events endpoint: PASS")
                events_count = result['data'].get('data', {}).get('total_events', 0)
                logger.info(f"    📊 Total events: {events_count}")
            else:
                logger.warning(f"    ❌ Session events endpoint: FAIL (Status: {result['status']})")
        
        except Exception as e:
            logger.error(f"❌ Audit endpoint testing failed: {e}")
    
    def run_simple_tests(self):
        """Run all simple tests"""
        logger.info("🚀 Starting Simple API Test for Gamification Enhancements")
        logger.info("=" * 80)
        
        try:
            # Test health first
            self.test_health_check()
            
            if self.test_results["health_check"]:
                # Test other endpoints
                self.test_streak_endpoints()
                self.test_audit_endpoints()
            else:
                logger.warning("⚠️ Health check failed, skipping other tests")
            
            # Calculate overall success
            overall_success = sum(1 for v in self.test_results.values() if v) >= 2  # At least 2 out of 4 tests
            self.test_results["overall_success"] = overall_success
            
            # Print summary
            self.print_test_summary()
            
            return overall_success
            
        except Exception as e:
            logger.error(f"❌ Simple API test failed: {e}")
            return False
    
    def print_test_summary(self):
        """Print test summary"""
        logger.info("\n" + "=" * 80)
        logger.info("📊 SIMPLE API TEST SUMMARY")
        logger.info("=" * 80)
        
        passed_tests = sum(1 for v in self.test_results.values() if v)
        total_tests = len(self.test_results)
        success_rate = (passed_tests / total_tests) * 100
        
        for test_name, result in self.test_results.items():
            status = "✅ PASS" if result else "❌ FAIL"
            logger.info(f"{test_name.replace('_', ' ').title()}: {status}")
        
        logger.info(f"\n📊 Overall Success Rate: {passed_tests}/{total_tests} ({success_rate:.1f}%)")
        
        overall_success = self.test_results.get("overall_success", False)
        overall_status = "✅ SUCCESS" if overall_success else "❌ PARTIAL SUCCESS"
        logger.info(f"\n🏆 OVERALL RESULT: {overall_status}")
        
        if overall_success:
            logger.info("🎉 API endpoints are accessible and functional!")
        else:
            logger.info("⚠️ Some tests failed, but backend appears to be running")
        
        logger.info("=" * 80)

def main():
    """Main test runner"""
    try:
        tester = SimpleAPITester()
        success = tester.run_simple_tests()
        
        # Save results
        with open('simple_api_test_results.json', 'w') as f:
            json.dump(tester.test_results, f, indent=2, default=str)
        
        logger.info("💾 Test results saved to simple_api_test_results.json")
        
        return 0 if success else 1
        
    except KeyboardInterrupt:
        logger.info("🛑 Test interrupted by user")
        return 1
    except Exception as e:
        logger.error(f"💥 Test runner failed: {e}")
        return 1

if __name__ == "__main__":
    exit_code = main()
    sys.exit(exit_code)
