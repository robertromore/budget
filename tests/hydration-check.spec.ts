import { test, expect } from '@playwright/test';

test.describe('Hydration Mismatch Detection', () => {
  test('should navigate to accounts/1 and check for hydration errors', async ({ page }) => {
    // Capture console messages to check for hydration warnings
    const consoleMessages: string[] = [];
    const hydrationErrors: string[] = [];
    
    page.on('console', (msg) => {
      const text = msg.text();
      consoleMessages.push(`[${msg.type()}] ${text}`);
      
      // Check for hydration-related error patterns
      if (
        text.includes('hydration') ||
        text.includes('Hydration') ||
        text.includes('mismatch') ||
        text.includes('server-rendered') ||
        text.includes('client-rendered') ||
        text.includes('Expected server HTML') ||
        text.includes('hydrating component') ||
        text.includes('Hydration completed but contains mismatches')
      ) {
        hydrationErrors.push(text);
      }
    });

    // Capture page errors
    const pageErrors: string[] = [];
    page.on('pageerror', (error) => {
      pageErrors.push(error.message);
    });

    // Navigate to the dev server instead of preview server
    const baseURL = 'http://localhost:5173';
    
    try {
      console.log('Navigating to accounts page...');
      await page.goto(`${baseURL}/accounts/1`, { 
        waitUntil: 'networkidle',
        timeout: 30000 
      });

      // Wait a moment for hydration to complete
      await page.waitForTimeout(2000);

      // Try to interact with the page to trigger any hydration issues
      await page.waitForLoadState('domcontentloaded');
      await page.waitForLoadState('networkidle');

      // Check if the page loaded successfully
      const title = await page.title();
      console.log(`Page title: ${title}`);

      // Log all console messages
      console.log('\n=== CONSOLE MESSAGES ===');
      consoleMessages.forEach(msg => console.log(msg));

      // Report hydration errors
      console.log('\n=== HYDRATION ERRORS ===');
      if (hydrationErrors.length === 0) {
        console.log('✅ No hydration mismatch errors detected');
      } else {
        console.log(`❌ Found ${hydrationErrors.length} hydration-related messages:`);
        hydrationErrors.forEach((error, index) => {
          console.log(`${index + 1}. ${error}`);
        });
      }

      // Report page errors
      console.log('\n=== PAGE ERRORS ===');
      if (pageErrors.length === 0) {
        console.log('✅ No JavaScript errors detected');
      } else {
        console.log(`❌ Found ${pageErrors.length} JavaScript errors:`);
        pageErrors.forEach((error, index) => {
          console.log(`${index + 1}. ${error}`);
        });
      }

      // Check if page rendered correctly
      const body = await page.textContent('body');
      if (body && body.length > 0) {
        console.log('✅ Page content rendered successfully');
      } else {
        console.log('❌ Page appears to be empty');
      }

      // Verify the page is accessible and not showing an error state
      const hasErrorText = await page.getByText('error', { ignoreCase: true }).count();
      const has404Text = await page.getByText('404', { ignoreCase: true }).count();
      
      if (hasErrorText === 0 && has404Text === 0) {
        console.log('✅ No error pages detected');
      } else {
        console.log('❌ Page may be showing error state');
      }

    } catch (error) {
      console.error(`❌ Navigation failed: ${error}`);
      throw error;
    }

    // The test passes if we don't find hydration errors
    expect(hydrationErrors.length).toBe(0);
  });
});