// Shared raw `Transaction` -> `TransactionsFormat` mapping used by both the
// per-account transactions tab and the global /transactions page. Injecting
// reconciliation / balance-reset marker rows is opt-in via the `account`
// argument; cross-account contexts pass `null` and skip them.

import type { Account, Transaction } from "$core/schema";
import type { TransactionsFormat } from "$lib/types";
import { parseDate } from "@internationalized/date";

export interface FormatTransactionsOptions {
  /** Account id to stamp on every formatted row. */
  accountId: number;
  /**
   * When provided and the account has a `reconciledDate` /
   * `balanceResetDate`, the corresponding marker row is injected at the
   * right position (transactions are assumed sorted by date desc).
   * Cross-account / global views pass `null`.
   */
  account?: Account | null;
  /**
   * 'preserve' (default) keeps each transaction's running `balance` field;
   * 'null' clears it (used by the global /transactions page where running
   * balance is meaningless across accounts).
   */
  balanceMode?: "preserve" | "null";
}

/** Format a single raw transaction. Doesn't inject markers or split metadata. */
export function formatTransaction(
  t: Transaction,
  options: FormatTransactionsOptions
): TransactionsFormat {
  const txn = t as Transaction & {
    seq?: number | null;
    isTransfer?: boolean | null;
    transferId?: string | null;
    transferAccountId?: number | null;
    transferTransactionId?: number | null;
    transferAccount?: { name?: string | null; slug?: string | null };
  };

  const formatted: TransactionsFormat = {
    id: t.id ?? "",
    seq: txn.seq ?? null,
    date: parseDate(t.date),
    amount: t.amount,
    notes: t.notes,
    status: t.status as "cleared" | "pending" | "scheduled" | null,
    accountId: t.accountId ?? options.accountId,
    payeeId: t.payee?.id ?? null,
    payee: t.payee ?? null,
    categoryId: t.category?.id ?? null,
    category: t.category ?? null,
    parentId: t.parentId ?? null,
    balance: options.balanceMode === "null" ? null : t.balance,
    budgetAllocations: t.budgetAllocations ?? [],
  };

  if (t.scheduleId !== undefined) formatted.scheduleId = t.scheduleId;
  if (t.scheduleName) formatted.scheduleName = t.scheduleName;
  if (t.scheduleSlug) formatted.scheduleSlug = t.scheduleSlug;
  if (t.scheduleFrequency) formatted.scheduleFrequency = t.scheduleFrequency;
  if (t.scheduleInterval !== undefined) formatted.scheduleInterval = t.scheduleInterval;
  if (t.scheduleNextOccurrence) formatted.scheduleNextOccurrence = t.scheduleNextOccurrence;

  if (txn.isTransfer) formatted.isTransfer = txn.isTransfer;
  if (txn.transferId) formatted.transferId = txn.transferId;
  if (txn.transferAccountId) formatted.transferAccountId = txn.transferAccountId;
  if (txn.transferTransactionId) formatted.transferTransactionId = txn.transferTransactionId;
  if (txn.transferAccount?.name) formatted.transferAccountName = txn.transferAccount.name;
  if (txn.transferAccount?.slug) formatted.transferAccountSlug = txn.transferAccount.slug;

  return formatted;
}

/**
 * Format an array of transactions for table display. Handles:
 *   1. Per-row formatting via `formatTransaction`
 *   2. Split-parent metadata (mark parents, drop children)
 *   3. Optional reconciliation / balance-reset marker injection
 */
export function formatTransactions(
  transactions: Transaction[] | null | undefined,
  options: FormatTransactionsOptions
): TransactionsFormat[] {
  if (!transactions || !Array.isArray(transactions) || transactions.length === 0) {
    return [];
  }

  const result = transactions.map((t) => formatTransaction(t, options));

  // Split parent / child rollup.
  const childParentIds = new Set(
    result.filter((t) => t.parentId !== null).map((t) => t.parentId as number)
  );
  for (const t of result) {
    if (typeof t.id === "number" && childParentIds.has(t.id)) {
      t.isSplit = true;
      t.splitCount = result.filter((c) => c.parentId === t.id).length;
    }
  }
  const filtered = result.filter((t) => t.parentId === null || t.parentId === undefined);

  const account = options.account;
  if (!account) return filtered;

  // Reconciliation marker takes precedence over balance-reset marker.
  if (account.reconciledDate && account.reconciledBalance != null) {
    insertMarker(filtered, {
      id: "reconciliation-marker",
      seq: null,
      date: parseDate(account.reconciledDate),
      amount: account.reconciledBalance,
      notes: "Reconciliation Checkpoint",
      status: null,
      accountId: options.accountId,
      payeeId: null,
      payee: null,
      categoryId: null,
      category: null,
      parentId: null,
      balance: account.reconciledBalance,
      isReconciliationMarker: true,
      markerType: "reconciliation",
    }, account.reconciledDate);
  } else if (account.balanceResetDate && account.balanceAtResetDate != null) {
    insertMarker(filtered, {
      id: "balance-reset-marker",
      seq: null,
      date: parseDate(account.balanceResetDate),
      amount: account.balanceAtResetDate,
      notes: "Balance Reset Point",
      status: null,
      accountId: options.accountId,
      payeeId: null,
      payee: null,
      categoryId: null,
      category: null,
      parentId: null,
      balance: account.balanceAtResetDate,
      isReconciliationMarker: true,
      markerType: "balance-reset",
    }, account.balanceResetDate);
  }

  return filtered;
}

/**
 * Splice `marker` into `rows` at the position of the first row with
 * `date <= markerDate` (rows are sorted by date desc); push at end if
 * none qualify.
 */
function insertMarker(
  rows: TransactionsFormat[],
  marker: TransactionsFormat,
  markerDate: string
): void {
  const insertIndex = rows.findIndex((t) => t.date.toString() <= markerDate);
  if (insertIndex === -1) {
    rows.push(marker);
  } else {
    rows.splice(insertIndex, 0, marker);
  }
}
