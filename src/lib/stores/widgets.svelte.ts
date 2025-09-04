// Widget management store for dashboard customization

import { browser } from '$app/environment';
import type { WidgetConfig } from '$lib/types/widgets';
import { DEFAULT_WIDGETS, WIDGET_DEFINITIONS } from '$lib/types/widgets';

const STORAGE_KEY = 'account-dashboard-widgets';

class WidgetStore {
  private widgets = $state<WidgetConfig[]>([...DEFAULT_WIDGETS]);
  private editMode = $state(false);

  constructor() {
    // Load saved widgets from localStorage on browser
    if (browser) {
      this.loadFromStorage();
    }
  }

  // Getters
  get allWidgets() {
    return this.widgets;
  }

  get enabledWidgets() {
    return this.widgets
      .filter(widget => widget.enabled)
      .sort((a, b) => a.position - b.position);
  }

  get isEditMode() {
    return this.editMode;
  }

  get availableWidgets() {
    const enabledTypes = new Set(this.widgets.filter(w => w.enabled).map(w => w.type));
    return Object.values(WIDGET_DEFINITIONS).filter(def => !enabledTypes.has(def.type));
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
      settings: { ...definition.defaultSettings },
      ...customConfig
    };

    this.widgets.push(newWidget);
    this.saveToStorage();
  }

  removeWidget(widgetId: string) {
    this.widgets = this.widgets.filter(widget => widget.id !== widgetId);
    this.reorderPositions();
    this.saveToStorage();
  }

  toggleWidget(widgetId: string) {
    const widget = this.widgets.find(w => w.id === widgetId);
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
    const widget = this.widgets.find(w => w.id === widgetId);
    if (widget) {
      Object.assign(widget, updates);
      this.saveToStorage();
    }
  }

  reorderWidgets(newOrder: string[]) {
    // Update positions based on new order
    newOrder.forEach((widgetId, index) => {
      const widget = this.widgets.find(w => w.id === widgetId);
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
    const enabledWidgets = this.widgets.filter(w => w.enabled);
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
        console.warn('Failed to save widget configuration:', error);
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
        console.warn('Failed to load widget configuration:', error);
        this.widgets = [...DEFAULT_WIDGETS];
      }
    }
  }

  private mergeWithDefaults(savedWidgets: WidgetConfig[]): WidgetConfig[] {
    // Ensure all required properties exist and add any new default widgets
    const merged = [...savedWidgets];
    
    // Add any new default widgets that don't exist in saved config
    DEFAULT_WIDGETS.forEach(defaultWidget => {
      if (!merged.find(w => w.type === defaultWidget.type)) {
        merged.push({ ...defaultWidget });
      }
    });

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
    transactions.forEach(transaction => {
      const transactionDate = new Date(typeof transaction.date === 'string' ? transaction.date : transaction.date.toString());
      const amount = transaction.amount || 0;

      // Monthly cash flow
      if (transactionDate.getMonth() === currentMonth && transactionDate.getFullYear() === currentYear) {
        monthlyCashFlow += amount;
      }

      // Pending balance
      if (transaction.status === 'pending') {
        pendingBalance += amount;
      }

      // Recent activity (configurable days)
      const daysAgo = (now.getTime() - transactionDate.getTime()) / (1000 * 60 * 60 * 24);
      if (daysAgo <= 30) {
        recentActivity++;
      }

      // Category sums
      if (transaction.category?.name) {
        categorySums[transaction.category.name] = (categorySums[transaction.category.name] || 0) + Math.abs(amount);
      }

      // Monthly trends
      const monthKey = `${transactionDate.getFullYear()}-${transactionDate.getMonth()}`;
      monthlyTrends[monthKey] = (monthlyTrends[monthKey] || 0) + amount;
    });

    // Top categories
    const topCategories = Object.entries(categorySums)
      .sort(([,a], [,b]) => b - a)
      .slice(0, 5)
      .map(([name, amount]) => ({ name, amount }));

    return {
      balance: summary?.balance ?? 0,
      transactionCount: summary?.transactionCount ?? 0,
      monthlyCashFlow,
      pendingBalance,
      recentActivity,
      topCategories,
      monthlyTrends,
      avgTransaction: transactions.length > 0 ? (monthlyCashFlow / transactions.length) : 0,
      highestExpense: Math.max(...transactions.map(t => Math.abs(t.amount || 0)), 0),
      lastActivity: transactions.length > 0 ? transactions[0]?.date : null
    };
  }
}

// Global widget store instance
export const widgetStore = new WidgetStore();