// Widget system types for configurable dashboard
import {
  Calendar,
  ChartBar,
  ChartLine,
  ChartPie,
  Clock,
  DollarSign,
  Heart,
  Tag,
  TrendingDown,
  TrendingUp,
  Zap,
} from "$lib/components/icons";
import type {Component} from "svelte";

export interface WidgetConfig {
  id: string;
  type: WidgetType;
  title: string;
  enabled: boolean;
  position: number;
  size: WidgetSize;
  settings: Record<string, any>;
}

export type WidgetType =
  | "balance"
  | "transaction-count"
  | "monthly-cashflow"
  | "recent-activity"
  | "pending-balance"
  | "top-categories"
  | "spending-trend"
  | "monthly-comparison"
  | "account-health"
  | "quick-stats"
  | "balance-trend-chart"
  | "category-pie-chart"
  | "income-expenses-chart";

export type WidgetSize = "small" | "medium" | "large";

export interface WidgetDefinition {
  type: WidgetType;
  name: string;
  description: string;
  icon: Component;
  defaultSize: WidgetSize;
  availableSizes: WidgetSize[];
  defaultSettings: Record<string, any>;
  configurable: boolean;
}

export interface WidgetData {
  [key: string]: any;
}

export interface WidgetProps {
  config: WidgetConfig;
  data: WidgetData;
  onUpdate?: (config: Partial<WidgetConfig>) => void;
  onRemove?: () => void;
  editMode?: boolean;
}

// Chart type options for different widgets
export type ChartType = "bar" | "line" | "area" | "pie" | "arc" | "scatter";

export interface ChartTypeOption {
  value: ChartType;
  label: string;
  icon: Component;
  description: string;
}

// Chart type options by widget type
export const WIDGET_CHART_TYPES: Record<string, ChartTypeOption[]> = {
  "balance-trend-chart": [
    {value: "line", label: "Line", icon: ChartLine, description: "Smooth trend line"},
    {value: "area", label: "Area", icon: ChartBar, description: "Filled area chart"},
    {value: "bar", label: "Bar", icon: ChartBar, description: "Bar chart"},
  ],
  "category-pie-chart": [
    {value: "pie", label: "Pie", icon: ChartPie, description: "Full pie chart"},
    {value: "arc", label: "Donut", icon: ChartPie, description: "Donut chart with center hole"},
    {value: "bar", label: "Bar", icon: ChartBar, description: "Horizontal bars"},
  ],
  "income-expenses-chart": [
    {value: "bar", label: "Grouped Bars", icon: ChartBar, description: "Side-by-side comparison"},
    {value: "line", label: "Lines", icon: ChartLine, description: "Trend lines"},
    {value: "area", label: "Areas", icon: TrendingUp, description: "Stacked areas"},
  ],
  "spending-trend": [
    {value: "line", label: "Line", icon: ChartLine, description: "Smooth trend line"},
    {value: "area", label: "Area", icon: TrendingUp, description: "Filled area"},
    {value: "bar", label: "Bar", icon: ChartBar, description: "Bar chart"},
  ],
};

// Default widget configurations
export const DEFAULT_WIDGETS: WidgetConfig[] = [
  {
    id: "balance",
    type: "balance",
    title: "Balance",
    enabled: true,
    position: 0,
    size: "small",
    settings: {},
  },
  {
    id: "transaction-count",
    type: "transaction-count",
    title: "Transactions",
    enabled: true,
    position: 1,
    size: "small",
    settings: {},
  },
  {
    id: "monthly-cashflow",
    type: "monthly-cashflow",
    title: "This Month",
    enabled: true,
    position: 2,
    size: "small",
    settings: {},
  },
  {
    id: "recent-activity",
    type: "recent-activity",
    title: "Recent Activity",
    enabled: true,
    position: 3,
    size: "small",
    settings: {days: 30},
  },
  {
    id: "pending-balance",
    type: "pending-balance",
    title: "Pending",
    enabled: true,
    position: 4,
    size: "small",
    settings: {},
  },
  {
    id: "category-pie-chart",
    type: "category-pie-chart",
    title: "Category Breakdown",
    enabled: true,
    position: 5,
    size: "medium",
    settings: {period: "month", chartType: "pie"},
  },
];

// Widget definitions catalog
export const WIDGET_DEFINITIONS: Record<WidgetType, WidgetDefinition> = {
  balance: {
    type: "balance",
    name: "Account Balance",
    description: "Current account balance",
    icon: DollarSign,
    defaultSize: "small",
    availableSizes: ["small", "medium", "large"],
    defaultSettings: {},
    configurable: false,
  },
  "transaction-count": {
    type: "transaction-count",
    name: "Transaction Count",
    description: "Total number of transactions",
    icon: ChartBar,
    defaultSize: "small",
    availableSizes: ["small", "medium"],
    defaultSettings: {},
    configurable: false,
  },
  "monthly-cashflow": {
    type: "monthly-cashflow",
    name: "Monthly Cash Flow",
    description: "Net income/expenses for current month",
    icon: TrendingUp,
    defaultSize: "small",
    availableSizes: ["small", "medium", "large"],
    defaultSettings: {},
    configurable: false,
  },
  "recent-activity": {
    type: "recent-activity",
    name: "Recent Activity",
    description: "Transaction activity in recent period",
    icon: Zap,
    defaultSize: "small",
    availableSizes: ["small", "medium"],
    defaultSettings: {days: 30},
    configurable: true,
  },
  "pending-balance": {
    type: "pending-balance",
    name: "Pending Balance",
    description: "Total amount of uncleared transactions",
    icon: Clock,
    defaultSize: "small",
    availableSizes: ["small", "medium"],
    defaultSettings: {},
    configurable: false,
  },
  "top-categories": {
    type: "top-categories",
    name: "Top Categories",
    description: "Highest spending categories",
    icon: Tag,
    defaultSize: "medium",
    availableSizes: ["medium", "large"],
    defaultSettings: {limit: 5, period: "month"},
    configurable: true,
  },
  "spending-trend": {
    type: "spending-trend",
    name: "Spending Trend",
    description: "Spending pattern over time",
    icon: TrendingDown,
    defaultSize: "large",
    availableSizes: ["medium", "large"],
    defaultSettings: {period: "month", showAverage: true},
    configurable: true,
  },
  "monthly-comparison": {
    type: "monthly-comparison",
    name: "Monthly Comparison",
    description: "Compare current month to previous months",
    icon: Calendar,
    defaultSize: "medium",
    availableSizes: ["medium", "large"],
    defaultSettings: {compareMonths: 3},
    configurable: true,
  },
  "account-health": {
    type: "account-health",
    name: "Account Health",
    description: "Overall account health score",
    icon: Heart,
    defaultSize: "medium",
    availableSizes: ["small", "medium"],
    defaultSettings: {},
    configurable: false,
  },
  "quick-stats": {
    type: "quick-stats",
    name: "Quick Stats",
    description: "Key financial metrics at a glance",
    icon: Zap,
    defaultSize: "large",
    availableSizes: ["medium", "large"],
    defaultSettings: {metrics: ["avgTransaction", "highestExpense", "lastActivity"]},
    configurable: true,
  },
  "balance-trend-chart": {
    type: "balance-trend-chart",
    name: "Balance Trend Chart",
    description: "Balance changes over time",
    icon: ChartLine,
    defaultSize: "large",
    availableSizes: ["medium", "large"],
    defaultSettings: {period: "day", chartType: "line"},
    configurable: true,
  },
  "category-pie-chart": {
    type: "category-pie-chart",
    name: "Category Pie Chart",
    description: "Spending breakdown by category",
    icon: ChartPie,
    defaultSize: "medium",
    availableSizes: ["medium", "large"],
    defaultSettings: {period: "month", chartType: "pie"},
    configurable: true,
  },
  "income-expenses-chart": {
    type: "income-expenses-chart",
    name: "Income vs Expenses Chart",
    description: "Income and expenses comparison over time",
    icon: ChartBar,
    defaultSize: "large",
    availableSizes: ["medium", "large"],
    defaultSettings: {period: "month", chartType: "bar"},
    configurable: true,
  },
};
