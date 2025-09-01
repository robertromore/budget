import { test, expect } from '@playwright/test';

/**
 * Integration tests for input component width fixes from PR #44
 * Tests that input components in transaction dialog have proper widths
 */
test.describe('Input Component Widths', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/accounts');
    await expect(page).toHaveTitle(/Budget/);
    
    // Navigate to first account
    await page.click('a[href*="/accounts/"]');
    await page.waitForLoadState('networkidle');
    
    // Open add transaction dialog
    await page.click('button:has-text("Add")');
    await page.waitForSelector('[role="dialog"], .dialog', { state: 'visible', timeout: 5000 });
  });

  test('should have proper width for numeric input components', async ({ page }) => {
    // Look for amount input field (numeric-input component)
    const amountInput = page.locator('input[type="text"]:near(label:has-text("Amount"))').first();
    
    if (await amountInput.isVisible()) {
      // Check that the input has reasonable width
      const boundingBox = await amountInput.boundingBox();
      expect(boundingBox?.width).toBeGreaterThan(100); // Should be wider than 100px
      expect(boundingBox?.width).toBeLessThan(300); // But not excessively wide
      
      // Check for proper CSS classes that control width
      const inputClass = await amountInput.getAttribute('class');
      expect(inputClass).toBeTruthy();
    }
  });

  test('should have proper width for entity input components', async ({ page }) => {
    // Look for category/payee input fields (entity-input components)
    const entityInputs = page.locator('button:near(label:has-text("Category")), button:near(label:has-text("Payee"))');
    
    const count = await entityInputs.count();
    if (count > 0) {
      const firstEntityInput = entityInputs.first();
      
      // Check that the input has reasonable width
      const boundingBox = await firstEntityInput.boundingBox();
      expect(boundingBox?.width).toBeGreaterThan(150); // Should be wider than 150px
      expect(boundingBox?.width).toBeLessThan(400); // But not excessively wide
      
      // Check for proper CSS classes
      const inputClass = await firstEntityInput.getAttribute('class');
      expect(inputClass).toBeTruthy();
    }
  });

  test('should have consistent widths across different input types', async ({ page }) => {
    // Get all input-related elements in the dialog
    const inputElements = page.locator('input, button:has([role="combobox"]), [role="combobox"]');
    
    const inputCount = await inputElements.count();
    const widths: number[] = [];
    
    // Collect widths of visible input elements
    for (let i = 0; i < Math.min(inputCount, 5); i++) {
      const element = inputElements.nth(i);
      if (await element.isVisible()) {
        const boundingBox = await element.boundingBox();
        if (boundingBox?.width) {
          widths.push(boundingBox.width);
        }
      }
    }
    
    // Should have collected some widths
    expect(widths.length).toBeGreaterThan(0);
    
    // All widths should be reasonable (not too small or too large)
    widths.forEach(width => {
      expect(width).toBeGreaterThan(50); // Not too narrow
      expect(width).toBeLessThan(500); // Not too wide
    });
  });

  test('should not have layout overflow in transaction dialog', async ({ page }) => {
    // Check that the dialog content fits within the viewport
    const dialog = page.locator('[role="dialog"], .dialog').first();
    
    if (await dialog.isVisible()) {
      const dialogBox = await dialog.boundingBox();
      const viewportSize = page.viewportSize();
      
      if (dialogBox && viewportSize) {
        // Dialog should not overflow the viewport
        expect(dialogBox.width).toBeLessThanOrEqual(viewportSize.width);
        expect(dialogBox.height).toBeLessThanOrEqual(viewportSize.height);
        
        // Dialog should not be positioned outside viewport
        expect(dialogBox.x).toBeGreaterThanOrEqual(0);
        expect(dialogBox.y).toBeGreaterThanOrEqual(0);
      }
    }
  });

  test('should maintain proper spacing between form fields', async ({ page }) => {
    // Check that form fields have appropriate spacing
    const formFields = page.locator('.dialog label, .dialog [role="group"]');
    const fieldCount = await formFields.count();
    
    if (fieldCount > 1) {
      // Get positions of first two fields
      const firstField = formFields.first();
      const secondField = formFields.nth(1);
      
      const firstBox = await firstField.boundingBox();
      const secondBox = await secondField.boundingBox();
      
      if (firstBox && secondBox) {
        // Calculate spacing between fields
        const spacing = secondBox.y - (firstBox.y + firstBox.height);
        
        // Should have reasonable spacing (not cramped or too spread out)
        expect(spacing).toBeGreaterThanOrEqual(8); // At least 8px spacing
        expect(spacing).toBeLessThanOrEqual(50); // Not more than 50px spacing
      }
    }
  });

  test('should handle long content without breaking layout', async ({ page }) => {
    // Try to input long text/values to test layout stability
    const textInputs = page.locator('input[type="text"], textarea');
    const inputCount = await textInputs.count();
    
    if (inputCount > 0) {
      const firstInput = textInputs.first();
      const longText = 'A'.repeat(100); // Very long text
      
      await firstInput.fill(longText);
      await page.waitForTimeout(500); // Allow layout to settle
      
      // Dialog should still be visible and functional
      const dialog = page.locator('[role="dialog"], .dialog').first();
      await expect(dialog).toBeVisible();
      
      // Input should not break the layout
      const inputBox = await firstInput.boundingBox();
      const dialogBox = await dialog.boundingBox();
      
      if (inputBox && dialogBox) {
        // Input should not extend beyond dialog boundaries
        expect(inputBox.x + inputBox.width).toBeLessThanOrEqual(dialogBox.x + dialogBox.width + 10);
      }
    }
  });
});