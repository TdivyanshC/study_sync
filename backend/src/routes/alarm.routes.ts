import { Router } from 'express';
import { alarmController } from '../controllers/alarm.controller';
import { authMiddleware } from '../middleware/auth.middleware';

const router = Router();

router.post('/', authMiddleware, alarmController.createAlarm.bind(alarmController));
router.get('/', authMiddleware, alarmController.getAlarms.bind(alarmController));
router.patch('/:alarm_id', authMiddleware, alarmController.updateAlarm.bind(alarmController));
router.delete('/:alarm_id', authMiddleware, alarmController.deleteAlarm.bind(alarmController));
router.patch('/:alarm_id/toggle', authMiddleware, alarmController.toggleAlarm.bind(alarmController));

export default router;
