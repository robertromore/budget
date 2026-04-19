import type { WidgetSettings, WidgetSize } from "$core/schema/dashboards";

export interface WidgetGroupPresetItem {
  widgetType: string;
  title?: string;
  size: WidgetSize;
  columnSpan: number;
  sortOrder: number;
  settings?: WidgetSettings;
}

export interface WidgetGroupPreset {
  slug: string;
  name: string;
  description: string;
  icon: string;
  items: WidgetGroupPresetItem[];
}

export const WIDGET_GROUP_PRESETS: WidgetGroupPreset[] = [
  {
    slug: "net-worth-command",
    name: "Net-worth command",
    description: "Trajectory-first view: total balance, long-range net-worth trend, account mix, and goal progress.",
    icon: "trending-up",
    items: [
      { widgetType: "total-balance", size: "small", columnSpan: 1, sortOrder: 0 },
      { widgetType: "net-worth-trend", size: "large", columnSpan: 4, sortOrder: 1, settings: { period: "year" } },
      { widgetType: "account-summary", size: "medium", columnSpan: 2, sortOrder: 2 },
      { widgetType: "goals-progress", size: "medium", columnSpan: 2, sortOrder: 3 },
    ],
  },
  {
    slug: "envelope-first",
    name: "Envelope first",
    description: "YNAB-flavoured view: budget progress front and centre with spending breakdown and recent activity.",
    icon: "wallet",
    items: [
      { widgetType: "budget-progress", size: "large", columnSpan: 4, sortOrder: 0 },
      { widgetType: "spending-by-category", size: "large", columnSpan: 2, sortOrder: 1 },
      { widgetType: "recent-transactions", size: "medium", columnSpan: 2, sortOrder: 2 },
    ],
  },
  {
    slug: "cashflow-forecast",
    name: "Cashflow forecast",
    description: "Forward-looking cash picture: pending balance, net cashflow, upcoming bills, and spending trend.",
    icon: "line-chart",
    items: [
      { widgetType: "pending-balance", size: "small", columnSpan: 1, sortOrder: 0 },
      { widgetType: "monthly-cashflow", size: "small", columnSpan: 1, sortOrder: 1 },
      { widgetType: "upcoming-schedules", size: "medium", columnSpan: 2, sortOrder: 2 },
      { widgetType: "spending-trend", size: "large", columnSpan: 4, sortOrder: 3, settings: { period: "quarter" } },
    ],
  },
  {
    slug: "monarch-overview",
    name: "Monarch-style overview",
    description: "Polished consumer layout: balance headline, category breakdown, upcoming list, and recent activity.",
    icon: "layout-dashboard",
    items: [
      { widgetType: "total-balance", size: "small", columnSpan: 1, sortOrder: 0 },
      { widgetType: "monthly-cashflow", size: "small", columnSpan: 1, sortOrder: 1 },
      { widgetType: "spending-by-category", size: "large", columnSpan: 2, sortOrder: 2 },
      { widgetType: "upcoming-schedules", size: "medium", columnSpan: 2, sortOrder: 3 },
      { widgetType: "recent-transactions", size: "medium", columnSpan: 2, sortOrder: 4 },
    ],
  },
  {
    slug: "widget-glance",
    name: "Widget glance",
    description: "At-a-glance tile grid: every KPI worth watching in compact form.",
    icon: "layout-grid",
    items: [
      { widgetType: "total-balance", size: "small", columnSpan: 1, sortOrder: 0 },
      { widgetType: "monthly-cashflow", size: "small", columnSpan: 1, sortOrder: 1 },
      { widgetType: "pending-balance", size: "small", columnSpan: 1, sortOrder: 2 },
      { widgetType: "active-accounts", size: "small", columnSpan: 1, sortOrder: 3 },
      { widgetType: "goals-progress", size: "medium", columnSpan: 2, sortOrder: 4 },
      { widgetType: "upcoming-schedules", size: "medium", columnSpan: 2, sortOrder: 5 },
    ],
  },
  {
    slug: "goals-funds",
    name: "Goals & sinking funds",
    description: "Goal-focused view: savings progress, retirement contributions, and cash-flow optimizer hints.",
    icon: "target",
    items: [
      { widgetType: "goals-progress", size: "large", columnSpan: 4, sortOrder: 0 },
      { widgetType: "retirement-contributions", size: "medium", columnSpan: 2, sortOrder: 1 },
      { widgetType: "cash-flow-optimizer", size: "medium", columnSpan: 2, sortOrder: 2 },
    ],
  },
  {
    slug: "terminal-command",
    name: "Terminal command",
    description: "Bloomberg-style dense data view: mono net-worth chart + transaction tape, anchored by classic KPI tiles.",
    icon: "terminal",
    items: [
      { widgetType: "net-worth-trend-terminal", size: "large", columnSpan: 3, sortOrder: 0, settings: { period: "year" } },
      { widgetType: "active-accounts", size: "small", columnSpan: 1, sortOrder: 1 },
      { widgetType: "recent-transactions-terminal", size: "medium", columnSpan: 2, sortOrder: 2, settings: { limit: 12 } },
      { widgetType: "total-balance", size: "small", columnSpan: 1, sortOrder: 3 },
    ],
  },
  {
    slug: "weekly-brief",
    name: "Weekly brief (narrative)",
    description: "Plain-English summary of the month — income, spend, budget pacing — next to a classic recent-activity list.",
    icon: "file-text",
    items: [
      { widgetType: "monthly-brief-narrative", size: "medium", columnSpan: 2, sortOrder: 0 },
      { widgetType: "budget-progress-narrative", size: "medium", columnSpan: 2, sortOrder: 1 },
      { widgetType: "recent-transactions", size: "medium", columnSpan: 4, sortOrder: 2, settings: { limit: 8 } },
    ],
  },
  {
    slug: "money-coach",
    name: "Money coach",
    description: "Actionable nudges — per-budget coaching with suggested caps, plus goal-progress context.",
    icon: "lightbulb",
    items: [
      { widgetType: "budget-progress-coach", size: "large", columnSpan: 3, sortOrder: 0 },
      { widgetType: "goals-progress", size: "medium", columnSpan: 1, sortOrder: 1 },
      { widgetType: "spending-insights-coach", size: "medium", columnSpan: 2, sortOrder: 2, settings: { limit: 4 } },
    ],
  },
  {
    slug: "copilot-hero",
    name: "Copilot hero",
    description: "Polished consumer layout: single hero net-worth + 90-day forecast, with a compact cashflow metric.",
    icon: "sparkles",
    items: [
      { widgetType: "net-worth-hero-copilot", size: "large", columnSpan: 4, sortOrder: 0, settings: { period: "year" } },
      { widgetType: "cashflow-forecast-copilot", size: "large", columnSpan: 4, sortOrder: 1 },
      { widgetType: "monthly-cashflow", size: "small", columnSpan: 1, sortOrder: 2 },
    ],
  },
];

export function getPreset(slug: string): WidgetGroupPreset | undefined {
  return WIDGET_GROUP_PRESETS.find((p) => p.slug === slug);
}
