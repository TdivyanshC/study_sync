import { supabaseAdmin } from '../config/supabase';
import { calculateDurationSeconds } from '../utils/time';
import { v4 as uuidv4 } from 'uuid';

export interface SessionEvent {
  id: string;
  user_id: string;
  session_type_id?: string;
  space_id?: string;
  started_at: string;
  ended_at?: string;
  duration_seconds?: number;
  created_at: string;
}

export interface CreateSessionInput {
  user_id: string;
  session_type_id?: string;
  space_id?: string;
  started_at?: string;
}

export interface EndSessionInput {
  session_id: string;
  ended_at?: string;
}

export class SessionService {
  private tableName = 'session_events';

  /**
   * Start a new session - insert with started_at timestamp
   */
  async startSession(input: CreateSessionInput): Promise<SessionEvent> {
    const { data, error } = await supabaseAdmin
      .from(this.tableName)
      .insert({
        id: uuidv4(),
        user_id: input.user_id,
        session_type_id: input.session_type_id,
        space_id: input.space_id,
        started_at: input.started_at || new Date().toISOString(),
      })
      .select()
      .single();

    if (error) {
      console.error('Error starting session:', error);
      throw new Error(`Failed to start session: ${error.message}`);
    }

    return data;
  }

  /**
   * End a session - update with ended_at and calculate duration
   */
  async endSession(input: EndSessionInput): Promise<SessionEvent> {
    // Get the session first
    const { data: existing, error: fetchError } = await supabaseAdmin
      .from(this.tableName)
      .select('*')
      .eq('id', input.session_id)
      .single();

    if (fetchError || !existing) {
      throw new Error('Session not found');
    }

    if (existing.ended_at) {
      throw new Error('Session already ended');
    }

    const endedAt = input.ended_at || new Date().toISOString();
    const durationSeconds = calculateDurationSeconds(
      new Date(existing.started_at),
      new Date(endedAt)
    );

    const { data, error } = await supabaseAdmin
      .from(this.tableName)
      .update({
        ended_at: endedAt,
        duration_seconds: durationSeconds,
      })
      .eq('id', input.session_id)
      .select()
      .single();

    if (error) {
      console.error('Error ending session:', error);
      throw new Error(`Failed to end session: ${error.message}`);
    }

    return data;
  }

  /**
   * Get active session for user (started but not ended)
   */
  async getActiveSession(userId: string): Promise<SessionEvent | null> {
    const { data, error } = await supabaseAdmin
      .from(this.tableName)
      .select('*')
      .eq('user_id', userId)
      .is('ended_at', null)
      .order('started_at', { ascending: false })
      .limit(1)
      .single();

    if (error && error.code !== 'PGRST116') {
      console.error('Error getting active session:', error);
      throw new Error(`Failed to get active session: ${error.message}`);
    }

    return data || null;
  }

  /**
   * Get user's sessions with pagination
   */
  async getUserSessions(
    userId: string,
    options: { limit?: number; offset?: number; spaceId?: string } = {}
  ): Promise<SessionEvent[]> {
    let query = supabaseAdmin
      .from(this.tableName)
      .select('*')
      .eq('user_id', userId)
      .order('started_at', { ascending: false });

    if (options.spaceId) {
      query = query.eq('space_id', options.spaceId);
    }

    if (options.offset) {
      query = query.range(options.offset, (options.offset || 0) + (options.limit || 20) - 1);
    } else if (options.limit) {
      query = query.limit(options.limit);
    }

    const { data, error } = await query;

    if (error) {
      console.error('Error getting user sessions:', error);
      throw new Error(`Failed to get sessions: ${error.message}`);
    }

    return data || [];
  }

  /**
   * Get total session time for user
   */
  async getTotalSessionTime(userId: string): Promise<number> {
    const { data, error } = await supabaseAdmin
      .from(this.tableName)
      .select('duration_seconds')
      .eq('user_id', userId)
      .not('duration_seconds', 'is', null);

    if (error) {
      console.error('Error getting total session time:', error);
      throw new Error(`Failed to get total session time: ${error.message}`);
    }

    return (data || []).reduce((sum, s) => sum + (s.duration_seconds || 0), 0);
  }
}

export const sessionService = new SessionService();
