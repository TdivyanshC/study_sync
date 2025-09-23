import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withRepeat,
  withTiming,
  interpolate,
  Easing,
  runOnJS,
} from 'react-native-reanimated';
import { Colors } from '../constants/Colors';
import AnimatedProgressRing from './AnimatedProgressRing';

export interface CharacterLevel {
  name: string;
  level: number;
  icon: string;
  minXP: number;
  maxXP: number;
  color: string;
}

interface CharacterAvatarProps {
  character: CharacterLevel;
  currentXP: number;
  isActive?: boolean;
  onLevelUp?: () => void;
}

const CharacterAvatar: React.FC<CharacterAvatarProps> = ({
  character,
  currentXP,
  isActive = false,
  onLevelUp,
}) => {
  const scale = useSharedValue(1);
  const rotation = useSharedValue(0);
  const glowOpacity = useSharedValue(0);
  const sparkleScale = useSharedValue(0);

  // Calculate XP progress for current level
  const progress = Math.min(
    (currentXP - character.minXP) / (character.maxXP - character.minXP), 
    1
  );

  React.useEffect(() => {
    if (isActive) {
      // Floating animation
      scale.value = withRepeat(
        withSpring(1.05, { damping: 10, stiffness: 100 }),
        -1,
        true
      );
      
      // Gentle rotation
      rotation.value = withRepeat(
        withTiming(5, { duration: 2000, easing: Easing.inOut(Easing.sin) }),
        -1,
        true
      );
      
      // Glow effect
      glowOpacity.value = withRepeat(
        withTiming(0.8, { duration: 1500, easing: Easing.inOut(Easing.ease) }),
        -1,
        true
      );
    } else {
      scale.value = withSpring(1);
      rotation.value = withSpring(0);
      glowOpacity.value = withTiming(0);
    }
  }, [isActive]);

  // Level up animation
  React.useEffect(() => {
    if (progress >= 1 && onLevelUp) {
      // Trigger level up celebration
      sparkleScale.value = withSpring(1.5, { damping: 8, stiffness: 150 }, () => {
        sparkleScale.value = withSpring(0);
        runOnJS(onLevelUp)();
      });
    }
  }, [progress, onLevelUp]);

  const avatarStyle = useAnimatedStyle(() => ({
    transform: [
      { scale: scale.value },
      { rotate: `${rotation.value}deg` }
    ],
  }));

  const glowStyle = useAnimatedStyle(() => ({
    opacity: glowOpacity.value,
  }));

  const sparkleStyle = useAnimatedStyle(() => ({
    transform: [{ scale: sparkleScale.value }],
    opacity: interpolate(sparkleScale.value, [0, 0.5, 1, 1.5], [0, 1, 1, 0]),
  }));

  return (
    <View style={styles.container}>
      {/* Glow Effect */}
      <Animated.View 
        style={[
          styles.glow, 
          { backgroundColor: character.color + '40' },
          glowStyle
        ]} 
      />
      
      {/* Level Up Sparkles */}
      <Animated.View style={[styles.sparkles, sparkleStyle]}>
        <Text style={styles.sparkleText}>✨</Text>
        <Text style={[styles.sparkleText, { top: 10, right: 10 }]}>⭐</Text>
        <Text style={[styles.sparkleText, { bottom: 10, left: 10 }]}>💫</Text>
        <Text style={[styles.sparkleText, { bottom: 10, right: 10 }]}>✨</Text>
      </Animated.View>

      {/* XP Progress Ring */}
      <AnimatedProgressRing
        size={120}
        strokeWidth={6}
        progress={progress}
        color={character.color}
        backgroundColor={Colors.surfaceElevated}
        animationDuration={1500}
      >
        {/* Avatar Character */}
        <Animated.View style={[styles.avatarContainer, avatarStyle]}>
          <View style={[styles.avatar, { borderColor: character.color }]}>
            <Text style={styles.avatarIcon}>{character.icon}</Text>
          </View>
          
          {/* Level Badge */}
          <View style={[styles.levelBadge, { backgroundColor: character.color }]}>
            <Text style={styles.levelText}>{character.level}</Text>
          </View>
        </Animated.View>
      </AnimatedProgressRing>

      {/* Character Info */}
      <View style={styles.info}>
        <Text style={[styles.characterName, { color: character.color }]}>
          {character.name}
        </Text>
        <Text style={styles.xpText}>
          {currentXP} / {character.maxXP} XP
        </Text>
        <Text style={styles.progressText}>
          {Math.round(progress * 100)}% to next level
        </Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  glow: {
    position: 'absolute',
    width: 140,
    height: 140,
    borderRadius: 70,
    zIndex: 0,
  },
  sparkles: {
    position: 'absolute',
    width: 160,
    height: 160,
    zIndex: 3,
  },
  sparkleText: {
    position: 'absolute',
    fontSize: 20,
  },
  avatarContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 2,
  },
  avatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: Colors.surfaceElevated,
    borderWidth: 3,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: Colors.shadow,
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  avatarIcon: {
    fontSize: 32,
  },
  levelBadge: {
    position: 'absolute',
    bottom: -5,
    right: -5,
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: Colors.background,
  },
  levelText: {
    color: Colors.text,
    fontSize: 12,
    fontWeight: 'bold',
  },
  info: {
    alignItems: 'center',
    marginTop: 16,
  },
  characterName: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  xpText: {
    fontSize: 14,
    color: Colors.textSecondary,
    marginBottom: 2,
  },
  progressText: {
    fontSize: 12,
    color: Colors.textMuted,
  },
});

export default CharacterAvatar;