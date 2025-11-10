import type { Account } from "$lib/schema/accounts";

export type MetricId =
  // Credit Health
  | "availableCredit"
  | "creditUtilization"
  | "overLimit"
  // Payment Info
  | "minimumPayment"
  | "interestRate"
  | "paymentDueDate"
  | "daysUntilDue"
  // Balance Info
  | "currentBalance"
  | "creditLimit"
  // Spending Metrics
  | "monthlySpending"
  | "transactionCount"
  // Financial Health (future)
  | "interestCharges"
  | "payoffTimeline"
  // Analytics
  | "topCategories";

export interface MetricDefinition {
  id: MetricId;
  label: string;
  description: string;
  category: "credit-health" | "payment" | "balance" | "spending" | "financial" | "analytics";
  icon: string; // Lucide icon name
  defaultEnabled: boolean;
  requiresField?: keyof Account; // Required account field to display this metric
}

export const AVAILABLE_METRICS: MetricDefinition[] = [
  // Credit Health
  {
    id: "availableCredit",
    label: "Available Credit",
    description: "How much credit you have left to use",
    category: "credit-health",
    icon: "CreditCard",
    defaultEnabled: true,
    requiresField: "debtLimit",
  },
  {
    id: "creditUtilization",
    label: "Credit Utilization",
    description: "Percentage of credit limit used (lower is better for credit score)",
    category: "credit-health",
    icon: "TrendingUp",
    defaultEnabled: true,
    requiresField: "debtLimit",
  },
  {
    id: "overLimit",
    label: "Over Limit Warning",
    description: "Alert when balance exceeds credit limit",
    category: "credit-health",
    icon: "CircleAlert",
    defaultEnabled: true,
    requiresField: "debtLimit",
  },

  // Payment Info
  {
    id: "minimumPayment",
    label: "Minimum Payment",
    description: "Required minimum monthly payment",
    category: "payment",
    icon: "DollarSign",
    defaultEnabled: true,
    requiresField: "minimumPayment",
  },
  {
    id: "interestRate",
    label: "Interest Rate (APR)",
    description: "Annual percentage rate charged on balances",
    category: "payment",
    icon: "Percent",
    defaultEnabled: false,
    requiresField: "interestRate",
  },
  {
    id: "paymentDueDate",
    label: "Payment Due Date",
    description: "Next payment due date",
    category: "payment",
    icon: "Calendar",
    defaultEnabled: false,
    requiresField: "paymentDueDay",
  },
  {
    id: "daysUntilDue",
    label: "Days Until Due",
    description: "Days remaining until payment is due",
    category: "payment",
    icon: "Clock",
    defaultEnabled: false,
    requiresField: "paymentDueDay",
  },

  // Balance Info
  {
    id: "currentBalance",
    label: "Current Balance",
    description: "Total amount owed on the card",
    category: "balance",
    icon: "Wallet",
    defaultEnabled: false,
  },
  {
    id: "creditLimit",
    label: "Credit Limit",
    description: "Maximum credit available",
    category: "balance",
    icon: "Target",
    defaultEnabled: false,
    requiresField: "debtLimit",
  },

  // Spending Metrics
  {
    id: "monthlySpending",
    label: "This Month's Spending",
    description: "Total charged this month",
    category: "spending",
    icon: "ShoppingCart",
    defaultEnabled: false,
  },
  {
    id: "transactionCount",
    label: "Transaction Count",
    description: "Number of transactions this month",
    category: "spending",
    icon: "Hash",
    defaultEnabled: false,
  },

  // Financial Health (calculations needed)
  {
    id: "interestCharges",
    label: "Interest Charges",
    description: "Interest paid this month",
    category: "financial",
    icon: "TrendingDown",
    defaultEnabled: false,
    requiresField: "interestRate",
  },
  {
    id: "payoffTimeline",
    label: "Payoff Timeline",
    description: "Months to pay off at minimum payment",
    category: "financial",
    icon: "CalendarDays",
    defaultEnabled: false,
    requiresField: "minimumPayment",
  },

  // Analytics
  {
    id: "topCategories",
    label: "Top Spending Categories",
    description: "Interactive table showing your highest expense categories",
    category: "analytics",
    icon: "TrendingDown",
    defaultEnabled: true,
  },
];

export const DEFAULT_ENABLED_METRICS: MetricId[] = AVAILABLE_METRICS
  .filter((m) => m.defaultEnabled)
  .map((m) => m.id);

export function getEnabledMetrics(account: Account): MetricId[] {
  if (account.enabledMetrics) {
    try {
      return JSON.parse(account.enabledMetrics) as MetricId[];
    } catch {
      return DEFAULT_ENABLED_METRICS;
    }
  }
  return DEFAULT_ENABLED_METRICS;
}

export function getAvailableMetricsForAccount(account: Account): MetricDefinition[] {
  return AVAILABLE_METRICS.filter((metric) => {
    // If metric requires a field, check if account has it
    if (metric.requiresField) {
      const fieldValue = account[metric.requiresField];
      return fieldValue !== null && fieldValue !== undefined;
    }
    return true;
  });
}

export function isMetricAvailable(metric: MetricDefinition, account: Account): boolean {
  if (metric.requiresField) {
    const fieldValue = account[metric.requiresField];
    return fieldValue !== null && fieldValue !== undefined;
  }
  return true;
}

// Metric calculation functions
export interface CalculatedMetrics {
  availableCredit?: number;
  creditUtilization?: number;
  isOverLimit?: boolean;
  currentBalance: number;
  creditLimit?: number;
  monthlySpending?: number;
  transactionCount?: number;
  nextPaymentDue?: string | undefined; // ISO date string
  daysUntilDue?: number;
  estimatedInterestThisMonth?: number;
  payoffMonths?: number;
}

export function calculateAllMetrics(account: Account): CalculatedMetrics {
  const balance = account.balance || 0;
  const absBalance = Math.abs(balance);
  const debtLimit = account.debtLimit || 0;

  const metrics: CalculatedMetrics = {
    currentBalance: absBalance,
  };

  // Credit health metrics
  if (debtLimit > 0) {
    metrics.creditLimit = debtLimit;
    metrics.availableCredit = debtLimit - absBalance;
    metrics.creditUtilization = (absBalance / debtLimit) * 100;
    metrics.isOverLimit = absBalance > debtLimit;
  }

  // Payment date calculations
  if (account.paymentDueDay) {
    const today = new Date();
    const currentMonth = today.getMonth();
    const currentYear = today.getFullYear();

    // Calculate next due date
    let dueDate = new Date(currentYear, currentMonth, account.paymentDueDay);

    // If due date has passed this month, use next month
    if (dueDate < today) {
      dueDate = new Date(currentYear, currentMonth + 1, account.paymentDueDay);
    }

    metrics.nextPaymentDue = dueDate.toISOString().split('T')[0];
    metrics.daysUntilDue = Math.ceil((dueDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
  }

  // Interest estimation
  if (account.interestRate && absBalance > 0) {
    // Simple monthly interest calculation
    const monthlyRate = account.interestRate / 100 / 12;
    metrics.estimatedInterestThisMonth = absBalance * monthlyRate;
  }

  // Payoff timeline
  if (account.minimumPayment && absBalance > 0 && account.interestRate) {
    // Simplified payoff calculation (doesn't account for decreasing balance)
    const monthlyRate = account.interestRate / 100 / 12;
    const minPayment = account.minimumPayment;

    if (minPayment > absBalance * monthlyRate) {
      // Can actually pay off
      let remaining = absBalance;
      let months = 0;
      const maxMonths = 600; // 50 years max

      while (remaining > 0.01 && months < maxMonths) {
        const interest = remaining * monthlyRate;
        const principal = Math.min(minPayment - interest, remaining);
        remaining -= principal;
        months++;
      }

      metrics.payoffMonths = months;
    }
  }

  return metrics;
}
