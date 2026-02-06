import { supabaseAdmin } from '../config/supabase';
import { v4 as uuidv4 } from 'uuid';
import { statsService } from './stats.service';

export interface Space {
  id: string;
  created_by: string;
  name: string;
  description?: string;
  created_at: string;
}

export interface SpaceMember {
  id: string;
  space_id: string;
  user_id: string;
  role: 'owner' | 'member';
  joined_at: string;
}

export interface CreateSpaceInput {
  name: string;
  description?: string;
  created_by: string;
}

export class SpaceService {
  private spacesTable = 'spaces';
  private membersTable = 'space_members';

  /**
   * Create a new space with creator as owner
   */
  async createSpace(input: CreateSpaceInput): Promise<Space> {
    // Create space
    const { data: space, error: spaceError } = await supabaseAdmin
      .from(this.spacesTable)
      .insert({
        id: uuidv4(),
        name: input.name,
        description: input.description,
        created_by: input.created_by,
      })
      .select()
      .single();

    if (spaceError) {
      console.error('Error creating space:', spaceError);
      throw new Error(`Failed to create space: ${spaceError.message}`);
    }

    // Add creator as owner member
    const { error: memberError } = await supabaseAdmin
      .from(this.membersTable)
      .insert({
        id: uuidv4(),
        space_id: space.id,
        user_id: input.created_by,
        role: 'owner',
      });

    if (memberError) {
      console.error('Error adding space member:', memberError);
      throw new Error(`Failed to add space member: ${memberError.message}`);
    }

    return space;
  }

  /**
   * Get space by ID
   */
  async getSpace(spaceId: string): Promise<Space | null> {
    const { data, error } = await supabaseAdmin
      .from(this.spacesTable)
      .select('*')
      .eq('id', spaceId)
      .single();

    if (error && error.code !== 'PGRST116') {
      console.error('Error getting space:', error);
      throw new Error(`Failed to get space: ${error.message}`);
    }

    return data || null;
  }

  /**
   * Get all spaces for a user
   */
  async getUserSpaces(userId: string): Promise<Space[]> {
    const { data, error } = await supabaseAdmin
      .from(this.membersTable)
      .select(`
        spaces:spaces (*)
      `)
      .eq('user_id', userId);

    if (error) {
      console.error('Error getting user spaces:', error);
      throw new Error(`Failed to get spaces: ${error.message}`);
    }

    return (data || []).map((item: any) => item.spaces);
  }

  /**
   * Check if user is a member of space
   */
  async isMember(spaceId: string, userId: string): Promise<boolean> {
    const { data, error } = await supabaseAdmin
      .from(this.membersTable)
      .select('id')
      .eq('space_id', spaceId)
      .eq('user_id', userId)
      .single();

    if (error && error.code !== 'PGRST116') {
      console.error('Error checking membership:', error);
      throw new Error(`Failed to check membership: ${error.message}`);
    }

    return !!data;
  }

  /**
   * Get user's role in space
   */
  async getMemberRole(spaceId: string, userId: string): Promise<string | null> {
    const { data, error } = await supabaseAdmin
      .from(this.membersTable)
      .select('role')
      .eq('space_id', spaceId)
      .eq('user_id', userId)
      .single();

    if (error && error.code !== 'PGRST116') {
      console.error('Error getting role:', error);
      throw new Error(`Failed to get role: ${error.message}`);
    }

    return data?.role || null;
  }

  /**
   * Add user to space
   */
  async joinSpace(spaceId: string, userId: string): Promise<SpaceMember> {
    // Check if already a member
    const isMember = await this.isMember(spaceId, userId);
    if (isMember) {
      throw new Error('Already a member of this space');
    }

    const { data, error } = await supabaseAdmin
      .from(this.membersTable)
      .insert({
        id: uuidv4(),
        space_id: spaceId,
        user_id: userId,
        role: 'member',
      })
      .select()
      .single();

    if (error) {
      console.error('Error joining space:', error);
      throw new Error(`Failed to join space: ${error.message}`);
    }

    return data;
  }

  /**
   * Get space members
   */
  async getSpaceMembers(spaceId: string): Promise<any[]> {
    const { data, error } = await supabaseAdmin
      .from(this.membersTable)
      .select(`
        *,
        user:users (id, username, email, avatar_url)
      `)
      .eq('space_id', spaceId);

    if (error) {
      console.error('Error getting space members:', error);
      throw new Error(`Failed to get members: ${error.message}`);
    }

    return data || [];
  }

  /**
   * Get space activity (session events)
   */
  async getSpaceActivity(spaceId: string, limit: number = 20): Promise<any[]> {
    const { data, error } = await supabaseAdmin
      .from('session_events')
      .select(`
        *,
        user:users (id, username, avatar_url)
      `)
      .eq('space_id', spaceId)
      .not('ended_at', 'is', null)
      .order('ended_at', { ascending: false })
      .limit(limit);

    if (error) {
      console.error('Error getting space activity:', error);
      throw new Error(`Failed to get activity: ${error.message}`);
    }

    return data || [];
  }

  /**
   * Get space statistics
   */
  async getSpaceStats(spaceId: string): Promise<{
    member_count: number;
    total_session_seconds: number;
    active_today: number;
  }> {
    // Get member count
    const { count: memberCount } = await supabaseAdmin
      .from(this.membersTable)
      .select('id', { count: 'exact', head: true })
      .eq('space_id', spaceId);

    // Get total session time for space
    const { data: sessions } = await supabaseAdmin
      .from('session_events')
      .select('duration_seconds, started_at')
      .eq('space_id', spaceId)
      .not('duration_seconds', 'is', null);

    const totalSeconds = (sessions || []).reduce(
      (sum: number, s: any) => sum + (s.duration_seconds || 0),
      0
    );

    // Get active members today
    const today = new Date();
    today.setUTCHours(0, 0, 0, 0);

    const { data: todaySessions } = await supabaseAdmin
      .from('session_events')
      .select('user_id')
      .eq('space_id', spaceId)
      .gte('started_at', today.toISOString());

    const activeToday = new Set((todaySessions || []).map(s => s.user_id)).size;

    return {
      member_count: memberCount || 0,
      total_session_seconds: totalSeconds,
      active_today: activeToday,
    };
  }

  /**
   * Delete space (only owner)
   */
  async deleteSpace(spaceId: string, userId: string): Promise<void> {
    const role = await this.getMemberRole(spaceId, userId);
    if (role !== 'owner') {
      throw new Error('Only the owner can delete this space');
    }

    const { error } = await supabaseAdmin
      .from(this.spacesTable)
      .delete()
      .eq('id', spaceId);

    if (error) {
      console.error('Error deleting space:', error);
      throw new Error(`Failed to delete space: ${error.message}`);
    }
  }
}

export const spaceService = new SpaceService();
