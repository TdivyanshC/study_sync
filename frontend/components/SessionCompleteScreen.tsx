/**
 * Session Complete Screen - Displays gamification results after session ends
 * Shows XP gained, streak status, audit results, and ranking progress
 */

import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Animated } from 'react-native';
import { SessionSummary } from '../src/api/sessionApi';

interface SessionCompleteScreenProps {
  summary: SessionSummary;
  onClose: () => void;
}

export const SessionCompleteScreen: React.FC<SessionCompleteScreenProps> = ({ summary, onClose }) => {
  const fadeAnim = React.useRef(new Animated.Value(0)).current;
  const slideAnim = React.useRef(new Animated.Value(50)).current;

  React.useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 500,
        useNativeDriver: true,
      }),
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 500,
        useNativeDriver: true,
      }),
    ]).start();
  }, []);

  return (
    <View style={styles.container}>
      <Animated.View
        style={[
          styles.content,
          {
            opacity: fadeAnim,
            transform: [{ translateY: slideAnim }],
          },
        ]}
      >
        <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
          {/* Header */}
          <View style={styles.header}>
            <Text style={styles.title}>🎉 Session Complete!</Text>
            <Text style={styles.subtitle}>Great work! Here's your progress</Text>
          </View>

          {/* XP Card */}
          <View style={styles.card}>
            <View style={styles.cardHeader}>
              <Text style={styles.cardIcon}>💎</Text>
              <Text style={styles.cardTitle}>XP Earned</Text>
            </View>
            <View style={styles.cardContent}>
              <Text style={styles.xpDelta}>+{summary.xp_delta} XP</Text>
              <Text style={styles.xpReason}>{summary.xp_reason}</Text>
              <View style={styles.statsRow}>
                <View style={styles.statItem}>
                  <Text style={styles.statLabel}>Total XP</Text>
                  <Text style={styles.statValue}>{summary.total_xp}</Text>
                </View>
                <View style={styles.statItem}>
                  <Text style={styles.statLabel}>Level</Text>
                  <Text style={styles.statValue}>{summary.level}</Text>
                </View>
              </View>
            </View>
          </View>

          {/* Streak Card */}
          <View style={styles.card}>
            <View style={styles.cardHeader}>
              <Text style={styles.cardIcon}>🔥</Text>
              <Text style={styles.cardTitle}>Streak Status</Text>
            </View>
            <View style={styles.cardContent}>
              <Text style={[
                styles.streakStatus,
                summary.streak_status === 'maintained' ? styles.streakMaintained : styles.streakBroken
              ]}>
                {summary.streak_status === 'maintained' ? '✅ Maintained' : '❌ Broken'}
              </Text>
              <View style={styles.statsRow}>
                <View style={styles.statItem}>
                  <Text style={styles.statLabel}>Current</Text>
                  <Text style={styles.statValue}>{summary.current_streak} days</Text>
                </View>
                <View style={styles.statItem}>
                  <Text style={styles.statLabel}>Best</Text>
                  <Text style={styles.statValue}>{summary.best_streak} days</Text>
                </View>
              </View>
              {summary.streak_milestone && (
                <View style={styles.milestoneBox}>
                  <Text style={styles.milestoneText}>🎊 Milestone: {summary.streak_milestone}</Text>
                </View>
              )}
            </View>
          </View>

          {/* Ranking Card */}
          <View style={styles.card}>
            <View style={styles.cardHeader}>
              <Text style={styles.cardIcon}>🏆</Text>
              <Text style={styles.cardTitle}>Ranking</Text>
            </View>
            <View style={styles.cardContent}>
              <View style={styles.tierDisplay}>
                <Text style={styles.tierEmoji}>{summary.ranking.tier_info.emoji}</Text>
                <Text style={styles.tierName}>{summary.ranking.tier_info.name}</Text>
              </View>
              {summary.ranking.promoted && (
                <View style={styles.promotionBox}>
                  <Text style={styles.promotionText}>🎊 PROMOTED! Congratulations!</Text>
                </View>
              )}
              <View style={styles.progressContainer}>
                <View style={styles.progressBar}>
                  <View
                    style={[
                      styles.progressFill,
                      { width: `${summary.ranking.progress_percent}%` },
                      { backgroundColor: summary.ranking.tier_info.color }
                    ]}
                  />
                </View>
                <Text style={styles.progressText}>
                  {summary.ranking.progress_percent.toFixed(1)}% to {summary.ranking.next_tier || 'max tier'}
                </Text>
              </View>
            </View>
          </View>

          {/* Audit Card */}
          <View style={styles.card}>
            <View style={styles.cardHeader}>
              <Text style={styles.cardIcon}>🛡️</Text>
              <Text style={styles.cardTitle}>Session Audit</Text>
            </View>
            <View style={styles.cardContent}>
              <View style={styles.auditStatus}>
                <Text style={[
                  styles.auditBadge,
                  summary.audit_valid ? styles.auditValid : styles.auditInvalid
                ]}>
                  {summary.audit_valid ? '✅ Valid' : '⚠️ Flagged'}
                </Text>
                <Text style={styles.auditRisk}>Risk: {summary.audit_risk}/100</Text>
              </View>
              {summary.forgiveness_percent > 0 && (
                <Text style={styles.forgivenessText}>
                  💝 {summary.forgiveness_percent}% forgiveness applied
                </Text>
              )}
              {summary.audit_messages.map((message, index) => (
                <Text key={index} style={styles.auditMessage}>{message}</Text>
              ))}
            </View>
          </View>

          {/* Confetti Trigger */}
          {summary.notifications.confetti_trigger && (
            <View style={styles.confettiPlaceholder}>
              <Text style={styles.confettiText}>🎉 🎊 ✨ 🎉 🎊 ✨</Text>
              <Text style={styles.confettiSubtext}>Amazing achievement!</Text>
            </View>
          )}

          {/* Close Button */}
          <TouchableOpacity style={styles.closeButton} onPress={onClose}>
            <Text style={styles.closeButtonText}>Continue</Text>
          </TouchableOpacity>

          <View style={styles.bottomSpacer} />
        </ScrollView>
      </Animated.View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  content: {
    width: '90%',
    maxWidth: 500,
    maxHeight: '90%',
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    overflow: 'hidden',
  },
  scrollView: {
    flex: 1,
  },
  header: {
    padding: 24,
    backgroundColor: '#6366F1',
    alignItems: 'center',
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: '#E0E7FF',
  },
  card: {
    margin: 16,
    backgroundColor: '#F9FAFB',
    borderRadius: 12,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  cardIcon: {
    fontSize: 24,
    marginRight: 12,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#111827',
  },
  cardContent: {
    padding: 16,
  },
  xpDelta: {
    fontSize: 36,
    fontWeight: 'bold',
    color: '#10B981',
    textAlign: 'center',
    marginBottom: 8,
  },
  xpReason: {
    fontSize: 14,
    color: '#6B7280',
    textAlign: 'center',
    marginBottom: 16,
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginTop: 8,
  },
  statItem: {
    alignItems: 'center',
  },
  statLabel: {
    fontSize: 12,
    color: '#9CA3AF',
    marginBottom: 4,
  },
  statValue: {
    fontSize: 20,
    fontWeight: '600',
    color: '#111827',
  },
  streakStatus: {
    fontSize: 24,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 16,
  },
  streakMaintained: {
    color: '#10B981',
  },
  streakBroken: {
    color: '#EF4444',
  },
  milestoneBox: {
    marginTop: 16,
    padding: 12,
    backgroundColor: '#FEF3C7',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#FCD34D',
  },
  milestoneText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#92400E',
    textAlign: 'center',
  },
  tierDisplay: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  tierEmoji: {
    fontSize: 48,
    marginRight: 12,
  },
  tierName: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#111827',
  },
  promotionBox: {
    marginBottom: 16,
    padding: 12,
    backgroundColor: '#DBEAFE',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#60A5FA',
  },
  promotionText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#1E40AF',
    textAlign: 'center',
  },
  progressContainer: {
    marginTop: 8,
  },
  progressBar: {
    height: 12,
    backgroundColor: '#E5E7EB',
    borderRadius: 6,
    overflow: 'hidden',
    marginBottom: 8,
  },
  progressFill: {
    height: '100%',
    borderRadius: 6,
  },
  progressText: {
    fontSize: 12,
    color: '#6B7280',
    textAlign: 'center',
  },
  auditStatus: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  auditBadge: {
    fontSize: 16,
    fontWeight: '600',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
  },
  auditValid: {
    backgroundColor: '#D1FAE5',
    color: '#065F46',
  },
  auditInvalid: {
    backgroundColor: '#FEE2E2',
    color: '#991B1B',
  },
  auditRisk: {
    fontSize: 14,
    color: '#6B7280',
  },
  forgivenessText: {
    fontSize: 14,
    color: '#7C3AED',
    marginBottom: 8,
    textAlign: 'center',
  },
  auditMessage: {
    fontSize: 14,
    color: '#374151',
    marginTop: 8,
    lineHeight: 20,
  },
  confettiPlaceholder: {
    margin: 16,
    padding: 24,
    backgroundColor: '#FEF3C7',
    borderRadius: 12,
    alignItems: 'center',
  },
  confettiText: {
    fontSize: 32,
    marginBottom: 8,
  },
  confettiSubtext: {
    fontSize: 16,
    fontWeight: '600',
    color: '#92400E',
  },
  closeButton: {
    margin: 16,
    padding: 16,
    backgroundColor: '#6366F1',
    borderRadius: 12,
    alignItems: 'center',
  },
  closeButtonText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  bottomSpacer: {
    height: 24,
  },
});

export default SessionCompleteScreen;
