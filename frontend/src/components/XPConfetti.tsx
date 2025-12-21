import React, { useEffect, useRef } from 'react';
import {
  View,
  Animated,
  StyleSheet,
  Dimensions,
  Text,
} from 'react-native';

const { width, height } = Dimensions.get('window');

type ConfettiType = 'circle' | 'square' | 'star' | 'triangle' | 'emoji';

interface ConfettiPiece {
  id: string;
  x: number;
  y: number;
  color: string;
  velocity: { x: number; y: number };
  rotation: number;
  rotationSpeed: number;
  scale: number;
  type: ConfettiType;
  emoji?: string;
}

interface XPConfettiProps {
  isVisible: boolean;
  onComplete?: () => void;
  duration?: number;
  pieces?: number;
  confettiType?: ConfettiType;
  intensity?: 'low' | 'medium' | 'high';
  celebrationText?: string;
}

const XPConfetti: React.FC<XPConfettiProps> = ({
  isVisible,
  onComplete,
  duration = 2000,
  pieces = 50,
  confettiType = 'circle',
  intensity = 'medium',
  celebrationText,
}) => {
  const animatedValues = useRef<Animated.Value[]>([]);
  const rotationValues = useRef<Animated.Value[]>([]);
  const confettiPieces = useRef<ConfettiPiece[]>([]);
  const textOpacity = useRef(new Animated.Value(0));
  const textScale = useRef(new Animated.Value(0));

  // Intensity multipliers
  const intensityConfig = {
    low: { count: 0.6, velocity: 0.7 },
    medium: { count: 1.0, velocity: 1.0 },
    high: { count: 1.5, velocity: 1.3 },
  };

  useEffect(() => {
    if (isVisible) {
      generateConfetti();
      startAnimation();
    } else {
      resetAnimation();
    }
  }, [isVisible]);

  const generateConfetti = () => {
    const config = intensityConfig[intensity];
    const actualPieces = Math.floor(pieces * config.count);
    
    const colors = ['#f39c12', '#e74c3c', '#9b59b6', '#3498db', '#2ecc71', '#f1c40f', '#ff6b6b', '#4ecdc4', '#45b7d1', '#96ceb4'];
    const emojis = ['🎉', '⭐', '🔥', '💎', '🚀', '🌟', '💫', '🏆', '🎊', '✨'];
    
    // Determine confetti types - can be mixed
    const types: ConfettiType[] = confettiType === 'mixed' 
      ? ['circle', 'square', 'star', 'triangle', 'emoji']
      : [confettiType];
    
    confettiPieces.current = Array.from({ length: actualPieces }, (_, i) => {
      const type = types[Math.floor(Math.random() * types.length)];
      return {
        id: `piece-${i}`,
        x: Math.random() * width,
        y: -20,
        color: colors[Math.floor(Math.random() * colors.length)],
        velocity: {
          x: (Math.random() - 0.5) * 4 * config.velocity,
          y: Math.random() * 3 * config.velocity + 2,
        },
        rotation: Math.random() * 360,
        rotationSpeed: (Math.random() - 0.5) * 10,
        scale: Math.random() * 0.5 + 0.5,
        type,
        emoji: type === 'emoji' ? emojis[Math.floor(Math.random() * emojis.length)] : undefined,
      };
    });

    // Initialize animation values
    animatedValues.current = confettiPieces.current.map(() => new Animated.Value(0));
    rotationValues.current = confettiPieces.current.map(() => new Animated.Value(0));
    
    // Show celebration text
    if (celebrationText) {
      showCelebrationText();
    }
  };
  
  const showCelebrationText = () => {
    Animated.sequence([
      Animated.parallel([
        Animated.timing(textOpacity.current, {
          toValue: 1,
          duration: 300,
          useNativeDriver: true,
        }),
        Animated.spring(textScale.current, {
          toValue: 1,
          tension: 100,
          friction: 8,
          useNativeDriver: true,
        }),
      ]),
      Animated.delay(1500),
      Animated.timing(textOpacity.current, {
        toValue: 0,
        duration: 500,
        useNativeDriver: true,
      }),
    ]).start();
  };

  const startAnimation = () => {
    const animations = confettiPieces.current.map((piece, index) => {
      return Animated.parallel([
        Animated.timing(animatedValues.current[index], {
          toValue: height + 100,
          duration: duration,
          useNativeDriver: true,
        }),
        Animated.timing(rotationValues.current[index], {
          toValue: piece.rotation + 360,
          duration: duration,
          useNativeDriver: true,
        }),
      ]);
    });

    Animated.parallel(animations).start(() => {
      onComplete?.();
    });
  };

  const resetAnimation = () => {
    animatedValues.current.forEach(value => value.setValue(0));
    rotationValues.current.forEach(value => value.setValue(0));
    textOpacity.current.setValue(0);
    textScale.current.setValue(0);
  };
  
  const renderConfettiPiece = (piece: ConfettiPiece, index: number) => {
    const animatedStyle = [
      styles.confettiPiece,
      {
        backgroundColor: piece.color,
        transform: [
          {
            translateY: animatedValues.current[index] || new Animated.Value(0),
          },
          {
            translateX: piece.x,
          },
          {
            rotate: (rotationValues.current[index] || new Animated.Value(0)).interpolate({
              inputRange: [0, 360],
              outputRange: ['0deg', '360deg'],
            }),
          },
          {
            scale: piece.scale,
          },
        ],
      },
    ];
    
    switch (piece.type) {
      case 'circle':
        return (
          <Animated.View
            key={piece.id}
            style={[animatedStyle, styles.circle]}
          />
        );
      case 'square':
        return (
          <Animated.View
            key={piece.id}
            style={[animatedStyle, styles.square]}
          />
        );
      case 'star':
        return (
          <Animated.View
            key={piece.id}
            style={[animatedStyle, styles.star]}
          >
            <Text style={styles.starText}>⭐</Text>
          </Animated.View>
        );
      case 'triangle':
        return (
          <Animated.View
            key={piece.id}
            style={[animatedStyle, styles.triangle]}
          />
        );
      case 'emoji':
        return (
          <Animated.View
            key={piece.id}
            style={[animatedStyle, styles.emoji]}
          >
            <Text style={styles.emojiText}>{piece.emoji}</Text>
          </Animated.View>
        );
      default:
        return (
          <Animated.View
            key={piece.id}
            style={animatedStyle}
          />
        );
    }
  };

  if (!isVisible) return null;

  return (
    <View style={styles.container} pointerEvents="none">
      {/* Celebration Text */}
      {celebrationText && (
        <Animated.View 
          style={[
            styles.celebrationText,
            {
              opacity: textOpacity.current,
              transform: [{ scale: textScale.current }],
            },
          ]}
        >
          <Text style={styles.celebrationTextContent}>{celebrationText}</Text>
        </Animated.View>
      )}
      
      {/* Confetti Pieces */}
      {confettiPieces.current.map((piece, index) => 
        renderConfettiPiece(piece, index)
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    pointerEvents: 'none',
  },
  celebrationText: {
    position: 'absolute',
    top: height * 0.3,
    left: 0,
    right: 0,
    alignItems: 'center',
    justifyContent: 'center',
  },
  celebrationTextContent: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#f1c40f',
    textShadowColor: '#000',
    textShadowOffset: { width: 2, height: 2 },
    textShadowRadius: 4,
  },
  confettiPiece: {
    position: 'absolute',
  },
  circle: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  square: {
    width: 8,
    height: 8,
    borderRadius: 2,
  },
  star: {
    width: 12,
    height: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  starText: {
    fontSize: 12,
  },
  triangle: {
    width: 0,
    height: 0,
    borderLeftWidth: 6,
    borderRightWidth: 6,
    borderBottomWidth: 10,
    borderLeftColor: 'transparent',
    borderRightColor: 'transparent',
    borderBottomColor: '#e74c3c',
  },
  emoji: {
    width: 16,
    height: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emojiText: {
    fontSize: 16,
  },
});

// Export confetti types for use elsewhere
export { ConfettiType };
export type { ConfettiPiece };

export default XPConfetti;

/*
TODO: Add confetti celebration features:
- Different confetti types (stars, circles, squares)
- Emoji confetti for special milestones
- Screen shake effect
- Sound effects
- Custom particle effects for different XP amounts
*/