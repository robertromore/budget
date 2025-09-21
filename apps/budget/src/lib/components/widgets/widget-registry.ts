// Widget component registry for dynamic loading

import type {WidgetType, WidgetProps} from "$lib/types/widgets";
import type {Component} from "svelte";

import AccountHealthWidget from "./account-health-widget.svelte";
import BalanceWidget from "./balance-widget.svelte";
import MonthlyCashflowWidget from "./monthly-cashflow-widget.svelte";
import MonthlyComparisonWidget from "./monthly-comparison-widget.svelte";
import PendingBalanceWidget from "./pending-balance-widget.svelte";
import QuickStatsWidget from "./quick-stats-widget.svelte";
import RecentActivityWidget from "./recent-activity-widget.svelte";
import SpendingTrendWidget from "./spending-trend-widget.svelte";
import TopCategoriesWidget from "./top-categories-widget.svelte";
import TransactionCountWidget from "./transaction-count-widget.svelte";

export const WIDGET_COMPONENTS: Record<WidgetType, Component<WidgetProps>> = {
  balance: BalanceWidget,
  "transaction-count": TransactionCountWidget,
  "monthly-cashflow": MonthlyCashflowWidget,
  "recent-activity": RecentActivityWidget,
  "pending-balance": PendingBalanceWidget,
  "top-categories": TopCategoriesWidget,
  "spending-trend": SpendingTrendWidget,
  "monthly-comparison": MonthlyComparisonWidget,
  "account-health": AccountHealthWidget,
  "quick-stats": QuickStatsWidget,
};

export function getWidgetComponent(type: WidgetType) {
  return WIDGET_COMPONENTS[type] || BalanceWidget;
}
