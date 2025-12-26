/**
 * Tour Steps Configuration
 *
 * Defines the steps for the spotlight tour that guides new users
 * through the application interface.
 */

import { goto } from "$app/navigation";
import { demoMode } from "$lib/states/ui/demo-mode.svelte";
import { spotlightTour } from "$lib/states/ui/spotlight-tour.svelte";
import type { TourStep } from "$lib/types/spotlight-tour";
import { MAIN_TOUR_STEP_IDS } from "$lib/types/spotlight-tour";

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
    await goto(route);
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
      await goto("/");
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
      await goto("/");
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
      await goto("/");
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
      await goto("/");
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
      await goto("/budgets");
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
      await goto("/schedules");
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
      await goto("/categories");
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
      await goto("/payees");
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
      await goto("/import");
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
      await goto("/");
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
      await goto("/");
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
      await goto("/");
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

// =============================================================================
// Deep Dive Sub-Tours
// =============================================================================

/**
 * Transactions Deep Dive Sub-Tour
 *
 * Detailed walkthrough of transaction management features
 */
export const TRANSACTIONS_DEEP_DIVE: TourStep[] = [
  {
    id: "txn-table-columns",
    targetSelector: "[data-tour-id='transactions-table-header']",
    title: "Transaction Table Columns",
    description:
      "Each column shows key information: date, payee, category, amount, and running balance. Click column headers to sort.",
    placement: "bottom",
  },
  {
    id: "txn-status-icons",
    targetSelector: "[data-tour-id='transactions-status']",
    title: "Transaction Status",
    description:
      "Status icons show if transactions are cleared, reconciled, or pending. Cleared transactions have been confirmed with your bank.",
    placement: "right",
  },
  {
    id: "txn-bulk-actions",
    targetSelector: "[data-tour-id='transactions-bulk-actions']",
    title: "Bulk Actions",
    description:
      "Select multiple transactions to categorize, tag, or delete them all at once. Great for organizing imported transactions.",
    placement: "bottom",
  },
  {
    id: "txn-filters",
    targetSelector: "[data-tour-id='transactions-filters']",
    title: "Filtering & Search",
    description:
      "Filter by date range, category, payee, or amount. Use the search box for quick text matching.",
    placement: "bottom",
  },
];

/**
 * Analytics Deep Dive Sub-Tour
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
  },
  {
    id: "analytics-category-breakdown",
    targetSelector: "[data-tour-id='analytics-category-chart']",
    title: "Category Breakdown",
    description:
      "See where your money goes with category-based charts. Click any segment for detailed transactions.",
    placement: "right",
  },
  {
    id: "analytics-trends",
    targetSelector: "[data-tour-id='analytics-trend-chart']",
    title: "Spending Trends",
    description:
      "Track how your spending changes over time. Identify patterns and seasonal variations.",
    placement: "bottom",
  },
];

/**
 * Intelligence Deep Dive Sub-Tour
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
  },
  {
    id: "intel-anomalies",
    targetSelector: "[data-tour-id='intelligence-anomalies']",
    title: "Anomaly Detection",
    description:
      "AI automatically flags unusual transactions like duplicate charges, price changes, or unexpected fees.",
    placement: "bottom",
  },
  {
    id: "intel-suggestions",
    targetSelector: "[data-tour-id='intelligence-suggestions']",
    title: "Smart Suggestions",
    description:
      "Receive personalized recommendations for budgeting, saving, and categorizing your transactions.",
    placement: "bottom",
  },
];

/**
 * Schedules Deep Dive Sub-Tour
 *
 * Detailed walkthrough of recurring transaction management
 */
export const SCHEDULES_DEEP_DIVE: TourStep[] = [
  {
    id: "schedules-list",
    targetSelector: "[data-tour-id='schedules-list']",
    title: "Recurring Transactions",
    description:
      "View all scheduled transactions for this account: bills, subscriptions, income, and regular transfers.",
    placement: "bottom",
  },
  {
    id: "schedules-frequency",
    targetSelector: "[data-tour-id='schedules-frequency']",
    title: "Frequency Options",
    description:
      "Set transactions to repeat weekly, biweekly, monthly, or on custom schedules. Skip holidays or weekends.",
    placement: "right",
  },
  {
    id: "schedules-upcoming",
    targetSelector: "[data-tour-id='schedules-upcoming']",
    title: "Upcoming Payments",
    description:
      "See what payments are coming up and when. Plan ahead to avoid overdrafts or missed bills.",
    placement: "bottom",
  },
];

/**
 * Budgets Deep Dive Sub-Tour
 *
 * Detailed walkthrough of budget management features
 */
export const BUDGETS_DEEP_DIVE: TourStep[] = [
  {
    id: "budgets-overview",
    targetSelector: "[data-tour-id='budgets-overview']",
    title: "Budget Overview",
    description:
      "See all budgets linked to this account. Track progress toward your spending limits in each category.",
    placement: "bottom",
  },
  {
    id: "budgets-progress",
    targetSelector: "[data-tour-id='budgets-progress']",
    title: "Progress Tracking",
    description:
      "Visual indicators show how much you have spent vs. budgeted. Green is on track, yellow is warning, red is over.",
    placement: "right",
  },
  {
    id: "budgets-allocation",
    targetSelector: "[data-tour-id='budgets-allocation']",
    title: "Budget Allocation",
    description:
      "Allocate funds from this account to different spending categories. Move money between budgets as needed.",
    placement: "bottom",
  },
];

/**
 * Settings Deep Dive Sub-Tour
 *
 * Detailed walkthrough of account settings
 */
export const SETTINGS_DEEP_DIVE: TourStep[] = [
  {
    id: "settings-details",
    targetSelector: "[data-tour-id='settings-details']",
    title: "Account Details",
    description:
      "Edit the account name, icon, and color. Add notes to remember important details about this account.",
    placement: "bottom",
  },
  {
    id: "settings-type",
    targetSelector: "[data-tour-id='settings-type']",
    title: "Account Type",
    description:
      "Change the account type (checking, savings, credit card, etc.) to affect how balances are calculated.",
    placement: "right",
  },
  {
    id: "settings-danger",
    targetSelector: "[data-tour-id='settings-danger-zone']",
    title: "Danger Zone",
    description:
      "Close or delete the account. Closed accounts are hidden but preserved. Deleted accounts are permanently removed.",
    placement: "top",
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
    branches: [
      {
        id: "transactions-deep-dive",
        label: "Learn More",
        description: "Explore transaction features in detail",
        subTourSteps: TRANSACTIONS_DEEP_DIVE,
      },
    ],
  },

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
    branches: [
      {
        id: "analytics-deep-dive",
        label: "Learn More",
        description: "Explore analytics and reporting features",
        subTourSteps: ANALYTICS_DEEP_DIVE,
      },
    ],
  },

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
    branches: [
      {
        id: "intelligence-deep-dive",
        label: "Learn More",
        description: "Explore AI-powered insights",
        subTourSteps: INTELLIGENCE_DEEP_DIVE,
      },
    ],
  },

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
    branches: [
      {
        id: "schedules-deep-dive",
        label: "Learn More",
        description: "Explore recurring transaction features",
        subTourSteps: SCHEDULES_DEEP_DIVE,
      },
    ],
  },

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
    branches: [
      {
        id: "budgets-deep-dive",
        label: "Learn More",
        description: "Explore budget management features",
        subTourSteps: BUDGETS_DEEP_DIVE,
      },
    ],
  },

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
    branches: [
      {
        id: "settings-deep-dive",
        label: "Learn More",
        description: "Explore account settings options",
        subTourSteps: SETTINGS_DEEP_DIVE,
      },
    ],
  },

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
// Unified Tour (combines Main and Account Page tours)
// =============================================================================

/**
 * Unified Tour Steps
 *
 * A comprehensive tour that covers the entire application:
 * 1. Getting Started - Sidebar navigation and account basics
 * 2. Navigation - Main pages overview
 * 3. Help & Settings - Accessing help and preferences
 * 4. Account Page - Detailed account features and import wizard
 * 5. Finish - Tour completion
 */
export const UNIFIED_TOUR_STEPS: TourStep[] = [
  // Getting Started (from Main Tour)
  ...MAIN_TOUR_STEPS.filter((step) => step.chapter === "getting-started"),

  // Navigation (from Main Tour)
  ...MAIN_TOUR_STEPS.filter((step) => step.chapter === "navigation"),

  // Help & Settings (from Main Tour)
  ...MAIN_TOUR_STEPS.filter((step) => step.chapter === "help-and-settings"),

  // Account Page (from Account Page Tour - excluding finish)
  ...ACCOUNT_PAGE_TOUR_STEPS.filter((step) => step.chapter !== "finish"),

  // Unified Finish
  {
    id: "unified-tour-complete",
    targetSelector: "[data-tour-id='sidebar']",
    title: "You're All Set!",
    description:
      "Congratulations! You've completed the full tour. You now know how to navigate the app, manage accounts, view analytics, and import transactions. Start using the app with your real data or restart this tour anytime from the Help menu.",
    placement: "right",
    route: "/",
    highlightPadding: 0,
    chapter: "finish",
    setup: async () => {
      demoMode.endTour();
      demoMode.deactivate();
      await goto("/");
    },
  },
];
