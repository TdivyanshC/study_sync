/**
 * Network Detector - Automatically find and test backend connectivity
 * Provides multiple strategies for connecting to the backend from different environments
 */

import { Platform } from 'react-native';

/**
 * Test connectivity to a specific URL
 */
export const testConnection = async (url: string): Promise<boolean> => {
  try {
    console.log(`🧪 Testing connection to: ${url}`);
    
    const response = await fetch(`${url}/api/`, {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' },
      // Add timeout for React Native
      signal: AbortSignal.timeout ? 
        AbortSignal.timeout(5000) : 
        new AbortController().signal // Fallback for older React Native
    });
    
    if (response.ok) {
      const data = await response.json();
      console.log(`✅ Connection successful: ${url} - Response: ${JSON.stringify(data)}`);
      return true;
    } else {
      console.log(`❌ Connection failed: ${url} - Status: ${response.status}`);
      return false;
    }
  } catch (error) {
    console.log(`❌ Connection error: ${url} - Error: ${error instanceof Error ? error.message : String(error)}`);
    return false;
  }
};

/**
 * Get likely backend URLs based on platform and environment
 */
export const getCandidateUrls = (): string[] => {
  const candidates: string[] = [];
  
  // Platform-specific URLs
  if (Platform.OS === 'android') {
    candidates.push(
      'http://10.0.2.2:8000',  // Android emulator host access
      'http://localhost:8000',  // Fallback
      'http://192.168.1.1:8000', // Common router IP
      'http://192.168.0.1:8000'  // Alternative router IP
    );
  } else if (Platform.OS === 'ios') {
    candidates.push(
      'http://localhost:8000',  // iOS simulator
      'http://10.0.2.2:8000',   // iOS device host access
      'http://192.168.1.1:8000', // Common router IP
      'http://192.168.0.1:8000'  // Alternative router IP
    );
  } else {
    // Web or other platforms
    candidates.push(
      'http://localhost:8000',
      'http://127.0.0.1:8000'
    );
  }
  
  // Common local network IPs
  const localIPs = [
    '192.168.1.100',
    '192.168.1.101', 
    '192.168.1.102',
    '192.168.1.103',
    '192.168.1.104',
    '192.168.0.100',
    '192.168.0.101',
    '192.168.0.102'
  ];
  
  localIPs.forEach(ip => {
    candidates.push(`http://${ip}:8000`);
  });
  
  return candidates;
};

/**
 * Find the first working backend URL
 */
export const findWorkingBackendUrl = async (): Promise<string | null> => {
  console.log('🔍 Searching for working backend URL...');
  console.log(`📱 Platform: ${Platform.OS}`);
  
  const candidates = getCandidateUrls();
  
  console.log(`🧪 Testing ${candidates.length} candidate URLs...`);
  
  // Test each candidate
  for (const url of candidates) {
    try {
      const isWorking = await testConnection(url);
      if (isWorking) {
        console.log(`🎯 Found working backend: ${url}`);
        return url;
      }
    } catch (error) {
      console.log(`💥 Error testing ${url}:`, error);
    }
  }
  
  console.log('💀 No working backend URL found');
  return null;
};

/**
 * Get manual IP detection instructions for user
 */
export const getManualConnectionInstructions = (): string => {
  return `
📱 REACT NATIVE CONNECTION ISSUE DETECTED

Your frontend cannot connect to the backend. Here are solutions:

1. ANDROID EMULATOR:
   - Backend should be at: http://10.0.2.2:8000
   - Make sure backend is running on your computer

2. iOS SIMULATOR: 
   - Backend should be at: http://localhost:8000
   - Make sure backend is running on your computer

3. PHYSICAL DEVICE:
   - Find your computer's IP: 
     - Windows: ipconfig
     - Mac/Linux: ifconfig or ip addr
   - Backend should be at: http://YOUR-COMPUTER-IP:8000
   - Make sure firewall allows port 8000

4. EXPO GO:
   - Use Expo tunnel or ngrok for public access
   - Or find your computer's IP as above

5. TROUBLESHOOTING:
   - Check backend is running: curl http://localhost:8000/api/
   - Ensure no firewall blocking port 8000
   - Try different network interfaces

Backend must be running on the same network for physical devices.
  `.trim();
};