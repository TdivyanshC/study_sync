/**
 * NGROK Configuration Handler
 * Safely manages environment variables for ngrok URL detection and updates
 */

import { Platform } from 'react-native';

// Global configuration state
let ngrokConfig = {
  ngrokUrl: null as string | null,
  originalApiUrl: null as string | null,
  isUsingNgrok: false,
  configTimestamp: null as string | null,
};

// Environment variable storage
let environmentVars = { ...process.env };

/**
 * Initialize environment variables from current process
 */
export const initializeEnvironmentVars = () => {
  environmentVars = { ...process.env };
  console.log('🔧 Environment variables initialized');
};

/**
 * Safely set environment variable
 */
export const setEnvVar = (key: string, value: string | null) => {
  try {
    if (value === null) {
      // Don't delete, just set to undefined equivalent
      delete environmentVars[key];
      console.log(`🗑️ Removed environment variable: ${key}`);
    } else {
      environmentVars[key] = value;
      console.log(`✅ Set environment variable: ${key} = ${value}`);
    }
    return true;
  } catch (error) {
    console.error(`❌ Failed to set environment variable ${key}:`, error);
    return false;
  }
};

/**
 * Get environment variable safely
 */
export const getEnvVar = (key: string): string | null => {
  return environmentVars[key] || null;
};

/**
 * Update ngrok configuration
 */
export const updateNgrokConfig = (ngrokUrl: string | null) => {
  const timestamp = new Date().toISOString();
  
  // Store original API URL if not already stored
  if (!ngrokConfig.originalApiUrl) {
    ngrokConfig.originalApiUrl = environmentVars.EXPO_PUBLIC_API_URL || environmentVars.EXPO_PUBLIC_BACKEND_URL || null;
  }
  
  if (ngrokUrl) {
    // Update to ngrok URL
    ngrokConfig.ngrokUrl = ngrokUrl;
    ngrokConfig.isUsingNgrok = true;
    ngrokConfig.configTimestamp = timestamp;
    
    // Safely update environment variables
    setEnvVar('EXPO_PUBLIC_API_URL', ngrokUrl);
    setEnvVar('EXPO_PUBLIC_BACKEND_URL', ngrokUrl);
    setEnvVar('NGROK_DETECTED', 'true');
    setEnvVar('NGROK_URL', ngrokUrl);
    setEnvVar('NGROK_TIMESTAMP', timestamp);
    
    console.log(`🌐 NGROK configuration updated: ${ngrokUrl}`);
  } else {
    // Revert to original configuration
    ngrokConfig.ngrokUrl = null;
    ngrokConfig.isUsingNgrok = false;
    ngrokConfig.configTimestamp = timestamp;
    
    // Restore original environment variables
    if (ngrokConfig.originalApiUrl) {
      setEnvVar('EXPO_PUBLIC_API_URL', ngrokConfig.originalApiUrl);
      setEnvVar('EXPO_PUBLIC_BACKEND_URL', ngrokConfig.originalApiUrl);
    } else {
      // Clear ngrok-related variables if no original URL
      setEnvVar('EXPO_PUBLIC_API_URL', null);
      setEnvVar('EXPO_PUBLIC_BACKEND_URL', null);
    }
    
    // Remove ngrok-specific variables
    setEnvVar('NGROK_DETECTED', null);
    setEnvVar('NGROK_URL', null);
    setEnvVar('NGROK_TIMESTAMP', null);
    
    console.log('🔄 NGROK configuration reverted to original');
  }
};

/**
 * Get current ngrok configuration status
 */
export const getNgrokConfig = () => {
  return { ...ngrokConfig };
};

/**
 * Check if currently using ngrok
 */
export const isUsingNgrok = (): boolean => {
  return ngrokConfig.isUsingNgrok;
};

/**
 * Get current ngrok URL
 */
export const getNgrokUrl = (): string | null => {
  return ngrokConfig.ngrokUrl;
};

/**
 * Get configuration status with detailed info
 */
export const getConfigStatus = () => {
  return {
    isUsingNgrok: ngrokConfig.isUsingNgrok,
    ngrokUrl: ngrokConfig.ngrokUrl,
    originalUrl: ngrokConfig.originalApiUrl,
    configTimestamp: ngrokConfig.configTimestamp,
    currentApiUrl: getEnvVar('EXPO_PUBLIC_API_URL'),
    environmentSafe: true,
    platform: Platform.OS,
  };
};

// Initialize on module load
initializeEnvironmentVars();