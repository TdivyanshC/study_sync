import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Dimensions,
  Modal,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '../constants/Colors';

const { width, height } = Dimensions.get('window');
const isTablet = width > 600;
const sheetHeight = isTablet ? height * 0.3 : height * 0.4;

const funnyPrompts = [
  "Okay champ, no distractions — not even from your baby 😭?",
  "Be honest… are you actually gonna study or just scroll memes again? 👀",
  "Bro, don't lie. Your crush hasn't texted you since 2022 💀",
  "Time to lock in… unless you still need to check WhatsApp 👀",
  "Focus mode ON — brain cells, please don't fail us today 🧠🔥"
];

const confirmButtons = [
  "Yeah I'm serious 😎",
  "Let's lock in 🔒🔥",
  "Send me to the grind 😤",
];

const cancelButtons = [
  "Wait let me check something 😭",
  "No no wait I wasn't ready 💀",
  "Give me 2 minutes bro 🙏"
];

interface StudySessionPopupProps {
  visible: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

export default function StudySessionPopup({ visible, onConfirm, onCancel }: StudySessionPopupProps) {
  const [currentPrompt, setCurrentPrompt] = useState('');
  const [confirmText, setConfirmText] = useState('');
  const [cancelText, setCancelText] = useState('');

  useEffect(() => {
    if (visible) {
      const randomPrompt = funnyPrompts[Math.floor(Math.random() * funnyPrompts.length)];
      const randomConfirm = confirmButtons[Math.floor(Math.random() * confirmButtons.length)];
      const randomCancel = cancelButtons[Math.floor(Math.random() * cancelButtons.length)];

      setCurrentPrompt(randomPrompt);
      setConfirmText(randomConfirm);
      setCancelText(randomCancel);
    }
  }, [visible]);

  const handleConfirm = () => {
    onConfirm();
  };

  const handleCancel = () => {
    onCancel();
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={handleCancel}
    >
      <View style={styles.overlay}>
        <TouchableOpacity style={styles.overlayTouchable} onPress={handleCancel} />

        <View style={[styles.sheet, { height: sheetHeight }]}>
          {/* Cross Button */}
          <TouchableOpacity style={styles.closeButton} onPress={handleCancel}>
            <Ionicons name="close" size={24} color={Colors.text} />
          </TouchableOpacity>

          <View style={styles.content}>
            {/* Avatar */}
            <View style={styles.avatarContainer}>
              <Text style={{ fontSize: 40, color: Colors.text }}>🎓</Text>
            </View>

            {/* Prompt Text */}
            <Text style={styles.promptText}>{currentPrompt}</Text>

            {/* Buttons */}
            <View style={styles.buttonContainer}>
              <TouchableOpacity
                style={styles.confirmButton}
                onPress={handleConfirm}
                activeOpacity={0.8}
              >
                <Text style={styles.confirmButtonText}>{confirmText}</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.cancelButton}
                onPress={handleCancel}
                activeOpacity={0.8}
              >
                <Text style={styles.cancelButtonText}>{cancelText}</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    justifyContent: 'flex-end',
  },
  overlayTouchable: {
    ...StyleSheet.absoluteFillObject,
  },
  sheet: {
    width: width,
    backgroundColor: Colors.surface,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 20,
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 40,
  },
  closeButton: {
    position: 'absolute',
    top: 16,
    right: 16,
    padding: 8,
    backgroundColor: Colors.surfaceElevated,
    borderRadius: 20,
    zIndex: 1,
  },
  content: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
  },
  avatarContainer: {
    marginBottom: 20,
  },
  avatar: {
    width: 100,
    height: 100,
    alignItems: 'center',
    justifyContent: 'center',
  },
  promptText: {
    fontSize: 18,
    color: Colors.text,
    textAlign: 'center',
    marginBottom: 30,
    fontWeight: '600',
    lineHeight: 24,
  },
  buttonContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: '100%',
  },
  confirmButton: {
    backgroundColor: Colors.primary,
    paddingVertical: 16,
    paddingHorizontal: 24,
    borderRadius: 12,
    flex: 1,
    marginRight: 12,
    alignItems: 'center',
    shadowColor: Colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  confirmButtonText: {
    color: Colors.text,
    fontSize: 16,
    fontWeight: 'bold',
  },
  cancelButton: {
    backgroundColor: Colors.surfaceElevated,
    paddingVertical: 16,
    paddingHorizontal: 24,
    borderRadius: 12,
    flex: 1,
    marginLeft: 12,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: Colors.cardBorder,
  },
  cancelButtonText: {
    color: Colors.text,
    fontSize: 16,
    fontWeight: '600',
  },
});