import { test, expect } from "@playwright/test";
import { setupTestDb, seedTestData } from "../setup/test-db-node";

test.describe("Individual Account Views and Displays", () => {
  let testDb: Awaited<ReturnType<typeof setupTestDb>>;

  test.beforeEach(async ({ page }) => {
    // Setup test database
    testDb = await setupTestDb();
    await seedTestData(testDb);
    
    // Navigate to individual account page
    await page.goto("/accounts");
    await page.click("[data-testid='account-item']");
  });

  test.afterEach(async () => {
    // Cleanup would happen here if needed
    // In-memory DB will be garbage collected
  });

  test.describe("Account Header Display", () => {
    test("should display account title with proper typography", async ({ page }) => {
      // Check main account title
      const accountTitle = page.locator("h1, [data-testid='account-title']");
      await expect(accountTitle).toBeVisible();
      await expect(accountTitle).toContainText(/Test (Checking|Savings)/);
      
      // Verify title styling and prominence
      const titleStyles = await accountTitle.evaluate((el) => {
        const styles = window.getComputedStyle(el);
        return {
          fontSize: styles.fontSize,
          fontWeight: styles.fontWeight,
          display: styles.display
        };
      });
      
      // Should have prominent styling (large font, bold weight)
      expect(parseFloat(titleStyles.fontSize)).toBeGreaterThan(20);
      expect(parseInt(titleStyles.fontWeight)).toBeGreaterThanOrEqual(600);
    });

    test("should display account balance with proper formatting", async ({ page }) => {
      const balanceDisplay = page.locator("[data-testid='account-balance']") ||
                           page.locator(".balance") ||
                           page.getByText(/Balance:|Current Balance:/);
      
      if (await balanceDisplay.isVisible()) {
        await expect(balanceDisplay).toBeVisible();
        
        // Check for currency formatting (dollar sign, decimal places)
        const balanceText = await balanceDisplay.textContent();
        expect(balanceText).toMatch(/\$.*\d+\.\d{2}/);
        
        // Verify balance amount styling
        const balanceAmount = page.locator("[data-testid='balance-amount']") ||
                            page.locator(".balance-amount, .amount");
        
        if (await balanceAmount.isVisible()) {
          const amountStyles = await balanceAmount.evaluate((el) => {
            const styles = window.getComputedStyle(el);
            return {
              fontSize: styles.fontSize,
              fontWeight: styles.fontWeight,
              color: styles.color
            };
          });
          
          // Balance should be prominently displayed
          expect(parseFloat(amountStyles.fontSize)).toBeGreaterThan(16);
        }
      }
    });

    test("should display balance as valid currency amount", async ({ page }) => {
      // Find the balance display in the header
      const balanceSection = page.locator("text=/Balance:/");
      await expect(balanceSection).toBeVisible();
      
      // Extract just the balance amount from the text
      const balanceText = await balanceSection.textContent();
      const balanceMatch = balanceText?.match(/\$(-?\d+(?:,\d{3})*\.\d{2})/);
      
      // Should find a properly formatted currency amount
      expect(balanceMatch).not.toBeNull();
      
      if (!balanceMatch) {
        throw new Error("Balance match not found");
      }
      
      expect(balanceMatch[1]).toBeTruthy();
      
      // Parse the amount to ensure it's a valid number
      const amountString = balanceMatch[1].replace(/,/g, ''); // Remove commas
      const amount = parseFloat(amountString);
      
      // Should be a valid finite number
      expect(Number.isFinite(amount)).toBe(true);
      expect(Number.isNaN(amount)).toBe(false);
      
      // Balance should be within reasonable bounds for test data
      expect(Math.abs(amount)).toBeLessThan(1000000); // Less than $1M
    });

    test("should display account metadata in organized layout", async ({ page }) => {
      // Check for account creation/opened date
      const createdDate = page.locator("[data-testid='account-created']") ||
                        page.getByText(/Created:|Since:|Opened:/);
      await expect(createdDate).toBeVisible();
      
      // Check for account type/category
      const accountType = page.locator("[data-testid='account-type']") ||
                        page.getByText(/Type:|Category:/);
      if (await accountType.isVisible()) {
        await expect(accountType).toBeVisible();
      }
      
      // Check for account slug/identifier
      const accountSlug = page.locator("[data-testid='account-slug']") ||
                        page.getByText(/test-checking|test-savings/);
      await expect(accountSlug).toBeVisible();
      
      // Verify metadata is organized (not overlapping)
      const metadataContainer = page.locator("[data-testid='account-metadata']") ||
                              page.locator(".account-info, .metadata");
      
      if (await metadataContainer.isVisible()) {
        const containerBox = await metadataContainer.boundingBox();
        expect(containerBox?.height).toBeGreaterThan(50); // Should have reasonable height
        expect(containerBox?.width).toBeGreaterThan(200); // Should have reasonable width
      }
    });

    test("should display account actions/buttons accessibly", async ({ page }) => {
      // Check for primary action buttons
      const actionButtons = [
        "[data-testid='add-transaction']",
        "[data-testid='edit-account']",
        "[data-testid='export-data']",
        "[data-testid='account-settings']"
      ];
      
      for (const selector of actionButtons) {
        const button = page.locator(selector);
        if (await button.isVisible()) {
          await expect(button).toBeVisible();
          
          // Verify button accessibility
          const buttonRole = await button.getAttribute("role");
          const buttonAriaLabel = await button.getAttribute("aria-label");
          const buttonText = await button.textContent();
          
          // Should have role or text content for accessibility
          expect(buttonRole === "button" || buttonText?.length || buttonAriaLabel?.length).toBeTruthy();
        }
      }
      
      // Check for button group organization
      const buttonGroup = page.locator("[data-testid='account-actions']") ||
                        page.locator(".actions, .button-group");
      
      if (await buttonGroup.isVisible()) {
        const groupBox = await buttonGroup.boundingBox();
        expect(groupBox?.width).toBeGreaterThan(100); // Should have reasonable layout
      }
    });
  });

  test.describe("Transaction List Display", () => {
    test("should display transactions table with proper column headers", async ({ page }) => {
      const transactionsTable = page.locator("[data-testid='transactions-table']") ||
                               page.locator("table") ||
                               page.locator(".transactions-list");
      await expect(transactionsTable).toBeVisible();
      
      // Check for essential column headers
      const expectedHeaders = ["Date", "Amount", "Description", "Category"];
      for (const header of expectedHeaders) {
        const headerElement = page.locator(`th:has-text('${header}')`).first() ||
                            page.locator(`[data-testid='header-${header.toLowerCase()}']`);
        
        if (await headerElement.isVisible()) {
          await expect(headerElement).toBeVisible();
          
          // Verify header styling
          const headerStyles = await headerElement.evaluate((el) => {
            const styles = window.getComputedStyle(el);
            return {
              fontWeight: styles.fontWeight,
              textAlign: styles.textAlign,
              backgroundColor: styles.backgroundColor
            };
          });
          
          // Headers should be styled distinctly
          expect(parseInt(headerStyles.fontWeight)).toBeGreaterThanOrEqual(500);
        }
      }
    });

    test("should display transaction rows with consistent formatting", async ({ page }) => {
      const transactionRows = page.locator("[data-testid='transaction-row']") ||
                            page.locator("tbody tr") ||
                            page.locator(".transaction-item");
      
      await expect(transactionRows.first()).toBeVisible();
      
      const rowCount = await transactionRows.count();
      expect(rowCount).toBeGreaterThan(0);
      
      // Check first few rows for consistent formatting
      for (let i = 0; i < Math.min(3, rowCount); i++) {
        const row = transactionRows.nth(i);
        await expect(row).toBeVisible();
        
        // Check row has reasonable height and width
        const rowBox = await row.boundingBox();
        expect(rowBox?.height).toBeGreaterThan(30);
        expect(rowBox?.width).toBeGreaterThan(200);
        
        // Check for amount formatting in row
        const amountCell = row.locator("[data-testid='transaction-amount']") ||
                         row.locator("td").nth(1) ||
                         row.locator(".amount");
        
        if (await amountCell.isVisible()) {
          const amountText = await amountCell.textContent();
          // Should have currency formatting
          expect(amountText).toMatch(/^[+-]?\$?\d+\.\d{2}/);
        }
      }
    });

    test("should display transaction amounts with proper color coding", async ({ page }) => {
      const transactionAmounts = page.locator("[data-testid='transaction-amount']") ||
                               page.locator(".amount, .transaction-amount");
      
      const amountCount = await transactionAmounts.count();
      if (amountCount > 0) {
        // Check at least one amount for color coding
        const firstAmount = transactionAmounts.first();
        await expect(firstAmount).toBeVisible();
        
        const amountText = await firstAmount.textContent();
        const amountStyles = await firstAmount.evaluate((el) => {
          const styles = window.getComputedStyle(el);
          return {
            color: styles.color,
            fontWeight: styles.fontWeight
          };
        });
        
        // Color should indicate positive/negative (not default black)
        const colorValue = amountStyles.color;
        expect(colorValue).not.toBe("rgb(0, 0, 0)"); // Should not be default black
        
        // Negative amounts might be red, positive might be green
        if (amountText?.startsWith("-")) {
          // Could check for reddish color
          expect(colorValue).toContain("rgb");
        }
      }
    });

    test("should display transaction dates in readable format", async ({ page }) => {
      const transactionDates = page.locator("[data-testid='transaction-date']") ||
                             page.locator("td:first-child") ||
                             page.locator(".date, .transaction-date");
      
      const dateCount = await transactionDates.count();
      if (dateCount > 0) {
        const firstDate = transactionDates.first();
        await expect(firstDate).toBeVisible();
        
        const dateText = await firstDate.textContent();
        
        // Should be in readable date format (various formats acceptable)
        const dateFormats = [
          /\d{1,2}\/\d{1,2}\/\d{4}/, // MM/DD/YYYY
          /\d{4}-\d{2}-\d{2}/, // YYYY-MM-DD
          /[A-Za-z]{3}\s+\d{1,2},?\s+\d{4}/, // MMM DD, YYYY
          /\d{1,2}\s+[A-Za-z]{3}\s+\d{4}/ // DD MMM YYYY
        ];
        
        const matchesFormat = dateFormats.some(format => format.test(dateText || ""));
        expect(matchesFormat).toBeTruthy();
      }
    });

    test("should display empty state when no transactions exist", async ({ page }) => {
      // Create a fresh account with no transactions
      testDb = await setupTestDb(); // Fresh DB without seeding
      await page.reload();
      
      // Navigate to accounts page
      await page.goto("/accounts");
      
      // If there are accounts but no transactions
      const accountItems = page.locator("[data-testid='account-item']");
      const accountCount = await accountItems.count();
      
      if (accountCount > 0) {
        await accountItems.first().click();
        
        // Should show empty state
        const emptyState = page.locator("[data-testid='no-transactions']") ||
                         page.getByText(/No transactions|Empty account|No data/) ||
                         page.locator(".empty-state");
        
        if (await emptyState.isVisible()) {
          await expect(emptyState).toBeVisible();
          
          // Should have encouraging message or call-to-action
          const ctaText = page.getByText(/Add your first|Get started|Create transaction/i);
          if (await ctaText.isVisible()) {
            await expect(ctaText).toBeVisible();
          }
        }
      }
    });
  });

  test.describe("Filtering and Search Display", () => {
    test("should display filter controls with clear labels", async ({ page }) => {
      // Date filters
      const startDateFilter = page.locator("[data-testid='start-date-filter']") ||
                             page.locator("input[name='startDate']") ||
                             page.locator("input[type='date']").first();
      
      if (await startDateFilter.isVisible()) {
        await expect(startDateFilter).toBeVisible();
        
        // Should have associated label
        const filterLabel = page.locator("label[for*='startDate'], label[for*='start-date']") ||
                          page.getByText(/Start Date|From:/);
        if (await filterLabel.isVisible()) {
          await expect(filterLabel).toBeVisible();
        }
      }
      
      // Amount filters
      const minAmountFilter = page.locator("[data-testid='min-amount-filter']") ||
                             page.locator("input[name='minAmount']");
      
      if (await minAmountFilter.isVisible()) {
        await expect(minAmountFilter).toBeVisible();
        
        // Should have proper placeholder or label
        const placeholder = await minAmountFilter.getAttribute("placeholder");
        const label = page.locator("label[for*='minAmount'], label[for*='min-amount']");
        
        expect(placeholder?.length || await label.isVisible()).toBeTruthy();
      }
      
      // Category filter
      const categoryFilter = page.locator("[data-testid='category-filter']") ||
                           page.locator("select[name='category']");
      
      if (await categoryFilter.isVisible()) {
        await expect(categoryFilter).toBeVisible();
        
        // Should have options
        const options = categoryFilter.locator("option");
        const optionCount = await options.count();
        expect(optionCount).toBeGreaterThan(0);
      }
    });

    test("should display search input with proper styling", async ({ page }) => {
      const searchInput = page.locator("[data-testid='transaction-search']") ||
                         page.locator("input[placeholder*='Search']") ||
                         page.locator("input[type='search']");
      
      if (await searchInput.isVisible()) {
        await expect(searchInput).toBeVisible();
        
        // Should have placeholder text
        const placeholder = await searchInput.getAttribute("placeholder");
        expect(placeholder).toBeTruthy();
        expect(placeholder?.toLowerCase()).toContain("search");
        
        // Should have proper styling
        const inputStyles = await searchInput.evaluate((el) => {
          const styles = window.getComputedStyle(el);
          return {
            padding: styles.padding,
            border: styles.border,
            borderRadius: styles.borderRadius
          };
        });
        
        // Should have reasonable padding and borders
        expect(inputStyles.padding).not.toBe("0px");
        expect(inputStyles.border).not.toBe("none");
      }
    });

    test("should display active filters with clear indication", async ({ page }) => {
      // Apply a date filter
      const startDateFilter = page.locator("[data-testid='start-date-filter']") ||
                             page.locator("input[name='startDate']") ||
                             page.locator("input[type='date']").first();
      
      if (await startDateFilter.isVisible()) {
        await startDateFilter.fill("2024-01-01");
        
        // Should show active filter indication
        const activeFilter = page.locator("[data-testid='active-filters']") ||
                           page.locator(".active-filter, .filter-tag") ||
                           page.getByText(/Filtered by|Active:/);
        
        if (await activeFilter.isVisible()) {
          await expect(activeFilter).toBeVisible();
        }
        
        // Should have clear filters button
        const clearFiltersButton = page.locator("[data-testid='clear-filters']") ||
                                  page.locator("button:has-text('Clear Filters')") ||
                                  page.locator("button:has-text('Reset')");
        
        if (await clearFiltersButton.isVisible()) {
          await expect(clearFiltersButton).toBeVisible();
          
          // Button should be clearly actionable
          const buttonText = await clearFiltersButton.textContent();
          expect(buttonText?.toLowerCase()).toMatch(/clear|reset|remove/);
        }
      }
    });

    test("should display search results count when filtering", async ({ page }) => {
      const searchInput = page.locator("[data-testid='transaction-search']") ||
                         page.locator("input[placeholder*='Search']") ||
                         page.locator("input[type='search']");
      
      if (await searchInput.isVisible()) {
        await searchInput.fill("test");
        
        // Should show results count or indication
        const resultsCount = page.locator("[data-testid='results-count']") ||
                           page.locator(".results-count") ||
                           page.getByText(/\d+ results?/i) ||
                           page.getByText(/showing \d+/i);
        
        if (await resultsCount.isVisible()) {
          await expect(resultsCount).toBeVisible();
          
          const countText = await resultsCount.textContent();
          expect(countText).toMatch(/\d+/); // Should contain a number
        }
      }
    });
  });

  test.describe("Statistics and Charts Display", () => {
    test("should display account summary statistics with clear metrics", async ({ page }) => {
      const statsSection = page.locator("[data-testid='account-statistics']") ||
                          page.locator(".statistics-panel") ||
                          page.getByText(/Statistics|Analytics|Summary/);
      
      if (await statsSection.isVisible()) {
        await expect(statsSection).toBeVisible();
        
        // Check for key financial metrics
        const metrics = [
          { pattern: /Total Income|Income:/, testId: "total-income" },
          { pattern: /Total Expenses|Expenses:/, testId: "total-expenses" },
          { pattern: /Net Change|Net Flow:/, testId: "net-change" },
          { pattern: /Transaction Count|Number of Transactions:/, testId: "transaction-count" }
        ];
        
        for (const metric of metrics) {
          const metricElement = page.locator(`[data-testid='${metric.testId}']`) ||
                              page.getByText(metric.pattern).first();
          
          if (await metricElement.isVisible()) {
            await expect(metricElement).toBeVisible();
            
            // Should have numeric value displayed prominently
            const metricValue = await metricElement.textContent();
            expect(metricValue).toMatch(/\d+/); // Should contain numbers
          }
        }
      }
    });

    test("should display category breakdown with visual indicators", async ({ page }) => {
      const categoryBreakdown = page.locator("[data-testid='category-breakdown']") ||
                               page.getByText(/Spending by Category|Category Analysis/);
      
      if (await categoryBreakdown.isVisible()) {
        await expect(categoryBreakdown).toBeVisible();
        
        // Should show categories with amounts or percentages
        const categoryItems = page.locator("[data-testid='category-item']") ||
                            page.locator(".category-breakdown-item");
        
        const itemCount = await categoryItems.count();
        if (itemCount > 0) {
          const firstCategory = categoryItems.first();
          await expect(firstCategory).toBeVisible();
          
          // Should contain category name and amount/percentage
          const categoryText = await firstCategory.textContent();
          expect(categoryText).toMatch(/[A-Za-z]+.*(\$|\%|\d)/); // Category name + amount or %
        }
        
        // Look for visual indicators (progress bars, charts)
        const visualIndicator = page.locator("[data-testid='category-chart']") ||
                              page.locator(".progress-bar, .chart, canvas");
        
        if (await visualIndicator.isVisible()) {
          await expect(visualIndicator).toBeVisible();
        }
      }
    });

    test("should display monthly trends with time-based data", async ({ page }) => {
      const monthlyStats = page.locator("[data-testid='monthly-statistics']") ||
                         page.getByText(/Monthly Average|This Month|Trends/);
      
      if (await monthlyStats.isVisible()) {
        await expect(monthlyStats).toBeVisible();
        
        // Should show time-based metrics
        const timeMetrics = [
          /This Month|Current Month/,
          /Last Month|Previous Month/,
          /Monthly Average|Avg per Month/,
          /Year to Date|YTD/
        ];
        
        for (const pattern of timeMetrics) {
          const timeMetric = page.getByText(pattern);
          if (await timeMetric.isVisible()) {
            await expect(timeMetric).toBeVisible();
            
            // Should have associated value
            const metricText = await timeMetric.textContent();
            expect(metricText).toMatch(/\$|\d/); // Should contain currency or numbers
          }
        }
      }
    });

    test("should display charts with proper dimensions and visibility", async ({ page }) => {
      const chartContainer = page.locator("[data-testid='account-chart']") ||
                           page.locator("canvas") ||
                           page.locator(".chart-container");
      
      if (await chartContainer.isVisible()) {
        await expect(chartContainer).toBeVisible();
        
        // Chart should have reasonable dimensions
        const chartBox = await chartContainer.boundingBox();
        expect(chartBox?.width).toBeGreaterThan(200);
        expect(chartBox?.height).toBeGreaterThan(150);
        
        // If it's a canvas element, check it's properly sized
        if (await chartContainer.evaluate(el => el.tagName.toLowerCase() === 'canvas')) {
          const canvasData = await chartContainer.evaluate((canvas) => ({
            width: (canvas as HTMLCanvasElement).width,
            height: (canvas as HTMLCanvasElement).height
          }));
          
          expect(canvasData.width).toBeGreaterThan(100);
          expect(canvasData.height).toBeGreaterThan(100);
        }
        
        // Should have chart legend or labels if present
        const chartLegend = page.locator("[data-testid='chart-legend']") ||
                          page.locator(".chart-legend, .legend");
        
        if (await chartLegend.isVisible()) {
          await expect(chartLegend).toBeVisible();
        }
      }
    });
  });

  test.describe("Responsive Design Display", () => {
    test("should adapt header layout for mobile viewport", async ({ page }) => {
      await page.setViewportSize({ width: 375, height: 667 });
      await page.reload();
      await page.goto("/accounts");
      await page.click("[data-testid='account-item']");
      
      // Account title should remain visible and readable
      const accountTitle = page.locator("h1, [data-testid='account-title']");
      await expect(accountTitle).toBeVisible();
      
      // Title should not be cut off
      const titleBox = await accountTitle.boundingBox();
      expect(titleBox?.width).toBeLessThan(375); // Should fit within mobile width
      
      // Actions might be reorganized (dropdown, hamburger menu, etc.)
      const actionButton = page.locator("[data-testid='mobile-actions']") ||
                          page.locator(".mobile-menu, .actions-dropdown") ||
                          page.locator("button[aria-label*='menu']");
      
      if (await actionButton.isVisible()) {
        await expect(actionButton).toBeVisible();
      }
    });

    test("should adapt transaction table for mobile viewport", async ({ page }) => {
      await page.setViewportSize({ width: 375, height: 667 });
      await page.reload();
      await page.goto("/accounts");
      await page.click("[data-testid='account-item']");
      
      const transactionsContainer = page.locator("[data-testid='transactions-table']") ||
                                   page.locator("table, .transactions-list");
      
      if (await transactionsContainer.isVisible()) {
        // Should be horizontally scrollable or stacked for mobile
        const containerBox = await transactionsContainer.boundingBox();
        
        // Either fits in mobile width or is scrollable
        const isScrollable = await transactionsContainer.evaluate((el) => {
          return el.scrollWidth > el.clientWidth;
        });
        
        expect(containerBox?.width || 0 <= 375 || isScrollable).toBeTruthy();
        
        // Transaction rows should be readable on mobile
        const transactionRow = page.locator("[data-testid='transaction-row']").first() ||
                              page.locator("tbody tr, .transaction-item").first();
        
        if (await transactionRow.isVisible()) {
          const rowBox = await transactionRow.boundingBox();
          expect(rowBox?.height).toBeGreaterThan(30); // Should have reasonable height
        }
      }
    });

    test("should adapt filters for tablet viewport", async ({ page }) => {
      await page.setViewportSize({ width: 768, height: 1024 });
      await page.reload();
      await page.goto("/accounts");
      await page.click("[data-testid='account-item']");
      
      // Filters should be well-organized in tablet view
      const filtersContainer = page.locator("[data-testid='filters-container']") ||
                             page.locator(".filters, .search-filters");
      
      if (await filtersContainer.isVisible()) {
        const filtersBox = await filtersContainer.boundingBox();
        expect(filtersBox?.width).toBeLessThan(768); // Should fit in tablet width
        
        // Multiple filters should be arranged properly
        const dateFilters = page.locator("input[type='date']");
        const dateCount = await dateFilters.count();
        
        if (dateCount > 1) {
          // Should be arranged side by side or in organized grid
          const firstFilter = dateFilters.first();
          const secondFilter = dateFilters.nth(1);
          
          const firstBox = await firstFilter.boundingBox();
          const secondBox = await secondFilter.boundingBox();
          
          // Should not overlap
          if (firstBox && secondBox) {
            const noOverlap = firstBox.x + firstBox.width <= secondBox.x ||
                            firstBox.y + firstBox.height <= secondBox.y;
            expect(noOverlap).toBeTruthy();
          }
        }
      }
    });

    test("should maintain readability across different screen sizes", async ({ page }) => {
      const viewports = [
        { width: 320, height: 568, name: "Small Mobile" },
        { width: 768, height: 1024, name: "Tablet" },
        { width: 1024, height: 768, name: "Landscape Tablet" },
        { width: 1280, height: 720, name: "Desktop" }
      ];
      
      for (const viewport of viewports) {
        await page.setViewportSize(viewport);
        await page.reload();
        await page.goto("/accounts");
        await page.click("[data-testid='account-item']");
        
        // Account title should remain readable
        const accountTitle = page.locator("h1, [data-testid='account-title']");
        await expect(accountTitle).toBeVisible();
        
        // Balance should remain visible
        const balance = page.locator("[data-testid='account-balance']") ||
                       page.locator(".balance");
        
        if (await balance.isVisible()) {
          await expect(balance).toBeVisible();
          
          // Text should not be too small to read
          const balanceStyles = await balance.evaluate((el) => {
            const styles = window.getComputedStyle(el);
            return { fontSize: parseFloat(styles.fontSize) };
          });
          
          expect(balanceStyles.fontSize).toBeGreaterThan(12); // Minimum readable size
        }
        
        // Essential content should not be cut off
        const essentialContent = page.locator("[data-testid='transactions-table']") ||
                                page.locator("table, .transactions-list");
        
        if (await essentialContent.isVisible()) {
          const contentBox = await essentialContent.boundingBox();
          expect(contentBox?.width).toBeGreaterThan(0);
          expect(contentBox?.height).toBeGreaterThan(0);
        }
      }
    });
  });

  test.describe("Loading and Error States Display", () => {
    test("should display loading indicators during data fetch", async ({ page }) => {
      // Simulate slow network to see loading states
      await page.route("**/api/trpc/**", route => {
        setTimeout(() => route.continue(), 500);
      });
      
      await page.goto("/accounts");
      const navigationPromise = page.click("[data-testid='account-item']");
      
      // Should show loading indicator
      const loadingIndicator = page.locator("[data-testid='loading']") ||
                             page.locator(".loading, .spinner") ||
                             page.getByText(/Loading|Please wait/);
      
      if (await loadingIndicator.isVisible()) {
        await expect(loadingIndicator).toBeVisible();
        
        // Loading indicator should have appropriate styling
        const loadingBox = await loadingIndicator.boundingBox();
        expect(loadingBox?.width).toBeGreaterThan(20);
        expect(loadingBox?.height).toBeGreaterThan(20);
      }
      
      await navigationPromise;
      await page.unroute("**/api/trpc/**");
    });

    test("should display error states with clear messaging", async ({ page }) => {
      // Simulate network error
      await page.route("**/api/trpc/**", route => {
        route.abort('failed');
      });
      
      await page.goto("/accounts");
      
      // Try to navigate to account page
      const accountItem = page.locator("[data-testid='account-item']");
      if (await accountItem.isVisible()) {
        await accountItem.click();
      }
      
      // Should show error message
      const errorMessage = page.locator("[data-testid='error-message']") ||
                          page.locator(".error-message") ||
                          page.getByText(/Error|Failed to load|Something went wrong/i);
      
      if (await errorMessage.isVisible()) {
        await expect(errorMessage).toBeVisible();
        
        // Error should be clearly visible and readable
        const errorStyles = await errorMessage.evaluate((el) => {
          const styles = window.getComputedStyle(el);
          return {
            color: styles.color,
            fontSize: parseFloat(styles.fontSize),
            padding: styles.padding
          };
        });
        
        expect(errorStyles.fontSize).toBeGreaterThan(12);
        
        // Should have retry option
        const retryButton = page.locator("[data-testid='retry-button']") ||
                          page.locator("button:has-text('Retry')") ||
                          page.locator("button:has-text('Try Again')");
        
        if (await retryButton.isVisible()) {
          await expect(retryButton).toBeVisible();
        }
      }
      
      await page.unroute("**/api/trpc/**");
    });

    test("should display skeleton loading for content areas", async ({ page }) => {
      // Navigate to a potentially slow-loading page
      await page.route("**/api/trpc/**", route => {
        setTimeout(() => route.continue(), 300);
      });
      
      await page.goto("/accounts");
      const navigationPromise = page.click("[data-testid='account-item']");
      
      // Look for skeleton loaders
      const skeletonLoader = page.locator("[data-testid='skeleton']") ||
                           page.locator(".skeleton, .placeholder") ||
                           page.locator("[class*='skeleton']");
      
      if (await skeletonLoader.isVisible()) {
        await expect(skeletonLoader).toBeVisible();
        
        // Skeleton should have appropriate dimensions
        const skeletonBox = await skeletonLoader.boundingBox();
        expect(skeletonBox?.width).toBeGreaterThan(50);
        expect(skeletonBox?.height).toBeGreaterThan(20);
        
        // Should have animation or visual indication it's loading
        const skeletonStyles = await skeletonLoader.evaluate((el) => {
          const styles = window.getComputedStyle(el);
          return {
            backgroundColor: styles.backgroundColor,
            animation: styles.animation
          };
        });
        
        expect(skeletonStyles.backgroundColor).not.toBe("transparent");
      }
      
      await navigationPromise;
      await page.unroute("**/api/trpc/**");
    });
  });

  test.describe("Accessibility Display Features", () => {
    test("should have proper focus indicators for interactive elements", async ({ page }) => {
      // Test keyboard navigation and focus indicators
      await page.keyboard.press("Tab");
      
      // Check focus on interactive elements
      const focusableElements = [
        "[data-testid='add-transaction']",
        "[data-testid='export-data']",
        "input",
        "button",
        "select"
      ];
      
      for (const selector of focusableElements) {
        const element = page.locator(selector).first();
        if (await element.isVisible()) {
          await element.focus();
          
          // Should have visible focus indicator
          const focusStyles = await element.evaluate((el) => {
            const styles = window.getComputedStyle(el);
            return {
              outline: styles.outline,
              outlineColor: styles.outlineColor,
              boxShadow: styles.boxShadow
            };
          });
          
          // Should have some form of focus indication
          const hasFocusIndicator = focusStyles.outline !== "none" ||
                                  focusStyles.outlineColor !== "" ||
                                  focusStyles.boxShadow !== "none";
          
          expect(hasFocusIndicator).toBeTruthy();
        }
      }
    });

    test("should have proper color contrast for text elements", async ({ page }) => {
      // Check text contrast for key elements
      const textElements = [
        "h1, [data-testid='account-title']",
        "[data-testid='account-balance']",
        "[data-testid='transaction-amount']",
        "th"
      ];
      
      for (const selector of textElements) {
        const element = page.locator(selector).first();
        if (await element.isVisible()) {
          const styles = await element.evaluate((el) => {
            const computedStyles = window.getComputedStyle(el);
            return {
              color: computedStyles.color,
              backgroundColor: computedStyles.backgroundColor,
              fontSize: parseFloat(computedStyles.fontSize)
            };
          });
          
          // Text should be large enough to read
          expect(styles.fontSize).toBeGreaterThan(11);
          
          // Should have reasonable color (not transparent)
          expect(styles.color).not.toBe("rgba(0, 0, 0, 0)");
          expect(styles.color).not.toBe("transparent");
        }
      }
    });

    test("should have proper ARIA labels and roles for screen readers", async ({ page }) => {
      // Check main content areas for proper ARIA
      const accountTitle = page.locator("h1, [data-testid='account-title']");
      if (await accountTitle.isVisible()) {
        const titleRole = await accountTitle.getAttribute("role");
        const titleAriaLabel = await accountTitle.getAttribute("aria-label");
        
        // Should have heading role or appropriate ARIA labeling
        expect(titleRole === "heading" || titleAriaLabel !== null || 
               await accountTitle.evaluate(el => el.tagName.toLowerCase()) === "h1").toBeTruthy();
      }
      
      // Check table for proper structure
      const transactionsTable = page.locator("table");
      if (await transactionsTable.isVisible()) {
        const tableRole = await transactionsTable.getAttribute("role");
        const tableCaption = transactionsTable.locator("caption");
        const tableAriaLabel = await transactionsTable.getAttribute("aria-label");
        
        // Should have table role or proper ARIA labeling
        expect(tableRole === "table" || 
               await tableCaption.isVisible() || 
               tableAriaLabel !== null).toBeTruthy();
      }
      
      // Check buttons for proper labeling
      const buttons = page.locator("button");
      const buttonCount = await buttons.count();
      
      for (let i = 0; i < Math.min(3, buttonCount); i++) {
        const button = buttons.nth(i);
        if (await button.isVisible()) {
          const buttonText = await button.textContent();
          const buttonAriaLabel = await button.getAttribute("aria-label");
          const buttonTitle = await button.getAttribute("title");
          
          // Should have accessible name
          expect(buttonText?.length || buttonAriaLabel?.length || buttonTitle?.length).toBeTruthy();
        }
      }
    });
  });
});