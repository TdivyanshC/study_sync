/**
 * XP Event Demo Utility
 * Demonstrates how to use the XP event system
 */

import { xpEventEmitter, XPUpdatedEvent, XPLevelUpEvent, XPMilestoneEvent } from '../events/xpEvents';

/**
 * Simulate XP award for testing purposes
 * In a real app, this would be triggered by actual study session completion
 */
export const simulateXPAward = (
  userId: string,
  amount: number,
  source: 'session' | 'streak' | 'daily_bonus' | 'milestone',
  currentLevel: number = 1,
  currentXP: number = 0
) => {
  const totalXP = currentXP + amount;
  const newLevel = Math.floor(totalXP / 100) + 1;
  const levelUp = newLevel > currentLevel;

  // Emit XP updated event
  const xpEvent: XPUpdatedEvent = {
    userId,
    amountAwarded: amount,
    totalXP,
    level: newLevel,
    source,
    timestamp: new Date(),
    levelUp,
  };

  xpEventEmitter.emitXPUpdated(xpEvent);

  // Emit level up event if applicable
  if (levelUp) {
    const levelUpEvent: XPLevelUpEvent = {
      userId,
      oldLevel: currentLevel,
      newLevel,
      totalXP,
      timestamp: new Date(),
    };

    xpEventEmitter.emitLevelUp(levelUpEvent);
  }

  // Emit milestone event if applicable
  if (totalXP >= 500 && currentXP < 500) {
    const milestoneEvent: XPMilestoneEvent = {
      userId,
      milestoneType: '500_xp',
      totalXP,
      bonusAwarded: 100,
      timestamp: new Date(),
    };

    xpEventEmitter.emitMilestone(milestoneEvent);
  }

  if (totalXP >= 10000 && currentXP < 10000) {
    const milestoneEvent: XPMilestoneEvent = {
      userId,
      milestoneType: '10000_xp',
      totalXP,
      bonusAwarded: 1000,
      timestamp: new Date(),
    };

    xpEventEmitter.emitMilestone(milestoneEvent);
  }

  return {
    totalXP,
    newLevel,
    levelUp,
  };
};

/**
 * Set up a demo listener for testing
 */
export const setupXPDemo = (
  userId: string,
  callbacks: {
    onXPUpdate?: (event: XPUpdatedEvent) => void;
    onLevelUp?: (event: XPLevelUpEvent) => void;
    onMilestone?: (event: XPMilestoneEvent) => void;
  }
) => {
  console.log(`Setting up XP demo for user: ${userId}`);

  const unsubXP = xpEventEmitter.onXPUpdated((event) => {
    if (event.userId === userId) {
      console.log(`🎯 XP Updated: +${event.amountAwarded} XP (${event.source}) - Total: ${event.totalXP} XP`);
      if (event.levelUp) {
        console.log(`⬆️ Level Up! Now Level ${event.level}`);
      }
      callbacks.onXPUpdate?.(event);
    }
  });

  const unsubLevelUp = xpEventEmitter.onLevelUp((event) => {
    if (event.userId === userId) {
      console.log(`🎉 LEVEL UP! ${event.oldLevel} → ${event.newLevel} (Total XP: ${event.totalXP})`);
      callbacks.onLevelUp?.(event);
    }
  });

  const unsubMilestone = xpEventEmitter.onMilestone((event) => {
    if (event.userId === userId) {
      console.log(`🏆 MILESTONE! ${event.milestoneType} - Bonus: +${event.bonusAwarded} XP`);
      callbacks.onMilestone?.(event);
    }
  });

  // Return cleanup function
  return () => {
    console.log('Cleaning up XP demo listeners');
    unsubXP();
    unsubLevelUp();
    unsubMilestone();
  };
};

/**
 * Demo sequence to test the XP system
 */
export const runXPDemo = (userId: string = 'demo-user-123') => {
  console.log('🚀 Starting XP System Demo...');
  
  let currentLevel = 1;
  let currentXP = 0;

  // Set up listeners
  const cleanup = setupXPDemo(userId, {
    onXPUpdate: (event) => {
      currentLevel = event.level;
      currentXP = event.totalXP;
    },
    onLevelUp: (event) => {
      currentLevel = event.newLevel;
      currentXP = event.totalXP;
    },
  });

  // Simulate a study session (30 minutes)
  setTimeout(() => {
    console.log('\n📚 Simulating 30-minute study session...');
    simulateXPAward(userId, 30, 'session', currentLevel, currentXP);
  }, 1000);

  // Simulate daily goal completion (2 hours)
  setTimeout(() => {
    console.log('\n🎯 Simulating daily goal completion...');
    simulateXPAward(userId, 20, 'daily_bonus', currentLevel, currentXP);
  }, 3000);

  // Simulate streak bonus
  setTimeout(() => {
    console.log('\n🔥 Simulating streak bonus...');
    simulateXPAward(userId, 15, 'streak', currentLevel, currentXP);
  }, 5000);

  // Try to reach 500 XP milestone
  setTimeout(() => {
    console.log('\n💪 Pushing toward 500 XP milestone...');
    const needed = Math.max(0, 500 - currentXP);
    simulateXPAward(userId, needed, 'session', currentLevel, currentXP);
  }, 7000);

  // Cleanup after demo
  setTimeout(() => {
    console.log('\n✅ XP Demo completed!');
    cleanup();
  }, 10000);

  return cleanup;
};

export default {
  simulateXPAward,
  setupXPDemo,
  runXPDemo,
};