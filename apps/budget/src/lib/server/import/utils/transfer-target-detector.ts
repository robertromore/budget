/**
 * Transfer Target Detection Utility
 *
 * Detects when imported transactions match existing transfer targets.
 * This is used during the preview step to show users which rows will be
 * reconciled with existing transfers instead of creating duplicates.
 */

import { accounts as accountTable } from "$lib/schema/accounts";
import { transactions as transactionTable } from "$lib/schema/transactions";
import { db } from "$lib/server/db";
import type { ImportRow, TransferTargetMatch } from "$lib/types/import";
import { and, eq, isNull } from "drizzle-orm";

/**
 * Get existing transfer target transactions in an account.
 * These are transactions created as the "target" side of transfers from other accounts.
 */
export async function getTransferTargets(accountId: number) {
  return db
    .select()
    .from(transactionTable)
    .where(
      and(
        eq(transactionTable.accountId, accountId),
        eq(transactionTable.isTransfer, true),
        isNull(transactionTable.deletedAt)
      )
    );
}

/**
 * Get account names for a set of account IDs.
 */
export async function getAccountNames(accountIds: number[]): Promise<Map<number, string>> {
  const accountNames = new Map<number, string>();

  if (accountIds.length === 0) {
    return accountNames;
  }

  const accountRecords = await db
    .select({ id: accountTable.id, name: accountTable.name })
    .from(accountTable)
    .where(isNull(accountTable.deletedAt));

  for (const acc of accountRecords) {
    accountNames.set(acc.id, acc.name);
  }

  return accountNames;
}

/**
 * Find a transfer target match for a single import row.
 * Returns the match if found, or null otherwise.
 */
export function findTransferTargetMatchForRow(
  row: ImportRow,
  transferTargets: Awaited<ReturnType<typeof getTransferTargets>>,
  accountNames: Map<number, string>
): TransferTargetMatch | null {
  // Skip rows that are already invalid or set as transfers
  if (row.validationStatus === "invalid") return null;
  if (row.normalizedData["transferAccountId"]) return null;

  const rowDateStr = row.normalizedData["date"] as string;
  const rowAmount = row.normalizedData["amount"] as number;

  if (!rowDateStr || rowAmount === undefined || rowAmount === null) return null;

  const rowDate = new Date(rowDateStr);
  if (isNaN(rowDate.getTime())) return null;

  // Find matching transfer targets
  for (const target of transferTargets) {
    // Skip if already reconciled (has importedAt set)
    if (target.importedAt) continue;

    const targetDate = new Date(target.date);
    if (isNaN(targetDate.getTime())) continue;

    // Calculate date difference in days
    const daysDiff = Math.abs(
      Math.floor((rowDate.getTime() - targetDate.getTime()) / (1000 * 60 * 60 * 24))
    );

    // Check if within +/-3 days
    if (daysDiff > 3) continue;

    // Check amount match (within $0.01)
    const amountMatch = Math.abs(rowAmount - target.amount) < 0.01;

    if (amountMatch) {
      // Determine confidence based on date proximity
      let confidence: "high" | "medium" | "low";
      if (daysDiff === 0) {
        confidence = "high";
      } else if (daysDiff <= 1) {
        confidence = "medium";
      } else {
        confidence = "low";
      }

      const sourceAccountId = target.transferAccountId;
      const sourceAccountName = sourceAccountId
        ? accountNames.get(sourceAccountId) || `Account #${sourceAccountId}`
        : "Unknown Account";

      return {
        existingTransactionId: target.id,
        existingTransferId: target.transferId || "",
        sourceAccountId: sourceAccountId || 0,
        sourceAccountName,
        dateDifference: daysDiff,
        confidence,
      };
    }
  }

  return null;
}

/**
 * Detect transfer target matches for all rows during import preview.
 * This annotates rows with transferTargetMatch and updates their validationStatus.
 *
 * @param rows - The import rows to check
 * @param accountId - The account being imported into
 * @returns The rows with transfer target matches annotated
 */
export async function detectTransferTargetMatches(
  rows: ImportRow[],
  accountId: number
): Promise<ImportRow[]> {
  // Get existing transfer targets in this account
  const transferTargets = await getTransferTargets(accountId);

  if (transferTargets.length === 0) {
    return rows;
  }

  // Get account names for display
  const accountIds = [
    ...new Set(transferTargets.map((t) => t.transferAccountId).filter(Boolean)),
  ] as number[];
  const accountNames = await getAccountNames(accountIds);

  // Check each row for transfer target matches
  for (const row of rows) {
    const match = findTransferTargetMatchForRow(row, transferTargets, accountNames);
    if (match) {
      row.transferTargetMatch = match;
      row.validationStatus = "transfer_match";
    }
  }

  return rows;
}
