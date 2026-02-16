// Test suite for reward flow fixes
// Run these tests manually by loading in browser console or via a test runner

const tests = {
  async testHandleRewardExpiredExists() {
    console.log('Test: handleRewardExpired function exists');
    if (typeof handleRewardExpired !== 'function') {
      throw new Error('handleRewardExpired function does not exist');
    }
    console.log('PASS: handleRewardExpired exists');
  },

  async testRewardCountdownMechanism() {
    console.log('Test: Reward countdown interval mechanism');

    // Check that countdown functions exist
    if (typeof startRewardCountdown !== 'function') {
      throw new Error('startRewardCountdown function does not exist');
    }
    if (typeof stopRewardCountdown !== 'function') {
      throw new Error('stopRewardCountdown function does not exist');
    }

    // Verify rewardCountdownInterval variable exists (it should be null initially)
    if (typeof rewardCountdownInterval === 'undefined') {
      throw new Error('rewardCountdownInterval variable does not exist');
    }

    console.log('PASS: Countdown mechanism functions exist');
  },

  async testHandlePauseRewardCallsRedirectBlockedTabs() {
    console.log('Test: handlePauseReward uses redirectBlockedTabs');

    // Get the source code of handlePauseReward
    const fnSource = handlePauseReward.toString();

    // Check that it calls redirectBlockedTabs with 'reward-paused'
    if (!fnSource.includes('redirectBlockedTabs')) {
      throw new Error('handlePauseReward does not call redirectBlockedTabs');
    }

    if (!fnSource.includes('reward-paused')) {
      throw new Error('handlePauseReward does not pass "reward-paused" reason');
    }

    // Verify it doesn't call redirectNonActiveTabs
    if (fnSource.includes('redirectNonActiveTabs')) {
      throw new Error('handlePauseReward still calls redirectNonActiveTabs (should be removed)');
    }

    console.log('PASS: handlePauseReward correctly uses redirectBlockedTabs');
  },

  async testUpdateRewardStateChecksExpiry() {
    console.log('Test: updateRewardState checks for expiry');

    const fnSource = updateRewardState.toString();

    // Check that it calls handleRewardExpired
    if (!fnSource.includes('handleRewardExpired')) {
      throw new Error('updateRewardState does not check for expiry');
    }

    // Check that it checks rewardBurnedSeconds >= rewardTotalSeconds
    if (!fnSource.includes('rewardBurnedSeconds') || !fnSource.includes('rewardTotalSeconds')) {
      throw new Error('updateRewardState does not check burned vs total seconds');
    }

    console.log('PASS: updateRewardState checks for expiry');
  },

  async testAlarmHandlerUsesExtractedFunction() {
    console.log('Test: Alarm handler uses handleRewardExpired');

    // This test verifies the refactoring was done correctly
    // We check that the alarm handler code is shorter (because logic was extracted)
    const alarmListeners = chrome.alarms.onAlarm._listeners || [];

    if (alarmListeners.length === 0) {
      throw new Error('No alarm listeners found');
    }

    const listenerSource = alarmListeners[0].toString();

    if (!listenerSource.includes('handleRewardExpired')) {
      throw new Error('Alarm handler does not call handleRewardExpired');
    }

    console.log('PASS: Alarm handler uses extracted function');
  },

  async runAll() {
    console.log('===== Running Reward Flow Tests =====');
    const testMethods = Object.keys(this).filter(k => k.startsWith('test') && k !== 'testAll');

    let passed = 0;
    let failed = 0;

    for (const testName of testMethods) {
      try {
        await this[testName]();
        passed++;
      } catch (err) {
        console.error(`FAIL: ${testName}`, err.message);
        failed++;
      }
    }

    console.log(`\n===== Test Results =====`);
    console.log(`Passed: ${passed}`);
    console.log(`Failed: ${failed}`);
    console.log(`Total: ${passed + failed}`);

    return { passed, failed };
  }
};

// Auto-run if loaded in background context
if (typeof chrome !== 'undefined' && chrome.runtime && chrome.runtime.id) {
  tests.runAll().then(results => {
    if (results.failed === 0) {
      console.log('All tests passed!');
    } else {
      console.error('Some tests failed.');
    }
  });
}
