import type {BudgetWithRelations} from '$lib/server/domains/budgets';

/**
 * Calculate the actual amount spent from budget transactions.
 * This is the source of truth for budget spending, not the period instance's actualAmount field.
 */
export function calculateActualSpent(budget: BudgetWithRelations): number {
  const transactions = budget.transactions || [];
  return transactions.reduce((total, bt) => {
    return total + Math.abs(bt.allocatedAmount ?? 0);
  }, 0);
}

/**
 * Calculate the allocated amount from budget metadata or period instance.
 * Tries metadata first, then falls back to the latest period instance.
 */
export function calculateAllocated(budget: BudgetWithRelations): number {
  // Try metadata first
  const metadataAmount = Math.abs((budget.metadata as any)?.allocatedAmount ?? 0);
  if (metadataAmount > 0) return metadataAmount;

  // Fall back to period instance
  const latestPeriod = budget.periodTemplates?.[0]?.periods?.[0];
  return Math.abs(latestPeriod?.allocatedAmount ?? 0);
}

/**
 * Calculate remaining budget amount.
 */
export function calculateRemaining(budget: BudgetWithRelations): number {
  return calculateAllocated(budget) - calculateActualSpent(budget);
}

/**
 * Calculate budget utilization as a percentage.
 */
export function calculateUtilization(budget: BudgetWithRelations): number {
  const allocated = calculateAllocated(budget);
  const spent = calculateActualSpent(budget);
  return allocated > 0 ? (spent / allocated) * 100 : 0;
}
