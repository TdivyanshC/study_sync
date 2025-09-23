import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Modal,
  TextInput,
  FlatList,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '../constants/Colors';
import { GlobalStyles } from '../constants/Theme';

// Mock data for spaces/rooms
const mockSpaces = [
  {
    id: '1',
    name: 'CS Study Squad',
    description: 'Computer Science group study',
    members: 8,
    active: 3,
    icon: '💻',
    isJoined: true,
    currentSession: true,
  },
  {
    id: '2',
    name: 'Math Wizards',
    description: 'Advanced mathematics study group',
    members: 12,
    active: 5,
    icon: '📐',
    isJoined: true,
    currentSession: false,
  },
  {
    id: '3',
    name: 'Physics Lab',
    description: 'Physics problem solving sessions',
    members: 6,
    active: 2,
    icon: '⚛️',
    isJoined: false,
    currentSession: false,
  },
  {
    id: '4',
    name: 'Language Learners',
    description: 'Practice languages together',
    members: 15,
    active: 7,
    icon: '🌍',
    isJoined: false,
    currentSession: true,
  },
];

interface SpaceCardProps {
  space: typeof mockSpaces[0];
  onJoin: () => void;
  onEnter: () => void;
  onStartStreak: () => void;
}

const SpaceCard: React.FC<SpaceCardProps> = ({ space, onJoin, onEnter, onStartStreak }) => {
  return (
    <View style={[GlobalStyles.glassCard, styles.spaceCard]}>
      {/* Header */}
      <View style={styles.spaceHeader}>
        <View style={styles.spaceIcon}>
          <Text style={styles.iconText}>{space.icon}</Text>
        </View>
        <View style={styles.spaceInfo}>
          <Text style={styles.spaceName}>{space.name}</Text>
          <Text style={GlobalStyles.textSecondary}>{space.description}</Text>
        </View>
        {space.currentSession && (
          <View style={styles.liveBadge}>
            <Text style={styles.liveText}>LIVE</Text>
          </View>
        )}
      </View>

      {/* Stats */}
      <View style={styles.spaceStats}>
        <View style={styles.statItem}>
          <Ionicons name="people" size={16} color={Colors.textSecondary} />
          <Text style={[GlobalStyles.textSecondary, { marginLeft: 6 }]}>
            {space.members} members
          </Text>
        </View>
        <View style={styles.statItem}>
          <Ionicons 
            name="radio-button-on" 
            size={16} 
            color={space.active > 0 ? Colors.success : Colors.textMuted} 
          />
          <Text style={[GlobalStyles.textSecondary, { marginLeft: 6 }]}>
            {space.active} active now
          </Text>
        </View>
      </View>

      {/* Actions */}
      <View style={styles.spaceActions}>
        {space.isJoined ? (
          <>
            <TouchableOpacity style={styles.primaryButton} onPress={onEnter}>
              <Ionicons name="enter" size={18} color={Colors.text} />
              <Text style={styles.primaryButtonText}>Enter Space</Text>
            </TouchableOpacity>
            
            <TouchableOpacity style={styles.secondaryButton} onPress={onStartStreak}>
              <Ionicons name="flame" size={18} color={Colors.fire} />
              <Text style={[styles.secondaryButtonText, { color: Colors.fire }]}>
                Start Streak
              </Text>
            </TouchableOpacity>
          </>
        ) : (
          <TouchableOpacity style={styles.joinButton} onPress={onJoin}>
            <Ionicons name="add" size={18} color={Colors.primary} />
            <Text style={styles.joinButtonText}>Join Space</Text>
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
};

export default function SpacesScreen() {
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [spaceName, setSpaceName] = useState('');
  const [spaceDescription, setSpaceDescription] = useState('');

  const handleJoinSpace = (spaceId: string) => {
    // TODO: Implement join space functionality
    console.log('Joining space:', spaceId);
  };

  const handleEnterSpace = (spaceId: string) => {
    // TODO: Implement enter space functionality
    console.log('Entering space:', spaceId);
  };

  const handleStartStreak = (spaceId: string) => {
    // TODO: Implement start streak functionality
    console.log('Starting streak in space:', spaceId);
  };

  const handleCreateSpace = () => {
    // TODO: Implement create space functionality
    console.log('Creating space:', spaceName, spaceDescription);
    setShowCreateModal(false);
    setSpaceName('');
    setSpaceDescription('');
  };

  const renderSpaceCard = ({ item }: { item: typeof mockSpaces[0] }) => (
    <SpaceCard
      space={item}
      onJoin={() => handleJoinSpace(item.id)}
      onEnter={() => handleEnterSpace(item.id)}
      onStartStreak={() => handleStartStreak(item.id)}
    />
  );

  return (
    <SafeAreaView style={GlobalStyles.safeArea}>
      <StatusBar style="light" backgroundColor={Colors.background} />
      
      {/* Header */}
      <View style={styles.header}>
        <Text style={GlobalStyles.title}>Study Spaces</Text>
        <Text style={GlobalStyles.textSecondary}>
          Join groups and study together
        </Text>
      </View>

      {/* Create Space Button */}
      <TouchableOpacity 
        style={[GlobalStyles.glassCard, styles.createButton]}
        onPress={() => setShowCreateModal(true)}
      >
        <Ionicons name="add-circle" size={32} color={Colors.primary} />
        <Text style={styles.createButtonText}>Create New Space</Text>
        <Text style={GlobalStyles.textMuted}>
          Start your own study group
        </Text>
      </TouchableOpacity>

      {/* Spaces List */}
      <FlatList
        data={mockSpaces}
        renderItem={renderSpaceCard}
        keyExtractor={(item) => item.id}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 100 }}
      />

      {/* Create Space Modal */}
      <Modal
        visible={showCreateModal}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setShowCreateModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Create New Space</Text>
              <TouchableOpacity onPress={() => setShowCreateModal(false)}>
                <Ionicons name="close" size={24} color={Colors.textSecondary} />
              </TouchableOpacity>
            </View>

            <TextInput
              style={styles.input}
              placeholder="Space name"
              placeholderTextColor={Colors.textMuted}
              value={spaceName}
              onChangeText={setSpaceName}
            />

            <TextInput
              style={[styles.input, styles.textArea]}
              placeholder="Description (optional)"
              placeholderTextColor={Colors.textMuted}
              value={spaceDescription}
              onChangeText={setSpaceDescription}
              multiline
              numberOfLines={3}
            />

            <View style={styles.modalActions}>
              <TouchableOpacity 
                style={styles.cancelButton}
                onPress={() => setShowCreateModal(false)}
              >
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>

              <TouchableOpacity 
                style={[
                  styles.createModalButton,
                  { opacity: spaceName.trim() ? 1 : 0.5 }
                ]}
                onPress={handleCreateSpace}
                disabled={!spaceName.trim()}
              >
                <Text style={styles.createModalButtonText}>Create</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  header: {
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 16,
    alignItems: 'center',
  },
  createButton: {
    alignItems: 'center',
    paddingVertical: 24,
    marginHorizontal: 16,
    marginBottom: 20,
  },
  createButtonText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: Colors.text,
    marginTop: 8,
    marginBottom: 4,
  },
  spaceCard: {
    marginBottom: 16,
  },
  spaceHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 16,
  },
  spaceIcon: {
    width: 48,
    height: 48,
    borderRadius: 12,
    backgroundColor: Colors.surfaceElevated,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 16,
  },
  iconText: {
    fontSize: 24,
  },
  spaceInfo: {
    flex: 1,
  },
  spaceName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: Colors.text,
    marginBottom: 4,
  },
  liveBadge: {
    backgroundColor: Colors.error,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  liveText: {
    color: Colors.text,
    fontSize: 10,
    fontWeight: 'bold',
  },
  spaceStats: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  statItem: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  spaceActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  primaryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.primary,
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 12,
    flex: 0.48,
    justifyContent: 'center',
  },
  primaryButtonText: {
    color: Colors.text,
    fontSize: 14,
    fontWeight: '600',
    marginLeft: 6,
  },
  secondaryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 107, 53, 0.1)',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 12,
    flex: 0.48,
    justifyContent: 'center',
  },
  secondaryButtonText: {
    fontSize: 14,
    fontWeight: '600',
    marginLeft: 6,
  },
  joinButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(99, 102, 241, 0.1)',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 12,
    flex: 1,
    justifyContent: 'center',
  },
  joinButtonText: {
    color: Colors.primary,
    fontSize: 14,
    fontWeight: '600',
    marginLeft: 6,
  },
  // Modal Styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: Colors.surface,
    borderRadius: 20,
    padding: 24,
    width: '90%',
    maxWidth: 400,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 24,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: Colors.text,
  },
  input: {
    backgroundColor: Colors.surfaceElevated,
    borderRadius: 12,
    padding: 16,
    color: Colors.text,
    fontSize: 16,
    marginBottom: 16,
  },
  textArea: {
    height: 80,
    textAlignVertical: 'top',
  },
  modalActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 16,
  },
  cancelButton: {
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 12,
    backgroundColor: Colors.surfaceElevated,
    flex: 0.45,
    alignItems: 'center',
  },
  cancelButtonText: {
    color: Colors.textSecondary,
    fontSize: 16,
    fontWeight: '600',
  },
  createModalButton: {
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 12,
    backgroundColor: Colors.primary,
    flex: 0.45,
    alignItems: 'center',
  },
  createModalButtonText: {
    color: Colors.text,
    fontSize: 16,
    fontWeight: '600',
  },
});