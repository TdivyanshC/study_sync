import { Request, Response } from 'express';
import { statsService } from '../services/stats.service';

export class StatsController {
  /**
   * Get comprehensive productivity stats
   * Supports both authenticated user (no params) and specific userId in path
   */
  async getProductivityStats(req: Request, res: Response): Promise<void> {
    try {
      // Prefer userId from path params if provided, otherwise use authenticated user
      const userId = req.params.userId || (req as any).user?.id;

      if (!userId) {
        res.status(401).json({ error: 'Unauthorized' });
        return;
      }

      const stats = await statsService.getProductivityStats(userId);
      res.json(stats);
    } catch (error) {
      console.error('Get productivity stats error:', error);
      res.status(500).json({ error: 'Failed to get productivity stats' });
    }
  }

  /**
   * Get streak data
   * Supports both authenticated user (no params) and specific userId in path
   */
  async getStreakData(req: Request, res: Response): Promise<void> {
    try {
      // Prefer userId from path params if provided, otherwise use authenticated user
      const userId = req.params.userId || (req as any).user?.id;

      if (!userId) {
        res.status(401).json({ error: 'Unauthorized' });
        return;
      }

      const streak = await statsService.getStreakData(userId);
      res.json(streak);
    } catch (error) {
      console.error('Get streak data error:', error);
      res.status(500).json({ error: 'Failed to get streak data' });
    }
  }

  /**
   * Get today's metrics (convenience endpoint)
   * Supports both authenticated user (no params) and specific userId in path
   */
  async getTodayMetrics(req: Request, res: Response): Promise<void> {
    try {
      // Prefer userId from path params if provided, otherwise use authenticated user
      // Also check query params for backward compatibility
      const userId = req.params.userId || req.query.user_id as string || (req as any).user?.id;

      if (!userId) {
        res.status(401).json({ error: 'Unauthorized' });
        return;
      }

      const metrics = await statsService.getTodayMetrics(userId);
      res.json(metrics);
    } catch (error) {
      console.error('Get today metrics error:', error);
      res.status(500).json({ error: 'Failed to get today metrics' });
    }
  }
}

export const statsController = new StatsController();
