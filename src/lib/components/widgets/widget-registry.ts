// Widget component registry for dynamic loading

import type { ComponentType } from 'svelte';
import type { WidgetType } from '$lib/types/widgets';

import BalanceWidget from './balance-widget.svelte';
import TransactionCountWidget from './transaction-count-widget.svelte';
import MonthlyCashflowWidget from './monthly-cashflow-widget.svelte';
import RecentActivityWidget from './recent-activity-widget.svelte';
import PendingBalanceWidget from './pending-balance-widget.svelte';

export const WIDGET_COMPONENTS: Record<WidgetType, ComponentType> = {
  'balance': BalanceWidget,
  'transaction-count': TransactionCountWidget,
  'monthly-cashflow': MonthlyCashflowWidget,
  'recent-activity': RecentActivityWidget,
  'pending-balance': PendingBalanceWidget,
  
  // Placeholder components for future widgets
  'top-categories': BalanceWidget, // Will be replaced with actual component
  'spending-trend': BalanceWidget, // Will be replaced with actual component
  'monthly-comparison': BalanceWidget, // Will be replaced with actual component
  'account-health': BalanceWidget, // Will be replaced with actual component
  'quick-stats': BalanceWidget // Will be replaced with actual component
};

export function getWidgetComponent(type: WidgetType) {
  return WIDGET_COMPONENTS[type] || BalanceWidget;
}