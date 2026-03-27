import { Router, Request, Response } from 'express';
import UserStreak from '../models/UserStreak';
import { authMiddleware } from '../middleware/auth.middleware';

const router = Router();

/**
 * Update user's daily login streak
 * POST /api/streak/update/:userId
 */
router.post('/update/:userId', authMiddleware, async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = req.params.userId;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const todayStr = today.toISOString();

    // Check if already updated today
    const existingStreak = await UserStreak.findOne({ userId });
    
    if (existingStreak) {
      const lastUpdated = new Date(existingStreak.lastUpdated);
      lastUpdated.setHours(0, 0, 0, 0);
      
      if (lastUpdated.getTime() === today.getTime()) {
        res.json({ 
          success: true, 
          data: {
            user_id: userId,
            current_streak: existingStreak.currentStreak,
            best_streak: existingStreak.bestStreak,
            streak_broken: false,
            streak_multiplier: existingStreak.streakMultiplier,
            streak_bonus_xp: 0,
            streak_active: true,
            has_recent_activity: true
          },
          message: 'Streak already updated today'
        });
        return;
      }

      // Calculate if streak is broken
      const diffDays = Math.ceil((today.getTime() - lastUpdated.getTime()) / (1000 * 60 * 60 * 24));
      
      let currentStreak = 1;
      let bestStreak = existingStreak.bestStreak;
      
      if (diffDays === 1) {
        // Consecutive day - increment streak
        currentStreak = existingStreak.currentStreak + 1;
        bestStreak = Math.max(bestStreak, currentStreak);
      } else if (diffDays > 1) {
        // Streak broken - reset
        currentStreak = 1;
      } else {
        // Same day (shouldn't happen due to check above)
        currentStreak = existingStreak.currentStreak;
      }

      const streakMultiplier = 1.0 + (Math.floor(currentStreak / 7) * 0.1);
      
      // Update in MongoDB
      existingStreak.currentStreak = currentStreak;
      existingStreak.bestStreak = bestStreak;
      existingStreak.lastUpdated = new Date();
      existingStreak.streakMultiplier = streakMultiplier;
      await existingStreak.save();

      res.json({
        success: true,
        data: {
          user_id: userId,
          current_streak: currentStreak,
          best_streak: bestStreak,
          streak_broken: false,
          streak_multiplier: streakMultiplier,
          streak_bonus_xp: Math.floor(currentStreak / 7) * 10,
          streak_active: true,
          has_recent_activity: true
        },
        message: 'Streak updated successfully'
      });
      return;
    }

    // Create new streak record
    const newStreak = new UserStreak({
      userId,
      currentStreak: 1,
      bestStreak: 1,
      lastUpdated: new Date(),
      streakMultiplier: 1.0
    });
    await newStreak.save();

    res.json({
      success: true,
      data: {
        user_id: userId,
        current_streak: 1,
        best_streak: 1,
        streak_broken: false,
        streak_multiplier: 1.0,
        streak_bonus_xp: 0,
        streak_active: true,
        has_recent_activity: true
      },
      message: 'Streak created successfully'
    });
  } catch (error) {
    console.error('Update streak error:', error);
    res.status(500).json({ error: 'Failed to update streak' });
  }
});

/**
 * Get streak continuity status
 * GET /api/streak/continuity/:userId
 */
router.get('/continuity/:userId', authMiddleware, async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = req.params.userId;
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const streak = await UserStreak.findOne({ userId });

    if (!streak) {
      res.json({
        success: true,
        data: {
          user_id: userId,
          current_streak: 0,
          best_streak: 0,
          streak_broken: false,
          streak_multiplier: 1.0,
          streak_bonus_xp: 0,
          streak_active: false,
          has_recent_activity: false
        },
        message: 'No streak data found'
      });
      return;
    }

    // Check if streak is broken
    const lastUpdated = new Date(streak.lastUpdated);
    lastUpdated.setHours(0, 0, 0, 0);
    const diffDays = Math.ceil((today.getTime() - lastUpdated.getTime()) / (1000 * 60 * 60 * 24));

    const isBroken = diffDays > 1;

    res.json({
      success: true,
      data: {
        user_id: userId,
        current_streak: isBroken ? 0 : streak.currentStreak,
        best_streak: streak.bestStreak,
        streak_broken: isBroken,
        streak_multiplier: isBroken ? 1.0 : streak.streakMultiplier,
        streak_bonus_xp: isBroken ? 0 : Math.floor(streak.currentStreak / 7) * 10,
        streak_active: !isBroken,
        has_recent_activity: diffDays <= 1
      },
      message: isBroken ? 'Streak broken' : 'Streak active'
    });
  } catch (error) {
    console.error('Get streak continuity error:', error);
    res.status(500).json({ error: 'Failed to get streak continuity' });
  }
});

export default router;
