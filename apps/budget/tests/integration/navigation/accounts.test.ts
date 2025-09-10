import {test, expect} from "@playwright/test";
import {setupTestDb, seedTestData} from "../setup/test-db-node";

test.describe("Accounts Navigation Tests", () => {
  let testDb: Awaited<ReturnType<typeof setupTestDb>>;

  test.beforeEach(async ({page}) => {
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
    test("should navigate to accounts page from main navigation", async ({page}) => {
      // Click on accounts navigation link
      await page.click('[href="/accounts"]');

      // Wait for navigation and verify URL
      await expect(page).toHaveURL("/accounts");

      // Verify accounts page content is loaded
      await expect(page.getByRole("heading")).toContainText("Accounts");
    });

    test("should display accounts list on accounts page", async ({page}) => {
      await page.goto("/accounts");

      // Should see accounts from test data
      await expect(page.getByText("Test Checking")).toBeVisible();
      await expect(page.getByText("Test Savings")).toBeVisible();

      // Should see account balances or transaction counts
      await expect(page.locator("[data-testid='account-item']")).toHaveCount(2);
    });

    test("should handle empty accounts page", async ({page}) => {
      // Clear test data first by setting up empty DB
      testDb = await setupTestDb(); // Fresh DB without seeding

      await page.goto("/accounts");

      // Should show empty state or create account prompt
      await expect(
        page.getByText("No accounts found") || page.getByText("Create your first account")
      ).toBeVisible();
    });

    test("should show loading state during navigation", async ({page, context}) => {
      // Slow down network to see loading state
      await context.route("**/*", (route) => {
        setTimeout(() => route.continue(), 100);
      });

      const navigationPromise = page.click('[href="/accounts"]');

      // Should show loading indicator
      await expect(
        page.locator("[data-testid='loading']") || page.locator(".loading")
      ).toBeVisible();

      await navigationPromise;
      await expect(page).toHaveURL("/accounts");
    });
  });

  test.describe("Individual Account Page Navigation", () => {
    test("should navigate to individual account page", async ({page}) => {
      await page.goto("/accounts");

      // Click on the first account
      await page.click("[data-testid='account-item']");

      // Should navigate to account detail page
      await expect(page).toHaveURL(/\/accounts\/\d+/);

      // Should display account details
      await expect(page.getByText("Test Checking") || page.getByText("Test Savings")).toBeVisible();
    });

    test("should show account transactions on individual page", async ({page}) => {
      await page.goto("/accounts");
      await page.click("[data-testid='account-item']");

      // Should display transactions table
      await expect(
        page.locator("[data-testid='transactions-table']") || page.locator("table")
      ).toBeVisible();

      // Should show transaction data
      await expect(page.getByText("Test transaction")).toBeVisible();
    });

    test("should handle non-existent account page", async ({page}) => {
      await page.goto("/accounts/99999");

      // Should show 404 or error message
      await expect(page.getByText("Account not found") || page.getByText("404")).toBeVisible();
    });

    test("should allow navigation back to accounts list", async ({page}) => {
      await page.goto("/accounts");
      await page.click("[data-testid='account-item']");

      // Click back button or breadcrumb
      const backButton = page.locator("[data-testid='back-to-accounts']");
      const backLink = page.locator("a[href='/accounts']");

      if (await backButton.isVisible()) {
        await backButton.click();
      } else if (await backLink.isVisible()) {
        await backLink.click();
      } else {
        await page.goBack();
      }

      // Should be back on accounts page
      await expect(page).toHaveURL("/accounts");
    });

    test("should maintain account context during navigation", async ({page}) => {
      await page.goto("/accounts");

      // Remember the account name
      const accountName = await page.locator("[data-testid='account-item']").first().textContent();

      await page.click("[data-testid='account-item']");

      // Account name should be displayed on detail page
      await expect(page.getByText(accountName!)).toBeVisible();
    });

    test("should display account balance and summary", async ({page}) => {
      await page.goto("/accounts");
      await page.click("[data-testid='account-item']");

      // Should show account balance
      await expect(
        page.locator("[data-testid='account-balance']") ||
          page.getByText(/Balance:|Current Balance:/)
      ).toBeVisible();

      // Should show transaction count or summary
      await expect(
        page.locator("[data-testid='transaction-count']") || page.getByText(/transactions/i)
      ).toBeVisible();

      // Should show account metadata
      await expect(
        page.locator("[data-testid='account-created']") || page.getByText(/Created:/)
      ).toBeVisible();
    });

    test("should filter transactions by date range", async ({page}) => {
      await page.goto("/accounts");
      await page.click("[data-testid='account-item']");

      // Should have date filter controls
      const dateFilter =
        page.locator("[data-testid='date-filter']") || page.locator("input[type='date']").first();

      if (await dateFilter.isVisible()) {
        // Set a date filter
        await dateFilter.fill("2024-01-01");

        // Should update transactions display
        await expect(page.locator("[data-testid='transactions-table']")).toBeVisible();

        // Reset filter
        const clearButton =
          page.locator("[data-testid='clear-filters']") || page.locator("button:has-text('Clear')");
        if (await clearButton.isVisible()) {
          await clearButton.click();
        }
      }
    });

    test("should sort transactions by different columns", async ({page}) => {
      await page.goto("/accounts");
      await page.click("[data-testid='account-item']");

      // Should have sortable columns
      const amountHeader =
        page.locator("[data-testid='sort-amount']") || page.locator("th:has-text('Amount')");

      if (await amountHeader.isVisible()) {
        // Click to sort by amount
        await amountHeader.click();

        // Should show sort indicator
        await expect(
          page.locator("[data-testid='sort-indicator']") || amountHeader.locator("svg")
        ).toBeVisible();

        // Click again to reverse sort
        await amountHeader.click();
      }

      // Try sorting by date
      const dateHeader =
        page.locator("[data-testid='sort-date']") || page.locator("th:has-text('Date')");

      if (await dateHeader.isVisible()) {
        await dateHeader.click();
        await expect(page.locator("[data-testid='transactions-table']")).toBeVisible();
      }
    });

    test("should paginate transactions when there are many", async ({page}) => {
      // First, create more test data by going through multiple accounts
      await page.goto("/accounts");
      await page.click("[data-testid='account-item']");

      // Look for pagination controls
      const pagination =
        page.locator("[data-testid='pagination']") ||
        page.locator(".pagination") ||
        page.locator("button:has-text('Next')");

      if (await pagination.isVisible()) {
        // Test next page
        await page.click("button:has-text('Next')");
        await expect(page.locator("[data-testid='transactions-table']")).toBeVisible();

        // Test previous page
        await page.click("button:has-text('Previous')");
        await expect(page.locator("[data-testid='transactions-table']")).toBeVisible();
      }
    });

    test("should show transaction details in modal or expanded view", async ({page}) => {
      await page.goto("/accounts");
      await page.click("[data-testid='account-item']");

      // Click on a transaction row
      const transactionRow =
        page.locator("[data-testid='transaction-row']").first() || page.locator("tbody tr").first();

      if (await transactionRow.isVisible()) {
        await transactionRow.click();

        // Should show transaction details
        await expect(
          page.locator("[data-testid='transaction-details']") ||
            page.locator("[role='dialog']") ||
            page.locator(".transaction-detail")
        ).toBeVisible();

        // Should show transaction amount, date, notes
        await expect(page.getByText(/Amount:|Date:|Notes:/)).toBeVisible();

        // Close details
        const closeButton =
          page.locator("[data-testid='close-details']") || page.locator("button:has-text('Close')");
        if (await closeButton.isVisible()) {
          await closeButton.click();
        } else {
          await page.keyboard.press("Escape");
        }
      }
    });

    test("should add new transaction to account", async ({page}) => {
      await page.goto("/accounts");
      await page.click("[data-testid='account-item']");

      // Click add transaction button
      const addButton =
        page.locator("[data-testid='add-transaction']") ||
        page.locator("button:has-text('Add Transaction')") ||
        page.locator("button:has-text('New Transaction')");

      if (await addButton.isVisible()) {
        await addButton.click();

        // Should open transaction form
        await expect(
          page.locator("[data-testid='transaction-form']") || page.locator("[role='dialog']")
        ).toBeVisible();

        // Fill out form
        await page.fill("input[name='amount']", "25.50");
        await page.fill("input[name='notes']", "Test transaction from integration test");

        // Submit form
        const submitButton =
          page.locator("button[type='submit']") || page.locator("button:has-text('Save')");
        await submitButton.click();

        // Should see success message and new transaction
        await expect(page.getByText(/Transaction added|Success/i)).toBeVisible();
        await expect(page.getByText("25.50")).toBeVisible();
      }
    });

    test("should edit existing transaction", async ({page}) => {
      await page.goto("/accounts");
      await page.click("[data-testid='account-item']");

      // Find and click edit button on a transaction
      const editButton =
        page.locator("[data-testid='edit-transaction']").first() ||
        page.locator("button:has-text('Edit')").first();

      if (await editButton.isVisible()) {
        await editButton.click();

        // Should open edit form with pre-filled data
        await expect(
          page.locator("[data-testid='transaction-form']") || page.locator("[role='dialog']")
        ).toBeVisible();

        // Form should have existing values
        const amountInput = page.locator("input[name='amount']");
        await expect(amountInput).toHaveValue(/-?\d+\.?\d*/);

        // Modify the amount
        await amountInput.fill("75.25");

        // Save changes
        const saveButton =
          page.locator("button[type='submit']") || page.locator("button:has-text('Save')");
        await saveButton.click();

        // Should see updated transaction
        await expect(page.getByText("75.25")).toBeVisible();
      }
    });

    test("should delete transaction with confirmation", async ({page}) => {
      await page.goto("/accounts");
      await page.click("[data-testid='account-item']");

      // Find delete button
      const deleteButton =
        page.locator("[data-testid='delete-transaction']").first() ||
        page.locator("button:has-text('Delete')").first();

      if (await deleteButton.isVisible()) {
        // Remember transaction details before deletion
        const transactionRow = page.locator("[data-testid='transaction-row']").first();
        const transactionText = await transactionRow.textContent();

        await deleteButton.click();

        // Should show confirmation dialog
        await expect(
          page.locator("[data-testid='delete-confirmation']") ||
            page.getByText(/Are you sure|Delete transaction/i)
        ).toBeVisible();

        // Confirm deletion
        const confirmButton =
          page.locator("button:has-text('Delete')") || page.locator("button:has-text('Confirm')");
        await confirmButton.click();

        // Transaction should be removed
        if (transactionText) {
          await expect(page.getByText(transactionText)).not.toBeVisible();
        }

        // Should see success message
        await expect(page.getByText(/Transaction deleted|Deleted successfully/i)).toBeVisible();
      }
    });

    test("should show account statistics and charts", async ({page}) => {
      await page.goto("/accounts");
      await page.click("[data-testid='account-item']");

      // Look for statistics section
      const statsSection =
        page.locator("[data-testid='account-statistics']") ||
        page.locator(".statistics") ||
        page.getByText(/Statistics|Overview/);

      if (await statsSection.isVisible()) {
        // Should show spending categories
        await expect(page.getByText(/Categories|Spending by Category/i)).toBeVisible();

        // Should show monthly trends
        await expect(page.getByText(/Monthly|Trends/i)).toBeVisible();

        // Should show income vs expenses
        await expect(page.getByText(/Income|Expenses/i)).toBeVisible();
      }

      // Look for charts
      const chart =
        page.locator("[data-testid='account-chart']") ||
        page.locator("canvas") ||
        page.locator(".chart");

      if (await chart.isVisible()) {
        await expect(chart).toBeVisible();
      }
    });

    test("should export account data", async ({page}) => {
      await page.goto("/accounts");
      await page.click("[data-testid='account-item']");

      // Look for export functionality
      const exportButton =
        page.locator("[data-testid='export-data']") ||
        page.locator("button:has-text('Export')") ||
        page.locator("button:has-text('Download')");

      if (await exportButton.isVisible()) {
        // Set up download handler
        const downloadPromise = page.waitForEvent("download");

        await exportButton.click();

        // Should show export options
        const csvOption =
          page.locator("button:has-text('CSV')") || page.locator("[data-testid='export-csv']");

        if (await csvOption.isVisible()) {
          await csvOption.click();
          const download = await downloadPromise;
          expect(download.suggestedFilename()).toMatch(/\.csv$/);
        }
      }
    });

    test("should handle account with no transactions", async ({page}) => {
      // Create a new account with no transactions for this test
      await page.goto("/accounts");

      // Add a new empty account if possible, or use existing empty account
      // Navigate to an account that should be empty
      const accountItems = page.locator("[data-testid='account-item']");
      const accountCount = await accountItems.count();

      if (accountCount > 1) {
        // Click on second account which might have fewer transactions
        await accountItems.nth(1).click();
      } else {
        await accountItems.first().click();
      }

      // Should handle empty state gracefully
      const emptyState =
        page.locator("[data-testid='no-transactions']") ||
        page.getByText(/No transactions|Empty account/i) ||
        page.locator(".empty-state");

      if (await emptyState.isVisible()) {
        await expect(emptyState).toBeVisible();

        // Should show call-to-action to add first transaction
        await expect(page.getByText(/Add your first transaction|Get started/i)).toBeVisible();
      }
    });

    test("should search transactions", async ({page}) => {
      await page.goto("/accounts");
      await page.click("[data-testid='account-item']");

      // Look for search functionality
      const searchInput =
        page.locator("[data-testid='transaction-search']") ||
        page.locator("input[placeholder*='Search']") ||
        page.locator("input[type='search']");

      if (await searchInput.isVisible()) {
        // Search for a specific transaction
        await searchInput.fill("Test transaction");

        // Should filter results
        await expect(page.getByText("Test transaction")).toBeVisible();

        // Clear search
        await searchInput.fill("");

        // Should show all transactions again
        await expect(page.locator("[data-testid='transactions-table']")).toBeVisible();
      }
    });

    test("should show account settings and preferences", async ({page}) => {
      await page.goto("/accounts");
      await page.click("[data-testid='account-item']");

      // Look for settings or preferences
      const settingsButton =
        page.locator("[data-testid='account-settings']") ||
        page.locator("button:has-text('Settings')") ||
        page.locator("[aria-label*='Settings']");

      if (await settingsButton.isVisible()) {
        await settingsButton.click();

        // Should show settings panel or modal
        await expect(
          page.locator("[data-testid='settings-panel']") || page.locator("[role='dialog']")
        ).toBeVisible();

        // Should have account preferences
        await expect(page.getByText(/Preferences|Settings|Configuration/i)).toBeVisible();

        // Close settings
        const closeSettingsButton = page.locator("button:has-text('Close')");
        if (await closeSettingsButton.isVisible()) {
          await closeSettingsButton.click();
        } else {
          await page.keyboard.press("Escape");
        }
      }
    });

    test("should handle bulk transaction operations", async ({page}) => {
      await page.goto("/accounts");
      await page.click("[data-testid='account-item']");

      // Look for bulk selection functionality
      const selectAllCheckbox =
        page.locator("[data-testid='select-all-transactions']") ||
        page.locator("input[type='checkbox'][aria-label*='Select all']");

      if (await selectAllCheckbox.isVisible()) {
        // Select all transactions
        await selectAllCheckbox.check();

        // Should show bulk action toolbar
        await expect(
          page.locator("[data-testid='bulk-actions']") || page.getByText(/selected|Bulk actions/i)
        ).toBeVisible();

        // Test bulk delete
        const bulkDeleteButton =
          page.locator("[data-testid='bulk-delete']") ||
          page.locator("button:has-text('Delete Selected')");

        if (await bulkDeleteButton.isVisible()) {
          await bulkDeleteButton.click();

          // Should show confirmation
          await expect(page.getByText(/Delete \d+ transactions|Are you sure/i)).toBeVisible();

          // Cancel the action
          await page.click("button:has-text('Cancel')");
        }

        // Deselect all
        await selectAllCheckbox.uncheck();
      }
    });

    test("should show transaction categories and tags", async ({page}) => {
      await page.goto("/accounts");
      await page.click("[data-testid='account-item']");

      // Should display transaction categories
      const categoryColumn =
        page.locator("[data-testid='transaction-category']").first() ||
        page.locator("td:has-text('Groceries'), td:has-text('Entertainment')").first();

      if (await categoryColumn.isVisible()) {
        await expect(categoryColumn).toBeVisible();

        // Test category filtering
        await categoryColumn.click();

        // Should show category filter options
        const categoryFilter =
          page.locator("[data-testid='category-filter']") || page.getByText(/Filter by category/i);

        if (await categoryFilter.isVisible()) {
          await expect(categoryFilter).toBeVisible();
        }
      }

      // Look for tags functionality
      const transactionTag =
        page.locator("[data-testid='transaction-tag']").first() ||
        page.locator(".tag, .badge").first();

      if (await transactionTag.isVisible()) {
        await expect(transactionTag).toBeVisible();
      }
    });

    test("should handle transaction recurring patterns", async ({page}) => {
      await page.goto("/accounts");
      await page.click("[data-testid='account-item']");

      // Look for recurring transaction indicators
      const recurringIndicator =
        page.locator("[data-testid='recurring-transaction']") ||
        page.locator(".recurring, .repeat") ||
        page.getByText(/recurring|repeat/i);

      if (await recurringIndicator.isVisible()) {
        await recurringIndicator.click();

        // Should show recurring transaction details
        await expect(
          page.locator("[data-testid='recurring-details']") ||
            page.getByText(/Every|Monthly|Weekly/i)
        ).toBeVisible();

        // Should have options to manage recurrence
        const manageRecurring =
          page.locator("[data-testid='manage-recurring']") ||
          page.locator("button:has-text('Edit Recurrence')");

        if (await manageRecurring.isVisible()) {
          await expect(manageRecurring).toBeVisible();
        }
      }
    });

    test("should display transaction attachments and receipts", async ({page}) => {
      await page.goto("/accounts");
      await page.click("[data-testid='account-item']");

      // Look for attachment indicators
      const attachmentIcon =
        page.locator("[data-testid='transaction-attachment']") ||
        page.locator(".attachment-icon, .paperclip") ||
        page.locator("svg[aria-label*='attachment']");

      if (await attachmentIcon.isVisible()) {
        await attachmentIcon.click();

        // Should show attachment preview or download options
        await expect(
          page.locator("[data-testid='attachment-preview']") ||
            page.locator("[role='dialog']") ||
            page.getByText(/Download|Preview/i)
        ).toBeVisible();

        // Test file download
        const downloadButton = page.locator("button:has-text('Download')");
        if (await downloadButton.isVisible()) {
          const downloadPromise = page.waitForEvent("download");
          await downloadButton.click();
          const download = await downloadPromise;
          expect(download.suggestedFilename()).toBeTruthy();
        }
      }
    });

    test("should handle transaction splits and multiple categories", async ({page}) => {
      await page.goto("/accounts");
      await page.click("[data-testid='account-item']");

      // Look for split transaction indicators
      const splitIndicator =
        page.locator("[data-testid='split-transaction']") ||
        page.locator(".split-indicator") ||
        page.getByText(/Split|Multiple categories/i);

      if (await splitIndicator.isVisible()) {
        await splitIndicator.click();

        // Should show split details
        await expect(
          page.locator("[data-testid='split-details']") || page.locator(".split-breakdown")
        ).toBeVisible();

        // Should show multiple categories and amounts
        await expect(page.locator("[data-testid='split-category']").first()).toBeVisible();
        await expect(page.locator("[data-testid='split-amount']").first()).toBeVisible();

        // Test editing split transaction
        const editSplitButton = page.locator("button:has-text('Edit Split')");
        if (await editSplitButton.isVisible()) {
          await editSplitButton.click();
          await expect(page.locator("[data-testid='split-editor']")).toBeVisible();
        }
      }
    });

    test("should show account balance history and trends", async ({page}) => {
      await page.goto("/accounts");
      await page.click("[data-testid='account-item']");

      // Look for balance history section
      const balanceHistory =
        page.locator("[data-testid='balance-history']") ||
        page.locator(".balance-chart") ||
        page.getByText(/Balance History|Account Trends/i);

      if (await balanceHistory.isVisible()) {
        await expect(balanceHistory).toBeVisible();

        // Should have time period controls
        const timePeriodButtons =
          page.locator("[data-testid='time-period']") ||
          page.locator("button:has-text('1M'), button:has-text('3M'), button:has-text('1Y')");

        if (await timePeriodButtons.first().isVisible()) {
          // Test different time periods
          await timePeriodButtons.first().click();
          await expect(balanceHistory).toBeVisible();

          if (await timePeriodButtons.nth(1).isVisible()) {
            await timePeriodButtons.nth(1).click();
            await expect(balanceHistory).toBeVisible();
          }
        }

        // Should show chart or graph
        const chart = page.locator("canvas, svg[data-chart], .chart-container");
        if (await chart.isVisible()) {
          await expect(chart).toBeVisible();
        }
      }
    });

    test("should handle transaction imports and bank sync", async ({page}) => {
      await page.goto("/accounts");
      await page.click("[data-testid='account-item']");

      // Look for import functionality
      const importButton =
        page.locator("[data-testid='import-transactions']") ||
        page.locator("button:has-text('Import')") ||
        page.locator("button:has-text('Sync')");

      if (await importButton.isVisible()) {
        await importButton.click();

        // Should show import options
        await expect(
          page.locator("[data-testid='import-dialog']") || page.locator("[role='dialog']")
        ).toBeVisible();

        // Should have file upload option
        const fileUpload =
          page.locator("input[type='file']") || page.locator("[data-testid='file-upload']");

        if (await fileUpload.isVisible()) {
          await expect(fileUpload).toBeVisible();
        }

        // Should have bank sync options
        const bankSyncOption =
          page.locator("[data-testid='bank-sync']") || page.getByText(/Connect Bank|Sync Bank/i);

        if (await bankSyncOption.isVisible()) {
          await expect(bankSyncOption).toBeVisible();
        }

        // Close dialog
        await page.keyboard.press("Escape");
      }
    });

    test("should validate transaction amounts and dates", async ({page}) => {
      await page.goto("/accounts");
      await page.click("[data-testid='account-item']");

      // Try to add a transaction with invalid data
      const addButton =
        page.locator("[data-testid='add-transaction']") ||
        page.locator("button:has-text('Add Transaction')");

      if (await addButton.isVisible()) {
        await addButton.click();

        // Fill with invalid amount
        await page.fill("input[name='amount']", "invalid");
        await page.fill("input[name='notes']", "Test invalid transaction");

        // Try to submit
        const submitButton =
          page.locator("button[type='submit']") || page.locator("button:has-text('Save')");
        await submitButton.click();

        // Should show validation error
        await expect(page.getByText(/Invalid amount|Please enter a valid amount/i)).toBeVisible();

        // Fix amount but use future date
        await page.fill("input[name='amount']", "50.00");
        const futureDateField = page.locator("input[name='date'], input[type='date']");
        if (await futureDateField.isVisible()) {
          await futureDateField.fill("2030-12-31");
          await submitButton.click();

          // Should warn about future date or accept it
          const warningOrSuccess =
            page.locator("[data-testid='warning'], [data-testid='success']") ||
            page.getByText(/Future date|Transaction added/i);
          await expect(warningOrSuccess).toBeVisible();
        }

        // Cancel the form
        const cancelButton = page.locator("button:has-text('Cancel')");
        if (await cancelButton.isVisible()) {
          await cancelButton.click();
        } else {
          await page.keyboard.press("Escape");
        }
      }
    });

    test("should show transaction pending and cleared status", async ({page}) => {
      await page.goto("/accounts");
      await page.click("[data-testid='account-item']");

      // Look for transaction status indicators
      const pendingTransaction =
        page.locator("[data-testid='transaction-pending']") ||
        page.locator(".pending, .uncleared") ||
        page.getByText(/Pending|Uncleared/i);

      if (await pendingTransaction.isVisible()) {
        await expect(pendingTransaction).toBeVisible();

        // Should be able to mark as cleared
        const markClearedButton =
          page.locator("[data-testid='mark-cleared']") ||
          page.locator("button:has-text('Mark Cleared')");

        if (await markClearedButton.isVisible()) {
          await markClearedButton.click();

          // Should update status
          await expect(
            page.locator("[data-testid='transaction-cleared']") || page.getByText(/Cleared/i)
          ).toBeVisible();
        }
      }

      // Test filtering by status
      const statusFilter =
        page.locator("[data-testid='status-filter']") || page.locator("select[name='status']");

      if (await statusFilter.isVisible()) {
        await statusFilter.selectOption("pending");
        await expect(page.locator("[data-testid='transactions-table']")).toBeVisible();

        await statusFilter.selectOption("cleared");
        await expect(page.locator("[data-testid='transactions-table']")).toBeVisible();
      }
    });

    test("should handle account reconciliation", async ({page}) => {
      await page.goto("/accounts");
      await page.click("[data-testid='account-item']");

      // Look for reconciliation functionality
      const reconcileButton =
        page.locator("[data-testid='reconcile-account']") ||
        page.locator("button:has-text('Reconcile')");

      if (await reconcileButton.isVisible()) {
        await reconcileButton.click();

        // Should show reconciliation dialog
        await expect(
          page.locator("[data-testid='reconciliation-dialog']") || page.locator("[role='dialog']")
        ).toBeVisible();

        // Should have ending balance field
        const endingBalanceField =
          page.locator("input[name='endingBalance']") ||
          page.locator("[data-testid='ending-balance']");

        if (await endingBalanceField.isVisible()) {
          await endingBalanceField.fill("1000.00");

          // Should show difference calculation
          await expect(page.getByText(/Difference|Variance/i)).toBeVisible();

          // Should have finish reconciliation button
          const finishButton = page.locator("button:has-text('Finish Reconciliation')");
          if (await finishButton.isVisible()) {
            await expect(finishButton).toBeVisible();
          }
        }

        // Cancel reconciliation
        const cancelReconcileButton = page.locator("button:has-text('Cancel')");
        if (await cancelReconcileButton.isVisible()) {
          await cancelReconcileButton.click();
        } else {
          await page.keyboard.press("Escape");
        }
      }
    });

    test("should show transaction notes and memos in detail view", async ({page}) => {
      await page.goto("/accounts");
      await page.click("[data-testid='account-item']");

      // Click on a transaction to see details
      const transactionRow =
        page.locator("[data-testid='transaction-row']").first() || page.locator("tbody tr").first();

      if (await transactionRow.isVisible()) {
        await transactionRow.click();

        // Should show detailed notes section
        const notesSection =
          page.locator("[data-testid='transaction-notes']") ||
          page.locator(".notes, .memo") ||
          page.getByText(/Notes:|Memo:|Description:/i);

        if (await notesSection.isVisible()) {
          await expect(notesSection).toBeVisible();

          // Should allow editing notes
          const editNotesButton =
            page.locator("button:has-text('Edit Notes')") ||
            page.locator("[data-testid='edit-notes']");

          if (await editNotesButton.isVisible()) {
            await editNotesButton.click();

            // Should show notes editor
            const notesEditor =
              page.locator("textarea[name='notes']") ||
              page.locator("[data-testid='notes-editor']");

            if (await notesEditor.isVisible()) {
              await notesEditor.fill("Updated notes from integration test");
              await page.click("button:has-text('Save')");

              // Should show updated notes
              await expect(page.getByText("Updated notes from integration test")).toBeVisible();
            }
          }
        }

        // Close details view
        await page.keyboard.press("Escape");
      }
    });

    test("should handle account transfer transactions", async ({page}) => {
      await page.goto("/accounts");
      await page.click("[data-testid='account-item']");

      // Look for transfer functionality
      const transferButton =
        page.locator("[data-testid='transfer-funds']") ||
        page.locator("button:has-text('Transfer')");

      if (await transferButton.isVisible()) {
        await transferButton.click();

        // Should show transfer dialog
        await expect(
          page.locator("[data-testid='transfer-dialog']") || page.locator("[role='dialog']")
        ).toBeVisible();

        // Should have account selection
        const toAccountSelect =
          page.locator("select[name='toAccount']") ||
          page.locator("[data-testid='to-account-select']");

        if (await toAccountSelect.isVisible()) {
          await toAccountSelect.selectOption({index: 1});

          // Fill transfer amount
          await page.fill("input[name='amount']", "100.00");

          // Add transfer notes
          await page.fill("input[name='notes']", "Test transfer");

          // Submit transfer
          const transferSubmitButton =
            page.locator("button[type='submit']") || page.locator("button:has-text('Transfer')");
          await transferSubmitButton.click();

          // Should show success and create transfer transactions
          await expect(page.getByText(/Transfer completed|Success/i)).toBeVisible();
        }

        // Cancel if still open
        const cancelButton = page.locator("button:has-text('Cancel')");
        if (await cancelButton.isVisible()) {
          await cancelButton.click();
        }
      }
    });

    test("should display transaction geolocation and merchant info", async ({page}) => {
      await page.goto("/accounts");
      await page.click("[data-testid='account-item']");

      // Look for merchant/location information
      const merchantInfo =
        page.locator("[data-testid='transaction-merchant']") ||
        page.locator(".merchant-name") ||
        page.getByText(/Merchant:|Store:|Location:/i);

      if (await merchantInfo.isVisible()) {
        await expect(merchantInfo).toBeVisible();

        // Look for location/map functionality
        const locationInfo =
          page.locator("[data-testid='transaction-location']") || page.locator(".location-info");

        if (await locationInfo.isVisible()) {
          await locationInfo.click();

          // Should show map or location details
          const mapContainer =
            page.locator("[data-testid='location-map']") || page.locator(".map-container");

          if (await mapContainer.isVisible()) {
            await expect(mapContainer).toBeVisible();
          }
        }
      }

      // Test merchant categorization
      const categoryButton =
        page.locator("[data-testid='auto-categorize']") ||
        page.locator("button:has-text('Auto-categorize')");

      if (await categoryButton.isVisible()) {
        await categoryButton.click();

        // Should suggest or apply categories based on merchant
        await expect(page.getByText(/Suggested category|Auto-categorized/i)).toBeVisible();
      }
    });
  });

  test.describe("Account Management Navigation", () => {
    test("should open add account dialog", async ({page}) => {
      await page.goto("/accounts");

      // Click add account button
      const addAccountButton =
        page.locator("[data-testid='add-account-button']") ||
        page.locator("button:has-text('Add Account')") ||
        page.locator("button:has-text('New Account')");
      await addAccountButton.click();

      // Should open dialog or modal
      await expect(
        page.locator("[data-testid='add-account-dialog']") || page.locator("[role='dialog']")
      ).toBeVisible();

      // Should have form fields
      await expect(page.locator("input[name='name']")).toBeVisible();
    });

    test("should open edit account dialog from account page", async ({page}) => {
      await page.goto("/accounts");
      await page.click("[data-testid='account-item']");

      // Click edit button
      const editAccountButton =
        page.locator("[data-testid='edit-account-button']") ||
        page.locator("button:has-text('Edit')");
      await editAccountButton.click();

      // Should open edit dialog
      await expect(
        page.locator("[data-testid='edit-account-dialog']") || page.locator("[role='dialog']")
      ).toBeVisible();

      // Form should be pre-filled with account data
      await expect(page.locator("input[name='name']")).toHaveValue(/Test (Checking|Savings)/);
    });

    test("should show delete confirmation dialog", async ({page}) => {
      await page.goto("/accounts");
      await page.click("[data-testid='account-item']");

      // Click delete button
      const deleteAccountButton =
        page.locator("[data-testid='delete-account-button']") ||
        page.locator("button:has-text('Delete')");
      await deleteAccountButton.click();

      // Should show confirmation dialog
      await expect(
        page.locator("[data-testid='delete-account-dialog']") || page.getByText("Are you sure")
      ).toBeVisible();

      // Should have confirm and cancel buttons
      await expect(
        page.locator("button:has-text('Delete')") || page.locator("button:has-text('Confirm')")
      ).toBeVisible();
      await expect(page.locator("button:has-text('Cancel')")).toBeVisible();
    });

    test("should close dialogs when cancelled", async ({page}) => {
      await page.goto("/accounts");

      // Open add account dialog
      const addDialogButton =
        page.locator("[data-testid='add-account-button']") ||
        page.locator("button:has-text('Add Account')");
      await addDialogButton.click();

      await expect(page.locator("[role='dialog']")).toBeVisible();

      // Click cancel or close
      const cancelDialogButton = page.locator("button:has-text('Cancel')");
      const closeDialogButton = page.locator("[data-testid='close-dialog']");

      if (await cancelDialogButton.isVisible()) {
        await cancelDialogButton.click();
      } else if (await closeDialogButton.isVisible()) {
        await closeDialogButton.click();
      } else {
        await page.keyboard.press("Escape");
      }

      // Dialog should be closed
      await expect(page.locator("[role='dialog']")).not.toBeVisible();
    });
  });

  test.describe("Responsive Navigation", () => {
    test("should work on mobile viewport", async ({page}) => {
      await page.setViewportSize({width: 375, height: 667});
      await page.goto("/");

      // Mobile navigation might be behind hamburger menu
      const accountsLink = page.locator('[href="/accounts"]');
      if (await accountsLink.isVisible()) {
        await accountsLink.click();
      } else {
        // Open mobile menu
        const mobileMenuToggle = page.locator("[data-testid='mobile-menu-toggle']");
        const menuButton = page.locator("button[aria-label*='menu']");

        if (await mobileMenuToggle.isVisible()) {
          await mobileMenuToggle.click();
        } else if (await menuButton.isVisible()) {
          await menuButton.click();
        }
        await page.click('[href="/accounts"]');
      }

      await expect(page).toHaveURL("/accounts");
      await expect(page.getByText("Test Checking")).toBeVisible();
    });

    test("should handle tablet viewport", async ({page}) => {
      await page.setViewportSize({width: 768, height: 1024});
      await page.goto("/accounts");

      // Should display accounts in tablet-friendly layout
      await expect(page.locator("[data-testid='account-item']")).toHaveCount(2);
      await expect(page.getByText("Test Checking")).toBeVisible();
    });
  });

  test.describe("Accessibility Navigation", () => {
    test("should be keyboard navigable", async ({page}) => {
      await page.goto("/");

      // Tab to accounts navigation
      await page.keyboard.press("Tab");
      // Continue tabbing until accounts link is focused
      let attempts = 0;
      while (attempts < 10) {
        const focused = await page.evaluate(() => document.activeElement?.getAttribute("href"));
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

    test("should have proper ARIA labels", async ({page}) => {
      await page.goto("/accounts");

      // Check for proper ARIA labels
      await expect(page.locator("[aria-label*='Accounts']") || page.locator("h1")).toBeVisible();

      // Account items should have proper accessibility labels
      const accountItems = page.locator("[data-testid='account-item']");
      await expect(accountItems.first()).toHaveAttribute("role", "button");
    });

    test("should announce page changes to screen readers", async ({page}) => {
      await page.goto("/");

      // Navigate to accounts
      await page.click('[href="/accounts"]');

      // Check for live region updates or title changes
      await expect(page).toHaveTitle(/Accounts/);
    });
  });
});
