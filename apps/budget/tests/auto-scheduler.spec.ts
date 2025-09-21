import { test, expect } from '@playwright/test';

test.describe('Browser-Based Auto-Scheduler', () => {
  test('should automatically run auto-add when app loads', async ({ page }) => {
    // Listen for console messages to verify auto-scheduler runs
    const consoleMessages: string[] = [];
    page.on('console', msg => {
      if (msg.type() === 'log' && msg.text().includes('Auto-add')) {
        consoleMessages.push(msg.text());
      }
    });

    // Navigate to the app
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    // Wait for auto-scheduler to run (up to 5 seconds)
    await page.waitForFunction(() => {
      return window.localStorage.getItem('budget-app-last-auto-add-run') !== null;
    }, { timeout: 10000 });

    // Verify localStorage has today's date
    const today = new Date().toISOString().split('T')[0];
    const lastRun = await page.evaluate(() =>
      localStorage.getItem('budget-app-last-auto-add-run')
    );

    expect(lastRun).toBe(today);

    // Verify console shows auto-scheduler activity
    const hasAutoAddMessages = consoleMessages.some(msg =>
      msg.includes('Auto-add completed') ||
      msg.includes('already ran today') ||
      msg.includes('Running daily auto-add')
    );

    expect(hasAutoAddMessages).toBe(true);

    console.log('✅ Auto-scheduler ran automatically on app load');
    console.log(`✅ Last run date stored: ${lastRun}`);
    console.log(`✅ Console messages: ${consoleMessages.join(', ')}`);
  });

  test('should not run auto-add twice on same day', async ({ page }) => {
    // Set today's date in localStorage to simulate already ran
    const today = new Date().toISOString().split('T')[0];
    await page.goto('/');

    await page.evaluate((date) => {
      localStorage.setItem('budget-app-last-auto-add-run', date);
    }, today);

    // Listen for console messages
    const consoleMessages: string[] = [];
    page.on('console', msg => {
      if (msg.type() === 'log' && msg.text().includes('Auto-add')) {
        consoleMessages.push(msg.text());
      }
    });

    // Reload the page
    await page.reload();
    await page.waitForLoadState('networkidle');

    // Wait a few seconds to see if auto-add runs
    await page.waitForTimeout(3000);

    // Should see "already ran today" message
    const hasAlreadyRanMessage = consoleMessages.some(msg =>
      msg.includes('already ran today')
    );

    expect(hasAlreadyRanMessage).toBe(true);

    console.log('✅ Auto-scheduler correctly skipped duplicate run');
    console.log(`✅ Console messages: ${consoleMessages.join(', ')}`);
  });
});