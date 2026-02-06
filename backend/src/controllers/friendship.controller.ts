import { Request, Response } from 'express';
import { supabaseAdmin } from '../config/supabase';
import { v4 as uuidv4 } from 'uuid';

export class FriendshipController {
  /**
   * Get user's friends (accepted)
   */
  async getFriends(req: Request, res: Response): Promise<void> {
    try {
      const userId = (req as any).user?.id;

      if (!userId) {
        res.status(401).json({ error: 'Unauthorized' });
        return;
      }

      // Get friendships where user is requester or receiver and status is accepted
      const { data, error } = await supabaseAdmin
        .from('friendships')
        .select(`
          *,
          requester:users!requester_id (id, username, avatar_url, public_user_id),
          receiver:users!receiver_id (id, username, avatar_url, public_user_id)
        `)
        .or(`requester_id.eq.${userId},receiver_id.eq.${userId}`)
        .eq('status', 'accepted');

      if (error) {
        console.error('Get friends error:', error);
        res.status(500).json({ error: 'Failed to get friends' });
        return;
      }

      // Transform to flat friend list
      const friends = (data || []).map((f: any) => {
        const isRequester = f.requester_id === userId;
        return isRequester ? f.receiver : f.requester;
      });

      res.json(friends);
    } catch (error) {
      console.error('Get friends error:', error);
      res.status(500).json({ error: 'Failed to get friends' });
    }
  }

  /**
   * Get pending friend requests (received)
   */
  async getPendingRequests(req: Request, res: Response): Promise<void> {
    try {
      const userId = (req as any).user?.id;

      if (!userId) {
        res.status(401).json({ error: 'Unauthorized' });
        return;
      }

      const { data, error } = await supabaseAdmin
        .from('friendships')
        .select(`
          *,
          requester:users!requester_id (id, username, avatar_url, public_user_id)
        `)
        .eq('receiver_id', userId)
        .eq('status', 'pending');

      if (error) {
        console.error('Get pending requests error:', error);
        res.status(500).json({ error: 'Failed to get pending requests' });
        return;
      }

      res.json(data || []);
    } catch (error) {
      console.error('Get pending requests error:', error);
      res.status(500).json({ error: 'Failed to get pending requests' });
    }
  }

  /**
   * Send friend request
   */
  async sendRequest(req: Request, res: Response): Promise<void> {
    try {
      const userId = (req as any).user?.id;
      const { receiver_id } = req.body;

      if (!userId) {
        res.status(401).json({ error: 'Unauthorized' });
        return;
      }

      if (userId === receiver_id) {
        res.status(400).json({ error: 'Cannot add yourself as friend' });
        return;
      }

      // Check if already friends or request exists
      const { data: existing } = await supabaseAdmin
        .from('friendships')
        .select('*')
        .or(`(requester_id.eq.${userId},receiver_id.eq.${receiver_id}),(requester_id.eq.${receiver_id},receiver_id.eq.${userId})`)
        .in('status', ['pending', 'accepted'])
        .single();

      if (existing) {
        res.status(400).json({ error: 'Friend request already exists or users are already friends' });
        return;
      }

      const { data, error } = await supabaseAdmin
        .from('friendships')
        .insert({
          id: uuidv4(),
          requester_id: userId,
          receiver_id,
          status: 'pending',
        })
        .select()
        .single();

      if (error) {
        console.error('Send request error:', error);
        res.status(500).json({ error: 'Failed to send friend request' });
        return;
      }

      res.status(201).json(data);
    } catch (error) {
      console.error('Send request error:', error);
      res.status(500).json({ error: 'Failed to send friend request' });
    }
  }

  /**
   * Accept friend request
   */
  async acceptRequest(req: Request, res: Response): Promise<void> {
    try {
      const userId = (req as any).user?.id;
      const { request_id } = req.body;

      if (!userId) {
        res.status(401).json({ error: 'Unauthorized' });
        return;
      }

      // Verify request belongs to user
      const { data: request } = await supabaseAdmin
        .from('friendships')
        .select('*')
        .eq('id', request_id)
        .eq('receiver_id', userId)
        .eq('status', 'pending')
        .single();

      if (!request) {
        res.status(404).json({ error: 'Request not found' });
        return;
      }

      const { data, error } = await supabaseAdmin
        .from('friendships')
        .update({ status: 'accepted' })
        .eq('id', request_id)
        .select()
        .single();

      if (error) {
        console.error('Accept request error:', error);
        res.status(500).json({ error: 'Failed to accept request' });
        return;
      }

      res.json(data);
    } catch (error) {
      console.error('Accept request error:', error);
      res.status(500).json({ error: 'Failed to accept request' });
    }
  }

  /**
   * Reject friend request
   */
  async rejectRequest(req: Request, res: Response): Promise<void> {
    try {
      const userId = (req as any).user?.id;
      const { request_id } = req.body;

      if (!userId) {
        res.status(401).json({ error: 'Unauthorized' });
        return;
      }

      const { data, error } = await supabaseAdmin
        .from('friendships')
        .update({ status: 'rejected' })
        .eq('id', request_id)
        .eq('receiver_id', userId)
        .select()
        .single();

      if (error) {
        console.error('Reject request error:', error);
        res.status(500).json({ error: 'Failed to reject request' });
        return;
      }

      res.json(data);
    } catch (error) {
      console.error('Reject request error:', error);
      res.status(500).json({ error: 'Failed to reject request' });
    }
  }

  /**
   * Remove friend
   */
  async removeFriend(req: Request, res: Response): Promise<void> {
    try {
      const userId = (req as any).user?.id;
      const { friend_id } = req.body;

      if (!userId) {
        res.status(401).json({ error: 'Unauthorized' });
        return;
      }

      const { error } = await supabaseAdmin
        .from('friendships')
        .delete()
        .eq('status', 'accepted')
        .or(`(requester_id.eq.${userId},receiver_id.eq.${friend_id}),(requester_id.eq.${friend_id},receiver_id.eq.${userId})`);

      if (error) {
        console.error('Remove friend error:', error);
        res.status(500).json({ error: 'Failed to remove friend' });
        return;
      }

      res.json({ message: 'Friend removed successfully' });
    } catch (error) {
      console.error('Remove friend error:', error);
      res.status(500).json({ error: 'Failed to remove friend' });
    }
  }
}

export const friendshipController = new FriendshipController();
