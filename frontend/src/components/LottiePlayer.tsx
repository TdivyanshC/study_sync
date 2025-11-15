import React, { useEffect, useRef, useState } from 'react';
import { View, ViewStyle } from 'react-native';
import LottieView from 'lottie-react-native';
import { loadAnimation } from '../utils/loadAnimation';

// Props interface for the LottiePlayer component
interface LottiePlayerProps {
  name: string; // Animation name from manifest
  loop?: boolean; // Whether to loop the animation (default: true)
  autoplay?: boolean; // Whether to autoplay the animation (default: true)
  className?: string; // Optional className for styling (if using styled-components or similar)
  style?: ViewStyle; // Optional style object for the container
}

/**
 * LottiePlayer component for rendering Lottie animations.
 * Loads animation data from the manifest and handles rendering with lottie-react-native.
 */
const LottiePlayer: React.FC<LottiePlayerProps> = ({
  name,
  loop = true,
  autoplay = true,
  className,
  style,
}) => {
  const lottieRef = useRef<LottieView>(null);
  const [animationData, setAnimationData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Load animation data on mount or when name changes
  useEffect(() => {
    const loadAnim = async () => {
      try {
        setLoading(true);
        setError(null);
        const data = await loadAnimation(name);
        setAnimationData(data);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load animation');
      } finally {
        setLoading(false);
      }
    };

    loadAnim();
  }, [name]);

  // Play animation when data is loaded and autoplay is true
  useEffect(() => {
    if (animationData && autoplay && lottieRef.current) {
      lottieRef.current.play();
    }
  }, [animationData, autoplay]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (lottieRef.current) {
        lottieRef.current.reset();
      }
    };
  }, []);

  // Render loading state
  if (loading) {
    return (
      <View style={[{ justifyContent: 'center', alignItems: 'center' }, style]}>
        {/* You can replace this with a simple loading indicator */}
      </View>
    );
  }

  // Render error state
  if (error) {
    return (
      <View style={[{ justifyContent: 'center', alignItems: 'center' }, style]}>
        {/* You can replace this with an error display */}
      </View>
    );
  }

  // Render the Lottie animation
  return (
    <View style={style} className={className}>
      <LottieView
        ref={lottieRef}
        source={animationData}
        loop={loop}
        autoPlay={false} // We handle autoplay manually
        style={{ flex: 1 }}
        resizeMode="contain" // Supports responsive scaling
      />
    </View>
  );
};

export default LottiePlayer;