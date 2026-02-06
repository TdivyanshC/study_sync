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
    const today = getStartOfDay();
    const weekStart = getStartOfWeek();
    const monthStart = getStartOfMonth();

    // Parallel queries for efficiency
    const [todayData, weekData, monthData, totalData] = await Promise.all([
      this.getAggregatedStats(userId, today.toISOString()),
      this.getAggregatedStats(userId, weekStart.toISOString()),
      this.getAggregatedStats(userId, monthStart.toISOString()),
      this.getTotalStats(userId),
    ]);

    return {
      today: todayData,
      weekly: weekData,
      monthly: monthData,
      total: totalData,
    };
  }

  /**
   * Get aggregated stats since a given date
   */
  private async getAggregatedStats(
    userId: string,
    since: string
  ): Promise<{ total_seconds: number; session_count: number; efficiency?: number }> {
    const { data, error } = await supabaseAdmin
      .from(this.sessionTable)
      .select('duration_seconds, efficiency')
      .eq('user_id', userId)
      .gte('started_at', since)
      .not('duration_seconds', 'is', null);

    if (error) {
      console.error('Error getting aggregated stats:', error);
      throw new Error(`Failed to get stats: ${error.message}`);
    }

    const sessions = data || [];
    const totalSeconds = sessions.reduce((sum, s) => sum + (s.duration_seconds || 0), 0);
    const efficiencies = sessions.filter(s => s.efficiency !== null && s.efficiency !== undefined);
    const avgEfficiency = efficiencies.length > 0
      ? efficiencies.reduce((sum, s) => sum + (s.efficiency || 0), 0) / efficiencies.length
      : undefined;

    return {
      total_seconds: totalSeconds,
      session_count: sessions.length,
      efficiency: avgEfficiency,
    };
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
    // Get all sessions sorted by date
    const { data, error } = await supabaseAdmin
      .from(this.sessionTable)
      .select('started_at, efficiency')
      .eq('user_id', userId)
      .not('started_at', 'is', null)
      .order('started_at', { ascending: true });

    if (error) {
      console.error('Error getting streak data:', error);
      throw new Error(`Failed to get streak data: ${error.message}`);
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
    sessions.forEach(s => {
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
  }

  /**
   * Get today's metrics (convenience method)
   */
  async getTodayMetrics(userId: string): Promise<{ total_seconds: number; session_count: number }> {
    const today = getStartOfDay();
    const { data, error } = await supabaseAdmin
      .from(this.sessionTable)
      .select('duration_seconds')
      .eq('user_id', userId)
      .gte('started_at', today.toISOString())
      .not('duration_seconds', 'is', null);

    if (error) {
      console.error('Error getting today metrics:', error);
      throw new Error(`Failed to get today metrics: ${error.message}`);
    }

    const sessions = data || [];
    return {
      total_seconds: sessions.reduce((sum, s) => sum + (s.duration_seconds || 0), 0),
      session_count: sessions.length,
    };
  }
}

export const statsService = new StatsService();
