import {test, expect} from "@playwright/test";

test.describe("Schedule Form Integration", () => {
  test.beforeEach(async ({page}) => {
    await page.goto("/schedules");
    await page.waitForLoadState("networkidle");
  });

  test.describe("Add Schedule Dialog", () => {
    test("should open add schedule dialog", async ({page}) => {
      // Click the "Add Schedule" button in sidebar
      await page.click('[title="Add Schedule"]');

      // Verify dialog opens
      await expect(page.locator('[data-testid="add-schedule-dialog"]')).toBeVisible();
      await expect(page.locator("text=Add Schedule")).toBeVisible();

      // Verify form fields are present
      await expect(page.locator('[name="name"]')).toBeVisible();
      await expect(page.locator('[name="payeeId"]')).toBeVisible();
      await expect(page.locator('[name="accountId"]')).toBeVisible();
      await expect(page.locator('[name="amount"]')).toBeVisible();
    });

    test("should close dialog on cancel", async ({page}) => {
      await page.click('[title="Add Schedule"]');
      await expect(page.locator('[data-testid="add-schedule-dialog"]')).toBeVisible();

      await page.click("text=Cancel");
      await expect(page.locator('[data-testid="add-schedule-dialog"]')).not.toBeVisible();
    });

    test("should close dialog on escape key", async ({page}) => {
      await page.click('[title="Add Schedule"]');
      await expect(page.locator('[data-testid="add-schedule-dialog"]')).toBeVisible();

      await page.keyboard.press("Escape");
      await expect(page.locator('[data-testid="add-schedule-dialog"]')).not.toBeVisible();
    });
  });

  test.describe("Schedule Form Validation", () => {
    test.beforeEach(async ({page}) => {
      await page.click('[title="Add Schedule"]');
      await page.waitForSelector('[data-testid="add-schedule-dialog"]');
    });

    test("should show validation errors for empty required fields", async ({page}) => {
      // Try to submit empty form
      await page.click("text=Save");

      // Check for validation error messages
      await expect(page.locator("text=Schedule name is required")).toBeVisible();
      await expect(page.locator("text=Payee is required")).toBeVisible();
      await expect(page.locator("text=Account is required")).toBeVisible();
    });

    test("should validate schedule name length", async ({page}) => {
      // Test name too short
      await page.fill('[name="name"]', "a");
      await page.click("text=Save");
      await expect(page.locator("text=Schedule name must be at least 2 characters")).toBeVisible();

      // Test name too long
      const longName = "a".repeat(31);
      await page.fill('[name="name"]', longName);
      await page.click("text=Save");
      await expect(
        page.locator("text=Schedule name must be less than 30 characters")
      ).toBeVisible();
    });

    test("should validate schedule name characters", async ({page}) => {
      await page.fill('[name="name"]', "Invalid@Name!");
      await page.click("text=Save");
      await expect(page.locator("text=Schedule name contains invalid characters")).toBeVisible();
    });

    test("should validate amount is positive", async ({page}) => {
      await page.fill('[name="name"]', "Test Schedule");
      await page.fill('[name="amount"]', "-100");
      await page.click("text=Save");
      await expect(page.locator("text=Amount must be positive")).toBeVisible();
    });

    test("should validate range amounts", async ({page}) => {
      // Select range amount type
      await page.click('[data-testid="amount-type-range"]');

      await page.fill('[name="name"]', "Test Schedule");
      await page.fill('[name="amount"]', "200");
      await page.fill('[name="amount_2"]', "100"); // Min > Max
      await page.click("text=Save");

      await expect(page.locator("text=Maximum amount must be greater than minimum")).toBeVisible();
    });
  });

  test.describe("Schedule Form Functionality", () => {
    test.beforeEach(async ({page}) => {
      await page.click('[title="Add Schedule"]');
      await page.waitForSelector('[data-testid="add-schedule-dialog"]');
    });

    test("should create exact amount schedule successfully", async ({page}) => {
      // Fill in required fields
      await page.fill('[name="name"]', "Monthly Rent");
      await page.selectOption('[name="payeeId"]', {index: 1});
      await page.selectOption('[name="accountId"]', {index: 1});
      await page.fill('[name="amount"]', "1500");

      // Submit form
      await page.click("text=Save");

      // Verify dialog closes and schedule appears in list
      await expect(page.locator('[data-testid="add-schedule-dialog"]')).not.toBeVisible();
      await expect(page.locator("text=Monthly Rent")).toBeVisible();

      // Verify schedule details
      const scheduleRow = page.locator('[data-testid="schedule-row"]:has-text("Monthly Rent")');
      await expect(scheduleRow).toBeVisible();
      await expect(scheduleRow.locator("text=$1,500.00")).toBeVisible();
      await expect(scheduleRow.locator('[data-testid="amount-type-exact"]')).toBeVisible();
    });

    test("should create range amount schedule successfully", async ({page}) => {
      await page.fill('[name="name"]', "Variable Utilities");
      await page.selectOption('[name="payeeId"]', {index: 1});
      await page.selectOption('[name="accountId"]', {index: 1});

      // Select range amount type
      await page.click('[data-testid="amount-type-range"]');
      await page.fill('[name="amount"]', "80");
      await page.fill('[name="amount_2"]', "120");

      await page.click("text=Save");

      await expect(page.locator('[data-testid="add-schedule-dialog"]')).not.toBeVisible();
      await expect(page.locator("text=Variable Utilities")).toBeVisible();

      const scheduleRow = page.locator(
        '[data-testid="schedule-row"]:has-text("Variable Utilities")'
      );
      await expect(scheduleRow.locator("text=$80.00 - $120.00")).toBeVisible();
      await expect(scheduleRow.locator('[data-testid="amount-type-range"]')).toBeVisible();
    });

    test("should create approximate amount schedule successfully", async ({page}) => {
      await page.fill('[name="name"]', "Approximate Groceries");
      await page.selectOption('[name="payeeId"]', {index: 1});
      await page.selectOption('[name="accountId"]', {index: 1});

      // Select approximate amount type
      await page.click('[data-testid="amount-type-approximate"]');
      await page.fill('[name="amount"]', "200");

      await page.click("text=Save");

      await expect(page.locator('[data-testid="add-schedule-dialog"]')).not.toBeVisible();
      await expect(page.locator("text=Approximate Groceries")).toBeVisible();

      const scheduleRow = page.locator(
        '[data-testid="schedule-row"]:has-text("Approximate Groceries")'
      );
      await expect(scheduleRow.locator("text=~$200.00")).toBeVisible();
      await expect(scheduleRow.locator('[data-testid="amount-type-approximate"]')).toBeVisible();
    });

    test("should toggle recurring schedule options", async ({page}) => {
      await page.fill('[name="name"]', "Recurring Test");
      await page.selectOption('[name="payeeId"]', {index: 1});
      await page.selectOption('[name="accountId"]', {index: 1});
      await page.fill('[name="amount"]', "100");

      // Enable recurring
      await page.check('[data-testid="recurring-checkbox"]');

      // Verify recurring date options appear
      await expect(page.locator('[data-testid="recurring-date-input"]')).toBeVisible();
      await expect(page.locator('[data-testid="frequency-selector"]')).toBeVisible();

      // Disable recurring
      await page.uncheck('[data-testid="recurring-checkbox"]');

      // Verify recurring options are hidden
      await expect(page.locator('[data-testid="recurring-date-input"]')).not.toBeVisible();
    });

    test("should configure auto-add option", async ({page}) => {
      await page.fill('[name="name"]', "Auto Add Test");
      await page.selectOption('[name="payeeId"]', {index: 1});
      await page.selectOption('[name="accountId"]', {index: 1});
      await page.fill('[name="amount"]', "50");

      // Enable auto-add
      await page.check('[data-testid="auto-add-checkbox"]');

      await page.click("text=Save");

      const scheduleRow = page.locator('[data-testid="schedule-row"]:has-text("Auto Add Test")');
      await expect(scheduleRow.locator('[data-testid="auto-add-enabled"]')).toBeVisible();
    });
  });

  test.describe("Recurring Date Configuration", () => {
    test.beforeEach(async ({page}) => {
      await page.click('[title="Add Schedule"]');
      await page.waitForSelector('[data-testid="add-schedule-dialog"]');

      // Fill basic fields and enable recurring
      await page.fill('[name="name"]', "Recurring Schedule");
      await page.selectOption('[name="payeeId"]', {index: 1});
      await page.selectOption('[name="accountId"]', {index: 1});
      await page.fill('[name="amount"]', "100");
      await page.check('[data-testid="recurring-checkbox"]');
    });

    test("should configure daily recurrence", async ({page}) => {
      await page.selectOption('[data-testid="frequency-selector"]', "daily");
      await page.fill('[data-testid="interval-input"]', "2"); // Every 2 days

      await page.click("text=Save");

      const scheduleRow = page.locator(
        '[data-testid="schedule-row"]:has-text("Recurring Schedule")'
      );
      await expect(scheduleRow.locator("text=Every 2 days")).toBeVisible();
    });

    test("should configure weekly recurrence", async ({page}) => {
      await page.selectOption('[data-testid="frequency-selector"]', "weekly");
      await page.fill('[data-testid="interval-input"]', "1"); // Every week

      // Select specific weekdays
      await page.check('[data-testid="weekday-monday"]');
      await page.check('[data-testid="weekday-friday"]');

      await page.click("text=Save");

      const scheduleRow = page.locator(
        '[data-testid="schedule-row"]:has-text("Recurring Schedule")'
      );
      await expect(scheduleRow.locator("text=Weekly on Mon, Fri")).toBeVisible();
    });

    test("should configure monthly recurrence", async ({page}) => {
      await page.selectOption('[data-testid="frequency-selector"]', "monthly");
      await page.fill('[data-testid="interval-input"]', "3"); // Every 3 months (quarterly)

      await page.click("text=Save");

      const scheduleRow = page.locator(
        '[data-testid="schedule-row"]:has-text("Recurring Schedule")'
      );
      await expect(scheduleRow.locator("text=Every 3 months")).toBeVisible();
    });

    test("should configure yearly recurrence", async ({page}) => {
      await page.selectOption('[data-testid="frequency-selector"]', "yearly");

      await page.click("text=Save");

      const scheduleRow = page.locator(
        '[data-testid="schedule-row"]:has-text("Recurring Schedule")'
      );
      await expect(scheduleRow.locator("text=Yearly")).toBeVisible();
    });

    test("should set end conditions", async ({page}) => {
      await page.selectOption('[data-testid="frequency-selector"]', "monthly");

      // Set limit
      await page.click('[data-testid="end-type-limit"]');
      await page.fill('[data-testid="limit-input"]', "12");

      await page.click("text=Save");

      const scheduleRow = page.locator(
        '[data-testid="schedule-row"]:has-text("Recurring Schedule")'
      );
      await expect(scheduleRow.locator("text=12 occurrences")).toBeVisible();
    });

    test("should configure weekend adjustments", async ({page}) => {
      await page.selectOption('[data-testid="frequency-selector"]', "weekly");

      // Configure weekend adjustment
      await page.selectOption('[data-testid="weekend-adjustment"]', "next_weekday");

      await page.click("text=Save");

      // Verify schedule was created (weekend adjustment is internal logic)
      const scheduleRow = page.locator(
        '[data-testid="schedule-row"]:has-text("Recurring Schedule")'
      );
      await expect(scheduleRow).toBeVisible();
    });
  });

  test.describe("Edit Schedule", () => {
    test.beforeEach(async ({page}) => {
      // Create a test schedule first
      await page.click('[title="Add Schedule"]');
      await page.fill('[name="name"]', "Test Schedule for Edit");
      await page.selectOption('[name="payeeId"]', {index: 1});
      await page.selectOption('[name="accountId"]', {index: 1});
      await page.fill('[name="amount"]', "100");
      await page.click("text=Save");
      await page.waitForSelector('[data-testid="schedule-row"]:has-text("Test Schedule for Edit")');
    });

    test("should open edit dialog", async ({page}) => {
      const scheduleRow = page.locator(
        '[data-testid="schedule-row"]:has-text("Test Schedule for Edit")'
      );
      await scheduleRow.locator('[data-testid="schedule-actions"]').click();
      await page.click("text=Edit");

      await expect(page.locator('[data-testid="edit-schedule-dialog"]')).toBeVisible();
      await expect(page.locator("text=Edit Schedule")).toBeVisible();

      // Verify form is pre-populated
      await expect(page.locator('[name="name"]')).toHaveValue("Test Schedule for Edit");
      await expect(page.locator('[name="amount"]')).toHaveValue("100");
    });

    test("should update schedule successfully", async ({page}) => {
      const scheduleRow = page.locator(
        '[data-testid="schedule-row"]:has-text("Test Schedule for Edit")'
      );
      await scheduleRow.locator('[data-testid="schedule-actions"]').click();
      await page.click("text=Edit");

      // Update name and amount
      await page.fill('[name="name"]', "Updated Schedule Name");
      await page.fill('[name="amount"]', "250");

      await page.click("text=Save");

      // Verify changes are reflected
      await expect(page.locator('[data-testid="edit-schedule-dialog"]')).not.toBeVisible();
      await expect(page.locator("text=Updated Schedule Name")).toBeVisible();
      await expect(page.locator("text=$250.00")).toBeVisible();
    });

    test("should handle edit validation errors", async ({page}) => {
      const scheduleRow = page.locator(
        '[data-testid="schedule-row"]:has-text("Test Schedule for Edit")'
      );
      await scheduleRow.locator('[data-testid="schedule-actions"]').click();
      await page.click("text=Edit");

      // Clear required field
      await page.fill('[name="name"]', "");
      await page.click("text=Save");

      // Verify validation error
      await expect(page.locator("text=Schedule name is required")).toBeVisible();
      await expect(page.locator('[data-testid="edit-schedule-dialog"]')).toBeVisible();
    });
  });

  test.describe("Delete Schedule", () => {
    test.beforeEach(async ({page}) => {
      // Create a test schedule to delete
      await page.click('[title="Add Schedule"]');
      await page.fill('[name="name"]', "Schedule to Delete");
      await page.selectOption('[name="payeeId"]', {index: 1});
      await page.selectOption('[name="accountId"]', {index: 1});
      await page.fill('[name="amount"]', "75");
      await page.click("text=Save");
      await page.waitForSelector('[data-testid="schedule-row"]:has-text("Schedule to Delete")');
    });

    test("should show delete confirmation dialog", async ({page}) => {
      const scheduleRow = page.locator(
        '[data-testid="schedule-row"]:has-text("Schedule to Delete")'
      );
      await scheduleRow.locator('[data-testid="schedule-actions"]').click();
      await page.click("text=Delete");

      await expect(page.locator('[data-testid="delete-schedule-dialog"]')).toBeVisible();
      await expect(page.locator("text=Delete Schedule")).toBeVisible();
      await expect(
        page.locator('text=Are you sure you want to delete "Schedule to Delete"?')
      ).toBeVisible();
    });

    test("should cancel delete operation", async ({page}) => {
      const scheduleRow = page.locator(
        '[data-testid="schedule-row"]:has-text("Schedule to Delete")'
      );
      await scheduleRow.locator('[data-testid="schedule-actions"]').click();
      await page.click("text=Delete");

      await page.click("text=Cancel");

      await expect(page.locator('[data-testid="delete-schedule-dialog"]')).not.toBeVisible();
      await expect(page.locator("text=Schedule to Delete")).toBeVisible(); // Still exists
    });

    test("should delete schedule successfully", async ({page}) => {
      const scheduleRow = page.locator(
        '[data-testid="schedule-row"]:has-text("Schedule to Delete")'
      );
      await scheduleRow.locator('[data-testid="schedule-actions"]').click();
      await page.click("text=Delete");

      await page.click('[data-testid="confirm-delete"]');

      await expect(page.locator('[data-testid="delete-schedule-dialog"]')).not.toBeVisible();
      await expect(page.locator("text=Schedule to Delete")).not.toBeVisible();
    });
  });

  test.describe("Schedule Status Management", () => {
    test.beforeEach(async ({page}) => {
      // Create active and inactive schedules for testing
      await page.click('[title="Add Schedule"]');
      await page.fill('[name="name"]', "Active Schedule");
      await page.selectOption('[name="payeeId"]', {index: 1});
      await page.selectOption('[name="accountId"]', {index: 1});
      await page.fill('[name="amount"]', "100");
      await page.click("text=Save");

      await page.click('[title="Add Schedule"]');
      await page.fill('[name="name"]', "Inactive Schedule");
      await page.selectOption('[name="payeeId"]', {index: 1});
      await page.selectOption('[name="accountId"]', {index: 1});
      await page.fill('[name="amount"]', "50");
      await page.selectOption('[name="status"]', "inactive");
      await page.click("text=Save");
    });

    test("should toggle schedule status", async ({page}) => {
      const activeSchedule = page.locator(
        '[data-testid="schedule-row"]:has-text("Active Schedule")'
      );
      await activeSchedule.locator('[data-testid="status-toggle"]').click();

      // Verify status changed to inactive
      await expect(activeSchedule.locator('[data-testid="status-inactive"]')).toBeVisible();

      // Toggle back to active
      await activeSchedule.locator('[data-testid="status-toggle"]').click();
      await expect(activeSchedule.locator('[data-testid="status-active"]')).toBeVisible();
    });

    test("should filter schedules by status", async ({page}) => {
      // Initially both schedules should be visible
      await expect(page.locator("text=Active Schedule")).toBeVisible();
      await expect(page.locator("text=Inactive Schedule")).toBeVisible();

      // Filter to show only active
      await page.click('[data-testid="filter-active"]');
      await expect(page.locator("text=Active Schedule")).toBeVisible();
      await expect(page.locator("text=Inactive Schedule")).not.toBeVisible();

      // Filter to show only inactive
      await page.click('[data-testid="filter-inactive"]');
      await expect(page.locator("text=Active Schedule")).not.toBeVisible();
      await expect(page.locator("text=Inactive Schedule")).toBeVisible();

      // Clear filters
      await page.click('[data-testid="clear-filters"]');
      await expect(page.locator("text=Active Schedule")).toBeVisible();
      await expect(page.locator("text=Inactive Schedule")).toBeVisible();
    });
  });

  test.describe("Accessibility", () => {
    test("add schedule dialog should be accessible", async ({page}) => {
      await page.click('[title="Add Schedule"]');

      // Check dialog ARIA attributes
      const dialog = page.locator('[data-testid="add-schedule-dialog"]');
      await expect(dialog).toHaveAttribute("role", "dialog");
      await expect(dialog).toHaveAttribute("aria-labelledby");
      await expect(dialog).toHaveAttribute("aria-describedby");

      // Check form labels
      await expect(page.locator('label[for="name"]')).toBeVisible();
      await expect(page.locator('label[for="payeeId"]')).toBeVisible();
      await expect(page.locator('label[for="accountId"]')).toBeVisible();
      await expect(page.locator('label[for="amount"]')).toBeVisible();
    });

    test("should support keyboard navigation in forms", async ({page}) => {
      await page.click('[title="Add Schedule"]');

      // Tab through form fields
      await page.keyboard.press("Tab"); // Name field
      await expect(page.locator('[name="name"]')).toBeFocused();

      await page.keyboard.press("Tab"); // Payee field
      await expect(page.locator('[name="payeeId"]')).toBeFocused();

      await page.keyboard.press("Tab"); // Account field
      await expect(page.locator('[name="accountId"]')).toBeFocused();

      await page.keyboard.press("Tab"); // Amount field
      await expect(page.locator('[name="amount"]')).toBeFocused();
    });

    test("should announce form validation errors to screen readers", async ({page}) => {
      await page.click('[title="Add Schedule"]');
      await page.click("text=Save"); // Submit empty form

      // Check for aria-live regions for validation errors
      const errorRegion = page.locator('[aria-live="polite"]');
      await expect(errorRegion).toBeVisible();

      // Check that errors are associated with form fields
      await expect(page.locator('[name="name"]')).toHaveAttribute("aria-describedby");
      await expect(page.locator('[name="payeeId"]')).toHaveAttribute("aria-describedby");
    });
  });
});
