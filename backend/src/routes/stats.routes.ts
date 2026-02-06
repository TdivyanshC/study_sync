import { Router, Request, Response } from 'express';
import { statsController } from '../controllers/stats.controller';
import { authMiddleware } from '../middleware/auth.middleware';

const router = Router();

// Get comprehensive productivity stats (by authenticated user)
router.get('/', authMiddleware, statsController.getProductivityStats.bind(statsController));

// Get stats by specific userId (for frontend API calls)
router.get('/:userId', authMiddleware, statsController.getProductivityStats.bind(statsController));

// Get streak data (alternative endpoint)
router.get('/streaks', authMiddleware, statsController.getStreakData.bind(statsController));

// Get streak data (for frontend /api/streaks/{userId} call)
router.get('/streaks/:userId', authMiddleware, statsController.getStreakData.bind(statsController));

// Get today's metrics
router.get('/today', authMiddleware, statsController.getTodayMetrics.bind(statsController));

// XP award endpoint
router.post('/award', authMiddleware, async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = (req as any).user?.id;
    if (!userId) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }
    const { amount, source, metadata } = req.body;
    res.json({ success: true, message: 'XP awarded (stub)', data: { amount, source } });
  } catch (error) {
    res.status(500).json({ error: 'Failed to award XP' });
  }
});

export default router;
