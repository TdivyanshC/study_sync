import { Router } from 'express';
import { statsController } from '../controllers/stats.controller';
import { authMiddleware } from '../middleware/auth.middleware';

const router = Router();

// Get comprehensive productivity stats
router.get('/', authMiddleware, statsController.getProductivityStats.bind(statsController));

// Get streak data
router.get('/streaks', authMiddleware, statsController.getStreakData.bind(statsController));

// Get today's metrics
router.get('/today', authMiddleware, statsController.getTodayMetrics.bind(statsController));

export default router;
