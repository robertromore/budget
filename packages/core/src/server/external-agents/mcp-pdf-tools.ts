/**
 * PDF statement tools exposed over MCP.
 *
 *   extractStatement — agent uploads a base64 PDF, gets back the
 *     LLM-extracted header (institution, period, balances, etc.) and
 *     a list of transactions. Read-of-data-only; doesn't mutate.
 *   commitStatement — agent posts the transaction list (possibly
 *     edited) along with a target account (existing or new) and we
 *     persist them through the same ImportOrchestrator the in-app
 *     bulk-import flow uses.
 *
 * Same workflow as the in-app bulk-PDF flow at
 * apps/budget/src/routes/api/import/bulk/{extract,commit}/+server.ts,
 * just exposed under the MCP protocol so an external agent can drive
 * it. The actual extraction + commit happens through the existing
 * server-side helpers; this file is glue.
 */

import { accountTypeEnum, loanSubtypeEnum, accounts as accountTable } from "$core/schema/accounts";
import type {
  ExtractedStatementTx,
  PdfStatementExtractionResult,
} from "$core/server/import/parser-runtime/executors/pdf-statement-extraction";
import {
  runPdfStatementExtraction,
} from "$core/server/import/parser-runtime/executors/pdf-statement-extraction";
import { extractPdfTextFromBuffer } from "$core/server/domains/document-extraction/extractors/pdf-extractor";
import { ImportOrchestrator } from "$core/server/import/import-orchestrator";
import { db } from "$core/server/db";
import { loadWorkspaceLlmPreferences } from "$core/server/shared/workspace-llm-preferences";
import { serviceFactory } from "$core/server/shared/container/service-factory";
import { getCurrentTimestamp } from "$core/utils/dates-core";
import type { ImportRow } from "$core/types/import";
import { and, eq, isNull } from "drizzle-orm";

export interface ExtractStatementInput {
  fileName: string;
  /** Base64-encoded PDF bytes. ~25 MB raw cap upstream. */
  contentBase64: string;
}

export interface CommitStatementInput {
  target:
    | { kind: "existing"; accountId: number }
    | {
        kind: "new";
        newAccount: {
          name: string;
          accountType?: (typeof accountTypeEnum)[number];
          institution?: string | null;
          accountNumberLast4?: string | null;
          initialBalance?: number;
          loanSubtype?: (typeof loanSubtypeEnum)[number] | null;
          originalPrincipal?: number | null;
          maturityDate?: string | null;
        };
      };
  transactions: ExtractedStatementTx[];
  closingBalance?: number | null;
  statementPeriodEnd?: string | null;
}

export interface CommitStatementResult {
  accountId: number;
  accountName: string;
  accountCreated: boolean;
  transactionsCreated: number;
  duplicatesSkipped: number;
  errors: string[];
  reconciledBalanceSet: boolean;
}

export interface MCPPdfTool<TInput, TOutput> {
  name: string;
  description: string;
  scope: "read" | "write";
  inputSchema: Record<string, unknown>;
  execute: (input: TInput, workspaceId: number) => Promise<TOutput>;
}

export const extractStatementTool: MCPPdfTool<ExtractStatementInput, PdfStatementExtractionResult> = {
  name: "extractStatement",
  description:
    "Extract a bank or credit-card statement from a base64-encoded PDF. " +
    "Returns the statement header (institution, account, period, opening/closing balance) " +
    "and the list of transactions. Use this before commitStatement.",
  // Read-of-user-data only: doesn't mutate workspace, but does spend
  // LLM tokens. Treated as "read" so read-only keys can extract too;
  // commitStatement is the gatekeeper that requires read+write.
  scope: "read",
  inputSchema: {
    type: "object",
    properties: {
      fileName: { type: "string", description: "Original PDF filename, e.g. 'chase-2026-02.pdf'." },
      contentBase64: {
        type: "string",
        description: "Base64-encoded PDF bytes (no data: prefix).",
      },
    },
    required: ["fileName", "contentBase64"],
  },
  async execute(input, workspaceId) {
    if (!input.contentBase64) {
      throw new Error("contentBase64 is required.");
    }
    let buffer: Buffer;
    try {
      buffer = Buffer.from(input.contentBase64, "base64");
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unknown decode error";
      throw new Error(`Failed to decode contentBase64: ${message}`);
    }
    if (buffer.byteLength === 0) {
      throw new Error("Decoded PDF is empty.");
    }

    const { text, pageCount } = await extractPdfTextFromBuffer(buffer);
    if (!text || text.trim().length === 0) {
      return {
        header: emptyHeader(),
        transactions: [],
        chunkErrors: [],
        fatalError:
          "No extractable text in this PDF. Image-only / scanned statements aren't supported yet.",
      };
    }
    const pages = text.split(/\f/).map((p) => p.trim());

    const llmPreferences = await loadWorkspaceLlmPreferences(workspaceId);
    return runPdfStatementExtraction({
      text,
      pages: pages.length > 0 ? pages : [text],
      pageCount,
      fileName: input.fileName,
      llmPreferences,
    });
  },
};

export const commitStatementTool: MCPPdfTool<CommitStatementInput, CommitStatementResult> = {
  name: "commitStatement",
  description:
    "Persist a statement's transactions into a workspace account. " +
    "Target is either an existing accountId or a 'new' account draft. " +
    "Dedupes against existing transactions; sets a reconciled checkpoint when " +
    "closingBalance + statementPeriodEnd are supplied. Requires a read+write API key.",
  scope: "write",
  inputSchema: {
    type: "object",
    properties: {
      target: {
        type: "object",
        description:
          "Either { kind: 'existing', accountId } or { kind: 'new', newAccount: {...} }.",
      },
      transactions: {
        type: "array",
        items: {
          type: "object",
          properties: {
            date: { type: "string", description: "YYYY-MM-DD." },
            amount: {
              type: "number",
              description:
                "Signed amount. Negative = debit/charge/outflow; positive = credit/deposit.",
            },
            payee: { type: "string" },
            notes: { type: "string" },
            category: { type: "string" },
          },
          required: ["date", "amount", "payee"],
        },
      },
      closingBalance: {
        type: "number",
        description:
          "If supplied with statementPeriodEnd, sets a reconciled checkpoint on the account.",
      },
      statementPeriodEnd: {
        type: "string",
        description: "Statement period end in YYYY-MM-DD.",
      },
    },
    required: ["target", "transactions"],
  },
  async execute(input, workspaceId) {
    if (!input.target) throw new Error("target is required.");
    if (!Array.isArray(input.transactions)) {
      throw new Error("transactions must be an array.");
    }

    const willReconcile =
      input.closingBalance != null &&
      !!input.statementPeriodEnd &&
      /^\d{4}-\d{2}-\d{2}$/.test(input.statementPeriodEnd);

    const { accountId, accountName, created } = await resolveTargetAccount(
      input.target,
      workspaceId,
      willReconcile
    );

    const rows: ImportRow[] = input.transactions.map((tx, index) => ({
      rowIndex: index,
      rawData: { ...tx, source: "mcp-pdf-statement" },
      normalizedData: {
        date: tx.date,
        amount: tx.amount,
        payee: tx.payee,
        notes: tx.notes ?? "",
        ...(tx.category ? { category: tx.category } : {}),
      },
      originalPayee: tx.payee,
      validationStatus: "pending",
      sourceFileId: `mcp:${Date.now()}`,
      sourceFileName: "mcp-statement",
    }));

    const orchestrator = new ImportOrchestrator();
    const importResult = await orchestrator.processImport(accountId, rows, {
      skipDuplicates: true,
      createMissingPayees: true,
      createMissingCategories: false,
      fileName: "mcp-statement",
    });

    let reconciledBalanceSet = false;
    if (willReconcile) {
      await db
        .update(accountTable)
        .set({
          reconciledBalance: input.closingBalance!,
          reconciledDate: input.statementPeriodEnd!,
          updatedAt: getCurrentTimestamp(),
        })
        .where(
          and(
            eq(accountTable.id, accountId),
            eq(accountTable.workspaceId, workspaceId),
            isNull(accountTable.deletedAt)
          )
        );
      reconciledBalanceSet = true;
    }

    return {
      accountId,
      accountName,
      accountCreated: created,
      transactionsCreated: importResult.transactionsCreated,
      duplicatesSkipped: importResult.duplicatesDetected.length,
      errors: importResult.errors.map((e) => `Row ${e.row}: ${e.message}`),
      reconciledBalanceSet,
    };
  },
};

export const MCP_PDF_TOOLS = [extractStatementTool, commitStatementTool] as const;

// ---------------------------------------------------------------------
// Internals — narrower than the in-app commit endpoint because the
// agent only commits one file at a time and doesn't need the full
// new-account draft surface (loan/investment fields can be set later
// via tRPC). Keep this in sync with the equivalent helper in
// apps/budget/src/routes/api/import/bulk/commit/+server.ts.
// ---------------------------------------------------------------------

async function resolveTargetAccount(
  target: CommitStatementInput["target"],
  workspaceId: number,
  willReconcile: boolean
): Promise<{ accountId: number; accountName: string; created: boolean }> {
  if (target.kind === "existing") {
    const [account] = await db
      .select({ id: accountTable.id, name: accountTable.name })
      .from(accountTable)
      .where(
        and(
          eq(accountTable.id, target.accountId),
          eq(accountTable.workspaceId, workspaceId),
          isNull(accountTable.deletedAt)
        )
      )
      .limit(1);
    if (!account) {
      throw new Error(`Account ${target.accountId} not found in workspace.`);
    }
    return { accountId: account.id, accountName: account.name, created: false };
  }

  const draft = target.newAccount;
  if (!draft?.name || draft.name.trim().length < 2) {
    throw new Error("newAccount.name is required (min 2 chars).");
  }
  const accountService = serviceFactory.getAccountService();
  const created = await accountService.createAccount(
    {
      name: draft.name.trim(),
      accountType: draft.accountType ?? "checking",
      initialBalance: willReconcile ? 0 : (draft.initialBalance ?? 0),
    },
    workspaceId
  );

  // Mirror the in-app endpoint's follow-up: persist optional fields the
  // service doesn't take. Trim to the subset the MCP input exposes.
  const updates: Record<string, unknown> = {};
  if (draft.institution) updates.institution = draft.institution;
  if (draft.accountNumberLast4) updates.accountNumberLast4 = draft.accountNumberLast4;
  if (draft.accountType === "loan") {
    if (draft.loanSubtype) updates.loanSubtype = draft.loanSubtype;
    if (draft.originalPrincipal != null) updates.originalPrincipal = draft.originalPrincipal;
    if (draft.maturityDate) updates.maturityDate = draft.maturityDate;
  }
  if (Object.keys(updates).length > 0) {
    updates.updatedAt = getCurrentTimestamp();
    await db.update(accountTable).set(updates).where(eq(accountTable.id, created.id));
  }

  return { accountId: created.id, accountName: created.name, created: true };
}

function emptyHeader(): PdfStatementExtractionResult["header"] {
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
