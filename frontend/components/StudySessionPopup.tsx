import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Dimensions,
  Modal,
  Animated,
} from 'react-native';
import LottieView from 'lottie-react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '../constants/Colors';

const { width } = Dimensions.get('window');

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

  const rotation = useRef(new Animated.Value(0)).current;
  const { height } = Dimensions.get('window');
  const sheetHeight = height * 0.9;

  useEffect(() => {
    if (visible) {
      const randomPrompt = funnyPrompts[Math.floor(Math.random() * funnyPrompts.length)];
      const randomConfirm = confirmButtons[Math.floor(Math.random() * confirmButtons.length)];
      const randomCancel = cancelButtons[Math.floor(Math.random() * cancelButtons.length)];

      setCurrentPrompt(randomPrompt);
      setConfirmText(randomConfirm);
      setCancelText(randomCancel);

      // Start rotation animation
      Animated.loop(
        Animated.timing(rotation, {
          toValue: 1,
          duration: 2000,
          useNativeDriver: true,
        })
      ).start();
    } else {
      rotation.setValue(0);
    }
  }, [visible]);

  const rotate = rotation.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '360deg'],
  });

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
      animationType="none"
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
            {/* Avatar Lottie */}
            <View style={styles.avatarContainer}>
              <LottieView
                source={require('../assets/animations/checkmark_success.json')}
                autoPlay
                loop
                speed={1}
                onAnimationFinish={() => console.log('Lottie finished')}
                onAnimationFailure={(error) => console.log('Lottie error:', error)}
                style={styles.avatar}
              />
            </View>

            {/* Prompt Text */}
            <View style={styles.textContainer}>
              <Text style={styles.promptText}>{currentPrompt}</Text>
            </View>

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
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
  },
  overlayTouchable: {
    ...StyleSheet.absoluteFillObject,
  },
  sheet: {
    position: 'absolute',
    bottom: 0,
    width: width,
    backgroundColor: Colors.surface,
    borderTopLeftRadius: 32,
    borderTopRightRadius: 32,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.3,
    shadowRadius: 16,
    elevation: 20,
    alignItems: 'center',
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
    justifyContent: 'space-between',
    width: '100%',
    paddingTop: 60, // Space for close button
  },
  avatarContainer: {
    flex: 0.5, // 50% of content height
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatar: {
    width: width * 0.4, // 40% of screen width
    height: width * 0.4,
    alignItems: 'center',
    justifyContent: 'center',
  },
  textContainer: {
    flex: 0.3, // 30% for text
    justifyContent: 'center',
    alignItems: 'center',
  },
  promptText: {
    fontSize: 18,
    color: Colors.text,
    textAlign: 'center',
    fontWeight: '600',
    lineHeight: 24,
  },
  buttonContainer: {
    flex: 0.2, // 20% for buttons
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: '100%',
  },
  confirmButton: {
    backgroundColor: Colors.primary,
    flex: 1,
    marginRight: 12,
    alignItems: 'center',
    justifyContent: 'center',
    height: 60, // Increased height
    borderRadius: 12,
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
    flex: 1,
    marginLeft: 12,
    alignItems: 'center',
    justifyContent: 'center',
    height: 60, // Increased height
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.cardBorder,
  },
  cancelButtonText: {
    color: Colors.text,
    fontSize: 16,
    fontWeight: '600',
  },
});