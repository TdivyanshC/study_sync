import AsyncStorage from '@react-native-async-storage/async-storage';
import * as SecureStore from 'expo-secure-store';

const AUTH_TOKEN_KEY = 'study_sync_auth_token';
const USER_DATA_KEY = 'study_sync_user_data';

/**
 * Store JWT token securely using SecureStore
 */
export const setAuthToken = async (token: string): Promise<void> => {
  try {
    await SecureStore.setItemAsync(AUTH_TOKEN_KEY, token, {
      keychainAccessible: SecureStore.AFTER_FIRST_UNLOCK,
    });
  } catch (error) {
    console.error('Failed to store auth token:', error);
    // Fallback to AsyncStorage if SecureStore fails
    try {
      await AsyncStorage.setItem(AUTH_TOKEN_KEY, token);
    } catch (fallbackError) {
      console.error('Fallback storage also failed:', fallbackError);
      throw fallbackError;
    }
  }
};

/**
 * Get JWT token from secure storage
 */
export const getAuthToken = async (): Promise<string | null> => {
  try {
    return await SecureStore.getItemAsync(AUTH_TOKEN_KEY);
  } catch (error) {
    console.error('Failed to get auth token from SecureStore:', error);
    // Fallback to AsyncStorage
    try {
      return await AsyncStorage.getItem(AUTH_TOKEN_KEY);
    } catch (fallbackError) {
      console.error('Fallback retrieval also failed:', fallbackError);
      return null;
    }
  }
};

/**
 * Remove JWT token from secure storage
 */
export const removeAuthToken = async (): Promise<void> => {
  try {
    await SecureStore.deleteItemAsync(AUTH_TOKEN_KEY);
  } catch (error) {
    console.error('Failed to remove auth token from SecureStore:', error);
    // Fallback to AsyncStorage
    try {
      await AsyncStorage.removeItem(AUTH_TOKEN_KEY);
    } catch (fallbackError) {
      console.error('Fallback removal also failed:', fallbackError);
    }
  }
};

/**
 * Store user data in AsyncStorage
 */
export const setUserData = async (userData: object): Promise<void> => {
  try {
    await AsyncStorage.setItem(USER_DATA_KEY, JSON.stringify(userData));
  } catch (error) {
    console.error('Failed to store user data:', error);
    throw error;
  }
};

/**
 * Get user data from AsyncStorage
 */
export const getUserData = async (): Promise<any | null> => {
  try {
    const data = await AsyncStorage.getItem(USER_DATA_KEY);
    return data ? JSON.parse(data) : null;
  } catch (error) {
    console.error('Failed to get user data:', error);
    return null;
  }
};

/**
 * Remove user data from AsyncStorage
 */
export const removeUserData = async (): Promise<void> => {
  try {
    await AsyncStorage.removeItem(USER_DATA_KEY);
  } catch (error) {
    console.error('Failed to remove user data:', error);
  }
};

/**
 * Clear all auth data (token + user data)
 */
export const clearAuthData = async (): Promise<void> => {
  try {
    await AsyncStorage.multiRemove([AUTH_TOKEN_KEY, USER_DATA_KEY]);
  } catch (error) {
    console.error('Failed to clear auth data:', error);
  }
};

/**
 * Check if user is authenticated (has token)
 */
export const isAuthenticated = async (): Promise<boolean> => {
  const token = await getAuthToken();
  return !!token;
};