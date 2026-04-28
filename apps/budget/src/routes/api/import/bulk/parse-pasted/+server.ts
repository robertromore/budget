/**
 * Bulk-import paste-parse endpoint (BYOA mode).
 *
 * Accepts a single user-pasted JSON blob from an external AI (Claude
 * Desktop, Claude.ai, ChatGPT, etc.), validates it against the same
 * Zod schema the in-process LLM call is held to, runs the matcher
 * against existing accounts, and returns the same `BulkExtractResponse`
 * shape the streaming /extract endpoint emits. The wizard stitches it
 * into `state.files` identically — review and commit don't care which
 * source produced the file.
 *
 * Synchronous (no SSE) because there's no work to stream — JSON parse
 * + matcher takes milliseconds.
 */

import { accounts as accountTable } from "$core/schema/accounts";
import { db } from "$core/server/db";
import { matchAccountFromStatement } from "$core/server/import/matchers/account-matcher";
import { parsePastedStatementResult } from "$core/server/import/parser-runtime/executors/pdf-statement-paste-parser";
import { createContext } from "$core/trpc/context";
import { fromSvelteKit } from "$lib/trpc/adapters/sveltekit";
import type { BulkExtractResponse } from "$lib/types/bulk-import";
import { json } from "@sveltejs/kit";
import { and, eq, isNull } from "drizzle-orm";
import { z } from "zod";
import type { RequestHandler } from "./$types";

const requestSchema = z.object({
  fileName: z.string().min(1).max(200),
  raw: z.string().min(1).max(2_000_000), // ~2 MB cap on a paste
});

export const POST: RequestHandler = async (event) => {
  const ctx = await createContext(fromSvelteKit(event));

  if (!ctx.userId || !ctx.workspaceId) {
    return json({ error: "Authentication required" }, { status: 401 });
  }

  let body: unknown;
  try {
    body = await event.request.json();
  } catch {
    return json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const parsedBody = requestSchema.safeParse(body);
  if (!parsedBody.success) {
    return json({ error: "Invalid request body" }, { status: 400 });
  }

  const { fileName, raw } = parsedBody.data;
  const fileSize = new TextEncoder().encode(raw).length;

  const parsed = parsePastedStatementResult(raw);

  if (!parsed.ok) {
    // Failure is surfaced as a normal BulkExtractResponse with a
    // fatalError, matching how the /extract endpoint reports failures.
    // The wizard already knows how to render fatalError.
    const failureResponse: BulkExtractResponse = {
      fileName,
      fileSize,
      header: emptyHeader(),
      transactions: [],
      match: {
        confidence: "none",
        accountId: null,
        accountName: null,
        reason: "Paste failed to parse",
      },
      chunkErrors: [],
      fatalError: parsed.error,
    };
    return json(failureResponse);
  }

  const candidates = await db
    .select({
      id: accountTable.id,
      name: accountTable.name,
      institution: accountTable.institution,
      accountNumberLast4: accountTable.accountNumberLast4,
      accountType: accountTable.accountType,
      closed: accountTable.closed,
    })
    .from(accountTable)
    .where(and(eq(accountTable.workspaceId, ctx.workspaceId), isNull(accountTable.deletedAt)));

  const match = matchAccountFromStatement(parsed.result.header, candidates);

  const response: BulkExtractResponse = {
    fileName,
    fileSize,
    header: parsed.result.header,
    transactions: parsed.result.transactions,
    match: {
      confidence: match.confidence,
      accountId: match.account?.id ?? null,
      accountName: match.account?.name ?? null,
      reason: match.reason,
    },
    chunkErrors: [],
  };
  return json(response);
};

function emptyHeader(): BulkExtractResponse["header"] {
  return {
    institution: null,
    accountNumberLast4: null,
    accountType: null,
    accountName: null,
    statementPeriodStart: null,
    statementPeriodEnd: null,
    openingBalance: null,
    closingBalance: null,
    currency: null,
    portalUrl: null,
    statementCycleDay: null,
    loanSubtype: null,
    originalPrincipal: null,
    escrowBalance: null,
    maturityDate: null,
    vestedBalance: null,
  };
}
