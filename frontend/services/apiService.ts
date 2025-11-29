import { supabase } from '../lib/supabase';

// Types for API responses
export interface StudySession {
  id: string;
  user_id: string;
  space_id?: string;
  duration_minutes: number;
  efficiency?: number;
  created_at: string;
}

export interface CreateSessionRequest {
  user_id: string;
  space_id?: string;
  duration_minutes: number;
  efficiency?: number;
}

export interface Profile {
  id: string;
  username: string;
  email: string;
  xp: number;
  level: number;
  streak_count: number;
  created_at: string;
}

export interface StreakData {
  current_streak: number;
  best_streak: number;
  average_efficiency: number;
}

export interface Space {
  id: string;
  name: string;
  created_by: string;
  visibility: string;
  member_count: number;
  created_at: string;
}

export interface DashboardData {
  profile: Profile;
  streak: StreakData;
  spaces: Space[];
  recent_sessions: StudySession[];
}

class ApiService {
  constructor() {
    console.log('API Service initialized with Supabase');
  }

  // Health check
  public async healthCheck(): Promise<{ message: string }> {
    try {
      const { data, error } = await supabase.from('status_checks').select('*').limit(1);
      if (error) throw error;
      return { message: 'Supabase connection successful' };
    } catch (error) {
      console.error('Health check error:', error);
      throw error;
    }
  }

  // Create a new study session
  public async createSession(sessionData: CreateSessionRequest): Promise<StudySession> {
    console.log('Creating session:', sessionData);
    const { data, error } = await supabase
      .from('study_sessions')
      .insert(sessionData)
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  // Get all sessions for a user
  public async getUserSessions(userId: string): Promise<StudySession[]> {
    console.log(`Getting sessions for user: ${userId}`);
    const { data, error } = await supabase
      .from('study_sessions')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data || [];
  }

  // Get user profile
  public async getUserProfile(userId: string): Promise<Profile> {
    console.time(`getUserProfile-${userId}`);
    console.log(`Getting profile for user: ${userId}`);
    const { data, error } = await supabase
      .from('users')
      .select('*')
      .eq('id', userId)
      .single();

    if (error) throw error;
    console.timeEnd(`getUserProfile-${userId}`);
    return data;
  }

  // Get user streaks
  public async getUserStreaks(userId: string): Promise<StreakData> {
    console.log(`Getting streaks for user: ${userId}`);
    const { data, error } = await supabase
      .from('study_sessions')
      .select('created_at, efficiency')
      .eq('user_id', userId)
      .order('created_at');

    if (error) throw error;

    // Calculate streak data
    const sessions = data || [];
    let currentStreak = 0;
    let bestStreak = 0;
    let tempStreak = 0;
    const efficiencies: number[] = [];

    // Sort sessions by date
    sessions.sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());

    for (let i = 0; i < sessions.length; i++) {
      const session = sessions[i];
      if (session.efficiency !== null && session.efficiency !== undefined) {
        efficiencies.push(session.efficiency);
      }

      // Check if consecutive days
      if (i === 0 || this.isConsecutiveDay(sessions[i-1].created_at, session.created_at)) {
        tempStreak++;
      } else {
        bestStreak = Math.max(bestStreak, tempStreak);
        tempStreak = 1;
      }
    }
    bestStreak = Math.max(bestStreak, tempStreak);

    // Check if current streak is still active (last session within last 2 days)
    const lastSession = sessions[sessions.length - 1];
    if (lastSession && this.isRecentSession(lastSession.created_at)) {
      currentStreak = tempStreak;
    }

    const averageEfficiency = efficiencies.length > 0
      ? efficiencies.reduce((sum, eff) => sum + eff, 0) / efficiencies.length
      : 0;

    return {
      current_streak: currentStreak,
      best_streak: bestStreak,
      average_efficiency: averageEfficiency
    };
  }

  private isConsecutiveDay(date1: string, date2: string): boolean {
    const d1 = new Date(date1);
    const d2 = new Date(date2);
    const diffTime = Math.abs(d2.getTime() - d1.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays === 1;
  }

  private isRecentSession(date: string): boolean {
    const sessionDate = new Date(date);
    const now = new Date();
    const diffTime = now.getTime() - sessionDate.getTime();
    const diffDays = diffTime / (1000 * 60 * 60 * 24);
    return diffDays <= 2; // Within last 2 days
  }

  // Get user spaces
  public async getUserSpaces(userId: string): Promise<Space[]> {
    console.time(`getUserSpaces-${userId}`);
    console.log(`Getting spaces for user: ${userId}`);
    const { data, error } = await supabase
      .from('space_members')
      .select('spaces(*)')
      .eq('user_id', userId);

    if (error) throw error;
    console.timeEnd(`getUserSpaces-${userId}`);
    return (data?.map((item: any) => item.spaces as Space) || []);
  }

  // Get user dashboard
  public async getUserDashboard(userId: string): Promise<DashboardData> {
    console.log(`Getting dashboard for user: ${userId}`);

    const [profile, streak, spaces, recentSessions] = await Promise.all([
      this.getUserProfile(userId),
      this.getUserStreaks(userId),
      this.getUserSpaces(userId),
      this.getUserSessions(userId).then(sessions => sessions.slice(0, 3))
    ]);

    return {
      profile,
      streak,
      spaces,
      recent_sessions: recentSessions
    };
  }

  // Create a space
  public async createSpace(spaceData: { name: string; created_by: string; visibility?: string }): Promise<Space> {
    console.time('createSpace');
    console.log('Creating space:', spaceData);
    const { data, error } = await supabase
      .from('spaces')
      .insert(spaceData)
      .select()
      .single();

    if (error) throw error;

    // Add creator to space_members
    await supabase
      .from('space_members')
      .insert({
        space_id: data.id,
        user_id: spaceData.created_by
      });

    console.timeEnd('createSpace');
    return data;
  }

  // Join a space
  public async joinSpace(spaceId: string, userId: string): Promise<{ message: string }> {
    console.log(`User ${userId} joining space ${spaceId}`);

    // Check if space exists
    const { data: spaceData, error: spaceError } = await supabase
      .from('spaces')
      .select('*')
      .eq('id', spaceId)
      .single();

    if (spaceError || !spaceData) throw new Error('Space not found');

    // Check if already a member
    const { data: memberData, error: memberError } = await supabase
      .from('space_members')
      .select('*')
      .eq('space_id', spaceId)
      .eq('user_id', userId)
      .single();

    if (memberData) throw new Error('Already a member of this space');

    // Add to space_members
    const { error: insertError } = await supabase
      .from('space_members')
      .insert({
        space_id: spaceId,
        user_id: userId
      });

    if (insertError) throw insertError;

    // Update member count
    await supabase
      .from('spaces')
      .update({ member_count: spaceData.member_count + 1 })
      .eq('id', spaceId);

    return { message: 'Successfully joined space' };
  }

  // Get space activity with pagination
  public async getSpaceActivity(spaceId: string, limit: number = 20, offset: number = 0): Promise<any[]> {
    console.log(`Getting activity for space: ${spaceId} (limit: ${limit}, offset: ${offset})`);
    const { data, error } = await supabase
      .from('space_activity')
      .select('*')
      .eq('space_id', spaceId)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (error) throw error;
    return data || [];
  }

  // Get space chat with pagination
  public async getSpaceChat(spaceId: string, limit: number = 20, offset: number = 0): Promise<any[]> {
    console.log(`Getting chat for space: ${spaceId} (limit: ${limit}, offset: ${offset})`);
    const { data, error } = await supabase
      .from('space_chat')
      .select('*')
      .eq('space_id', spaceId)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (error) throw error;
    return data || [];
  }

  // Send chat message
  public async sendChatMessage(spaceId: string, userId: string, message: string): Promise<any> {
    console.log(`Sending message to space ${spaceId}:`, message);
    const { data, error } = await supabase
      .from('space_chat')
      .insert({
        space_id: spaceId,
        user_id: userId,
        message
      })
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  // Log space activity
  public async logSpaceActivity(spaceId: string, userId: string, action: string, progress?: number): Promise<any> {
    console.log(`Logging activity in space ${spaceId}:`, action);
    const { data, error } = await supabase
      .from('space_activity')
      .insert({
        space_id: spaceId,
        user_id: userId,
        action,
        progress
      })
      .select()
      .single();

    if (error) throw error;
    return data;
  }
}

// Export singleton instance
export const apiService = new ApiService();
export default apiService;