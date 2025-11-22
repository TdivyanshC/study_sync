import React, { createContext, useContext, useEffect, useState } from 'react';
import { apiService } from '../services/apiService';
import { DEMO_USER } from '../lib/constants';

// User context interface
interface UserContextType {
  id: string;
  level: number;
  streak: number;
  isLoaded: boolean;
  xp: number;
  // Add more fields as needed
}

const UserContext = createContext<UserContextType | null>(null);

export const UserProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<UserContextType>({
    id: DEMO_USER,
    level: 1,
    streak: 0,
    isLoaded: false,
    xp: 0,
  });

  useEffect(() => {
    async function loadUser() {
      try {
        console.log('🔄 Loading user data...');
        const data = await apiService.getUserDashboard(DEMO_USER);
        
        // Even if data is undefined, we provide safe fallbacks
        const profile = data?.profile || {};
        const streak = data?.streak || {};
        
        setUser({
          id: DEMO_USER,
          level: profile.level ?? 1,
          streak: streak.current_streak ?? 0,
          isLoaded: true,
          xp: profile.xp ?? 0,
        });
        
        console.log('✅ User data loaded successfully');
      } catch (e) {
        console.log('⚠️ Failed to load user, using safe defaults:', e);
        // On error, still provide a fully loaded user with defaults
        setUser({
          id: DEMO_USER,
          level: 1,
          streak: 0,
          isLoaded: true,
          xp: 0,
        });
      }
    }

    loadUser();
  }, []);

  return (
    <UserContext.Provider value={user}>
      {children}
    </UserContext.Provider>
  );
};

export const useUser = () => {
  const context = useContext(UserContext);
  if (!context) {
    throw new Error('useUser must be used within a UserProvider');
  }
  return context;
};

// Helper hook for safe user data access
export const useSafeUser = () => {
  const user = useUser();
  return {
    level: user?.level ?? 1,
    streak: user?.streak ?? 0,
    xp: user?.xp ?? 0,
    isLoaded: user?.isLoaded ?? false,
  };
};