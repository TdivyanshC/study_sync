import { supabaseAdmin } from '../config/supabase';
import { getStartOfDay, getStartOfWeek, getStartOfMonth } from '../utils/time';

export interface ProductivityStats {
  today: {
    total_seconds: number;
    session_count: number;
    efficiency?: number;
  };
  weekly: {
    total_seconds: number;
    session_count: number;
    efficiency?: number;
  };
  monthly: {
    total_seconds: number;
    session_count: number;
    efficiency?: number;
  };
  total: {
    total_seconds: number;
    session_count: number;
  };
}

export interface StreakData {
  current_streak: number;
  best_streak: number;
  average_efficiency: number;
  last_session_date?: string;
}

export class StatsService {
  private sessionTable = 'session_events';

  /**
   * Get aggregated productivity stats for a user
   */
  async getProductivityStats(userId: string): Promise<ProductivityStats> {
    try {
      const today = getStartOfDay();
      const weekStart = getStartOfWeek();
      const monthStart = getStartOfMonth();

      // Parallel queries with timeout protection
      const [todayData, weekData, monthData, totalData] = await Promise.all([
        this.getAggregatedStatsWithTimeout(userId, today.toISOString(), 5000),
        this.getAggregatedStatsWithTimeout(userId, weekStart.toISOString(), 5000),
        this.getAggregatedStatsWithTimeout(userId, monthStart.toISOString(), 5000),
        this.getTotalStatsWithTimeout(userId, 5000),
      ]);

      return {
        today: todayData,
        weekly: weekData,
        monthly: monthData,
        total: totalData,
      };
    } catch (error) {
      console.error('Error getting productivity stats:', error);
      // Return safe defaults on error
      return {
        today: { total_seconds: 0, session_count: 0 },
        weekly: { total_seconds: 0, session_count: 0 },
        monthly: { total_seconds: 0, session_count: 0 },
        total: { total_seconds: 0, session_count: 0 },
      };
    }
  }

  /**
   * Get aggregated stats with timeout
   */
  private async getAggregatedStatsWithTimeout(
    userId: string,
    since: string,
    timeoutMs: number
  ): Promise<{ total_seconds: number; session_count: number; efficiency?: number }> {
    try {
      const query = supabaseAdmin
        .from(this.sessionTable)
        .select('duration_seconds, efficiency')
        .eq('user_id', userId)
        .gte('started_at', since)
        .not('duration_seconds', 'is', null);

      // Create a timeout promise
      const timeoutPromise = new Promise<never>((_, reject) => 
        setTimeout(() => reject(new Error('Query timeout')), timeoutMs)
      );

      const { data, error } = await Promise.race([query, timeoutPromise]) as any;

      if (error) {
        throw new Error(error.message);
      }

      const sessions = data || [];
      const totalSeconds = sessions.reduce((sum: number, s: any) => sum + (s.duration_seconds || 0), 0);
      const efficiencies = sessions.filter((s: any) => s.efficiency !== null && s.efficiency !== undefined);
      const avgEfficiency = efficiencies.length > 0
        ? efficiencies.reduce((sum: number, s: any) => sum + (s.efficiency || 0), 0) / efficiencies.length
        : undefined;

      return {
        total_seconds: totalSeconds,
        session_count: sessions.length,
        efficiency: avgEfficiency,
      };
    } catch (error) {
      console.error('Error in getAggregatedStatsWithTimeout:', error);
      return { total_seconds: 0, session_count: 0 };
    }
  }

  /**
   * Get total stats with timeout
   */
  private async getTotalStatsWithTimeout(
    userId: string,
    timeoutMs: number
  ): Promise<{ total_seconds: number; session_count: number }> {
    try {
      const query = supabaseAdmin
        .from(this.sessionTable)
        .select('duration_seconds')
        .eq('user_id', userId)
        .not('duration_seconds', 'is', null);

      const timeoutPromise = new Promise<never>((_, reject) => 
        setTimeout(() => reject(new Error('Query timeout')), timeoutMs)
      );

      const { data, error } = await Promise.race([query, timeoutPromise]) as any;

      if (error) {
        throw new Error(error.message);
      }

      const sessions = data || [];
      return {
        total_seconds: sessions.reduce((sum: number, s: any) => sum + (s.duration_seconds || 0), 0),
        session_count: sessions.length,
      };
    } catch (error) {
      console.error('Error in getTotalStatsWithTimeout:', error);
      return { total_seconds: 0, session_count: 0 };
    }
  }

  /**
   * Get total stats (no date filter)
   */
  private async getTotalStats(
    userId: string
  ): Promise<{ total_seconds: number; session_count: number }> {
    const { data, error } = await supabaseAdmin
      .from(this.sessionTable)
      .select('duration_seconds')
      .eq('user_id', userId)
      .not('duration_seconds', 'is', null);

    if (error) {
      console.error('Error getting total stats:', error);
      throw new Error(`Failed to get total stats: ${error.message}`);
    }

    const sessions = data || [];
    return {
      total_seconds: sessions.reduce((sum, s) => sum + (s.duration_seconds || 0), 0),
      session_count: sessions.length,
    };
  }

  /**
   * Calculate streak data for a user
   */
  async getStreakData(userId: string): Promise<StreakData> {
    try {
      // Get all sessions sorted by date with timeout
      const query = supabaseAdmin
        .from(this.sessionTable)
        .select('started_at, efficiency')
        .eq('user_id', userId)
        .not('started_at', 'is', null)
        .order('started_at', { ascending: true });

      const timeoutPromise = new Promise<never>((_, reject) => 
        setTimeout(() => reject(new Error('Query timeout')), 8000)
      );

      const { data, error } = await Promise.race([query, timeoutPromise]) as any;

      if (error) {
        throw new Error(error.message);
      }

      const sessions = data || [];
      
      if (sessions.length === 0) {
        return {
          current_streak: 0,
          best_streak: 0,
          average_efficiency: 0,
        };
      }

      // Calculate streaks
      let currentStreak = 0;
      let bestStreak = 0;
      let tempStreak = 0;
      const efficiencies: number[] = [];
      let lastSessionDate: string | undefined;

      // Get unique dates (start of day)
      const uniqueDates = new Set<string>();
      sessions.forEach((s: any) => {
        const date = new Date(s.started_at).toISOString().split('T')[0];
        uniqueDates.add(date);
        efficiencies.push(s.efficiency || 0);
        lastSessionDate = s.started_at;
      });

      // Sort unique dates
      const sortedDates = Array.from(uniqueDates).sort();

      // Calculate consecutive days
      for (let i = 0; i < sortedDates.length; i++) {
        if (i === 0) {
          tempStreak = 1;
        } else {
          const prev = new Date(sortedDates[i - 1]);
          const curr = new Date(sortedDates[i]);
          const diffDays = Math.ceil((curr.getTime() - prev.getTime()) / (1000 * 60 * 60 * 24));
          
          if (diffDays === 1) {
            tempStreak++;
          } else {
            bestStreak = Math.max(bestStreak, tempStreak);
            tempStreak = 1;
          }
        }
      }
      bestStreak = Math.max(bestStreak, tempStreak);

      // Check if current streak is active (last session within 2 days)
      if (lastSessionDate) {
        const lastSession = new Date(lastSessionDate);
        const now = new Date();
        const diffDays = (now.getTime() - lastSession.getTime()) / (1000 * 60 * 60 * 24);
        
        if (diffDays <= 2) {
          currentStreak = tempStreak;
        }
      }

      const avgEfficiency = efficiencies.length > 0
        ? efficiencies.reduce((sum, e) => sum + e, 0) / efficiencies.length
        : 0;

      return {
        current_streak: currentStreak,
        best_streak: bestStreak,
        average_efficiency: avgEfficiency,
        last_session_date: lastSessionDate,
      };
    } catch (error) {
      console.error('Error getting streak data:', error);
      return {
        current_streak: 0,
        best_streak: 0,
        average_efficiency: 0,
      };
    }
  }

  /**
   * Get today's metrics (convenience method)
   */
  async getTodayMetrics(userId: string): Promise<{ total_seconds: number; session_count: number }> {
    try {
      const today = getStartOfDay();
      const query = supabaseAdmin
        .from(this.sessionTable)
        .select('duration_seconds')
        .eq('user_id', userId)
        .gte('started_at', today.toISOString())
        .not('duration_seconds', 'is', null);

      const timeoutPromise = new Promise<never>((_, reject) => 
        setTimeout(() => reject(new Error('Query timeout')), 5000)
      );

      const { data, error } = await Promise.race([query, timeoutPromise]) as any;

      if (error) {
        throw new Error(error.message);
      }

      const sessions = data || [];
      return {
        total_seconds: sessions.reduce((sum: number, s: any) => sum + (s.duration_seconds || 0), 0),
        session_count: sessions.length,
      };
    } catch (error) {
      console.error('Error getting today metrics:', error);
      return { total_seconds: 0, session_count: 0 };
    }
  }
}

export const statsService = new StatsService();
