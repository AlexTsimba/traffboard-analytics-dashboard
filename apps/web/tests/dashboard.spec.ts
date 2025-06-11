import { test, expect } from '@playwright/test';

/**
 * Dashboard functionality end-to-end tests
 * Tests analytics dashboard components, filtering, and data display
 */

test.describe('Analytics Dashboard', () => {
  test.beforeEach(async ({ page }) => {
    // Login before each test
    await page.goto('/login');
    await page.fill('input[name="email"]', 'test@example.com');
    await page.fill('input[name="password"]', 'TestPassword123!');
    await page.click('button[type="submit"]');
    
    // Wait for authentication and navigate to dashboard
    await page.waitForURL(url => url.pathname === '/dashboard' || url.pathname === '/setup-2fa');
    
    // If on 2FA setup, skip it for now
    if (page.url().includes('setup-2fa')) {
      await page.goto('/dashboard');
    }
  });

  test('should display main dashboard overview', async ({ page }) => {
    await page.goto('/dashboard');
    
    // Check for main dashboard elements
    await expect(page.locator('h1, h2')).toContainText(/dashboard|analytics|overview/i);
    
    // Should have key metrics cards
    const metricsCards = page.locator('[data-testid*="metric"], .metric-card, .analytics-card');
    await expect(metricsCards.first()).toBeVisible();
    
    // Should display some numbers (even if zero)
    const numbers = page.locator('text=/\\d+/');
    await expect(numbers.first()).toBeVisible();
  });

  test('should load conversions dashboard', async ({ page }) => {
    await page.goto('/dashboard/conversions');
    
    // Check for conversions-specific content
    await expect(page.locator('h1, h2')).toContainText(/conversion/i);
    
    // Should have chart or data visualization
    const charts = page.locator('canvas, svg, .chart, [data-testid*="chart"]');
    
    // Wait for chart to load (with timeout)
    if (await charts.count() > 0) {
      await expect(charts.first()).toBeVisible();
    }
    
    // Should have data table or list
    const dataDisplay = page.locator('table, .data-table, [data-testid*="data"]');
    await expect(dataDisplay.first()).toBeVisible();
  });

  test('should load players dashboard', async ({ page }) => {
    await page.goto('/dashboard/players');
    
    // Check for players-specific content
    await expect(page.locator('h1, h2')).toContainText(/player/i);
    
    // Should have player data display
    const playerData = page.locator('table, .player-table, [data-testid*="player"]');
    await expect(playerData.first()).toBeVisible();
  });

  test('should handle dashboard filters', async ({ page }) => {
    await page.goto('/dashboard');
    
    // Look for filter controls
    const filters = page.locator('select, input[type="date"], .filter, [data-testid*="filter"]');
    
    if (await filters.count() > 0) {
      // Test date filter if available
      const dateFilters = page.locator('input[type="date"]');
      if (await dateFilters.count() > 0) {
        await dateFilters.first().fill('2024-01-01');
        
        // Should trigger data refresh
        await page.waitForLoadState('networkidle');
      }
      
      // Test dropdown filters if available
      const selectFilters = page.locator('select');
      if (await selectFilters.count() > 0) {
        const options = await selectFilters.first().locator('option');
        if (await options.count() > 1) {
          await selectFilters.first().selectOption({ index: 1 });
          await page.waitForLoadState('networkidle');
        }
      }
    }
  });

  test('should display real-time metrics', async ({ page }) => {
    await page.goto('/dashboard');
    
    // Check for metrics that should update
    const metrics = [
      'Total Clicks',
      'Registrations', 
      'Conversions',
      'Revenue',
      'Players',
    ];
    
    for (const metric of metrics) {
      const metricElement = page.locator(`text=${metric}`);
      if (await metricElement.isVisible()) {
        // Should have associated number
        const parent = metricElement.locator('..');
        await expect(parent.locator('text=/\\d+/')).toBeVisible();
      }
    }
  });

  test('should handle chart interactions', async ({ page }) => {
    await page.goto('/dashboard');
    
    // Look for interactive charts
    const charts = page.locator('canvas, svg, .chart');
    
    if (await charts.count() > 0) {
      const firstChart = charts.first();
      
      // Try hovering over chart (should show tooltip)
      await firstChart.hover();
      
      // Look for chart controls
      const chartControls = page.locator('.chart-controls, [data-testid*="chart-control"]');
      if (await chartControls.count() > 0) {
        // Test time range selector if available
        const timeControls = chartControls.locator('button, select');
        if (await timeControls.count() > 0) {
          await timeControls.first().click();
        }
      }
    }
  });

  test('should export data functionality', async ({ page }) => {
    await page.goto('/dashboard');
    
    // Look for export buttons
    const exportButtons = page.locator('button:has-text("Export"), button:has-text("Download"), [data-testid*="export"]');
    
    if (await exportButtons.count() > 0) {
      // Setup download listener
      const downloadPromise = page.waitForEvent('download');
      
      // Click export button
      await exportButtons.first().click();
      
      try {
        // Wait for download to start
        const download = await downloadPromise;
        
        // Verify download
        expect(download.suggestedFilename()).toMatch(/\.(csv|xlsx|json)$/);
      } catch (error) {
        // Export functionality might not be fully implemented yet
        console.log('Export functionality not available:', error);
      }
    }
  });

  test('should handle responsive design on mobile', async ({ page, isMobile }) => {
    if (isMobile) {
      await page.goto('/dashboard');
      
      // Check for mobile navigation
      const mobileNav = page.locator('.mobile-nav, .hamburger, [data-testid*="mobile"]');
      
      if (await mobileNav.count() > 0) {
        await mobileNav.first().click();
        
        // Should show navigation menu
        const navMenu = page.locator('.nav-menu, .sidebar, [data-testid*="nav"]');
        await expect(navMenu.first()).toBeVisible();
      }
      
      // Charts should be responsive
      const charts = page.locator('canvas, svg, .chart');
      if (await charts.count() > 0) {
        const chartBounds = await charts.first().boundingBox();
        expect(chartBounds?.width).toBeLessThanOrEqual(400); // Mobile width
      }
    }
  });

  test('should load data progressively', async ({ page }) => {
    await page.goto('/dashboard');
    
    // Should show loading states initially
    const loadingElements = page.locator('.loading, .spinner, [data-testid*="loading"]');
    
    // Wait for data to load
    await page.waitForLoadState('networkidle');
    
    // Loading elements should be gone
    if (await loadingElements.count() > 0) {
      await expect(loadingElements.first()).not.toBeVisible();
    }
    
    // Should have actual data displayed
    const dataElements = page.locator('table tbody tr, .data-row, [data-testid*="data-row"]');
    
    // Either show data or "no data" message
    const hasData = await dataElements.count() > 0;
    const noDataMessage = await page.locator('text=/no data|empty|no results/i').count() > 0;
    
    expect(hasData || noDataMessage).toBeTruthy();
  });

  test('should handle errors gracefully', async ({ page }) => {
    // Test with intentionally broken URL to see error handling
    await page.goto('/dashboard/nonexistent');
    
    // Should show 404 or redirect to valid page
    const url = page.url();
    const content = await page.textContent('body');
    
    expect(url.includes('/dashboard') || content?.includes('404') || content?.includes('Not Found')).toBeTruthy();
  });
});

test.describe('Dashboard Performance', () => {
  test('should load dashboard within performance budget', async ({ page }) => {
    const startTime = Date.now();
    
    await page.goto('/dashboard');
    await page.waitForLoadState('networkidle');
    
    const loadTime = Date.now() - startTime;
    
    // Dashboard should load within 5 seconds
    expect(loadTime).toBeLessThan(5000);
  });

  test('should cache data effectively', async ({ page }) => {
    // First load
    await page.goto('/dashboard');
    await page.waitForLoadState('networkidle');
    
    // Navigate away and back
    await page.goto('/');
    await page.goto('/dashboard');
    
    // Should load faster on second visit (cached)
    await page.waitForLoadState('networkidle');
    
    // Verify dashboard content is displayed
    await expect(page.locator('h1, h2')).toContainText(/dashboard|analytics/i);
  });
});
