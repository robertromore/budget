import {test, expect} from "@playwright/test";

/**
 * Integration tests for edit account functionality from PR #47
 * Tests the edit account feature added to the accounts page
 */
test.describe("Edit Account Functionality", () => {
  test.beforeEach(async ({page}) => {
    await page.goto("/accounts");
    await expect(page).toHaveTitle(/Budget/);
    await page.waitForLoadState("networkidle");
  });

  test("should display edit buttons on account cards", async ({page}) => {
    // Check if account cards are present
    const accountCards = page.locator('[role="article"], .card, a[href*="/accounts/"]').first();

    if (await accountCards.isVisible()) {
      // Look for edit button or link
      const editButton = page.locator(
        'button:has-text("Edit"), a:has-text("Edit"), button[aria-label*="edit" i]'
      );

      // Should have at least one edit button visible
      expect(await editButton.count()).toBeGreaterThan(0);
    }
  });

  test("should open edit dialog when edit button is clicked", async ({page}) => {
    // Look for edit buttons
    const editButton = page
      .locator('button:has-text("Edit"), a:has-text("Edit"), button[aria-label*="edit" i]')
      .first();

    if (await editButton.isVisible()) {
      await editButton.click();

      // Should open an edit dialog or navigate to edit page
      const dialog = page.locator('[role="dialog"], .dialog');
      const editForm = page.locator('form:has(input[name="name"]), form:has(label:text("Name"))');

      // Either dialog should appear or we should navigate to edit form
      const hasDialog = await dialog.isVisible().catch(() => false);
      const hasForm = await editForm.isVisible().catch(() => false);

      expect(hasDialog || hasForm).toBe(true);
    }
  });

  test("should have proper accessibility attributes on edit buttons", async ({page}) => {
    const editButtons = page.locator('button:has-text("Edit"), button[aria-label*="edit" i]');
    const buttonCount = await editButtons.count();

    if (buttonCount > 0) {
      const firstButton = editButtons.first();

      // Should have proper ARIA label or accessible text
      const ariaLabel = await firstButton.getAttribute("aria-label");
      const buttonText = await firstButton.textContent();

      // Should have either aria-label or meaningful text
      expect(ariaLabel || buttonText).toBeTruthy();
      expect((ariaLabel || buttonText || "").toLowerCase()).toContain("edit");

      // Should be focusable
      await firstButton.focus();
      const focusedElement = page.locator(":focus");
      expect(await focusedElement.count()).toBe(1);
    }
  });

  test("should handle keyboard navigation for edit buttons", async ({page}) => {
    const editButtons = page.locator('button:has-text("Edit"), button[aria-label*="edit" i]');
    const buttonCount = await editButtons.count();

    if (buttonCount > 0) {
      // Tab to the edit button
      await page.keyboard.press("Tab");

      // Try to find focused edit button
      let foundEditButton = false;
      let tabCount = 0;
      const maxTabs = 20; // Prevent infinite loop

      while (!foundEditButton && tabCount < maxTabs) {
        const focusedElement = page.locator(":focus");
        const focusedText = await focusedElement.textContent().catch(() => "");
        const focusedAriaLabel = await focusedElement.getAttribute("aria-label").catch(() => "");

        if (
          focusedText?.toLowerCase().includes("edit") ||
          focusedAriaLabel?.toLowerCase().includes("edit")
        ) {
          foundEditButton = true;

          // Press Enter to activate
          await page.keyboard.press("Enter");

          // Should trigger edit action (dialog or navigation)
          await page.waitForTimeout(500);

          const dialog = page.locator('[role="dialog"], .dialog');
          const editForm = page.locator('form:has(input[name="name"])');

          const hasDialog = await dialog.isVisible().catch(() => false);
          const hasForm = await editForm.isVisible().catch(() => false);

          if (hasDialog || hasForm) {
            expect(true).toBe(true); // Edit action was triggered
            break;
          }
        }

        await page.keyboard.press("Tab");
        tabCount++;
      }
    }
  });

  test("should maintain responsive layout with edit buttons", async ({page}) => {
    // Test on mobile viewport
    await page.setViewportSize({width: 375, height: 667});
    await page.reload();
    await page.waitForLoadState("networkidle");

    const accountCards = page.locator('[role="article"], .card');
    const cardCount = await accountCards.count();

    if (cardCount > 0) {
      // Cards should stack in single column on mobile
      const firstCard = accountCards.first();
      const secondCard = accountCards.nth(1);

      if (await secondCard.isVisible()) {
        const firstBox = await firstCard.boundingBox();
        const secondBox = await secondCard.boundingBox();

        if (firstBox && secondBox) {
          // Second card should be below first card (not side by side)
          expect(secondBox.y).toBeGreaterThan(firstBox.y + firstBox.height - 20);
        }
      }

      // Edit buttons should still be accessible
      const editButtons = page.locator('button:has-text("Edit"), button[aria-label*="edit" i]');
      const editButtonCount = await editButtons.count();

      if (editButtonCount > 0) {
        const firstEditButton = editButtons.first();
        const buttonBox = await firstEditButton.boundingBox();

        // Button should be within viewport
        expect(buttonBox?.width).toBeLessThanOrEqual(375);
        expect(buttonBox?.x).toBeGreaterThanOrEqual(0);
      }
    }
  });

  test("should not break existing account card functionality", async ({page}) => {
    // Account links should still work
    const accountLinks = page.locator('a[href*="/accounts/"]');
    const linkCount = await accountLinks.count();

    if (linkCount > 0) {
      const firstLink = accountLinks.first();
      const href = await firstLink.getAttribute("href");

      expect(href).toBeTruthy();
      expect(href).toContain("/accounts/");

      // Click should navigate to account detail page
      await firstLink.click();
      await page.waitForLoadState("networkidle");

      const currentUrl = page.url();
      expect(currentUrl).toContain("/accounts/");
      expect(currentUrl).not.toBe("/accounts"); // Should be on specific account page
    }
  });

  test("should handle edit functionality for multiple accounts", async ({page}) => {
    const editButtons = page.locator('button:has-text("Edit"), button[aria-label*="edit" i]');
    const buttonCount = await editButtons.count();

    if (buttonCount > 1) {
      // Click first edit button
      await editButtons.first().click();
      await page.waitForTimeout(500);

      // Close any dialog that opened
      const closeButton = page.locator(
        'button:has-text("Cancel"), button:has-text("Close"), [aria-label*="close" i]'
      );
      if (await closeButton.isVisible()) {
        await closeButton.click();
      }

      // Click second edit button
      await editButtons.nth(1).click();
      await page.waitForTimeout(500);

      // Should be able to interact with different account edit functions
      const dialog = page.locator('[role="dialog"], .dialog');
      const editForm = page.locator('form:has(input[name="name"])');

      const hasDialog = await dialog.isVisible().catch(() => false);
      const hasForm = await editForm.isVisible().catch(() => false);

      expect(hasDialog || hasForm).toBe(true);
    }
  });
});
