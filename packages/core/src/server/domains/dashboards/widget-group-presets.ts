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
];

export function getPreset(slug: string): WidgetGroupPreset | undefined {
  return WIDGET_GROUP_PRESETS.find((p) => p.slug === slug);
}
