import type { Account } from "$core/schema/accounts";

// ===== Types =====

export interface AmortizationPoint {
  month: number;
  monthLabel: string;
  balance: number;
  principalPayment: number; // This month's principal portion
  interestPayment: number; // This month's interest portion
  // Final payment is smaller than the standard amount; use these fields not a fixed payment size
  cumulativePrincipal: number; // Running total principal paid
  cumulativeInterest: number; // Running total interest paid
  payment: number; // Actual payment this month (final month may differ)
  x: number;
  y: number;
}

export interface LoanPayoffScenario {
  id: string;
  label: string;
  monthlyPayment: number;
  months: number; // Months to payoff (capped at MAX_LOAN_MONTHS)
  totalInterest: number;
  totalPaid: number;
  interestSaved: number; // Compared to base (standard payment) scenario
  monthsSaved: number; // Compared to base scenario
  data: Array<{ month: number; balance: number }>;
}

// Maximum loan length considered for projections (40 years)
const MAX_LOAN_MONTHS = 480;

// ===== Helper Functions =====

/**
 * Get the current outstanding loan balance from the account.
 *
 * For loan accounts:
 * - Negative balance = debt (you owe money) → return absolute value
 * - Positive or zero balance = no debt → return 0
 * Falls back to debtLimit (original principal) if no balance is set.
 */
export function getLoanBalance(account: Account): number {
  if (account.balance !== undefined && account.balance !== null) {
    return account.balance < 0 ? Math.abs(account.balance) : 0;
  }
  // No balance on file — use original principal as a fallback
  return Math.abs(account.debtLimit ?? 0);
}

/**
 * Format a month count as a human-readable string.
 * e.g. 0 → "Never", 6 → "6 mo", 12 → "1 yr", 18 → "1y 6m"
 */
export function formatLoanMonths(months: number): string {
  if (months === 0) return "Never";
  if (months >= MAX_LOAN_MONTHS) return "40+ yrs";
  if (months < 12) return `${months} mo`;
  const years = Math.floor(months / 12);
  const rem = months % 12;
  if (rem === 0) return `${years} yr`;
  return `${years}y ${rem}m`;
}

// ===== Main Calculation Functions =====

/**
 * Generate a full amortization schedule for a loan.
 * Returns month-by-month breakdown of principal vs. interest payments.
 *
 * @param principal - Current outstanding balance
 * @param annualRate - APR as a percentage (e.g., 6.5 for 6.5%)
 * @param payment - Fixed monthly payment amount
 */
export function generateAmortizationSchedule(
  principal: number,
  annualRate: number,
  payment: number
): AmortizationPoint[] {
  if (principal <= 0 || payment <= 0) return [];

  const monthlyRate = (annualRate || 0) / 100 / 12;
  const data: AmortizationPoint[] = [];

  let remaining = principal;
  let cumulativePrincipal = 0;
  let cumulativeInterest = 0;

  // Month 0 — starting state
  data.push({
    month: 0,
    monthLabel: "Now",
    balance: remaining,
    principalPayment: 0,
    interestPayment: 0,
    cumulativePrincipal: 0,
    cumulativeInterest: 0,
    payment: 0,
    x: 0,
    y: remaining,
  });

  for (let month = 1; remaining > 0.01 && month <= MAX_LOAN_MONTHS; month++) {
    const interestPayment = remaining * monthlyRate;
    const principalPayment = Math.min(payment - interestPayment, remaining);

    // If payment doesn't cover interest, the loan never pays off
    if (principalPayment <= 0) break;

    remaining = Math.max(0, remaining - principalPayment);
    cumulativePrincipal += principalPayment;
    cumulativeInterest += interestPayment;

    data.push({
      month,
      monthLabel: `Month ${month}`,
      balance: remaining,
      principalPayment,
      interestPayment,
      cumulativePrincipal,
      cumulativeInterest,
      payment: principalPayment + interestPayment,
      x: month,
      y: remaining,
    });
  }

  return data;
}

/**
 * Calculate payoff scenarios at different extra-payment levels.
 * The base scenario uses the standard payment. Additional scenarios add
 * fixed extra amounts on top.
 *
 * @param principal - Current outstanding balance
 * @param annualRate - APR as a percentage
 * @param basePayment - Standard monthly payment
 * @param customExtra - Optional user-specified extra payment amount
 */
export function calculateExtraPaymentScenarios(
  principal: number,
  annualRate: number,
  basePayment: number,
  customExtra?: number
): LoanPayoffScenario[] {
  if (principal <= 0 || basePayment <= 0) return [];

  const monthlyRate = (annualRate || 0) / 100 / 12;

  function runScenario(
    id: string,
    label: string,
    payment: number
  ): LoanPayoffScenario | null {
    if (payment <= 0) return null;

    // Check whether payment covers interest
    const firstMonthInterest = principal * monthlyRate;
    if (monthlyRate > 0 && payment <= firstMonthInterest) {
      return {
        id,
        label,
        monthlyPayment: payment,
        months: 0,
        totalInterest: Infinity,
        totalPaid: Infinity,
        interestSaved: 0,
        monthsSaved: 0,
        data: [],
      };
    }

    const data: Array<{ month: number; balance: number }> = [];
    let remaining = principal;
    let totalInterest = 0;
    let month = 0;

    data.push({ month: 0, balance: remaining });

    while (remaining > 0.01 && month < MAX_LOAN_MONTHS) {
      month++;
      const interest = remaining * monthlyRate;
      const principalPayment = Math.min(payment - interest, remaining);
      totalInterest += interest;
      remaining = Math.max(0, remaining - principalPayment);
      data.push({ month, balance: remaining });
    }

    return {
      id,
      label,
      monthlyPayment: payment,
      months: month,
      totalInterest,
      totalPaid: principal + totalInterest, // principal is the outer parameter here
      interestSaved: 0, // Filled in after base is known
      monthsSaved: 0,
      data,
    };
  }

  const scenarios: LoanPayoffScenario[] = [];

  // Scenario 1: Standard payment (base)
  const base = runScenario("standard", "Standard Payment", basePayment);
  if (!base) return [];
  scenarios.push(base);

  // Extra payment tiers
  const extraAmounts = [100, 200, 500];
  const labels = ["+$100/mo", "+$200/mo", "+$500/mo"];
  const ids = ["extra-100", "extra-200", "extra-500"];

  for (let i = 0; i < extraAmounts.length; i++) {
    const s = runScenario(ids[i], labels[i], basePayment + extraAmounts[i]);
    if (s) scenarios.push(s);
  }

  // Custom extra payment scenario
  if (customExtra && customExtra > 0) {
    const s = runScenario(
      "custom",
      `+${new Intl.NumberFormat("en-US", {
        style: "currency",
        currency: "USD",
        maximumFractionDigits: 0,
      }).format(customExtra)}/mo`,
      basePayment + customExtra
    );
    if (s) scenarios.push(s);
  }

  // Compute interestSaved and monthsSaved relative to base
  const baseMonths = base.months;
  const baseInterest = base.totalInterest;

  for (const s of scenarios) {
    s.interestSaved =
      baseInterest === Infinity || s.totalInterest === Infinity
        ? 0
        : Math.max(0, baseInterest - s.totalInterest);
    s.monthsSaved = Math.max(0, baseMonths - s.months);
  }

  return scenarios;
}
