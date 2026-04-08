import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Modal,
  ScrollView,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '../constants/Colors';
import { GlobalStyles } from '../constants/Theme';
import { useAuth } from '../hooks/useAuth';

interface SessionType {
  id: string;
  name: string;
  emoji: string;
  color: string;
}

interface SessionSelectionModalProps {
  visible: boolean;
  onClose: () => void;
  onSessionAdded: (sessionType: SessionType) => void;
  currentSessions: string[];
}

const AVAILABLE_SESSIONS: Record<string, SessionType> = {
  gym: { id: 'gym', name: 'Gym Session', emoji: '💪', color: '#ff6b35' },
  meditation: { id: 'meditation', name: 'Meditation', emoji: '🧘', color: '#8b5cf6' },
  coding: { id: 'coding', name: 'Coding', emoji: '💻', color: '#06d6a0' },
  cricket: { id: 'cricket', name: 'Cricket', emoji: '🏏', color: '#fbbf24' },
  singing: { id: 'singing', name: 'Singing', emoji: '🎤', color: '#ec4899' },
  study: { id: 'study', name: 'Study Session', emoji: '📚', color: '#3b82f6' },
  yoga: { id: 'yoga', name: 'Yoga', emoji: '🧘‍♀️', color: '#10b981' },
  reading: { id: 'reading', name: 'Reading', emoji: '📖', color: '#6366f1' },
  writing: { id: 'writing', name: 'Writing', emoji: '✍️', color: '#f59e0b' },
  music: { id: 'music', name: 'Music Practice', emoji: '🎵', color: '#8b5cf6' },
  gaming: { id: 'gaming', name: 'Gaming', emoji: '🎮', color: '#ef4444' },
  cooking: { id: 'cooking', name: 'Cooking', emoji: '👨‍🍳', color: '#f97316' },
  dancing: { id: 'dancing', name: 'Dancing', emoji: '💃', color: '#f472b6' },
  painting: { id: 'painting', name: 'Painting', emoji: '🎨', color: '#ec4899' },
  running: { id: 'running', name: 'Running', emoji: '🏃', color: '#10b981' },
  swimming: { id: 'swimming', name: 'Swimming', emoji: '🏊', color: '#06d6a0' },
  photography: { id: 'photography', name: 'Photography', emoji: '📸', color: '#6366f1' },
  gardening: { id: 'gardening', name: 'Gardening', emoji: '🌱', color: '#10b981' },
  languages: { id: 'languages', name: 'Language Learning', emoji: '🗣️', color: '#8b5cf6' },
  science: { id: 'science', name: 'Science', emoji: '🔬', color: '#3b82f6' },
};

export default function SessionSelectionModal({
  visible,
  onClose,
  onSessionAdded,
  currentSessions,
}: SessionSelectionModalProps) {
  const { user, session } = useAuth();
  const [selectedSessions, setSelectedSessions] = useState<string[]>(currentSessions);
  const [saving, setSaving] = useState(false);

  const availableSessionsList = Object.values(AVAILABLE_SESSIONS).filter(
    session => !currentSessions.includes(session.id)
  );

  const toggleSession = (sessionId: string) => {
    setSelectedSessions(prev => {
      if (prev.includes(sessionId)) {
        return prev.filter(id => id !== sessionId);
      } else {
        return [...prev, sessionId];
      }
    });
  };

  const handleSave = async () => {
    if (!user) {
      Alert.alert('Error', 'User not authenticated');
      return;
    }

    setSaving(true);
    try {
      console.log('💾 Saving sessions:', selectedSessions);

      const response = await fetch(`https://prodify-ap46.onrender.com/api/users/${user.id}/preferred-sessions`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session}`
        },
        body: JSON.stringify({ preferred_sessions: selectedSessions })
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        console.error('❌ Error updating sessions:', JSON.stringify(errorData) || errorData?.message || String(response.statusText));
        Alert.alert('Error', 'Failed to save sessions. Please try again.');
        return;
      }

      console.log('✅ Sessions saved successfully');

      // Find the newly added session
      const newlyAdded = selectedSessions.filter(id => !currentSessions.includes(id));
      if (newlyAdded.length > 0) {
        const newSession = AVAILABLE_SESSIONS[newlyAdded[0]];
        onSessionAdded(newSession);
      }

      onClose();
    } catch (error: any) {
      console.error('❌ Error saving sessions full details:', JSON.stringify(error, null, 2));
      console.error('❌ Error message:', error?.message);
      console.error('❌ Error code:', error?.code);
      console.error('❌ Error details:', error?.details);
      Alert.alert('Error', `Failed to save sessions: ${error?.message || 'Unknown error'}. Please try again.`);
    } finally {
      setSaving(false);
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
            <Ionicons name="close" size={24} color={Colors.text} />
          </TouchableOpacity>
          <Text style={styles.title}>Add More Sessions</Text>
          <TouchableOpacity 
            onPress={handleSave} 
            style={[styles.saveButton, saving && styles.saveButtonDisabled]}
            disabled={saving}
          >
            <Text style={styles.saveButtonText}>
              {saving ? 'Saving...' : 'Save'}
            </Text>
          </TouchableOpacity>
        </View>

        <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
          {/* Current Sessions */}
          {currentSessions.length > 0 && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Current Sessions</Text>
              <View style={styles.currentSessionsContainer}>
                {currentSessions.map(sessionId => {
                  const session = AVAILABLE_SESSIONS[sessionId];
                  if (!session) return null;
                  return (
                    <View key={sessionId} style={styles.currentSessionChip}>
                      <Text style={styles.sessionEmoji}>{session.emoji}</Text>
                      <Text style={styles.currentSessionText}>{session.name}</Text>
                    </View>
                  );
                })}
              </View>
            </View>
          )}

          {/* Available Sessions */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>
              {currentSessions.length > 0 ? 'Available Sessions' : 'Choose Your Sessions'}
            </Text>
            <Text style={styles.sectionSubtitle}>
              Select the activities you'd like to add to your home screen
            </Text>

            {availableSessionsList.length === 0 ? (
              <View style={styles.emptyState}>
                <Ionicons name="checkmark-circle" size={48} color={Colors.success} />
                <Text style={styles.emptyStateText}>You've added all available sessions!</Text>
              </View>
            ) : (
              <View style={styles.sessionsGrid}>
                {availableSessionsList.map(session => (
                  <TouchableOpacity
                    key={session.id}
                    style={[
                      styles.sessionCard,
                      selectedSessions.includes(session.id) && styles.selectedSessionCard
                    ]}
                    onPress={() => toggleSession(session.id)}
                    activeOpacity={0.7}
                  >
                    <View style={styles.sessionContent}>
                      <View style={[styles.sessionIcon, { backgroundColor: session.color + '20' }]}>
                        <Text style={styles.sessionEmoji}>{session.emoji}</Text>
                      </View>
                      <Text style={styles.sessionName}>{session.name}</Text>
                      {selectedSessions.includes(session.id) && (
                        <View style={[styles.checkIcon, { backgroundColor: session.color }]}>
                          <Ionicons name="checkmark" size={16} color="white" />
                        </View>
                      )}
                    </View>
                  </TouchableOpacity>
                ))}
              </View>
            )}
          </View>
        </ScrollView>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: Colors.cardBorder,
    backgroundColor: Colors.surface,
  },
  closeButton: {
    padding: 8,
  },
  title: {
    fontSize: 18,
    fontWeight: 'bold',
    color: Colors.text,
  },
  saveButton: {
    paddingHorizontal: 20,
    paddingVertical: 8,
    backgroundColor: Colors.primary,
    borderRadius: 20,
  },
  saveButtonDisabled: {
    opacity: 0.6,
  },
  saveButtonText: {
    color: 'white',
    fontWeight: '600',
  },
  content: {
    flex: 1,
    padding: 20,
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: Colors.text,
    marginBottom: 8,
  },
  sectionSubtitle: {
    fontSize: 14,
    color: Colors.textSecondary,
    marginBottom: 16,
  },
  currentSessionsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  currentSessionChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.primary + '20',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: Colors.primary + '40',
  },
  currentSessionText: {
    fontSize: 14,
    color: Colors.primary,
    fontWeight: '500',
    marginLeft: 4,
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 32,
  },
  emptyStateText: {
    fontSize: 16,
    color: Colors.textSecondary,
    marginTop: 8,
    textAlign: 'center',
  },
  sessionsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  sessionCard: {
    width: '48%',
    backgroundColor: Colors.surface,
    borderRadius: 16,
    borderWidth: 2,
    borderColor: Colors.cardBorder,
    padding: 16,
    marginBottom: 16,
    alignItems: 'center',
  },
  selectedSessionCard: {
    borderColor: '#8b5cf6',
    backgroundColor: '#8b5cf6' + '10',
  },
  sessionContent: {
    alignItems: 'center',
  },
  sessionIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  sessionEmoji: {
    fontSize: 24,
  },
  sessionName: {
    fontSize: 12,
    fontWeight: '600',
    color: Colors.text,
    textAlign: 'center',
  },
  checkIcon: {
    position: 'absolute',
    top: -4,
    right: -4,
    width: 20,
    height: 20,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#8b5cf6',
  },
});