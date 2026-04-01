import type { Component } from "svelte";

type WidgetComponent = Component<any>;
type WidgetImport = () => Promise<{ default: WidgetComponent }>;

const registry: Record<string, WidgetImport> = {
  "total-balance": () => import("./total-balance-widget.svelte"),
  "active-accounts": () => import("./active-accounts-widget.svelte"),
  "monthly-cashflow": () => import("./monthly-cashflow-widget.svelte"),
  "pending-balance": () => import("./pending-balance-widget.svelte"),
  "spending-by-category": () => import("./spending-by-category-widget.svelte"),
  "spending-trend": () => import("./spending-trend-widget.svelte"),
  "net-worth-trend": () => import("./net-worth-trend-widget.svelte"),
  "budget-progress": () => import("./budget-progress-widget.svelte"),
  "recent-transactions": () => import("./recent-transactions-widget.svelte"),
  "upcoming-schedules": () => import("./upcoming-schedules-widget.svelte"),
  "account-summary": () => import("./account-summary-widget.svelte"),
  "quick-actions": () => import("./quick-actions-widget.svelte"),
  "payee-analytics": () => import("./payee-analytics-widget.svelte"),
};

export function getWidgetImport(type: string): WidgetImport | undefined {
  return registry[type];
}

export function isWidgetTypeRegistered(type: string): boolean {
  return type in registry;
}
