import type { BudgetWithRelations } from "$lib/server/domains/budgets/repository";

/**
 * Checks if a budget has any invalid (deleted) category associations
 */
export function hasInvalidCategories(budget: BudgetWithRelations): boolean {
  return budget.categories.some((bc) => bc.category === null);
}

/**
 * Gets the count of invalid (deleted) categories in a budget
 */
export function getInvalidCategoryCount(budget: BudgetWithRelations): number {
  return budget.categories.filter((bc) => bc.category === null).length;
}

/**
 * Checks if a budget has any invalid (deleted) account associations
 */
export function hasInvalidAccounts(budget: BudgetWithRelations): boolean {
  return budget.accounts.some((ba) => ba.account === null);
}

/**
 * Gets the count of invalid (deleted) accounts in a budget
 */
export function getInvalidAccountCount(budget: BudgetWithRelations): number {
  return budget.accounts.filter((ba) => ba.account === null).length;
}

/**
 * Gets a summary of all validation issues for a budget
 */
export function getBudgetValidationIssues(budget: BudgetWithRelations): {
  hasIssues: boolean;
  invalidCategories: number;
  invalidAccounts: number;
  messages: string[];
} {
  const invalidCategories = getInvalidCategoryCount(budget);
  const invalidAccounts = getInvalidAccountCount(budget);
  const messages: string[] = [];

  if (invalidCategories > 0) {
    messages.push(
      `${invalidCategories} deleted ${invalidCategories === 1 ? "category" : "categories"}`
    );
  }

  if (invalidAccounts > 0) {
    messages.push(`${invalidAccounts} deleted ${invalidAccounts === 1 ? "account" : "accounts"}`);
  }

  return {
    hasIssues: messages.length > 0,
    invalidCategories,
    invalidAccounts,
    messages,
  };
}
