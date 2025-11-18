"""
Enhanced Audit Analyzer - Sophisticated Suspicious Pattern Detection (Non-blocking)
Module: Soft — Session Audit Strictness Enhancement
"""

import logging
from datetime import datetime, timedelta, date
from typing import Dict, Any, List, Optional, Tuple

logger = logging.getLogger(__name__)


class EnhancedAuditAnalyzer:
    """Enhanced utility class for analyzing session audits with sophisticated pattern detection"""
    
    @staticmethod
    def analyze_session_patterns(events: List[Dict[str, Any]]) -> Dict[str, Any]:
        """
        Enhanced analysis of session events for patterns and anomalies (non-blocking)
        
        Args:
            events: List of session events
            
        Returns:
            Enhanced analysis results dictionary with detailed patterns and risk assessment
        """
        if not events:
            return {
                'total_events': 0,
                'anomalies': ['No events recorded'],
                'pattern_score': 0,
                'suspicious_patterns': [],
                'risk_assessment': 'critical',
                'pattern_details': {},
                'recommendations': [],
                'forgiveness_factors': {}
            }
        
        analysis = {
            'total_events': len(events),
            'event_types': {},
            'time_gaps': [],
            'anomalies': [],
            'suspicious_patterns': [],
            'pattern_score': 100,  # Start with perfect score
            'risk_assessment': 'low',
            'pattern_details': {},
            'recommendations': [],
            'forgiveness_factors': {}
        }
        
        # Analyze event types distribution
        for event in events:
            event_type = event['event_type']
            analysis['event_types'][event_type] = analysis['event_types'].get(event_type, 0) + 1
        
        # Enhanced time gap analysis
        prev_time = None
        large_gaps = 0
        heartbeat_variance = []
        
        for i, event in enumerate(events):
            current_time = datetime.fromisoformat(event['created_at'].replace('Z', '+00:00'))
            
            if prev_time:
                gap = (current_time - prev_time).total_seconds()
                analysis['time_gaps'].append(gap)
                heartbeat_variance.append(gap)
                
                # Enhanced suspicious gap detection (non-blocking)
                if gap > 600 and event['event_type'] != 'end':  # 10 minutes
                    large_gaps += 1
                    analysis['anomalies'].append(f'Large gap: {gap:.0f} seconds without activity')
                    analysis['suspicious_patterns'].append({
                        'type': 'large_time_gap',
                        'severity': 'medium',
                        'details': f'Gap of {gap:.0f} seconds at position {i+1}',
                        'impact': 15,
                        'forgiveness_eligible': True
                    })
                    analysis['pattern_score'] -= 15
                
                # Very large gaps (suspicious but non-blocking)
                if gap > 1800:  # 30 minutes
                    analysis['suspicious_patterns'].append({
                        'type': 'extended_inactivity',
                        'severity': 'high',
                        'details': f'Extended inactivity of {gap/60:.1f} minutes',
                        'impact': 25,
                        'forgiveness_eligible': True,
                        'suggested_review': True
                    })
                    analysis['pattern_score'] -= 25
            
            prev_time = current_time
        
        # Detailed pattern analysis
        analysis['pattern_details'] = EnhancedAuditAnalyzer._analyze_patterns(events, analysis)
        
        # Essential events analysis (with forgiveness factors)
        event_types = set(event['event_type'] for event in events)
        
        missing_events = []
        if 'start' not in event_types:
            missing_events.append('start')
            analysis['anomalies'].append('Missing start event')
            analysis['suspicious_patterns'].append({
                'type': 'missing_start',
                'severity': 'high',
                'details': 'No session start event recorded',
                'impact': 30,
                'forgiveness_eligible': True,
                'potential_causes': ['App crash', 'Network issues', 'User forgetfulness']
            })
            analysis['pattern_score'] -= 30
        
        if 'end' not in event_types:
            missing_events.append('end')
            analysis['anomalies'].append('Missing end event')
            analysis['suspicious_patterns'].append({
                'type': 'missing_end',
                'severity': 'medium',
                'details': 'No session end event recorded',
                'impact': 25,
                'forgiveness_eligible': True,
                'potential_causes': ['App closure', 'Battery drain', 'Connection loss']
            })
            analysis['pattern_score'] -= 25
        
        # Heartbeat regularity analysis
        if heartbeat_variance:
            mean_gap = sum(heartbeat_variance) / len(heartbeat_variance)
            variance = sum((gap - mean_gap) ** 2 for gap in heartbeat_variance) / len(heartbeat_variance)
            std_dev = variance ** 0.5
            
            # Check for highly irregular heartbeat
            if std_dev > mean_gap * 0.5:  # High variance
                analysis['suspicious_patterns'].append({
                    'type': 'irregular_heartbeat',
                    'severity': 'medium',
                    'details': f'Irregular heartbeat (σ={std_dev:.1f}s, μ={mean_gap:.1f}s)',
                    'impact': 20,
                    'forgiveness_eligible': True,
                    'technical_notes': f'Coefficient of variation: {(std_dev/mean_gap):.2f}'
                })
                analysis['pattern_score'] -= 20
        
        # Duration analysis with context
        if len(events) >= 2:
            session_start = datetime.fromisoformat(events[0]['created_at'].replace('Z', '+00:00'))
            session_end = datetime.fromisoformat(events[-1]['created_at'].replace('Z', '+00:00'))
            total_duration = (session_end - session_start).total_seconds() / 60  # minutes
            
            if total_duration < 5:  # Less than 5 minutes
                analysis['suspicious_patterns'].append({
                    'type': 'very_short_duration',
                    'severity': 'low',
                    'details': f'Very short session ({total_duration:.1f} minutes)',
                    'impact': 10,
                    'forgiveness_eligible': True,
                    'context': 'Quick study session or interruption'
                })
                analysis['pattern_score'] -= 10
            elif total_duration > 480:  # More than 8 hours
                analysis['suspicious_patterns'].append({
                    'type': 'extended_duration',
                    'severity': 'medium',
                    'details': f'Very long session ({total_duration/60:.1f} hours)',
                    'impact': 15,
                    'forgiveness_eligible': True,
                    'context': 'Possible overnight study or background activity'
                })
                analysis['pattern_score'] -= 15
        
        # Determine risk assessment with nuance
        high_severity_patterns = [p for p in analysis['suspicious_patterns'] if p['severity'] == 'high']
        medium_severity_patterns = [p for p in analysis['suspicious_patterns'] if p['severity'] == 'medium']
        
        if len(high_severity_patterns) >= 2:
            analysis['risk_assessment'] = 'critical'
        elif high_severity_patterns:
            analysis['risk_assessment'] = 'high'
        elif medium_severity_patterns:
            analysis['risk_assessment'] = 'medium'
        elif analysis['suspicious_patterns']:
            analysis['risk_assessment'] = 'low'
        else:
            analysis['risk_assessment'] = 'minimal'
        
        # Generate recommendations (non-punitive)
        analysis['recommendations'] = EnhancedAuditAnalyzer._generate_non_punitive_recommendations(
            analysis['suspicious_patterns'], 
            analysis['risk_assessment']
        )
        
        # Calculate forgiveness factors
        analysis['forgiveness_factors'] = EnhancedAuditAnalyzer._calculate_forgiveness_factors(
            analysis, 
            missing_events
        )
        
        # Ensure score doesn't go below 0
        analysis['pattern_score'] = max(analysis['pattern_score'], 0)
        
        return analysis
    
    @staticmethod
    def _analyze_patterns(events: List[Dict[str, Any]], analysis: Dict[str, Any]) -> Dict[str, Any]:
        """Analyze detailed session patterns"""
        pattern_details = {
            'event_sequence': [],
            'timing_patterns': {},
            'behavior_signature': {},
            'consistency_score': 100,
            'session_quality_metrics': {}
        }
        
        # Analyze event sequence
        for i, event in enumerate(events):
            pattern_details['event_sequence'].append({
                'position': i + 1,
                'event_type': event['event_type'],
                'timestamp': event['created_at'],
                'payload_size': len(str(event.get('event_payload', {}))),
                'time_since_start': (datetime.fromisoformat(event['created_at'].replace('Z', '+00:00')) - 
                                   datetime.fromisoformat(events[0]['created_at'].replace('Z', '+00:00'))).total_seconds()
            })
        
        # Analyze timing patterns
        if analysis['time_gaps']:
            gaps = analysis['time_gaps']
            pattern_details['timing_patterns'] = {
                'mean_interval': sum(gaps) / len(gaps),
                'median_interval': sorted(gaps)[len(gaps) // 2],
                'min_interval': min(gaps),
                'max_interval': max(gaps),
                'interval_variance': sum((gap - sum(gaps) / len(gaps)) ** 2 for gap in gaps) / len(gaps),
                'regular_intervals': len([g for g in gaps if 60 <= g <= 300]),  # 1-5 minutes
                'irregular_intervals': len([g for g in gaps if g < 60 or g > 600])
            }
        
        # Calculate session quality metrics
        total_duration = 0
        if len(events) >= 2:
            start_time = datetime.fromisoformat(events[0]['created_at'].replace('Z', '+00:00'))
            end_time = datetime.fromisoformat(events[-1]['created_at'].replace('Z', '+00:00'))
            total_duration = (end_time - start_time).total_seconds()
        
        pattern_details['session_quality_metrics'] = {
            'total_duration_minutes': total_duration / 60,
            'event_density': len(events) / max(total_duration / 60, 1),  # events per minute
            'completeness_score': len(analysis['event_types']) / max(len(set(e['event_type'] for e in events)), 1),
            'consistency_score': analysis['pattern_score']
        }
        
        return pattern_details
    
    @staticmethod
    def _generate_non_punitive_recommendations(patterns: List[Dict], risk_level: str) -> List[str]:
        """Generate helpful, non-punitive recommendations"""
        recommendations = []
        
        if not patterns:
            recommendations.append("Session appears to follow normal patterns. Great job maintaining consistent study habits!")
            return recommendations
        
        pattern_types = [p['type'] for p in patterns]
        
        if 'large_time_gap' in pattern_types:
            recommendations.append("Consider minimizing long pauses between study activities for better focus")
            recommendations.append("If interruptions occur, try to resume quickly to maintain study momentum")
        
        if 'missing_start' in pattern_types or 'missing_end' in pattern_types:
            recommendations.append("Try to ensure the app stays open throughout your study session")
            recommendations.append("Check your device's battery and network settings to prevent interruptions")
        
        if 'irregular_heartbeat' in pattern_types:
            recommendations.append("Your study patterns show some variability - this is normal and flexible")
            recommendations.append("Consider setting regular check-in reminders if helpful")
        
        if 'very_short_duration' in pattern_types:
            recommendations.append("Even short study sessions contribute to your learning goals")
            recommendations.append("Every study session, regardless of length, helps build your streak")
        
        if 'extended_duration' in pattern_types:
            recommendations.append("Impressive dedication with your extended study session!")
            recommendations.append("Remember to take breaks to maintain focus and avoid burnout")
        
        if risk_level in ['medium', 'high']:
            recommendations.append("Your study pattern shows some irregularities, but this is common and understandable")
            recommendations.append("Focus on consistency over perfection - every session contributes to your progress")
        
        return recommendations
    
    @staticmethod
    def _calculate_forgiveness_factors(analysis: Dict[str, Any], missing_events: List[str]) -> Dict[str, Any]:
        """Calculate factors that warrant audit forgiveness"""
        forgiveness = {
            'technical_issues': 0,
            'user_experience_factors': 0,
            'contextual_understanding': 0,
            'total_forgiveness_potential': 0
        }
        
        # Technical issue forgiveness
        if 'missing_start' in [p['type'] for p in analysis['suspicious_patterns']]:
            forgiveness['technical_issues'] += 0.15
        if 'missing_end' in [p['type'] for p in analysis['suspicious_patterns']]:
            forgiveness['technical_issues'] += 0.10
        if 'large_time_gap' in [p['type'] for p in analysis['suspicious_patterns']]:
            forgiveness['technical_issues'] += 0.05
        
        # User experience factors
        if 'very_short_duration' in [p['type'] for p in analysis['suspicious_patterns']]:
            forgiveness['user_experience_factors'] += 0.10
        if 'irregular_heartbeat' in [p['type'] for p in analysis['suspicious_patterns']]:
            forgiveness['user_experience_factors'] += 0.08
        
        # Contextual understanding
        if analysis['total_events'] < 5:
            forgiveness['contextual_understanding'] += 0.20  # New user allowance
        
        # Cap and calculate total
        forgiveness['technical_issues'] = min(forgiveness['technical_issues'], 0.25)
        forgiveness['user_experience_factors'] = min(forgiveness['user_experience_factors'], 0.20)
        forgiveness['contextual_understanding'] = min(forgiveness['contextual_understanding'], 0.20)
        
        forgiveness['total_forgiveness_potential'] = min(
            forgiveness['technical_issues'] + forgiveness['user_experience_factors'] + forgiveness['contextual_understanding'],
            0.50
        )
        
        return forgiveness
    
    @staticmethod
    def calculate_suspicion_score(analysis: Dict[str, Any]) -> int:
        """
        Calculate suspicion score based on enhanced analysis
        
        Args:
            analysis: Enhanced session analysis results
            
        Returns:
            Suspicion score (0-100) with forgiveness applied
        """
        base_score = 100 - analysis['pattern_score']
        
        # Additional scoring based on pattern severity
        severity_weights = {'low': 3, 'medium': 7, 'high': 12}
        for pattern in analysis['suspicious_patterns']:
            base_score += severity_weights.get(pattern['severity'], 5)
        
        # Apply forgiveness factors
        forgiveness = analysis.get('forgiveness_factors', {}).get('total_forgiveness_potential', 0)
        adjusted_score = int(base_score * (1 - forgiveness))
        
        # Cap at 100
        return min(max(adjusted_score, 0), 100)


# Demo utility functions for testing
def demo_enhanced_pattern_detection():
    """Demonstrate enhanced pattern detection capabilities"""
    print("🔍 Enhanced Soft Audit Pattern Detection Demo")
    print("=" * 50)
    
    # Test case 1: Normal session
    normal_events = [
        {'event_type': 'start', 'created_at': '2025-11-18T14:00:00Z', 'event_payload': {}},
        {'event_type': 'heartbeat', 'created_at': '2025-11-18T14:02:00Z', 'event_payload': {}},
        {'event_type': 'heartbeat', 'created_at': '2025-11-18T14:04:00Z', 'event_payload': {}},
        {'event_type': 'end', 'created_at': '2025-11-18T14:30:00Z', 'event_payload': {}},
    ]
    
    analysis1 = EnhancedAuditAnalyzer.analyze_session_patterns(normal_events)
    print(f"\n📋 Normal Session Analysis:")
    print(f"   Risk Level: {analysis1['risk_assessment']}")
    print(f"   Patterns Found: {len(analysis1['suspicious_patterns'])}")
    print(f"   Recommendations: {len(analysis1['recommendations'])}")
    
    # Test case 2: Problematic session
    problematic_events = [
        {'event_type': 'heartbeat', 'created_at': '2025-11-18T14:00:00Z', 'event_payload': {}},
        {'event_type': 'heartbeat', 'created_at': '2025-11-18T14:25:00Z', 'event_payload': {}},  # Large gap
        {'event_type': 'heartbeat', 'created_at': '2025-11-18T14:26:00Z', 'event_payload': {}},
        {'event_type': 'heartbeat', 'created_at': '2025-11-18T14:28:00Z', 'event_payload': {}},
    ]
    
    analysis2 = EnhancedAuditAnalyzer.analyze_session_patterns(problematic_events)
    print(f"\n⚠️ Problematic Session Analysis:")
    print(f"   Risk Level: {analysis2['risk_assessment']}")
    print(f"   Patterns Found: {len(analysis2['suspicious_patterns'])}")
    print(f"   Forgiveness Potential: {analysis2['forgiveness_factors']['total_forgiveness_potential']:.1%}")
    print(f"   Recommendations: {analysis2['recommendations']}")
    
    # Test case 3: Suspicion score calculation
    suspicion_score = EnhancedAuditAnalyzer.calculate_suspicion_score(analysis2)
    print(f"\n🧮 Calculated Suspicion Score: {suspicion_score}/100")


if __name__ == "__main__":
    demo_enhanced_pattern_detection()