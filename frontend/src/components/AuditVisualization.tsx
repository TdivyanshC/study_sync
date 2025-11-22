import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  Animated,
  Dimensions,
} from 'react-native';

const { width } = Dimensions.get('window');

interface AuditScore {
  value: number;
  label: string;
  color: string;
  icon: string;
}

interface AuditVisualizationProps {
  suspicionScore: number;
  auditDetails: {
    base_analysis: {
      total_events: number;
      anomalies: string[];
      pattern_score: number;
      session_integrity?: {
        integrity_score: number;
        integrity_issues: string[];
        device_consistency: any;
        payload_analysis: any;
        metadata_analysis: any;
      };
    };
    adjusted_suspicion_score: number;
    forgiveness_details: {
      streak_forgiveness: string;
      xp_forgiveness: string;
      good_behavior_bonus: string;
      total_forgiveness: string;
    };
    validation_context: {
      mode: string;
      is_soft_audit: boolean;
      forgiveness_applied: boolean;
    };
    recommendation: string;
  };
  isValid: boolean;
}

const AuditVisualization: React.FC<AuditVisualizationProps> = ({
  suspicionScore,
  auditDetails,
  isValid,
}) => {
  const [animatedScore] = React.useState(new Animated.Value(0));

  React.useEffect(() => {
    // Animate score from 0 to target value
    Animated.timing(animatedScore, {
      toValue: suspicionScore,
      duration: 1500,
      useNativeDriver: false,
    }).start();
  }, [suspicionScore]);

  const animatedScoreText = animatedScore.interpolate({
    inputRange: [0, 100],
    outputRange: ['0', '100'],
    extrapolate: 'clamp',
  });

  const getScoreColor = (score: number) => {
    if (score < 30) return '#2ecc71'; // Green - Good
    if (score < 60) return '#f39c12'; // Orange - Warning
    return '#e74c32'; // Red - High Risk
  };

  const getScoreData = (score: number): AuditScore => {
    if (score < 30) {
      return {
        value: score,
        label: 'Low Risk',
        color: '#2ecc71',
        icon: '✅',
      };
    } else if (score < 60) {
      return {
        value: score,
        label: 'Moderate Risk',
        color: '#f39c12',
        icon: '⚠️',
      };
    } else {
      return {
        value: score,
        label: 'High Risk',
        color: '#e74c32',
        icon: '❌',
      };
    }
  };

  const scoreData = getScoreData(suspicionScore);

  const renderCircularProgress = () => {
    const circumference = 2 * Math.PI * 80; // radius = 80
    const strokeDashoffset = circumference - (suspicionScore / 100) * circumference;

    return (
      <View style={styles.circularProgressContainer}>
        <View style={styles.circularProgress}>
          <Animated.Text style={[styles.scoreText, { color: scoreData.color }]}>
            {animatedScoreText}
          </Animated.Text>
          <Text style={styles.scoreLabel}>Risk Score</Text>
        </View>
        
        {/* Animated circle overlay */}
        <View style={[styles.progressCircle, { borderColor: scoreData.color }]}>
          <View 
            style={[
              styles.progressArc, 
              { 
                borderColor: scoreData.color,
                transform: [{ rotate: `${suspicionScore * 3.6}deg` }],
              }
            ]} 
          />
        </View>
      </View>
    );
  };

  const renderAuditScoringBreakdown = () => {
    const { base_analysis } = auditDetails;
    
    const scoringComponents = [
      {
        label: 'Pattern Score',
        value: base_analysis.pattern_score,
        max: 100,
        color: '#3498db',
        description: 'Overall pattern quality'
      },
      {
        label: 'Event Count',
        value: base_analysis.total_events,
        max: Math.max(base_analysis.total_events, 20),
        color: '#9b59b6',
        description: 'Total session events'
      },
      {
        label: 'Suspicion Score',
        value: 100 - suspicionScore,
        max: 100,
        color: '#e74c3c',
        description: 'Legitimacy score'
      }
    ];

    return (
      <View style={styles.scoringBreakdownContainer}>
        <Text style={styles.scoringBreakdownTitle}>📊 Detailed Scoring Breakdown</Text>
        
        <View style={styles.scoringGrid}>
          {scoringComponents.map((component, index) => (
            <View key={index} style={styles.scoringComponent}>
              <Text style={styles.scoringComponentLabel}>{component.label}</Text>
              
              <View style={styles.scoringBarContainer}>
                <View style={[styles.scoringBar, { width: `${(component.value / component.max) * 100}%`, backgroundColor: component.color }]} />
              </View>
              
              <Text style={[styles.scoringComponentValue, { color: component.color }]}>
                {component.value}/{component.max}
              </Text>
              
              <Text style={styles.scoringComponentDescription}>
                {component.description}
              </Text>
            </View>
          ))}
        </View>
      </View>
    );
  };

  const renderForgivenessDetails = () => {
    const { forgiveness_details } = auditDetails;
    
    return (
      <View style={styles.forgivenessContainer}>
        <Text style={styles.forgivenessTitle}>Audit Forgiveness Applied</Text>
        
        <View style={styles.forgivenessGrid}>
          <View style={styles.forgivenessItem}>
            <Text style={styles.forgivenessLabel}>Streak Bonus</Text>
            <Text style={styles.forgivenessValue}>{forgiveness_details.streak_forgiveness}</Text>
          </View>
          
          <View style={styles.forgivenessItem}>
            <Text style={styles.forgivenessLabel}>XP Bonus</Text>
            <Text style={styles.forgivenessValue}>{forgiveness_details.xp_forgiveness}</Text>
          </View>
          
          <View style={styles.forgivenessItem}>
            <Text style={styles.forgivenessLabel}>Good Behavior</Text>
            <Text style={styles.forgivenessValue}>{forgiveness_details.good_behavior_bonus}</Text>
          </View>
          
          <View style={[styles.forgivenessItem, styles.totalForgivenessItem]}>
            <Text style={styles.forgivenessLabel}>Total Reduction</Text>
            <Text style={[styles.forgivenessValue, { color: '#27ae60' }]}>
              {forgiveness_details.total_forgiveness}
            </Text>
          </View>
        </View>
      </View>
    );
  };

  const renderSessionIntegrity = () => {
    const { session_integrity } = auditDetails.base_analysis;
    
    if (!session_integrity) {
      return null;
    }

    const getIntegrityColor = (score: number) => {
      if (score >= 90) return '#2ecc71'; // Green - Excellent
      if (score >= 70) return '#f39c12'; // Orange - Good
      return '#e74c32'; // Red - Needs attention
    };

    const getIntegrityIcon = (score: number) => {
      if (score >= 90) return '🛡️';
      if (score >= 70) return '⚠️';
      return '🔍';
    };

    return (
      <View style={styles.integrityContainer}>
        <Text style={styles.integrityTitle}>
          {getIntegrityIcon(session_integrity.integrity_score)} Session Integrity
        </Text>
        
        <View style={styles.integrityScoreContainer}>
          <Text style={[styles.integrityScore, { color: getIntegrityColor(session_integrity.integrity_score) }]}>
            {session_integrity.integrity_score}/100
          </Text>
          <Text style={styles.integrityScoreLabel}>Integrity Score</Text>
        </View>

        {session_integrity.integrity_issues && session_integrity.integrity_issues.length > 0 && (
          <View style={styles.integrityIssuesContainer}>
            <Text style={styles.integrityIssuesTitle}>Integrity Issues Detected:</Text>
            {session_integrity.integrity_issues.map((issue, index) => (
              <View key={index} style={styles.integrityIssueItem}>
                <Text style={styles.integrityIssueIcon}>⚠️</Text>
                <Text style={styles.integrityIssueText}>{issue}</Text>
              </View>
            ))}
          </View>
        )}

        <View style={styles.integrityDetails}>
          <View style={styles.integrityDetailItem}>
            <Text style={styles.integrityDetailLabel}>Device Consistency:</Text>
            <Text style={[
              styles.integrityDetailValue,
              { color: session_integrity.device_consistency?.multiple_devices ? '#e74c32' : '#2ecc71' }
            ]}>
              {session_integrity.device_consistency?.multiple_devices ? 'Multiple Devices' : 'Single Device'}
            </Text>
          </View>
          
          <View style={styles.integrityDetailItem}>
            <Text style={styles.integrityDetailLabel}>Payload Integrity:</Text>
            <Text style={[
              styles.integrityDetailValue,
              { color: session_integrity.payload_analysis?.large_payload ? '#f39c12' : '#2ecc71' }
            ]}>
              {session_integrity.payload_analysis?.large_payload ? 'Large Payloads' : 'Normal'}
            </Text>
          </View>
        </View>
      </View>
    );
  };

  const renderAnomalies = () => {
    const { base_analysis } = auditDetails;
    
    if (!base_analysis.anomalies || base_analysis.anomalies.length === 0) {
      return (
        <View style={styles.noAnomaliesContainer}>
          <Text style={styles.noAnomaliesText}>🎉 No anomalies detected!</Text>
          <Text style={styles.cleanSessionText}>Session appears legitimate</Text>
        </View>
      );
    }

    return (
      <View style={styles.anomaliesContainer}>
        <Text style={styles.anomaliesTitle}>Detected Anomalies</Text>
        {base_analysis.anomalies.map((anomaly, index) => (
          <View key={index} style={styles.anomalyItem}>
            <Text style={styles.anomalyIcon}>⚠️</Text>
            <Text style={styles.anomalyText}>{anomaly}</Text>
          </View>
        ))}
      </View>
    );
  };

  return (
    <View style={[styles.container, { borderColor: scoreData.color }]}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerIcon}>{scoreData.icon}</Text>
        <View>
          <Text style={[styles.headerTitle, { color: scoreData.color }]}>
            {isValid ? 'Session Validated' : 'Session Flagged'}
          </Text>
          <Text style={styles.headerSubtitle}>
            {auditDetails.validation_context.mode.toUpperCase()} Mode
          </Text>
        </View>
      </View>

      {/* Score Visualization */}
      <View style={styles.scoreSection}>
        <View style={styles.scoreContainer}>
          {renderCircularProgress()}
          <Text style={[styles.scoreDescription, { color: scoreData.color }]}>
            {scoreData.label}
          </Text>
        </View>

        <View style={styles.scoreDetails}>
          <View style={styles.scoreDetailItem}>
            <Text style={styles.scoreDetailLabel}>Total Events</Text>
            <Text style={styles.scoreDetailValue}>
              {auditDetails.base_analysis.total_events}
            </Text>
          </View>
          
          <View style={styles.scoreDetailItem}>
            <Text style={styles.scoreDetailLabel}>Pattern Score</Text>
            <Text style={styles.scoreDetailValue}>
              {auditDetails.base_analysis.pattern_score}/100
            </Text>
          </View>
        </View>
      </View>

      {/* Scoring Breakdown */}
      {renderAuditScoringBreakdown()}

      {/* Forgiveness Details */}
      {auditDetails.validation_context.forgiveness_applied && renderForgivenessDetails()}

      {/* Session Integrity */}
      {renderSessionIntegrity()}

      {/* Anomalies */}
      {renderAnomalies()}

      {/* Recommendation */}
      <View style={styles.recommendationContainer}>
        <Text style={styles.recommendationTitle}>Recommendation</Text>
        <Text style={styles.recommendationText}>{auditDetails.recommendation}</Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: 'white',
    borderRadius: 16,
    padding: 20,
    margin: 10,
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    borderWidth: 2,
    borderLeftWidth: 8,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
  },
  headerIcon: {
    fontSize: 24,
    marginRight: 12,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#2c3e50',
  },
  headerSubtitle: {
    fontSize: 12,
    color: '#7f8c8d',
    marginTop: 2,
  },
  scoreSection: {
    marginBottom: 20,
  },
  scoreContainer: {
    alignItems: 'center',
    marginBottom: 15,
  },
  circularProgressContainer: {
    position: 'relative',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 10,
  },
  circularProgress: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: '#f8f9fa',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 3,
    borderColor: '#ecf0f1',
  },
  progressCircle: {
    position: 'absolute',
    width: 120,
    height: 120,
    borderRadius: 60,
    borderWidth: 3,
    borderStyle: 'dashed',
  },
  progressArc: {
    position: 'absolute',
    width: 3,
    height: 120,
    backgroundColor: '#3498db',
    borderRadius: 2,
    top: -3,
  },
  scoreText: {
    fontSize: 24,
    fontWeight: 'bold',
  },
  scoreLabel: {
    fontSize: 10,
    color: '#7f8c8d',
    marginTop: 2,
  },
  scoreDescription: {
    fontSize: 14,
    fontWeight: '600',
  },
  scoreDetails: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  scoreDetailItem: {
    alignItems: 'center',
  },
  scoreDetailLabel: {
    fontSize: 12,
    color: '#7f8c8d',
    marginBottom: 4,
  },
  scoreDetailValue: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#2c3e50',
  },
  forgivenessContainer: {
    backgroundColor: '#f8f9fa',
    borderRadius: 8,
    padding: 15,
    marginBottom: 15,
  },
  forgivenessTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#2c3e50',
    marginBottom: 10,
    textAlign: 'center',
  },
  forgivenessGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  forgivenessItem: {
    width: '48%',
    backgroundColor: 'white',
    padding: 8,
    borderRadius: 6,
    marginBottom: 8,
    alignItems: 'center',
  },
  totalForgivenessItem: {
    width: '100%',
    backgroundColor: '#d5f4e6',
    borderWidth: 1,
    borderColor: '#27ae60',
  },
  forgivenessLabel: {
    fontSize: 10,
    color: '#7f8c8d',
    marginBottom: 2,
  },
  forgivenessValue: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#2c3e50',
  },
  anomaliesContainer: {
    marginBottom: 15,
  },
  anomaliesTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#2c3e50',
    marginBottom: 8,
  },
  anomalyItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 6,
    borderBottomWidth: 1,
    borderBottomColor: '#ecf0f1',
  },
  anomalyIcon: {
    fontSize: 12,
    marginRight: 8,
  },
  anomalyText: {
    fontSize: 12,
    color: '#e74c3c',
    flex: 1,
  },
  noAnomaliesContainer: {
    alignItems: 'center',
    padding: 20,
    backgroundColor: '#d5f4e6',
    borderRadius: 8,
    marginBottom: 15,
  },
  noAnomaliesText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#27ae60',
    marginBottom: 4,
  },
  cleanSessionText: {
    fontSize: 12,
    color: '#7f8c8d',
  },
  recommendationContainer: {
    backgroundColor: '#fff3cd',
    borderRadius: 8,
    padding: 12,
    borderWidth: 1,
    borderColor: '#ffc107',
  },
  recommendationTitle: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#856404',
    marginBottom: 4,
  },
  recommendationText: {
    fontSize: 11,
    color: '#856404',
  },
  integrityContainer: {
    backgroundColor: '#f0f8ff',
    borderRadius: 8,
    padding: 15,
    marginBottom: 15,
    borderWidth: 1,
    borderColor: '#3498db',
  },
  integrityTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#2c3e50',
    marginBottom: 10,
    textAlign: 'center',
  },
  integrityScoreContainer: {
    alignItems: 'center',
    marginBottom: 12,
  },
  integrityScore: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  integrityScoreLabel: {
    fontSize: 12,
    color: '#7f8c8d',
  },
  integrityIssuesContainer: {
    marginBottom: 10,
  },
  integrityIssuesTitle: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#e74c3c',
    marginBottom: 6,
  },
  integrityIssueItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  integrityIssueIcon: {
    fontSize: 10,
    marginRight: 6,
  },
  integrityIssueText: {
    fontSize: 10,
    color: '#e74c3c',
    flex: 1,
  },
  integrityDetails: {
    gap: 6,
  },
  integrityDetailItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  integrityDetailLabel: {
    fontSize: 11,
    color: '#7f8c8d',
  },
  integrityDetailValue: {
    fontSize: 11,
    fontWeight: '600',
  },
  scoringBreakdownContainer: {
    backgroundColor: '#fff8e1',
    borderRadius: 8,
    padding: 15,
    marginBottom: 15,
    borderWidth: 1,
    borderColor: '#ffa726',
  },
  scoringBreakdownTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#2c3e50',
    marginBottom: 12,
    textAlign: 'center',
  },
  scoringGrid: {
    gap: 12,
  },
  scoringComponent: {
    backgroundColor: 'white',
    borderRadius: 6,
    padding: 10,
    borderWidth: 1,
    borderColor: '#ecf0f1',
  },
  scoringComponentLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#2c3e50',
    marginBottom: 6,
  },
  scoringBarContainer: {
    height: 6,
    backgroundColor: '#ecf0f1',
    borderRadius: 3,
    overflow: 'hidden',
    marginBottom: 6,
  },
  scoringBar: {
    height: '100%',
    borderRadius: 3,
  },
  scoringComponentValue: {
    fontSize: 14,
    fontWeight: 'bold',
    marginBottom: 2,
  },
  scoringComponentDescription: {
    fontSize: 10,
    color: '#7f8c8d',
  },
});

export default AuditVisualization;