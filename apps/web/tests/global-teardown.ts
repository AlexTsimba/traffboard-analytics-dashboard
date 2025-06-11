/**
 * Global teardown for Playwright tests
 * Cleans up test environment and data
 */

async function globalTeardown() {
  console.log('🧹 Running global test cleanup...');
  
  // Cleanup test data if needed
  // This could include database cleanup, file cleanup, etc.
  
  console.log('✅ Global teardown completed');
}

export default globalTeardown;
