import { supabase } from '../lib/supabaseClient';
import { RealtimeChannel } from '@supabase/supabase-js';

interface ActivityEvent {
  id: string;
  space_id: string;
  user_id: string;
  action: string;
  progress?: number;
  created_at: string;
}

interface ChatEvent {
  id: string;
  space_id: string;
  user_id: string;
  message: string;
  created_at: string;
}

interface BadgeEvent {
  id: string;
  user_id: string;
  badge_id: string;
  achieved_at: string;
  badges: {
    title: string;
    description: string;
  };
}

interface PresenceState {
  [userId: string]: {
    user_id: string;
    online_at: string;
  };
}

class RealtimeClient {
  private activityChannel: RealtimeChannel | null = null;
  private chatChannel: RealtimeChannel | null = null;
  private badgeChannel: RealtimeChannel | null = null;
  private presenceChannel: RealtimeChannel | null = null;

  // Subscribe to space activity events
  subscribeToActivity(spaceId: string, callback: (activity: ActivityEvent) => void): () => void {
    const channel = supabase
      .channel(`activity-${spaceId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'space_activity',
          filter: `space_id=eq.${spaceId}`,
        },
        (payload) => {
          console.log('Activity event received:', payload);
          callback(payload.new as ActivityEvent);
        }
      )
      .subscribe();

    return () => supabase.removeChannel(channel);
  }

  // Subscribe to space chat events
  subscribeToChat(spaceId: string, callback: (chat: ChatEvent) => void): () => void {
    const channel = supabase
      .channel(`chat-${spaceId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'space_chat',
          filter: `space_id=eq.${spaceId}`,
        },
        (payload) => {
          console.log('Chat event received:', payload);
          callback(payload.new as ChatEvent);
        }
      )
      .subscribe();

    return () => supabase.removeChannel(channel);
  }

  // Subscribe to user badge events
  subscribeToBadges(userId: string, callback: (badge: BadgeEvent) => void): () => void {
    // Unsubscribe from previous channel if exists
    this.unsubscribeBadges();

    this.badgeChannel = supabase
      .channel(`user_badges_${userId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'user_badges',
          filter: `user_id=eq.${userId}`,
        },
        (payload) => {
          console.log('Badge event received:', payload);
          callback(payload.new as BadgeEvent);
        }
      )
      .subscribe();

    // Return unsubscribe function
    return () => this.unsubscribeBadges();
  }

  // Track presence in a space
  trackPresence(
    spaceId: string,
    userId: string,
    onPresenceUpdate: (onlineUsers: string[]) => void
  ): () => void {
    const channel = supabase.channel(`presence-${spaceId}`, {
      config: {
        presence: {
          key: userId,
        },
      },
    });

    channel
      .on('presence', { event: 'sync' }, () => {
        const state = channel.presenceState();
        const onlineUsers = Object.keys(state);
        console.log('Presence sync:', onlineUsers);
        onPresenceUpdate(onlineUsers);
      })
      .subscribe(async (status) => {
        if (status === 'SUBSCRIBED') {
          await channel.track({
            user_id: userId,
            online_at: new Date().toISOString(),
          });
        }
      });

    return () => supabase.removeChannel(channel);
  }

  // Unsubscribe methods
  private unsubscribeActivity() {
    if (this.activityChannel) {
      supabase.removeChannel(this.activityChannel);
      this.activityChannel = null;
    }
  }

  private unsubscribeChat() {
    if (this.chatChannel) {
      supabase.removeChannel(this.chatChannel);
      this.chatChannel = null;
    }
  }

  private unsubscribeBadges() {
    if (this.badgeChannel) {
      supabase.removeChannel(this.badgeChannel);
      this.badgeChannel = null;
    }
  }

  private unsubscribePresence() {
    if (this.presenceChannel) {
      this.presenceChannel.untrack();
      supabase.removeChannel(this.presenceChannel);
      this.presenceChannel = null;
    }
  }

  // Unsubscribe from all channels
  unsubscribeAll() {
    this.unsubscribeActivity();
    this.unsubscribeChat();
    this.unsubscribeBadges();
    this.unsubscribePresence();
  }
}

// Create singleton instance
export const realtimeClient = new RealtimeClient();
export default realtimeClient;