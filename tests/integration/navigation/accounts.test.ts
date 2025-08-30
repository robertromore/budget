import { test, expect } from "@playwright/test";
import { setupTestDb, seedTestData } from "../setup/test-db";

test.describe("Accounts Navigation Tests", () => {
  let testDb: Awaited<ReturnType<typeof setupTestDb>>;

  test.beforeEach(async ({ page }) => {
    // Setup test database
    testDb = await setupTestDb();
    await seedTestData(testDb);
    
    // Navigate to the application
    await page.goto("/");
  });

  test.afterEach(async () => {
    // Cleanup would happen here if needed
    // In-memory DB will be garbage collected
  });

  test.describe("Accounts Page Navigation", () => {
    test("should navigate to accounts page from main navigation", async ({ page }) => {
      // Click on accounts navigation link
      await page.click('[href="/accounts"]');
      
      // Wait for navigation and verify URL
      await expect(page).toHaveURL("/accounts");
      
      // Verify accounts page content is loaded
      await expect(page.getByRole("heading")).toContainText("Accounts");
    });

    test("should display accounts list on accounts page", async ({ page }) => {
      await page.goto("/accounts");
      
      // Should see accounts from test data
      await expect(page.getByText("Test Checking")).toBeVisible();
      await expect(page.getByText("Test Savings")).toBeVisible();
      
      // Should see account balances or transaction counts
      await expect(page.locator("[data-testid='account-item']")).toHaveCount(2);
    });

    test("should handle empty accounts page", async ({ page }) => {
      // Clear test data first by setting up empty DB
      testDb = await setupTestDb(); // Fresh DB without seeding
      
      await page.goto("/accounts");
      
      // Should show empty state or create account prompt
      await expect(page.getByText("No accounts found") || page.getByText("Create your first account")).toBeVisible();
    });

    test("should show loading state during navigation", async ({ page, context }) => {
      // Slow down network to see loading state
      await context.route("**/*", route => {
        setTimeout(() => route.continue(), 100);
      });
      
      const navigationPromise = page.click('[href="/accounts"]');
      
      // Should show loading indicator
      await expect(page.locator("[data-testid='loading']") || page.locator(".loading")).toBeVisible();
      
      await navigationPromise;
      await expect(page).toHaveURL("/accounts");
    });
  });

  test.describe("Individual Account Page Navigation", () => {
    test("should navigate to individual account page", async ({ page }) => {
      await page.goto("/accounts");
      
      // Click on the first account
      await page.click("[data-testid='account-item']");
      
      // Should navigate to account detail page
      await expect(page).toHaveURL(/\/accounts\/\d+/);
      
      // Should display account details
      await expect(page.getByText("Test Checking") || page.getByText("Test Savings")).toBeVisible();
    });

    test("should show account transactions on individual page", async ({ page }) => {
      await page.goto("/accounts");
      await page.click("[data-testid='account-item']");
      
      // Should display transactions table
      await expect(page.locator("[data-testid='transactions-table']") || page.locator("table")).toBeVisible();
      
      // Should show transaction data
      await expect(page.getByText("Test transaction")).toBeVisible();
    });

    test("should handle non-existent account page", async ({ page }) => {
      await page.goto("/accounts/99999");
      
      // Should show 404 or error message
      await expect(page.getByText("Account not found") || page.getByText("404")).toBeVisible();
    });

    test("should allow navigation back to accounts list", async ({ page }) => {
      await page.goto("/accounts");
      await page.click("[data-testid='account-item']");
      
      // Click back button or breadcrumb
      await page.click("[data-testid='back-to-accounts']") || 
            page.click("a[href='/accounts']") ||
            page.goBack();
      
      // Should be back on accounts page
      await expect(page).toHaveURL("/accounts");
    });

    test("should maintain account context during navigation", async ({ page }) => {
      await page.goto("/accounts");
      
      // Remember the account name
      const accountName = await page.locator("[data-testid='account-item']").first().textContent();
      
      await page.click("[data-testid='account-item']");
      
      // Account name should be displayed on detail page
      await expect(page.getByText(accountName!)).toBeVisible();
    });
  });

  test.describe("Account Management Navigation", () => {
    test("should open add account dialog", async ({ page }) => {
      await page.goto("/accounts");
      
      // Click add account button
      await page.click("[data-testid='add-account-button']") || 
            page.click("button:has-text('Add Account')") ||
            page.click("button:has-text('New Account')");
      
      // Should open dialog or modal
      await expect(page.locator("[data-testid='add-account-dialog']") || 
                  page.locator("[role='dialog']")).toBeVisible();
      
      // Should have form fields
      await expect(page.locator("input[name='name']")).toBeVisible();
    });

    test("should open edit account dialog from account page", async ({ page }) => {
      await page.goto("/accounts");
      await page.click("[data-testid='account-item']");
      
      // Click edit button
      await page.click("[data-testid='edit-account-button']") ||
            page.click("button:has-text('Edit')");
      
      // Should open edit dialog
      await expect(page.locator("[data-testid='edit-account-dialog']") ||
                  page.locator("[role='dialog']")).toBeVisible();
      
      // Form should be pre-filled with account data
      await expect(page.locator("input[name='name']")).toHaveValue(/Test (Checking|Savings)/);
    });

    test("should show delete confirmation dialog", async ({ page }) => {
      await page.goto("/accounts");
      await page.click("[data-testid='account-item']");
      
      // Click delete button
      await page.click("[data-testid='delete-account-button']") ||
            page.click("button:has-text('Delete')");
      
      // Should show confirmation dialog
      await expect(page.locator("[data-testid='delete-account-dialog']") ||
                  page.getByText("Are you sure")).toBeVisible();
      
      // Should have confirm and cancel buttons
      await expect(page.locator("button:has-text('Delete')") ||
                  page.locator("button:has-text('Confirm')")).toBeVisible();
      await expect(page.locator("button:has-text('Cancel')")).toBeVisible();
    });

    test("should close dialogs when cancelled", async ({ page }) => {
      await page.goto("/accounts");
      
      // Open add account dialog
      await page.click("[data-testid='add-account-button']") || 
            page.click("button:has-text('Add Account')");
      
      await expect(page.locator("[role='dialog']")).toBeVisible();
      
      // Click cancel or close
      await page.click("button:has-text('Cancel')") ||
            page.click("[data-testid='close-dialog']") ||
            page.keyboard.press("Escape");
      
      // Dialog should be closed
      await expect(page.locator("[role='dialog']")).not.toBeVisible();
    });
  });

  test.describe("Responsive Navigation", () => {
    test("should work on mobile viewport", async ({ page }) => {
      await page.setViewportSize({ width: 375, height: 667 });
      await page.goto("/");
      
      // Mobile navigation might be behind hamburger menu
      const accountsLink = page.locator('[href="/accounts"]');
      if (await accountsLink.isVisible()) {
        await accountsLink.click();
      } else {
        // Open mobile menu
        await page.click("[data-testid='mobile-menu-toggle']") ||
              page.click("button[aria-label*='menu']");
        await page.click('[href="/accounts"]');
      }
      
      await expect(page).toHaveURL("/accounts");
      await expect(page.getByText("Test Checking")).toBeVisible();
    });

    test("should handle tablet viewport", async ({ page }) => {
      await page.setViewportSize({ width: 768, height: 1024 });
      await page.goto("/accounts");
      
      // Should display accounts in tablet-friendly layout
      await expect(page.locator("[data-testid='account-item']")).toHaveCount(2);
      await expect(page.getByText("Test Checking")).toBeVisible();
    });
  });

  test.describe("Accessibility Navigation", () => {
    test("should be keyboard navigable", async ({ page }) => {
      await page.goto("/");
      
      // Tab to accounts navigation
      await page.keyboard.press("Tab");
      // Continue tabbing until accounts link is focused
      let attempts = 0;
      while (attempts < 10) {
        const focused = await page.evaluate(() => document.activeElement?.getAttribute('href'));
        if (focused === "/accounts") {
          break;
        }
        await page.keyboard.press("Tab");
        attempts++;
      }
      
      // Press Enter to navigate
      await page.keyboard.press("Enter");
      await expect(page).toHaveURL("/accounts");
    });

    test("should have proper ARIA labels", async ({ page }) => {
      await page.goto("/accounts");
      
      // Check for proper ARIA labels
      await expect(page.locator("[aria-label*='Accounts']") ||
                  page.locator("h1")).toBeVisible();
      
      // Account items should have proper accessibility labels
      const accountItems = page.locator("[data-testid='account-item']");
      await expect(accountItems.first()).toHaveAttribute("role", "button");
    });

    test("should announce page changes to screen readers", async ({ page }) => {
      await page.goto("/");
      
      // Navigate to accounts
      await page.click('[href="/accounts"]');
      
      // Check for live region updates or title changes
      await expect(page).toHaveTitle(/Accounts/);
    });
  });
});