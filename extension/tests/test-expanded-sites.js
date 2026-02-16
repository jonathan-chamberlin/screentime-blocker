// Test suite for expanded default blocked sites
// Run this in a browser console after loading constants.js

function testExpandedSites() {
  const results = {
    passed: 0,
    failed: 0,
    errors: []
  };

  // Test 1: DEFAULTS.rewardSites contains all expected sites
  console.log('Test 1: Verifying all expected sites are present...');
  const expectedSites = [
    'youtube.com',
    'reddit.com',
    'instagram.com',
    'tiktok.com',
    'twitter.com',
    'x.com',
    'facebook.com',
    'twitch.tv',
    'netflix.com',
    'hulu.com',
    'disneyplus.com',
  ];

  const missingSites = expectedSites.filter(site => !DEFAULTS.rewardSites.includes(site));
  if (missingSites.length === 0) {
    console.log('✓ All expected sites are present');
    results.passed++;
  } else {
    console.error('✗ Missing sites:', missingSites);
    results.failed++;
    results.errors.push(`Missing sites: ${missingSites.join(', ')}`);
  }

  // Test 2: All entries are valid domain strings (no protocols, no paths)
  console.log('Test 2: Validating domain format...');
  const invalidDomains = DEFAULTS.rewardSites.filter(site => {
    // Check for protocol
    if (site.includes('://')) return true;
    // Check for path
    if (site.includes('/') && !site.endsWith('/')) return true;
    // Check for whitespace
    if (site.trim() !== site) return true;
    // Check for empty string
    if (site.length === 0) return true;
    return false;
  });

  if (invalidDomains.length === 0) {
    console.log('✓ All domains are valid format');
    results.passed++;
  } else {
    console.error('✗ Invalid domains:', invalidDomains);
    results.failed++;
    results.errors.push(`Invalid domains: ${invalidDomains.join(', ')}`);
  }

  // Test 3: The list has no duplicates
  console.log('Test 3: Checking for duplicates...');
  const uniqueSites = [...new Set(DEFAULTS.rewardSites)];
  if (uniqueSites.length === DEFAULTS.rewardSites.length) {
    console.log('✓ No duplicates found');
    results.passed++;
  } else {
    const duplicates = DEFAULTS.rewardSites.filter((site, index) =>
      DEFAULTS.rewardSites.indexOf(site) !== index
    );
    console.error('✗ Duplicates found:', duplicates);
    results.failed++;
    results.errors.push(`Duplicate sites: ${duplicates.join(', ')}`);
  }

  // Summary
  console.log('\n=== Test Results ===');
  console.log(`Passed: ${results.passed}`);
  console.log(`Failed: ${results.failed}`);
  if (results.errors.length > 0) {
    console.log('\nErrors:');
    results.errors.forEach(err => console.log(`  - ${err}`));
  }

  return results.failed === 0;
}

// Auto-run if constants.js is already loaded
if (typeof DEFAULTS !== 'undefined') {
  testExpandedSites();
} else {
  console.warn('constants.js not loaded. Load constants.js first, then call testExpandedSites()');
}
