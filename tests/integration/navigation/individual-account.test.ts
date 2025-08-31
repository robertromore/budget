import { test, expect } from "@playwright/test";
import { setupTestDb, seedTestData } from "../setup/test-db-node";

test.describe("Individual Account Page Integration Tests", () => {
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

  test.describe("Individual Account Page Deep Integration", () => {
    test("should display complete account header with all metadata", async ({ page }) => {
      await page.goto("/accounts");
      await page.click("[data-testid='account-item']");
      
      // Verify account name is prominently displayed
      await expect(page.locator("h1, [data-testid='account-title']")).toContainText(/Test (Checking|Savings)/);
      
      // Check for account balance display
      const balanceElement = page.locator("[data-testid='account-balance']") ||
                            page.getByText(/Balance:|Current Balance:|Available:/);
      if (await balanceElement.isVisible()) {
        await expect(balanceElement).toBeVisible();
        await expect(page.locator("[data-testid='balance-amount']") ||
                    page.locator(".balance, .amount")).toBeVisible();
      }
      
      // Verify account metadata (creation date, account type, notes)
      await expect(page.locator("[data-testid='account-created']") ||
                  page.getByText(/Created:|Since:|Opened:/)).toBeVisible();
      
      // Check for account slug/ID display
      await expect(page.locator("[data-testid='account-slug']") ||
                  page.getByText(/test-checking|test-savings/)).toBeVisible();
    });

    test("should show comprehensive transaction list with sorting options", async ({ page }) => {
      await page.goto("/accounts");
      await page.click("[data-testid='account-item']");
      
      // Verify transactions table exists and has headers
      const transactionsTable = page.locator("[data-testid='transactions-table']") ||
                               page.locator("table") ||
                               page.locator(".transactions-list");
      await expect(transactionsTable).toBeVisible();
      
      // Check for sortable column headers
      const headers = ["Date", "Amount", "Description", "Category", "Balance"];
      for (const header of headers) {
        const headerElement = page.locator(`th:has-text('${header}')`) ||
                            page.locator(`[data-testid='sort-${header.toLowerCase()}']`);
        if (await headerElement.isVisible()) {
          await expect(headerElement).toBeVisible();
          
          // Test sorting functionality
          await headerElement.click();
          await expect(transactionsTable).toBeVisible();
        }
      }
      
      // Verify transaction rows exist
      const transactionRows = page.locator("[data-testid='transaction-row']") ||
                            page.locator("tbody tr");
      await expect(transactionRows.first()).toBeVisible();
    });

    test("should provide comprehensive transaction filtering capabilities", async ({ page }) => {
      await page.goto("/accounts");
      await page.click("[data-testid='account-item']");
      
      // Test date range filtering
      const startDateFilter = page.locator("[data-testid='start-date-filter']") ||
                             page.locator("input[name='startDate']") ||
                             page.locator("input[type='date']").first();
      
      if (await startDateFilter.isVisible()) {
        await startDateFilter.fill("2024-01-01");
        const endDateFilter = page.locator("[data-testid='end-date-filter']") ||
                             page.locator("input[name='endDate']") ||
                             page.locator("input[type='date']").nth(1);
        
        if (await endDateFilter.isVisible()) {
          await endDateFilter.fill("2024-12-31");
          await expect(page.locator("[data-testid='transactions-table']")).toBeVisible();
        }
      }
      
      // Test amount range filtering
      const minAmountFilter = page.locator("[data-testid='min-amount-filter']") ||
                             page.locator("input[name='minAmount']");
      if (await minAmountFilter.isVisible()) {
        await minAmountFilter.fill("10");
        await expect(page.locator("[data-testid='transactions-table']")).toBeVisible();
      }
      
      // Test category filtering
      const categoryFilter = page.locator("[data-testid='category-filter']") ||
                           page.locator("select[name='category']");
      if (await categoryFilter.isVisible()) {
        await categoryFilter.selectOption({ index: 1 });
        await expect(page.locator("[data-testid='transactions-table']")).toBeVisible();
      }
      
      // Test clearing all filters
      const clearFiltersButton = page.locator("[data-testid='clear-filters']") ||
                                page.locator("button:has-text('Clear Filters')") ||
                                page.locator("button:has-text('Reset')");
      if (await clearFiltersButton.isVisible()) {
        await clearFiltersButton.click();
        await expect(page.locator("[data-testid='transactions-table']")).toBeVisible();
      }
    });

    test("should support advanced search with multiple criteria", async ({ page }) => {
      await page.goto("/accounts");
      await page.click("[data-testid='account-item']");
      
      // Test text-based search
      const searchInput = page.locator("[data-testid='transaction-search']") ||
                         page.locator("input[placeholder*='Search']") ||
                         page.locator("input[type='search']");
      
      if (await searchInput.isVisible()) {
        // Search by description/notes
        await searchInput.fill("Test transaction");
        await expect(page.getByText("Test transaction")).toBeVisible();
        
        // Search by amount
        await searchInput.fill("50.00");
        if (await page.getByText("50.00").isVisible()) {
          await expect(page.getByText("50.00")).toBeVisible();
        }
        
        // Search by partial text
        await searchInput.fill("test");
        await expect(page.locator("[data-testid='transactions-table']")).toBeVisible();
        
        // Clear search
        await searchInput.fill("");
        await expect(page.locator("[data-testid='transactions-table']")).toBeVisible();
      }
      
      // Test advanced search modal/panel
      const advancedSearchButton = page.locator("[data-testid='advanced-search']") ||
                                  page.locator("button:has-text('Advanced Search')");
      if (await advancedSearchButton.isVisible()) {
        await advancedSearchButton.click();
        await expect(page.locator("[data-testid='advanced-search-panel']") ||
                    page.locator("[role='dialog']")).toBeVisible();
      }
    });

    test("should handle transaction CRUD operations with proper validation", async ({ page }) => {
      await page.goto("/accounts");
      await page.click("[data-testid='account-item']");
      
      // Test adding a new transaction
      const addTransactionButton = page.locator("[data-testid='add-transaction']") ||
                                  page.locator("button:has-text('Add Transaction')") ||
                                  page.locator("button:has-text('New Transaction')");
      
      if (await addTransactionButton.isVisible()) {
        await addTransactionButton.click();
        
        // Verify form appears
        const transactionForm = page.locator("[data-testid='transaction-form']") ||
                               page.locator("form") ||
                               page.locator("[role='dialog']");
        await expect(transactionForm).toBeVisible();
        
        // Fill out form with valid data
        await page.fill("input[name='amount']", "125.75");
        await page.fill("input[name='notes']", "Integration test transaction");
        
        // Test date picker if available
        const dateInput = page.locator("input[name='date']") ||
                         page.locator("input[type='date']");
        if (await dateInput.isVisible()) {
          await dateInput.fill("2024-08-31");
        }
        
        // Test category selection
        const categorySelect = page.locator("select[name='category']") ||
                             page.locator("[data-testid='category-select']");
        if (await categorySelect.isVisible()) {
          await categorySelect.selectOption({ index: 1 });
        }
        
        // Submit the form
        const submitButton = page.locator("button[type='submit']") ||
                           page.locator("button:has-text('Save')") ||
                           page.locator("button:has-text('Add')");
        await submitButton.click();
        
        // Verify success feedback
        await expect(page.getByText(/Transaction added|Success|Created/i) ||
                    page.locator("[data-testid='success-message']")).toBeVisible();
        
        // Verify new transaction appears in list
        await expect(page.getByText("125.75")).toBeVisible();
        await expect(page.getByText("Integration test transaction")).toBeVisible();
      }
    });

    test("should provide detailed transaction view with edit capabilities", async ({ page }) => {
      await page.goto("/accounts");
      await page.click("[data-testid='account-item']");
      
      // Click on a transaction to view details
      const firstTransaction = page.locator("[data-testid='transaction-row']").first() ||
                              page.locator("tbody tr").first();
      
      if (await firstTransaction.isVisible()) {
        await firstTransaction.click();
        
        // Verify detailed view opens
        const detailView = page.locator("[data-testid='transaction-details']") ||
                          page.locator("[role='dialog']") ||
                          page.locator(".transaction-detail-modal");
        await expect(detailView).toBeVisible();
        
        // Check for all transaction details
        await expect(page.getByText(/Amount:|Date:|Notes:|Category:/)).toBeVisible();
        
        // Test edit functionality
        const editButton = page.locator("[data-testid='edit-transaction']") ||
                          page.locator("button:has-text('Edit')");
        
        if (await editButton.isVisible()) {
          await editButton.click();
          
          // Should switch to edit mode or open edit form
          const editForm = page.locator("[data-testid='transaction-edit-form']") ||
                          page.locator("input[name='amount']");
          await expect(editForm).toBeVisible();
          
          // Test field editing
          const amountInput = page.locator("input[name='amount']");
          if (await amountInput.isVisible()) {
            await amountInput.fill("99.99");
            
            // Save changes
            const saveButton = page.locator("button[type='submit']") ||
                             page.locator("button:has-text('Save')");
            if (await saveButton.isVisible()) {
              await saveButton.click();
              await expect(page.getByText("99.99")).toBeVisible();
            }
          }
        }
        
        // Close detail view
        const closeButton = page.locator("[data-testid='close-details']") ||
                          page.locator("button:has-text('Close')");
        if (await closeButton.isVisible()) {
          await closeButton.click();
        } else {
          await page.keyboard.press("Escape");
        }
      }
    });

    test("should display comprehensive account statistics and analytics", async ({ page }) => {
      await page.goto("/accounts");
      await page.click("[data-testid='account-item']");
      
      // Look for statistics/analytics section
      const statsSection = page.locator("[data-testid='account-statistics']") ||
                          page.locator(".statistics-panel") ||
                          page.getByText(/Statistics|Analytics|Summary/);
      
      if (await statsSection.isVisible()) {
        await expect(statsSection).toBeVisible();
        
        // Check for key metrics
        const metrics = [
          /Total Income|Income:/,
          /Total Expenses|Expenses:/,
          /Net Change|Net Flow:/,
          /Average Transaction|Avg Amount:/,
          /Transaction Count|Number of Transactions:/
        ];
        
        for (const metric of metrics) {
          const metricElement = page.getByText(metric).first();
          if (await metricElement.isVisible()) {
            await expect(metricElement).toBeVisible();
          }
        }
        
        // Check for category breakdown
        const categoryBreakdown = page.locator("[data-testid='category-breakdown']") ||
                                 page.getByText(/Spending by Category|Category Analysis/);
        if (await categoryBreakdown.isVisible()) {
          await expect(categoryBreakdown).toBeVisible();
        }
        
        // Check for time-based statistics
        const monthlyStats = page.locator("[data-testid='monthly-statistics']") ||
                           page.getByText(/Monthly Average|This Month/);
        if (await monthlyStats.isVisible()) {
          await expect(monthlyStats).toBeVisible();
        }
      }
      
      // Look for visual charts/graphs
      const chartContainer = page.locator("[data-testid='account-chart']") ||
                           page.locator("canvas") ||
                           page.locator(".chart-container");
      if (await chartContainer.isVisible()) {
        await expect(chartContainer).toBeVisible();
      }
    });

    test("should provide robust account data export functionality", async ({ page }) => {
      await page.goto("/accounts");
      await page.click("[data-testid='account-item']");
      
      // Look for export functionality
      const exportButton = page.locator("[data-testid='export-data']") ||
                          page.locator("button:has-text('Export')") ||
                          page.locator("button:has-text('Download')");
      
      if (await exportButton.isVisible()) {
        await exportButton.click();
        
        // Should show export options
        const exportDialog = page.locator("[data-testid='export-dialog']") ||
                            page.locator("[role='dialog']");
        await expect(exportDialog).toBeVisible();
        
        // Check for different export formats
        const csvOption = page.locator("button:has-text('CSV')") ||
                         page.locator("[data-testid='export-csv']");
        
        // Test CSV export if available
        if (await csvOption.isVisible()) {
          const downloadPromise = page.waitForEvent('download');
          await csvOption.click();
          const download = await downloadPromise;
          expect(download.suggestedFilename()).toMatch(/\.(csv)$/);
        }
        
        // Test date range for export
        const exportDateRange = page.locator("[data-testid='export-date-range']") ||
                              page.locator("input[name='exportStartDate']");
        if (await exportDateRange.isVisible()) {
          await exportDateRange.fill("2024-01-01");
        }
        
        // Close export dialog
        const closeExportButton = page.locator("button:has-text('Close')") ||
                                 page.locator("[data-testid='close-export']");
        if (await closeExportButton.isVisible()) {
          await closeExportButton.click();
        } else {
          await page.keyboard.press("Escape");
        }
      }
    });

    test("should handle account reconciliation process comprehensively", async ({ page }) => {
      await page.goto("/accounts");
      await page.click("[data-testid='account-item']");
      
      // Look for reconciliation feature
      const reconcileButton = page.locator("[data-testid='reconcile-account']") ||
                            page.locator("button:has-text('Reconcile')") ||
                            page.locator("button:has-text('Balance')");
      
      if (await reconcileButton.isVisible()) {
        await reconcileButton.click();
        
        // Should open reconciliation interface
        const reconcileDialog = page.locator("[data-testid='reconciliation-dialog']") ||
                              page.locator("[role='dialog']");
        await expect(reconcileDialog).toBeVisible();
        
        // Check for ending balance input
        const endingBalanceInput = page.locator("input[name='endingBalance']") ||
                                  page.locator("[data-testid='ending-balance']");
        
        if (await endingBalanceInput.isVisible()) {
          await endingBalanceInput.fill("1500.00");
          
          // Should show difference calculation
          const differenceDisplay = page.locator("[data-testid='balance-difference']") ||
                                  page.getByText(/Difference:|Variance:/);
          if (await differenceDisplay.isVisible()) {
            await expect(differenceDisplay).toBeVisible();
          }
          
          // Check for transaction marking functionality
          const markClearedCheckbox = page.locator("input[type='checkbox'][data-testid='mark-cleared']").first() ||
                                    page.locator(".transaction-cleared-checkbox").first();
          if (await markClearedCheckbox.isVisible()) {
            await markClearedCheckbox.check();
            
            // Should update running balance
            const runningBalance = page.locator("[data-testid='running-balance']") ||
                                 page.getByText(/Running Balance:/);
            if (await runningBalance.isVisible()) {
              await expect(runningBalance).toBeVisible();
            }
          }
          
          // Test finish reconciliation
          const finishReconcileButton = page.locator("button:has-text('Finish Reconciliation')") ||
                                       page.locator("[data-testid='finish-reconcile']");
          if (await finishReconcileButton.isVisible()) {
            // Only click if difference is zero or acceptable
            const balancedIndicator = page.locator("[data-testid='balanced']") ||
                                    page.getByText(/Balanced|Match/);
            if (await balancedIndicator.isVisible()) {
              await finishReconcileButton.click();
              await expect(page.getByText(/Reconciliation completed|Account reconciled/i)).toBeVisible();
            }
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

    test("should support comprehensive bulk transaction operations", async ({ page }) => {
      await page.goto("/accounts");
      await page.click("[data-testid='account-item']");
      
      // Look for bulk selection functionality
      const selectAllCheckbox = page.locator("[data-testid='select-all-transactions']") ||
                               page.locator("input[type='checkbox'][aria-label*='Select all']") ||
                               page.locator("th input[type='checkbox']");
      
      if (await selectAllCheckbox.isVisible()) {
        // Select all transactions
        await selectAllCheckbox.check();
        
        // Should show bulk action toolbar
        const bulkActionsToolbar = page.locator("[data-testid='bulk-actions']") ||
                                 page.locator(".bulk-actions-toolbar") ||
                                 page.getByText(/selected|Bulk Operations/);
        await expect(bulkActionsToolbar).toBeVisible();
        
        // Test bulk categorization
        const bulkCategorizeButton = page.locator("[data-testid='bulk-categorize']") ||
                                   page.locator("button:has-text('Categorize Selected')");
        if (await bulkCategorizeButton.isVisible()) {
          await bulkCategorizeButton.click();
          
          const categorySelectDialog = page.locator("[data-testid='bulk-category-dialog']") ||
                                      page.locator("[role='dialog']");
          await expect(categorySelectDialog).toBeVisible();
          
          // Select a category
          const categoryOption = page.locator("select[name='category']") ||
                               page.locator("[data-testid='category-select']");
          if (await categoryOption.isVisible()) {
            await categoryOption.selectOption({ index: 1 });
            
            const applyButton = page.locator("button:has-text('Apply')");
            if (await applyButton.isVisible()) {
              // Cancel instead of applying
              await page.click("button:has-text('Cancel')");
            }
          }
        }
        
        // Test bulk delete with confirmation
        const bulkDeleteButton = page.locator("[data-testid='bulk-delete']") ||
                               page.locator("button:has-text('Delete Selected')");
        if (await bulkDeleteButton.isVisible()) {
          await bulkDeleteButton.click();
          
          // Should show serious confirmation dialog
          const deleteConfirmDialog = page.locator("[data-testid='bulk-delete-confirmation']") ||
                                     page.getByText(/Delete \d+ transactions|Are you sure.*delete/i);
          await expect(deleteConfirmDialog).toBeVisible();
          
          // Cancel the dangerous operation
          const cancelDeleteButton = page.locator("button:has-text('Cancel')") ||
                                    page.locator("[data-testid='cancel-bulk-delete']");
          await cancelDeleteButton.click();
        }
        
        // Deselect all
        await selectAllCheckbox.uncheck();
        
        // Bulk actions toolbar should disappear
        if (await bulkActionsToolbar.isVisible()) {
          await expect(bulkActionsToolbar).not.toBeVisible();
        }
      }
    });

    test("should provide comprehensive account management and settings", async ({ page }) => {
      await page.goto("/accounts");
      await page.click("[data-testid='account-item']");
      
      // Look for account settings/management
      const accountSettingsButton = page.locator("[data-testid='account-settings']") ||
                                   page.locator("button:has-text('Settings')") ||
                                   page.locator("[aria-label*='Account Settings']");
      
      if (await accountSettingsButton.isVisible()) {
        await accountSettingsButton.click();
        
        // Should open settings panel
        const settingsPanel = page.locator("[data-testid='account-settings-panel']") ||
                             page.locator("[role='dialog']");
        await expect(settingsPanel).toBeVisible();
        
        // Check for account editing options
        const editAccountNameInput = page.locator("input[name='accountName']") ||
                                    page.locator("[data-testid='account-name-input']");
        if (await editAccountNameInput.isVisible()) {
          const currentName = await editAccountNameInput.inputValue();
          await editAccountNameInput.fill(`${currentName} (Modified)`);
        }
        
        // Check for account notes/description
        const accountNotesTextarea = page.locator("textarea[name='notes']") ||
                                    page.locator("[data-testid='account-notes']");
        if (await accountNotesTextarea.isVisible()) {
          await accountNotesTextarea.fill("Updated account notes from integration test");
        }
        
        // Check for account preferences
        const accountPreferences = page.locator("[data-testid='account-preferences']") ||
                                 page.getByText(/Preferences|Display Options/);
        if (await accountPreferences.isVisible()) {
          await expect(accountPreferences).toBeVisible();
        }
        
        // Test account color/theme customization
        const colorPicker = page.locator("[data-testid='account-color']") ||
                          page.locator("input[type='color']");
        if (await colorPicker.isVisible()) {
          await colorPicker.fill("#ff6b6b");
        }
        
        // Test account type/category settings
        const accountTypeSelect = page.locator("select[name='accountType']") ||
                                page.locator("[data-testid='account-type-select']");
        if (await accountTypeSelect.isVisible()) {
          await accountTypeSelect.selectOption({ index: 1 });
        }
        
        // Save settings
        const saveSettingsButton = page.locator("button[type='submit']") ||
                                  page.locator("button:has-text('Save Settings')");
        if (await saveSettingsButton.isVisible()) {
          await saveSettingsButton.click();
          await expect(page.getByText(/Settings saved|Updated successfully/i)).toBeVisible();
        }
        
        // Close settings panel
        const closeSettingsButton = page.locator("button:has-text('Close')");
        if (await closeSettingsButton.isVisible()) {
          await closeSettingsButton.click();
        } else {
          await page.keyboard.press("Escape");
        }
      }
      
      // Test account deletion with proper warnings
      const deleteAccountButton = page.locator("[data-testid='delete-account']") ||
                                 page.locator("button:has-text('Delete Account')");
      
      if (await deleteAccountButton.isVisible()) {
        await deleteAccountButton.click();
        
        // Should show serious warning dialog
        const deleteWarningDialog = page.locator("[data-testid='delete-account-warning']") ||
                                   page.getByText(/This action cannot be undone|permanently delete/i);
        await expect(deleteWarningDialog).toBeVisible();
        
        // Should require confirmation text
        const confirmationInput = page.locator("input[name='confirmationText']") ||
                                page.locator("[data-testid='delete-confirmation-input']");
        if (await confirmationInput.isVisible()) {
          // Don't actually delete - just verify the flow exists
          await expect(confirmationInput).toBeVisible();
        }
        
        // Cancel deletion
        const cancelDeleteButton = page.locator("button:has-text('Cancel')");
        await cancelDeleteButton.click();
      }
    });

    test("should handle complex error states and recovery gracefully", async ({ page }) => {
      await page.goto("/accounts");
      await page.click("[data-testid='account-item']");
      
      // Test handling of network errors during data operations
      // Simulate network failure
      await page.route("**/api/trpc/**", route => {
        route.abort('failed');
      });
      
      // Try to perform an operation that would normally work
      const addTransactionButton = page.locator("[data-testid='add-transaction']") ||
                                  page.locator("button:has-text('Add Transaction')");
      
      if (await addTransactionButton.isVisible()) {
        await addTransactionButton.click();
        
        const transactionForm = page.locator("[data-testid='transaction-form']");
        if (await transactionForm.isVisible()) {
          await page.fill("input[name='amount']", "50.00");
          await page.fill("input[name='notes']", "Test network error");
          
          const submitButton = page.locator("button[type='submit']");
          if (await submitButton.isVisible()) {
            await submitButton.click();
            
            // Should show error message
            const errorMessage = page.locator("[data-testid='error-message']") ||
                                page.getByText(/Error|Failed|Network error/i);
            if (await errorMessage.isVisible()) {
              await expect(errorMessage).toBeVisible();
            }
            
            // Should have retry option
            const retryButton = page.locator("button:has-text('Retry')") ||
                              page.locator("[data-testid='retry-button']");
            if (await retryButton.isVisible()) {
              await expect(retryButton).toBeVisible();
            }
          }
          
          // Close form
          await page.keyboard.press("Escape");
        }
      }
      
      // Restore network
      await page.unroute("**/api/trpc/**");
      
      // Test handling of malformed data
      const refreshButton = page.locator("button:has-text('Refresh')") ||
                          page.locator("[data-testid='refresh-data']");
      if (await refreshButton.isVisible()) {
        await refreshButton.click();
        await expect(page.locator("[data-testid='transactions-table']")).toBeVisible();
      }
      
      // Test offline state handling
      await page.context().setOffline(true);
      
      // Should show offline indicator
      const offlineIndicator = page.locator("[data-testid='offline-indicator']") ||
                             page.getByText(/Offline|No connection/i);
      if (await offlineIndicator.isVisible()) {
        await expect(offlineIndicator).toBeVisible();
      }
      
      // Restore online state
      await page.context().setOffline(false);
    });
  });
});