/**
 * Tour Steps Configuration
 *
 * Defines the steps for the spotlight tour that guides new users
 * through the application interface.
 */

import { goto } from "$app/navigation";
import { browser } from "$app/environment";
import { demoMode } from "$lib/states/ui/demo-mode.svelte";
import { spotlightTour } from "$lib/states/ui/spotlight-tour.svelte";
import type { TourStep } from "$lib/types/spotlight-tour";
import { MAIN_TOUR_STEP_IDS } from "$lib/types/spotlight-tour";

/**
 * Navigate with tour mode parameter to bypass onboarding redirect.
 * Use this instead of goto() in tour step setup functions.
 */
async function gotoTour(path: string): Promise<void> {
  if (!browser) return;
  const url = new URL(path, window.location.origin);
  url.searchParams.set("tour", "true");
  await goto(url.pathname + url.search);
}

// =============================================================================
// Timing Configuration
// =============================================================================

/**
 * Centralized timing constants for tour animations and transitions.
 * All values are in milliseconds.
 *
 * When adjusting these values, be aware of dependencies:
 * - DEMO_IMPORT_WAIT must be greater than DEMO_IMPORT_INTERNAL_DELAY
 * - DOM_RENDER_BUFFER should account for Svelte's reactivity cycle
 */
export const TOUR_TIMING = {
  /**
   * Internal delay in loadDemoImportData() before setting currentStep.
   * This is the source of truth - other timings depend on this.
   * @see import-tab.svelte loadDemoImportData()
   */
  DEMO_IMPORT_INTERNAL_DELAY: 500,

  /**
   * How long to wait after triggering demo import before proceeding.
   * Must be > DEMO_IMPORT_INTERNAL_DELAY to ensure data is loaded.
   */
  DEMO_IMPORT_WAIT: 700,

  /**
   * Buffer time for DOM to render after state changes.
   * Accounts for Svelte reactivity and browser paint cycles.
   */
  DOM_RENDER_BUFFER: 300,

  /**
   * Standard transition time between wizard steps.
   * Used for steps that don't require data loading.
   */
  WIZARD_STEP_TRANSITION: 200,

  /**
   * Time to wait after opening a sheet/modal.
   * Must exceed the sheet animation duration (500ms in sheet-content.svelte).
   * @see sheet-content.svelte data-[state=open]:duration-500
   */
  SHEET_OPEN_DELAY: 550,
} as const;

// =============================================================================
// Setup Helpers
// =============================================================================

/**
 * Helper: sleep for a given number of milliseconds
 */
const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

/**
 * Helper: Ensure demo mode is active and on the demo account
 */
async function ensureDemoAccountSetup(route?: string) {
  if (!demoMode.isActive) {
    demoMode.activate();
  }
  if (!demoMode.isTourRunning) {
    demoMode.startTour();
  }
  if (route) {
    await gotoTour(route);
  }
}

/**
 * Import wizard step order
 */
type ImportWizardStep = "upload" | "map-columns" | "preview" | "review-schedules" | "review-entities" | "complete";

/**
 * Helper: Advance import wizard to a specific step with animation
 * Idempotent - only advances from the current step, skipping already-completed steps
 *
 * IMPORTANT: This function synchronously updates demoMode.importStep BEFORE triggering
 * any UI actions. This ensures idempotency even when called multiple times in quick succession.
 */
async function advanceImportWizardTo(targetStep: ImportWizardStep) {
  const stepOrder: ImportWizardStep[] = [
    "upload",
    "map-columns",
    "preview",
    "review-schedules",
    "review-entities",
    "complete",
  ];
  const targetIndex = stepOrder.indexOf(targetStep);
  const currentStep = demoMode.importStep;
  const currentIndex = stepOrder.indexOf(currentStep as ImportWizardStep);

  // If we're already at or past the target step, nothing to do
  if (currentIndex >= targetIndex && currentStep !== "idle") {
    return;
  }

  // CRITICAL: Immediately update the import step to the target step BEFORE triggering
  // any UI actions. This prevents multiple triggers when setup() is called multiple times.
  demoMode.setImportStep(targetStep);

  // Determine where to start from
  const startIndex = currentStep === "idle" ? 0 : currentIndex + 1;

  for (let i = startIndex; i <= targetIndex; i++) {
    const step = stepOrder[i];
    if (step === "upload") {
      // Trigger demo import (this advances past upload to map-columns)
      // Wait time must exceed DEMO_IMPORT_INTERNAL_DELAY for data to load
      demoMode.triggerDemoImport();
      await sleep(TOUR_TIMING.DEMO_IMPORT_WAIT);
    } else if (step === "map-columns") {
      // Map columns is auto-shown after demo import, just wait for DOM rendering
      await sleep(TOUR_TIMING.DOM_RENDER_BUFFER);
    } else if (step === "preview") {
      demoMode.triggerAdvanceWizard("preview");
      await sleep(TOUR_TIMING.WIZARD_STEP_TRANSITION);
      demoMode.triggerOpenCleanupSheet();
      await sleep(TOUR_TIMING.SHEET_OPEN_DELAY);
    } else {
      demoMode.triggerAdvanceWizard(step);
      await sleep(TOUR_TIMING.WIZARD_STEP_TRANSITION);
    }
  }
}

/**
 * Main application tour steps
 *
 * This tour introduces users to the core features of the Budget application
 * after they complete the onboarding wizard.
 */
export const MAIN_TOUR_STEPS: TourStep[] = [
  // Getting Started chapter
  {
    id: MAIN_TOUR_STEP_IDS.WELCOME,
    targetSelector: "[data-tour-id='sidebar']",
    title: "Welcome to Budget!",
    description:
      "Let's take a quick tour of your new financial command center. This sidebar is your main navigation hub for accessing all areas of the app.",
    placement: "right",
    route: "/",
    highlightPadding: 0,
    chapter: "getting-started",
    setup: async () => {
      await gotoTour("/");
    },
  },
  {
    id: MAIN_TOUR_STEP_IDS.SIDEBAR_NAV,
    targetSelector: "[data-tour-id='main-navigation']",
    title: "Main Navigation",
    description:
      "Use these links to access key areas: Dashboard for overview, Budgets for spending plans, Schedules for recurring transactions, and more.",
    placement: "right",
    route: "/",
    chapter: "getting-started",
    setup: async () => {
      await gotoTour("/");
    },
  },
  {
    id: MAIN_TOUR_STEP_IDS.ACCOUNTS_LIST,
    targetSelector: "[data-help-id='accounts-list']",
    title: "Your Accounts",
    description:
      "All your accounts appear here. Click any account to view its transactions and balance. Your total on-budget balance is shown at the top.",
    placement: "right",
    route: "/",
    chapter: "getting-started",
    setup: async () => {
      await gotoTour("/");
    },
  },
  {
    id: MAIN_TOUR_STEP_IDS.ADD_ACCOUNT,
    targetSelector: "[data-tour-id='add-account-button']",
    title: "Add New Accounts",
    description:
      "Click this button to add a new account. You can track checking, savings, credit cards, loans, and more.",
    placement: "right",
    route: "/",
    chapter: "getting-started",
    setup: async () => {
      await gotoTour("/");
    },
  },
  // Navigation chapter
  {
    id: MAIN_TOUR_STEP_IDS.BUDGETS_PAGE,
    targetSelector: "[data-tour-id='budgets-page']",
    title: "Budgets",
    description:
      "Create and manage your spending budgets here. Set limits for different categories and track your progress throughout the month.",
    placement: "bottom",
    route: "/budgets",
    chapter: "navigation",
    setup: async () => {
      await gotoTour("/budgets");
    },
  },
  {
    id: MAIN_TOUR_STEP_IDS.SCHEDULES_PAGE,
    targetSelector: "[data-tour-id='schedules-page']",
    title: "Scheduled Transactions",
    description:
      "Set up recurring transactions for bills, income, and regular expenses. They'll be automatically created when due.",
    placement: "bottom",
    route: "/schedules",
    chapter: "navigation",
    setup: async () => {
      await gotoTour("/schedules");
    },
  },
  {
    id: MAIN_TOUR_STEP_IDS.CATEGORIES_PAGE,
    targetSelector: "[data-tour-id='categories-page']",
    title: "Categories",
    description:
      "Organize your spending with categories. We've set up smart defaults based on your profile, but you can customize them anytime.",
    placement: "bottom",
    route: "/categories",
    chapter: "navigation",
    setup: async () => {
      await gotoTour("/categories");
    },
  },
  {
    id: MAIN_TOUR_STEP_IDS.PAYEES_PAGE,
    targetSelector: "[data-tour-id='payees-page']",
    title: "Payees",
    description:
      "Track who you pay and receive money from. Set default categories for payees to speed up transaction entry.",
    placement: "bottom",
    route: "/payees",
    chapter: "navigation",
    setup: async () => {
      await gotoTour("/payees");
    },
  },
  {
    id: MAIN_TOUR_STEP_IDS.IMPORT_TAB,
    targetSelector: "[data-tour-id='import-page']",
    title: "Import Transactions",
    description:
      "Import transactions from your bank using CSV files. Our smart import wizard will help match and categorize transactions automatically.",
    placement: "bottom",
    route: "/import",
    chapter: "navigation",
    setup: async () => {
      await gotoTour("/import");
    },
  },
  // Help & Settings chapter
  {
    id: MAIN_TOUR_STEP_IDS.HELP_BUTTON,
    targetSelector: "[data-help-id='help-button']",
    title: "Help Mode",
    description:
      "Need help understanding any feature? Click this button to enable Help Mode, then hover over any element to learn what it does.",
    placement: "bottom",
    route: "/",
    chapter: "help-and-settings",
    setup: async () => {
      await gotoTour("/");
    },
  },
  {
    id: MAIN_TOUR_STEP_IDS.SETTINGS_BUTTON,
    targetSelector: "[data-help-id='settings-button']",
    title: "Settings",
    description:
      "Access your preferences, workspace settings, and configure integrations here. You can also manage your profile and workspace members.",
    placement: "bottom",
    route: "/",
    chapter: "help-and-settings",
    setup: async () => {
      await gotoTour("/");
    },
  },
  // Finish chapter
  {
    id: MAIN_TOUR_STEP_IDS.COMPLETE,
    targetSelector: "[data-tour-id='dashboard']",
    title: "You're All Set!",
    description:
      "That's the basics! Start by adding your first account or importing transactions. You can restart this tour anytime from the Help menu.",
    placement: "top",
    route: "/",
    chapter: "finish",
    setup: async () => {
      await gotoTour("/");
    },
  },
];

/**
 * Abbreviated tour for users who skip onboarding
 * Just covers the essentials in 5 steps
 */
export const QUICK_TOUR_STEPS: TourStep[] = [
  MAIN_TOUR_STEPS[0], // Welcome
  MAIN_TOUR_STEPS[2], // Accounts
  MAIN_TOUR_STEPS[4], // Budgets
  MAIN_TOUR_STEPS[9], // Help
  MAIN_TOUR_STEPS[11], // Complete
];

/**
 * Tour steps for the import wizard (contextual)
 */
export const IMPORT_TOUR_STEPS: TourStep[] = [
  {
    id: "import-upload",
    targetSelector: "[data-tour-id='import-upload']",
    title: "Upload Your File",
    description: "Start by uploading a CSV or QFX file exported from your bank.",
    placement: "bottom",
  },
  {
    id: "import-columns",
    targetSelector: "[data-tour-id='import-columns']",
    title: "Map Columns",
    description: "Match the columns in your file to the required transaction fields.",
    placement: "bottom",
  },
  {
    id: "import-preview",
    targetSelector: "[data-tour-id='import-preview']",
    title: "Review & Import",
    description: "Preview your transactions, clean up payees, and assign categories before importing.",
    placement: "bottom",
  },
];

/**
 * Account Page Tour Step IDs
 */
export const ACCOUNT_TOUR_STEP_IDS = {
  OVERVIEW: "account-overview",
  TRANSACTIONS_TAB: "transactions-tab",
  ADD_TRANSACTION: "add-transaction",
  ANALYTICS_TAB: "analytics-tab",
  INTELLIGENCE_TAB: "intelligence-tab",
  SCHEDULES_TAB: "schedules-tab",
  BUDGETS_TAB: "budgets-tab",
  SETTINGS_TAB: "settings-tab",
  IMPORT_INTRO: "import-intro",
  IMPORT_UPLOAD: "demo-import-upload",
  IMPORT_MAPPING: "demo-import-mapping",
  IMPORT_PREVIEW: "demo-import-preview",
  IMPORT_SCHEDULES: "demo-import-schedules",
  IMPORT_ENTITIES: "demo-import-entities",
  IMPORT_COMPLETE: "demo-import-complete",
  TOUR_COMPLETE: "account-tour-complete",
} as const;

export type AccountTourStepId = (typeof ACCOUNT_TOUR_STEP_IDS)[keyof typeof ACCOUNT_TOUR_STEP_IDS];

/**
 * Budget Page Tour Step IDs
 */
export const BUDGET_TOUR_STEP_IDS = {
  OVERVIEW: "budget-overview",
  SUMMARY: "budget-summary",
  BUDGET_LIST: "budget-list",
  CREATE_BUDGET: "create-budget",
  OVERVIEW_TAB: "budget-overview-tab",
  RECOMMENDATIONS_TAB: "budget-recommendations-tab",
  GROUPS_TAB: "budget-groups-tab",
  FUND_TRANSFER_TAB: "budget-fund-transfer-tab",
  ROLLOVER_TAB: "budget-rollover-tab",
  ANALYTICS_TAB: "budget-analytics-tab",
} as const;

export type BudgetTourStepId = (typeof BUDGET_TOUR_STEP_IDS)[keyof typeof BUDGET_TOUR_STEP_IDS];

/**
 * Schedules Page Tour Step IDs
 */
export const SCHEDULE_TOUR_STEP_IDS = {
  OVERVIEW: "schedules-overview",
  SCHEDULE_LIST: "schedules-list",
  CREATE_SCHEDULE: "create-schedule",
  PATTERNS_BUTTON: "schedules-patterns-button",
} as const;

export type ScheduleTourStepId = (typeof SCHEDULE_TOUR_STEP_IDS)[keyof typeof SCHEDULE_TOUR_STEP_IDS];

/**
 * Payees Page Tour Step IDs
 */
export const PAYEE_TOUR_STEP_IDS = {
  OVERVIEW: "payees-overview",
  PAYEE_LIST: "payees-list",
  CREATE_PAYEE: "create-payee",
  CATEGORIES_BUTTON: "payees-categories-button",
  ANALYTICS_BUTTON: "payees-analytics-button",
  CLEANUP_BUTTON: "payees-cleanup-button",
} as const;

export type PayeeTourStepId = (typeof PAYEE_TOUR_STEP_IDS)[keyof typeof PAYEE_TOUR_STEP_IDS];

/**
 * Categories Page Tour Step IDs
 */
export const CATEGORY_TOUR_STEP_IDS = {
  OVERVIEW: "categories-overview",
  CATEGORY_LIST: "categories-list",
  CREATE_CATEGORY: "create-category",
  SEED_CATEGORIES: "seed-categories",
  GROUPS_BUTTON: "categories-groups-button",
  ANALYTICS_BUTTON: "categories-analytics-button",
} as const;

export type CategoryTourStepId = (typeof CATEGORY_TOUR_STEP_IDS)[keyof typeof CATEGORY_TOUR_STEP_IDS];

// =============================================================================
// Deep Dive Sub-Tours
// =============================================================================

/**
 * Transactions Deep Dive Steps
 *
 * Detailed walkthrough of transaction management features
 * These steps are integrated directly into the main tour flow
 */
export const TRANSACTIONS_DEEP_DIVE: TourStep[] = [
  {
    id: "txn-table-columns",
    targetSelector: "[data-tour-id='transactions-table-header']",
    title: "Transaction Table Columns",
    description:
      "Each column shows key information: date, payee, category, amount, and running balance. Click column headers to sort.",
    placement: "bottom",
    route: "/accounts/demo-checking?tab=transactions",
    chapter: "account-page/transactions",
    setup: async () => {
      await ensureDemoAccountSetup("/accounts/demo-checking?tab=transactions");
    },
  },
  {
    id: "txn-status-icons",
    targetSelector: "[data-tour-id='transactions-status']",
    title: "Transaction Status",
    description:
      "Status icons show if transactions are cleared, reconciled, or pending. Cleared transactions have been confirmed with your bank.",
    placement: "right",
    route: "/accounts/demo-checking?tab=transactions",
    chapter: "account-page/transactions",
    setup: async () => {
      await ensureDemoAccountSetup("/accounts/demo-checking?tab=transactions");
    },
  },
  {
    id: "txn-bulk-actions",
    targetSelector: "[data-tour-id='transactions-bulk-actions']",
    title: "Bulk Actions",
    description:
      "Select multiple transactions to categorize, tag, or delete them all at once. Great for organizing imported transactions.",
    placement: "bottom",
    route: "/accounts/demo-checking?tab=transactions",
    chapter: "account-page/transactions",
    setup: async () => {
      await ensureDemoAccountSetup("/accounts/demo-checking?tab=transactions");
    },
  },
  {
    id: "txn-filters",
    targetSelector: "[data-tour-id='transactions-filters']",
    title: "Filtering & Search",
    description:
      "Filter by date range, category, payee, or amount. Use the search box for quick text matching.",
    placement: "bottom",
    route: "/accounts/demo-checking?tab=transactions",
    chapter: "account-page/transactions",
    setup: async () => {
      await ensureDemoAccountSetup("/accounts/demo-checking?tab=transactions");
    },
  },
];

/**
 * Analytics Deep Dive Steps
 *
 * Detailed walkthrough of analytics and reporting features
 */
export const ANALYTICS_DEEP_DIVE: TourStep[] = [
  {
    id: "analytics-period",
    targetSelector: "[data-tour-id='analytics-period-selector']",
    title: "Time Period Selection",
    description:
      "View spending patterns over different periods: this month, quarter, year, or custom date ranges.",
    placement: "bottom",
    route: "/accounts/demo-checking?tab=analytics",
    chapter: "account-page/analytics",
    setup: async () => {
      await ensureDemoAccountSetup("/accounts/demo-checking?tab=analytics");
    },
  },
  {
    id: "analytics-category-breakdown",
    targetSelector: "[data-tour-id='analytics-category-chart']",
    title: "Category Breakdown",
    description:
      "See where your money goes with category-based charts. Click any segment for detailed transactions.",
    placement: "right",
    route: "/accounts/demo-checking?tab=analytics",
    chapter: "account-page/analytics",
    setup: async () => {
      await ensureDemoAccountSetup("/accounts/demo-checking?tab=analytics");
    },
  },
  {
    id: "analytics-trends",
    targetSelector: "[data-tour-id='analytics-trend-chart']",
    title: "Spending Trends",
    description:
      "Track how your spending changes over time. Identify patterns and seasonal variations.",
    placement: "bottom",
    route: "/accounts/demo-checking?tab=analytics",
    chapter: "account-page/analytics",
    setup: async () => {
      await ensureDemoAccountSetup("/accounts/demo-checking?tab=analytics");
    },
  },
];

/**
 * Intelligence Deep Dive Steps
 *
 * Detailed walkthrough of AI-powered insights
 */
export const INTELLIGENCE_DEEP_DIVE: TourStep[] = [
  {
    id: "intel-insights",
    targetSelector: "[data-tour-id='intelligence-insights']",
    title: "AI Insights",
    description:
      "Get intelligent observations about your spending patterns, unusual transactions, and optimization opportunities.",
    placement: "bottom",
    route: "/accounts/demo-checking?tab=intelligence",
    chapter: "account-page/intelligence",
    setup: async () => {
      await ensureDemoAccountSetup("/accounts/demo-checking?tab=intelligence");
    },
  },
  {
    id: "intel-anomalies",
    targetSelector: "[data-tour-id='intelligence-anomalies']",
    title: "Anomaly Detection",
    description:
      "AI automatically flags unusual transactions like duplicate charges, price changes, or unexpected fees.",
    placement: "bottom",
    route: "/accounts/demo-checking?tab=intelligence",
    chapter: "account-page/intelligence",
    setup: async () => {
      await ensureDemoAccountSetup("/accounts/demo-checking?tab=intelligence");
    },
  },
  {
    id: "intel-suggestions",
    targetSelector: "[data-tour-id='intelligence-suggestions']",
    title: "Smart Suggestions",
    description:
      "Receive personalized recommendations for budgeting, saving, and categorizing your transactions.",
    placement: "bottom",
    route: "/accounts/demo-checking?tab=intelligence",
    chapter: "account-page/intelligence",
    setup: async () => {
      await ensureDemoAccountSetup("/accounts/demo-checking?tab=intelligence");
    },
  },
];

/**
 * Schedules Deep Dive Steps (Account-level)
 *
 * Detailed walkthrough of recurring transaction management on account page
 */
export const SCHEDULES_DEEP_DIVE: TourStep[] = [
  {
    id: "acct-schedules-list",
    targetSelector: "[data-tour-id='account-schedules-list']",
    title: "Account Schedules",
    description:
      "View all scheduled transactions for this account: bills, subscriptions, income, and regular transfers.",
    placement: "bottom",
    route: "/accounts/demo-checking?tab=schedules",
    chapter: "account-page/schedules",
    setup: async () => {
      await ensureDemoAccountSetup("/accounts/demo-checking?tab=schedules");
    },
  },
  {
    id: "acct-schedules-frequency",
    targetSelector: "[data-tour-id='account-schedules-frequency']",
    title: "Frequency Options",
    description:
      "Set transactions to repeat weekly, biweekly, monthly, or on custom schedules. Skip holidays or weekends.",
    placement: "right",
    route: "/accounts/demo-checking?tab=schedules",
    chapter: "account-page/schedules",
    setup: async () => {
      await ensureDemoAccountSetup("/accounts/demo-checking?tab=schedules");
    },
  },
  {
    id: "acct-schedules-upcoming",
    targetSelector: "[data-tour-id='account-schedules-upcoming']",
    title: "Upcoming Payments",
    description:
      "See what payments are coming up and when. Plan ahead to avoid overdrafts or missed bills.",
    placement: "bottom",
    route: "/accounts/demo-checking?tab=schedules",
    chapter: "account-page/schedules",
    setup: async () => {
      await ensureDemoAccountSetup("/accounts/demo-checking?tab=schedules");
    },
  },
];

/**
 * Budgets Deep Dive Steps (Account-level)
 *
 * Detailed walkthrough of budget management features on account page
 */
export const BUDGETS_DEEP_DIVE: TourStep[] = [
  {
    id: "acct-budgets-overview",
    targetSelector: "[data-tour-id='account-budgets-overview']",
    title: "Account Budgets",
    description:
      "See all budgets linked to this account. Track progress toward your spending limits in each category.",
    placement: "bottom",
    route: "/accounts/demo-checking?tab=budgets",
    chapter: "account-page/budgets",
    setup: async () => {
      await ensureDemoAccountSetup("/accounts/demo-checking?tab=budgets");
    },
  },
  {
    id: "acct-budgets-progress",
    targetSelector: "[data-tour-id='account-budgets-progress']",
    title: "Progress Tracking",
    description:
      "Visual indicators show how much you have spent vs. budgeted. Green is on track, yellow is warning, red is over.",
    placement: "right",
    route: "/accounts/demo-checking?tab=budgets",
    chapter: "account-page/budgets",
    setup: async () => {
      await ensureDemoAccountSetup("/accounts/demo-checking?tab=budgets");
    },
  },
  {
    id: "acct-budgets-allocation",
    targetSelector: "[data-tour-id='account-budgets-allocation']",
    title: "Budget Allocation",
    description:
      "Allocate funds from this account to different spending categories. Move money between budgets as needed.",
    placement: "bottom",
    route: "/accounts/demo-checking?tab=budgets",
    chapter: "account-page/budgets",
    setup: async () => {
      await ensureDemoAccountSetup("/accounts/demo-checking?tab=budgets");
    },
  },
];

/**
 * Settings Deep Dive Steps (Account-level)
 *
 * Detailed walkthrough of account settings
 */
export const SETTINGS_DEEP_DIVE: TourStep[] = [
  {
    id: "acct-settings-details",
    targetSelector: "[data-tour-id='account-settings-details']",
    title: "Account Details",
    description:
      "Edit the account name, icon, and color. Add notes to remember important details about this account.",
    placement: "bottom",
    route: "/accounts/demo-checking?tab=settings",
    chapter: "account-page/settings",
    setup: async () => {
      await ensureDemoAccountSetup("/accounts/demo-checking?tab=settings");
    },
  },
  {
    id: "acct-settings-type",
    targetSelector: "[data-tour-id='account-settings-type']",
    title: "Account Type",
    description:
      "Change the account type (checking, savings, credit card, etc.) to affect how balances are calculated.",
    placement: "right",
    route: "/accounts/demo-checking?tab=settings",
    chapter: "account-page/settings",
    setup: async () => {
      await ensureDemoAccountSetup("/accounts/demo-checking?tab=settings");
    },
  },
  {
    id: "acct-settings-danger",
    targetSelector: "[data-tour-id='account-settings-danger-zone']",
    title: "Danger Zone",
    description:
      "Close or delete the account. Closed accounts are hidden but preserved. Deleted accounts are permanently removed.",
    placement: "top",
    route: "/accounts/demo-checking?tab=settings",
    chapter: "account-page/settings",
    setup: async () => {
      await ensureDemoAccountSetup("/accounts/demo-checking?tab=settings");
    },
  },
];

/**
 * Import Deep Dive Sub-Tour
 *
 * Full walkthrough of the import wizard process with demo data
 */
export const IMPORT_DEEP_DIVE: TourStep[] = [
  {
    id: ACCOUNT_TOUR_STEP_IDS.IMPORT_UPLOAD,
    targetSelector: "[data-tour-id='import-upload-zone']",
    title: "Step 1: Upload File",
    description:
      "Start by uploading a CSV or QFX file exported from your bank. Just drag and drop or click to browse.",
    placement: "right",
    highlightPadding: 8,
    chapter: "account-page/import",
    setup: async () => {
      await ensureDemoAccountSetup("/accounts/demo-checking?tab=import");
    },
  },
  {
    id: ACCOUNT_TOUR_STEP_IDS.IMPORT_MAPPING,
    targetSelector: "[data-tour-id='import-column-mapping']",
    title: "Step 2: Map Columns",
    description:
      "We automatically detect column types, but you can adjust the mapping if needed. Match date, amount, and description columns.",
    placement: "right",
    highlightPadding: 8,
    chapter: "account-page/import",
    setup: async () => {
      await ensureDemoAccountSetup("/accounts/demo-checking?tab=import");
      await advanceImportWizardTo("map-columns");
    },
  },
  {
    id: ACCOUNT_TOUR_STEP_IDS.IMPORT_PREVIEW,
    targetSelector: "[data-tour-id='import-cleanup-sheet']",
    title: "Step 3: Preview & Clean Up",
    description:
      "The payee cleanup tool groups similar payees together. You can accept suggestions, merge payees, or enter custom names. This helps keep your data organized.",
    placement: "left",
    highlightPadding: 12,
    chapter: "account-page/import",
    setup: async () => {
      await ensureDemoAccountSetup("/accounts/demo-checking?tab=import");
      await advanceImportWizardTo("preview");
      // Update the target rect now that the sheet is fully open
      spotlightTour.updateTargetRect();
    },
  },
  {
    id: ACCOUNT_TOUR_STEP_IDS.IMPORT_SCHEDULES,
    targetSelector: "[data-tour-id='import-schedules']",
    title: "Step 4: Match Schedules",
    description:
      "We detect transactions that might match your recurring schedules. Link them to avoid duplicates and keep your schedules in sync.",
    placement: "right",
    highlightPadding: 8,
    chapter: "account-page/import",
    setup: async () => {
      await ensureDemoAccountSetup("/accounts/demo-checking?tab=import");
      await advanceImportWizardTo("review-schedules");
    },
  },
  {
    id: ACCOUNT_TOUR_STEP_IDS.IMPORT_ENTITIES,
    targetSelector: "[data-tour-id='import-entities']",
    title: "Step 5: Review New Entities",
    description:
      "Review any new payees or categories that will be created. You can skip creation or merge with existing ones.",
    placement: "right",
    highlightPadding: 8,
    chapter: "account-page/import",
    setup: async () => {
      await ensureDemoAccountSetup("/accounts/demo-checking?tab=import");
      await advanceImportWizardTo("review-entities");
    },
  },
  {
    id: ACCOUNT_TOUR_STEP_IDS.IMPORT_COMPLETE,
    targetSelector: "[data-tour-id='import-complete']",
    title: "Import Complete!",
    description:
      "Your transactions have been imported. You'll see a summary of what was created and any issues to review.",
    placement: "right",
    highlightPadding: 8,
    chapter: "account-page/import",
    setup: async () => {
      await ensureDemoAccountSetup("/accounts/demo-checking?tab=import");
      await advanceImportWizardTo("complete");
    },
  },
];

/**
 * Account Page Tour Steps
 *
 * A comprehensive tour of the account page, including all tabs and
 * a full walkthrough of the import process using demo data.
 */
export const ACCOUNT_PAGE_TOUR_STEPS: TourStep[] = [
  // Account Overview
  {
    id: ACCOUNT_TOUR_STEP_IDS.OVERVIEW,
    targetSelector: "[data-tour-id='account-header']",
    title: "Overview",
    description:
      "This is your account page. Here you can see your account balance, recent transactions, and access various features through the tabs below.",
    placement: "bottom",
    route: "/accounts/demo-checking",
    highlightPadding: 12,
    chapter: "account-page",
    setup: async () => {
      await ensureDemoAccountSetup("/accounts/demo-checking");
    },
  },

  // Transactions Tab
  {
    id: ACCOUNT_TOUR_STEP_IDS.TRANSACTIONS_TAB,
    targetSelector: "[data-tour-id='transactions-tab']",
    title: "Transactions",
    description:
      "The Transactions tab shows all your transactions for this account. You can filter, search, and sort to find exactly what you're looking for.",
    placement: "bottom",
    route: "/accounts/demo-checking?tab=transactions",
    chapter: "account-page",
    setup: async () => {
      await ensureDemoAccountSetup("/accounts/demo-checking?tab=transactions");
    },
  },

  // Transactions Deep Dive Steps
  ...TRANSACTIONS_DEEP_DIVE,

  // Add Transaction Button
  {
    id: ACCOUNT_TOUR_STEP_IDS.ADD_TRANSACTION,
    targetSelector: "[data-tour-id='add-transaction-button']",
    title: "Add Transaction",
    description:
      "Click here to manually add a new transaction. You can record income, expenses, or transfers between accounts.",
    placement: "bottom",
    route: "/accounts/demo-checking?tab=transactions",
    chapter: "account-page",
    setup: async () => {
      await ensureDemoAccountSetup("/accounts/demo-checking?tab=transactions");
    },
  },

  // Analytics Tab
  {
    id: ACCOUNT_TOUR_STEP_IDS.ANALYTICS_TAB,
    targetSelector: "[data-tour-id='analytics-tab']",
    title: "Analytics",
    description:
      "View spending trends, category breakdowns, and other insights about your account activity over time.",
    placement: "bottom",
    route: "/accounts/demo-checking?tab=analytics",
    chapter: "account-page",
    setup: async () => {
      await ensureDemoAccountSetup("/accounts/demo-checking?tab=analytics");
    },
  },

  // Analytics Deep Dive Steps
  ...ANALYTICS_DEEP_DIVE,

  // Intelligence Tab
  {
    id: ACCOUNT_TOUR_STEP_IDS.INTELLIGENCE_TAB,
    targetSelector: "[data-tour-id='intelligence-tab']",
    title: "AI Intelligence",
    description:
      "Get AI-powered insights about your spending patterns, anomalies, and personalized recommendations for this account.",
    placement: "bottom",
    route: "/accounts/demo-checking?tab=intelligence",
    chapter: "account-page",
    setup: async () => {
      await ensureDemoAccountSetup("/accounts/demo-checking?tab=intelligence");
    },
  },

  // Intelligence Deep Dive Steps
  ...INTELLIGENCE_DEEP_DIVE,

  // Schedules Tab
  {
    id: ACCOUNT_TOUR_STEP_IDS.SCHEDULES_TAB,
    targetSelector: "[data-tour-id='schedules-tab']",
    title: "Scheduled Transactions",
    description:
      "See all recurring transactions for this account. Manage subscriptions, regular bills, and income schedules.",
    placement: "bottom",
    route: "/accounts/demo-checking?tab=schedules",
    chapter: "account-page",
    setup: async () => {
      await ensureDemoAccountSetup("/accounts/demo-checking?tab=schedules");
    },
  },

  // Schedules Deep Dive Steps
  ...SCHEDULES_DEEP_DIVE,

  // Budgets Tab
  {
    id: ACCOUNT_TOUR_STEP_IDS.BUDGETS_TAB,
    targetSelector: "[data-tour-id='budgets-tab']",
    title: "Account Budgets",
    description:
      "View and manage budgets associated with this account. Track spending against your budget limits.",
    placement: "bottom",
    route: "/accounts/demo-checking?tab=budgets",
    chapter: "account-page",
    setup: async () => {
      await ensureDemoAccountSetup("/accounts/demo-checking?tab=budgets");
    },
  },

  // Budgets Deep Dive Steps
  ...BUDGETS_DEEP_DIVE,

  // Settings Tab
  {
    id: ACCOUNT_TOUR_STEP_IDS.SETTINGS_TAB,
    targetSelector: "[data-tour-id='settings-tab']",
    title: "Account Settings",
    description:
      "Configure account details like name, icon, color, and debt-specific settings. You can also close or delete the account here.",
    placement: "bottom",
    route: "/accounts/demo-checking?tab=settings",
    chapter: "account-page",
    setup: async () => {
      await ensureDemoAccountSetup("/accounts/demo-checking?tab=settings");
    },
  },

  // Settings Deep Dive Steps
  ...SETTINGS_DEEP_DIVE,

  // Import Tab
  {
    id: ACCOUNT_TOUR_STEP_IDS.IMPORT_INTRO,
    targetSelector: "[data-tour-id='import-tab']",
    title: "Import Transactions",
    description:
      "Import transactions from your bank using CSV or QFX files. Our smart wizard automatically detects columns, matches payees, and suggests categories.",
    placement: "bottom",
    route: "/accounts/demo-checking?tab=import",
    chapter: "account-page",
    childChapterId: "account-page/import",
    setup: async () => {
      await ensureDemoAccountSetup("/accounts/demo-checking?tab=import");
    },
  },

  // Import Wizard Steps (inline as children of Import Transactions)
  ...IMPORT_DEEP_DIVE,

  // Tour Complete
  {
    id: ACCOUNT_TOUR_STEP_IDS.TOUR_COMPLETE,
    targetSelector: "[data-tour-id='account-header']",
    title: "Tour Complete!",
    description:
      "You've completed the account page tour! You now know how to manage transactions, view analytics, and import data. Exit demo mode to start using the app with your real data.",
    placement: "bottom",
    route: "/accounts/demo-checking?tab=transactions",
    highlightPadding: 12,
    chapter: "finish",
    setup: async () => {
      await ensureDemoAccountSetup("/accounts/demo-checking?tab=transactions");
    },
  },
];

// =============================================================================
// Budget Page Tour Steps
// =============================================================================

/**
 * Budget Page Tour Steps
 *
 * A comprehensive tour of the budget page, covering all tabs and features.
 * Demo budget data is generated to show realistic progress and recommendations.
 */
export const BUDGET_PAGE_TOUR_STEPS: TourStep[] = [
  // Budget Overview
  {
    id: BUDGET_TOUR_STEP_IDS.OVERVIEW,
    targetSelector: "[data-tour-id='budgets-page']",
    title: "Budget Overview",
    description:
      "Welcome to your Budgets page! Here you can track spending limits, manage envelope budgets, and work toward savings goals.",
    placement: "bottom",
    route: "/budgets",
    highlightPadding: 8,
    chapter: "budget-page",
    setup: async () => {
      await ensureDemoAccountSetup("/budgets");
    },
  },

  // Budget Summary Cards
  {
    id: BUDGET_TOUR_STEP_IDS.SUMMARY,
    targetSelector: "[data-tour-id='budget-summary']",
    title: "Budget Summary",
    description:
      "These cards show your total allocated budget, how much you've spent, what's remaining, and any budgets that need attention.",
    placement: "bottom",
    route: "/budgets",
    chapter: "budget-page",
    setup: async () => {
      await ensureDemoAccountSetup("/budgets");
    },
  },

  // Budget List
  {
    id: BUDGET_TOUR_STEP_IDS.BUDGET_LIST,
    targetSelector: "[data-tour-id='budget-list']",
    title: "Your Budgets",
    description:
      "View all your budgets here. Each budget shows its progress with color-coded indicators: green for on track, yellow for approaching limit, and red for over budget.",
    placement: "top",
    route: "/budgets",
    chapter: "budget-page",
    setup: async () => {
      await ensureDemoAccountSetup("/budgets");
    },
  },

  // Create Budget Button
  {
    id: BUDGET_TOUR_STEP_IDS.CREATE_BUDGET,
    targetSelector: "[data-tour-id='create-budget-button']",
    title: "Create a Budget",
    description:
      "Click here to create a new budget. Choose from account-based spending limits, category envelope budgets, or goal-based savings targets.",
    placement: "bottom",
    route: "/budgets",
    chapter: "budget-page",
    setup: async () => {
      await ensureDemoAccountSetup("/budgets");
    },
  },

  // Budget Tabs Overview
  {
    id: BUDGET_TOUR_STEP_IDS.OVERVIEW_TAB,
    targetSelector: "[data-tour-id='budget-overview-tab']",
    title: "Budget Overview Tab",
    description:
      "The Overview tab displays all your budgets with their current status. Filter, search, and sort to find specific budgets.",
    placement: "bottom",
    route: "/budgets",
    chapter: "budget-page",
    setup: async () => {
      await ensureDemoAccountSetup("/budgets");
    },
  },

  // Recommendations Tab
  {
    id: BUDGET_TOUR_STEP_IDS.RECOMMENDATIONS_TAB,
    targetSelector: "[data-tour-id='budget-recommendations-tab']",
    title: "Smart Recommendations",
    description:
      "Get AI-powered suggestions to optimize your budgets. Recommendations might suggest increasing, decreasing, or reallocating budget amounts based on your spending patterns.",
    placement: "bottom",
    route: "/budgets",
    chapter: "budget-page",
    setup: async () => {
      await ensureDemoAccountSetup("/budgets");
    },
  },

  // Groups Tab
  {
    id: BUDGET_TOUR_STEP_IDS.GROUPS_TAB,
    targetSelector: "[data-tour-id='budget-groups-tab']",
    title: "Budget Groups",
    description:
      "Organize related budgets into groups for easier tracking. For example, group all essential expenses or savings goals together.",
    placement: "bottom",
    route: "/budgets",
    chapter: "budget-page",
    setup: async () => {
      await ensureDemoAccountSetup("/budgets");
    },
  },

  // Fund Transfer Tab
  {
    id: BUDGET_TOUR_STEP_IDS.FUND_TRANSFER_TAB,
    targetSelector: "[data-tour-id='budget-fund-transfer-tab']",
    title: "Fund Transfer",
    description:
      "Move allocated funds between budgets when your spending priorities change. Transfer from a budget with surplus to one that needs more.",
    placement: "bottom",
    route: "/budgets",
    chapter: "budget-page",
    setup: async () => {
      await ensureDemoAccountSetup("/budgets");
    },
  },

  // Rollover Tab
  {
    id: BUDGET_TOUR_STEP_IDS.ROLLOVER_TAB,
    targetSelector: "[data-tour-id='budget-rollover-tab']",
    title: "Rollover Manager",
    description:
      "Control how unused budget amounts carry over to the next period. Choose to roll over, reset to zero, or cap at a maximum amount.",
    placement: "bottom",
    route: "/budgets",
    chapter: "budget-page",
    setup: async () => {
      await ensureDemoAccountSetup("/budgets");
    },
  },

  // Analytics Tab
  {
    id: BUDGET_TOUR_STEP_IDS.ANALYTICS_TAB,
    targetSelector: "[data-tour-id='budget-analytics-tab']",
    title: "Budget Analytics",
    description:
      "Analyze spending trends and forecast future budget performance. See historical comparisons and identify patterns in your budgeting.",
    placement: "bottom",
    route: "/budgets",
    chapter: "budget-page",
    setup: async () => {
      await ensureDemoAccountSetup("/budgets");
    },
  },
];

// =============================================================================
// Schedules Page Tour Steps
// =============================================================================

/**
 * Schedules Page Tour Steps
 *
 * A focused tour of the schedules page, covering the list view and key actions.
 * Demo schedule data is used to show realistic recurring transactions.
 */
export const SCHEDULE_PAGE_TOUR_STEPS: TourStep[] = [
  // Schedules Overview
  {
    id: SCHEDULE_TOUR_STEP_IDS.OVERVIEW,
    targetSelector: "[data-tour-id='schedules-page']",
    title: "Scheduled Transactions",
    description:
      "Welcome to your Schedules page! Set up recurring transactions for bills, income, and regular expenses. They'll be automatically created when due.",
    placement: "bottom",
    route: "/schedules",
    highlightPadding: 8,
    chapter: "schedules-page",
    setup: async () => {
      await ensureDemoAccountSetup("/schedules");
    },
  },

  // Schedule List
  {
    id: SCHEDULE_TOUR_STEP_IDS.SCHEDULE_LIST,
    targetSelector: "[data-tour-id='schedules-list']",
    title: "Your Schedules",
    description:
      "View all your recurring transactions here. See the next occurrence date, amount, and linked payee/category for each schedule.",
    placement: "top",
    route: "/schedules",
    chapter: "schedules-page",
    setup: async () => {
      await ensureDemoAccountSetup("/schedules");
    },
  },

  // Create Schedule Button
  {
    id: SCHEDULE_TOUR_STEP_IDS.CREATE_SCHEDULE,
    targetSelector: "[data-tour-id='create-schedule-button']",
    title: "Add a Schedule",
    description:
      "Click here to create a new recurring transaction. Set the frequency, amount, and link it to a payee and category.",
    placement: "bottom",
    route: "/schedules",
    chapter: "schedules-page",
    setup: async () => {
      await ensureDemoAccountSetup("/schedules");
    },
  },

  // Patterns Button
  {
    id: SCHEDULE_TOUR_STEP_IDS.PATTERNS_BUTTON,
    targetSelector: "[data-tour-id='schedules-patterns-button']",
    title: "Spending Patterns",
    description:
      "Analyze your recurring spending patterns. Identify subscriptions and regular expenses you might want to review.",
    placement: "bottom",
    route: "/schedules",
    chapter: "schedules-page",
    setup: async () => {
      await ensureDemoAccountSetup("/schedules");
    },
  },
];

// =============================================================================
// Payees Page Tour Steps
// =============================================================================

/**
 * Payees Page Tour Steps
 *
 * A focused tour of the payees page, covering the list view, actions, and management tools.
 * Demo payee data is used to show realistic merchant and contact management.
 */
export const PAYEE_PAGE_TOUR_STEPS: TourStep[] = [
  // Payees Overview
  {
    id: PAYEE_TOUR_STEP_IDS.OVERVIEW,
    targetSelector: "[data-tour-id='payees-page']",
    title: "Your Payees",
    description:
      "Welcome to your Payees page! Manage merchants, vendors, and people you transact with. Set default categories for faster transaction entry.",
    placement: "bottom",
    route: "/payees",
    highlightPadding: 8,
    chapter: "payees-page",
    setup: async () => {
      await ensureDemoAccountSetup("/payees");
    },
  },

  // Payee List
  {
    id: PAYEE_TOUR_STEP_IDS.PAYEE_LIST,
    targetSelector: "[data-tour-id='payees-list']",
    title: "Payee Directory",
    description:
      "View all your payees here. Each payee can have a default category, contact info, and transaction history. Toggle between grid and list views.",
    placement: "top",
    route: "/payees",
    chapter: "payees-page",
    setup: async () => {
      await ensureDemoAccountSetup("/payees");
    },
  },

  // Create Payee Button
  {
    id: PAYEE_TOUR_STEP_IDS.CREATE_PAYEE,
    targetSelector: "[data-tour-id='create-payee-button']",
    title: "Add a Payee",
    description:
      "Click here to manually add a new payee. Set their default category and contact details for easy transaction management.",
    placement: "bottom",
    route: "/payees",
    chapter: "payees-page",
    setup: async () => {
      await ensureDemoAccountSetup("/payees");
    },
  },

  // Manage Categories Button
  {
    id: PAYEE_TOUR_STEP_IDS.CATEGORIES_BUTTON,
    targetSelector: "[data-tour-id='payees-categories-button']",
    title: "Manage Categories",
    description:
      "Organize your payees into custom categories. Group similar merchants together for better reporting and budgeting.",
    placement: "bottom",
    route: "/payees",
    chapter: "payees-page",
    setup: async () => {
      await ensureDemoAccountSetup("/payees");
    },
  },

  // Analytics Button
  {
    id: PAYEE_TOUR_STEP_IDS.ANALYTICS_BUTTON,
    targetSelector: "[data-tour-id='payees-analytics-button']",
    title: "Payee Analytics",
    description:
      "View spending analytics across all payees. See who you spend most with and track trends over time.",
    placement: "bottom",
    route: "/payees",
    chapter: "payees-page",
    setup: async () => {
      await ensureDemoAccountSetup("/payees");
    },
  },

  // Cleanup Button
  {
    id: PAYEE_TOUR_STEP_IDS.CLEANUP_BUTTON,
    targetSelector: "[data-tour-id='payees-cleanup-button']",
    title: "Payee Cleanup",
    description:
      "Use AI-powered cleanup to merge duplicate payees and standardize names. Keep your payee list organized and consistent.",
    placement: "bottom",
    route: "/payees",
    chapter: "payees-page",
    setup: async () => {
      await ensureDemoAccountSetup("/payees");
    },
  },
];

// =============================================================================
// Categories Page Tour Steps
// =============================================================================

/**
 * Categories Page Tour Steps
 *
 * A focused tour of the categories page, covering the list view, actions, and management tools.
 * Demo category data is used to show realistic category organization.
 */
export const CATEGORY_PAGE_TOUR_STEPS: TourStep[] = [
  // Categories Overview
  {
    id: CATEGORY_TOUR_STEP_IDS.OVERVIEW,
    targetSelector: "[data-tour-id='categories-page']",
    title: "Your Categories",
    description:
      "Welcome to your Categories page! Organize your transactions into meaningful categories for better tracking and budgeting.",
    placement: "bottom",
    route: "/categories",
    highlightPadding: 8,
    chapter: "categories-page",
    setup: async () => {
      await ensureDemoAccountSetup("/categories");
    },
  },

  // Category List
  {
    id: CATEGORY_TOUR_STEP_IDS.CATEGORY_LIST,
    targetSelector: "[data-tour-id='categories-list']",
    title: "Category Directory",
    description:
      "View all your categories here. Switch between grid, list, and hierarchy views. Each category can have a color, icon, and parent category.",
    placement: "top",
    route: "/categories",
    chapter: "categories-page",
    setup: async () => {
      await ensureDemoAccountSetup("/categories");
    },
  },

  // Create Category Button
  {
    id: CATEGORY_TOUR_STEP_IDS.CREATE_CATEGORY,
    targetSelector: "[data-tour-id='create-category-button']",
    title: "Add a Category",
    description:
      "Click here to create a new category. Set a name, color, icon, and optionally assign it to a parent category for hierarchical organization.",
    placement: "bottom",
    route: "/categories",
    chapter: "categories-page",
    setup: async () => {
      await ensureDemoAccountSetup("/categories");
    },
  },

  // Seed Default Categories Button
  {
    id: CATEGORY_TOUR_STEP_IDS.SEED_CATEGORIES,
    targetSelector: "[data-tour-id='seed-categories-button']",
    title: "Seed Default Categories",
    description:
      "Get started quickly by seeding a set of commonly-used default categories. This creates a ready-to-use category hierarchy.",
    placement: "bottom",
    route: "/categories",
    chapter: "categories-page",
    setup: async () => {
      await ensureDemoAccountSetup("/categories");
    },
  },

  // Group Management Button
  {
    id: CATEGORY_TOUR_STEP_IDS.GROUPS_BUTTON,
    targetSelector: "[data-tour-id='categories-groups-button']",
    title: "Category Groups",
    description:
      "Organize categories into groups for reporting. Create groups like 'Essential Expenses' or 'Discretionary Spending' for better insights.",
    placement: "bottom",
    route: "/categories",
    chapter: "categories-page",
    setup: async () => {
      await ensureDemoAccountSetup("/categories");
    },
  },

  // Analytics Button
  {
    id: CATEGORY_TOUR_STEP_IDS.ANALYTICS_BUTTON,
    targetSelector: "[data-tour-id='categories-analytics-button']",
    title: "Category Analytics",
    description:
      "View spending analytics across all categories. See which categories consume most of your budget and track trends over time.",
    placement: "bottom",
    route: "/categories",
    chapter: "categories-page",
    setup: async () => {
      await ensureDemoAccountSetup("/categories");
    },
  },
];

// =============================================================================
// Unified Tour (combines Main and Account Page tours)
// =============================================================================

/**
 * Unified Tour Steps
 *
 * A comprehensive tour that covers the entire application:
 * 1. Getting Started - Sidebar navigation and account basics
 * 2. Navigation - Main pages overview (with demo data visible)
 * 3. Account Page - Detailed account features and import wizard
 * 4. Budget Page - Budget management, recommendations, and analytics
 * 5. Schedules Page - Recurring transaction management
 * 6. Payees Page - Payee management and organization
 * 7. Categories Page - Category organization and management
 * 8. Help & Settings - Accessing help and preferences
 * 9. Finish - Tour completion
 */
export const UNIFIED_TOUR_STEPS: TourStep[] = [
  // Getting Started (from Main Tour)
  ...MAIN_TOUR_STEPS.filter((step) => step.chapter === "getting-started"),

  // Navigation (from Main Tour)
  ...MAIN_TOUR_STEPS.filter((step) => step.chapter === "navigation"),

  // Account Page (from Account Page Tour - excluding finish)
  ...ACCOUNT_PAGE_TOUR_STEPS.filter((step) => step.chapter !== "finish"),

  // Budget Page (from Budget Page Tour)
  ...BUDGET_PAGE_TOUR_STEPS,

  // Schedules Page (from Schedule Page Tour)
  ...SCHEDULE_PAGE_TOUR_STEPS,

  // Payees Page (from Payee Page Tour)
  ...PAYEE_PAGE_TOUR_STEPS,

  // Categories Page (from Category Page Tour)
  ...CATEGORY_PAGE_TOUR_STEPS,

  // Help & Settings (from Main Tour) - shown at end before finish
  ...MAIN_TOUR_STEPS.filter((step) => step.chapter === "help-and-settings"),

  // Unified Finish
  // Note: Cleanup (demoMode.endTour(), demoMode.deactivate()) is handled in
  // the onComplete callback passed to spotlightTour.start(), not here.
  // This allows different callers (onboarding choice, help menu) to handle
  // post-tour navigation differently.
  {
    id: "unified-tour-complete",
    targetSelector: "[data-tour-id='sidebar']",
    title: "You're All Set!",
    description:
      "Congratulations! You've completed the full tour. You now know how to navigate the app, manage accounts, budgets, view analytics, and import transactions. Start using the app with your real data or restart this tour anytime from the Help menu.",
    placement: "right",
    route: "/",
    highlightPadding: 0,
    chapter: "finish",
    setup: async () => {
      // Navigate to home for the finish step display
      // Demo mode cleanup happens in onComplete callback
      await gotoTour("/");
    },
  },
];
