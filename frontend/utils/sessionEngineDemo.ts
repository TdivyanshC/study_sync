/**
 * Session Engine Demo - Testing utilities for unified session processing
 * Demonstrates integration of XP, Streak, Soft Audit, and Ranking modules
 */

import { sessionApi, SessionSummary } from '../src/api/sessionApi';

export class SessionEngineDemo {
  /**
   * Test session processing with a mock session ID
   */
  static async testSessionProcessing(sessionId: string): Promise<void> {
    console.log('='.repeat(60));
    console.log('SESSION ENGINE DEMO - Testing Unified Pipeline');
    console.log('='.repeat(60));
    console.log(`Session ID: ${sessionId}`);
    console.log('');

    try {
      // Process the session
      console.log('📊 Processing session through unified pipeline...');
      const summary = await sessionApi.processSession(sessionId);

      // Display results
      this.displaySessionSummary(summary);

    } catch (error) {
      console.error('❌ Error processing session:', error);
      throw error;
    }
  }

  /**
   * Display formatted session summary
   */
  static displaySessionSummary(summary: SessionSummary): void {
    console.log('\n' + '='.repeat(60));
    console.log('SESSION PROCESSING RESULTS');
    console.log('='.repeat(60));

    // XP Results
    console.log('\n💎 XP ENGINE (Module A1)');
    console.log('-'.repeat(60));
    console.log(`  XP Gained:     +${summary.xp_delta} XP`);
    console.log(`  Total XP:      ${summary.total_xp} XP`);
    console.log(`  Level:         ${summary.level}`);
    console.log(`  Reason:        ${summary.xp_reason}`);

    // Streak Results
    console.log('\n🔥 STREAK ENGINE (Module B2)');
    console.log('-'.repeat(60));
    console.log(`  Status:        ${summary.streak_status.toUpperCase()}`);
    console.log(`  Current:       ${summary.current_streak} days`);
    console.log(`  Best:          ${summary.best_streak} days`);
    console.log(`  Delta:         ${summary.streak_delta > 0 ? '+' : ''}${summary.streak_delta}`);
    if (summary.streak_milestone) {
      console.log(`  🎉 Milestone:  ${summary.streak_milestone}`);
    }

    // Audit Results
    console.log('\n🛡️ SOFT AUDIT (Module Soft)');
    console.log('-'.repeat(60));
    console.log(`  Valid:         ${summary.audit_valid ? '✅ Yes' : '⚠️ No'}`);
    console.log(`  Risk Score:    ${summary.audit_risk}/100`);
    console.log(`  Forgiveness:   ${summary.forgiveness_percent}%`);
    if (summary.audit_patterns.length > 0) {
      console.log(`  Patterns:      ${summary.audit_patterns.join(', ')}`);
    }
    if (summary.audit_messages.length > 0) {
      console.log(`  Messages:`);
      summary.audit_messages.forEach(msg => console.log(`    - ${msg}`));
    }

    // Ranking Results
    console.log('\n🏆 RANKING SYSTEM (Module D3)');
    console.log('-'.repeat(60));
    console.log(`  Tier:          ${summary.ranking.tier_info.emoji} ${summary.ranking.tier_info.name}`);
    console.log(`  Score:         ${summary.ranking.score.toFixed(3)}`);
    console.log(`  Progress:      ${summary.ranking.progress_percent.toFixed(1)}%`);
    if (summary.ranking.promoted) {
      console.log(`  🎊 PROMOTED!   Congratulations!`);
    }
    if (summary.ranking.next_tier) {
      console.log(`  Next Tier:     ${summary.ranking.next_tier}`);
    }

    // Notifications
    console.log('\n🔔 NOTIFICATIONS');
    console.log('-'.repeat(60));
    console.log(`  XP Gained:           ${summary.notifications.xp_gained ? '✅' : '❌'}`);
    console.log(`  Streak Maintained:   ${summary.notifications.streak_maintained ? '✅' : '❌'}`);
    console.log(`  Streak Milestone:    ${summary.notifications.streak_milestone ? '✅' : '❌'}`);
    console.log(`  Ranking Promoted:    ${summary.notifications.ranking_promoted ? '✅' : '❌'}`);
    console.log(`  Confetti Trigger:    ${summary.notifications.confetti_trigger ? '🎉' : '❌'}`);

    console.log('\n' + '='.repeat(60));
    console.log('✅ Session processing completed successfully!');
    console.log('='.repeat(60) + '\n');
  }

  /**
   * Test health check
   */
  static async testHealthCheck(): Promise<void> {
    console.log('🏥 Testing session engine health...');
    try {
      const health = await sessionApi.checkHealth();
      console.log('✅ Health check passed:', health);
    } catch (error) {
      console.error('❌ Health check failed:', error);
      throw error;
    }
  }

  /**
   * Test session status retrieval
   */
  static async testSessionStatus(sessionId: string): Promise<void> {
    console.log(`📋 Checking status for session ${sessionId}...`);
    try {
      const status = await sessionApi.getSessionStatus(sessionId);
      console.log('Session Status:', {
        processed: status.processed,
        session_id: status.session_id,
        user_id: status.user_id
      });
    } catch (error) {
      console.error('❌ Failed to get session status:', error);
      throw error;
    }
  }

  /**
   * Run full demo suite
   */
  static async runFullDemo(sessionId: string): Promise<void> {
    console.log('\n🚀 Starting Full Session Engine Demo\n');

    try {
      // 1. Health check
      await this.testHealthCheck();
      console.log('');

      // 2. Check session status
      await this.testSessionStatus(sessionId);
      console.log('');

      // 3. Process session
      await this.testSessionProcessing(sessionId);

      console.log('🎉 Full demo completed successfully!\n');
    } catch (error) {
      console.error('❌ Demo failed:', error);
      throw error;
    }
  }

  /**
   * Generate mock session summary for UI testing
   */
  static generateMockSummary(): SessionSummary {
    return {
      success: true,
      user_id: 'mock-user-123',
      session_id: 'mock-session-456',
      processed_at: new Date().toISOString(),
      
      // XP
      xp_delta: 35,
      xp_reason: '25 base XP | +10 Pomodoro bonus',
      total_xp: 1250,
      level: 13,
      
      // Streak
      streak_status: 'maintained',
      streak_delta: 1,
      current_streak: 7,
      best_streak: 12,
      streak_milestone: '7_day_streak',
      
      // Audit
      audit_risk: 15,
      audit_valid: true,
      audit_patterns: [],
      forgiveness_percent: 12.5,
      audit_messages: [
        '✨ Perfect session! Keep up the great work!',
        '💝 12% forgiveness applied based on your excellent history!'
      ],
      
      // Ranking
      ranking: {
        tier: 'silver',
        tier_info: {
          name: 'Silver',
          emoji: '🥈',
          color: '#C0C0C0',
          min_xp: 500,
          min_streak: 3
        },
        score: 0.425,
        progress_percent: 62.5,
        promoted: false,
        next_tier: 'gold'
      },
      
      // Notifications
      notifications: {
        xp_gained: true,
        streak_maintained: true,
        streak_milestone: true,
        ranking_promoted: false,
        confetti_trigger: true
      }
    };
  }

  /**
   * Test with mock data (for UI development)
   */
  static testWithMockData(): void {
    console.log('🎭 Testing with mock data...\n');
    const mockSummary = this.generateMockSummary();
    this.displaySessionSummary(mockSummary);
  }
}

// Export for use in components
export default SessionEngineDemo;

// Example usage:
// import SessionEngineDemo from '@/utils/sessionEngineDemo';
// 
// // Test with real session
// await SessionEngineDemo.runFullDemo('session-id-123');
//
// // Test with mock data
// SessionEngineDemo.testWithMockData();
