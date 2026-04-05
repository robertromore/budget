/**
 * Shared post-parse enrichment logic for import endpoints.
 *
 * Handles schedule matching, transfer target detection, and transfer mapping
 * suggestion — extracted from upload/+server.ts and remap/+server.ts to
 * eliminate duplication and behavioral divergence.
 */

import { accounts as accountsTable } from "$core/schema/accounts";
import { payees as payeeTable } from "$core/schema/payees";
import { scheduleDates as scheduleDateTable } from "$core/schema/schedule-dates";
import type { Schedule } from "$core/schema/schedules";
import { schedules as scheduleTable } from "$core/schema/schedules";
import type { TransferMappingWithAccount } from "$core/schema/transfer-mappings";
import { db } from "$core/server/db";
import { cleanStringForFuzzyMatching, normalize } from "$lib/utils/string-utilities";
import { PayeeMatcher } from "$core/server/import/matchers/payee-matcher";
import { ScheduleMatcher } from "$core/server/import/matchers/schedule-matcher";
import { detectTransferTargetMatches } from "$core/server/import/utils/transfer-target-detector";
import type { ImportRow, ScheduleMatch } from "$core/types/import";
import { and, eq, isNull } from "drizzle-orm";

interface EnrichmentContext {
  accountId: number;
  workspaceId: number;
}

interface EnrichmentResult {
  rows: ImportRow[];
  scheduleMatches?: ScheduleMatch[];
}

/**
 * Run schedule matching, transfer target detection, and transfer mapping
 * enrichment on a set of validated import rows.
 */
export async function enrichImportRows(
  validatedData: ImportRow[],
  ctx: EnrichmentContext
): Promise<EnrichmentResult> {
  let rows = validatedData;

  // 1. Schedule matching
  const scheduleMatches = await detectScheduleMatches(rows, ctx);

  // 2. Transfer target detection (matches existing transfer counterparts)
  rows = await detectTransferTargetMatches(rows, ctx.accountId);

  // 3. Transfer mapping suggestions (based on saved payee→account mappings)
  await applyTransferMappingSuggestions(rows, ctx);

  return {
    rows,
    ...(scheduleMatches.length > 0 ? { scheduleMatches } : {}),
  };
}

/**
 * Detect schedule matches for import rows.
 */
async function detectScheduleMatches(
  rows: ImportRow[],
  ctx: EnrichmentContext
): Promise<ScheduleMatch[]> {
  // Fetch schedules with their date configuration
  const scheduleRows = await db
    .select()
    .from(scheduleTable)
    .leftJoin(scheduleDateTable, eq(scheduleTable.dateId, scheduleDateTable.id))
    .where(and(eq(scheduleTable.accountId, ctx.accountId), eq(scheduleTable.status, "active")));

  const existingSchedules: Schedule[] = scheduleRows.map((row) => ({
    ...row.schedules,
    scheduleDate: row.schedule_dates ?? undefined,
  }));

  if (existingSchedules.length === 0) return [];

  const existingPayees = await db
    .select()
    .from(payeeTable)
    .where(and(eq(payeeTable.workspaceId, ctx.workspaceId), isNull(payeeTable.deletedAt)));

  const scheduleMatcher = new ScheduleMatcher();
  const payeeMatcher = new PayeeMatcher();
  const matches: ScheduleMatch[] = [];

  for (const row of rows) {
    const normalized = row.normalizedData;

    if (!normalized["date"] || !normalized["amount"]) continue;

    // Normalize payee name for better matching
    let normalizedPayeeName = normalized["payee"];
    if (normalizedPayeeName && typeof normalizedPayeeName === "string") {
      const { name } = payeeMatcher.normalizePayeeName(normalizedPayeeName);
      normalizedPayeeName = name;
    }

    const criteria = {
      date: normalized["date"],
      amount: Math.abs(normalized["amount"] as number),
      payeeName: normalizedPayeeName,
      categoryId: normalized["categoryId"],
      accountId: ctx.accountId,
    };

    const match = scheduleMatcher.findBestMatch(criteria, existingSchedules, existingPayees);

    if (match.schedule && match.confidence !== "none") {
      matches.push({
        rowIndex: row.rowIndex,
        scheduleId: match.schedule.id,
        scheduleName: match.schedule.name,
        confidence: match.confidence,
        score: match.score,
        matchedOn: match.matchedOn,
        reasons: match.reasons,
        selected: match.confidence !== "low",
        transactionData: {
          date: normalized["date"],
          amount: normalized["amount"] as number,
          payee: normalized["payee"],
        },
        scheduleData: {
          name: match.schedule.name,
          amount: match.schedule.amount,
          amount_type: match.schedule.amount_type,
          recurring: match.schedule.recurring ?? false,
        },
      });
    }
  }

  return matches;
}

/**
 * Apply transfer mapping suggestions by prefetching all mappings and matching
 * in memory, avoiding N+1 queries.
 */
async function applyTransferMappingSuggestions(
  rows: ImportRow[],
  ctx: EnrichmentContext
): Promise<void> {
  const { getTransferMappingService } = await import("$core/server/domains/transfers");
  const transferMappingService = getTransferMappingService();

  // Get all accounts for name lookup (exclude current and closed)
  const allAccounts = await db
    .select({ id: accountsTable.id, name: accountsTable.name })
    .from(accountsTable)
    .where(
      and(
        eq(accountsTable.workspaceId, ctx.workspaceId),
        isNull(accountsTable.deletedAt),
        eq(accountsTable.closed, false)
      )
    );
  const accountMap = new Map(allAccounts.filter((a) => a.name).map((a) => [a.id, a.name as string]));

  // Prefetch all transfer mappings for in-memory matching
  const allMappings = await transferMappingService.getAllMappingsWithAccounts(ctx.workspaceId);

  for (const row of rows) {
    if (row.transferTargetMatch) continue;

    const payee = row.normalizedData["payee"] as string | undefined;
    if (!payee) continue;

    // In-memory matching using the same 3-tier logic as the repository
    const match = findTransferMappingMatch(payee, allMappings, ctx.accountId, accountMap);
    if (!match) continue;

    if (match.matchedOn === "exact") {
      row.normalizedData["transferAccountId"] = match.targetAccountId;
      row.normalizedData["transferAccountName"] = match.targetAccountName;
    } else {
      row.normalizedData["suggestedTransferAccountId"] = match.targetAccountId;
      row.normalizedData["suggestedTransferAccountName"] = match.targetAccountName;
      row.normalizedData["transferMappingConfidence"] =
        match.confidence >= 0.9 ? "high" : match.confidence >= 0.8 ? "medium" : "low";
    }
  }
}

interface TransferMappingMatchResult {
  targetAccountId: number;
  targetAccountName: string;
  confidence: number;
  matchedOn: "exact" | "normalized" | "cleaned";
}

function findTransferMappingMatch(
  rawPayeeString: string,
  allMappings: TransferMappingWithAccount[],
  currentAccountId: number,
  accountMap: Map<number, string>
): TransferMappingMatchResult | null {
  // Skip mappings pointing to current account
  const validMappings = allMappings.filter((m) => m.targetAccountId !== currentAccountId);

  // Tier 1: Exact raw string match (case-sensitive, matching SQL = behavior)
  const exactMatch = validMappings.find((m) => m.rawPayeeString === rawPayeeString);
  if (exactMatch) {
    const name = accountMap.get(exactMatch.targetAccountId);
    if (name) {
      return {
        targetAccountId: exactMatch.targetAccountId,
        targetAccountName: name,
        confidence: exactMatch.confidence,
        matchedOn: "exact",
      };
    }
    return null; // Account not found — don't fall through to weaker tiers
  }

  // Tier 2: Normalized string match (uses stored normalizedString when available)
  const inputNormalized = normalize(rawPayeeString);
  const normalizedMatch = validMappings.find((m) => {
    const stored = m.normalizedString ?? normalize(m.rawPayeeString);
    return stored === inputNormalized;
  });
  if (normalizedMatch) {
    const name = accountMap.get(normalizedMatch.targetAccountId);
    if (name) {
      return {
        targetAccountId: normalizedMatch.targetAccountId,
        targetAccountName: name,
        confidence: normalizedMatch.confidence * 0.9,
        matchedOn: "normalized",
      };
    }
    return null;
  }

  // Tier 3: Cleaned string match (strip amounts, IDs, dates — mirrors repository cleanString)
  const cleaned = cleanStringForFuzzyMatching(rawPayeeString);
  if (cleaned.length >= 3) {
    const cleanedMatch = validMappings
      .filter((m) => cleanStringForFuzzyMatching(m.rawPayeeString) === cleaned)
      .sort((a, b) => b.matchCount - a.matchCount)[0];
    if (cleanedMatch) {
      const name = accountMap.get(cleanedMatch.targetAccountId);
      if (name) {
        return {
          targetAccountId: cleanedMatch.targetAccountId,
          targetAccountName: name,
          confidence: cleanedMatch.confidence * 0.8,
          matchedOn: "cleaned",
        };
      }
    }
  }

  return null;
}

