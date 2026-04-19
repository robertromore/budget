import type { BudgetWithRelations } from "$core/server/domains/budgets";

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
 * Sum allocated amounts for transactions whose date falls within the given
 * window. Inclusive on both sides. Pass both bounds as `YYYY-MM-DD` strings;
 * transaction dates may be either pure dates or full ISO timestamps — we
 * normalize with `slice(0, 10)` before comparing.
 */
export function calculatePeriodSpent(
  budget: BudgetWithRelations,
  startIso?: string,
  endIso?: string,
): number {
  if (!startIso && !endIso) return calculateActualSpent(budget);
  const transactions = budget.transactions || [];
  return transactions.reduce((total, bt) => {
    const raw = bt.transaction?.date;
    if (!raw) return total;
    const day = raw.slice(0, 10);
    if (startIso && day < startIso) return total;
    if (endIso && day > endIso) return total;
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
