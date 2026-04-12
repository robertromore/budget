import type { Component } from "svelte";
import ArrowRightLeft from "@lucide/svelte/icons/arrow-right-left";
import BookOpen from "@lucide/svelte/icons/book-open";
import Brain from "@lucide/svelte/icons/brain";
import CalendarSync from "@lucide/svelte/icons/calendar-sync";
import Compass from "@lucide/svelte/icons/compass";
import DollarSign from "@lucide/svelte/icons/dollar-sign";
import Download from "@lucide/svelte/icons/download";
import LayoutDashboard from "@lucide/svelte/icons/layout-dashboard";
import Receipt from "@lucide/svelte/icons/receipt";
import Settings from "@lucide/svelte/icons/settings";
import Tags from "@lucide/svelte/icons/tags";
import Wallet from "@lucide/svelte/icons/wallet";

export interface HelpCategory {
  id: string;
  label: string;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  icon: Component<any>;
  description: string;
}

export const helpCategories: HelpCategory[] = [
  {
    id: "app-guides",
    label: "App Guides",
    icon: Compass,
    description: "Step-by-step walkthroughs for using the app",
  },
  {
    id: "finance-guides",
    label: "Budgeting & Finance",
    icon: DollarSign,
    description: "Budgeting methods, debt strategies, and financial literacy",
  },
  {
    id: "getting-started",
    label: "Getting Started",
    icon: BookOpen,
    description: "Navigation, layout, and UI controls",
  },
  {
    id: "dashboard",
    label: "Dashboard",
    icon: LayoutDashboard,
    description: "Widgets, stats, and financial overview",
  },
  {
    id: "accounts",
    label: "Accounts",
    icon: ArrowRightLeft,
    description: "Account management, pages, and sections",
  },
  {
    id: "transactions",
    label: "Transactions",
    icon: Receipt,
    description: "Transaction table, forms, columns, and actions",
  },
  {
    id: "budgets",
    label: "Budgets",
    icon: Wallet,
    description: "Budget tracking, templates, and allocation",
  },
  {
    id: "import",
    label: "Importing Data",
    icon: Download,
    description: "Import transactions from bank files and profiles",
  },
  {
    id: "categories-payees",
    label: "Categories & Payees",
    icon: Tags,
    description: "Organize transactions by category and payee",
  },
  {
    id: "schedules",
    label: "Schedules",
    icon: CalendarSync,
    description: "Recurring transactions and schedule management",
  },
  {
    id: "intelligence",
    label: "Intelligence & AI",
    icon: Brain,
    description: "AI assistant, ML insights, and smart features",
  },
  {
    id: "settings",
    label: "Settings",
    icon: Settings,
    description: "Display preferences, appearance, and configuration",
  },
];

/** Maps every help topic ID to a category ID */
export const helpTopicCategoryMap: Record<string, string> = {
  // App Guides
  "guide-getting-started": "app-guides",
  "guide-importing-transactions": "app-guides",
  "guide-setting-up-budgets": "app-guides",
  "guide-recurring-transactions": "app-guides",
  "guide-organizing-categories": "app-guides",
  "guide-reconciliation": "app-guides",
  "guide-tracking-subscriptions": "app-guides",
  "guide-investment-tracking": "app-guides",

  // Budgeting & Finance Guides
  "guide-envelope-budgeting": "finance-guides",
  "guide-50-30-20-rule": "finance-guides",
  "guide-emergency-fund": "finance-guides",
  "guide-debt-payoff": "finance-guides",

  // Getting Started
  sidebar: "getting-started",
  "workspace-switcher": "getting-started",
  "sidebar-trigger": "getting-started",
  "theme-toggle": "getting-started",
  "font-size-toggle": "getting-started",
  "theme-button": "getting-started",
  "help-button": "getting-started",
  "settings-button": "getting-started",
  "notification-bell": "getting-started",
  "header-page-actions": "getting-started",
  "header-page-tabs": "getting-started",

  // Dashboard
  "dashboard-stats": "dashboard",
  "quick-actions": "dashboard",
  "financial-overview": "dashboard",
  "payee-intelligence-summary": "dashboard",

  // Accounts
  "accounts-list": "accounts",
  "accounts-page-header": "accounts",
  "add-account-button": "accounts",
  "accounts-grid": "accounts",
  "account-tabs": "accounts",
  "account-page-header": "accounts",
  "account-tab-transactions": "accounts",
  "account-tab-analytics": "accounts",
  "account-tab-intelligence": "accounts",
  "account-tab-schedules": "accounts",
  "account-tab-budgets": "accounts",
  "account-tab-import": "accounts",
  "account-tab-settings": "accounts",
  "account-tab-hsa-expenses": "accounts",
  "account-tab-hsa-dashboard": "accounts",
  "analytics-tab": "accounts",
  "schedules-tab": "accounts",
  "budgets-tab": "accounts",
  "account-settings-tab": "accounts",
  "add-expense-button": "accounts",

  // Transactions
  "transaction-table": "transactions",
  "transaction-toolbar": "transactions",
  "transaction-filters": "transactions",
  "transaction-view-options": "transactions",
  "quick-add-transaction": "transactions",
  "add-transaction-button": "transactions",
  "add-transaction-dialog": "transactions",
  "transaction-amount-field": "transactions",
  "transaction-date-field": "transactions",
  "transaction-payee-field": "transactions",
  "transaction-category-field": "transactions",
  "transaction-budget-field": "transactions",
  "transaction-notes-field": "transactions",
  "transaction-entry-tabs": "transactions",
  "transaction-wizard": "transactions",
  "transaction-transfer-form": "transactions",
  "transaction-tab-manual": "transactions",
  "transaction-tab-transfer": "transactions",
  "transaction-tab-guided": "transactions",
  "transaction-date-column": "transactions",
  "transaction-payee-column": "transactions",
  "transaction-category-column": "transactions",
  "transaction-amount-column": "transactions",
  "transaction-balance-column": "transactions",
  "transaction-notes-column": "transactions",
  "transaction-status-column": "transactions",
  "transaction-budget-column": "transactions",
  "transaction-selection": "transactions",
  "transaction-row-actions": "transactions",
  "transaction-bulk-actions": "transactions",
  "transaction-row-expand": "transactions",

  // Budgets
  "budgets-list": "budgets",
  "budgets-page-header": "budgets",
  "budget-summary": "budgets",
  "budget-tabs": "budgets",
  "budget-template-picker": "budgets",
  "template-search": "budgets",
  "template-category-tabs": "budgets",
  "template-grid": "budgets",
  "templates-button": "budgets",
  "create-custom-budget": "budgets",
  "budget-name-field": "budgets",
  "budget-type-field": "budgets",
  "budget-amount-field": "budgets",
  "budget-period-field": "budgets",
  "budget-account-field": "budgets",
  "budget-category-field": "budgets",
  "budget-goal-target-field": "budgets",
  "budget-goal-date-field": "budgets",
  "budget-enforcement-field": "budgets",

  // Import
  "import-page": "import",
  "import-profile-name": "import",
  "import-profile-filename-pattern": "import",
  "import-profile-account": "import",
  "import-profile-mappings": "import",
  "settings-import-profiles": "import",

  // Categories & Payees
  "categories-page-header": "categories-payees",
  "categories-list": "categories-payees",
  "payees-page-header": "categories-payees",
  "payees-table": "categories-payees",
  "payees-list": "categories-payees",

  // Schedules
  "schedules-page-header": "schedules",
  "schedules-table": "schedules",

  // Intelligence & AI
  "ai-assistant": "intelligence",
  "intelligence-input-button": "intelligence",
  "intelligence-tab": "intelligence",
  "intelligence-page-header": "intelligence",
  "ml-insights": "intelligence",
  "ml-master-toggle": "intelligence",
  "ml-features": "intelligence",
  "ml-anomaly-sensitivity": "intelligence",
  "ml-forecast-horizon": "intelligence",
  "ml-similarity-threshold": "intelligence",
  "ml-web-search": "intelligence",
  "ml-web-search-provider": "intelligence",
  "ml-intelligence-input": "intelligence",
  "ml-intelligence-input-mode": "intelligence",
  "llm-master-toggle": "intelligence",
  "llm-providers": "intelligence",
  "llm-feature-modes": "intelligence",
  "settings-ml": "intelligence",
  "settings-llm": "intelligence",

  // Settings
  "settings-appearance": "settings",
  "settings-display": "settings",
  "settings-advanced": "settings",
  "display-date-format": "settings",
  "display-currency-symbol": "settings",
  "display-number-format": "settings",
  "display-decimal-places": "settings",
  "display-header-actions": "settings",
  "display-header-actions-display": "settings",
  "display-header-tabs": "settings",
  "display-header-tabs-display": "settings",
  "display-table-options": "settings",
  "advanced-delete-data": "settings",
};

/** Get all topic IDs for a given category */
export function getTopicsForCategory(categoryId: string): string[] {
  return Object.entries(helpTopicCategoryMap)
    .filter(([, cat]) => cat === categoryId)
    .map(([id]) => id);
}

/** Get the category ID for a given topic */
export function getCategoryForTopic(topicId: string): string | undefined {
  return helpTopicCategoryMap[topicId];
}
