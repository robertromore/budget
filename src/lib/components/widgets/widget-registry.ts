// Widget component registry for dynamic loading

import type { ComponentType } from 'svelte';
import type { WidgetType } from '$lib/types/widgets';

import BalanceWidget from './balance-widget.svelte';
import TransactionCountWidget from './transaction-count-widget.svelte';
import MonthlyCashflowWidget from './monthly-cashflow-widget.svelte';
import RecentActivityWidget from './recent-activity-widget.svelte';
import PendingBalanceWidget from './pending-balance-widget.svelte';
import TopCategoriesWidget from './top-categories-widget.svelte';
import SpendingTrendWidget from './spending-trend-widget.svelte';
import MonthlyComparisonWidget from './monthly-comparison-widget.svelte';
import AccountHealthWidget from './account-health-widget.svelte';
import QuickStatsWidget from './quick-stats-widget.svelte';
import IncomeExpensesChartWidget from './income-expenses-chart-widget.svelte';
import CategoryPieChartWidget from './category-pie-chart-widget.svelte';
import BalanceTrendChartWidget from './balance-trend-chart-widget.svelte';

export const WIDGET_COMPONENTS: Record<WidgetType, ComponentType> = {
  'balance': BalanceWidget,
  'transaction-count': TransactionCountWidget,
  'monthly-cashflow': MonthlyCashflowWidget,
  'recent-activity': RecentActivityWidget,
  'pending-balance': PendingBalanceWidget,
  'top-categories': TopCategoriesWidget,
  'spending-trend': SpendingTrendWidget,
  'monthly-comparison': MonthlyComparisonWidget,
  'account-health': AccountHealthWidget,
  'quick-stats': QuickStatsWidget,
  'income-expenses-chart': IncomeExpensesChartWidget,
  'category-pie-chart': CategoryPieChartWidget,
  'balance-trend-chart': BalanceTrendChartWidget
};

export function getWidgetComponent(type: WidgetType) {
  return WIDGET_COMPONENTS[type] || BalanceWidget;
}