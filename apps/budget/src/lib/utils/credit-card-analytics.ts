import type { TransactionsFormat } from "$lib/types";
import type { Account } from "$lib/schema/accounts";

// ===== Types =====

export interface MonthlyUtilizationPoint {
  month: string; // "YYYY-MM"
  monthLabel: string; // "January 2025"
  date: Date;
  endingBalance: number; // Balance at end of month (absolute value)
  creditLimit: number;
  utilization: number; // Percentage (0-100+) based on charges/creditLimit
  availableCredit: number;
  charges: number; // Total charges (negative transactions)
  payments: number; // Total payments (positive transactions)
  index: number;
}

export interface PaymentAnalysisPoint {
  month: string;
  monthLabel: string;
  date: Date;
  payment: number; // Total payments made
  minimumPayment: number; // Required minimum
  interestCharged: number; // Interest from transactions
  principalPaid: number; // payment - interest (estimated)
  paymentStatus: "full" | "above-minimum" | "minimum" | "below-minimum" | "none";
  chargesThisMonth: number;
  index: number;
}

export interface PayoffScenario {
  id: string;
  label: string;
  monthlyPayment: number;
  months: number; // Months to payoff (0 if never)
  totalInterest: number; // Total interest paid
  totalPaid: number; // Total amount paid (principal + interest)
  data: PayoffProjectionPoint[];
}

export interface PayoffProjectionPoint {
  month: number; // 0, 1, 2, ... (months from now)
  monthLabel: string; // "Month 1", "Month 2", etc.
  balance: number; // Remaining balance
  interestPaid: number; // Cumulative interest paid
  principalPaid: number; // Cumulative principal paid
  x: number; // For chart (same as month)
  y: number; // For chart (same as balance)
}

// ===== Helper Functions =====

/**
 * Check if a transaction is a payment (positive amount on credit card)
 */
export function isPaymentTransaction(tx: TransactionsFormat): boolean {
  return tx.amount > 0;
}

/**
 * Check if a transaction is likely an interest charge
 */
export function isInterestCharge(tx: TransactionsFormat): boolean {
  const interestPatterns = [
    "interest",
    "finance charge",
    "apr",
    "interest charge",
    "monthly interest",
  ];
  const payeeName = (tx.payee?.name || "").toLowerCase();
  const notes = (tx.notes || "").toLowerCase();
  const searchText = `${payeeName} ${notes}`;

  return interestPatterns.some((p) => searchText.includes(p));
}

/**
 * Get date string from transaction date (handles CalendarDate objects)
 */
function getDateString(date: unknown): string {
  if (!date) return "";

  // Handle @internationalized/date CalendarDate objects
  if (typeof date === "object" && date !== null && "toString" in date) {
    const str = date.toString();
    // CalendarDate.toString() returns "YYYY-MM-DD"
    if (typeof str === "string" && /^\d{4}-\d{2}-\d{2}/.test(str)) {
      return str.split("T")[0];
    }
  }

  if (date instanceof Date) {
    return date.toISOString().split("T")[0];
  }

  if (typeof date === "string") {
    return date.split("T")[0];
  }

  return String(date).split("T")[0];
}

// ===== Main Calculation Functions =====

/**
 * Calculate monthly utilization and balance data from transactions
 */
export function calculateMonthlyUtilization(
  transactions: TransactionsFormat[],
  creditLimit: number
): MonthlyUtilizationPoint[] {
  if (!transactions.length || !creditLimit || creditLimit <= 0) {
    return [];
  }

  // Group transactions by month
  const dataByMonth = new Map<
    string,
    { charges: number; payments: number; netChange: number }
  >();

  for (const tx of transactions) {
    const dateStr = getDateString(tx.date);
    if (!dateStr) continue;

    const monthKey = dateStr.substring(0, 7); // "YYYY-MM"

    if (!dataByMonth.has(monthKey)) {
      dataByMonth.set(monthKey, { charges: 0, payments: 0, netChange: 0 });
    }

    const data = dataByMonth.get(monthKey)!;

    if (tx.amount > 0) {
      // Payment (reduces balance)
      data.payments += tx.amount;
    } else {
      // Charge (increases balance)
      data.charges += Math.abs(tx.amount);
    }
    data.netChange += tx.amount; // Positive payments reduce balance
  }

  // Sort months chronologically
  const sortedMonths = Array.from(dataByMonth.entries()).sort((a, b) =>
    a[0].localeCompare(b[0])
  );

  // Calculate running balance and utilization
  // Start from the first month with a reasonable estimate
  // In reality, we'd need the starting balance, but we'll use cumulative from transactions
  let runningBalance = 0;

  return sortedMonths.map(([month, data], idx) => {
    // Net change: charges increase balance (negative in transactions), payments decrease (positive)
    // So we add charges and subtract payments
    runningBalance = runningBalance + data.charges - data.payments;

    // Ensure balance doesn't go negative (shouldn't with correct data)
    const endingBalance = Math.max(0, runningBalance);

    // Utilization is based on charges made this month, not ending balance
    // This shows how much of the credit limit was actually USED, even if paid off
    const utilization =
      creditLimit > 0 ? (data.charges / creditLimit) * 100 : 0;
    const availableCredit = Math.max(0, creditLimit - endingBalance);

    const [year, monthNum] = month.split("-");
    const date = new Date(
      Date.UTC(parseInt(year), parseInt(monthNum) - 1, 15, 12, 0, 0)
    );
    const monthLabel = date.toLocaleDateString("en-US", {
      month: "long",
      year: "numeric",
      timeZone: "UTC",
    });

    return {
      month,
      monthLabel,
      date,
      endingBalance,
      creditLimit,
      utilization,
      availableCredit,
      charges: data.charges,
      payments: data.payments,
      index: idx,
    };
  });
}

/**
 * Analyze payment behavior vs minimum payments
 */
export function analyzePayments(
  transactions: TransactionsFormat[],
  minimumPayment: number,
  _interestRate: number
): PaymentAnalysisPoint[] {
  if (!transactions.length) {
    return [];
  }

  // Group transactions by month
  const dataByMonth = new Map<
    string,
    {
      payments: number;
      charges: number;
      interestCharges: number;
    }
  >();

  for (const tx of transactions) {
    const dateStr = getDateString(tx.date);
    if (!dateStr) continue;

    const monthKey = dateStr.substring(0, 7);

    if (!dataByMonth.has(monthKey)) {
      dataByMonth.set(monthKey, {
        payments: 0,
        charges: 0,
        interestCharges: 0,
      });
    }

    const data = dataByMonth.get(monthKey)!;

    if (tx.amount > 0) {
      data.payments += tx.amount;
    } else {
      data.charges += Math.abs(tx.amount);

      // Check if this is an interest charge
      if (isInterestCharge(tx)) {
        data.interestCharges += Math.abs(tx.amount);
      }
    }
  }

  // Sort and calculate payment status
  const sortedMonths = Array.from(dataByMonth.entries()).sort((a, b) =>
    a[0].localeCompare(b[0])
  );

  return sortedMonths.map(([month, data], idx) => {
    const [year, monthNum] = month.split("-");
    const date = new Date(
      Date.UTC(parseInt(year), parseInt(monthNum) - 1, 15, 12, 0, 0)
    );
    const monthLabel = date.toLocaleDateString("en-US", {
      month: "long",
      year: "numeric",
      timeZone: "UTC",
    });

    // Determine payment status
    let paymentStatus: PaymentAnalysisPoint["paymentStatus"];
    if (data.payments === 0) {
      paymentStatus = "none";
    } else if (data.payments >= data.charges) {
      paymentStatus = "full"; // Paid off all charges
    } else if (minimumPayment > 0 && data.payments >= minimumPayment * 1.5) {
      paymentStatus = "above-minimum"; // Paid significantly more than minimum
    } else if (minimumPayment > 0 && data.payments >= minimumPayment * 0.95) {
      paymentStatus = "minimum"; // Paid approximately the minimum
    } else {
      paymentStatus = "below-minimum";
    }

    // Principal paid is payments minus interest (if we can determine it)
    const principalPaid = Math.max(0, data.payments - data.interestCharges);

    return {
      month,
      monthLabel,
      date,
      payment: data.payments,
      minimumPayment: minimumPayment || 0,
      interestCharged: data.interestCharges,
      principalPaid,
      paymentStatus,
      chargesThisMonth: data.charges,
      index: idx,
    };
  });
}

/**
 * Calculate payoff scenarios at different payment levels
 */
export function calculatePayoffScenarios(
  balance: number,
  interestRate: number, // APR as percentage (e.g., 24.99)
  minimumPayment: number,
  customPayment?: number
): PayoffScenario[] {
  if (balance <= 0) {
    return [];
  }

  const scenarios: PayoffScenario[] = [];
  const monthlyRate = (interestRate || 0) / 100 / 12;

  // Helper to calculate a single scenario
  function calculateScenario(
    id: string,
    label: string,
    payment: number
  ): PayoffScenario | null {
    if (payment <= 0) return null;

    // Check if payment can cover interest
    const firstMonthInterest = balance * monthlyRate;
    if (payment <= firstMonthInterest && monthlyRate > 0) {
      // Payment doesn't cover interest - debt will never be paid off
      return {
        id,
        label,
        monthlyPayment: payment,
        months: 0, // Indicates never
        totalInterest: Infinity,
        totalPaid: Infinity,
        data: [],
      };
    }

    const data: PayoffProjectionPoint[] = [];
    let remaining = balance;
    let totalInterest = 0;
    let totalPrincipal = 0;
    let month = 0;
    const maxMonths = 360; // 30 years max

    // Initial point
    data.push({
      month: 0,
      monthLabel: "Now",
      balance: remaining,
      interestPaid: 0,
      principalPaid: 0,
      x: 0,
      y: remaining,
    });

    while (remaining > 0.01 && month < maxMonths) {
      month++;

      // Calculate interest for this month
      const interest = remaining * monthlyRate;
      totalInterest += interest;

      // Calculate principal payment (payment minus interest)
      const principalPayment = Math.min(payment - interest, remaining);
      totalPrincipal += principalPayment;

      // Update remaining balance
      remaining = Math.max(0, remaining - principalPayment);

      data.push({
        month,
        monthLabel: `Month ${month}`,
        balance: remaining,
        interestPaid: totalInterest,
        principalPaid: totalPrincipal,
        x: month,
        y: remaining,
      });
    }

    return {
      id,
      label,
      monthlyPayment: payment,
      months: month,
      totalInterest,
      totalPaid: totalPrincipal + totalInterest,
      data,
    };
  }

  // Scenario 1: Minimum payment
  if (minimumPayment > 0) {
    const minScenario = calculateScenario(
      "minimum",
      "Minimum Payment",
      minimumPayment
    );
    if (minScenario) scenarios.push(minScenario);
  }

  // Scenario 2: 2x minimum
  if (minimumPayment > 0) {
    const doubleScenario = calculateScenario(
      "double",
      "2x Minimum",
      minimumPayment * 2
    );
    if (doubleScenario) scenarios.push(doubleScenario);
  }

  // Scenario 3: Pay in 12 months (calculate required payment)
  const targetMonths = 12;
  if (monthlyRate > 0) {
    // Use loan payment formula: P = (r * PV) / (1 - (1 + r)^-n)
    const payFor12 =
      (monthlyRate * balance) / (1 - Math.pow(1 + monthlyRate, -targetMonths));
    const twelveMonthScenario = calculateScenario(
      "twelve-months",
      "Pay in 12 Months",
      payFor12
    );
    if (twelveMonthScenario) scenarios.push(twelveMonthScenario);
  } else {
    // No interest - just divide
    const payFor12 = balance / targetMonths;
    const twelveMonthScenario = calculateScenario(
      "twelve-months",
      "Pay in 12 Months",
      payFor12
    );
    if (twelveMonthScenario) scenarios.push(twelveMonthScenario);
  }

  // Scenario 4: Custom payment (if provided)
  if (customPayment && customPayment > 0) {
    const customScenario = calculateScenario(
      "custom",
      "Custom Payment",
      customPayment
    );
    if (customScenario) scenarios.push(customScenario);
  }

  return scenarios;
}

/**
 * Calculate balance history from transactions by working backwards from current balance.
 * This gives accurate historical balances rather than simulated ones starting from $0.
 *
 * @param transactions - All transactions for the account
 * @param creditLimit - The credit limit for the account
 * @param currentBalance - The current account balance (used as anchor for most recent month)
 */
export function calculateBalanceHistory(
  transactions: TransactionsFormat[],
  creditLimit: number,
  currentBalance: number = 0
): MonthlyUtilizationPoint[] {
  if (!transactions.length) {
    return [];
  }

  // Group transactions by month
  const dataByMonth = new Map<
    string,
    { charges: number; payments: number }
  >();

  for (const tx of transactions) {
    const dateStr = getDateString(tx.date);
    if (!dateStr) continue;

    const monthKey = dateStr.substring(0, 7);

    if (!dataByMonth.has(monthKey)) {
      dataByMonth.set(monthKey, { charges: 0, payments: 0 });
    }

    const data = dataByMonth.get(monthKey)!;

    if (tx.amount > 0) {
      data.payments += tx.amount;
    } else {
      data.charges += Math.abs(tx.amount);
    }
  }

  // Sort months chronologically (oldest first)
  const sortedMonths = Array.from(dataByMonth.entries()).sort((a, b) =>
    a[0].localeCompare(b[0])
  );

  if (sortedMonths.length === 0) {
    return [];
  }

  // Work backwards from current balance to reconstruct historical balances
  // Most recent month's ending balance = current balance
  // Earlier month's ending balance = later month's ending - later month's charges + later month's payments
  const endingBalances: number[] = new Array(sortedMonths.length);

  // Start with current balance as the ending balance for the most recent month
  endingBalances[sortedMonths.length - 1] = Math.abs(currentBalance);

  // Work backwards through the months
  for (let i = sortedMonths.length - 2; i >= 0; i--) {
    const nextMonthData = sortedMonths[i + 1][1];
    const nextMonthEnding = endingBalances[i + 1];

    // To get this month's ending balance, undo next month's transactions:
    // this_month_ending = next_month_ending - next_month_charges + next_month_payments
    const thisMonthEnding = nextMonthEnding - nextMonthData.charges + nextMonthData.payments;
    endingBalances[i] = Math.max(0, thisMonthEnding);
  }

  // Build the result array
  return sortedMonths.map(([month, data], idx) => {
    const endingBalance = endingBalances[idx];

    const utilization =
      creditLimit > 0 ? (endingBalance / creditLimit) * 100 : 0;
    const availableCredit = Math.max(0, (creditLimit || 0) - endingBalance);

    const [year, monthNum] = month.split("-");
    const date = new Date(
      Date.UTC(parseInt(year), parseInt(monthNum) - 1, 15, 12, 0, 0)
    );
    const monthLabel = date.toLocaleDateString("en-US", {
      month: "long",
      year: "numeric",
      timeZone: "UTC",
    });

    return {
      month,
      monthLabel,
      date,
      endingBalance,
      creditLimit: creditLimit || 0,
      utilization,
      availableCredit,
      charges: data.charges,
      payments: data.payments,
      index: idx,
    };
  });
}

/**
 * Get current debt balance from account for payoff calculations.
 *
 * With the corrected balance semantics:
 * - Negative balance = debt (you owe money) → return the absolute value as debt amount
 * - Positive balance = credit/overpayment → return 0 (no debt to pay off)
 * - Zero balance = no debt → return 0
 */
export function getCurrentBalance(
  account: Account,
  transactions: TransactionsFormat[]
): number {
  // If account has a balance, check if it's debt (negative)
  if (account.balance !== undefined && account.balance !== null) {
    // Negative balance means debt - return the absolute value as the debt amount
    // Positive or zero balance means no debt (credit or paid off)
    return account.balance < 0 ? Math.abs(account.balance) : 0;
  }

  // Otherwise estimate from transactions
  // Charges (negative) increase debt, payments (positive) decrease debt
  let debt = 0;
  for (const tx of transactions) {
    if (tx.amount > 0) {
      debt -= tx.amount; // Payments reduce debt
    } else {
      debt += Math.abs(tx.amount); // Charges increase debt
    }
  }

  return Math.max(0, debt);
}
