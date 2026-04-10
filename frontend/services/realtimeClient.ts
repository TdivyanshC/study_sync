// Supabase realtime removed - all methods now return no-op functions

class RealtimeClient {
  // Supabase realtime removed - all methods return no-op functions
  subscribeToActivity(spaceId: string, callback: (activity: any) => void): () => void {
    console.log('Realtime disabled: subscribeToActivity', spaceId);
    return () => {};
  }

  subscribeToChat(spaceId: string, callback: (chat: any) => void): () => void {
    console.log('Realtime disabled: subscribeToChat', spaceId);
    return () => {};
  }

  subscribeToBadges(userId: string, callback: (badge: any) => void): () => void {
    console.log('Realtime disabled: subscribeToBadges', userId);
    return () => {};
  }

  trackPresence(spaceId: string, userId: string, onPresenceUpdate: (onlineUsers: string[]) => void): () => void {
    console.log('Realtime disabled: trackPresence', spaceId, userId);
    return () => {};
  }

  unsubscribeAll() {
    console.log('Realtime disabled: unsubscribeAll');
  }
}

// Create singleton instance
export const realtimeClient = new RealtimeClient();
export default realtimeClient;