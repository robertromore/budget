import { test, expect } from '@playwright/test';

test.describe('Account Sidebar Sorting', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/accounts');
    await page.waitForLoadState('networkidle');
  });

  test('sort dropdown appears next to add account button', async ({ page }) => {
    // Check that sort dropdown button exists
    await expect(page.locator('[title="Sort accounts"]')).toBeVisible();
    
    // Check that it's positioned near the "Add Account" button
    await expect(page.locator('[title="Add Account"]')).toBeVisible();
    
    // Both buttons should be in the same container
    const container = page.locator('div.flex.items-center.gap-1');
    await expect(container.locator('[title="Sort accounts"]')).toBeVisible();
    await expect(container.locator('[title="Add Account"]')).toBeVisible();
  });

  test('sort dropdown opens with all sort options', async ({ page }) => {
    // Click the sort dropdown
    await page.click('[title="Sort accounts"]');
    
    // Check that dropdown content appears
    await expect(page.locator('text=Sort accounts by')).toBeVisible();
    
    // Check all sort options are present
    await expect(page.locator('text=Name')).toBeVisible();
    await expect(page.locator('text=Balance')).toBeVisible();
    await expect(page.locator('text=Date Opened')).toBeVisible();
    await expect(page.locator('text=Status')).toBeVisible();
    await expect(page.locator('text=Date Created')).toBeVisible();
  });

  test('can select different sort options', async ({ page }) => {
    // Initial state should show "Name ↑" (ascending)
    await expect(page.locator('[title="Sort accounts"]')).toContainText('Name ↑');
    
    // Open sort dropdown
    await page.click('[title="Sort accounts"]');
    
    // Select Balance sorting
    await page.hover('text=Balance');
    await page.click('text=Descending');
    
    // Dropdown should close and show new sort
    await expect(page.locator('[title="Sort accounts"]')).toContainText('Balance ↓');
    
    // Open dropdown again
    await page.click('[title="Sort accounts"]');
    
    // Balance descending should be selected (check mark visible)
    await page.hover('text=Balance');
    const balanceDescending = page.locator('text=Descending').first();
    await expect(balanceDescending.locator('..').locator('[data-testid="check-icon"]')).toBeVisible();
  });

  test('account list reorders when sort changes', async ({ page }) => {
    // Get initial account order (should be name ascending)
    const initialAccounts = await page.locator('[data-testid="account-name"]').allTextContents();
    expect(initialAccounts.length).toBeGreaterThan(0);
    
    // Change sort to name descending
    await page.click('[title="Sort accounts"]');
    await page.hover('text=Name');
    await page.click('text=Descending');
    
    // Wait for reorder
    await page.waitForTimeout(100);
    
    // Get new account order
    const newAccounts = await page.locator('[data-testid="account-name"]').allTextContents();
    
    // Order should be different (reversed for name sort)
    expect(newAccounts).not.toEqual(initialAccounts);
    expect(newAccounts).toEqual(initialAccounts.reverse());
  });

  test('sort preference persists across page reloads', async ({ page }) => {
    // Change sort to balance descending
    await page.click('[title="Sort accounts"]');
    await page.hover('text=Balance');
    await page.click('text=Descending');
    
    // Verify the sort is applied
    await expect(page.locator('[title="Sort accounts"]')).toContainText('Balance ↓');
    
    // Reload the page
    await page.reload();
    await page.waitForLoadState('networkidle');
    
    // Sort preference should persist
    await expect(page.locator('[title="Sort accounts"]')).toContainText('Balance ↓');
    
    // Open dropdown to verify selection
    await page.click('[title="Sort accounts"]');
    await page.hover('text=Balance');
    const balanceDescending = page.locator('text=Descending').first();
    await expect(balanceDescending.locator('..').locator('[data-testid="check-icon"]')).toBeVisible();
  });

  test('sort preference persists across navigation', async ({ page }) => {
    // Change sort to date opened ascending
    await page.click('[title="Sort accounts"]');
    await page.hover('text=Date Opened');
    await page.click('text=Ascending');
    
    // Verify the sort is applied
    await expect(page.locator('[title="Sort accounts"]')).toContainText('Date Opened ↑');
    
    // Navigate away and back
    await page.click('text=Schedules');
    await page.waitForLoadState('networkidle');
    await page.click('text=Accounts');
    await page.waitForLoadState('networkidle');
    
    // Sort preference should persist
    await expect(page.locator('[title="Sort accounts"]')).toContainText('Date Opened ↑');
  });

  test('sort dropdown is accessible via keyboard', async ({ page }) => {
    // Focus on sort dropdown via keyboard navigation
    await page.keyboard.press('Tab');
    const sortButton = page.locator('[title="Sort accounts"]');
    await expect(sortButton).toBeFocused();
    
    // Open dropdown with Enter key
    await page.keyboard.press('Enter');
    await expect(page.locator('text=Sort accounts by')).toBeVisible();
    
    // Navigate through options with arrow keys
    await page.keyboard.press('ArrowDown');
    await page.keyboard.press('ArrowRight'); // Open submenu
    
    // Select option with Enter
    await page.keyboard.press('Enter');
    
    // Dropdown should close
    await expect(page.locator('text=Sort accounts by')).not.toBeVisible();
  });

  test('sort indicators are visually correct', async ({ page }) => {
    // Test ascending indicator
    await page.click('[title="Sort accounts"]');
    await page.hover('text=Name');
    await page.click('text=Ascending');
    await expect(page.locator('[title="Sort accounts"]')).toContainText('↑');
    
    // Test descending indicator  
    await page.click('[title="Sort accounts"]');
    await page.hover('text=Name');
    await page.click('text=Descending');
    await expect(page.locator('[title="Sort accounts"]')).toContainText('↓');
  });

  test('sort works with different account states', async ({ page }) => {
    // Test that sorting works with active accounts
    await page.click('[title="Sort accounts"]');
    await page.hover('text=Status');
    await page.click('text=Ascending');
    
    // Active accounts should appear first
    const firstAccount = page.locator('[data-testid="account-name"]').first();
    const firstAccountStatus = await firstAccount.locator('..').locator('[data-testid="account-status"]').textContent();
    expect(firstAccountStatus).toContain('Active');
    
    // Test descending (closed first)
    await page.click('[title="Sort accounts"]');
    await page.hover('text=Status');
    await page.click('text=Descending');
    
    // If there are closed accounts, they should appear first
    const accounts = await page.locator('[data-testid="account-name"]').count();
    if (accounts > 0) {
      const sortedFirstAccount = page.locator('[data-testid="account-name"]').first();
      // This test assumes there might be closed accounts
    }
  });
});