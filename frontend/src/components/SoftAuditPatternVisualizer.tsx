/**
 * Soft Audit Pattern Visualizer Component
 * Visualizes suspicious patterns and audit results in an intuitive interface
 */

import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { softAuditEventEmitter, AuditPatternEvent } from '../events/softAuditEvents';

interface PatternVisualizerProps {
  userId?: string;
  maxPatterns?: number;
}

interface PatternScore {
  type: string;
  severity: 'low' | 'medium' | 'high';
  impact: number;
  details: string;
  forgivenessEligible: boolean;
  potentialCauses: string[];
}

interface RiskMetrics {
  riskLevel: 'minimal' | 'low' | 'medium' | 'high' | 'critical';
  totalPatterns: number;
  forgivenessPotential: number;
  technicalIssues: number;
  userExperienceFactors: number;
}

// Simple Card component
const Card: React.FC<{ style?: any; children: React.ReactNode }> = ({ style, children }) => (
  <View style={[styles.card, style]}>{children}</View>
);

export const SoftAuditPatternVisualizer: React.FC<PatternVisualizerProps> = ({ 
  userId, 
  maxPatterns = 10 
}) => {
  const [patterns, setPatterns] = useState<PatternScore[]>([]);
  const [riskMetrics, setRiskMetrics] = useState<RiskMetrics | null>(null);
  const [recommendations, setRecommendations] = useState<string[]>([]);
  const [expandedPattern, setExpandedPattern] = useState<string | null>(null);

  useEffect(() => {
    const unsubscribe = softAuditEventEmitter.onAuditPattern((event: AuditPatternEvent) => {
      if (!userId || event.userId === userId) {
        // Extract enhanced analysis data
        const enhancedAnalysis = (event as any).enhancedAnalysis;
        if (enhancedAnalysis) {
          setPatterns(enhancedAnalysis.suspiciousPatterns || []);
          setRiskMetrics(enhancedAnalysis.patternDetails || null);
          setRecommendations(enhancedAnalysis.recommendations || []);
        }
      }
    });

    return unsubscribe;
  }, [userId]);

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'low': return '#4CAF50';
      case 'medium': return '#FF9800';
      case 'high': return '#F44336';
      default: return '#9E9E9E';
    }
  };

  const getRiskLevelColor = (level: string) => {
    switch (level) {
      case 'minimal': return '#4CAF50';
      case 'low': return '#8BC34A';
      case 'medium': return '#FF9800';
      case 'high': return '#FF5722';
      case 'critical': return '#F44336';
      default: return '#9E9E9E';
    }
  };

  const formatPatternName = (patternType: string) => {
    return patternType
      .replace(/([A-Z])/g, ' $1')
      .replace(/^./, str => str.toUpperCase())
      .trim();
  };

  return (
    <ScrollView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.title}>🔍 Soft Audit Analysis</Text>
        <Text style={styles.subtitle}>Suspicious Pattern Detection (Non-blocking)</Text>
      </View>

      {/* Risk Assessment Overview */}
      {riskMetrics && (
        <Card style={styles.riskCard}>
          <Text style={styles.cardTitle}>Risk Assessment</Text>
          
          <View style={styles.riskMetrics}>
            <View style={styles.riskLevelContainer}>
              <View style={[styles.riskBadge, { backgroundColor: getRiskLevelColor(riskMetrics.riskLevel) }]}>
                <Text style={styles.riskBadgeText}>{riskMetrics.riskLevel.toUpperCase()}</Text>
              </View>
              <Text style={styles.riskLevelText}>
                Risk Level: {riskMetrics.totalPatterns} patterns detected
              </Text>
            </View>

            <View style={styles.forgivenessSection}>
              <Text style={styles.sectionTitle}>Forgiveness Potential</Text>
              <View style={styles.forgivenessBar}>
                <View 
                  style={[
                    styles.forgivenessFill, 
                    { width: `${riskMetrics.forgivenessPotential * 100}%` }
                  ]} 
                />
              </View>
              <Text style={styles.forgivenessText}>
                {(riskMetrics.forgivenessPotential * 100).toFixed(1)}% forgiveness applied
              </Text>
            </View>
          </View>
        </Card>
      )}

      {/* Suspicious Patterns */}
      {patterns.length > 0 && (
        <Card style={styles.patternsCard}>
          <Text style={styles.cardTitle}>Suspicious Patterns Detected</Text>
          <Text style={styles.cardSubtitle}>
            {patterns.length} pattern{patterns.length !== 1 ? 's' : ''} identified (all eligible for forgiveness)
          </Text>

          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            {patterns.slice(0, maxPatterns).map((pattern, index) => (
              <TouchableOpacity
                key={`${pattern.type}-${index}`}
                style={[
                  styles.patternChip,
                  { backgroundColor: getSeverityColor(pattern.severity) + '20' },
                  expandedPattern === pattern.type && styles.expandedChip
                ]}
                onPress={() => setExpandedPattern(
                  expandedPattern === pattern.type ? null : pattern.type
                )}
              >
                <View style={styles.patternHeader}>
                  <View style={[styles.severityIndicator, { backgroundColor: getSeverityColor(pattern.severity) }]} />
                  <Text style={styles.patternName}>{formatPatternName(pattern.type)}</Text>
                  <Text style={styles.patternImpact}>{pattern.impact}pts</Text>
                </View>
                
                <Text style={styles.patternDetails}>{pattern.details}</Text>
                
                {pattern.forgivenessEligible && (
                  <View style={styles.forgivenessBadge}>
                    <Text style={styles.forgivenessText}>💝 Forgivable</Text>
                  </View>
                )}

                {expandedPattern === pattern.type && (
                  <View style={styles.expandedContent}>
                    <Text style={styles.expandedTitle}>Potential Causes:</Text>
                    {pattern.potentialCauses.map((cause, causeIndex) => (
                      <Text key={causeIndex} style={styles.expandedCause}>• {cause}</Text>
                    ))}
                  </View>
                )}
              </TouchableOpacity>
            ))}
          </ScrollView>
        </Card>
      )}

      {/* Recommendations */}
      {recommendations.length > 0 && (
        <Card style={styles.recommendationsCard}>
          <Text style={styles.cardTitle}>💡 Recommendations</Text>
          <Text style={styles.cardSubtitle}>Non-punitive guidance for improvement</Text>
          
          {recommendations.map((recommendation, index) => (
            <View key={index} style={styles.recommendationItem}>
              <Text style={styles.recommendationText}>{recommendation}</Text>
            </View>
          ))}
        </Card>
      )}

      {/* Forgiveness Breakdown */}
      {riskMetrics && riskMetrics.forgivenessPotential > 0 && (
        <Card style={styles.forgivenessCard}>
          <Text style={styles.cardTitle}>🛡️ Forgiveness Breakdown</Text>
          <Text style={styles.cardSubtitle}>Factors that reduced the audit score</Text>
          
          <View style={styles.forgivenessItems}>
            <View style={styles.forgivenessItem}>
              <Text style={styles.forgivenessLabel}>Technical Issues</Text>
              <Text style={styles.forgivenessValue}>
                {(riskMetrics.technicalIssues * 100).toFixed(1)}%
              </Text>
            </View>
            
            <View style={styles.forgivenessItem}>
              <Text style={styles.forgivenessLabel}>User Experience</Text>
              <Text style={styles.forgivenessValue}>
                {(riskMetrics.userExperienceFactors * 100).toFixed(1)}%
              </Text>
            </View>
          </View>
        </Card>
      )}

      {/* Empty State */}
      {patterns.length === 0 && riskMetrics && (
        <Card style={styles.emptyCard}>
          <Text style={styles.emptyTitle}>✅ Clean Session</Text>
          <Text style={styles.emptyText}>
            No suspicious patterns detected. Great job maintaining consistent study habits!
          </Text>
        </Card>
      )}
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
    padding: 16,
  },
  card: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  header: {
    marginBottom: 16,
    alignItems: 'center',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 8,
  },
  cardSubtitle: {
    fontSize: 14,
    color: '#666',
    marginBottom: 12,
  },
  riskCard: {
    marginBottom: 16,
  },
  riskMetrics: {
    gap: 16,
  },
  riskLevelContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  riskBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
  },
  riskBadgeText: {
    color: 'white',
    fontSize: 12,
    fontWeight: 'bold',
  },
  riskLevelText: {
    fontSize: 16,
    color: '#333',
  },
  forgivenessSection: {
    gap: 8,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
  },
  forgivenessBar: {
    height: 8,
    backgroundColor: '#e0e0e0',
    borderRadius: 4,
    overflow: 'hidden',
  },
  forgivenessFill: {
    height: '100%',
    backgroundColor: '#4CAF50',
  },
  forgivenessText: {
    fontSize: 12,
    color: '#666',
  },
  patternsCard: {
    marginBottom: 16,
  },
  patternChip: {
    padding: 12,
    marginRight: 12,
    borderRadius: 8,
    minWidth: 200,
    maxWidth: 280,
  },
  expandedChip: {
    borderWidth: 2,
    borderColor: '#2196F3',
  },
  patternHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
    gap: 8,
  },
  severityIndicator: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  patternName: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    flex: 1,
  },
  patternImpact: {
    fontSize: 12,
    color: '#666',
    backgroundColor: 'rgba(255,255,255,0.5)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  patternDetails: {
    fontSize: 12,
    color: '#555',
    marginBottom: 8,
  },
  forgivenessBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: 8,
    paddingVertical: 4,
    backgroundColor: 'rgba(76, 175, 80, 0.2)',
    borderRadius: 12,
  },
  expandedContent: {
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: 'rgba(0,0,0,0.1)',
  },
  expandedTitle: {
    fontSize: 12,
    fontWeight: '600',
    color: '#333',
    marginBottom: 4,
  },
  expandedCause: {
    fontSize: 12,
    color: '#666',
    marginBottom: 2,
  },
  recommendationsCard: {
    marginBottom: 16,
  },
  recommendationItem: {
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  recommendationText: {
    fontSize: 14,
    color: '#444',
    lineHeight: 20,
  },
  forgivenessCard: {
    marginBottom: 16,
  },
  forgivenessItems: {
    gap: 8,
  },
  forgivenessItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  forgivenessLabel: {
    fontSize: 14,
    color: '#333',
  },
  forgivenessValue: {
    fontSize: 14,
    fontWeight: '600',
    color: '#4CAF50',
  },
  emptyCard: {
    alignItems: 'center',
    paddingVertical: 32,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#4CAF50',
    marginBottom: 8,
  },
  emptyText: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
  },
});

export default SoftAuditPatternVisualizer;