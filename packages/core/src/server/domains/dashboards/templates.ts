import type { DashboardLayoutConfig, WidgetSettings, WidgetSize } from "$core/schema/dashboards";

export interface DashboardTemplateWidget {
  widgetType: string;
  title?: string;
  size: WidgetSize;
  sortOrder: number;
  columnSpan: number;
  settings?: WidgetSettings;
}

export interface DashboardTemplate {
  id: string;
  name: string;
  description: string;
  icon: string;
  layout: DashboardLayoutConfig;
  widgets: DashboardTemplateWidget[];
}

export const DASHBOARD_TEMPLATES: DashboardTemplate[] = [
  {
    id: "home",
    name: "Home",
    description: "Overview with key metrics, account summary, and quick actions",
    icon: "home",
    layout: { columns: 4, gap: "normal" },
    widgets: [
      { widgetType: "total-balance", size: "small", sortOrder: 0, columnSpan: 1 },
      { widgetType: "active-accounts", size: "small", sortOrder: 1, columnSpan: 1 },
      { widgetType: "monthly-cashflow", size: "small", sortOrder: 2, columnSpan: 1 },
      { widgetType: "pending-balance", size: "small", sortOrder: 3, columnSpan: 1 },
      { widgetType: "account-summary", size: "medium", sortOrder: 4, columnSpan: 2 },
      { widgetType: "quick-actions", size: "medium", sortOrder: 5, columnSpan: 2 },
      { widgetType: "recent-transactions", size: "medium", sortOrder: 6, columnSpan: 2 },
      { widgetType: "upcoming-schedules", size: "medium", sortOrder: 7, columnSpan: 2 },
    ],
  },
  {
    id: "executive",
    name: "Executive Summary",
    description: "High-level financial health with budget lanes and alerts",
    icon: "sparkles",
    layout: { columns: 4, gap: "normal" },
    widgets: [
      { widgetType: "total-balance", size: "small", sortOrder: 0, columnSpan: 1 },
      { widgetType: "monthly-cashflow", size: "small", sortOrder: 1, columnSpan: 1 },
      { widgetType: "pending-balance", size: "small", sortOrder: 2, columnSpan: 1 },
      { widgetType: "active-accounts", size: "small", sortOrder: 3, columnSpan: 1 },
      { widgetType: "budget-progress", size: "large", sortOrder: 4, columnSpan: 2 },
      { widgetType: "spending-by-category", size: "large", sortOrder: 5, columnSpan: 2 },
      { widgetType: "spending-trend", size: "large", sortOrder: 6, columnSpan: 4 },
    ],
  },
  {
    id: "spending",
    name: "Spending Analysis",
    description: "Category breakdown, spending trends, and budget tracking",
    icon: "bar-chart-3",
    layout: { columns: 4, gap: "normal" },
    widgets: [
      { widgetType: "monthly-cashflow", size: "small", sortOrder: 0, columnSpan: 1 },
      { widgetType: "total-balance", size: "small", sortOrder: 1, columnSpan: 1 },
      { widgetType: "pending-balance", size: "small", sortOrder: 2, columnSpan: 1 },
      { widgetType: "active-accounts", size: "small", sortOrder: 3, columnSpan: 1 },
      { widgetType: "spending-by-category", size: "large", sortOrder: 4, columnSpan: 2 },
      { widgetType: "spending-trend", size: "large", sortOrder: 5, columnSpan: 2 },
      { widgetType: "budget-progress", size: "large", sortOrder: 6, columnSpan: 2 },
      { widgetType: "recent-transactions", size: "medium", sortOrder: 7, columnSpan: 2 },
    ],
  },
  {
    id: "goals",
    name: "Goal Planner",
    description: "Track savings goals, net worth, and upcoming schedules",
    icon: "target",
    layout: { columns: 4, gap: "normal" },
    widgets: [
      { widgetType: "total-balance", size: "small", sortOrder: 0, columnSpan: 1 },
      { widgetType: "monthly-cashflow", size: "small", sortOrder: 1, columnSpan: 1 },
      { widgetType: "active-accounts", size: "small", sortOrder: 2, columnSpan: 1 },
      { widgetType: "pending-balance", size: "small", sortOrder: 3, columnSpan: 1 },
      { widgetType: "net-worth-trend", size: "large", sortOrder: 4, columnSpan: 4 },
      { widgetType: "account-summary", size: "medium", sortOrder: 5, columnSpan: 2 },
      { widgetType: "upcoming-schedules", size: "medium", sortOrder: 6, columnSpan: 2 },
    ],
  },
];

export function getTemplate(id: string): DashboardTemplate | undefined {
  return DASHBOARD_TEMPLATES.find((t) => t.id === id);
}
