import SessionEvent from '../models/SessionEvent';
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
        this.getAggregatedStatsWithTimeout(userId, today, 5000),
        this.getAggregatedStatsWithTimeout(userId, weekStart, 5000),
        this.getAggregatedStatsWithTimeout(userId, monthStart, 5000),
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
    since: Date,
    timeoutMs: number
  ): Promise<{ total_seconds: number; session_count: number; efficiency?: number }> {
    try {
      const query = SessionEvent.find({
        userId: userId,
        startedAt: { $gte: since },
        durationSeconds: { $exists: true, $ne: null }
      }).select('durationSeconds efficiency');

      // Create a timeout promise
      const timeoutPromise = new Promise<never>((_, reject) => 
        setTimeout(() => reject(new Error('Query timeout')), timeoutMs)
      );

      const sessions = await Promise.race([query, timeoutPromise]) as any;

      const totalSeconds = sessions.reduce((sum: number, session: any) => sum + (session.durationSeconds || 0), 0);
      const efficiencies = sessions.filter((session: any) => session.efficiency !== null && session.efficiency !== undefined);
      const avgEfficiency = efficiencies.length > 0
        ? efficiencies.reduce((sum: number, session: any) => sum + (session.efficiency || 0), 0) / efficiencies.length
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
      const query = SessionEvent.find({
        userId: userId,
        durationSeconds: { $exists: true, $ne: null }
      }).select('durationSeconds');

      const timeoutPromise = new Promise<never>((_, reject) => 
        setTimeout(() => reject(new Error('Query timeout')), timeoutMs)
      );

      const sessions = await Promise.race([query, timeoutPromise]) as any;
      
      return {
        total_seconds: sessions.reduce((sum: number, session: any) => sum + (session.durationSeconds || 0), 0),
        session_count: sessions.length,
      };
    } catch (error) {
      console.error('Error in getTotalStatsWithTimeout:', error);
      return { total_seconds: 0, session_count: 0 };
    }
  }

  /**
   * Calculate streak data for a user
   */
  async getStreakData(userId: string): Promise<StreakData> {
    try {
      // Get all sessions sorted by date with timeout
      const query = SessionEvent.find({
        userId: userId,
        startedAt: { $exists: true, $ne: null }
      }).select('startedAt efficiency').sort({ startedAt: 1 });

      const timeoutPromise = new Promise<never>((_, reject) => 
        setTimeout(() => reject(new Error('Query timeout')), 8000)
      );

      const sessions = await Promise.race([query, timeoutPromise]) as any;
      
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
      let lastSessionDate: Date | undefined;
      const uniqueDates = new Set<string>();

      // Get unique dates (start of day)
      sessions.forEach((session: any) => {
        const date = new Date(session.startedAt).toISOString().split('T')[0];
        uniqueDates.add(date);
        efficiencies.push(session.efficiency || 0);
        lastSessionDate = session.startedAt;
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
        last_session_date: lastSessionDate?.toISOString(),
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
      const sessions = await SessionEvent.find({
        userId: userId,
        startedAt: { $gte: today },
        durationSeconds: { $exists: true, $ne: null }
      }).select('durationSeconds');

      return {
        total_seconds: sessions.reduce((sum: number, session: any) => sum + (session.durationSeconds || 0), 0),
        session_count: sessions.length,
      };
    } catch (error) {
      console.error('Error getting today metrics:', error);
      return { total_seconds: 0, session_count: 0 };
    }
  }
}

export const statsService = new StatsService();
