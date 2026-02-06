import { Request, Response } from 'express';
import { sessionService } from '../services/session.service';
import { statsService } from '../services/stats.service';

export class SessionController {
  /**
   * Start a new session
   */
  async startSession(req: Request, res: Response): Promise<void> {
    try {
      const userId = (req as any).user?.id;
      const { session_type_id, space_id, started_at } = req.body;

      if (!userId) {
        res.status(401).json({ error: 'Unauthorized' });
        return;
      }

      const session = await sessionService.startSession({
        user_id: userId,
        session_type_id,
        space_id,
        started_at,
      });

      res.status(201).json(session);
    } catch (error) {
      console.error('Start session error:', error);
      res.status(500).json({ error: 'Failed to start session' });
    }
  }

  /**
   * End current session
   */
  async endSession(req: Request, res: Response): Promise<void> {
    try {
      const userId = (req as any).user?.id;
      const { session_id, ended_at } = req.body;

      if (!userId) {
        res.status(401).json({ error: 'Unauthorized' });
        return;
      }

      const session = await sessionService.endSession({
        session_id,
        ended_at,
      });

      res.json(session);
    } catch (error) {
      console.error('End session error:', error);
      res.status(500).json({ error: 'Failed to end session' });
    }
  }

  /**
   * Get user's active session
   */
  async getActiveSession(req: Request, res: Response): Promise<void> {
    try {
      const userId = (req as any).user?.id;

      if (!userId) {
        res.status(401).json({ error: 'Unauthorized' });
        return;
      }

      const session = await sessionService.getActiveSession(userId);
      res.json(session || { active: false });
    } catch (error) {
      console.error('Get active session error:', error);
      res.status(500).json({ error: 'Failed to get active session' });
    }
  }

  /**
   * Get user's sessions
   */
  async getUserSessions(req: Request, res: Response): Promise<void> {
    try {
      const userId = (req as any).user?.id;
      const { limit, offset, space_id } = req.query;

      if (!userId) {
        res.status(401).json({ error: 'Unauthorized' });
        return;
      }

      const sessions = await sessionService.getUserSessions(userId, {
        limit: limit ? parseInt(limit as string, 10) : undefined,
        offset: offset ? parseInt(offset as string, 10) : undefined,
        spaceId: space_id as string,
      });

      res.json(sessions);
    } catch (error) {
      console.error('Get user sessions error:', error);
      res.status(500).json({ error: 'Failed to get sessions' });
    }
  }

  /**
   * Get today's total session time
   */
  async getTodayTotal(req: Request, res: Response): Promise<void> {
    try {
      const userId = (req as any).user?.id;

      if (!userId) {
        res.status(401).json({ error: 'Unauthorized' });
        return;
      }

      const metrics = await statsService.getTodayMetrics(userId);
      res.json(metrics);
    } catch (error) {
      console.error('Get today total error:', error);
      res.status(500).json({ error: 'Failed to get today total' });
    }
  }
}

export const sessionController = new SessionController();
