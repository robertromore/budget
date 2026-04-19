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
  "retirement-contributions": () => import("./retirement-contributions-widget.svelte"),
  "goals-progress": () => import("./goals-progress-widget.svelte"),
  "cash-flow-optimizer": () => import("./cash-flow-optimizer-widget.svelte"),

  // --- Styled variants ---
  "total-balance-terminal": () => import("./total-balance-terminal-widget.svelte"),
  "active-accounts-terminal": () => import("./active-accounts-terminal-widget.svelte"),
  "monthly-cashflow-terminal": () => import("./monthly-cashflow-terminal-widget.svelte"),
  "pending-balance-terminal": () => import("./pending-balance-terminal-widget.svelte"),
  "total-balance-copilot": () => import("./total-balance-copilot-widget.svelte"),
  "active-accounts-copilot": () => import("./active-accounts-copilot-widget.svelte"),
  "monthly-cashflow-copilot": () => import("./monthly-cashflow-copilot-widget.svelte"),
  "pending-balance-copilot": () => import("./pending-balance-copilot-widget.svelte"),
  "net-worth-trend-terminal": () => import("./net-worth-trend-terminal-widget.svelte"),
  "recent-transactions-terminal": () => import("./recent-transactions-terminal-widget.svelte"),
  "monthly-brief-narrative": () => import("./monthly-brief-narrative-widget.svelte"),
  "budget-progress-narrative": () => import("./budget-progress-narrative-widget.svelte"),
  "budget-progress-coach": () => import("./budget-progress-coach-widget.svelte"),
  "spending-insights-coach": () => import("./spending-insights-coach-widget.svelte"),
  "net-worth-hero-copilot": () => import("./net-worth-hero-copilot-widget.svelte"),
  "cashflow-forecast-copilot": () => import("./cashflow-forecast-copilot-widget.svelte"),
  "spending-trend-terminal": () => import("./spending-trend-terminal-widget.svelte"),
  "budget-progress-terminal": () => import("./budget-progress-terminal-widget.svelte"),
  "recent-transactions-copilot": () => import("./recent-transactions-copilot-widget.svelte"),
  "account-summary-copilot": () => import("./account-summary-copilot-widget.svelte"),
  "spending-by-category-copilot": () => import("./spending-by-category-copilot-widget.svelte"),
  "spending-trend-copilot": () => import("./spending-trend-copilot-widget.svelte"),
  "upcoming-schedules-copilot": () => import("./upcoming-schedules-copilot-widget.svelte"),
  "budget-progress-copilot": () => import("./budget-progress-copilot-widget.svelte"),
  "spending-by-category-terminal": () => import("./spending-by-category-terminal-widget.svelte"),
  "upcoming-schedules-terminal": () => import("./upcoming-schedules-terminal-widget.svelte"),
  "account-summary-terminal": () => import("./account-summary-terminal-widget.svelte"),
};

export function getWidgetImport(type: string): WidgetImport | undefined {
  return registry[type];
}

export function isWidgetTypeRegistered(type: string): boolean {
  return type in registry;
}
