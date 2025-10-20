import { test, expect } from '@playwright/test';
import { readFileSync } from 'fs';
import { join } from 'path';
import Database from 'better-sqlite3';

const DB_PATH = join(process.cwd(), 'drizzle/db/sqlite.db');

test.describe('QFX Import Functionality', () => {
  let db: Database.Database;

  test.beforeAll(() => {
    // Open database connection
    db = new Database(DB_PATH);
  });

  test.afterAll(() => {
    // Close database connection
    db.close();
  });

  test.beforeEach(async ({ page }) => {
    // Clean up database before each test
    db.exec('DELETE FROM "transaction"');
    db.exec('DELETE FROM payee');
    db.exec('DELETE FROM categories');

    // Verify clean state
    const txCount = db.prepare('SELECT COUNT(*) as count FROM "transaction"').get() as { count: number };
    const payeeCount = db.prepare('SELECT COUNT(*) as count FROM payee').get() as { count: number };
    const catCount = db.prepare('SELECT COUNT(*) as count FROM categories').get() as { count: number };

    expect(txCount.count).toBe(0);
    expect(payeeCount.count).toBe(0);
    expect(catCount.count).toBe(0);

    // Navigate to import page
    await page.goto('/import');
    await page.waitForLoadState('networkidle');
  });

  test('should import QFX file with multiple payees and consistent categories', async ({ page }) => {
    // Step 1: Select an account
    const accountSelect = page.locator('select[name="account"], #account-select, [data-testid="account-select"]').first();
    await accountSelect.waitFor({ state: 'visible', timeout: 5000 });

    // Select first available account
    const options = await accountSelect.locator('option').all();
    if (options.length > 1) {
      await accountSelect.selectOption({ index: 1 }); // Skip the first empty option
    }

    // Step 2: Upload QFX file
    const fileInput = page.locator('input[type="file"]');
    await fileInput.setInputFiles(join(__dirname, 'fixtures/test-import.qfx'));

    // Wait for file processing
    await page.waitForTimeout(2000);

    // Step 3: Verify we're on preview step
    await expect(page.locator('h2:has-text("Preview"), h1:has-text("Preview")')).toBeVisible({ timeout: 10000 });

    // Step 4: Assign categories to transactions
    // We should see 8 transactions from our QFX file
    const rows = page.locator('table tbody tr, [data-testid="import-row"]');
    await expect(rows).toHaveCount(8, { timeout: 5000 });

    // Find and assign category to first Amazon transaction
    // The fuzzy matching should automatically assign the same category to all Amazon transactions
    const amazonRows = page.locator('tr:has-text("AMAZON"), [data-payee*="AMAZON"]').first();
    await amazonRows.waitFor({ state: 'visible', timeout: 5000 });

    // Click on category cell for first Amazon transaction
    const categoryCell = amazonRows.locator('button:has-text("Select category"), button[aria-label*="category"]').first();
    await categoryCell.click();

    // Select or create "Shopping" category
    await page.waitForTimeout(500);
    const shoppingOption = page.locator('text="Shopping"').or(page.locator('[role="option"]:has-text("Shopping")')).or(page.locator('input[placeholder*="category"]'));

    if (await shoppingOption.count() > 0) {
      if (await shoppingOption.first().getAttribute('type') === 'text') {
        // It's an input, type the category name
        await shoppingOption.first().fill('Shopping');
        await page.keyboard.press('Enter');
      } else {
        // It's a selectable option
        await shoppingOption.first().click();
      }
    }

    // Wait for fuzzy matching to apply (should see a toast notification)
    await page.waitForTimeout(1000);

    // Find and assign category to first Starbucks transaction
    const starbucksRows = page.locator('tr:has-text("STARBUCKS"), [data-payee*="STARBUCKS"]').first();
    await starbucksRows.waitFor({ state: 'visible', timeout: 5000 });

    const starbucksCategoryCell = starbucksRows.locator('button:has-text("Select category"), button[aria-label*="category"]').first();
    await starbucksCategoryCell.click();
    await page.waitForTimeout(500);

    const diningOption = page.locator('text="Dining Out"').or(page.locator('input[placeholder*="category"]'));
    if (await diningOption.count() > 0) {
      if (await diningOption.first().getAttribute('type') === 'text') {
        await diningOption.first().fill('Dining Out');
        await page.keyboard.press('Enter');
      } else {
        await diningOption.first().click();
      }
    }

    await page.waitForTimeout(1000);

    // Assign categories to other unique payees
    // CVS -> Healthcare
    const cvsRow = page.locator('tr:has-text("CVS"), [data-payee*="CVS"]').first();
    if (await cvsRow.count() > 0) {
      await cvsRow.locator('button:has-text("Select category"), button[aria-label*="category"]').first().click();
      await page.waitForTimeout(500);
      const healthcareInput = page.locator('input[placeholder*="category"]');
      if (await healthcareInput.count() > 0) {
        await healthcareInput.first().fill('Healthcare');
        await page.keyboard.press('Enter');
        await page.waitForTimeout(500);
      }
    }

    // Whole Foods -> Groceries
    const wholeFoodsRow = page.locator('tr:has-text("WHOLE FOODS"), [data-payee*="WHOLE"]').first();
    if (await wholeFoodsRow.count() > 0) {
      await wholeFoodsRow.locator('button:has-text("Select category"), button[aria-label*="category"]').first().click();
      await page.waitForTimeout(500);
      const groceriesInput = page.locator('input[placeholder*="category"]');
      if (await groceriesInput.count() > 0) {
        await groceriesInput.first().fill('Groceries');
        await page.keyboard.press('Enter');
        await page.waitForTimeout(500);
      }
    }

    // Home Depot -> Home Improvement
    const homeDepotRow = page.locator('tr:has-text("HOME DEPOT"), [data-payee*="HOME"]').first();
    if (await homeDepotRow.count() > 0) {
      await homeDepotRow.locator('button:has-text("Select category"), button[aria-label*="category"]').first().click();
      await page.waitForTimeout(500);
      const homeInput = page.locator('input[placeholder*="category"]');
      if (await homeInput.count() > 0) {
        await homeInput.first().fill('Home Improvement');
        await page.keyboard.press('Enter');
        await page.waitForTimeout(500);
      }
    }

    // Step 5: Continue to entity review
    const continueButton = page.locator('button:has-text("Continue"), button:has-text("Next")');
    await continueButton.click();

    // Wait for entity review step
    await expect(page.locator('h2:has-text("Review Entities"), h1:has-text("Review")')).toBeVisible({ timeout: 10000 });

    // Step 6: Verify entities are listed
    // Should see categories: Shopping, Dining Out, Healthcare, Groceries, Home Improvement
    await expect(page.locator('text="Shopping"')).toBeVisible();
    await expect(page.locator('text="Dining Out"')).toBeVisible();
    await expect(page.locator('text="Healthcare"')).toBeVisible();
    await expect(page.locator('text="Groceries"')).toBeVisible();
    await expect(page.locator('text="Home Improvement"')).toBeVisible();

    // Step 7: Import transactions
    const importButton = page.locator('button:has-text("Import")');
    await importButton.click();

    // Wait for import completion
    await expect(page.locator('h2:has-text("Complete"), h1:has-text("Success"), text="imported successfully"')).toBeVisible({ timeout: 15000 });

    // Step 8: Verify database state
    await page.waitForTimeout(2000); // Give DB time to commit

    // Check transactions
    const transactions = db.prepare('SELECT COUNT(*) as count FROM "transaction" WHERE deleted_at IS NULL').get() as { count: number };
    expect(transactions.count).toBe(8); // 8 transactions from QFX file

    // Check payees
    const payees = db.prepare('SELECT * FROM payee WHERE deleted_at IS NULL').all() as Array<{ id: number; name: string }>;
    expect(payees.length).toBeGreaterThanOrEqual(5); // At least Amazon, Starbucks, CVS, Whole Foods, Home Depot

    // Check categories
    const categories = db.prepare('SELECT * FROM categories WHERE deleted_at IS NULL').all() as Array<{ id: number; name: string }>;
    expect(categories.length).toBeGreaterThanOrEqual(5); // At least Shopping, Dining Out, Healthcare, Groceries, Home Improvement

    // Step 9: Verify category consistency for same payee
    // All Amazon transactions should have the same category (Shopping)
    const amazonPayee = payees.find(p => p.name?.includes('AMAZON'));
    if (amazonPayee) {
      const amazonTransactions = db.prepare(
        'SELECT category_id FROM "transaction" WHERE payee_id = ? AND deleted_at IS NULL'
      ).all(amazonPayee.id) as Array<{ category_id: number }>;

      expect(amazonTransactions.length).toBe(3); // 3 Amazon transactions in our QFX

      // All should have the same category_id
      const categoryIds = new Set(amazonTransactions.map(t => t.category_id));
      expect(categoryIds.size).toBe(1); // Only one unique category ID

      // Verify it's the Shopping category
      const shoppingCategory = categories.find(c => c.name === 'Shopping');
      if (shoppingCategory) {
        expect(Array.from(categoryIds)[0]).toBe(shoppingCategory.id);
      }
    }

    // All Starbucks transactions should have the same category (Dining Out)
    const starbucksPayee = payees.find(p => p.name?.includes('STARBUCKS'));
    if (starbucksPayee) {
      const starbucksTransactions = db.prepare(
        'SELECT category_id FROM "transaction" WHERE payee_id = ? AND deleted_at IS NULL'
      ).all(starbucksPayee.id) as Array<{ category_id: number }>;

      expect(starbucksTransactions.length).toBe(2); // 2 Starbucks transactions in our QFX

      const categoryIds = new Set(starbucksTransactions.map(t => t.category_id));
      expect(categoryIds.size).toBe(1); // Only one unique category ID

      const diningCategory = categories.find(c => c.name === 'Dining Out');
      if (diningCategory) {
        expect(Array.from(categoryIds)[0]).toBe(diningCategory.id);
      }
    }

    console.log('✅ Import test passed!');
    console.log(`- Imported ${transactions.count} transactions`);
    console.log(`- Created ${payees.length} payees`);
    console.log(`- Created ${categories.length} categories`);
    console.log('- Verified category consistency for same payees');
  });
});
