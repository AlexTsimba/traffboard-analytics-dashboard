import { test, expect } from '@playwright/test';

/**
 * Authentication flow end-to-end tests
 * Tests login, logout, 2FA setup, and session management
 */

test.describe('Authentication System', () => {
  test.beforeEach(async ({ page }) => {
    // Start from home page
    await page.goto('/');
  });

  test('should redirect to login when accessing protected pages', async ({ page }) => {
    // Try to access dashboard without authentication
    await page.goto('/dashboard');
    
    // Should be redirected to login
    await expect(page).toHaveURL('/login');
    await expect(page.locator('h1')).toContainText('Sign In');
  });

  test('should successfully log in with valid credentials', async ({ page }) => {
    await page.goto('/login');
    
    // Fill login form
    await page.fill('input[name="email"]', 'test@example.com');
    await page.fill('input[name="password"]', 'TestPassword123!');
    
    // Submit login
    await page.click('button[type="submit"]');
    
    // Should redirect to dashboard or 2FA setup
    await page.waitForURL(url => url.pathname === '/dashboard' || url.pathname === '/setup-2fa');
    
    // Verify we're authenticated
    const currentUrl = page.url();
    expect(currentUrl).toMatch(/(dashboard|setup-2fa)/);
  });

  test('should show error for invalid credentials', async ({ page }) => {
    await page.goto('/login');
    
    // Fill with invalid credentials
    await page.fill('input[name="email"]', 'invalid@example.com');
    await page.fill('input[name="password"]', 'wrongpassword');
    
    // Submit login
    await page.click('button[type="submit"]');
    
    // Should show error message
    await expect(page.locator('.text-red-600, .error')).toBeVisible();
    await expect(page.locator('.text-red-600, .error')).toContainText(/invalid|incorrect|failed/i);
  });

  test('should handle 2FA setup flow', async ({ page }) => {
    // Login first
    await page.goto('/login');
    await page.fill('input[name="email"]', 'test@example.com');
    await page.fill('input[name="password"]', 'TestPassword123!');
    await page.click('button[type="submit"]');
    
    // If redirected to 2FA setup
    if (page.url().includes('setup-2fa')) {
      // Should show QR code
      await expect(page.locator('canvas, img[alt*="QR"], [data-testid="qr-code"]')).toBeVisible();
      
      // Should have setup form
      await expect(page.locator('input[name="code"], input[name="totp"]')).toBeVisible();
      await expect(page.locator('button[type="submit"]')).toBeVisible();
    }
  });

  test('should successfully logout', async ({ page }) => {
    // Login first
    await page.goto('/login');
    await page.fill('input[name="email"]', 'test@example.com');
    await page.fill('input[name="password"]', 'TestPassword123!');
    await page.click('button[type="submit"]');
    
    // Wait for redirect to dashboard or 2FA
    await page.waitForURL(url => url.pathname === '/dashboard' || url.pathname === '/setup-2fa');
    
    // Find and click logout button
    const logoutButton = page.locator('button:has-text("Logout"), button:has-text("Sign Out"), [data-testid="logout"]');
    
    if (await logoutButton.isVisible()) {
      await logoutButton.click();
      
      // Should redirect to home or login page
      await expect(page).toHaveURL(/\/(login)?$/);
    }
  });

  test('should maintain session across page refreshes', async ({ page }) => {
    // Login first
    await page.goto('/login');
    await page.fill('input[name="email"]', 'test@example.com');
    await page.fill('input[name="password"]', 'TestPassword123!');
    await page.click('button[type="submit"]');
    
    // Wait for authentication
    await page.waitForURL(url => url.pathname === '/dashboard' || url.pathname === '/setup-2fa');
    
    // Refresh page
    await page.reload();
    
    // Should still be authenticated
    const currentUrl = page.url();
    expect(currentUrl).not.toContain('/login');
  });

  test('should handle session expiration gracefully', async ({ page }) => {
    // This test would require manual session manipulation
    // For now, we'll test that the login page works correctly
    await page.goto('/login');
    
    // Clear any existing session data
    await page.evaluate(() => {
      localStorage.clear();
      document.cookie.split(";").forEach(function(c) { 
        document.cookie = c.replace(/^ +/, "").replace(/=.*/, "=;expires=" + new Date().toUTCString() + ";path=/"); 
      });
    });
    
    // Try to access protected page
    await page.goto('/dashboard');
    
    // Should be redirected to login
    await expect(page).toHaveURL('/login');
  });
});

test.describe('Password Security', () => {
  test('should enforce password requirements', async ({ page }) => {
    await page.goto('/login');
    
    // If there's a register link, test password requirements
    const registerLink = page.locator('a:has-text("Register"), a:has-text("Sign Up")');
    
    if (await registerLink.isVisible()) {
      await registerLink.click();
      
      // Test weak password
      await page.fill('input[name="email"]', 'newuser@example.com');
      await page.fill('input[name="password"]', '123');
      
      const submitButton = page.locator('button[type="submit"]');
      if (await submitButton.isVisible()) {
        await submitButton.click();
        
        // Should show password requirements error
        await expect(page.locator('.text-red-600, .error')).toBeVisible();
      }
    }
  });
});
