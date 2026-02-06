import { Router, Request, Response } from 'express';
import { supabaseAdmin } from '../config/supabase';
import { authMiddleware } from '../middleware/auth.middleware';

const router = Router();

/**
 * Update user's daily login streak
 * POST /api/streak/update/:userId
 */
router.post('/update/:userId', authMiddleware, async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = req.params.userId;
    const today = new Date().toISOString().split('T')[0];

    // Check if already updated today
    const { data: existingStreak } = await supabaseAdmin
      .from('user_streaks')
      .select('*')
      .eq('user_id', userId)
      .eq('last_updated', today)
      .single();

    if (existingStreak) {
      res.json({ 
        success: true, 
        data: {
          user_id: userId,
          current_streak: existingStreak.current_streak,
          best_streak: existingStreak.best_streak,
          streak_broken: false,
          streak_multiplier: 1.0,
          streak_bonus_xp: 0,
          streak_active: true,
          has_recent_activity: true
        },
        message: 'Streak already updated today'
      });
      return;
    }

    // Get last streak record
    const { data: lastStreak } = await supabaseAdmin
      .from('user_streaks')
      .select('*')
      .eq('user_id', userId)
      .order('last_updated', { ascending: false })
      .limit(1)
      .single();

    let currentStreak = 1;
    let bestStreak = lastStreak?.best_streak || 0;

    if (lastStreak) {
      const lastDate = new Date(lastStreak.last_updated);
      const todayDate = new Date(today);
      const diffDays = Math.ceil((todayDate.getTime() - lastDate.getTime()) / (1000 * 60 * 60 * 24));

      if (diffDays === 1) {
        // Consecutive day - increment streak
        currentStreak = lastStreak.current_streak + 1;
        bestStreak = Math.max(bestStreak, currentStreak);
      } else if (diffDays > 1) {
        // Streak broken - reset
        currentStreak = 1;
      } else {
        // Same day
        currentStreak = lastStreak.current_streak;
      }
    }

    // Upsert streak record
    const { data: streak, error } = await supabaseAdmin
      .from('user_streaks')
      .upsert({
        user_id: userId,
        current_streak: currentStreak,
        best_streak: bestStreak,
        last_updated: today,
        streak_multiplier: 1.0 + (Math.floor(currentStreak / 7) * 0.1) // +0.1 per week
      }, { onConflict: 'user_id' })
      .select()
      .single();

    if (error) {
      console.error('Error updating streak:', error);
      res.status(500).json({ error: 'Failed to update streak' });
      return;
    }

    res.json({
      success: true,
      data: {
        user_id: userId,
        current_streak: streak.current_streak,
        best_streak: streak.best_streak,
        streak_broken: false,
        streak_multiplier: streak.streak_multiplier,
        streak_bonus_xp: Math.floor(currentStreak / 7) * 10,
        streak_active: true,
        has_recent_activity: true
      },
      message: 'Streak updated successfully'
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
    const today = new Date().toISOString().split('T')[0];

    const { data: streak, error } = await supabaseAdmin
      .from('user_streaks')
      .select('*')
      .eq('user_id', userId)
      .single();

    if (error || !streak) {
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
    const lastDate = new Date(streak.last_updated);
    const todayDate = new Date(today);
    const diffDays = Math.ceil((todayDate.getTime() - lastDate.getTime()) / (1000 * 60 * 60 * 24));

    const isBroken = diffDays > 1;

    res.json({
      success: true,
      data: {
        user_id: userId,
        current_streak: isBroken ? 0 : streak.current_streak,
        best_streak: streak.best_streak,
        streak_broken: isBroken,
        streak_multiplier: isBroken ? 1.0 : streak.streak_multiplier,
        streak_bonus_xp: isBroken ? 0 : Math.floor(streak.current_streak / 7) * 10,
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
