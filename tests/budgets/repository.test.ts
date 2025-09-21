import { describe, it, expect, beforeEach, afterEach } from "bun:test";
import { BudgetRepository } from "../../apps/budget/src/lib/server/domains/budgets/repository";
import { db } from "../../apps/budget/src/lib/server/db";
import { budgets, budgetAccounts, budgetCategories } from "../../apps/budget/src/lib/schema/budgets";
import { accounts } from "../../apps/budget/src/lib/schema/accounts";
import { categories } from "../../apps/budget/src/lib/schema/categories";
import { eq } from "drizzle-orm";

describe("BudgetRepository", () => {
  let budgetRepository: BudgetRepository;
  let testAccountId: number;
  let testCategoryId: number;

  beforeEach(async () => {
    budgetRepository = new BudgetRepository();

    // Create test account
    const [testAccount] = await db.insert(accounts).values({
      name: "Test Account",
      slug: "test-account",
      dateOpened: "2024-01-01",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    }).returning();
    testAccountId = testAccount.id;

    // Create test category
    const [testCategory] = await db.insert(categories).values({
      name: "Test Category",
      dateCreated: "2024-01-01",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    }).returning();
    testCategoryId = testCategory.id;
  });

  afterEach(async () => {
    // Clean up test data
    await db.delete(budgetAccounts);
    await db.delete(budgetCategories);
    await db.delete(budgets);
    await db.delete(accounts).where(eq(accounts.id, testAccountId));
    await db.delete(categories).where(eq(categories.id, testCategoryId));
  });

  describe("createBudget", () => {
    it("should create a budget with valid data", async () => {
      const budgetData = {
        name: "Test Budget",
        description: "A test budget",
        type: "account-monthly" as const,
        enforcement: "warning" as const,
        isActive: true,
        metadata: JSON.stringify({ monthlyLimit: 1000 })
      };

      const budget = await budgetRepository.createBudget(budgetData);

      expect(budget).toBeDefined();
      expect(budget.name).toBe("Test Budget");
      expect(budget.type).toBe("account-monthly");
      expect(budget.enforcement).toBe("warning");
      expect(budget.isActive).toBe(true);
      expect(budget.id).toBeGreaterThan(0);
    });

    it("should create a budget with minimal data", async () => {
      const budgetData = {
        name: "Minimal Budget",
        type: "account-monthly" as const
      };

      const budget = await budgetRepository.createBudget(budgetData);

      expect(budget).toBeDefined();
      expect(budget.name).toBe("Minimal Budget");
      expect(budget.type).toBe("account-monthly");
      expect(budget.enforcement).toBe("warning"); // Default value
    });
  });

  describe("getBudgetById", () => {
    it("should retrieve a budget by ID", async () => {
      const budgetData = {
        name: "Test Budget",
        type: "account-monthly" as const
      };

      const createdBudget = await budgetRepository.createBudget(budgetData);
      const retrievedBudget = await budgetRepository.getBudgetById(createdBudget.id);

      expect(retrievedBudget).toBeDefined();
      expect(retrievedBudget?.id).toBe(createdBudget.id);
      expect(retrievedBudget?.name).toBe("Test Budget");
    });

    it("should return null for non-existent budget", async () => {
      const retrievedBudget = await budgetRepository.getBudgetById(99999);
      expect(retrievedBudget).toBeNull();
    });
  });

  describe("getBudgets", () => {
    it("should retrieve all budgets with pagination", async () => {
      // Create test budgets
      await budgetRepository.createBudget({
        name: "Budget 1",
        type: "account-monthly" as const
      });
      await budgetRepository.createBudget({
        name: "Budget 2",
        type: "category-envelope" as const
      });

      const result = await budgetRepository.getBudgets({}, { page: 1, limit: 10 });

      expect(result).toBeDefined();
      expect(result.data).toBeArray();
      expect(result.data.length).toBe(2);
      expect(result.total).toBe(2);
      expect(result.page).toBe(1);
      expect(result.limit).toBe(10);
    });

    it("should filter budgets by type", async () => {
      await budgetRepository.createBudget({
        name: "Account Budget",
        type: "account-monthly" as const
      });
      await budgetRepository.createBudget({
        name: "Envelope Budget",
        type: "category-envelope" as const
      });

      const result = await budgetRepository.getBudgets(
        { type: "account-monthly" },
        { page: 1, limit: 10 }
      );

      expect(result.data.length).toBe(1);
      expect(result.data[0].name).toBe("Account Budget");
      expect(result.data[0].type).toBe("account-monthly");
    });

    it("should search budgets by name", async () => {
      await budgetRepository.createBudget({
        name: "Monthly Groceries",
        type: "account-monthly" as const
      });
      await budgetRepository.createBudget({
        name: "Emergency Fund",
        type: "goal-based" as const
      });

      const result = await budgetRepository.getBudgets(
        { search: "Monthly" },
        { page: 1, limit: 10 }
      );

      expect(result.data.length).toBe(1);
      expect(result.data[0].name).toBe("Monthly Groceries");
    });
  });

  describe("updateBudget", () => {
    it("should update budget fields", async () => {
      const budget = await budgetRepository.createBudget({
        name: "Original Name",
        type: "account-monthly" as const
      });

      await budgetRepository.updateBudget(budget.id, {
        name: "Updated Name",
        description: "Updated description",
        isActive: false
      });

      const updatedBudget = await budgetRepository.getBudgetById(budget.id);

      expect(updatedBudget?.name).toBe("Updated Name");
      expect(updatedBudget?.description).toBe("Updated description");
      expect(updatedBudget?.isActive).toBe(false);
    });
  });

  describe("deleteBudget", () => {
    it("should soft delete a budget", async () => {
      const budget = await budgetRepository.createBudget({
        name: "To Delete",
        type: "account-monthly" as const
      });

      await budgetRepository.deleteBudget(budget.id);

      const deletedBudget = await budgetRepository.getBudgetById(budget.id);
      expect(deletedBudget).toBeNull();
    });
  });

  describe("budget associations", () => {
    it("should add account to budget", async () => {
      const budget = await budgetRepository.createBudget({
        name: "Test Budget",
        type: "account-monthly" as const
      });

      await budgetRepository.addAccountToBudget(budget.id, testAccountId);

      const budgetAccounts = await budgetRepository.getBudgetAccounts(budget.id);
      expect(budgetAccounts.length).toBe(1);
      expect(budgetAccounts[0].accountId).toBe(testAccountId);
    });

    it("should add category to budget", async () => {
      const budget = await budgetRepository.createBudget({
        name: "Test Budget",
        type: "category-envelope" as const
      });

      await budgetRepository.addCategoryToBudget(budget.id, testCategoryId, 500);

      const budgetCategories = await budgetRepository.getBudgetCategories(budget.id);
      expect(budgetCategories.length).toBe(1);
      expect(budgetCategories[0].categoryId).toBe(testCategoryId);
      expect(budgetCategories[0].allocatedAmount).toBe(500);
    });

    it("should remove account from budget", async () => {
      const budget = await budgetRepository.createBudget({
        name: "Test Budget",
        type: "account-monthly" as const
      });

      await budgetRepository.addAccountToBudget(budget.id, testAccountId);
      await budgetRepository.removeAccountFromBudget(budget.id, testAccountId);

      const budgetAccounts = await budgetRepository.getBudgetAccounts(budget.id);
      expect(budgetAccounts.length).toBe(0);
    });
  });
});