import type { BudgetProgressStatus } from "$core/schema/budgets";
import type { BudgetWithRelations } from "$core/server/domains/budgets";
import { calculateActualSpent, calculateAllocated } from "./budget-calculations";

/**
 * Resolve a budget's display status — "paused" for inactive or
 * unallocated budgets, "over" when consumed exceeds allocated,
 * "approaching" at 80%+, otherwise "on_track".
 *
 * Shared between the budgets index page and the search-results card
 * so the thresholds can only drift in one spot.
 */
export function resolveBudgetProgressStatus(
  budget: BudgetWithRelations
): BudgetProgressStatus {
  if (budget.status !== "active") return "paused";
  const allocated = calculateAllocated(budget);
  if (!allocated) return "paused";

  const ratio = calculateActualSpent(budget) / allocated;
  if (ratio > 1) return "over";
  if (ratio >= 0.8) return "approaching";
  return "on_track";
}
