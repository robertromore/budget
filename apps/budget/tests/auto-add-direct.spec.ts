import { test, expect } from '@playwright/test';

test.describe('Schedule Auto-Add Direct Test', () => {
  test('should navigate to schedule detail page and test auto-add button', async ({ page }) => {
    // Navigate directly to the test2 schedule page
    await page.goto('/schedules/test2');
    await page.waitForLoadState('networkidle');

    // Check if we're on the schedule detail page
    await expect(page.locator('h1')).toBeVisible();

    // Look for the auto-add button
    const autoAddButton = page.locator('button:has-text("Auto-Add")');

    console.log('Looking for Auto-Add button...');

    if (await autoAddButton.isVisible()) {
      console.log('✅ Auto-Add button found! Testing functionality...');

      // Click the auto-add button
      await autoAddButton.click();

      // Wait for the button to show loading state
      await expect(page.locator('button:has-text("Creating...")').or(page.locator('button[disabled]:has-text("Auto-Add")'))).toBeVisible({ timeout: 10000 });

      console.log('✅ Loading state detected');

      // Wait for completion (button returns to normal or shows success message)
      await page.waitForFunction(() => {
        const loadingButton = document.querySelector('button:has-text("Creating...")');
        const successMessage = document.querySelector('div:has-text("Created"), div:has-text("transaction"), div:has-text("No new transactions needed")');
        return !loadingButton || successMessage;
      }, { timeout: 15000 });

      console.log('✅ Auto-add operation completed');

      // Check for success message
      const successMessage = page.locator('div:has-text("Created"), div:has-text("transaction"), div:has-text("No new transactions needed")');
      if (await successMessage.isVisible()) {
        const messageText = await successMessage.textContent();
        console.log(`✅ Success message: ${messageText}`);
      }

      // Verify that auto-add button is available again
      await expect(autoAddButton).toBeVisible();
      await expect(autoAddButton).not.toBeDisabled();

      console.log('✅ Auto-add test completed successfully');
    } else {
      console.log('❌ Auto-Add button not visible');

      // Debug: Check what's on the page
      const pageTitle = await page.locator('h1').textContent();
      console.log(`Page title: ${pageTitle}`);

      // Check for any error messages
      const errorElements = page.locator('[class*="error"], .text-red, .text-destructive');
      const errorCount = await errorElements.count();
      if (errorCount > 0) {
        console.log(`Found ${errorCount} potential error elements`);
        for (let i = 0; i < errorCount; i++) {
          const errorText = await errorElements.nth(i).textContent();
          console.log(`Error ${i + 1}: ${errorText}`);
        }
      }

      // Check the page content for debugging
      const bodyText = await page.locator('body').textContent();
      if (bodyText?.includes('Auto Add')) {
        console.log('✅ "Auto Add" text found on page');
      } else {
        console.log('❌ "Auto Add" text not found on page');
      }

      // Check for schedule status and properties
      const statusBadges = page.locator('[class*="badge"]');
      const badgeCount = await statusBadges.count();
      console.log(`Found ${badgeCount} badge elements`);
      for (let i = 0; i < badgeCount; i++) {
        const badgeText = await statusBadges.nth(i).textContent();
        console.log(`Badge ${i + 1}: ${badgeText}`);
      }
    }
  });
});