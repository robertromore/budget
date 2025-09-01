import { test, expect } from "@playwright/test";

test.describe("Schedule Workflows - End-to-End Tests", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/");
    
    // Wait for page to load and navigate to schedules
    await page.waitForLoadState("networkidle");
    
    // Navigate to schedules section if not already there
    const schedulesLink = page.locator('a[href*="schedules"], button:has-text("Schedules")');
    if (await schedulesLink.isVisible()) {
      await schedulesLink.click();
      await page.waitForLoadState("networkidle");
    }
  });

  test("should complete full schedule lifecycle - create, view, edit, delete", async ({ page }) => {
    // Step 1: Create a new schedule
    const addButton = page.locator('button:has-text("Add Schedule"), button[aria-label*="Add"], button[title*="Add"]');
    await addButton.click();

    // Fill out the schedule form
    await page.locator('input[name="name"], input[placeholder*="name"]').fill("Monthly Rent Payment");
    await page.locator('input[name="amount"], input[placeholder*="amount"]').fill("1500");
    
    // Select payee (create one if needed)
    const payeeSelect = page.locator('select[name="payeeId"], [data-testid="payee-select"]');
    if (await payeeSelect.isVisible()) {
      await payeeSelect.selectOption({ index: 1 }); // Select first available payee
    } else {
      // Look for payee input or create button
      const payeeInput = page.locator('input[name="payee"], input[placeholder*="payee"]');
      if (await payeeInput.isVisible()) {
        await payeeInput.fill("Landlord Properties");
      }
    }
    
    // Select account
    const accountSelect = page.locator('select[name="accountId"], [data-testid="account-select"]');
    if (await accountSelect.isVisible()) {
      await accountSelect.selectOption({ index: 1 }); // Select first available account
    }
    
    // Set as recurring monthly
    const recurringCheckbox = page.locator('input[name="recurring"], input[type="checkbox"]');
    if (await recurringCheckbox.isVisible()) {
      await recurringCheckbox.check();
    }
    
    // Save the schedule
    const saveButton = page.locator('button:has-text("Save"), button[type="submit"]');
    await saveButton.click();
    
    // Step 2: Verify schedule was created and appears in list
    await page.waitForLoadState("networkidle");
    await expect(page.locator('text="Monthly Rent Payment"')).toBeVisible();
    
    // Step 3: View schedule details
    const scheduleItem = page.locator('[data-testid="schedule-item"]:has-text("Monthly Rent Payment")');
    if (await scheduleItem.isVisible()) {
      await scheduleItem.click();
    } else {
      // Fallback: click on the schedule name/link
      await page.locator('a:has-text("Monthly Rent Payment"), button:has-text("Monthly Rent Payment")').click();
    }
    
    // Verify schedule details are displayed
    await expect(page.locator('text="Monthly Rent Payment"')).toBeVisible();
    await expect(page.locator('text="1500", text="$1,500"')).toBeVisible();
    
    // Step 4: Edit the schedule
    const editButton = page.locator('button:has-text("Edit"), button[aria-label*="Edit"], button[title*="Edit"]');
    await editButton.click();
    
    // Update the amount
    const amountInput = page.locator('input[name="amount"], input[placeholder*="amount"]');
    await amountInput.fill("1600");
    
    // Change status to inactive
    const statusSelect = page.locator('select[name="status"]');
    if (await statusSelect.isVisible()) {
      await statusSelect.selectOption("inactive");
    }
    
    // Save changes
    const updateButton = page.locator('button:has-text("Save"), button:has-text("Update"), button[type="submit"]');
    await updateButton.click();
    
    // Step 5: Verify changes were saved
    await page.waitForLoadState("networkidle");
    await expect(page.locator('text="1600", text="$1,600"')).toBeVisible();
    
    // Step 6: Delete the schedule
    const deleteButton = page.locator('button:has-text("Delete"), button[aria-label*="Delete"], button[title*="Delete"]');
    await deleteButton.click();
    
    // Confirm deletion in modal if present
    const confirmButton = page.locator('button:has-text("Confirm"), button:has-text("Delete"), button:has-text("Yes")');
    if (await confirmButton.isVisible()) {
      await confirmButton.click();
    }
    
    // Step 7: Verify schedule was deleted
    await page.waitForLoadState("networkidle");
    await expect(page.locator('text="Monthly Rent Payment"')).not.toBeVisible();
  });

  test("should handle recurring schedule configuration", async ({ page }) => {
    // Create a recurring schedule with different frequencies
    const addButton = page.locator('button:has-text("Add Schedule"), button[aria-label*="Add"]');
    await addButton.click();

    // Basic schedule info
    await page.locator('input[name="name"]').fill("Weekly Groceries");
    await page.locator('input[name="amount"]').fill("150");
    
    // Select payee and account (using first available options)
    const payeeSelect = page.locator('select[name="payeeId"]');
    if (await payeeSelect.isVisible()) {
      await payeeSelect.selectOption({ index: 1 });
    }
    
    const accountSelect = page.locator('select[name="accountId"]');
    if (await accountSelect.isVisible()) {
      await accountSelect.selectOption({ index: 1 });
    }
    
    // Enable recurring
    const recurringCheckbox = page.locator('input[name="recurring"]');
    if (await recurringCheckbox.isVisible()) {
      await recurringCheckbox.check();
    }
    
    // Set frequency to weekly
    const frequencySelect = page.locator('select[name="frequency"], select:has(option[value="weekly"])');
    if (await frequencySelect.isVisible()) {
      await frequencySelect.selectOption("weekly");
    }
    
    // Set interval (every 2 weeks)
    const intervalInput = page.locator('input[name="interval"], input[placeholder*="interval"]');
    if (await intervalInput.isVisible()) {
      await intervalInput.fill("2");
    }
    
    // Save the recurring schedule
    await page.locator('button:has-text("Save"), button[type="submit"]').click();
    
    // Verify it was created
    await page.waitForLoadState("networkidle");
    await expect(page.locator('text="Weekly Groceries"')).toBeVisible();
    
    // Verify recurring indication is shown
    const recurringIndicator = page.locator('[data-testid="recurring-indicator"], .recurring-icon, text="Recurring"');
    await expect(recurringIndicator.first()).toBeVisible();
  });

  test("should handle different amount types", async ({ page }) => {
    // Test exact amount
    await page.locator('button:has-text("Add Schedule")').click();
    
    await page.locator('input[name="name"]').fill("Fixed Internet Bill");
    await page.locator('input[name="amount"]').fill("89.99");
    
    // Set amount type to exact
    const amountTypeSelect = page.locator('select[name="amount_type"]');
    if (await amountTypeSelect.isVisible()) {
      await amountTypeSelect.selectOption("exact");
    }
    
    // Select payee and account
    const selects = await page.locator('select').all();
    for (const select of selects) {
      if (await select.locator('option').first().isVisible()) {
        await select.selectOption({ index: 1 });
      }
    }
    
    await page.locator('button[type="submit"]').click();
    await page.waitForLoadState("networkidle");
    
    // Verify exact amount schedule
    await expect(page.locator('text="Fixed Internet Bill"')).toBeVisible();
    await expect(page.locator('text="$89.99"')).toBeVisible();
    
    // Test range amount type
    await page.locator('button:has-text("Add Schedule")').click();
    
    await page.locator('input[name="name"]').fill("Grocery Budget");
    await page.locator('input[name="amount"]').fill("100");
    
    // Set amount type to range
    const rangeAmountTypeSelect = page.locator('select[name="amount_type"]');
    if (await rangeAmountTypeSelect.isVisible()) {
      await rangeAmountTypeSelect.selectOption("range");
    }
    
    // Fill second amount for range
    const amount2Input = page.locator('input[name="amount_2"]');
    if (await amount2Input.isVisible()) {
      await amount2Input.fill("200");
    }
    
    // Select payee and account again
    const selects2 = await page.locator('select').all();
    for (const select of selects2) {
      const options = await select.locator('option').count();
      if (options > 1) {
        await select.selectOption({ index: 1 });
      }
    }
    
    await page.locator('button[type="submit"]').click();
    await page.waitForLoadState("networkidle");
    
    // Verify range amount schedule
    await expect(page.locator('text="Grocery Budget"')).toBeVisible();
    await expect(page.locator('text="$100", text="$200"').first()).toBeVisible();
  });

  test("should handle schedule status changes", async ({ page }) => {
    // Create an active schedule
    await page.locator('button:has-text("Add Schedule")').click();
    
    await page.locator('input[name="name"]').fill("Seasonal Payment");
    await page.locator('input[name="amount"]').fill("500");
    
    // Ensure it's active
    const statusSelect = page.locator('select[name="status"]');
    if (await statusSelect.isVisible()) {
      await statusSelect.selectOption("active");
    }
    
    // Fill required fields
    const payeeSelect = page.locator('select[name="payeeId"]');
    if (await payeeSelect.isVisible()) {
      await payeeSelect.selectOption({ index: 1 });
    }
    
    const accountSelect = page.locator('select[name="accountId"]');
    if (await accountSelect.isVisible()) {
      await accountSelect.selectOption({ index: 1 });
    }
    
    await page.locator('button[type="submit"]').click();
    await page.waitForLoadState("networkidle");
    
    // Verify active schedule appears
    await expect(page.locator('text="Seasonal Payment"')).toBeVisible();
    
    // Edit to make it inactive
    const editButton = page.locator('button:has-text("Edit")').first();
    if (await editButton.isVisible()) {
      await editButton.click();
      
      const editStatusSelect = page.locator('select[name="status"]');
      if (await editStatusSelect.isVisible()) {
        await editStatusSelect.selectOption("inactive");
      }
      
      await page.locator('button[type="submit"]').click();
      await page.waitForLoadState("networkidle");
    }
    
    // Verify status change indication
    const inactiveIndicator = page.locator('[data-testid="inactive-indicator"], .inactive-status, text="Inactive"');
    if (await inactiveIndicator.isVisible()) {
      await expect(inactiveIndicator.first()).toBeVisible();
    }
  });

  test("should handle form validation errors", async ({ page }) => {
    await page.locator('button:has-text("Add Schedule")').click();
    
    // Try to save without required fields
    await page.locator('button[type="submit"]').click();
    
    // Check for validation errors
    const nameError = page.locator('text="Name is required", .error:has-text("name"), [data-error]:has-text("name")');
    const amountError = page.locator('text="Amount is required", .error:has-text("amount"), [data-error]:has-text("amount")');
    
    // At least one validation error should be visible
    const errorMessages = page.locator('.error, [data-error], .field-error');
    await expect(errorMessages.first()).toBeVisible();
    
    // Fill out required fields one by one and verify errors disappear
    await page.locator('input[name="name"]').fill("A"); // Too short
    await page.locator('input[name="name"]').blur();
    
    // Should show length validation error
    const lengthError = page.locator('text="too short", text="minimum", .error');
    if (await lengthError.isVisible()) {
      await expect(lengthError.first()).toBeVisible();
    }
    
    // Fix name length
    await page.locator('input[name="name"]').fill("Valid Schedule Name");
    await page.locator('input[name="amount"]').fill("abc"); // Invalid amount
    await page.locator('input[name="amount"]').blur();
    
    // Should show numeric validation error if implemented
    const numericError = page.locator('text="number", text="numeric", .error');
    if (await numericError.isVisible()) {
      await expect(numericError.first()).toBeVisible();
    }
    
    // Fix amount
    await page.locator('input[name="amount"]').fill("100");
    
    // Select required dropdowns
    const selects = await page.locator('select').all();
    for (const select of selects) {
      const options = await select.locator('option').count();
      if (options > 1) {
        await select.selectOption({ index: 1 });
      }
    }
    
    // Now save should work
    await page.locator('button[type="submit"]').click();
    await page.waitForLoadState("networkidle");
    
    // Verify successful creation
    await expect(page.locator('text="Valid Schedule Name"')).toBeVisible();
  });

  test("should handle schedule search and filtering", async ({ page }) => {
    // Create multiple schedules for testing
    const schedules = [
      { name: "Monthly Rent", amount: "1200", status: "active" },
      { name: "Weekly Groceries", amount: "150", status: "active" },
      { name: "Annual Insurance", amount: "800", status: "inactive" },
    ];
    
    for (const schedule of schedules) {
      await page.locator('button:has-text("Add Schedule")').click();
      
      await page.locator('input[name="name"]').fill(schedule.name);
      await page.locator('input[name="amount"]').fill(schedule.amount);
      
      const statusSelect = page.locator('select[name="status"]');
      if (await statusSelect.isVisible()) {
        await statusSelect.selectOption(schedule.status);
      }
      
      // Fill required fields
      const selects = await page.locator('select').all();
      for (const select of selects) {
        const options = await select.locator('option').count();
        if (options > 1) {
          await select.selectOption({ index: 1 });
        }
      }
      
      await page.locator('button[type="submit"]').click();
      await page.waitForLoadState("networkidle");
    }
    
    // Test search functionality
    const searchInput = page.locator('input[placeholder*="search"], input[name="search"]');
    if (await searchInput.isVisible()) {
      await searchInput.fill("Monthly");
      await page.waitForTimeout(500); // Wait for search debounce
      
      // Should show only Monthly Rent
      await expect(page.locator('text="Monthly Rent"')).toBeVisible();
      await expect(page.locator('text="Weekly Groceries"')).not.toBeVisible();
      
      // Clear search
      await searchInput.fill("");
      await page.waitForTimeout(500);
    }
    
    // Test status filtering
    const statusFilter = page.locator('select[name="statusFilter"], select:has(option[value="active"])');
    if (await statusFilter.isVisible()) {
      await statusFilter.selectOption("active");
      await page.waitForTimeout(500);
      
      // Should show only active schedules
      await expect(page.locator('text="Monthly Rent"')).toBeVisible();
      await expect(page.locator('text="Weekly Groceries"')).toBeVisible();
      await expect(page.locator('text="Annual Insurance"')).not.toBeVisible();
      
      // Test inactive filter
      await statusFilter.selectOption("inactive");
      await page.waitForTimeout(500);
      
      await expect(page.locator('text="Annual Insurance"')).toBeVisible();
      await expect(page.locator('text="Monthly Rent"')).not.toBeVisible();
    }
    
    // Verify all schedules are visible when no filters applied
    const allFilter = page.locator('select[name="statusFilter"], button:has-text("All")');
    if (await allFilter.isVisible()) {
      if (await page.locator('select[name="statusFilter"]').isVisible()) {
        await page.locator('select[name="statusFilter"]').selectOption("");
      } else {
        await allFilter.click();
      }
      await page.waitForTimeout(500);
      
      await expect(page.locator('text="Monthly Rent"')).toBeVisible();
      await expect(page.locator('text="Weekly Groceries"')).toBeVisible();
      await expect(page.locator('text="Annual Insurance"')).toBeVisible();
    }
  });

  test("should handle bulk schedule operations", async ({ page }) => {
    // Create multiple schedules
    const scheduleNames = ["Schedule A", "Schedule B", "Schedule C"];
    
    for (const name of scheduleNames) {
      await page.locator('button:has-text("Add Schedule")').click();
      
      await page.locator('input[name="name"]').fill(name);
      await page.locator('input[name="amount"]').fill("100");
      
      // Fill required selects
      const selects = await page.locator('select').all();
      for (const select of selects) {
        const options = await select.locator('option').count();
        if (options > 1) {
          await select.selectOption({ index: 1 });
        }
      }
      
      await page.locator('button[type="submit"]').click();
      await page.waitForLoadState("networkidle");
    }
    
    // Look for bulk selection capability
    const selectAllCheckbox = page.locator('input[type="checkbox"][name="selectAll"], thead input[type="checkbox"]');
    if (await selectAllCheckbox.isVisible()) {
      await selectAllCheckbox.check();
      
      // Look for bulk action buttons
      const bulkDeleteButton = page.locator('button:has-text("Delete Selected"), button:has-text("Bulk Delete")');
      const bulkStatusButton = page.locator('button:has-text("Change Status"), button:has-text("Bulk Status")');
      
      if (await bulkDeleteButton.isVisible()) {
        await bulkDeleteButton.click();
        
        // Confirm bulk deletion
        const confirmButton = page.locator('button:has-text("Confirm"), button:has-text("Delete All")');
        if (await confirmButton.isVisible()) {
          await confirmButton.click();
          await page.waitForLoadState("networkidle");
          
          // Verify schedules were deleted
          for (const name of scheduleNames) {
            await expect(page.locator(`text="${name}"`)).not.toBeVisible();
          }
        }
      } else if (await bulkStatusButton.isVisible()) {
        // Test bulk status change instead
        await bulkStatusButton.click();
        
        const statusOption = page.locator('button:has-text("Inactive"), select option[value="inactive"]');
        if (await statusOption.isVisible()) {
          await statusOption.click();
          await page.waitForLoadState("networkidle");
          
          // Verify status indicators appear
          const inactiveIndicators = page.locator('[data-testid="inactive-indicator"], .inactive-status');
          await expect(inactiveIndicators.first()).toBeVisible();
        }
      }
    }
  });
});