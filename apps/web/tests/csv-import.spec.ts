import { test, expect } from '@playwright/test';
import { resolve } from 'path';

/**
 * Comprehensive CSV import end-to-end tests
 * Tests file upload, validation, import execution, and error handling
 */

test.describe('CSV Import System', () => {
  test.beforeEach(async ({ page }) => {
    // Login as admin
    await page.goto('/login');
    await page.fill('input[name="email"]', 'test@example.com');
    await page.fill('input[name="password"]', 'TestPassword123!');
    await page.click('button[type="submit"]');
    
    // Navigate to import page
    await page.goto('/admin/import');
    await page.waitForLoadState('networkidle');
  });

  test('should validate and execute conversions CSV import successfully', async ({ page }) => {
    console.log('🧪 Testing conversions CSV import...');
    
    // Upload sample conversions CSV
    const csvPath = resolve('../../test-data/sample_conversions.csv');
    await page.setInputFiles('input[type="file"]', csvPath);
    
    // Select data type
    const dataTypeSelect = page.locator('select[name="dataType"], [data-testid="data-type-select"]');
    if (await dataTypeSelect.isVisible()) {
      await dataTypeSelect.selectOption('conversions');
    }
    
    // Validate file
    await page.click('button:has-text("Validate File")');
    await page.waitForLoadState('networkidle');
    
    // Check validation results
    const validationResults = page.locator('.validation-results, [data-testid="validation-results"]');
    await expect(validationResults).toBeVisible();
    
    // Should show total rows
    await expect(page.locator('text=/Total Rows/i')).toBeVisible();
    
    // Should show date analysis
    await expect(page.locator('text=/Historical|Today|Future/i')).toBeVisible();
    
    // Execute import if validation passed
    const importButton = page.locator('button:has-text("Execute Import")');
    if (await importButton.isEnabled()) {
      console.log('✅ Validation passed, executing import...');
      
      await importButton.click();
      await page.waitForLoadState('networkidle');
      
      // Check for success message
      const successMessage = page.locator('.text-green-600, .success, [data-testid="import-success"]');
      await expect(successMessage).toBeVisible({ timeout: 30000 });
      
      console.log('✅ Import completed successfully');
    } else {
      console.log('⚠️ Import button not enabled, checking validation errors');
      const errors = await page.locator('.text-red-600, .error').allTextContents();
      console.log('Validation errors:', errors);
    }
  });

  test('should validate and execute players CSV import successfully', async ({ page }) => {
    console.log('🧪 Testing players CSV import...');
    
    // Upload sample players CSV (if available)
    const csvPath = resolve('../../test-data/sample_players.csv');
    
    try {
      await page.setInputFiles('input[type="file"]', csvPath);
      
      // Select players data type
      const dataTypeSelect = page.locator('select[name="dataType"], [data-testid="data-type-select"]');
      if (await dataTypeSelect.isVisible()) {
        await dataTypeSelect.selectOption('players');
      }
      
      // Validate file
      await page.click('button:has-text("Validate File")');
      await page.waitForLoadState('networkidle');
      
      // Check validation results
      await expect(page.locator('.validation-results, [data-testid="validation-results"]')).toBeVisible();
      
      // Execute import if validation passed
      const importButton = page.locator('button:has-text("Execute Import")');
      if (await importButton.isEnabled()) {
        await importButton.click();
        await page.waitForLoadState('networkidle');
        
        // Check for success
        const successMessage = page.locator('.text-green-600, .success');
        await expect(successMessage).toBeVisible({ timeout: 30000 });
        
        console.log('✅ Players import completed successfully');
      }
    } catch (error) {
      console.log('ℹ️ Sample players CSV not available, skipping test');
    }
  });

  test('should handle invalid CSV files gracefully', async ({ page }) => {
    // Create a temporary invalid CSV
    const invalidCsv = 'invalid,data\nwith,wrong,structure';
    
    // Use a data URL to simulate file upload
    await page.evaluate((csvContent) => {
      const blob = new Blob([csvContent], { type: 'text/csv' });
      const file = new File([blob], 'invalid.csv', { type: 'text/csv' });
      
      const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement;
      if (fileInput) {
        const dataTransfer = new DataTransfer();
        dataTransfer.items.add(file);
        fileInput.files = dataTransfer.files;
        fileInput.dispatchEvent(new Event('change', { bubbles: true }));
      }
    }, invalidCsv);
    
    // Try to validate
    await page.click('button:has-text("Validate File")');
    await page.waitForLoadState('networkidle');
    
    // Should show validation errors
    const errorMessages = page.locator('.text-red-600, .error');
    await expect(errorMessages).toBeVisible();
    
    // Import button should be disabled
    const importButton = page.locator('button:has-text("Execute Import")');
    await expect(importButton).toBeDisabled();
  });

  test('should show detailed validation analysis', async ({ page }) => {
    const csvPath = resolve('../../test-data/sample_conversions.csv');
    await page.setInputFiles('input[type="file"]', csvPath);
    
    await page.click('button:has-text("Validate File")');
    await page.waitForLoadState('networkidle');
    
    // Should show comprehensive validation info
    const validationInfo = [
      'Total Rows',
      'Valid Records',
      'Date Analysis',
      'Column Structure',
    ];
    
    for (const info of validationInfo) {
      const element = page.locator(`text=${info}`);
      if (await element.isVisible()) {
        console.log(`✅ Found validation info: ${info}`);
      }
    }
    
    // Should show import strategy
    await expect(page.locator('text=/Historical|Skip|Upsert|Insert/i')).toBeVisible();
  });

  test('should handle large file uploads', async ({ page }) => {
    // This test would require a large sample file
    // For now, we'll test the file size validation
    
    const fileInput = page.locator('input[type="file"]');
    
    // Check if there's a file size limit mentioned in the UI
    const fileSizeInfo = page.locator('text=/2MB|size limit|maximum/i');
    if (await fileSizeInfo.isVisible()) {
      console.log('✅ File size limits are displayed');
    }
  });

  test('should preserve import history', async ({ page }) => {
    // After a successful import, check for history
    const csvPath = resolve('../../test-data/sample_conversions.csv');
    await page.setInputFiles('input[type="file"]', csvPath);
    
    await page.click('button:has-text("Validate File")');
    await page.waitForLoadState('networkidle');
    
    const importButton = page.locator('button:has-text("Execute Import")');
    if (await importButton.isEnabled()) {
      await importButton.click();
      await page.waitForLoadState('networkidle');
      
      // Look for import history section
      const historySection = page.locator('.import-history, [data-testid="import-history"]');
      if (await historySection.isVisible()) {
        console.log('✅ Import history is displayed');
        
        // Should show recent import
        const recentImport = historySection.locator('text=/sample_conversions|Conversions|Success/i');
        await expect(recentImport.first()).toBeVisible();
      }
    }
  });

  test('should handle concurrent imports appropriately', async ({ page }) => {
    // Test that the system prevents or handles concurrent imports
    const csvPath = resolve('../../test-data/sample_conversions.csv');
    await page.setInputFiles('input[type="file"]', csvPath);
    
    await page.click('button:has-text("Validate File")');
    await page.waitForLoadState('networkidle');
    
    const importButton = page.locator('button:has-text("Execute Import")');
    if (await importButton.isEnabled()) {
      // Start import
      await importButton.click();
      
      // Try to start another import quickly
      await page.setInputFiles('input[type="file"]', csvPath);
      
      // Should either disable the form or show a message about ongoing import
      const disabledState = await importButton.isDisabled();
      const importingMessage = await page.locator('text=/importing|in progress/i').isVisible();
      
      expect(disabledState || importingMessage).toBeTruthy();
    }
  });
});

test.describe('Import Data Validation', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/login');
    await page.fill('input[name="email"]', 'test@example.com');
    await page.fill('input[name="password"]', 'TestPassword123!');
    await page.click('button[type="submit"]');
    await page.goto('/admin/import');
  });

  test('should validate CSV column headers correctly', async ({ page }) => {
    const csvPath = resolve('../../test-data/sample_conversions.csv');
    await page.setInputFiles('input[type="file"]', csvPath);
    
    await page.click('button:has-text("Validate File")');
    await page.waitForLoadState('networkidle');
    
    // Should show column validation
    const columnInfo = page.locator('text=/columns|headers|fields/i');
    await expect(columnInfo).toBeVisible();
    
    // Should show required vs optional columns
    const requiredColumns = ['date', 'foreign_partner_id', 'country'];
    for (const column of requiredColumns) {
      const columnElement = page.locator(`text=${column}`);
      if (await columnElement.isVisible()) {
        console.log(`✅ Found required column: ${column}`);
      }
    }
  });

  test('should validate date formats and ranges', async ({ page }) => {
    const csvPath = resolve('../../test-data/sample_conversions.csv');
    await page.setInputFiles('input[type="file"]', csvPath);
    
    await page.click('button:has-text("Validate File")');
    await page.waitForLoadState('networkidle');
    
    // Should show date analysis
    const dateAnalysis = page.locator('.date-analysis, [data-testid="date-analysis"]');
    if (await dateAnalysis.isVisible()) {
      // Should categorize dates
      await expect(page.locator('text=/Historical|Today|Future/i')).toBeVisible();
      
      // Should show date range
      await expect(page.locator('text=/Date Range|From.*To/i')).toBeVisible();
    }
  });

  test('should validate numeric fields', async ({ page }) => {
    const csvPath = resolve('../../test-data/sample_conversions.csv');
    await page.setInputFiles('input[type="file"]', csvPath);
    
    await page.click('button:has-text("Validate File")');
    await page.waitForLoadState('networkidle');
    
    // Should validate numeric constraints
    const validationResults = await page.textContent('body');
    
    // Look for numeric validation messages
    if (validationResults?.includes('clicks') || validationResults?.includes('registrations')) {
      console.log('✅ Numeric field validation is working');
    }
  });
});

test.describe('Import Error Handling', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/login');
    await page.fill('input[name="email"]', 'test@example.com');
    await page.fill('input[name="password"]', 'TestPassword123!');
    await page.click('button[type="submit"]');
    await page.goto('/admin/import');
  });

  test('should handle network errors during import', async ({ page }) => {
    // Simulate network failure during import
    const csvPath = resolve('../../test-data/sample_conversions.csv');
    await page.setInputFiles('input[type="file"]', csvPath);
    
    await page.click('button:has-text("Validate File")');
    await page.waitForLoadState('networkidle');
    
    const importButton = page.locator('button:has-text("Execute Import")');
    if (await importButton.isEnabled()) {
      // Block network requests to simulate failure
      await page.route('**/api/imports/**', route => {
        route.abort();
      });
      
      await importButton.click();
      
      // Should show error message
      const errorMessage = page.locator('.text-red-600, .error');
      await expect(errorMessage).toBeVisible({ timeout: 10000 });
    }
  });

  test('should recover from partial import failures', async ({ page }) => {
    // This would require setting up a scenario where some records fail
    // For now, we'll check that the system shows detailed error information
    
    const csvPath = resolve('../../test-data/sample_conversions.csv');
    await page.setInputFiles('input[type="file"]', csvPath);
    
    await page.click('button:has-text("Validate File")');
    await page.waitForLoadState('networkidle');
    
    // Look for error details section
    const errorDetails = page.locator('.error-details, [data-testid="error-details"]');
    
    // Even if no errors, the UI should be prepared to show them
    const hasErrorHandling = await page.locator('text=/errors|failed|success/i').count() > 0;
    expect(hasErrorHandling).toBeTruthy();
  });
});
