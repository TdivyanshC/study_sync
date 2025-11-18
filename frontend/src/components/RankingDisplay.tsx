/**
 * Ranking Display Component
 * Displays user's current ranking tier, progress, and next milestones
 */

import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import { gamificationApi, UserRankingStatus } from '../api/gamificationApi';

interface RankingDisplayProps {
  userId: string;
  onViewLeaderboard?: () => void;
  onViewProgress?: () => void;
}

export const RankingDisplay: React.FC<RankingDisplayProps> = ({ 
  userId, 
  onViewLeaderboard, 
  onViewProgress 
}) => {
  const [rankingStatus, setRankingStatus] = useState<UserRankingStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchRankingStatus();
  }, [userId]);

  const fetchRankingStatus = async () => {
    try {
      setLoading(true);
      setError(null);

      // Call real backend API
      const response = await gamificationApi.getUserRankingStatus(userId);
      
      if (response.success) {
        setRankingStatus(response.data);
      } else {
        throw new Error(response.message || 'Failed to fetch ranking status');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch ranking status');
      console.error('Error fetching ranking status:', err);
    } finally {
      setLoading(false);
    }
  };

  const getTierGradient = (tier: string) => {
    const gradients = {
      bronze: ['#CD7F32', '#B8860B'],
      silver: ['#C0C0C0', '#A8A8A8'],
      gold: ['#FFD700', '#FFA500'],
      platinum: ['#E5E4E2', '#C0C0C0'],
      diamond: ['#B9F2FF', '#87CEEB']
    };
    return gradients[tier as keyof typeof gradients] || ['#9E9E9E', '#757575'];
  };

  const formatNumber = (num: number) => {
    if (num >= 1000000) {
      return (num / 1000000).toFixed(1) + 'M';
    } else if (num >= 1000) {
      return (num / 1000).toFixed(1) + 'K';
    }
    return num.toString();
  };

  if (loading) {
    return (
      <View style={styles.container}>
        <View style={styles.loadingCard}>
          <Text style={styles.loadingText}>Loading your ranking...</Text>
        </View>
      </View>
    );
  }

  if (error || !rankingStatus) {
    return (
      <View style={styles.container}>
        <View style={styles.errorCard}>
          <Text style={styles.errorText}>{error || 'Unable to load ranking data'}</Text>
          <TouchableOpacity style={styles.retryButton} onPress={fetchRankingStatus}>
            <Text style={styles.retryButtonText}>Retry</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  const { current_ranking, progress, leaderboard, next_milestones } = rankingStatus;
  const tierGradient = getTierGradient(current_ranking.tier);

  return (
    <ScrollView style={styles.container}>
      {/* Current Tier Display */}
      <View style={[
        styles.tierCard,
        { backgroundColor: current_ranking.tier_info.color }
      ]}>
        <View style={styles.tierHeader}>
          <Text style={styles.tierEmoji}>{current_ranking.tier_info.emoji}</Text>
          <View style={styles.tierInfo}>
            <Text style={styles.tierName}>{current_ranking.tier_info.name}</Text>
            <Text style={styles.tierSubtitle}>Scholar</Text>
          </View>
        </View>

        <View style={styles.statsRow}>
          <View style={styles.statItem}>
            <Text style={styles.statValue}>{formatNumber(current_ranking.user_stats.xp)}</Text>
            <Text style={styles.statLabel}>XP</Text>
          </View>
          <View style={styles.statItem}>
            <Text style={styles.statValue}>{current_ranking.user_stats.current_streak}</Text>
            <Text style={styles.statLabel}>Day Streak</Text>
          </View>
          <View style={styles.statItem}>
            <Text style={styles.statValue}>#{leaderboard.position}</Text>
            <Text style={styles.statLabel}>Rank</Text>
          </View>
        </View>

        {!progress.at_max_tier && (
          <View style={styles.progressSection}>
            <View style={styles.progressHeader}>
              <Text style={styles.progressTitle}>
                Progress to {progress.next_tier_info?.name}
              </Text>
              <Text style={styles.progressPercentage}>
                {Math.round(progress.progress_to_next)}%
              </Text>
            </View>
            
            <View style={styles.progressBar}>
              <View 
                style={[
                  styles.progressFill,
                  { width: `${progress.progress_to_next}%` }
                ]} 
              />
            </View>

            <View style={styles.progressDetails}>
              <View style={styles.progressItem}>
                <Text style={styles.progressLabel}>XP Progress</Text>
                <Text style={styles.progressValue}>
                  {formatNumber(current_ranking.user_stats.xp)} / {formatNumber(progress.requirements.xp || 0)}
                </Text>
              </View>
              <View style={styles.progressItem}>
                <Text style={styles.progressLabel}>Streak Progress</Text>
                <Text style={styles.progressValue}>
                  {current_ranking.user_stats.current_streak} / {progress.requirements.streak || 0} days
                </Text>
              </View>
            </View>
          </View>
        )}
      </View>

      {/* Next Milestones */}
      <View style={styles.milestonesCard}>
        <Text style={styles.cardTitle}>🎯 Next Milestones</Text>
        
        {next_milestones.next_tier && next_milestones.next_tier.type === 'tier_promotion' && (
          <View style={styles.milestoneItem}>
            <Text style={styles.milestoneIcon}>{next_milestones.next_tier.target_emoji}</Text>
            <View style={styles.milestoneInfo}>
              <Text style={styles.milestoneTitle}>
                {next_milestones.next_tier.target_name} Tier
              </Text>
              <Text style={styles.milestoneDescription}>
                Need {formatNumber(next_milestones.next_tier.xp_needed)} XP and {next_milestones.next_tier.streak_needed} day streak
              </Text>
            </View>
          </View>
        )}

        {next_milestones.streak_milestones.map((milestone, index) => (
          <View key={index} style={styles.milestoneItem}>
            <Text style={styles.milestoneIcon}>🔥</Text>
            <View style={styles.milestoneInfo}>
              <Text style={styles.milestoneTitle}>{milestone.target.replace('_', ' ').toUpperCase()}</Text>
              <Text style={styles.milestoneDescription}>
                {milestone.needed} days to go
              </Text>
            </View>
          </View>
        ))}
      </View>

      {/* Action Buttons */}
      <View style={styles.actionsContainer}>
        <TouchableOpacity style={styles.actionButton} onPress={onViewLeaderboard}>
          <Text style={styles.actionButtonText}>📊 View Leaderboard</Text>
        </TouchableOpacity>
        
        <TouchableOpacity style={styles.actionButton} onPress={onViewProgress}>
          <Text style={styles.actionButtonText}>📈 Detailed Progress</Text>
        </TouchableOpacity>
      </View>

      {/* Encouragement Message */}
      <View style={styles.encouragementCard}>
        <Text style={styles.encouragementText}>
          {progress.at_max_tier 
            ? "🏆 Amazing! You've reached the highest tier!" 
            : `Keep going! You're ${Math.round(progress.progress_to_next)}% of the way to ${progress.next_tier_info?.name}.`
          }
        </Text>
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
    padding: 16,
  },
  loadingCard: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 32,
    alignItems: 'center',
    marginVertical: 32,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  loadingText: {
    fontSize: 16,
    color: '#666',
  },
  errorCard: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 24,
    alignItems: 'center',
    marginVertical: 32,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  errorText: {
    fontSize: 16,
    color: '#F44336',
    marginBottom: 16,
    textAlign: 'center',
  },
  retryButton: {
    backgroundColor: '#2196F3',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  retryButtonText: {
    color: 'white',
    fontSize: 14,
    fontWeight: '600',
  },
  tierCard: {
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4,
  },
  tierHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  tierEmoji: {
    fontSize: 48,
    marginRight: 16,
  },
  tierInfo: {
    flex: 1,
  },
  tierName: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
  },
  tierSubtitle: {
    fontSize: 14,
    color: '#555',
    marginTop: 2,
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: 20,
  },
  statItem: {
    alignItems: 'center',
  },
  statValue: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
  },
  statLabel: {
    fontSize: 12,
    color: '#666',
    marginTop: 2,
  },
  progressSection: {
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    borderRadius: 12,
    padding: 16,
  },
  progressHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  progressTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
  },
  progressPercentage: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#4CAF50',
  },
  progressBar: {
    height: 8,
    backgroundColor: '#e0e0e0',
    borderRadius: 4,
    overflow: 'hidden',
    marginBottom: 12,
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#4CAF50',
    borderRadius: 4,
  },
  progressDetails: {
    gap: 8,
  },
  progressItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  progressLabel: {
    fontSize: 14,
    color: '#666',
  },
  progressValue: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
  },
  milestonesCard: {
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
  cardTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 12,
  },
  milestoneItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  milestoneIcon: {
    fontSize: 24,
    marginRight: 12,
  },
  milestoneInfo: {
    flex: 1,
  },
  milestoneTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
  },
  milestoneDescription: {
    fontSize: 14,
    color: '#666',
    marginTop: 2,
  },
  actionsContainer: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 16,
  },
  actionButton: {
    flex: 1,
    backgroundColor: 'white',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 1,
  },
  actionButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#2196F3',
  },
  encouragementCard: {
    backgroundColor: '#E8F5E8',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
  },
  encouragementText: {
    fontSize: 14,
    color: '#2E7D32',
    textAlign: 'center',
    fontWeight: '500',
  },
});

export default RankingDisplay;