import { useContext } from 'react';
import { AuthContext } from '../providers/AuthProvider';

// Re-export the main auth hook
export { useAuth } from '../providers/AuthProvider';

// Custom hook to access just the user from auth context
export function useUser() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useUser must be used within an AuthProvider');
  }
  return {
    user: context.user,
    session: context.session,
    loading: context.loading,
  };
}

// Custom hook for logout functionality  
export function useLogout() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useLogout must be used within an AuthProvider');
  }
  return {
    logout: context.logout,
    loading: context.loading,
  };
}