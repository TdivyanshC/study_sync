import { Request, Response } from 'express';
import Alarm from '../models/Alarm';

export class AlarmController {
  async createAlarm(req: Request, res: Response): Promise<void> {
    try {
      const userId = (req as any).user?.id;
      const { session_type_id, space_id, title, description, time, repeat_days, alarm_type } = req.body;

      if (!userId) {
        res.status(401).json({ error: 'Unauthorized' });
        return;
      }

      if (!title || !time) {
        res.status(400).json({ error: 'Title and time are required' });
        return;
      }

      const alarm = await Alarm.create({
        userId,
        sessionTypeId: session_type_id,
        spaceId: space_id,
        title,
        description,
        time,
        repeatDays: repeat_days || [],
        alarmType: alarm_type || 'session_reminder',
      });

      res.status(201).json(alarm);
    } catch (error: any) {
      console.error('Create alarm error:', error);
      res.status(500).json({ error: `Failed to create alarm: ${error.message}` });
    }
  }

  async getAlarms(req: Request, res: Response): Promise<void> {
    try {
      const userId = (req as any).user?.id;

      if (!userId) {
        res.status(401).json({ error: 'Unauthorized' });
        return;
      }

      const alarms = await Alarm.find({ userId }).sort({ time: 1 });
      res.json(alarms);
    } catch (error: any) {
      console.error('Get alarms error:', error);
      res.status(500).json({ error: `Failed to get alarms: ${error.message}` });
    }
  }

  async updateAlarm(req: Request, res: Response): Promise<void> {
    try {
      const userId = (req as any).user?.id;
      const { alarm_id } = req.params;
      const { title, description, time, repeat_days, is_enabled, alarm_type, session_type_id, space_id } = req.body;

      if (!userId) {
        res.status(401).json({ error: 'Unauthorized' });
        return;
      }

      const alarm = await Alarm.findOneAndUpdate(
        { _id: alarm_id, userId },
        {
          ...(title && { title }),
          ...(description !== undefined && { description }),
          ...(time && { time }),
          ...(repeat_days && { repeatDays: repeat_days }),
          ...(is_enabled !== undefined && { isEnabled: is_enabled }),
          ...(alarm_type && { alarmType: alarm_type }),
          ...(session_type_id !== undefined && { sessionTypeId: session_type_id }),
          ...(space_id !== undefined && { spaceId: space_id }),
        },
        { new: true }
      );

      if (!alarm) {
        res.status(404).json({ error: 'Alarm not found' });
        return;
      }

      res.json(alarm);
    } catch (error: any) {
      console.error('Update alarm error:', error);
      res.status(500).json({ error: `Failed to update alarm: ${error.message}` });
    }
  }

  async deleteAlarm(req: Request, res: Response): Promise<void> {
    try {
      const userId = (req as any).user?.id;
      const { alarm_id } = req.params;

      if (!userId) {
        res.status(401).json({ error: 'Unauthorized' });
        return;
      }

      const alarm = await Alarm.findOneAndDelete({ _id: alarm_id, userId });

      if (!alarm) {
        res.status(404).json({ error: 'Alarm not found' });
        return;
      }

      res.json({ success: true, message: 'Alarm deleted' });
    } catch (error: any) {
      console.error('Delete alarm error:', error);
      res.status(500).json({ error: `Failed to delete alarm: ${error.message}` });
    }
  }

  async toggleAlarm(req: Request, res: Response): Promise<void> {
    try {
      const userId = (req as any).user?.id;
      const { alarm_id } = req.params;
      const { is_enabled } = req.body;

      if (!userId) {
        res.status(401).json({ error: 'Unauthorized' });
        return;
      }

      const alarm = await Alarm.findOneAndUpdate(
        { _id: alarm_id, userId },
        { isEnabled: is_enabled },
        { new: true }
      );

      if (!alarm) {
        res.status(404).json({ error: 'Alarm not found' });
        return;
      }

      res.json(alarm);
    } catch (error: any) {
      console.error('Toggle alarm error:', error);
      res.status(500).json({ error: `Failed to toggle alarm: ${error.message}` });
    }
  }
}

export const alarmController = new AlarmController();
