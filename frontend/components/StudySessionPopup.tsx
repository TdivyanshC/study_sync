import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Dimensions,
  Modal,
  Animated,
  Pressable,
} from 'react-native';
import LottieView from 'lottie-react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '../constants/Colors';

const { width } = Dimensions.get('window');

const funnyPrompts = [
  "Ready to start your study session?",
  "Time to focus and get things done!",
  "Let's make this study session count!",
  "Are you prepared to lock in?",
  "Ready to maximize your productivity?"
];

const confirmButtons = [
  "Yes, I'm Ready",
  "Start Session",
  "Let's Begin",
];

const cancelButtons = [
  "Not Yet",
  "Maybe Later",
  "Cancel"
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
  const slideAnim = useRef(new Animated.Value(100)).current;
  const avatarAnim = useRef(new Animated.Value(0.8)).current;
  const opacityAnim = useRef(new Animated.Value(0)).current;
  
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

      // Reset animations
      slideAnim.setValue(100);
      avatarAnim.setValue(0.8);
      opacityAnim.setValue(0);

      // Enhanced entrance animations
      Animated.parallel([
        Animated.spring(slideAnim, {
          toValue: 0,
          tension: 80,
          friction: 8,
          useNativeDriver: true,
        }),
        Animated.spring(avatarAnim, {
          toValue: 1,
          tension: 120,
          friction: 6,
          useNativeDriver: true,
        }),
        Animated.timing(opacityAnim, {
          toValue: 1,
          duration: 250,
          useNativeDriver: true,
        }),
      ]).start();

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
    Animated.parallel([
      Animated.timing(slideAnim, {
        toValue: 100,
        duration: 200,
        useNativeDriver: true,
      }),
      Animated.timing(opacityAnim, {
        toValue: 0,
        duration: 200,
        useNativeDriver: true,
      }),
    ]).start(() => {
      onConfirm();
    });
  };

  const handleCancel = () => {
    Animated.parallel([
      Animated.timing(slideAnim, {
        toValue: 100,
        duration: 200,
        useNativeDriver: true,
      }),
      Animated.timing(opacityAnim, {
        toValue: 0,
        duration: 200,
        useNativeDriver: true,
      }),
    ]).start(() => {
      onCancel();
    });
  };

  const handleBackdropPress = () => {
    handleCancel();
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="none"
      onRequestClose={handleCancel}
    >
      <Pressable style={styles.overlay} onPress={handleBackdropPress}>
        <Animated.View 
          style={[
            styles.sheet, 
            { 
              height: sheetHeight,
              transform: [{ translateY: slideAnim }],
              opacity: opacityAnim,
            }
          ]}
        >
          {/* Cross Button */}
          <TouchableOpacity style={styles.closeButton} onPress={handleCancel}>
            <Ionicons name="close" size={24} color={Colors.text} />
          </TouchableOpacity>

          {/* Handle Bar */}
          <View style={styles.handleBar} />

          <View style={styles.content}>
            {/* Avatar Lottie */}
            <Animated.View 
              style={[
                styles.avatarContainer,
                {
                  transform: [
                    { scale: avatarAnim },
                    { rotate }
                  ],
                }
              ]}
            >
              <LottieView
                source={require('../assets/animations/checkmark_success.json')}
                autoPlay
                loop
                speed={1}
                onAnimationFinish={() => console.log('Lottie finished')}
                onAnimationFailure={(error) => console.log('Lottie error:', error)}
                style={styles.avatar}
              />
            </Animated.View>

            {/* Text Messages */}
            <View style={styles.textContainer}>
              <Text style={styles.promptText}>{currentPrompt}</Text>
              <Text style={styles.subText}>
                This will help you track your study progress and maintain focus throughout your session.
              </Text>
            </View>
          </View>
        </Animated.View>

        {/* Bottom Buttons - Outside parent container */}
        <View style={styles.bottomButtons}>
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
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.45)',
    backdropFilter: 'blur(20px)',
  },
  sheet: {
    position: 'absolute',
    bottom: 100, // Leave space for buttons
    left: 0,
    right: 0,
    top: 0,
    backgroundColor: 'rgba(255, 255, 255, 0.12)',
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -8 },
    shadowOpacity: 0.15,
    shadowRadius: 25,
    elevation: 20,
    alignItems: 'center',
    borderWidth: 0.5,
    borderColor: 'rgba(255, 255, 255, 0.2)',
    backdropFilter: 'blur(25px)',
  },
  handleBar: {
    width: 40,
    height: 5,
    backgroundColor: 'rgba(255, 255, 255, 0.4)',
    borderRadius: 2.5,
    marginTop: 12,
    marginBottom: 20,
  },
  closeButton: {
    position: 'absolute',
    top: 16,
    right: 20,
    padding: 12,
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    borderRadius: 24,
    zIndex: 1,
    backdropFilter: 'blur(10px)',
  },
  content: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'flex-start',
    width: '100%',
    paddingTop: 60,
    paddingHorizontal: 24,
  },
  avatarContainer: {
    marginBottom: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatar: {
    width: width * 0.3,
    height: width * 0.3,
    alignItems: 'center',
    justifyContent: 'center',
  },
  textContainer: {
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  promptText: {
    fontSize: 20,
    color: Colors.text,
    textAlign: 'center',
    fontWeight: '600',
    lineHeight: 26,
    opacity: 0.9,
    marginBottom: 12,
  },
  subText: {
    fontSize: 16,
    color: Colors.text,
    textAlign: 'center',
    fontWeight: '400',
    lineHeight: 22,
    opacity: 0.7,
  },
  bottomButtons: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    backgroundColor: 'rgba(255, 255, 255, 0.12)',
    borderTopLeftRadius: 0,
    borderTopRightRadius: 0,
    borderWidth: 0.5,
    borderColor: 'rgba(255, 255, 255, 0.2)',
    backdropFilter: 'blur(25px)',
  },
  confirmButton: {
    backgroundColor: Colors.primary,
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    height: 70,
    borderRadius: 0,
  },
  confirmButtonText: {
    color: Colors.text,
    fontSize: 16,
    fontWeight: '600',
  },
  cancelButton: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    height: 70,
    borderRadius: 0,
    borderLeftWidth: 1,
    borderLeftColor: 'rgba(255, 255, 255, 0.1)',
  },
  cancelButtonText: {
    color: Colors.text,
    fontSize: 16,
    fontWeight: '600',
    opacity: 0.8,
  },
});