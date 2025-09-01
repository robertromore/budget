import { test, expect } from '@playwright/test';

test.describe('Filter Display Navigation Bug #30', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/accounts/1');
    await page.waitForLoadState('networkidle');
  });

  test('filter display persists when navigating back from schedules', async ({ page }) => {
    // Step 1: Set a date filter on account view
    await page.click('[data-testid="filter-button"]');
    await page.click('text=Date');
    await page.click('text=On');
    
    // Select a date (assuming there's a date picker)
    await page.fill('[data-testid="date-input"]', '2024-01-01');
    await page.click('text=Apply');

    // Verify filter is applied and visible
    await expect(page.locator('[data-testid="date-filter-chip"]')).toBeVisible();
    const initialRowCount = await page.locator('[data-testid="transaction-row"]').count();
    expect(initialRowCount).toBeGreaterThan(0);

    // Step 2: Navigate to schedules
    await page.click('text=Schedules');
    await page.waitForLoadState('networkidle');

    // Step 3: Navigate back to account view
    await page.click('text=Accounts');
    await page.waitForLoadState('networkidle');

    // Step 4: Verify both filter results AND filter display are present
    const finalRowCount = await page.locator('[data-testid="transaction-row"]').count();
    
    // Filter results should be the same (data persistence)
    expect(finalRowCount).toBe(initialRowCount);
    
    // Filter display should be visible (UI persistence) - this was the bug
    await expect(page.locator('[data-testid="date-filter-chip"]')).toBeVisible();
    
    // Additional check: filter chip should show the selected date
    await expect(page.locator('[data-testid="date-filter-chip"]')).toContainText('2024-01-01');
  });

  test('multiple filters persist display after navigation', async ({ page }) => {
    // Apply multiple filters
    await page.click('[data-testid="filter-button"]');
    await page.click('text=Date');
    await page.click('text=After');
    await page.fill('[data-testid="date-input"]', '2024-01-01');
    await page.click('text=Apply');

    await page.click('[data-testid="filter-button"]');
    await page.click('text=Amount');
    await page.click('text=Greater than');
    await page.fill('[data-testid="amount-input"]', '100');
    await page.click('text=Apply');

    // Verify both filters are visible
    await expect(page.locator('[data-testid="date-filter-chip"]')).toBeVisible();
    await expect(page.locator('[data-testid="amount-filter-chip"]')).toBeVisible();

    const initialRowCount = await page.locator('[data-testid="transaction-row"]').count();

    // Navigate away and back
    await page.click('text=Schedules');
    await page.waitForLoadState('networkidle');
    await page.click('text=Accounts');
    await page.waitForLoadState('networkidle');

    // Verify both filter displays and results persist
    await expect(page.locator('[data-testid="date-filter-chip"]')).toBeVisible();
    await expect(page.locator('[data-testid="amount-filter-chip"]')).toBeVisible();
    
    const finalRowCount = await page.locator('[data-testid="transaction-row"]').count();
    expect(finalRowCount).toBe(initialRowCount);
  });

  test('filter display updates correctly after removing filters', async ({ page }) => {
    // Apply a filter
    await page.click('[data-testid="filter-button"]');
    await page.click('text=Date');
    await page.click('text=On');
    await page.fill('[data-testid="date-input"]', '2024-01-01');
    await page.click('text=Apply');

    // Verify filter is visible
    await expect(page.locator('[data-testid="date-filter-chip"]')).toBeVisible();

    // Navigate away and back
    await page.click('text=Schedules');
    await page.waitForLoadState('networkidle');
    await page.click('text=Accounts');
    await page.waitForLoadState('networkidle');

    // Remove the filter
    await page.click('[data-testid="date-filter-chip"] [data-testid="remove-filter"]');

    // Navigate away and back again
    await page.click('text=Schedules');
    await page.waitForLoadState('networkidle');
    await page.click('text=Accounts');
    await page.waitForLoadState('networkidle');

    // Verify filter display is gone and data is unfiltered
    await expect(page.locator('[data-testid="date-filter-chip"]')).not.toBeVisible();
    
    // Should show all transactions now
    const allRowsCount = await page.locator('[data-testid="transaction-row"]').count();
    expect(allRowsCount).toBeGreaterThan(0);
  });
});