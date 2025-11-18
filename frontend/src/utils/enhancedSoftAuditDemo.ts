/**
 * Enhanced Soft Audit Demo Utility
 * Demonstrates Module Soft — Session Audit Strictness with sophisticated pattern detection
 */

import { 
  softAuditEventEmitter, 
  AuditForgivenessEvent, 
  SoftAuditFlagEvent, 
  AuditValidationEvent, 
  AuditPatternEvent 
} from '../events/softAuditEvents';

// Import functions from original demo
import { 
  simulateSoftAuditValidation,
  setupSoftAuditDemo,
  runSoftAuditDemo,
  testForgivenessScenarios 
} from './softAuditDemo';

/**
 * Enhanced suspicious pattern detection with sophisticated analysis
 */
export const simulateEnhancedAuditPatternDetection = (
  userId: string,
  sessionId: string,
  patterns: {
    missingStartEvent?: boolean;
    missingEndEvent?: boolean;
    largeTimeGap?: boolean;
    irregularHeartbeat?: boolean;
    noEvents?: boolean;
    suspiciousDuration?: boolean;
    extendedInactivity?: boolean;
    veryShortDuration?: boolean;
    extendedDuration?: boolean;
  }
) => {
  // Enhanced pattern weights with more sophisticated analysis
  const patternWeights = {
    missingStartEvent: 30,
    missingEndEvent: 25,
    largeTimeGap: 15,
    irregularHeartbeat: 20,
    noEvents: 50,
    suspiciousDuration: 20,
    extendedInactivity: 25,
    veryShortDuration: 10,
    extendedDuration: 15,
  };

  let baseScore = 0;
  const detectedPatterns: string[] = [];
  const suspiciousPatterns: any[] = [];

  Object.entries(patterns).forEach(([pattern, detected]) => {
    if (detected) {
      const weight = patternWeights[pattern as keyof typeof patternWeights] || 0;
      baseScore += weight;
      const readableName = pattern.replace(/([A-Z])/g, ' $1').toLowerCase();
      detectedPatterns.push(readableName);
      
      // Create detailed pattern info
      const severity = weight >= 25 ? 'high' : weight >= 15 ? 'medium' : 'low';
      suspiciousPatterns.push({
        type: pattern,
        severity,
        impact: weight,
        forgivenessEligible: true,
        details: `${readableName.replace(/\b\w/g, l => l.toUpperCase())} detected`,
        potentialCauses: getPotentialCauses(pattern)
      });
    }
  });

  // Determine risk assessment with more nuance
  const highSeverityPatterns = suspiciousPatterns.filter(p => p.severity === 'high');
  const mediumSeverityPatterns = suspiciousPatterns.filter(p => p.severity === 'medium');
  
  let riskLevel: 'minimal' | 'low' | 'medium' | 'high' | 'critical' = 'minimal';
  if (highSeverityPatterns.length >= 2) riskLevel = 'critical';
  else if (highSeverityPatterns.length >= 1) riskLevel = 'high';
  else if (mediumSeverityPatterns.length >= 2) riskLevel = 'medium';
  else if (mediumSeverityPatterns.length >= 1) riskLevel = 'low';
  else if (suspiciousPatterns.length > 0) riskLevel = 'low';

  // Generate non-punitive recommendations
  const recommendations = generateEnhancedRecommendations(suspiciousPatterns, riskLevel);

  // Calculate forgiveness factors
  const forgivenessFactors = calculateEnhancedForgiveness(suspiciousPatterns);

  // Emit enhanced pattern event
  const patternEvent: AuditPatternEvent & { enhancedAnalysis?: any } = {
    userId,
    sessionId,
    patterns: {
      missingEvents: detectedPatterns.filter(p => p.includes('event')),
      irregularTiming: patterns.largeTimeGap || patterns.irregularHeartbeat || false,
      suspiciousDuration: patterns.suspiciousDuration || false,
      gapsDetected: patterns.largeTimeGap ? 1 : 0,
    },
    severityLevel: riskLevel as 'low' | 'medium' | 'high',
    timestamp: new Date(),
    // Enhanced fields
    enhancedAnalysis: {
      suspiciousPatterns,
      riskLevel,
      recommendations,
      forgivenessFactors,
      patternDetails: {
        totalPatterns: suspiciousPatterns.length,
        forgivenessPotential: forgivenessFactors.totalForgivenessPotential,
        technicalIssues: forgivenessFactors.technicalIssues,
        userExperienceFactors: forgivenessFactors.userExperienceFactors
      }
    }
  };

  softAuditEventEmitter.emitAuditPattern(patternEvent);

  return {
    baseScore,
    detectedPatterns,
    riskLevel,
    suspiciousPatterns,
    recommendations,
    forgivenessFactors,
    patternDetails: patternEvent.enhancedAnalysis?.patternDetails
  };
};

/**
 * Get potential causes for patterns (for better understanding)
 */
const getPotentialCauses = (patternType: string): string[] => {
  const causeMap: Record<string, string[]> = {
    missingStartEvent: ['App crash', 'Network interruption', 'User forgetfulness', 'Battery drain'],
    missingEndEvent: ['App closure', 'Device shutdown', 'Connection loss', 'Automatic app termination'],
    largeTimeGap: ['Background app', 'Interruption', 'Multi-tasking', 'Network delay'],
    irregularHeartbeat: ['Variable study pattern', 'Network issues', 'Device performance', 'User behavior'],
    veryShortDuration: ['Quick study session', 'Interruption', 'Technical issue', 'Testing'],
    extendedDuration: ['Overnight study', 'Background activity', 'Extended focus', 'Automation'],
    extendedInactivity: ['Extended break', 'Network issues', 'Device sleep', 'Multi-tasking']
  };
  
  return causeMap[patternType] || ['Unknown reason', 'Technical factors', 'User behavior'];
};

/**
 * Generate enhanced non-punitive recommendations
 */
const generateEnhancedRecommendations = (patterns: any[], riskLevel: string): string[] => {
  const recommendations: string[] = [];
  
  if (!patterns.length) {
    recommendations.push("Session shows excellent consistency patterns. Great job!");
    return recommendations;
  }
  
  const patternTypes = patterns.map(p => p.type);
  
  if (patternTypes.includes('missingStartEvent') || patternTypes.includes('missingEndEvent')) {
    recommendations.push("Consider keeping the app open throughout your study session for better tracking");
    recommendations.push("Check your device settings to prevent unexpected app closures");
  }
  
  if (patternTypes.includes('largeTimeGap') || patternTypes.includes('extendedInactivity')) {
    recommendations.push("Try to minimize long pauses to maintain study momentum");
    recommendations.push("If interruptions happen, that's okay - every study session contributes to your progress");
  }
  
  if (patternTypes.includes('irregularHeartbeat')) {
    recommendations.push("Your study pattern shows natural variability - this flexibility is normal and healthy");
    recommendations.push("Different study rhythms work for different people");
  }
  
  if (patternTypes.includes('veryShortDuration')) {
    recommendations.push("Short study sessions are still valuable and contribute to your learning goals");
    recommendations.push("Even 5 minutes of focused study builds your knowledge");
  }
  
  if (patternTypes.includes('extendedDuration')) {
    recommendations.push("Impressive dedication with your extended study session!");
    recommendations.push("Remember to take breaks to maintain focus and prevent burnout");
  }
  
  if (riskLevel === 'medium' || riskLevel === 'high') {
    recommendations.push("Your study pattern shows some irregularities, but this is common and understandable");
    recommendations.push("Focus on consistency over perfection - every session counts towards your goals");
    recommendations.push("Technical issues and interruptions are normal parts of the learning experience");
  }
  
  return recommendations;
};

/**
 * Calculate enhanced forgiveness factors
 */
const calculateEnhancedForgiveness = (patterns: any[]) => {
  const forgiveness = {
    technicalIssues: 0,
    userExperienceFactors: 0,
    contextualUnderstanding: 0,
    totalForgivenessPotential: 0
  };
  
  const patternTypes = patterns.map(p => p.type);
  
  // Technical issue forgiveness
  if (patternTypes.includes('missingStartEvent')) forgiveness.technicalIssues += 0.15;
  if (patternTypes.includes('missingEndEvent')) forgiveness.technicalIssues += 0.10;
  if (patternTypes.includes('largeTimeGap')) forgiveness.technicalIssues += 0.05;
  if (patternTypes.includes('extendedInactivity')) forgiveness.technicalIssues += 0.08;
  
  // User experience factors
  if (patternTypes.includes('veryShortDuration')) forgiveness.userExperienceFactors += 0.10;
  if (patternTypes.includes('irregularHeartbeat')) forgiveness.userExperienceFactors += 0.08;
  if (patternTypes.includes('extendedDuration')) forgiveness.userExperienceFactors += 0.05;
  
  // Contextual understanding
  if (patterns.length === 0) forgiveness.contextualUnderstanding += 0.10;
  if (patterns.some(p => p.severity === 'low')) forgiveness.contextualUnderstanding += 0.05;
  
  // Cap and calculate total
  forgiveness.technicalIssues = Math.min(forgiveness.technicalIssues, 0.25);
  forgiveness.userExperienceFactors = Math.min(forgiveness.userExperienceFactors, 0.20);
  forgiveness.contextualUnderstanding = Math.min(forgiveness.contextualUnderstanding, 0.20);
  
  forgiveness.totalForgivenessPotential = Math.min(
    forgiveness.technicalIssues + forgiveness.userExperienceFactors + forgiveness.contextualUnderstanding,
    0.50
  );
  
  return forgiveness;
};

/**
 * Simulate comprehensive soft audit validation with enhanced pattern analysis
 */
export const simulateComprehensiveSoftAudit = (
  userId: string,
  sessionId: string,
  baseSuspicionScore: number,
  patterns: {
    missingStartEvent?: boolean;
    missingEndEvent?: boolean;
    largeTimeGap?: boolean;
    irregularHeartbeat?: boolean;
    veryShortDuration?: boolean;
    extendedDuration?: boolean;
    extendedInactivity?: boolean;
  },
  validationMode: 'soft' | 'strict' = 'soft',
  userHistory?: {
    currentStreak?: number;
    totalXP?: number;
    cleanSessionsRate?: number;
  }
) => {
  console.log(`🔍 Running comprehensive soft audit for session ${sessionId}...`);
  
  // First detect patterns
  const patternResult = simulateEnhancedAuditPatternDetection(userId, sessionId, patterns);
  
  // Then apply soft audit validation
  const validationResult = simulateSoftAuditValidation(
    userId, 
    sessionId, 
    baseSuspicionScore, 
    validationMode, 
    userHistory
  );
  
  // Combine results
  const comprehensiveResult = {
    ...validationResult,
    patterns: patternResult,
    isComprehensive: true,
    enhanced: true
  };
  
  console.log(`📊 Comprehensive Audit Complete:`);
  console.log(`   Base Score: ${validationResult.baseScore}`);
  console.log(`   Adjusted Score: ${validationResult.adjustedScore}`);
  console.log(`   Forgiveness Applied: ${(validationResult.forgivenessApplied * 100).toFixed(1)}%`);
  console.log(`   Patterns Detected: ${patternResult.suspiciousPatterns.length}`);
  console.log(`   Risk Level: ${patternResult.riskLevel}`);
  console.log(`   Recommendation: ${patternResult.recommendations[0] || 'Session looks good!'}`);
  
  return comprehensiveResult;
};

/**
 * Demo sequence to test the enhanced soft audit system
 */
export const runEnhancedSoftAuditDemo = (userId: string = 'enhanced-audit-demo') => {
  console.log('🚀 Starting Enhanced Soft Audit System Demo (Module Soft)...');
  console.log('='.repeat(60));
  
  const cleanup = setupSoftAuditDemo(userId, {
    onValidation: (event: AuditValidationEvent) => {
      console.log(`✅ Final validation: ${event.isValid ? 'VALID' : 'FLAGGED'} (Score: ${event.adjustedScore}/${event.threshold})`);
    },
    onPattern: (event: AuditPatternEvent) => {
      if ((event as any).enhancedAnalysis) {
        console.log(`🔍 Enhanced Analysis Complete:`);
        console.log(`   Risk Level: ${(event as any).enhancedAnalysis.riskLevel}`);
        console.log(`   Forgiveness Potential: ${(event as any).enhancedAnalysis.forgivenessFactors.totalForgivenessPotential.toFixed(1)}%`);
      }
    }
  });

  // Test case 1: Perfect session
  setTimeout(() => {
    console.log('\n🌟 Test 1: Perfect Study Session');
    simulateComprehensiveSoftAudit(
      userId, 
      'perfect-session', 
      10,
      { /* No patterns */ },
      'soft',
      { currentStreak: 15, totalXP: 5000, cleanSessionsRate: 95 }
    );
  }, 1000);

  // Test case 2: Minor irregularities with good history
  setTimeout(() => {
    console.log('\n🟡 Test 2: Minor Irregularities (Good User History)');
    simulateComprehensiveSoftAudit(
      userId, 
      'minor-issues-session', 
      55,
      {
        largeTimeGap: true,
        veryShortDuration: true
      },
      'soft',
      { currentStreak: 20, totalXP: 8000, cleanSessionsRate: 90 }
    );
  }, 3000);

  // Test case 3: Major patterns with good forgiveness
  setTimeout(() => {
    console.log('\n🟠 Test 3: Major Patterns (High Forgiveness Applied)');
    simulateComprehensiveSoftAudit(
      userId, 
      'major-patterns-session', 
      85,
      {
        missingStartEvent: true,
        largeTimeGap: true,
        irregularHeartbeat: true
      },
      'soft',
      { currentStreak: 30, totalXP: 12000, cleanSessionsRate: 98 }
    );
  }, 5000);

  // Test case 4: Critical patterns with insufficient forgiveness
  setTimeout(() => {
    console.log('\n🔴 Test 4: Critical Patterns (Insufficient Forgiveness)');
    simulateComprehensiveSoftAudit(
      userId, 
      'critical-session', 
      95,
      {
        missingStartEvent: true,
        missingEndEvent: true,
        extendedInactivity: true
      },
      'soft',
      { currentStreak: 2, totalXP: 300, cleanSessionsRate: 30 }
    );
  }, 7000);

  // Test case 5: Strict mode validation
  setTimeout(() => {
    console.log('\n⚡ Test 5: Strict Mode Validation');
    simulateComprehensiveSoftAudit(
      userId, 
      'strict-session', 
      65,
      {
        irregularHeartbeat: true,
        veryShortDuration: true
      },
      'strict',
      { currentStreak: 10, totalXP: 3000, cleanSessionsRate: 80 }
    );
  }, 9000);

  // Cleanup
  setTimeout(() => {
    console.log('\n✅ Enhanced Soft Audit Demo completed!');
    console.log('🎯 Key Features Demonstrated:');
    console.log('   • Sophisticated pattern detection');
    console.log('   • Non-punitive recommendations');
    console.log('   • Multi-factor forgiveness system');
    console.log('   • Risk assessment with nuance');
    console.log('   • Enhanced user experience');
    cleanup();
  }, 12000);

  return cleanup;
};

export default {
  simulateSoftAuditValidation,
  simulateEnhancedAuditPatternDetection,
  simulateComprehensiveSoftAudit,
  setupSoftAuditDemo,
  runSoftAuditDemo,
  runEnhancedSoftAuditDemo,
  testForgivenessScenarios,
};