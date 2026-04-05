import type { WidgetSettings, WidgetSize } from "$core/schema/dashboards";

export type WidgetCategory = "metrics" | "charts" | "lists" | "actions";

export interface WidgetDefinition {
  type: string;
  label: string;
  description: string;
  icon: string;
  defaultSize: WidgetSize;
  availableSizes: WidgetSize[];
  defaultColumnSpan: number;
  defaultSettings: WidgetSettings;
  category: WidgetCategory;
}

export const WIDGET_CATALOG: WidgetDefinition[] = [
  // --- Metrics ---
  {
    type: "total-balance",
    label: "Total Balance",
    description: "Sum of all account balances",
    icon: "wallet",
    defaultSize: "small",
    availableSizes: ["small", "medium"],
    defaultColumnSpan: 1,
    defaultSettings: {},
    category: "metrics",
  },
  {
    type: "active-accounts",
    label: "Active Accounts",
    description: "Count of open accounts",
    icon: "credit-card",
    defaultSize: "small",
    availableSizes: ["small", "medium"],
    defaultColumnSpan: 1,
    defaultSettings: {},
    category: "metrics",
  },
  {
    type: "monthly-cashflow",
    label: "Monthly Cash Flow",
    description: "Income minus expenses this month",
    icon: "trending-up",
    defaultSize: "small",
    availableSizes: ["small", "medium"],
    defaultColumnSpan: 1,
    defaultSettings: { period: "month" },
    category: "metrics",
  },
  {
    type: "pending-balance",
    label: "Pending Balance",
    description: "Sum of pending transactions",
    icon: "clock",
    defaultSize: "small",
    availableSizes: ["small", "medium"],
    defaultColumnSpan: 1,
    defaultSettings: {},
    category: "metrics",
  },

  // --- Charts ---
  {
    type: "spending-by-category",
    label: "Spending by Category",
    description: "Breakdown of expenses by category",
    icon: "pie-chart",
    defaultSize: "medium",
    availableSizes: ["medium", "large", "full"],
    defaultColumnSpan: 2,
    defaultSettings: { period: "month", limit: 8 },
    category: "charts",
  },
  {
    type: "spending-trend",
    label: "Spending Trend",
    description: "Line chart of spending over time",
    icon: "trending-up",
    defaultSize: "large",
    availableSizes: ["medium", "large", "full"],
    defaultColumnSpan: 3,
    defaultSettings: { period: "quarter", chartType: "line" },
    category: "charts",
  },
  {
    type: "net-worth-trend",
    label: "Net Worth Trend",
    description: "Line chart tracking net worth over time",
    icon: "line-chart",
    defaultSize: "large",
    availableSizes: ["medium", "large", "full"],
    defaultColumnSpan: 3,
    defaultSettings: { period: "year", chartType: "area" },
    category: "charts",
  },
  {
    type: "budget-progress",
    label: "Budget Progress",
    description: "Progress bars for active budgets",
    icon: "target",
    defaultSize: "medium",
    availableSizes: ["medium", "large", "full"],
    defaultColumnSpan: 2,
    defaultSettings: {},
    category: "charts",
  },

  // --- Lists ---
  {
    type: "recent-transactions",
    label: "Recent Transactions",
    description: "Latest transactions across accounts",
    icon: "receipt",
    defaultSize: "medium",
    availableSizes: ["medium", "large", "full"],
    defaultColumnSpan: 2,
    defaultSettings: { limit: 10 },
    category: "lists",
  },
  {
    type: "upcoming-schedules",
    label: "Upcoming Schedules",
    description: "Scheduled transactions due soon",
    icon: "calendar",
    defaultSize: "medium",
    availableSizes: ["medium", "large", "full"],
    defaultColumnSpan: 2,
    defaultSettings: { limit: 5 },
    category: "lists",
  },
  {
    type: "account-summary",
    label: "Account Summary",
    description: "Accounts with current balances",
    icon: "credit-card",
    defaultSize: "medium",
    availableSizes: ["small", "medium", "large"],
    defaultColumnSpan: 2,
    defaultSettings: { limit: 5 },
    category: "lists",
  },

  {
    type: "payee-analytics",
    label: "Payee Analytics",
    description: "ML-powered payee insights and category distribution",
    icon: "brain",
    defaultSize: "medium",
    availableSizes: ["medium", "large"],
    defaultColumnSpan: 2,
    defaultSettings: {},
    category: "lists",
  },

  // --- Actions ---
  {
    type: "quick-actions",
    label: "Quick Actions",
    description: "Navigation shortcuts to common tasks",
    icon: "zap",
    defaultSize: "small",
    availableSizes: ["small", "medium"],
    defaultColumnSpan: 1,
    defaultSettings: {},
    category: "actions",
  },
];

export function getWidgetDefinition(type: string): WidgetDefinition | undefined {
  return WIDGET_CATALOG.find((w) => w.type === type);
}

export function getWidgetsByCategory(category: WidgetCategory): WidgetDefinition[] {
  return WIDGET_CATALOG.filter((w) => w.category === category);
}
