import React, { useEffect, useRef } from 'react';
import {
  View,
  Text,
  Modal,
  StyleSheet,
  Animated,
  Dimensions,
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

  useEffect(() => {
    if (visible) {
      // Reset animations
      scaleAnim.setValue(0);
      opacityAnim.setValue(0);
      bounceAnim.setValue(0);

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
          duration: 300,
          useNativeDriver: true,
        }),
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
    ]).start(() => {
      onClose();
    });
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
      <View style={styles.overlay}>
        <Animated.View
          style={[
            styles.popup,
            {
              transform: [{ scale: scaleAnim }],
              opacity: opacityAnim,
            },
          ]}
        >
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
            <View style={styles.iconContainer}>
              <Ionicons
                name={getBadgeIcon(badgeTitle)}
                size={48}
                color={Colors.accent}
              />
            </View>

            <Text style={styles.title}>Achievement Unlocked!</Text>
            <Text style={styles.badgeTitle}>{badgeTitle}</Text>
            {badgeDescription && (
              <Text style={styles.description}>{badgeDescription}</Text>
            )}
          </View>
        </Animated.View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  popup: {
    backgroundColor: Colors.surface,
    borderRadius: 24,
    padding: 32,
    width: width * 0.8,
    maxWidth: 320,
    alignItems: 'center',
    shadowColor: Colors.text,
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.3,
    shadowRadius: 20,
    elevation: 10,
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
  },
  iconContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: Colors.surfaceElevated,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  title: {
    fontSize: 18,
    fontWeight: 'bold',
    color: Colors.primary,
    marginBottom: 8,
    textAlign: 'center',
  },
  badgeTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: Colors.text,
    marginBottom: 8,
    textAlign: 'center',
  },
  description: {
    fontSize: 14,
    color: Colors.textSecondary,
    textAlign: 'center',
    lineHeight: 18,
  },
});

export default BadgePopup;