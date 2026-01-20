/**
 * Financial Utilities
 *
 * Centralized financial calculation and amount manipulation functions.
 * Provides consistent patterns for handling monetary values across the application.
 */

/**
 * Get the absolute value of an amount.
 * Useful for display contexts where sign is shown separately.
 * @example absAmount(-123.45) => 123.45
 * @example absAmount(123.45) => 123.45
 */
export function absAmount(amount: number): number {
  return Math.abs(amount);
}

/**
 * Check if an amount represents income (positive value).
 * In double-entry bookkeeping, positive amounts typically represent inflows.
 * @example isIncome(100) => true
 * @example isIncome(-50) => false
 * @example isIncome(0) => false
 */
export function isIncome(amount: number): boolean {
  return amount > 0;
}

/**
 * Check if an amount represents an expense (negative value).
 * In double-entry bookkeeping, negative amounts typically represent outflows.
 * @example isExpense(-100) => true
 * @example isExpense(50) => false
 * @example isExpense(0) => false
 */
export function isExpense(amount: number): boolean {
  return amount < 0;
}

/**
 * Check if an amount is zero (neither income nor expense).
 * @example isZeroAmount(0) => true
 * @example isZeroAmount(0.001) => false
 */
export function isZeroAmount(amount: number): boolean {
  return amount === 0;
}

/**
 * Apply a sign to an amount based on a boolean flag.
 * Useful when converting unsigned amounts to signed based on transaction type.
 * @example signedAmount(100, true) => 100 (positive/income)
 * @example signedAmount(100, false) => -100 (negative/expense)
 */
export function signedAmount(amount: number, positive: boolean): number {
  const magnitude = Math.abs(amount);
  return positive ? magnitude : -magnitude;
}

/**
 * Flip the sign of an amount.
 * Useful for reversing transactions or converting between perspectives.
 * @example negateAmount(100) => -100
 * @example negateAmount(-50) => 50
 */
export function negateAmount(amount: number): number {
  return -amount;
}

/**
 * Get the sign indicator for an amount.
 * Returns "+", "-", or "" for positive, negative, or zero amounts.
 * @example getAmountSign(100) => "+"
 * @example getAmountSign(-50) => "-"
 * @example getAmountSign(0) => ""
 */
export function getAmountSign(amount: number): string {
  if (amount > 0) return "+";
  if (amount < 0) return "-";
  return "";
}

/**
 * Calculate the sum of amounts from an array of objects.
 * @example sumAmounts([{amount: 10}, {amount: -5}], 'amount') => 5
 */
export function sumAmounts<T extends Record<string, unknown>>(
  items: T[],
  key: keyof T
): number {
  return items.reduce((sum, item) => {
    const value = item[key];
    return sum + (typeof value === "number" ? value : 0);
  }, 0);
}

/**
 * Calculate the total income (positive amounts only) from an array.
 * @example totalIncome([100, -50, 200, -30]) => 300
 */
export function totalIncome(amounts: number[]): number {
  return amounts.filter(isIncome).reduce((sum, amount) => sum + amount, 0);
}

/**
 * Calculate the total expenses (negative amounts only) from an array.
 * Returns a positive number representing total outflow.
 * @example totalExpenses([100, -50, 200, -30]) => 80
 */
export function totalExpenses(amounts: number[]): number {
  return Math.abs(
    amounts.filter(isExpense).reduce((sum, amount) => sum + amount, 0)
  );
}

/**
 * Calculate net amount (income - expenses).
 * @example netAmount([100, -50, 200, -30]) => 220
 */
export function netAmount(amounts: number[]): number {
  return amounts.reduce((sum, amount) => sum + amount, 0);
}

/**
 * Check if amount is within a range (inclusive).
 * @example isAmountInRange(50, 0, 100) => true
 * @example isAmountInRange(150, 0, 100) => false
 */
export function isAmountInRange(
  amount: number,
  min: number,
  max: number
): boolean {
  return amount >= min && amount <= max;
}

/**
 * Clamp an amount to a range.
 * @example clampAmount(150, 0, 100) => 100
 * @example clampAmount(-50, 0, 100) => 0
 */
export function clampAmount(amount: number, min: number, max: number): number {
  return Math.min(Math.max(amount, min), max);
}

/**
 * Calculate percentage of amount relative to total.
 * Returns 0 if total is 0 to avoid division by zero.
 * @example percentageOf(25, 100) => 0.25
 * @example percentageOf(50, 0) => 0
 */
export function percentageOf(amount: number, total: number): number {
  if (total === 0) return 0;
  return amount / total;
}

/**
 * Calculate the difference between two amounts.
 * @example amountDifference(100, 75) => 25
 * @example amountDifference(75, 100) => -25
 */
export function amountDifference(from: number, to: number): number {
  return from - to;
}

// Note: Use percentageChange from math-utilities for percentage calculations.
// It returns percentage as a whole number (e.g., 50 for 50% increase).

/**
 * Split an amount into equal parts.
 * Handles rounding by distributing remainder to first parts.
 * @example splitAmount(100, 3) => [33.34, 33.33, 33.33]
 */
export function splitAmount(amount: number, parts: number): number[] {
  if (parts <= 0) return [];
  if (parts === 1) return [amount];

  const baseAmount = Math.floor((amount * 100) / parts) / 100;
  const remainder = Math.round((amount - baseAmount * parts) * 100);

  return Array.from({ length: parts }, (_, i) =>
    i < remainder ? baseAmount + 0.01 : baseAmount
  );
}
