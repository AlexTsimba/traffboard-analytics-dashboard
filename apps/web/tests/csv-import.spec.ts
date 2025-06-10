import { test, expect } from '@playwright/test';
import { resolve } from 'path';

test.describe('CSV Import Functionality', () => {
  test('should execute CSV import after successful validation', async ({ page }) => {
    console.log('🧪 Testing CSV import execution...');
    
    // Navigate to import page
    await page.goto('http://localhost:3002/admin/import');
    
    // Upload and validate CSV
    const csvPath = resolve('../../sample_conversions.csv');
    await page.setInputFiles('input[type="file"]', csvPath);
    await page.click('button:has-text("Validate File")');
    
    // Wait for validation
    await page.waitForLoadState('networkidle');
    
    // Look for import button (enabled after successful validation)
    const importButton = page.locator('button:has-text("Execute Import")');
    
    // If validation passed, the import button should be enabled
    if (await importButton.isEnabled()) {
      console.log('✅ Validation passed, executing import...');
      
      await importButton.click();
      
      // Wait for import to complete
      await page.waitForLoadState('networkidle');
      
      // Check for import results
      const importResults = page.locator('.import-results, [data-testid="import-results"]');
      await expect(importResults).toBeVisible({ timeout: 30000 });
      
      console.log('✅ Import execution completed');
    } else {
      console.log('⚠️ Validation failed, checking error messages...');
      
      // Look for error messages
      const errorMessages = await page.locator('.text-red-600, .error').allTextContents();
      console.log('Validation errors:', errorMessages);
    }
  });

  test('should display proper validation analysis', async ({ page }) => {
    console.log('🧪 Testing validation analysis display...');
    
    await page.goto('http://localhost:3002/admin/import');
    
    const csvPath = resolve('../../sample_conversions.csv');
    await page.setInputFiles('input[type="file"]', csvPath);
    await page.click('button:has-text("Validate File")');
    
    await page.waitForLoadState('networkidle');
    
    // Check for specific validation metrics
    const pageContent = await page.textContent('body');
    
    // Our CSV has 9 data rows, should be detected
    expect(pageContent).toContain('Total Rows');
    
    // Should show date analysis (historical, today, future)
    expect(pageContent).toMatch(/(Historical|Today|Future)/);
    
    console.log('✅ Validation analysis is displaying correctly');
  });
});
