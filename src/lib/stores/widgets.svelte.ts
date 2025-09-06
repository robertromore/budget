// Widget management store for dashboard customization

import {browser} from "$app/environment";
import type {WidgetConfig} from "$lib/types/widgets";
import {DEFAULT_WIDGETS, WIDGET_DEFINITIONS} from "$lib/types/widgets";

const STORAGE_KEY = "account-dashboard-widgets";

class WidgetStore {
  private widgets = $state<WidgetConfig[]>([...DEFAULT_WIDGETS]);
  private editMode = $state(false);

  constructor() {
    // Defer localStorage loading to avoid hydration mismatch
    if (browser) {
      setTimeout(() => this.loadFromStorage(), 0);
    }
  }

  // Getters
  get allWidgets() {
    return this.widgets;
  }

  get enabledWidgets() {
    return this.widgets.filter((widget) => widget.enabled).sort((a, b) => a.position - b.position);
  }

  get isEditMode() {
    return this.editMode;
  }

  get availableWidgets() {
    const enabledTypes = new Set(this.widgets.filter((w) => w.enabled).map((w) => w.type));
    return Object.values(WIDGET_DEFINITIONS).filter((def) => !enabledTypes.has(def.type));
  }

  // Actions
  toggleEditMode() {
    this.editMode = !this.editMode;
  }

  addWidget(type: string, customConfig?: Partial<WidgetConfig>) {
    const definition = WIDGET_DEFINITIONS[type as keyof typeof WIDGET_DEFINITIONS];
    if (!definition) return;

    const newWidget: WidgetConfig = {
      id: `${type}-${Date.now()}`,
      type: definition.type,
      title: definition.name,
      enabled: true,
      position: this.widgets.length,
      size: definition.defaultSize,
      settings: {...definition.defaultSettings},
      ...customConfig,
    };

    this.widgets.push(newWidget);
    this.saveToStorage();
  }

  removeWidget(widgetId: string) {
    this.widgets = this.widgets.filter((widget) => widget.id !== widgetId);
    this.reorderPositions();
    this.saveToStorage();
  }

  toggleWidget(widgetId: string) {
    const widget = this.widgets.find((w) => w.id === widgetId);
    if (widget) {
      widget.enabled = !widget.enabled;
      if (widget.enabled) {
        // Set position to end when enabling
        widget.position = this.enabledWidgets.length;
      }
      this.reorderPositions();
      this.saveToStorage();
    }
  }

  updateWidget(widgetId: string, updates: Partial<WidgetConfig>) {
    const widget = this.widgets.find((w) => w.id === widgetId);
    if (widget) {
      Object.assign(widget, updates);
      this.saveToStorage();
    }
  }

  reorderWidgets(newOrder: string[]) {
    // Update positions based on new order
    newOrder.forEach((widgetId, index) => {
      const widget = this.widgets.find((w) => w.id === widgetId);
      if (widget) {
        widget.position = index;
      }
    });
    this.saveToStorage();
  }

  resetToDefaults() {
    this.widgets = [...DEFAULT_WIDGETS];
    this.saveToStorage();
  }

  // Private methods
  private reorderPositions() {
    const enabledWidgets = this.widgets.filter((w) => w.enabled);
    enabledWidgets
      .sort((a, b) => a.position - b.position)
      .forEach((widget, index) => {
        widget.position = index;
      });
  }

  private saveToStorage() {
    if (browser) {
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(this.widgets));
      } catch (error) {
        console.warn("Failed to save widget configuration:", error);
      }
    }
  }

  private loadFromStorage() {
    if (browser) {
      try {
        const saved = localStorage.getItem(STORAGE_KEY);
        if (saved) {
          const parsedWidgets = JSON.parse(saved);
          // Validate and merge with defaults to handle schema changes
          this.widgets = this.mergeWithDefaults(parsedWidgets);
        }
      } catch (error) {
        console.warn("Failed to load widget configuration:", error);
        this.widgets = [...DEFAULT_WIDGETS];
      }
    }
  }

  private mergeWithDefaults(savedWidgets: WidgetConfig[]): WidgetConfig[] {
    // Ensure all required properties exist and add any new default widgets
    const merged = [...savedWidgets];

    // Add any new default widgets that don't exist in saved config
    DEFAULT_WIDGETS.forEach((defaultWidget) => {
      if (!merged.find((w) => w.type === defaultWidget.type)) {
        console.log(`[Widget Store] Adding new default widget: ${defaultWidget.type}`);
        merged.push({...defaultWidget});
      }
    });

    console.log(`[Widget Store] Loaded ${merged.length} widgets:`, merged.map(w => `${w.type}(${w.enabled})`));
    return merged;
  }

  // Widget data calculation methods
  calculateWidgetData(accountId: number, transactions: any[], summary: any) {
    const now = new Date();
    const currentMonth = now.getMonth();
    const currentYear = now.getFullYear();

    let monthlyCashFlow = 0;
    let pendingBalance = 0;
    let recentActivity = 0;
    const categorySums: Record<string, number> = {};
    const monthlyTrends: Record<string, number> = {};

    // Calculate metrics from transactions
    transactions.forEach((transaction) => {
      const transactionDate = new Date(
        typeof transaction.date === "string" ? transaction.date : transaction.date.toString()
      );
      const amount = transaction.amount || 0;

      // Monthly cash flow
      if (
        transactionDate.getMonth() === currentMonth &&
        transactionDate.getFullYear() === currentYear
      ) {
        monthlyCashFlow += amount;
      }

      // Pending balance
      if (transaction.status === "pending") {
        pendingBalance += amount;
      }

      // Recent activity (configurable days)
      const daysAgo = (now.getTime() - transactionDate.getTime()) / (1000 * 60 * 60 * 24);
      if (daysAgo <= 30) {
        recentActivity += Math.abs(amount);
      }

      // Category sums
      if (transaction.category?.name) {
        categorySums[transaction.category.name] =
          (categorySums[transaction.category.name] || 0) + Math.abs(amount);
      }

      // Monthly trends
      const monthKey = `${transactionDate.getFullYear()}-${transactionDate.getMonth()}`;
      monthlyTrends[monthKey] = (monthlyTrends[monthKey] || 0) + amount;
    });

    // Top categories with colors
    const colors = [
      "hsl(220, 91%, 60%)", // Blue
      "hsl(142, 71%, 45%)", // Green
      "hsl(350, 89%, 60%)", // Red
      "hsl(262, 83%, 58%)", // Purple
      "hsl(25, 95%, 53%)", // Orange
      "hsl(175, 85%, 45%)", // Teal
      "hsl(48, 94%, 68%)", // Yellow
      "hsl(343, 75%, 68%)", // Pink
    ];

    const topCategories = Object.entries(categorySums)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 8)
      .map(([name, amount], index) => ({
        name,
        amount,
        color: colors[index % colors.length],
      }));

    // Spending trend data (last 6 months)
    const spendingTrend = [];
    for (let i = 5; i >= 0; i--) {
      const date = new Date(currentYear, currentMonth - i, 1);
      const monthKey = `${date.getFullYear()}-${date.getMonth()}`;
      const amount = Math.abs(monthlyTrends[monthKey] || 0);
      spendingTrend.push({
        label: date.toLocaleDateString("en-US", {month: "short", year: "2-digit"}),
        amount: amount,
      });
    }

    // Income vs Expenses data (last 3 months)
    const incomeExpenses = [];
    for (let i = 2; i >= 0; i--) {
      const date = new Date(currentYear, currentMonth - i, 1);
      const monthKey = `${date.getFullYear()}-${date.getMonth()}`;

      // Calculate income (positive amounts) and expenses (negative amounts) for this month
      let income = 0;
      let expenses = 0;

      transactions.forEach((transaction) => {
        const transactionDate = new Date(
          typeof transaction.date === "string" ? transaction.date : transaction.date.toString()
        );
        if (
          transactionDate.getMonth() === date.getMonth() &&
          transactionDate.getFullYear() === date.getFullYear()
        ) {
          const amount = transaction.amount || 0;
          if (amount > 0) {
            income += amount;
          } else {
            expenses += Math.abs(amount);
          }
        }
      });

      incomeExpenses.push({
        period: date.toLocaleDateString("en-US", {month: "short"}),
        income: income,
        expenses: expenses,
      });
    }

    // Balance history (last 30 days)
    const balanceHistory = [];
    const currentBalance = summary?.balance ?? 0;

    // Sort transactions by date to calculate running balance chronologically
    const sortedTransactions = [...transactions].sort((a, b) => {
      const dateA = new Date(typeof a.date === "string" ? a.date : a.date.toString());
      const dateB = new Date(typeof b.date === "string" ? b.date : b.date.toString());
      return dateA.getTime() - dateB.getTime();
    });

    // Calculate starting balance 30 days ago by subtracting all transactions from current balance
    let startingBalance = currentBalance;
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    // Subtract transactions that occurred in the last 30 days to get starting balance
    sortedTransactions.forEach((transaction) => {
      const transactionDate = new Date(
        typeof transaction.date === "string" ? transaction.date : transaction.date.toString()
      );
      if (transactionDate >= thirtyDaysAgo) {
        startingBalance -= transaction.amount || 0;
      }
    });

    // Build balance history going forward from starting balance
    let runningBalance = startingBalance;

    for (let i = 29; i >= 0; i--) {
      const date = new Date();
      date.setDate(date.getDate() - i);

      // Find transactions for this day
      const dayTransactions = sortedTransactions.filter((t) => {
        const transactionDate = new Date(typeof t.date === "string" ? t.date : t.date.toString());
        return transactionDate.toDateString() === date.toDateString();
      });

      // Add daily transactions to running balance
      const dailyAmount = dayTransactions.reduce((sum, t) => sum + (t.amount || 0), 0);
      runningBalance += dailyAmount;

      balanceHistory.push({
        date: date.toISOString(),
        balance: runningBalance,
      });
    }

    // Recent transactions for detailed widgets
    const recentTransactions = transactions.slice(0, 10).map((transaction) => ({
      ...transaction,
      date: typeof transaction.date === "string" ? transaction.date : transaction.date.toString(),
      amount: transaction.amount || 0,
      description: transaction.description || transaction.account?.name || "Transaction",
    }));

    // Account health calculation
    const accountHealth = {
      score: Math.min(
        100,
        Math.max(
          0,
          70 + // Base score
            (monthlyCashFlow > 0 ? 20 : -20) + // Positive cash flow bonus
            (pendingBalance === 0 ? 10 : -10) + // No pending transactions bonus
            (transactions.length > 0 ? 0 : -30) // Activity penalty
        )
      ),
      factors: [
        monthlyCashFlow > 0
          ? {type: "positive", description: "Positive monthly cash flow"}
          : {type: "negative", description: "Negative monthly cash flow"},
        pendingBalance === 0
          ? {type: "positive", description: "No pending transactions"}
          : {
              type: "warning",
              description: `$${Math.abs(pendingBalance).toFixed(2)} in pending transactions`,
            },
        recentActivity > 0
          ? {type: "positive", description: "Active account usage"}
          : {type: "warning", description: "Low account activity"},
      ],
    };

    // Quick stats
    const quickStats = {
      avgTransaction: transactions.length > 0 ? monthlyCashFlow / transactions.length : 0,
      avgTransactionTrend: 0, // Could calculate vs previous month
      highestExpense: Math.max(...transactions.map((t) => Math.abs(t.amount || 0)), 0),
      totalIncome: transactions
        .filter((t) => (t.amount || 0) > 0)
        .reduce((sum, t) => sum + t.amount, 0),
      incomeTrend: 0, // Could calculate vs previous month
      totalExpenses: Math.abs(
        transactions.filter((t) => (t.amount || 0) < 0).reduce((sum, t) => sum + t.amount, 0)
      ),
      expensesTrend: 0, // Could calculate vs previous month
      lastActivity:
        transactions.length > 0
          ? new Date(transactions[0]?.date).toLocaleDateString()
          : "No activity",
    };

    // Monthly comparison data
    const monthlyComparison = [];
    for (let i = 2; i >= 0; i--) {
      const date = new Date(currentYear, currentMonth - i, 1);
      const monthKey = `${date.getFullYear()}-${date.getMonth()}`;
      const spending = Math.abs(monthlyTrends[monthKey] || 0);

      monthlyComparison.push({
        name: date.toLocaleDateString("en-US", {month: "long"}),
        spending: spending,
      });
    }

    return {
      // Original widget data
      balance: summary?.balance ?? 0,
      previousBalance: (summary?.balance ?? 0) - monthlyCashFlow, // Estimate previous balance
      accounts: {"Main Account": summary?.balance ?? 0}, // Mock account breakdown
      transactionCount: transactions.length,
      monthlyCashFlow,
      pendingBalance,
      recentActivity,
      recentTransactions,
      topCategories,
      monthlyTrends,

      // Chart widget data
      spendingTrend,
      incomeExpenses,
      categoryBreakdown: topCategories,
      balanceHistory,
      accountHealth,
      quickStats,
      monthlyComparison,
    };
  }
}

// Global widget store instance
export const widgetStore = new WidgetStore();
