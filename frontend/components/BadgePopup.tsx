import React, { useEffect, useRef } from 'react';
import {
  View,
  Text,
  Modal,
  StyleSheet,
  Animated,
  Dimensions,
  Pressable,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '../constants/Colors';

const { width, height } = Dimensions.get('window');

interface BadgePopupProps {
  visible: boolean;
  badgeTitle: string;
  badgeDescription?: string;
  onClose: () => void;
}

const BadgePopup: React.FC<BadgePopupProps> = ({
  visible,
  badgeTitle,
  badgeDescription,
  onClose
}) => {
  const scaleAnim = useRef(new Animated.Value(0)).current;
  const opacityAnim = useRef(new Animated.Value(0)).current;
  const bounceAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(40)).current;
  const avatarAnim = useRef(new Animated.Value(0.92)).current;

  useEffect(() => {
    if (visible) {
      // Reset animations
      scaleAnim.setValue(0);
      opacityAnim.setValue(0);
      bounceAnim.setValue(0);
      slideAnim.setValue(40);
      avatarAnim.setValue(0.92);

      // Start entrance animation
      Animated.parallel([
        Animated.spring(scaleAnim, {
          toValue: 1,
          tension: 50,
          friction: 7,
          useNativeDriver: true,
        }),
        Animated.timing(opacityAnim, {
          toValue: 1,
          duration: 250,
          useNativeDriver: true,
        }),
        Animated.spring(slideAnim, {
          toValue: 0,
          tension: 80,
          friction: 8,
          useNativeDriver: true,
        }),
        Animated.sequence([
          Animated.delay(150),
          Animated.spring(avatarAnim, {
            toValue: 1,
            tension: 120,
            friction: 6,
            useNativeDriver: true,
          }),
        ]),
        Animated.sequence([
          Animated.delay(200),
          Animated.spring(bounceAnim, {
            toValue: 1,
            tension: 100,
            friction: 10,
            useNativeDriver: true,
          }),
        ]),
      ]).start();

      // Auto close after 3 seconds
      const timer = setTimeout(() => {
        handleClose();
      }, 3000);

      return () => clearTimeout(timer);
    }
  }, [visible]);

  const handleClose = () => {
    Animated.parallel([
      Animated.timing(scaleAnim, {
        toValue: 0,
        duration: 200,
        useNativeDriver: true,
      }),
      Animated.timing(opacityAnim, {
        toValue: 0,
        duration: 200,
        useNativeDriver: true,
      }),
      Animated.timing(slideAnim, {
        toValue: 40,
        duration: 200,
        useNativeDriver: true,
      }),
    ]).start(() => {
      onClose();
    });
  };

  const handleBackdropPress = () => {
    handleClose();
  };

  const getBadgeIcon = (title: string) => {
    const iconMap: { [key: string]: string } = {
      'First Steps': 'walk',
      '7 Day Streak': 'flame',
      '10 Hour Grind': 'time',
      'Level Up': 'trophy',
      'Social Butterfly': 'people',
    };

    // Default icon based on title keywords
    if (title.toLowerCase().includes('streak') || title.toLowerCase().includes('fire')) {
      return 'flame';
    }
    if (title.toLowerCase().includes('time') || title.toLowerCase().includes('hour')) {
      return 'time';
    }
    if (title.toLowerCase().includes('level') || title.toLowerCase().includes('trophy')) {
      return 'trophy';
    }
    if (title.toLowerCase().includes('social') || title.toLowerCase().includes('people')) {
      return 'people';
    }

    return 'star'; // Default
  };

  return (
    <Modal
      visible={visible}
      transparent={true}
      animationType="none"
      onRequestClose={handleClose}
    >
      <Pressable style={styles.overlay} onPress={handleBackdropPress}>
        <Animated.View
          style={[
            styles.popup,
            {
              transform: [
                { scale: scaleAnim },
                { translateY: slideAnim }
              ],
              opacity: opacityAnim,
            },
          ]}
        >
          {/* Handle Bar */}
          <View style={styles.handleBar} />
          
          {/* Confetti effect */}
          <View style={styles.confettiContainer}>
            {[...Array(6)].map((_, i) => (
              <Animated.View
                key={i}
                style={[
                  styles.confetti,
                  {
                    left: `${20 + i * 12}%`,
                    transform: [{ scale: bounceAnim }],
                    opacity: bounceAnim,
                  },
                ]}
              >
                <Text style={styles.confettiEmoji}>🎉</Text>
              </Animated.View>
            ))}
          </View>

          {/* Badge content */}
          <View style={styles.content}>
            <Animated.View 
              style={[
                styles.iconContainer,
                {
                  transform: [{ scale: avatarAnim }],
                }
              ]}
            >
              <Ionicons
                name={getBadgeIcon(badgeTitle)}
                size={48}
                color={Colors.accent}
              />
            </Animated.View>

            <Text style={styles.title}>Achievement Unlocked!</Text>
            <Text style={styles.badgeTitle}>{badgeTitle}</Text>
            {badgeDescription && (
              <Text style={styles.description}>{badgeDescription}</Text>
            )}
          </View>
        </Animated.View>
      </Pressable>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.45)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  popup: {
    backgroundColor: 'rgba(255, 255, 255, 0.12)',
    borderRadius: 28,
    padding: 20,
    paddingTop: 16,
    width: Math.min(width * 0.9, 380),
    maxWidth: 380,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.15,
    shadowRadius: 20,
    elevation: 15,
    borderWidth: 0.5,
    borderColor: 'rgba(255, 255, 255, 0.2)',
    backdropFilter: 'blur(25px)',
  },
  handleBar: {
    width: 40,
    height: 5,
    backgroundColor: 'rgba(255, 255, 255, 0.4)',
    borderRadius: 2.5,
    marginBottom: 16,
  },
  confettiContainer: {
    position: 'absolute',
    top: -20,
    left: 0,
    right: 0,
    height: 40,
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  confetti: {
    position: 'absolute',
    top: 0,
  },
  confettiEmoji: {
    fontSize: 24,
  },
  content: {
    alignItems: 'center',
    width: '100%',
  },
  iconContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: Colors.surfaceElevated,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 5,
  },
  title: {
    fontSize: 22,
    fontWeight: '600',
    color: Colors.primary,
    marginBottom: 12,
    textAlign: 'center',
    opacity: 0.9,
  },
  badgeTitle: {
    fontSize: 24,
    fontWeight: '600',
    color: Colors.text,
    marginBottom: 16,
    textAlign: 'center',
  },
  description: {
    fontSize: 16,
    fontWeight: '500',
    color: Colors.textSecondary,
    textAlign: 'center',
    lineHeight: 22,
    opacity: 0.7,
  },
});

export default BadgePopup;