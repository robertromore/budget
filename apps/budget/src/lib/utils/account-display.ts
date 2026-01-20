import { isDebtAccount, type Account } from "$lib/schema/accounts";
import { formatCurrency as formatCurrencyFromFormatters, formatPercentRaw } from "$lib/utils/formatters";

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
 *
 * With the corrected balance semantics:
 * - Negative balance = debt (you owe money)
 * - Positive balance = credit/overpayment (no debt)
 */
export function calculateDebtMetrics(account: Account): DebtAccountMetrics | null {
  if (!account.accountType || !isDebtAccount(account.accountType)) {
    return null;
  }

  const balance = account.balance || 0;
  // Debt amount is the absolute value of negative balances only
  // Positive balances mean credit (no debt)
  const debtAmount = balance < 0 ? Math.abs(balance) : 0;
  const debtLimit = account.debtLimit || 0;

  const metrics: DebtAccountMetrics = {};

  if (account.accountType === "credit_card" && debtLimit > 0) {
    // Credit card metrics
    metrics.availableCredit = debtLimit - debtAmount;
    metrics.creditUtilization = debtAmount > 0 ? (debtAmount / debtLimit) * 100 : 0;
    metrics.isOverLimit = debtAmount > debtLimit;
  }

  if (account.accountType === "loan" && debtLimit > 0) {
    // Loan metrics
    metrics.remainingBalance = debtAmount;
    metrics.payoffProgress = debtAmount > 0 ? ((debtLimit - debtAmount) / debtLimit) * 100 : 100;
  }

  return metrics;
}

/**
 * Format currency amount for display - uses user preferences
 * Re-exported from formatters.ts for backward compatibility
 */
export const formatCurrency = formatCurrencyFromFormatters;

/**
 * Format percentage for display
 */
export function formatPercentage(value: number): string {
  return formatPercentRaw(value, 1);
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
