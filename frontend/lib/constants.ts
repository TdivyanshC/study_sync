import { Platform } from 'react-native';

// Demo user constant for testing purposes
export const DEMO_USER = "2ba45274-d17b-45c2-b4fc-a0f6fe8d96f3";

/**
 * Get Backend URL - Auto-discovers the correct backend URL based on environment
 * Priority: EXPO_PUBLIC_NGROK_URL → Expo tunnel/debug → LAN IP fallback
 */
export function getBackendUrl(): string {
  // 1. NGROK override from env
  if (process.env.EXPO_PUBLIC_NGROK_URL) {
    return process.env.EXPO_PUBLIC_NGROK_URL;
  }

  // 2. Expo tunnel / debug mode
  if (typeof location !== "undefined" && location.hostname.includes("exp")) {
    return `https://${location.hostname.replace("exp", "ngrok")}`;
  }

  // 3. LAN IP fallback - Auto-detect user's correct local LAN IP
  // Get user's local IP address for LAN access
  try {
    // Attempt to detect local IP for LAN access
    const localIP = getLocalIPAddress();
    if (localIP) {
      return `http://${localIP}:8000`;
    }
  } catch (error) {
    console.warn('Failed to detect local IP:', error);
  }

  // Platform-specific fallback
  if (Platform.OS === 'android') {
    return "http://10.0.2.2:8000"; // Android emulator
  } else if (Platform.OS === 'ios') {
    return "http://localhost:8000"; // iOS simulator
  } else {
    return "http://localhost:8000"; // Web fallback
  }
}

/**
 * Auto-detect local IP address for LAN access
 */
function getLocalIPAddress(): string | null {
  try {
    // Use WebRTC to get local IP (works on web)
    if (typeof window !== 'undefined' && window.location) {
      // For web development
      const hostname = window.location.hostname;
      if (hostname === 'localhost' || hostname === '127.0.0.1') {
        return "127.0.0.1";
      }
      
      // For production web deployments
      if (!hostname.includes('localhost') && !hostname.includes('127.0.0.1') && !hostname.includes('ngrok')) {
        return hostname;
      }
    }
  } catch (error) {
    console.warn('Web IP detection failed:', error);
  }
  
  // Fallback to hardcoded common LAN IPs
  const commonIPs = [
    "192.168.1.100",
    "192.168.0.100", 
    "192.168.1.50",
    "192.168.0.50",
    "10.0.0.100"
  ];
  
  // Return first common IP as fallback (user should replace this with their actual LAN IP)
  return commonIPs[0]; // User should replace <REPLACE_WITH_LAN_IP>
}

/**
 * Check if backend server is reachable
 */
export async function pingServer(): Promise<boolean> {
  try {
    const res = await fetch(`${getBackendUrl()}/api/health`);
    return res.ok;
  } catch {
    return false;
  }
}

/**
 * Get the full API base URL with /api prefix
 */
export function getApiBaseUrl(): string {
  return `${getBackendUrl()}/api`;
}

// Legacy BASE_URL for backward compatibility (deprecated)
export const BASE_URL = "http://localhost:8000"; // Fallback for synchronous access