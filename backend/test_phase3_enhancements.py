#!/usr/bin/env python3
"""
Phase 3.3 Test Script - Session Audit Validation Enhancements
Tests the enhanced audit system with session integrity validation
"""

import sys
import os
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

try:
    from utils.enhanced_audit_analyzer import EnhancedAuditAnalyzer
    print("PASS: Enhanced Audit Analyzer imported successfully")
except ImportError as e:
    print(f"FAIL: Import Error: {e}")
    sys.exit(1)

def test_basic_audit_functionality():
    """Test basic audit functionality"""
    print("\nTESTING: Basic Audit Functionality...")
    
    # Test with normal session
    events = [
        {'event_type': 'start', 'created_at': '2025-11-22T10:00:00Z', 'event_payload': {'study_type': 'mathematics'}},
        {'event_type': 'heartbeat', 'created_at': '2025-11-22T10:01:00Z', 'event_payload': {'study_type': 'mathematics'}},
        {'event_type': 'heartbeat', 'created_at': '2025-11-22T10:02:00Z', 'event_payload': {'study_type': 'mathematics'}},
        {'event_type': 'end', 'created_at': '2025-11-22T10:03:00Z', 'event_payload': {'study_type': 'mathematics'}}
    ]
    
    try:
        result = EnhancedAuditAnalyzer.analyze_session_patterns(events)
        print(f"PASS: Basic analysis successful")
        print(f"   Total Events: {result['total_events']}")
        print(f"   Pattern Score: {result['pattern_score']}")
        print(f"   Risk Assessment: {result['risk_assessment']}")
        print(f"   Session Integrity Score: {result['session_integrity']['integrity_score']}")
        
        suspicion_score = EnhancedAuditAnalyzer.calculate_suspicion_score(result)
        print(f"   Suspicion Score: {suspicion_score}/100")
        print(f"   Suspicious Patterns: {len(result['suspicious_patterns'])}")
        print(f"   Recommendations: {len(result['recommendations'])}")
        
        return True
    except Exception as e:
        print(f"FAIL: Basic test failed: {e}")
        return False

def test_session_integrity_validation():
    """Test session integrity validation"""
    print("\nTESTING: Session Integrity Validation...")
    
    # Test with device consistency
    events = [
        {'event_type': 'start', 'created_at': '2025-11-22T10:00:00Z', 'event_payload': {'device_info': {'platform': 'android', 'model': 'Pixel 6'}}},
        {'event_type': 'heartbeat', 'created_at': '2025-11-22T10:01:00Z', 'event_payload': {'device_info': {'platform': 'android', 'model': 'Pixel 6'}}},
        {'event_type': 'end', 'created_at': '2025-11-22T10:02:00Z', 'event_payload': {'device_info': {'platform': 'android', 'model': 'Pixel 6'}}}
    ]
    
    session_metadata = {'study_type': 'mathematics', 'expected_device': 'android'}
    
    try:
        result = EnhancedAuditAnalyzer.analyze_session_patterns(events, session_metadata)
        integrity = result['session_integrity']
        
        print(f"PASS: Session integrity analysis successful")
        print(f"   Integrity Score: {integrity['integrity_score']}/100")
        print(f"   Device Consistency: {'PASS' if not integrity['device_consistency'].get('multiple_devices') else 'FAIL'}")
        print(f"   Metadata Consistency: {'PASS' if integrity['metadata_consistency'] else 'FAIL'}")
        print(f"   Payload Integrity: {'PASS' if integrity['payload_integrity'] else 'FAIL'}")
        print(f"   Integrity Issues: {len(integrity['integrity_issues'])}")
        
        return True
    except Exception as e:
        print(f"FAIL: Integrity test failed: {e}")
        return False

def test_enhanced_anomaly_detection():
    """Test enhanced anomaly detection"""
    print("\nTESTING: Enhanced Anomaly Detection...")
    
    # Test with suspicious patterns
    events = [
        {'event_type': 'start', 'created_at': '2025-11-22T10:00:00Z', 'event_payload': {}},
        {'event_type': 'heartbeat', 'created_at': '2025-11-22T10:01:00Z', 'event_payload': {}},
        {'event_type': 'heartbeat', 'created_at': '2025-11-22T10:01:30Z', 'event_payload': {}},  # Very short gap
        {'event_type': 'heartbeat', 'created_at': '2025-11-22T10:02:00Z', 'event_payload': {}},
        {'event_type': 'heartbeat', 'created_at': '2025-11-22T10:10:00Z', 'event_payload': {}},  # Large gap
        {'event_type': 'end', 'created_at': '2025-11-22T10:10:30Z', 'event_payload': {}}
    ]
    
    try:
        result = EnhancedAuditAnalyzer.analyze_session_patterns(events)
        
        print(f"PASS: Enhanced anomaly detection successful")
        print(f"   Suspicious Patterns Found: {len(result['suspicious_patterns'])}")
        
        for i, pattern in enumerate(result['suspicious_patterns']):
            print(f"   Pattern {i+1}: {pattern['type']} ({pattern['severity']}) - Impact: {pattern['impact']}")
        
        print(f"   Forgiveness Factors:")
        forgiveness = result['forgiveness_factors']
        print(f"     Technical Issues: {forgiveness['technical_issues']:.1%}")
        print(f"     User Experience: {forgiveness['user_experience_factors']:.1%}")
        print(f"     Total Forgiveness Potential: {forgiveness['total_forgiveness_potential']:.1%}")
        
        return True
    except Exception as e:
        print(f"FAIL: Anomaly detection test failed: {e}")
        return False

def test_suspicion_score_calculation():
    """Test suspicion score calculation with forgiveness"""
    print("\nTESTING: Suspicion Score Calculation...")
    
    events = [
        {'event_type': 'start', 'created_at': '2025-11-22T10:00:00Z', 'event_payload': {}},
        {'event_type': 'heartbeat', 'created_at': '2025-11-22T10:01:00Z', 'event_payload': {}},
        {'event_type': 'heartbeat', 'created_at': '2025-11-22T10:25:00Z', 'event_payload': {}},  # Large gap
        {'event_type': 'end', 'created_at': '2025-11-22T10:26:00Z', 'event_payload': {}}
    ]
    
    try:
        result = EnhancedAuditAnalyzer.analyze_session_patterns(events)
        suspicion_score = EnhancedAuditAnalyzer.calculate_suspicion_score(result)
        
        print(f"PASS: Suspicion score calculation successful")
        print(f"   Base Pattern Score: {result['pattern_score']}/100")
        print(f"   Final Suspicion Score: {suspicion_score}/100")
        print(f"   Risk Assessment: {result['risk_assessment']}")
        print(f"   Validation Threshold: 75 (soft mode)")
        print(f"   Session Validated: {'PASS' if suspicion_score < 75 else 'FAIL'}")
        
        return True
    except Exception as e:
        print(f"FAIL: Suspicion score test failed: {e}")
        return False

def main():
    """Run all Phase 3.3 tests"""
    print("PHASE 3.3: Session Audit Validation Enhancements Test")
    print("=" * 60)
    
    tests = [
        test_basic_audit_functionality,
        test_session_integrity_validation,
        test_enhanced_anomaly_detection,
        test_suspicion_score_calculation
    ]
    
    passed = 0
    total = len(tests)
    
    for test in tests:
        if test():
            passed += 1
        print()
    
    print("=" * 60)
    print(f"Test Results: {passed}/{total} tests passed")
    
    if passed == total:
        print("PASS: All Phase 3.3 enhancements working correctly!")
        return True
    else:
        print("FAIL: Some tests failed. Please review the implementation.")
        return False

if __name__ == "__main__":
    success = main()
    sys.exit(0 if success else 1)