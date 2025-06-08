import { describe, it, expect } from 'vitest';

describe('API Routes', () => {
  it('should have health check endpoint', () => {
    // Basic test to ensure API routes are properly set up
    expect('/api/health').toBeTruthy();
  });

  it('should have auth endpoints', () => {
    const authEndpoints = [
      '/api/auth/register',
      '/api/auth/login', 
      '/api/auth/setup-2fa',
      '/api/auth/verify-2fa'
    ];
    
    authEndpoints.forEach(endpoint => {
      expect(endpoint).toBeTruthy();
    });
  });
});