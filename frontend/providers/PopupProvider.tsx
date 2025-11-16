import React, { createContext, useContext, useState, useRef, useEffect, ReactNode } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Dimensions,
  Animated,
} from 'react-native';
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
  const [ready, setReady] = useState(false);
  const [message, setMessage] = useState('');
  const [primaryButtonText, setPrimaryButtonText] = useState('');
  const [secondaryButtonText, setSecondaryButtonText] = useState('');
  const [animation, setAnimation] = useState<any>(JSON.parse(JSON.stringify(require('../assets/animations/avatar 1-MJ2k6.json'))));
  const [onPrimary, setOnPrimary] = useState<() => void>(() => {});
  const [onSecondary, setOnSecondary] = useState<() => void>(() => {});

  const translateY = useRef(new Animated.Value(screenHeight)).current;
  const backdropOpacity = useRef(new Animated.Value(0)).current;
  const lottieRef = useRef<LottieView>(null);

  useEffect(() => {
    if (isVisible) {
      setTimeout(() => setReady(true), 120);
    } else {
      setReady(false);
    }
  }, [isVisible]);

  const openPopup = (options: PopupOptions) => {
    setMessage(options.message);
    setPrimaryButtonText(options.primaryButtonText);
    setSecondaryButtonText(options.secondaryButtonText);
    setAnimation(JSON.parse(JSON.stringify(options.animation)));
    setOnPrimary(() => options.onPrimary);
    setOnSecondary(() => options.onSecondary);
    setIsVisible(true);

    Animated.parallel([
      Animated.timing(translateY, {
        toValue: 0,
        duration: 300,
        useNativeDriver: true,
      }),
      Animated.timing(backdropOpacity, {
        toValue: 1,
        duration: 300,
        useNativeDriver: true,
      }),
    ]).start();
  };

  const closePopup = () => {
    Animated.parallel([
      Animated.timing(translateY, {
        toValue: screenHeight,
        duration: 300,
        useNativeDriver: true,
      }),
      Animated.timing(backdropOpacity, {
        toValue: 0,
        duration: 300,
        useNativeDriver: true,
      }),
    ]).start(() => {
      setIsVisible(false);
    });
  };

  const handlePrimary = () => {
    // Play checkmark animation
    setAnimation(JSON.parse(JSON.stringify(require('../assets/animations/checkmark_success.json'))));
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

  const animatedStyle = {
    transform: [{ translateY }],
  };

  const backdropStyle = {
    opacity: backdropOpacity,
  };

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
              {ready && (
                <View style={{ overflow: 'visible', alignItems: 'center', justifyContent: 'center' }}>
                  <LottieView
                    ref={lottieRef}
                    source={animation}
                    autoPlay
                    loop={JSON.stringify(animation) === JSON.stringify(JSON.parse(JSON.stringify(require('../assets/animations/avatar 1-MJ2k6.json'))))}
                    renderMode="HARDWARE"
                    resizeMode="cover"
                    enableMergePathsAndroidForKitKatAndAbove={true}
                    style={{
                      width: 180,
                      height: 180,
                      backgroundColor: 'transparent'
                    }}
                  />
                </View>
              )}
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
    overflow: 'visible',
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