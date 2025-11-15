import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Dimensions,
  Modal,
} from 'react-native';
import LottieView from 'lottie-react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
  runOnJS,
} from 'react-native-reanimated';
import { BlurView } from 'expo-blur';

const { width, height } = Dimensions.get('window');

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
  const [avatarSource, setAvatarSource] = useState(require('../assets/animations/avatar 1.json'));
  const [showCelebration, setShowCelebration] = useState(false);

  const overlayOpacity = useSharedValue(0);
  const sheetTranslateY = useSharedValue(height);
  const sheetOpacity = useSharedValue(0);
  const avatarScale = useSharedValue(0.85);

  useEffect(() => {
    if (visible) {
      const randomPrompt = funnyPrompts[Math.floor(Math.random() * funnyPrompts.length)];
      const randomConfirm = confirmButtons[Math.floor(Math.random() * confirmButtons.length)];
      const randomCancel = cancelButtons[Math.floor(Math.random() * cancelButtons.length)];

      setCurrentPrompt(randomPrompt);
      setConfirmText(randomConfirm);
      setCancelText(randomCancel);
      setAvatarSource(require('../assets/animations/avatar 1.json'));
      setShowCelebration(false);

      // Animate in
      overlayOpacity.value = withTiming(0.45, { duration: 300 });
      sheetTranslateY.value = withSpring(0, { damping: 12, stiffness: 100 });
      sheetOpacity.value = withTiming(1, { duration: 300 });
      avatarScale.value = withSpring(1.07, { damping: 8 }, () => {
        avatarScale.value = withSpring(1, { damping: 8 });
      });
    } else {
      // Animate out
      overlayOpacity.value = withTiming(0, { duration: 200 });
      sheetTranslateY.value = withSpring(height, { damping: 12, stiffness: 100 });
      sheetOpacity.value = withTiming(0, { duration: 200 });
    }
  }, [visible]);

  const overlayStyle = useAnimatedStyle(() => ({
    opacity: overlayOpacity.value,
  }));

  const sheetStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: sheetTranslateY.value }],
    opacity: sheetOpacity.value,
  }));

  const avatarStyle = useAnimatedStyle(() => ({
    transform: [{ scale: avatarScale.value }],
  }));

  const handleConfirm = () => {
    // Swap to happy avatar
    setAvatarSource(require('../assets/animations/avatar 1.json')); // Placeholder, since avatar_happy not exist
    // Play happy animation, then show celebration
    setTimeout(() => {
      setShowCelebration(true);
      setTimeout(() => {
        setShowCelebration(false);
        runOnJS(onConfirm)();
      }, 1000);
    }, 500); // Assume happy animation duration
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
      <Animated.View style={[styles.overlay, overlayStyle]}>
        <TouchableOpacity style={styles.overlayTouchable} onPress={handleCancel} />

        {/* Floating Avatar */}
        <Animated.View style={[styles.avatarContainer, avatarStyle]}>
          <LottieView
            source={avatarSource}
            autoPlay
            loop={!showCelebration}
            style={styles.avatar}
          />
        </Animated.View>

        {/* Bottom Sheet */}
        <Animated.View style={[styles.sheet, sheetStyle]}>
          <BlurView intensity={25} style={styles.blurContainer}>
            <View style={styles.content}>
              <Text style={styles.promptText}>{currentPrompt}</Text>
              <View style={styles.buttonContainer}>
                <TouchableOpacity style={styles.confirmButton} onPress={handleConfirm}>
                  <Text style={styles.confirmButtonText}>{confirmText}</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.cancelButton} onPress={handleCancel}>
                  <Text style={styles.cancelButtonText}>{cancelText}</Text>
                </TouchableOpacity>
              </View>
            </View>
          </BlurView>
        </Animated.View>

        {/* Celebration Overlay */}
        {showCelebration && (
          <View style={styles.celebrationContainer}>
            <LottieView
              source={require('../assets/animations/Loading 50 _ Among Us.json')} // Placeholder for celebration
              autoPlay
              loop={false}
              style={styles.celebration}
            />
          </View>
        )}
      </Animated.View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.45)',
    justifyContent: 'flex-end',
  },
  overlayTouchable: {
    ...StyleSheet.absoluteFillObject,
  },
  avatarContainer: {
    position: 'absolute',
    top: height * 0.3 - 60, // Above the sheet
    left: width / 2 - 60,
    width: 120,
    height: 120,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatar: {
    width: 120,
    height: 120,
  },
  sheet: {
    height: height * 0.7,
    width: width,
  },
  blurContainer: {
    flex: 1,
    borderTopLeftRadius: 32,
    borderTopRightRadius: 32,
    overflow: 'hidden',
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.18)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.1,
    shadowRadius: 10,
    elevation: 10,
  },
  content: {
    flex: 1,
    padding: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  promptText: {
    fontSize: 18,
    color: '#fff',
    textAlign: 'center',
    marginBottom: 30,
    fontWeight: '600',
  },
  buttonContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: '100%',
  },
  confirmButton: {
    backgroundColor: '#4CAF50',
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 12,
    flex: 1,
    marginRight: 10,
    alignItems: 'center',
  },
  confirmButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  cancelButton: {
    backgroundColor: '#f44336',
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 12,
    flex: 1,
    marginLeft: 10,
    alignItems: 'center',
  },
  cancelButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  celebrationContainer: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  celebration: {
    width: width,
    height: height,
  },
});