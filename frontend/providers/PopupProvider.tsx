import React, { createContext, useContext, useState, useRef, ReactNode } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Dimensions,
  Animated,
} from 'react-native';
import { useAnimatedStyle, useSharedValue, withTiming, runOnJS } from 'react-native-reanimated';
import LottieView from 'lottie-react-native';
import { Colors } from '../constants/Colors';

const { height: screenHeight } = Dimensions.get('window');

interface PopupOptions {
  message: string;
  primaryButtonText: string;
  secondaryButtonText: string;
  animation: any;
  onPrimary: () => void;
  onSecondary: () => void;
}

interface PopupContextType {
  isVisible: boolean;
  openPopup: (options: PopupOptions) => void;
  closePopup: () => void;
}

const PopupContext = createContext<PopupContextType | undefined>(undefined);

export const usePopup = () => {
  const context = useContext(PopupContext);
  if (!context) {
    throw new Error('usePopup must be used within a PopupProvider');
  }
  return context;
};

interface PopupProviderProps {
  children: ReactNode;
}

export const PopupProvider: React.FC<PopupProviderProps> = ({ children }) => {
  const [isVisible, setIsVisible] = useState(false);
  const [message, setMessage] = useState('');
  const [primaryButtonText, setPrimaryButtonText] = useState('');
  const [secondaryButtonText, setSecondaryButtonText] = useState('');
  const [animation, setAnimation] = useState<any>(require('../assets/animations/avatar 1.json'));
  const [onPrimary, setOnPrimary] = useState<() => void>(() => {});
  const [onSecondary, setOnSecondary] = useState<() => void>(() => {});

  const translateY = useSharedValue(screenHeight);
  const backdropOpacity = useSharedValue(0);
  const lottieRef = useRef<LottieView>(null);

  const openPopup = (options: PopupOptions) => {
    setMessage(options.message);
    setPrimaryButtonText(options.primaryButtonText);
    setSecondaryButtonText(options.secondaryButtonText);
    setAnimation(options.animation);
    setOnPrimary(() => options.onPrimary);
    setOnSecondary(() => options.onSecondary);
    setIsVisible(true);

    translateY.value = withTiming(0, { duration: 300 });
    backdropOpacity.value = withTiming(1, { duration: 300 });
  };

  const closePopup = () => {
    translateY.value = withTiming(screenHeight, { duration: 300 });
    backdropOpacity.value = withTiming(0, { duration: 300 }, () => {
      runOnJS(setIsVisible)(false);
    });
  };

  const handlePrimary = () => {
    // Play checkmark animation
    setAnimation(require('../assets/animations/checkmark_success.json'));
    lottieRef.current?.play(0, 60); // Assuming it's a short animation
    // After animation, call onPrimary
    setTimeout(() => {
      onPrimary();
    }, 1000); // Adjust timing based on animation length
  };

  const handleSecondary = () => {
    closePopup();
    onSecondary();
  };

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: translateY.value }],
  }));

  const backdropStyle = useAnimatedStyle(() => ({
    opacity: backdropOpacity.value,
  }));

  return (
    <PopupContext.Provider value={{ isVisible, openPopup, closePopup }}>
      {children}
      {isVisible && (
        <View style={StyleSheet.absoluteFillObject}>
          <Animated.View style={[styles.backdrop, backdropStyle]}>
            <TouchableOpacity style={StyleSheet.absoluteFillObject} onPress={closePopup} />
          </Animated.View>
          <Animated.View style={[styles.popupContainer, animatedStyle]}>
            <View style={styles.sheet}>
              <LottieView
                ref={lottieRef}
                source={animation}
                autoPlay
                loop={animation === require('../assets/animations/avatar 1.json')}
                style={styles.lottie}
              />
              <Text style={styles.message}>{message}</Text>
              <View style={styles.buttonContainer}>
                <TouchableOpacity style={styles.primaryButton} onPress={handlePrimary}>
                  <Text style={styles.primaryButtonText}>{primaryButtonText}</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.secondaryButton} onPress={handleSecondary}>
                  <Text style={styles.secondaryButtonText}>{secondaryButtonText}</Text>
                </TouchableOpacity>
              </View>
            </View>
          </Animated.View>
        </View>
      )}
    </PopupContext.Provider>
  );
};

const styles = StyleSheet.create({
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.4)',
  },
  popupContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'flex-end',
    zIndex: 9999,
    elevation: 9999,
  },
  sheet: {
    width: '100%',
    backgroundColor: '#161616',
    borderTopLeftRadius: 32,
    borderTopRightRadius: 32,
    padding: 24,
    alignItems: 'center',
  },
  lottie: {
    width: 150,
    height: 150,
  },
  message: {
    fontSize: 18,
    color: Colors.text,
    textAlign: 'center',
    marginVertical: 20,
  },
  buttonContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: '100%',
  },
  primaryButton: {
    backgroundColor: Colors.primary,
    flex: 1,
    paddingVertical: 12,
    borderRadius: 25,
    alignItems: 'center',
    marginRight: 10,
  },
  primaryButtonText: {
    color: Colors.text,
    fontSize: 16,
    fontWeight: 'bold',
  },
  secondaryButton: {
    backgroundColor: '#333',
    flex: 1,
    paddingVertical: 12,
    borderRadius: 25,
    alignItems: 'center',
    marginLeft: 10,
  },
  secondaryButtonText: {
    color: Colors.text,
    fontSize: 16,
  },
});