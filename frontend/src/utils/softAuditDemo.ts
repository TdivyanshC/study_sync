/**
 * Soft Audit Demo Utility
 * Demonstrates Module Soft — Session Audit Strictness functionality
 */

import { 
  softAuditEventEmitter, 
  AuditForgivenessEvent, 
  SoftAuditFlagEvent, 
  AuditValidationEvent, 
  AuditPatternEvent 
} from '../events/softAuditEvents';

/**
 * Simulate soft audit validation for testing purposes
 */
export const simulateSoftAuditValidation = (
  userId: string,
  sessionId: string,
  baseSuspicionScore: number,
  validationMode: 'soft' | 'strict' = 'soft',
  userHistory?: {
    currentStreak?: number;
    totalXP?: number;
    cleanSessionsRate?: number;
  }
) => {
  // Apply soft audit forgiveness based on user history
  const currentStreak = userHistory?.currentStreak || 0;
  const totalXP = userHistory?.totalXP || 0;
  const cleanRate = userHistory?.cleanSessionsRate || 0;

  // Calculate forgiveness
  const streakForgiveness = Math.min(currentStreak * 0.1, 0.5); // 10% per streak day, max 50%
  const xpForgiveness = Math.min((totalXP / 1000) * 0.05, 0.5); // 5% per 1000 XP, max 50%
  const behaviorBonus = (cleanRate / 100) * 0.2; // 20% max for clean behavior
  const totalForgiveness = Math.min(streakForgiveness + xpForgiveness + behaviorBonus, 0.5);

  const adjustedScore = Math.round(baseSuspicionScore * (1 - totalForgiveness));
  const threshold = validationMode === 'soft' ? 70 : 30;
  const isValid = adjustedScore < threshold;

  // Emit validation event
  const validationEvent: AuditValidationEvent = {
    userId,
    sessionId,
    isValid,
    validationMode,
    baseScore: baseSuspicionScore,
    adjustedScore,
    forgivenessApplied: totalForgiveness,
    threshold,
    message: isValid 
      ? `Session validated successfully (score: ${adjustedScore}/${threshold})`
      : `Session flagged for review (score: ${adjustedScore}/${threshold})`,
    timestamp: new Date(),
  };

  softAuditEventEmitter.emitAuditValidation(validationEvent);

  // Emit forgiveness event
  if (totalForgiveness > 0) {
    const forgivenessEvent: AuditForgivenessEvent = {
      userId,
      forgivenessRate: totalForgiveness,
      streakContribution: streakForgiveness,
      xpContribution: xpForgiveness,
      behaviorContribution: behaviorBonus,
      timestamp: new Date(),
    };

    softAuditEventEmitter.emitAuditForgiveness(forgivenessEvent);
  }

  // Emit flag event if suspicious but not invalid
  if (!isValid && adjustedScore < threshold + 10) {
    const flagEvent: SoftAuditFlagEvent = {
      userId,
      sessionId,
      suspicionScore: baseSuspicionScore,
      adjustedScore,
      forgivenessApplied: totalForgiveness,
      isValid,
      recommendations: generateRecommendations(adjustedScore),
      timestamp: new Date(),
    };

    softAuditEventEmitter.emitSoftAuditFlag(flagEvent);
  }

  return {
    isValid,
    baseScore: baseSuspicionScore,
    adjustedScore,
    forgivenessApplied: totalForgiveness,
    threshold,
    breakdown: {
      streakForgiveness,
      xpForgiveness,
      behaviorBonus,
      totalForgiveness,
    },
  };
};

/**
 * Simulate audit pattern detection
 */
export const simulateAuditPatternDetection = (
  userId: string,
  sessionId: string,
  patterns: {
    missingStartEvent?: boolean;
    missingEndEvent?: boolean;
    largeTimeGap?: boolean;
    irregularHeartbeat?: boolean;
    noEvents?: boolean;
    suspiciousDuration?: boolean;
  }
) => {
  // Calculate suspicion score based on patterns
  const patternWeights = {
    missingStartEvent: 25,
    missingEndEvent: 30,
    largeTimeGap: 15,
    irregularHeartbeat: 10,
    noEvents: 50,
    suspiciousDuration: 20,
  };

  let baseScore = 0;
  const detectedPatterns: string[] = [];

  Object.entries(patterns).forEach(([pattern, detected]) => {
    if (detected) {
      baseScore += patternWeights[pattern as keyof typeof patternWeights] || 0;
      detectedPatterns.push(pattern.replace(/([A-Z])/g, ' $1').toLowerCase());
    }
  });

  // Determine severity
  let severityLevel: 'low' | 'medium' | 'high' = 'low';
  if (baseScore > 60) severityLevel = 'high';
  else if (baseScore > 30) severityLevel = 'medium';

  // Emit pattern event
  const patternEvent: AuditPatternEvent = {
    userId,
    sessionId,
    patterns: {
      missingEvents: detectedPatterns.filter(p => p.includes('event')),
      irregularTiming: patterns.largeTimeGap || patterns.irregularHeartbeat || false,
      suspiciousDuration: patterns.suspiciousDuration || false,
      gapsDetected: patterns.largeTimeGap ? 1 : 0,
    },
    severityLevel,
    timestamp: new Date(),
  };

  softAuditEventEmitter.emitAuditPattern(patternEvent);

  return {
    baseScore,
    detectedPatterns,
    severityLevel,
  };
};

/**
 * Generate human-readable recommendations
 */
const generateRecommendations = (score: number): string[] => {
  const recommendations: string[] = [];
  
  if (score < 30) {
    recommendations.push('Session appears legitimate with no significant concerns.');
  } else if (score < 60) {
    recommendations.push('Minor irregularities detected, but within acceptable range.');
    recommendations.push('Consider reviewing session timing if issues persist.');
  } else {
    recommendations.push('Several suspicious patterns detected. Consider manual review.');
    recommendations.push('Check for consistent session patterns going forward.');
  }
  
  return recommendations;
};

/**
 * Set up a demo listener for testing soft audit system
 */
export const setupSoftAuditDemo = (
  userId: string,
  callbacks: {
    onValidation?: (event: AuditValidationEvent) => void;
    onForgiveness?: (event: AuditForgivenessEvent) => void;
    onFlag?: (event: SoftAuditFlagEvent) => void;
    onPattern?: (event: AuditPatternEvent) => void;
  }
) => {
  console.log(`Setting up soft audit demo for user: ${userId}`);

  const unsubValidation = softAuditEventEmitter.onAuditValidation((event) => {
    if (event.userId === userId) {
      console.log(`📋 Audit Validation: ${event.message}`);
      if (event.forgivenessApplied > 0) {
        console.log(`💝 Forgiveness Applied: ${(event.forgivenessApplied * 100).toFixed(1)}%`);
      }
      callbacks.onValidation?.(event);
    }
  });

  const unsubForgiveness = softAuditEventEmitter.onAuditForgiveness((event) => {
    if (event.userId === userId) {
      console.log(`🛡️ Audit Forgiveness: ${(event.forgivenessRate * 100).toFixed(1)}% total`);
      console.log(`   Streak: ${(event.streakContribution * 100).toFixed(1)}%`);
      console.log(`   XP: ${(event.xpContribution * 100).toFixed(1)}%`);
      console.log(`   Behavior: ${(event.behaviorContribution * 100).toFixed(1)}%`);
      callbacks.onForgiveness?.(event);
    }
  });

  const unsubFlag = softAuditEventEmitter.onSoftAuditFlag((event) => {
    if (event.userId === userId) {
      console.log(`⚠️ Soft Audit Flag: Score ${event.suspicionScore} → ${event.adjustedScore}`);
      console.log(`   Recommendations: ${event.recommendations.join(', ')}`);
      callbacks.onFlag?.(event);
    }
  });

  const unsubPattern = softAuditEventEmitter.onAuditPattern((event) => {
    if (event.userId === userId) {
      console.log(`🔍 Audit Patterns [${event.severityLevel.toUpperCase()}]:`);
      console.log(`   Missing events: ${event.patterns.missingEvents.join(', ') || 'None'}`);
      console.log(`   Irregular timing: ${event.patterns.irregularTiming ? 'Yes' : 'No'}`);
      console.log(`   Suspicious duration: ${event.patterns.suspiciousDuration ? 'Yes' : 'No'}`);
      callbacks.onPattern?.(event);
    }
  });

  // Return cleanup function
  return () => {
    console.log('Cleaning up soft audit demo listeners');
    unsubValidation();
    unsubForgiveness();
    unsubFlag();
    unsubPattern();
  };
};

/**
 * Demo sequence to test the soft audit system
 */
export const runSoftAuditDemo = (userId: string = 'audit-demo-user') => {
  console.log('🚀 Starting Soft Audit System Demo (Module Soft)...');
  
  const cleanup = setupSoftAuditDemo(userId, {
    onValidation: (event) => {
      console.log(`Final result: ${event.isValid ? '✅ VALID' : '❌ FLAGGED'}`);
    },
  });

  // Test case 1: Legitimate session with good user history
  console.log('\n📚 Testing legitimate session with good user history...');
  simulateSoftAuditValidation(
    userId, 
    'session-1', 
    45, 
    'soft',
    { currentStreak: 7, totalXP: 2500, cleanSessionsRate: 90 }
  );

  // Test case 2: Suspicious session with poor user history
  setTimeout(() => {
    console.log('\n⚠️ Testing suspicious session with poor user history...');
    simulateSoftAuditValidation(
      userId, 
      'session-2', 
      85, 
      'soft',
      { currentStreak: 0, totalXP: 200, cleanSessionsRate: 20 }
    );
  }, 2000);

  // Test case 3: Same suspicious session with good user history (forgiveness applied)
  setTimeout(() => {
    console.log('\n💝 Testing same suspicious session with GOOD user history...');
    simulateSoftAuditValidation(
      userId, 
      'session-3', 
      85, 
      'soft',
      { currentStreak: 15, totalXP: 5000, cleanSessionsRate: 95 }
    );
  }, 4000);

  // Test case 4: Pattern detection demo
  setTimeout(() => {
    console.log('\n🔍 Testing pattern detection...');
    simulateAuditPatternDetection(userId, 'session-4', {
      missingStartEvent: true,
      largeTimeGap: true,
      suspiciousDuration: true,
    });
  }, 6000);

  // Test case 5: Strict mode validation
  setTimeout(() => {
    console.log('\n🎯 Testing strict mode validation...');
    simulateSoftAuditValidation(
      userId, 
      'session-5', 
      65, 
      'strict',
      { currentStreak: 10, totalXP: 3000, cleanSessionsRate: 80 }
    );
  }, 8000);

  // Test case 6: High forgiveness scenario
  setTimeout(() => {
    console.log('\n🏆 Testing high forgiveness scenario...');
    simulateSoftAuditValidation(
      userId, 
      'session-6', 
      90, 
      'soft',
      { currentStreak: 30, totalXP: 10000, cleanSessionsRate: 98 }
    );
  }, 10000);

  // Cleanup after demo
  setTimeout(() => {
    console.log('\n✅ Soft Audit Demo completed!');
    cleanup();
  }, 13000);

  return cleanup;
};

/**
 * Test specific forgiveness scenarios
 */
export const testForgivenessScenarios = (userId: string) => {
  console.log('🧪 Testing specific forgiveness scenarios...\n');

  // Scenario 1: New user (no forgiveness)
  console.log('1️⃣ New User (0% forgiveness expected):');
  simulateSoftAuditValidation(userId, 'new-user-session', 50, 'soft', {
    currentStreak: 0,
    totalXP: 0,
    cleanSessionsRate: 0,
  });

  // Scenario 2: Long streak user
  setTimeout(() => {
    console.log('\n2️⃣ Long Streak User (high forgiveness expected):');
    simulateSoftAuditValidation(userId, 'streak-user-session', 80, 'soft', {
      currentStreak: 25,
      totalXP: 8000,
      cleanSessionsRate: 85,
    });
  }, 1000);

  // Scenario 3: High XP user
  setTimeout(() => {
    console.log('\n3️⃣ High XP User (medium forgiveness expected):');
    simulateSoftAuditValidation(userId, 'xp-user-session', 60, 'soft', {
      currentStreak: 5,
      totalXP: 15000,
      cleanSessionsRate: 70,
    });
  }, 2000);

  // Scenario 4: Perfect user history
  setTimeout(() => {
    console.log('\n4️⃣ Perfect User History (maximum forgiveness expected):');
    simulateSoftAuditValidation(userId, 'perfect-user-session', 95, 'soft', {
      currentStreak: 50,
      totalXP: 25000,
      cleanSessionsRate: 100,
    });
  }, 3000);
};

export default {
  simulateSoftAuditValidation,
  simulateAuditPatternDetection,
  setupSoftAuditDemo,
  runSoftAuditDemo,
  testForgivenessScenarios,
};