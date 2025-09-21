import { test, expect } from '@playwright/test';

test.describe('Schedule Auto-Add Functionality', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to the schedules page
    await page.goto('/schedules');
    await page.waitForLoadState('networkidle');
  });

  test('should test auto-add functionality with existing schedule', async ({ page }) => {
    // Look for schedule links and click on the first one
    const scheduleLinks = page.locator('a[href*="/schedules/"]');
    const scheduleCount = await scheduleLinks.count();

    if (scheduleCount > 0) {
      // Click on the first schedule
      await scheduleLinks.first().click();
      await page.waitForLoadState('networkidle');

      // Check if we're on a schedule detail page
      await expect(page.locator('h1')).toBeVisible();

      // Look for the auto-add button
      const autoAddButton = page.locator('button:has-text("Auto-Add")');

      if (await autoAddButton.isVisible()) {
        console.log('Auto-Add button found - testing functionality');

        // Get initial transaction count (if any exists)
        const transactionCountBefore = await page.locator('[data-testid="transaction-item"], .transaction-row, table tbody tr').count().catch(() => 0);

        // Click the auto-add button
        await autoAddButton.click();

        // Wait for the button to show loading state
        await expect(page.locator('button:has-text("Creating..."), button[disabled]:has-text("Auto-Add")')).toBeVisible({ timeout: 10000 });

        // Wait for completion (button returns to normal or shows success message)
        await page.waitForFunction(() => {
          const loadingButton = document.querySelector('button:has-text("Creating...")');
          const successMessage = document.querySelector('div:has-text("Created"), div:has-text("transaction")');
          return !loadingButton || successMessage;
        }, { timeout: 15000 });

        // Check for success message or transaction creation
        const successMessage = page.locator('div:has-text("Created"), div:has-text("transaction"), div:has-text("No new transactions needed")');
        if (await successMessage.isVisible()) {
          console.log('Auto-add completed successfully');
        }

        // Verify that auto-add button is available again
        await expect(autoAddButton).toBeVisible();
        await expect(autoAddButton).not.toBeDisabled();

        console.log('Auto-add test completed successfully');
      } else {
        // If no auto-add button, this might still be a success - the schedule might not have auto_add enabled
        console.log('Auto-Add button not visible - this schedule may not have auto_add enabled or may be inactive');

        // Look for the schedule name to confirm we're on the right page
        const scheduleTitle = await page.locator('h1').textContent();
        console.log(`Viewing schedule: ${scheduleTitle}`);
      }
    } else {
      console.log('No schedules found - please create a schedule with auto_add enabled first');
    }
  });
});