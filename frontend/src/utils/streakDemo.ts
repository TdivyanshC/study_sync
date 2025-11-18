/**
 * Streak System Demo Utility
 * Demonstrates Module B2 — Streak Rules functionality
 */

import { streakEventEmitter, StreakUpdatedEvent, StreakMilestoneEvent, StreakBrokenEvent } from '../events/streakEvents';

/**
 * Simulate streak updates for testing purposes
 */
export const simulateStreakUpdate = (
  userId: string,
  currentStreak: number,
  bestStreak: number = currentStreak,
  streakBroken: boolean = false
) => {
  const streakMultiplier = Math.min(1.0 + (currentStreak * 0.1), 2.0);
  const streakBonusXp = currentStreak > 0 ? Math.min(Math.floor(currentStreak / 7) * 2, 50) : 0;

  // Emit streak updated event
  const streakEvent: StreakUpdatedEvent = {
    userId,
    currentStreak,
    bestStreak,
    streakBroken,
    streakMultiplier,
    streakBonusXp,
    timestamp: new Date(),
  };

  streakEventEmitter.emitStreakUpdated(streakEvent);

  // Check for milestone achievements
  const milestones = [3, 7, 14, 30, 60, 100];
  const milestoneReached = milestones.find(m => m === currentStreak && currentStreak > (bestStreak - currentStreak));
  
  if (milestoneReached) {
    const milestoneEvent: StreakMilestoneEvent = {
      userId,
      milestoneType: `${milestoneReached}_day_streak`,
      currentStreak,
      bonusAwarded: streakBonusXp,
      timestamp: new Date(),
    };

    streakEventEmitter.emitStreakMilestone(milestoneEvent);
  }

  // Check for streak broken
  if (streakBroken && currentStreak > 0) {
    const brokenEvent: StreakBrokenEvent = {
      userId,
      brokenStreakLength: currentStreak,
      daysInactive: 1, // Simulated
      timestamp: new Date(),
    };

    streakEventEmitter.emitStreakBroken(brokenEvent);
  }

  return {
    currentStreak,
    streakMultiplier,
    streakBonusXp,
    milestoneReached,
  };
};

/**
 * Set up a demo listener for testing streak system
 */
export const setupStreakDemo = (
  userId: string,
  callbacks: {
    onStreakUpdate?: (event: StreakUpdatedEvent) => void;
    onMilestone?: (event: StreakMilestoneEvent) => void;
    onBroken?: (event: StreakBrokenEvent) => void;
  }
) => {
  console.log(`Setting up streak demo for user: ${userId}`);

  const unsubStreakUpdate = streakEventEmitter.onStreakUpdated((event) => {
    if (event.userId === userId) {
      console.log(`🔥 Streak Updated: ${event.currentStreak} days (Best: ${event.bestStreak})`);
      if (event.streakBroken) {
        console.log(`💥 Streak Broken! Was ${event.currentStreak} days`);
      }
      if (event.streakBonusXp > 0) {
        console.log(`⭐ Bonus: +${event.streakBonusXp} XP (${event.streakMultiplier}x multiplier)`);
      }
      callbacks.onStreakUpdate?.(event);
    }
  });

  const unsubMilestone = streakEventEmitter.onStreakMilestone((event) => {
    if (event.userId === userId) {
      console.log(`🏆 MILESTONE! ${event.milestoneType} - Streak: ${event.currentStreak} days`);
      callbacks.onMilestone?.(event);
    }
  });

  const unsubBroken = streakEventEmitter.onStreakBroken((event) => {
    if (event.userId === userId) {
      console.log(`💔 Streak Broken! Was ${event.brokenStreakLength} days, inactive for ${event.daysInactive} day(s)`);
      callbacks.onBroken?.(event);
    }
  });

  // Return cleanup function
  return () => {
    console.log('Cleaning up streak demo listeners');
    unsubStreakUpdate();
    unsubMilestone();
    unsubBroken();
  };
};

/**
 * Demo sequence to test the streak system
 */
export const runStreakDemo = (userId: string = 'streak-demo-user') => {
  console.log('🚀 Starting Streak System Demo (Module B2)...');
  
  let currentStreak = 0;
  let bestStreak = 0;

  // Set up listeners
  const cleanup = setupStreakDemo(userId, {
    onStreakUpdate: (event) => {
      currentStreak = event.currentStreak;
      bestStreak = event.bestStreak;
    },
  });

  // Simulate building a streak
  console.log('\n📅 Simulating daily study sessions...');
  
  for (let day = 1; day <= 10; day++) {
    setTimeout(() => {
      simulateStreakUpdate(userId, day, Math.max(bestStreak, day));
    }, day * 1000);
  }

  // Simulate streak milestone (7 days)
  setTimeout(() => {
    console.log('\n🎯 Testing 7-day milestone...');
    simulateStreakUpdate(userId, 7, 7);
  }, 3000);

  // Simulate streak continuation
  setTimeout(() => {
    console.log('\n🔥 Continuing streak to 14 days...');
    simulateStreakUpdate(userId, 14, 14);
  }, 5000);

  // Simulate streak continuation to 30 days
  setTimeout(() => {
    console.log('\n💪 Pushing to 30-day milestone...');
    simulateStreakUpdate(userId, 30, 30);
  }, 7000);

  // Simulate streak break
  setTimeout(() => {
    console.log('\n💔 Simulating streak break...');
    simulateStreakUpdate(userId, 0, 30, true);
  }, 9000);

  // Simulate starting over
  setTimeout(() => {
    console.log('\n🔄 Starting new streak after break...');
    simulateStreakUpdate(userId, 1, 30);
  }, 11000);

  // Cleanup after demo
  setTimeout(() => {
    console.log('\n✅ Streak Demo completed!');
    cleanup();
  }, 15000);

  return cleanup;
};

/**
 * Test streak continuity check
 */
export const testStreakContinuity = (userId: string) => {
  console.log('🔍 Testing streak continuity...');
  
  // Simulate checking streak continuity
  const hasRecentActivity = Math.random() > 0.3; // 70% chance of recent activity
  const currentStreak = Math.floor(Math.random() * 15);
  
  const continuityEvent = {
    userId,
    streakActive: hasRecentActivity || currentStreak === 0,
    hasRecentActivity,
    currentStreak,
    timeUntilBreak: hasRecentActivity ? undefined : new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
    timestamp: new Date(),
  };

  streakEventEmitter.emitStreakContinuity(continuityEvent);
  
  console.log(`Streak continuity: ${continuityEvent.streakActive ? 'ACTIVE' : 'INACTIVE'}`);
  console.log(`Recent activity: ${hasRecentActivity ? 'YES' : 'NO'}`);
  console.log(`Current streak: ${currentStreak} days`);
  
  return continuityEvent;
};

/**
 * Test streak bonus calculation
 */
export const testStreakBonus = (userId: string, streakLength: number) => {
  console.log(`💰 Testing streak bonus for ${streakLength}-day streak...`);
  
  const bonusXp = Math.min(Math.floor(streakLength / 7) * 2, 50);
  const multiplier = Math.min(1.0 + (streakLength * 0.1), 2.0);
  
  const bonusEvent = {
    userId,
    bonusXp,
    multiplier,
    currentStreak: streakLength,
    applied: bonusXp > 0,
    timestamp: new Date(),
  };

  streakEventEmitter.emitStreakBonus(bonusEvent);
  
  console.log(`Streak bonus: +${bonusXp} XP`);
  console.log(`Multiplier: ${multiplier}x`);
  
  return bonusEvent;
};

export default {
  simulateStreakUpdate,
  setupStreakDemo,
  runStreakDemo,
  testStreakContinuity,
  testStreakBonus,
};