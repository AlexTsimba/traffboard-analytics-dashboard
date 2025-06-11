import { FullConfig } from '@playwright/test';

/**
 * Global setup for Playwright tests
 * Prepares the test environment and creates test data
 */

async function globalSetup(config: FullConfig) {
  console.log('🧪 Setting up global test environment...');
  
  // Wait for the application to be ready
  const baseURL = config.projects?.[0]?.use?.baseURL || 'http://localhost:3002';
  
  // Wait for health check
  let retries = 0;
  const maxRetries = 30;
  
  while (retries < maxRetries) {
    try {
      const response = await fetch(`${baseURL}/api/health`);
      if (response.ok) {
        console.log('✅ Application is ready for testing');
        break;
      }
    } catch (error) {
      // Server not ready yet
    }
    
    retries++;
    if (retries === maxRetries) {
      throw new Error('Application failed to start within timeout period');
    }
    
    await new Promise(resolve => setTimeout(resolve, 2000));
  }
  
  // Create test user if needed
  try {
    const createUserResponse = await fetch(`${baseURL}/api/test/create-user`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: 'test@example.com',
        password: 'TestPassword123!',
        name: 'Test User',
        role: 'admin',
      }),
    });
    
    if (createUserResponse.ok) {
      console.log('✅ Test user created successfully');
    } else {
      console.log('ℹ️ Test user already exists or creation skipped');
    }
  } catch (error) {
    console.log('⚠️ Could not create test user, continuing with existing setup');
  }
  
  // Prepare test data
  console.log('✅ Global setup completed');
}

export default globalSetup;
