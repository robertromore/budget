import Activity from "@lucide/svelte/icons/activity";
import ChartPie from "@lucide/svelte/icons/chart-pie";
import GitCompare from "@lucide/svelte/icons/git-compare";
import TrendingUp from "@lucide/svelte/icons/trending-up";
import type { Component } from "svelte";

export interface BudgetAnalyticType {
  id: string;
  title: string;
  description: string;
  icon: Component<any>;
  category: string;
  /** Optional: restrict to specific budget types */
  budgetTypes?: Array<"account-monthly" | "category-envelope" | "goal-based" | "scheduled-expense">;
}

export const budgetAnalyticsTypes: BudgetAnalyticType[] = [
  // Overview
  {
    id: "spending-trends",
    title: "Spending Trends",
    description: "Allocated vs actual spending across periods",
    icon: TrendingUp,
    category: "Overview",
  },
  {
    id: "period-comparison",
    title: "Period Comparison",
    description: "Compare current period with previous",
    icon: GitCompare,
    category: "Overview",
  },

  // Category Analysis
  {
    id: "category-breakdown",
    title: "Category Breakdown",
    description: "Spending distribution by category",
    icon: ChartPie,
    category: "Categories",
  },

  // Time-Based
  {
    id: "daily-burndown",
    title: "Daily Burndown",
    description: "Track daily spending against allocation",
    icon: Activity,
    category: "Time-Based",
  },
];

/**
 * Get analytics types filtered by budget type
 */
export function getFilteredAnalytics(
  budgetType?: "account-monthly" | "category-envelope" | "goal-based" | "scheduled-expense"
): BudgetAnalyticType[] {
  return budgetAnalyticsTypes.filter((analytic) => {
    // If no budgetTypes restriction, show for all
    if (!analytic.budgetTypes) return true;
    // If budget type provided, check if it's in the allowed list
    if (budgetType) return analytic.budgetTypes.includes(budgetType);
    // If no budget type provided, show all
    return true;
  });
}

/**
 * Group analytics by category
 */
export function groupAnalyticsByCategory(
  analytics: BudgetAnalyticType[]
): Map<string, BudgetAnalyticType[]> {
  const groups = new Map<string, BudgetAnalyticType[]>();

  for (const analytic of analytics) {
    const category = analytic.category;
    if (!groups.has(category)) {
      groups.set(category, []);
    }
    groups.get(category)!.push(analytic);
  }

  return groups;
}
