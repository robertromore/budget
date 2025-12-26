/**
 * Demo Mode State
 *
 * Manages an in-memory demo overlay for demonstrating account features
 * without affecting real data. Used primarily for the account page tour.
 */

import { browser } from "$app/environment";
import type { Account, AccountType } from "$lib/schema/accounts";
import type { Category } from "$lib/schema/categories";
import type { Payee } from "$lib/schema/payees";
import type { Schedule } from "$lib/schema/schedules";
// No longer need CalendarDate - using ISO date strings for demo transactions

// =============================================================================
// Types
// =============================================================================

export type ImportDemoStep =
  | "idle"
  | "upload"
  | "map-columns"
  | "preview"
  | "review-schedules"
  | "review-entities"
  | "complete";

export interface DemoTransaction {
  id: number;
  amount: number;
  date: string; // ISO date string like "2024-12-25"
  payeeId: number | null;
  payee: { id: number; name: string } | null;
  notes: string | null;
  category: { id: number; name: string; color: string | null } | null;
  categoryId: number | null;
  status: "cleared" | "pending" | "scheduled" | null;
  accountId: number;
  parentId: number | null;
  balance: number | null;
}

export interface DemoSchedule {
  id: number;
  name: string;
  slug: string;
  frequency: string;
  interval: number;
  amount: number;
  payee: { id: number; name: string } | null;
  category: { id: number; name: string } | null;
  nextOccurrence: string;
}

// =============================================================================
// Demo Data Generators
// =============================================================================

function generateDemoAccount(): Account {
  const now = new Date().toISOString();
  return {
    id: -1, // Negative ID to distinguish from real accounts
    cuid: "demo-checking-account",
    workspaceId: -1,
    name: "Demo Checking",
    slug: "demo-checking",
    closed: false,
    notes: "This is a demonstration account with sample data.",
    accountType: "checking" as AccountType,
    institution: "Demo Bank",
    accountIcon: "wallet",
    accountColor: "#3B82F6", // Blue
    initialBalance: 5000,
    accountNumberLast4: "1234",
    onBudget: true,
    debtLimit: null,
    minimumPayment: null,
    paymentDueDay: null,
    interestRate: null,
    enabledMetrics: null,
    dateOpened: now,
    createdAt: now,
    updatedAt: now,
    deletedAt: null,
    transactions: [],
    balance: 4250.75,
  };
}

function generateDemoCategories(): Category[] {
  const now = new Date().toISOString();
  // Use unknown cast for demo data - we only need fields used in display
  return [
    { id: -1, workspaceId: -1, name: "Groceries", slug: "groceries", categoryColor: "#22C55E", categoryIcon: "shopping-cart", parentId: null, displayOrder: 0, categoryType: "expense", isActive: true, isTaxDeductible: false, isSeasonal: false, notes: null, deletedAt: null, dateCreated: now, createdAt: now, updatedAt: now },
    { id: -2, workspaceId: -1, name: "Dining Out", slug: "dining-out", categoryColor: "#F97316", categoryIcon: "utensils", parentId: null, displayOrder: 1, categoryType: "expense", isActive: true, isTaxDeductible: false, isSeasonal: false, notes: null, deletedAt: null, dateCreated: now, createdAt: now, updatedAt: now },
    { id: -3, workspaceId: -1, name: "Transportation", slug: "transportation", categoryColor: "#8B5CF6", categoryIcon: "car", parentId: null, displayOrder: 2, categoryType: "expense", isActive: true, isTaxDeductible: false, isSeasonal: false, notes: null, deletedAt: null, dateCreated: now, createdAt: now, updatedAt: now },
    { id: -4, workspaceId: -1, name: "Utilities", slug: "utilities", categoryColor: "#06B6D4", categoryIcon: "zap", parentId: null, displayOrder: 3, categoryType: "expense", isActive: true, isTaxDeductible: false, isSeasonal: false, notes: null, deletedAt: null, dateCreated: now, createdAt: now, updatedAt: now },
    { id: -5, workspaceId: -1, name: "Entertainment", slug: "entertainment", categoryColor: "#EC4899", categoryIcon: "film", parentId: null, displayOrder: 4, categoryType: "expense", isActive: true, isTaxDeductible: false, isSeasonal: false, notes: null, deletedAt: null, dateCreated: now, createdAt: now, updatedAt: now },
    { id: -6, workspaceId: -1, name: "Salary", slug: "salary", categoryColor: "#10B981", categoryIcon: "briefcase", parentId: null, displayOrder: 5, categoryType: "income", isActive: true, isTaxDeductible: false, isSeasonal: false, notes: null, deletedAt: null, dateCreated: now, createdAt: now, updatedAt: now },
  ] as unknown as Category[];
}

function generateDemoPayees(): Payee[] {
  const now = new Date().toISOString();
  // Use unknown cast for demo data - we only need fields used in display
  return [
    { id: -1, workspaceId: -1, name: "Whole Foods Market", slug: "whole-foods-market", notes: null, defaultCategoryId: -1, defaultBudgetId: null, isActive: true, taxRelevant: false, isSeasonal: false, phone: null, email: null, website: null, createdAt: now, updatedAt: now, deletedAt: null },
    { id: -2, workspaceId: -1, name: "Starbucks", slug: "starbucks", notes: null, defaultCategoryId: -2, defaultBudgetId: null, isActive: true, taxRelevant: false, isSeasonal: false, phone: null, email: null, website: null, createdAt: now, updatedAt: now, deletedAt: null },
    { id: -3, workspaceId: -1, name: "Shell Gas Station", slug: "shell-gas-station", notes: null, defaultCategoryId: -3, defaultBudgetId: null, isActive: true, taxRelevant: false, isSeasonal: false, phone: null, email: null, website: null, createdAt: now, updatedAt: now, deletedAt: null },
    { id: -4, workspaceId: -1, name: "Electric Company", slug: "electric-company", notes: null, defaultCategoryId: -4, defaultBudgetId: null, isActive: true, taxRelevant: false, isSeasonal: false, phone: null, email: null, website: null, createdAt: now, updatedAt: now, deletedAt: null },
    { id: -5, workspaceId: -1, name: "Netflix", slug: "netflix", notes: null, defaultCategoryId: -5, defaultBudgetId: null, isActive: true, taxRelevant: false, isSeasonal: false, phone: null, email: null, website: null, createdAt: now, updatedAt: now, deletedAt: null },
    { id: -6, workspaceId: -1, name: "Acme Corporation", slug: "acme-corporation", notes: "Employer", defaultCategoryId: -6, defaultBudgetId: null, isActive: true, taxRelevant: false, isSeasonal: false, phone: null, email: null, website: null, createdAt: now, updatedAt: now, deletedAt: null },
    { id: -7, workspaceId: -1, name: "Target", slug: "target", notes: null, defaultCategoryId: -1, defaultBudgetId: null, isActive: true, taxRelevant: false, isSeasonal: false, phone: null, email: null, website: null, createdAt: now, updatedAt: now, deletedAt: null },
    { id: -8, workspaceId: -1, name: "Amazon", slug: "amazon", notes: null, defaultCategoryId: null, defaultBudgetId: null, isActive: true, taxRelevant: false, isSeasonal: false, phone: null, email: null, website: null, createdAt: now, updatedAt: now, deletedAt: null },
  ] as unknown as Payee[];
}

function generateDemoSchedules(): DemoSchedule[] {
  const today = new Date();
  const nextMonth = new Date(today);
  nextMonth.setMonth(nextMonth.getMonth() + 1);

  return [
    {
      id: -1,
      name: "Monthly Salary",
      slug: "monthly-salary",
      frequency: "monthly",
      interval: 1,
      amount: 4500,
      payee: { id: -6, name: "Acme Corporation" },
      category: { id: -6, name: "Salary" },
      nextOccurrence: nextMonth.toISOString().split("T")[0],
    },
    {
      id: -2,
      name: "Netflix Subscription",
      slug: "netflix-subscription",
      frequency: "monthly",
      interval: 1,
      amount: -15.99,
      payee: { id: -5, name: "Netflix" },
      category: { id: -5, name: "Entertainment" },
      nextOccurrence: new Date(today.getFullYear(), today.getMonth(), 15).toISOString().split("T")[0],
    },
    {
      id: -3,
      name: "Electric Bill",
      slug: "electric-bill",
      frequency: "monthly",
      interval: 1,
      amount: -120,
      payee: { id: -4, name: "Electric Company" },
      category: { id: -4, name: "Utilities" },
      nextOccurrence: new Date(today.getFullYear(), today.getMonth(), 28).toISOString().split("T")[0],
    },
  ];
}

function generateDemoTransactions(categories: Category[], payees: Payee[]): DemoTransaction[] {
  const today = new Date();
  const transactions: DemoTransaction[] = [];
  let runningBalance = 5000;
  let id = -1;

  // Generate ~20 transactions over the past 30 days
  const transactionData = [
    { daysAgo: 1, payeeIdx: 0, catIdx: 0, amount: -85.42, notes: "Weekly groceries" },
    { daysAgo: 2, payeeIdx: 1, catIdx: 1, amount: -6.75, notes: "Morning coffee" },
    { daysAgo: 3, payeeIdx: 2, catIdx: 2, amount: -45.00, notes: "Gas fill-up" },
    { daysAgo: 5, payeeIdx: 6, catIdx: 0, amount: -32.18, notes: "Household items" },
    { daysAgo: 6, payeeIdx: 4, catIdx: 4, amount: -15.99, notes: "Monthly subscription" },
    { daysAgo: 7, payeeIdx: 1, catIdx: 1, amount: -12.50, notes: "Lunch with colleague" },
    { daysAgo: 8, payeeIdx: 0, catIdx: 0, amount: -112.35, notes: "Groceries and snacks" },
    { daysAgo: 10, payeeIdx: 7, catIdx: null, amount: -67.89, notes: "Online order" },
    { daysAgo: 12, payeeIdx: 2, catIdx: 2, amount: -52.00, notes: "Gas" },
    { daysAgo: 14, payeeIdx: 5, catIdx: 5, amount: 4500.00, notes: "Bi-weekly paycheck", status: "cleared" },
    { daysAgo: 15, payeeIdx: 0, catIdx: 0, amount: -95.67, notes: "Weekly groceries" },
    { daysAgo: 17, payeeIdx: 3, catIdx: 3, amount: -145.23, notes: "Monthly electric bill" },
    { daysAgo: 18, payeeIdx: 1, catIdx: 1, amount: -8.25, notes: "Coffee and pastry" },
    { daysAgo: 20, payeeIdx: 6, catIdx: 0, amount: -42.50, notes: "Kitchen supplies" },
    { daysAgo: 22, payeeIdx: 2, catIdx: 2, amount: -48.75, notes: "Gas fill-up" },
    { daysAgo: 25, payeeIdx: 0, catIdx: 0, amount: -78.90, notes: "Groceries" },
    { daysAgo: 28, payeeIdx: 5, catIdx: 5, amount: 4500.00, notes: "Bi-weekly paycheck", status: "cleared" },
  ];

  for (const data of transactionData) {
    const date = new Date(today);
    date.setDate(date.getDate() - data.daysAgo);

    runningBalance += data.amount;

    const payee = payees[data.payeeIdx];
    const category = data.catIdx !== null ? categories[data.catIdx] : null;

    // Format date as ISO string (YYYY-MM-DD)
    const isoDate = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;

    transactions.push({
      id: id--,
      amount: data.amount,
      date: isoDate,
      payeeId: payee?.id ?? null,
      payee: payee ? { id: payee.id, name: payee.name ?? "Unknown" } : null,
      notes: data.notes,
      category: category ? { id: category.id, name: category.name ?? "Unknown", color: category.categoryColor ?? null } : null,
      categoryId: category?.id ?? null,
      status: (data as any).status ?? "cleared",
      accountId: -1,
      parentId: null,
      balance: runningBalance,
    });
  }

  return transactions;
}

function generateDemoImportCSV(): string {
  const today = new Date();
  const lines = [
    "Date,Description,Amount",
  ];

  const importData = [
    { daysAgo: 0, desc: "WHOLE FOODS MKT #123", amount: -67.45 },
    { daysAgo: 1, desc: "SHELL SERVICE STN", amount: -42.50 },
    { daysAgo: 2, desc: "STARBUCKS STORE 456", amount: -5.95 },
    { daysAgo: 3, desc: "AMAZON.COM*AB12CD34", amount: -29.99 },
    { daysAgo: 4, desc: "ELECTRIC COMPANY PMT", amount: -135.00 },
    { daysAgo: 5, desc: "TARGET STORE #789", amount: -54.32 },
  ];

  for (const row of importData) {
    const date = new Date(today);
    date.setDate(date.getDate() - row.daysAgo);
    const dateStr = `${(date.getMonth() + 1).toString().padStart(2, "0")}/${date.getDate().toString().padStart(2, "0")}/${date.getFullYear()}`;
    lines.push(`${dateStr},"${row.desc}",${row.amount.toFixed(2)}`);
  }

  return lines.join("\n");
}

// =============================================================================
// Demo Mode State Class
// =============================================================================

class DemoModeState {
  // Core state
  #isActive = $state(false);
  #isTourRunning = $state(false);
  #importStep = $state<ImportDemoStep>("idle");
  #showContinuationPrompt = $state(false);
  #triggerImportUpload = $state(0); // Incremented to trigger import in the import tab
  #triggerCleanupSheet = $state(0); // Incremented to trigger cleanup sheet open
  #triggerWizardStep = $state<{ step: string; count: number }>({ step: "", count: 0 }); // Trigger to advance wizard to a specific step

  // Mock data (populated on activation)
  #demoAccount = $state<Account | null>(null);
  #demoTransactions = $state<DemoTransaction[]>([]);
  #demoCategories = $state<Category[]>([]);
  #demoPayees = $state<Payee[]>([]);
  #demoSchedules = $state<DemoSchedule[]>([]);
  #demoImportCSV = $state<string>("");

  // ==========================================================================
  // Getters
  // ==========================================================================

  get isActive() {
    return this.#isActive;
  }

  get isTourRunning() {
    return this.#isTourRunning;
  }

  get importStep() {
    return this.#importStep;
  }

  get demoAccount() {
    return this.#demoAccount;
  }

  get demoTransactions() {
    return this.#demoTransactions;
  }

  get demoCategories() {
    return this.#demoCategories;
  }

  get demoPayees() {
    return this.#demoPayees;
  }

  get demoSchedules() {
    return this.#demoSchedules;
  }

  get demoImportCSV() {
    return this.#demoImportCSV;
  }

  get showContinuationPrompt() {
    return this.#showContinuationPrompt;
  }

  get triggerImportUpload() {
    return this.#triggerImportUpload;
  }

  get triggerCleanupSheet() {
    return this.#triggerCleanupSheet;
  }

  get triggerWizardStep() {
    return this.#triggerWizardStep;
  }

  // ==========================================================================
  // Actions
  // ==========================================================================

  /**
   * Activate demo mode and populate all mock data
   */
  activate() {
    if (!browser) return;

    // Generate all mock data
    this.#demoCategories = generateDemoCategories();
    this.#demoPayees = generateDemoPayees();
    this.#demoAccount = generateDemoAccount();
    this.#demoTransactions = generateDemoTransactions(this.#demoCategories, this.#demoPayees);
    this.#demoSchedules = generateDemoSchedules();
    this.#demoImportCSV = generateDemoImportCSV();

    this.#isActive = true;
    this.#importStep = "idle";

    console.log("[DemoMode] Activated with mock data");
  }

  /**
   * Deactivate demo mode and clear all state
   */
  deactivate() {
    this.#isActive = false;
    this.#isTourRunning = false;
    this.#importStep = "idle";
    this.#demoAccount = null;
    this.#demoTransactions = [];
    this.#demoCategories = [];
    this.#demoPayees = [];
    this.#demoSchedules = [];
    this.#demoImportCSV = "";

    console.log("[DemoMode] Deactivated");
  }

  /**
   * Start the account page tour (assumes demo mode is already active)
   */
  startTour() {
    if (!this.#isActive) {
      this.activate();
    }
    this.#isTourRunning = true;
    console.log("[DemoMode] Tour started");
  }

  /**
   * End the tour (keeps demo mode active)
   */
  endTour() {
    this.#isTourRunning = false;
    console.log("[DemoMode] Tour ended");
  }

  /**
   * Show the continuation prompt dialog
   */
  showContinuationDialog() {
    this.#showContinuationPrompt = true;
  }

  /**
   * Hide the continuation prompt dialog
   */
  hideContinuationDialog() {
    this.#showContinuationPrompt = false;
  }

  // ==========================================================================
  // Import Demo Simulation
  // ==========================================================================

  /**
   * Start the import demo simulation
   */
  startImportDemo() {
    this.#importStep = "upload";
  }

  /**
   * Trigger the import tab to load demo CSV data
   * The import tab watches this value and reacts when it changes
   */
  triggerDemoImport() {
    this.#triggerImportUpload++;
    console.log("[DemoMode] Triggered demo import upload");
  }

  /**
   * Trigger the cleanup sheet to open
   * The import tab watches this value and reacts when it changes
   */
  triggerOpenCleanupSheet() {
    this.#triggerCleanupSheet++;
    console.log("[DemoMode] Triggered cleanup sheet open");
  }

  /**
   * Trigger the wizard to advance to a specific step
   * The import tab watches this value and reacts when it changes
   */
  triggerAdvanceWizard(step: string) {
    this.#triggerWizardStep = { step, count: this.#triggerWizardStep.count + 1 };
    console.log("[DemoMode] Triggered wizard advance to:", step);
  }

  /**
   * Simulate file upload completing (auto-advances to map-columns)
   */
  async simulateFileUpload() {
    this.#importStep = "upload";
    // Simulate processing delay
    await new Promise((resolve) => setTimeout(resolve, 1000));
    this.#importStep = "map-columns";
  }

  /**
   * Advance to the next import step
   */
  advanceImportStep() {
    const steps: ImportDemoStep[] = [
      "idle",
      "upload",
      "map-columns",
      "preview",
      "review-schedules",
      "review-entities",
      "complete",
    ];

    const currentIndex = steps.indexOf(this.#importStep);
    if (currentIndex < steps.length - 1) {
      this.#importStep = steps[currentIndex + 1];
    }
  }

  /**
   * Go back to the previous import step
   */
  previousImportStep() {
    const steps: ImportDemoStep[] = [
      "idle",
      "upload",
      "map-columns",
      "preview",
      "review-schedules",
      "review-entities",
      "complete",
    ];

    const currentIndex = steps.indexOf(this.#importStep);
    if (currentIndex > 0) {
      this.#importStep = steps[currentIndex - 1];
    }
  }

  /**
   * Reset import demo to idle
   */
  resetImportDemo() {
    this.#importStep = "idle";
  }

  /**
   * Set the import step directly (used by import tab to sync state)
   */
  setImportStep(step: ImportDemoStep) {
    this.#importStep = step;
  }

  // ==========================================================================
  // Helpers
  // ==========================================================================

  /**
   * Check if a given account slug is the demo account
   */
  isDemoAccount(slug: string): boolean {
    return slug === "demo-checking";
  }

  /**
   * Get demo transaction by ID
   */
  getDemoTransaction(id: number): DemoTransaction | undefined {
    return this.#demoTransactions.find((t) => t.id === id);
  }

  /**
   * Get demo category by ID
   */
  getDemoCategory(id: number): Category | undefined {
    return this.#demoCategories.find((c) => c.id === id);
  }

  /**
   * Get demo payee by ID
   */
  getDemoPayee(id: number): Payee | undefined {
    return this.#demoPayees.find((p) => p.id === id);
  }
}

// =============================================================================
// Singleton Export
// =============================================================================

export const demoMode = new DemoModeState();
