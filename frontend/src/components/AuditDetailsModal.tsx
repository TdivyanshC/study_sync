import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  ScrollView,
  Animated,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import AuditVisualization from './AuditVisualization';

interface AuditEvent {
  id: string;
  event_type: string;
  event_payload: Record<string, any>;
  created_at: string;
}

interface AuditDetailsModalProps {
  visible: boolean;
  onClose: () => void;
  sessionId: string;
  userId: string;
}

const AuditDetailsModal: React.FC<AuditDetailsModalProps> = ({
  visible,
  onClose,
  sessionId,
  userId,
}) => {
  const [activeTab, setActiveTab] = useState<'visualization' | 'events' | 'analysis'>('visualization');
  const [auditData, setAuditData] = useState<any>(null);
  const [sessionEvents, setSessionEvents] = useState<AuditEvent[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadAuditData = async () => {
    if (!sessionId || !userId || auditData) return; // Don't reload if we have data

    try {
      setLoading(true);
      setError(null);

      // Load audit validation data
      const auditResponse = await fetch(
        `https://nominatively-semirealistic-darryl.ngrok-free.dev/api/xp/audit/validate`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            session_id: sessionId,
            user_id: userId,
            validation_mode: 'soft',
          }),
        }
      );

      if (!auditResponse.ok) {
        throw new Error('Failed to load audit data');
      }

      const auditResult = await auditResponse.json();
      setAuditData(auditResult);

      // Load session events
      const eventsResponse = await fetch(
        `https://nominatively-semirealistic-darryl.ngrok-free.dev/api/xp/events/${sessionId}`
      );

      if (eventsResponse.ok) {
        const eventsResult = await eventsResponse.json();
        setSessionEvents(eventsResult.data?.events || []);
      }

    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load audit data');
      console.error('Failed to load audit data:', err);
    } finally {
      setLoading(false);
    }
  };

  React.useEffect(() => {
    if (visible && !auditData) {
      loadAuditData();
    }
  }, [visible]);

  const renderTabContent = () => {
    if (loading) {
      return (
        <View style={styles.loadingContainer}>
          <Text style={styles.loadingText}>Loading audit data...</Text>
        </View>
      );
    }

    if (error) {
      return (
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>❌ {error}</Text>
          <TouchableOpacity style={styles.retryButton} onPress={loadAuditData}>
            <Text style={styles.retryButtonText}>Retry</Text>
          </TouchableOpacity>
        </View>
      );
    }

    if (!auditData) {
      return (
        <View style={styles.noDataContainer}>
          <Text style={styles.noDataText}>No audit data available</Text>
        </View>
      );
    }

    switch (activeTab) {
      case 'visualization':
        return (
          <AuditVisualization
            suspicionScore={auditData.adjusted_suspicion_score}
            auditDetails={auditData.validation_details}
            isValid={auditData.is_valid}
          />
        );

      case 'events':
        return (
          <ScrollView style={styles.eventsContainer}>
            <Text style={styles.eventsTitle}>Session Events ({sessionEvents.length})</Text>
            {sessionEvents.length === 0 ? (
              <Text style={styles.noEventsText}>No events recorded for this session</Text>
            ) : (
              sessionEvents.map((event, index) => (
                <View key={event.id || index} style={styles.eventItem}>
                  <View style={styles.eventHeader}>
                    <Text style={styles.eventType}>{event.event_type}</Text>
                    <Text style={styles.eventTime}>
                      {new Date(event.created_at).toLocaleTimeString()}
                    </Text>
                  </View>
                  <Text style={styles.eventPayload}>
                    {JSON.stringify(event.event_payload, null, 2)}
                  </Text>
                </View>
              ))
            )}
          </ScrollView>
        );

      case 'analysis':
        return (
          <ScrollView style={styles.analysisContainer}>
            <Text style={styles.analysisTitle}>Detailed Analysis</Text>
            
            <View style={styles.analysisSection}>
              <Text style={styles.sectionTitle}>Base Analysis</Text>
              <Text style={styles.sectionContent}>
                Total Events: {auditData.validation_details.base_analysis.total_events}
              </Text>
              <Text style={styles.sectionContent}>
                Pattern Score: {auditData.validation_details.base_analysis.pattern_score}/100
              </Text>
            </View>

            <View style={styles.analysisSection}>
              <Text style={styles.sectionTitle}>Score Breakdown</Text>
              <Text style={styles.sectionContent}>
                Base Suspicion Score: {auditData.base_suspicion_score}
              </Text>
              <Text style={styles.sectionContent}>
                Adjusted Suspicion Score: {auditData.adjusted_suspicion_score}
              </Text>
              <Text style={styles.sectionContent}>
                Threshold: {auditData.suspicion_threshold}
              </Text>
            </View>

            <View style={styles.analysisSection}>
              <Text style={styles.sectionTitle}>Validation Context</Text>
              <Text style={styles.sectionContent}>
                Mode: {auditData.validation_details.validation_context.mode}
              </Text>
              <Text style={styles.sectionContent}>
                Is Soft Audit: {auditData.validation_details.validation_context.is_soft_audit ? 'Yes' : 'No'}
              </Text>
              <Text style={styles.sectionContent}>
                Forgiveness Applied: {auditData.validation_details.validation_context.forgiveness_applied ? 'Yes' : 'No'}
              </Text>
            </View>
          </ScrollView>
        );

      default:
        return null;
    }
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <View style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={onClose} style={styles.closeButton}>
            <Ionicons name="close" size={24} color="#2c3e50" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Session Audit Details</Text>
          <View style={styles.headerSpacer} />
        </View>

        {/* Tab Navigation */}
        <View style={styles.tabContainer}>
          <TouchableOpacity
            style={[styles.tab, activeTab === 'visualization' && styles.activeTab]}
            onPress={() => setActiveTab('visualization')}
          >
            <Text style={[styles.tabText, activeTab === 'visualization' && styles.activeTabText]}>
              📊 Visualization
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.tab, activeTab === 'events' && styles.activeTab]}
            onPress={() => setActiveTab('events')}
          >
            <Text style={[styles.tabText, activeTab === 'events' && styles.activeTabText]}>
              📝 Events ({sessionEvents.length})
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.tab, activeTab === 'analysis' && styles.activeTab]}
            onPress={() => setActiveTab('analysis')}
          >
            <Text style={[styles.tabText, activeTab === 'analysis' && styles.activeTabText]}>
              🔍 Analysis
            </Text>
          </TouchableOpacity>
        </View>

        {/* Tab Content */}
        <View style={styles.content}>
          {renderTabContent()}
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    backgroundColor: 'white',
    borderBottomWidth: 1,
    borderBottomColor: '#ecf0f1',
  },
  closeButton: {
    padding: 4,
  },
  headerTitle: {
    flex: 1,
    fontSize: 18,
    fontWeight: 'bold',
    color: '#2c3e50',
    textAlign: 'center',
  },
  headerSpacer: {
    width: 32,
  },
  tabContainer: {
    flexDirection: 'row',
    backgroundColor: 'white',
    borderBottomWidth: 1,
    borderBottomColor: '#ecf0f1',
  },
  tab: {
    flex: 1,
    paddingVertical: 12,
    alignItems: 'center',
  },
  activeTab: {
    borderBottomWidth: 2,
    borderBottomColor: '#3498db',
  },
  tabText: {
    fontSize: 12,
    color: '#7f8c8d',
    fontWeight: '600',
  },
  activeTabText: {
    color: '#3498db',
  },
  content: {
    flex: 1,
    padding: 16,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    fontSize: 16,
    color: '#7f8c8d',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  errorText: {
    fontSize: 16,
    color: '#e74c3c',
    textAlign: 'center',
    marginBottom: 16,
  },
  retryButton: {
    backgroundColor: '#3498db',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
  },
  retryButtonText: {
    color: 'white',
    fontWeight: '600',
  },
  noDataContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  noDataText: {
    fontSize: 16,
    color: '#7f8c8d',
  },
  eventsContainer: {
    flex: 1,
  },
  eventsTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#2c3e50',
    marginBottom: 16,
  },
  noEventsText: {
    fontSize: 14,
    color: '#7f8c8d',
    textAlign: 'center',
    marginTop: 20,
  },
  eventItem: {
    backgroundColor: 'white',
    borderRadius: 8,
    padding: 12,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#ecf0f1',
  },
  eventHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  eventType: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#2c3e50',
    textTransform: 'capitalize',
  },
  eventTime: {
    fontSize: 12,
    color: '#7f8c8d',
  },
  eventPayload: {
    fontSize: 11,
    color: '#7f8c8d',
    fontFamily: 'monospace',
  },
  analysisContainer: {
    flex: 1,
  },
  analysisTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#2c3e50',
    marginBottom: 16,
  },
  analysisSection: {
    backgroundColor: 'white',
    borderRadius: 8,
    padding: 16,
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#2c3e50',
    marginBottom: 8,
  },
  sectionContent: {
    fontSize: 14,
    color: '#7f8c8d',
    marginBottom: 4,
  },
});

export default AuditDetailsModal;