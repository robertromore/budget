import { isDebtAccount, type Account } from "$lib/schema/accounts";

export type BalanceColor = "positive" | "negative" | "neutral";

export interface FormattedBalance {
  amount: number;
  displayAmount: number;
  color: BalanceColor;
  label: string;
}

export interface DebtAccountMetrics {
  availableCredit?: number | undefined;
  creditUtilization?: number | undefined;
  remainingBalance?: number | undefined;
  payoffProgress?: number | undefined;
  isOverLimit?: boolean | undefined;
}

/**
 * Format account balance with correct polarity for display
 */
export function formatAccountBalance(account: Account): FormattedBalance {
  const balance = account.balance || 0;

  if (account.accountType && isDebtAccount(account.accountType)) {
    // Debt accounts (credit cards & loans)
    // Balance is already inverted (negative = debt owed, positive = credit/overpayment)
    return {
      amount: balance,
      displayAmount: balance,
      color: balance < 0 ? "negative" : balance > 0 ? "positive" : "neutral",
      label: balance < 0 ? "Owed" : balance > 0 ? "Credit" : "Paid Off",
    };
  }

  // Asset accounts
  return {
    amount: balance,
    displayAmount: balance,
    color: balance > 0 ? "positive" : balance < 0 ? "negative" : "neutral",
    label: "Balance",
  };
}

/**
 * Calculate debt account-specific metrics
 */
export function calculateDebtMetrics(account: Account): DebtAccountMetrics | null {
  if (!account.accountType || !isDebtAccount(account.accountType)) {
    return null;
  }

  const balance = account.balance || 0;
  const absBalance = Math.abs(balance);
  const debtLimit = account.debtLimit || 0;

  const metrics: DebtAccountMetrics = {};

  if (account.accountType === "credit_card" && debtLimit > 0) {
    // Credit card metrics
    metrics.availableCredit = debtLimit - absBalance;
    metrics.creditUtilization = (absBalance / debtLimit) * 100;
    metrics.isOverLimit = absBalance > debtLimit;
  }

  if (account.accountType === "loan" && debtLimit > 0) {
    // Loan metrics
    metrics.remainingBalance = absBalance;
    metrics.payoffProgress = ((debtLimit - absBalance) / debtLimit) * 100;
  }

  return metrics;
}

/**
 * Format currency amount for display
 */
export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
  }).format(amount);
}

/**
 * Format percentage for display
 */
export function formatPercentage(value: number): string {
  return `${value.toFixed(1)}%`;
}

/**
 * Get color class for balance display
 */
export function getBalanceColorClass(color: BalanceColor): string {
  switch (color) {
    case "positive":
      return "text-green-600 dark:text-green-400";
    case "negative":
      return "text-red-600 dark:text-red-400";
    case "neutral":
      return "text-muted-foreground";
  }
}
