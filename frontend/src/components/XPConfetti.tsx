import React, { useEffect, useRef } from 'react';
import {
  View,
  Animated,
  StyleSheet,
  Dimensions,
} from 'react-native';

const { width, height } = Dimensions.get('window');

interface ConfettiPiece {
  id: string;
  x: number;
  y: number;
  color: string;
  velocity: { x: number; y: number };
  rotation: number;
  rotationSpeed: number;
  scale: number;
}

interface XPConfettiProps {
  isVisible: boolean;
  onComplete?: () => void;
  duration?: number;
  pieces?: number;
}

const XPConfetti: React.FC<XPConfettiProps> = ({
  isVisible,
  onComplete,
  duration = 2000,
  pieces = 50,
}) => {
  const animatedValues = useRef<Animated.Value[]>([]);
  const rotationValues = useRef<Animated.Value[]>([]);
  const confettiPieces = useRef<ConfettiPiece[]>([]);

  useEffect(() => {
    if (isVisible) {
      generateConfetti();
      startAnimation();
    } else {
      resetAnimation();
    }
  }, [isVisible]);

  const generateConfetti = () => {
    const colors = ['#f39c12', '#e74c3c', '#9b59b6', '#3498db', '#2ecc71', '#f1c40f'];
    confettiPieces.current = Array.from({ length: pieces }, (_, i) => ({
      id: `piece-${i}`,
      x: Math.random() * width,
      y: -20,
      color: colors[Math.floor(Math.random() * colors.length)],
      velocity: {
        x: (Math.random() - 0.5) * 4,
        y: Math.random() * 3 + 2,
      },
      rotation: Math.random() * 360,
      rotationSpeed: (Math.random() - 0.5) * 10,
      scale: Math.random() * 0.5 + 0.5,
    }));

    // Initialize animation values
    animatedValues.current = confettiPieces.current.map(() => new Animated.Value(0));
    rotationValues.current = confettiPieces.current.map(() => new Animated.Value(0));
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
  };

  if (!isVisible) return null;

  return (
    <View style={styles.container} pointerEvents="none">
      {confettiPieces.current.map((piece, index) => (
        <Animated.View
          key={piece.id}
          style={[
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
          ]}
        />
      ))}
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
  confettiPiece: {
    position: 'absolute',
    width: 8,
    height: 8,
    borderRadius: 4,
  },
});

export default XPConfetti;

/*
TODO: Add confetti celebration features:
- Different confetti types (stars, circles, squares)
- Emoji confetti for special milestones
- Screen shake effect
- Sound effects
- Custom particle effects for different XP amounts
*/