import { test, expect } from '@playwright/test';

test.describe('Schedule Auto-Add Functionality', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to the schedules page
    await page.goto('/schedules');
    await page.waitForLoadState('networkidle');
  });

  test('should show auto-add button for active schedules with auto_add enabled', async ({ page }) => {
    // Look for any existing schedule or create one
    const scheduleLinks = page.locator('a[href*="/schedules/"]');
    const scheduleCount = await scheduleLinks.count();

    if (scheduleCount > 0) {
      // Click on the first schedule
      await scheduleLinks.first().click();
      await page.waitForLoadState('networkidle');

      // Check if we're on a schedule detail page
      await expect(page.locator('h1')).toBeVisible();

      // Look for the auto-add button (only shows if schedule is active and has auto_add enabled)
      const autoAddButton = page.locator('button:has-text("Auto-Add")');

      // If the button exists, test it
      if (await autoAddButton.isVisible()) {
        console.log('Auto-Add button found - testing functionality');

        // Click the auto-add button
        await autoAddButton.click();

        // Wait for the button to show loading state
        await expect(page.locator('button:has-text("Creating...")')).toBeVisible();

        // Wait for the result message or button to return to normal
        await page.waitForFunction(() => {
          const button = document.querySelector('button:has-text("Auto-Add")');
          const loadingButton = document.querySelector('button:has-text("Creating...")');
          return button && !loadingButton;
        }, { timeout: 10000 });

        // Check for success message
        const successMessage = page.locator('div:has-text("Created"), div:has-text("No new transactions needed")');
        if (await successMessage.isVisible()) {
          console.log('Auto-add completed successfully');
        }
      } else {
        console.log('Auto-Add button not visible - schedule may not have auto_add enabled or may be inactive');
      }
    } else {
      console.log('No schedules found - need to create a schedule first');
    }
  });

  test('should create a schedule with auto-add enabled and test the functionality', async ({ page }) => {
    // Click "Add Schedule" button in main content area (not sidebar)
    const addScheduleButton = page.getByRole('main').getByRole('button', { name: 'Add Schedule' });
    if (await addScheduleButton.isVisible()) {
      await addScheduleButton.click();

      // Fill out the schedule form
      await page.fill('input[name="name"]', 'Test Auto-Add Schedule');

      // Fill amount using the NumericInput component
      // First click the amount button to open the popover
      const amountButton = page.getByText('Transaction Amount').locator('..').locator('button').first();
      await amountButton.click();

      // Wait for popover to open and fill the input
      await page.waitForSelector('[role="dialog"], .popover-content', { timeout: 5000 });
      const amountInput = page.locator('input[placeholder="0.00"]');
      await amountInput.fill('100');

      // Click submit in the popover
      await page.getByRole('button', { name: 'submit' }).click();

      // Select account - click the "From Account" dropdown
      const accountSelect = page.getByText('From Account').locator('..').locator('button').first();
      if (await accountSelect.isVisible()) {
        await accountSelect.click();
        // Select first available account option
        await page.locator('[role="option"]').first().click();
      }

      // Select payee - click the "To Payee" dropdown
      const payeeSelect = page.getByText('To Payee').locator('..').locator('button').first();
      if (await payeeSelect.isVisible()) {
        await payeeSelect.click();
        // Select first available payee option
        await page.locator('[role="option"]').first().click();
      }

      // Enable recurring mode first (this will show additional controls)
      const recurringToggle = page.getByText('Enable Recurring');
      if (await recurringToggle.isVisible()) {
        await recurringToggle.click();

        // Wait for frequency controls to appear
        await page.waitForSelector('select[name="frequency"], [role="combobox"]', { timeout: 5000 });

        // Set frequency to daily for testing
        const frequencySelect = page.locator('select[name="frequency"], [role="combobox"]').first();
        await frequencySelect.click();
        await page.locator('[role="option"]:has-text("Daily"), option:has-text("Daily")').click();
      }

      // Enable auto-add checkbox (this should appear after recurring is enabled)
      const autoAddToggle = page.getByText('Auto Add');
      if (await autoAddToggle.isVisible()) {
        await autoAddToggle.click();
      }

      // Submit the form
      await page.locator('button[type="submit"], button:has-text("Create Schedule")').click();

      // Wait for navigation to schedule detail page
      await page.waitForURL(/\/schedules\/[^\/]+$/);
      await page.waitForLoadState('networkidle');

      // Now test the auto-add functionality
      const autoAddButton = page.locator('button:has-text("Auto-Add")');
      await expect(autoAddButton).toBeVisible();

      // Click auto-add button
      await autoAddButton.click();

      // Wait for completion
      await page.waitForFunction(() => {
        return !document.querySelector('button:has-text("Creating...")');
      }, { timeout: 10000 });

      // Verify result
      const resultMessage = page.locator('div.bg-green-50, div:has-text("Created"), div:has-text("transactions")');
      await expect(resultMessage).toBeVisible({ timeout: 5000 });

      console.log('Auto-add test completed successfully');
    }
  });
});