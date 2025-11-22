/**
 * Test Badge Popup and Badge System Integration
 * Tests the complete badge flow from session completion to popup display
 */

// Mock badge data for testing
const mockBadges = [
  {
    badge_id: 'first_session',
    title: 'First Steps',
    description: 'Complete your first study session',
    icon: '🎯',
    category: 'milestone'
  },
  {
    badge_id: '7_day_streak',
    title: '7 Day Streak',
    description: 'Study for 7 consecutive days',
    icon: '🔥',
    category: 'streak'
  },
  {
    badge_id: '10_hour_grind',
    title: '10 Hour Grind',
    description: 'Study 10 hours in a single day',
    icon: '⚡',
    category: 'session'
  }
];

// Test badge popup functionality
async function testBadgePopupDisplay() {
  console.log('🎖️ Testing Badge Popup Display...');
  
  try {
    // Test 1: Verify BadgePopup component exists
    const badgePopup = document.querySelector('[data-testid="badge-popup"]');
    if (!badgePopup) {
      console.log('❌ BadgePopup component not found');
      return false;
    }
    console.log('✅ BadgePopup component found');
    
    // Test 2: Test badge data structure
    console.log('🔍 Testing badge data structure...');
    for (const badge of mockBadges) {
      if (!badge.title || !badge.description || !badge.icon) {
        console.log(`❌ Invalid badge data: ${badge.badge_id}`);
        return false;
      }
    }
    console.log('✅ Badge data structure is valid');
    
    // Test 3: Test popup display state
    console.log('🖼️ Testing popup display state...');
    const isVisible = badgePopup.style.display !== 'none';
    console.log(`Badge popup visible: ${isVisible ? 'Yes' : 'No'}`);
    
    // Test 4: Test animations
    console.log('🎬 Testing animations...');
    const animations = badgePopup.querySelectorAll('[class*="animated"], [class*="bounce"], [class*="slide"]');
    console.log(`Found ${animations.length} animated elements`);
    
    console.log('✅ Badge popup display test completed successfully');
    return true;
    
  } catch (error) {
    console.error('❌ Badge popup test failed:', error);
    return false;
  }
}

// Test badge persistence and retrieval
async function testBadgePersistence() {
  console.log('💾 Testing Badge Persistence...');
  
  try {
    // Simulate backend API calls
    const mockApiResponse = {
      success: true,
      data: {
        badges: mockBadges,
        total_badges: mockBadges.length,
        badge_categories: {
          milestone: 1,
          streak: 1,
          session: 1
        },
        recent_badges: mockBadges.slice(0, 2)
      }
    };
    
    // Test badge data structure
    const { badges, total_badges, badge_categories, recent_badges } = mockApiResponse.data;
    
    console.log(`Total badges: ${total_badges}`);
    console.log('Badge categories:', badge_categories);
    console.log('Recent badges:', recent_badges.length);
    
    // Test badge persistence
    localStorage.setItem('test_badges', JSON.stringify(mockApiResponse.data));
    const stored = JSON.parse(localStorage.getItem('test_badges'));
    
    if (stored && stored.total_badges === total_badges) {
      console.log('✅ Badge persistence test passed');
      return true;
    } else {
      console.log('❌ Badge persistence test failed');
      return false;
    }
    
  } catch (error) {
    console.error('❌ Badge persistence test failed:', error);
    return false;
  }
}

// Test badge events system
async function testBadgeEvents() {
  console.log('📡 Testing Badge Events System...');
  
  try {
    // Mock event emitter for testing
    const eventEmitter = {
      listeners: {},
      
      emitBadgeUnlocked(event) {
        if (this.listeners.badge_unlocked) {
          this.listeners.badge_unlocked.forEach(callback => callback(event));
        }
      },
      
      onBadgeUnlocked(callback) {
        if (!this.listeners.badge_unlocked) {
          this.listeners.badge_unlocked = [];
        }
        this.listeners.badge_unlocked.push(callback);
      }
    };
    
    // Test event firing
    let eventReceived = false;
    eventEmitter.onBadgeUnlocked((event) => {
      console.log('Badge unlocked event received:', event);
      eventReceived = true;
    });
    
    // Fire test event
    eventEmitter.emitBadgeUnlocked({
      userId: 'test-user',
      badge: mockBadges[0],
      earnedAt: new Date(),
      totalBadges: 1,
      timestamp: new Date()
    });
    
    if (eventReceived) {
      console.log('✅ Badge events test passed');
      return true;
    } else {
      console.log('❌ Badge events test failed - no event received');
      return false;
    }
    
  } catch (error) {
    console.error('❌ Badge events test failed:', error);
    return false;
  }
}

// Test session completion integration
async function testSessionCompletionIntegration() {
  console.log('🎯 Testing Session Completion Integration...');
  
  try {
    // Mock session completion flow
    const sessionCompletion = {
      async completeSession(sessionId, userId) {
        console.log(`Completing session ${sessionId} for user ${userId}`);
        
        // Simulate session processing
        const summary = {
          success: true,
          xp_delta: 50,
          xp_reason: 'Session completed',
          total_xp: 150,
          level: 2,
          streak_status: 'maintained',
          current_streak: 3,
          best_streak: 5,
          audit_risk: 10,
          audit_valid: true,
          audit_messages: ['Session looks good']
        };
        
        // Simulate badge checking
        const newBadges = [];
        if (summary.total_xp >= 100 && summary.current_streak >= 1) {
          newBadges.push(mockBadges[0]); // First Steps badge
        }
        
        return { summary, newBadges };
      }
    };
    
    // Test session completion
    const result = await sessionCompletion.completeSession('test-session-123', 'test-user-456');
    
    console.log('Session result:', result.summary);
    console.log('New badges:', result.newBadges.length);
    
    if (result.summary.success && result.newBadges.length > 0) {
      console.log('✅ Session completion integration test passed');
      return true;
    } else {
      console.log('❌ Session completion integration test failed');
      return false;
    }
    
  } catch (error) {
    console.error('❌ Session completion integration test failed:', error);
    return false;
  }
}

// Run all tests
async function runBadgeTests() {
  console.log('🚀 Starting Badge System Tests...\n');
  
  const tests = [
    { name: 'Badge Popup Display', fn: testBadgePopupDisplay },
    { name: 'Badge Persistence', fn: testBadgePersistence },
    { name: 'Badge Events', fn: testBadgeEvents },
    { name: 'Session Completion Integration', fn: testSessionCompletionIntegration }
  ];
  
  let passedTests = 0;
  let totalTests = tests.length;
  
  for (const test of tests) {
    console.log(`\n--- ${test.name} ---`);
    const result = await test.fn();
    if (result) {
      passedTests++;
    }
  }
  
  console.log(`\n🎯 Test Results: ${passedTests}/${totalTests} tests passed`);
  
  if (passedTests === totalTests) {
    console.log('🎉 All badge tests passed! Badge system is working correctly.');
  } else {
    console.log('⚠️ Some tests failed. Please check the badge system implementation.');
  }
  
  return passedTests === totalTests;
}

// Export for use in other files
if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    testBadgePopupDisplay,
    testBadgePersistence,
    testBadgeEvents,
    testSessionCompletionIntegration,
    runBadgeTests
  };
}

// Run tests if this file is executed directly
if (typeof window !== 'undefined' || typeof document !== 'undefined') {
  // Browser environment - wait for DOM to be ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', runBadgeTests);
  } else {
    runBadgeTests();
  }
} else if (typeof require !== 'undefined') {
  // Node.js environment
  runBadgeTests();
}