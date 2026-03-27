import AsyncStorage from '@react-native-async-storage/async-storage';

const AUTH_TOKEN_KEY = 'study_sync_auth_token';
const USER_DATA_KEY = 'study_sync_user_data';

/**
 * Store JWT token in AsyncStorage
 */
export const setAuthToken = async (token: string): Promise<void> => {
  try {
    await AsyncStorage.setItem(AUTH_TOKEN_KEY, token);
  } catch (error) {
    console.error('Failed to store auth token:', error);
    throw error;
  }
};

/**
 * Get JWT token from AsyncStorage
 */
export const getAuthToken = async (): Promise<string | null> => {
  try {
    return await AsyncStorage.getItem(AUTH_TOKEN_KEY);
  } catch (error) {
    console.error('Failed to get auth token:', error);
    return null;
  }
};

/**
 * Remove JWT token from AsyncStorage
 */
export const removeAuthToken = async (): Promise<void> => {
  try {
    await AsyncStorage.removeItem(AUTH_TOKEN_KEY);
  } catch (error) {
    console.error('Failed to remove auth token:', error);
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