import { Router } from 'express';
import { sessionController } from '../controllers/session.controller';
import { authMiddleware } from '../middleware/auth.middleware';

const router = Router();

// Start a new session
router.post('/start', authMiddleware, sessionController.startSession.bind(sessionController));

// End current session
router.post('/end', authMiddleware, sessionController.endSession.bind(sessionController));

// Get active session
router.get('/active', authMiddleware, sessionController.getActiveSession.bind(sessionController));

// Get user's sessions
router.get('/', authMiddleware, sessionController.getUserSessions.bind(sessionController));

// Get today's total
router.get('/today', authMiddleware, sessionController.getTodayTotal.bind(sessionController));

export default router;
