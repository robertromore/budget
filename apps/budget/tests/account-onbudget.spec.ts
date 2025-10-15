import { test, expect } from '@playwright/test';

test.describe('Account onBudget setting', () => {
  test('should persist onBudget=false when saving account', async ({ page }) => {
    // Navigate to accounts page
    await page.goto('http://localhost:5173/accounts');

    // Wait for accounts to load
    await page.waitForLoadState('networkidle');

    // Find the first account link (or create one if needed)
    const accountLink = page.locator('a[href*="/accounts/"][href*="/edit"]').first();

    if (await accountLink.count() === 0) {
      test.skip('No accounts available for testing');
      return;
    }

    await accountLink.click();

    // Wait for edit page to load
    await page.waitForLoadState('networkidle');

    // Find the onBudget switch
    const onBudgetSwitch = page.locator('button[role="switch"]').filter({ hasText: /budget/i }).or(
      page.locator('input[name="onBudget"]').locator('..')
    );

    // Check current state
    const switchButton = page.locator('button[role="switch"]');
    let isCurrentlyOn = await switchButton.getAttribute('data-state') === 'checked';

    console.log('Current onBudget state:', isCurrentlyOn);

    // If it's on, turn it off
    if (isCurrentlyOn) {
      await switchButton.click();
      await page.waitForTimeout(500);
    }

    // Verify it's off
    const stateAfterClick = await switchButton.getAttribute('data-state');
    console.log('State after click:', stateAfterClick);
    expect(stateAfterClick).toBe('unchecked');

    // Save the form
    const saveButton = page.locator('button[type="submit"]').filter({ hasText: /save/i });
    await saveButton.click();

    // Wait for navigation/success
    await page.waitForTimeout(2000);

    // Navigate back to edit page
    await page.goto(page.url().replace(/\/(edit)?$/, '/edit'));
    await page.waitForLoadState('networkidle');

    // Check if onBudget is still false
    const finalState = await page.locator('button[role="switch"]').getAttribute('data-state');
    console.log('Final state after reload:', finalState);

    // This should be 'unchecked' but the bug makes it 'checked'
    expect(finalState).toBe('unchecked');
  });

  test('should inspect form data on submit', async ({ page }) => {
    // Navigate to accounts page
    await page.goto('http://localhost:5173/accounts');
    await page.waitForLoadState('networkidle');

    // Find first edit link
    const accountLink = page.locator('a[href*="/accounts/"][href*="/edit"]').first();

    if (await accountLink.count() === 0) {
      test.skip('No accounts available for testing');
      return;
    }

    await accountLink.click();
    await page.waitForLoadState('networkidle');

    // Set up form submission listener
    await page.route('**/*', async (route) => {
      if (route.request().method() === 'POST') {
        const postData = route.request().postData();
        console.log('Form submission data:', postData);
      }
      await route.continue();
    });

    // Turn off the switch
    const switchButton = page.locator('button[role="switch"]');
    await switchButton.click();
    await page.waitForTimeout(500);

    // Check hidden input value
    const hiddenInput = page.locator('input[name="onBudget"][type="hidden"]');
    const hiddenValue = await hiddenInput.getAttribute('value');
    console.log('Hidden input value:', hiddenValue);

    // Save
    const saveButton = page.locator('button[type="submit"]').filter({ hasText: /save/i });
    await saveButton.click();

    await page.waitForTimeout(2000);
  });
});
