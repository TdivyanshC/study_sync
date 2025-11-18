import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
} from 'react-native';
import { XPHistoryEntry } from '../api/gamificationApi';

interface XPHistoryItemProps {
  entry: XPHistoryEntry;
  showDate?: boolean;
  onPress?: (entry: XPHistoryEntry) => void;
}

const XPHistoryItem: React.FC<XPHistoryItemProps> = ({ 
  entry, 
  showDate = true,
  onPress 
}) => {
  const getSourceIcon = (source: string) => {
    const icons: Record<string, string> = {
      session: '📚',
      streak: '🔥',
      daily_bonus: '🎯',
      milestone: '🏆',
    };
    return icons[source] || '⭐';
  };

  const getSourceLabel = (source: string) => {
    const labels: Record<string, string> = {
      session: 'Study Session',
      streak: 'Streak Bonus',
      daily_bonus: 'Daily Goal',
      milestone: 'Milestone',
    };
    return labels[source] || source;
  };

  const getSourceColor = (source: string) => {
    const colors: Record<string, string> = {
      session: '#3498db',
      streak: '#e74c3c',
      daily_bonus: '#f39c12',
      milestone: '#9b59b6',
    };
    return colors[source] || '#95a5a6';
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInHours = (now.getTime() - date.getTime()) / (1000 * 60 * 60);

    if (diffInHours < 1) {
      const diffInMinutes = Math.floor(diffInHours * 60);
      return `${diffInMinutes}m ago`;
    } else if (diffInHours < 24) {
      const hours = Math.floor(diffInHours);
      return `${hours}h ago`;
    } else if (diffInHours < 48) {
      return 'Yesterday';
    } else {
      return date.toLocaleDateString();
    }
  };

  const getAdditionalInfo = (metadata: Record<string, any>) => {
    if (!metadata) return '';

    // Show session-specific info
    if (metadata.session_id) {
      return 'Session completed';
    }
    
    // Show milestone info
    if (metadata.milestone_type) {
      return `${metadata.milestone_type} milestone reached`;
    }
    
    // Show daily goal info
    if (metadata.daily_goal_completed) {
      return 'Daily study goal completed';
    }

    return '';
  };

  const sourceColor = getSourceColor(entry.source);
  const additionalInfo = getAdditionalInfo(entry.metadata);

  const handlePress = () => {
    onPress?.(entry);
  };

  return (
    <TouchableOpacity 
      style={styles.container} 
      onPress={handlePress}
      disabled={!onPress}
    >
      <View style={styles.content}>
        {/* Left side - Icon and source info */}
        <View style={styles.leftSide}>
          <View style={[styles.iconContainer, { backgroundColor: sourceColor + '20' }]}>
            <Text style={styles.icon}>{getSourceIcon(entry.source)}</Text>
          </View>
          
          <View style={styles.info}>
            <Text style={styles.sourceLabel}>
              {getSourceLabel(entry.source)}
            </Text>
            
            {showDate && (
              <Text style={styles.timestamp}>
                {formatDate(entry.created_at)}
              </Text>
            )}
            
            {additionalInfo && (
              <Text style={styles.additionalInfo}>
                {additionalInfo}
              </Text>
            )}
          </View>
        </View>

        {/* Right side - XP amount */}
        <View style={styles.rightSide}>
          <View style={[styles.xpAmountContainer, { backgroundColor: entry.amount > 0 ? '#2ecc7120' : '#e74c3c20' }]}>
            <Text style={[
              styles.xpAmount,
              { color: entry.amount > 0 ? '#27ae60' : '#e74c3c' }
            ]}>
              {entry.amount > 0 ? '+' : ''}{entry.amount}
            </Text>
            <Text style={styles.xpLabel}>XP</Text>
          </View>
        </View>
      </View>

      {/* Additional metadata display */}
      {entry.metadata && Object.keys(entry.metadata).length > 0 && (
        <View style={styles.metadataContainer}>
          <Text style={styles.metadataTitle}>Details:</Text>
          {Object.entries(entry.metadata).map(([key, value]) => (
            <Text key={key} style={styles.metadataItem}>
              • {key.replace('_', ' ')}: {typeof value === 'object' ? JSON.stringify(value) : String(value)}
            </Text>
          ))}
        </View>
      )}
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: 'white',
    marginHorizontal: 16,
    marginVertical: 4,
    borderRadius: 12,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  content: {
    flexDirection: 'row',
    padding: 16,
    alignItems: 'center',
  },
  leftSide: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
  },
  iconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  icon: {
    fontSize: 20,
  },
  info: {
    flex: 1,
  },
  sourceLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#2c3e50',
    marginBottom: 2,
  },
  timestamp: {
    fontSize: 12,
    color: '#7f8c8d',
    marginBottom: 2,
  },
  additionalInfo: {
    fontSize: 12,
    color: '#95a5a6',
    fontStyle: 'italic',
  },
  rightSide: {
    alignItems: 'flex-end',
  },
  xpAmountContainer: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    alignItems: 'center',
    minWidth: 60,
  },
  xpAmount: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  xpLabel: {
    fontSize: 10,
    marginTop: 1,
  },
  metadataContainer: {
    paddingHorizontal: 16,
    paddingBottom: 12,
    borderTopWidth: 1,
    borderTopColor: '#ecf0f1',
    backgroundColor: '#f8f9fa',
  },
  metadataTitle: {
    fontSize: 12,
    fontWeight: '600',
    color: '#7f8c8d',
    marginBottom: 4,
    marginTop: 8,
  },
  metadataItem: {
    fontSize: 11,
    color: '#95a5a6',
    marginBottom: 2,
    paddingLeft: 8,
  },
});

export default XPHistoryItem;