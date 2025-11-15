import { useEffect, useRef, useState } from 'react';
import { loadAnimation } from '../utils/loadAnimation';

// Return type for the useLottie hook
interface UseLottieReturn {
  ref: React.RefObject<any>; // Reference to the LottieView component
  loading: boolean; // Loading state
  error: string | null; // Error message if any
  play: () => void; // Function to play the animation
  pause: () => void; // Function to pause the animation
  reset: () => void; // Function to reset the animation
}

/**
 * Custom hook for managing Lottie animations.
 * Handles loading, playing, pausing, and resetting animations.
 * @param name - The name of the animation from the manifest.
 * @returns An object containing ref, loading state, error, and control functions.
 */
export function useLottie(name: string): UseLottieReturn {
  const ref = useRef<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Load animation data on mount or when name changes
  useEffect(() => {
    const loadAnim = async () => {
      try {
        setLoading(true);
        setError(null);
        await loadAnimation(name); // Just load to ensure it's available
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load animation');
      } finally {
        setLoading(false);
      }
    };

    loadAnim();
  }, [name]);

  // Control functions
  const play = () => {
    if (ref.current) {
      ref.current.play();
    }
  };

  const pause = () => {
    if (ref.current) {
      ref.current.pause();
    }
  };

  const reset = () => {
    if (ref.current) {
      ref.current.reset();
    }
  };

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (ref.current) {
        ref.current.reset();
      }
    };
  }, []);

  return {
    ref,
    loading,
    error,
    play,
    pause,
    reset,
  };
}