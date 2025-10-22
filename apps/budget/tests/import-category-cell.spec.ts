import { test, expect } from '@playwright/test';
import { join } from 'path';
import Database from 'better-sqlite3';

const DB_PATH = join(process.cwd(), 'drizzle/db/sqlite.db');

test.describe('Import Category Cell Functionality', () => {
  let db: Database.Database;

  test.beforeAll(() => {
    db = new Database(DB_PATH);
  });

  test.afterAll(() => {
    db.close();
  });

  test.beforeEach(async ({ page }) => {
    // Clean up database
    db.exec('DELETE FROM "transaction"');
    db.exec('DELETE FROM payee');
    db.exec('DELETE FROM categories');

    // Navigate to import page
    await page.goto('/import');
    await page.waitForLoadState('networkidle');

    // Select an account
    const accountSelect = page.getByRole('combobox').or(page.locator('button[role="combobox"]')).first();
    await accountSelect.click();
    await page.getByRole('option').nth(1).click();

    // Upload test file
    const fileInput = page.locator('input[type="file"]');
    await fileInput.setInputFiles(join(__dirname, 'fixtures/test-import.qfx'));

    // Wait for preview step
    await page.waitForTimeout(2000);
  });

  test('should allow clearing a category by backspacing in the dropdown', async ({ page }) => {
    // Find first transaction row
    const firstRow = page.locator('table tbody tr').first();
    await firstRow.waitFor({ state: 'visible' });

    // Click on category button
    const categoryButton = firstRow.locator('button:has(svg)').filter({ hasText: /Select category|Shopping|Dining/i }).first();
    await categoryButton.click();

    // Wait for dropdown to open
    await page.waitForTimeout(500);

    // Find the search input
    const searchInput = page.locator('input[placeholder*="category"]').or(page.locator('[role="combobox"] input'));
    await searchInput.waitFor({ state: 'visible' });

    // Type a category name
    await searchInput.fill('Shopping');
    await page.waitForTimeout(300);

    // Now backspace to clear it completely
    await searchInput.fill('');
    await page.waitForTimeout(300);

    // The "Create" option should NOT appear when search is empty
    const createOption = page.getByText(/Create ".*"/);
    await expect(createOption).not.toBeVisible();

    // Click outside to close dropdown
    await page.click('body');
    await page.waitForTimeout(500);

    // Category should be cleared
    const buttonText = await categoryButton.textContent();
    expect(buttonText).toMatch(/Select category|None|^$/i);
  });

  test('should show "Create" option while typing but hide when empty', async ({ page }) => {
    const firstRow = page.locator('table tbody tr').first();
    const categoryButton = firstRow.locator('button').filter({ hasText: /Select category|Shopping/i }).first();
    await categoryButton.click();
    await page.waitForTimeout(500);

    const searchInput = page.locator('input[placeholder*="category"]');

    // Type some text
    await searchInput.fill('S');
    await page.waitForTimeout(300);

    // Should show Create option
    await expect(page.getByText(/Create "S"/i)).toBeVisible();

    // Continue typing
    await searchInput.fill('Shop');
    await page.waitForTimeout(300);
    await expect(page.getByText(/Create "Shop"/i)).toBeVisible();

    // Backspace to empty
    await searchInput.fill('');
    await page.waitForTimeout(300);

    // Create option should disappear
    await expect(page.getByText(/Create ".*"/)).not.toBeVisible();
  });

  test('should not trigger bulk update dialog when selecting the same category', async ({ page }) => {
    const firstRow = page.locator('table tbody tr').first();
    const categoryButton = firstRow.locator('button').filter({ hasText: /Select category/i }).first();

    // First, set a category
    await categoryButton.click();
    await page.waitForTimeout(500);

    const searchInput = page.locator('input[placeholder*="category"]');
    await searchInput.fill('Shopping');

    // Click the Create option or select from list
    const shoppingOption = page.getByText('Shopping').or(page.getByText(/Create "Shopping"/)).first();
    await shoppingOption.click();
    await page.waitForTimeout(1000);

    // Now open dropdown again
    await categoryButton.click();
    await page.waitForTimeout(500);

    // Clear the search
    await searchInput.fill('');
    await page.waitForTimeout(300);

    // Select Shopping again from the list
    const shoppingFromList = page.getByRole('option').filter({ hasText: 'Shopping' }).or(page.getByText('Shopping')).first();
    await shoppingFromList.click();
    await page.waitForTimeout(500);

    // Should NOT see a bulk update dialog
    const bulkDialog = page.locator('[role="alertdialog"]').or(page.getByText(/Update Similar Transactions/i));
    await expect(bulkDialog).not.toBeVisible();
  });

  test('should apply category change when clicking outside after typing', async ({ page }) => {
    const firstRow = page.locator('table tbody tr').first();
    const categoryButton = firstRow.locator('button').filter({ hasText: /Select category/i }).first();

    await categoryButton.click();
    await page.waitForTimeout(500);

    const searchInput = page.locator('input[placeholder*="category"]');
    await searchInput.fill('Groceries');
    await page.waitForTimeout(300);

    // Click outside to close dropdown (should apply the change)
    await page.click('body');
    await page.waitForTimeout(500);

    // Button should now show "Groceries"
    await expect(categoryButton).toContainText('Groceries');
  });

  test('should set category when selecting from existing categories', async ({ page }) => {
    // First, create a category by using another row
    const firstRow = page.locator('table tbody tr').first();
    let categoryButton = firstRow.locator('button').filter({ hasText: /Select category/i }).first();

    await categoryButton.click();
    await page.waitForTimeout(500);

    let searchInput = page.locator('input[placeholder*="category"]');
    await searchInput.fill('Electronics');
    await page.getByText(/Create "Electronics"/i).click();
    await page.waitForTimeout(1000);

    // Now select that category on another row
    const secondRow = page.locator('table tbody tr').nth(1);
    categoryButton = secondRow.locator('button').filter({ hasText: /Select category/i }).first();

    await categoryButton.click();
    await page.waitForTimeout(500);

    // Should see Electronics in the list
    const electronicsOption = page.getByRole('option').filter({ hasText: 'Electronics' }).or(page.getByText('Electronics').first());
    await electronicsOption.click();
    await page.waitForTimeout(500);

    // Second row should now show Electronics
    await expect(categoryButton).toContainText('Electronics');
  });
});
