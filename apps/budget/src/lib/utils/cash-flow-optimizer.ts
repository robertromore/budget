import type { Account } from "$core/schema/accounts";

// ===== Types =====

export interface IdleCashResult {
  accountId: number;
  accountName: string;
  currentBalance: number;
  targetBalance: number;
  surplus: number;
}

export interface TransferRecommendation {
  fromAccountId: number;
  fromAccountName: string;
  toAccountId: number;
  toAccountName: string;
  amount: number;
  annualGain: number;
  rateDifferential: number;
}

// Account types where a cash buffer / target balance is meaningful.
const CASH_FLOW_ACCOUNT_TYPES = new Set(["checking", "savings", "cash"]);

// ===== Pure functions =====

/**
 * Identifies checking/savings/cash accounts where the current balance exceeds
 * the configured target buffer. Returns one entry per over-funded account with
 * the surplus amount, sorted largest-first.
 */
export function calculateIdleCash(accounts: Account[]): IdleCashResult[] {
  const results: IdleCashResult[] = [];

  for (const account of accounts) {
    if (!CASH_FLOW_ACCOUNT_TYPES.has(account.accountType ?? "")) continue;
    if (account.targetBalance == null) continue;
    if (account.closed || account.deletedAt) continue;

    const surplus = (account.balance ?? 0) - account.targetBalance;
    if (surplus <= 0) continue;

    results.push({
      accountId: account.id,
      accountName: account.name,
      currentBalance: account.balance ?? 0,
      targetBalance: account.targetBalance,
      surplus,
    });
  }

  return results.sort((a, b) => b.surplus - a.surplus);
}

/**
 * Returns the total idle cash (sum of all surpluses) across all accounts.
 */
export function getTotalIdleCash(accounts: Account[]): number {
  return calculateIdleCash(accounts).reduce((sum, r) => sum + r.surplus, 0);
}

/**
 * Estimates annual gain from moving idle cash from a low-yield source to a
 * higher-yield destination: amount × (highAPY − lowAPY) / 100.
 */
export function estimateOpportunityCost(
  amount: number,
  lowAPY: number,
  highAPY: number
): number {
  if (highAPY <= lowAPY) return 0;
  return amount * ((highAPY - lowAPY) / 100);
}

/**
 * Generates ranked transfer suggestions by pairing each idle source account
 * with higher-yield destination accounts. Returns at most 3 recommendations,
 * sorted by estimated annual gain descending.
 */
export function generateTransferRecommendations(
  accounts: Account[]
): TransferRecommendation[] {
  const idleSources = calculateIdleCash(accounts);
  if (idleSources.length === 0) return [];

  // O(1) source-account lookups inside the nested loop below.
  const accountById = new Map(accounts.map((a) => [a.id, a]));

  // Destinations: savings or investment accounts with a positive interest rate.
  const destinations = accounts.filter(
    (a) =>
      !a.closed &&
      !a.deletedAt &&
      (a.interestRate ?? 0) > 0 &&
      (a.accountType === "savings" || a.accountType === "investment")
  );

  const recommendations: TransferRecommendation[] = [];

  for (const source of idleSources) {
    const sourceRate = accountById.get(source.accountId)?.interestRate ?? 0;

    for (const dest of destinations) {
      if (dest.id === source.accountId) continue;
      const destRate = dest.interestRate ?? 0;
      if (destRate <= sourceRate) continue;

      recommendations.push({
        fromAccountId: source.accountId,
        fromAccountName: source.accountName,
        toAccountId: dest.id,
        toAccountName: dest.name,
        amount: source.surplus,
        annualGain: estimateOpportunityCost(source.surplus, sourceRate, destRate),
        rateDifferential: destRate - sourceRate,
      });
    }
  }

  return recommendations
    .sort((a, b) => b.annualGain - a.annualGain)
    .slice(0, 3);
}
