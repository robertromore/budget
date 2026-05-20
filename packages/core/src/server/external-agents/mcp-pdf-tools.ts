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
import { transactions as transactionTable } from "$core/schema/transactions";
import { categories as categoryTable } from "$core/schema/categories";
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
import { roundToCents } from "$core/utils/math-utilities";
import type { ImportRow } from "$core/types/import";
import { and, eq, isNull, inArray } from "drizzle-orm";

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
  /**
   * "insert" (default) — append new rows, skip any (date+amount) match against
   * existing transactions.
   * "upsert" — append new rows AND update existing rows that match by
   * (date+amount). Used for re-uploading a corrected statement or enriching
   * thin transactions with payee/category data the agent has figured out.
   * Match key is strict (same account, same date, same amount within $0.01).
   * If amount or date drifted between uploads, the row will be treated as
   * new — use the explicit updateTransaction tool for those cases.
   */
  strategy?: "insert" | "upsert";
}

export interface CommitStatementResult {
  accountId: number;
  accountName: string;
  accountCreated: boolean;
  transactionsCreated: number;
  /** Rows that matched existing transactions and were updated. Only set for strategy=upsert. */
  transactionsUpdated: number;
  /** Rows that matched existing transactions and didn't need changes. Only set for strategy=upsert. */
  unchangedSkipped: number;
  /** For strategy=insert: rows that matched existing transactions and were not posted. */
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
    "Strategy 'insert' (default) inserts new rows and skips date+amount duplicates. " +
    "Strategy 'upsert' also updates payee/category/notes on existing matched rows " +
    "(useful when re-uploading a corrected statement or enriching bare transactions). " +
    "Match key is (account, date, amount within $0.01); rows whose amount or date " +
    "drifted between uploads count as new — use the updateTransaction tool for those. " +
    "Sets a reconciled checkpoint when closingBalance + statementPeriodEnd are supplied. " +
    "Requires a read+write API key.",
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
      strategy: {
        type: "string",
        enum: ["insert", "upsert"],
        description:
          "How to handle rows that match existing transactions by (date, amount). 'insert' (default) skips them. 'upsert' updates payee/category/notes on the existing row.",
      },
    },
    required: ["target", "transactions"],
  },
  async execute(input, workspaceId) {
    if (!input.target) throw new Error("target is required.");
    if (!Array.isArray(input.transactions)) {
      throw new Error("transactions must be an array.");
    }

    const strategy = input.strategy ?? "insert";
    const willReconcile =
      input.closingBalance != null &&
      !!input.statementPeriodEnd &&
      /^\d{4}-\d{2}-\d{2}$/.test(input.statementPeriodEnd);

    const { accountId, accountName, created } = await resolveTargetAccount(
      input.target,
      workspaceId,
      willReconcile
    );

    // Partition input into "needs insert" vs "matches existing" when upserting.
    let rowsForOrchestrator: ExtractedStatementTx[] = input.transactions;
    let updatePairs: Array<{
      input: ExtractedStatementTx;
      existing: { id: number; payeeId: number | null; categoryId: number | null; notes: string | null };
    }> = [];

    if (strategy === "upsert" && input.transactions.length > 0) {
      const dates = Array.from(new Set(input.transactions.map((t) => t.date)));
      const existingRows = await db
        .select({
          id: transactionTable.id,
          date: transactionTable.date,
          amount: transactionTable.amount,
          payeeId: transactionTable.payeeId,
          categoryId: transactionTable.categoryId,
          notes: transactionTable.notes,
        })
        .from(transactionTable)
        .where(
          and(
            eq(transactionTable.accountId, accountId),
            inArray(transactionTable.date, dates),
            isNull(transactionTable.deletedAt)
          )
        );
      const keyOf = (date: string, amount: number) => `${date}|${roundToCents(amount).toFixed(2)}`;
      const existingByKey = new Map<string, (typeof existingRows)[number]>();
      for (const row of existingRows) {
        existingByKey.set(keyOf(row.date, row.amount), row);
      }

      const toInsert: ExtractedStatementTx[] = [];
      for (const tx of input.transactions) {
        const match = existingByKey.get(keyOf(tx.date, tx.amount));
        if (match) updatePairs.push({ input: tx, existing: match });
        else toInsert.push(tx);
      }
      rowsForOrchestrator = toInsert;
    }

    // Orchestrator handles the "new rows" part of both strategies. For insert,
    // it sees all rows + skipDuplicates; for upsert, it sees only the unmatched
    // rows so the per-row payee creation runs on inserts only.
    const importRows: ImportRow[] = rowsForOrchestrator.map((tx, index) => ({
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
    const importResult =
      importRows.length > 0
        ? await orchestrator.processImport(accountId, importRows, {
            skipDuplicates: true,
            createMissingPayees: true,
            createMissingCategories: false,
            fileName: "mcp-statement",
          })
        : { transactionsCreated: 0, duplicatesDetected: [] as unknown[], errors: [] as Array<{ row: number; message: string }> };

    // Apply the update half of upsert. We don't reach into the orchestrator
    // for this — we resolve payee/category by name here and call the
    // TransactionService directly so the existing service-level validation
    // and budget recalculation runs.
    let transactionsUpdated = 0;
    let unchangedSkipped = 0;
    const upsertErrors: string[] = [];

    if (updatePairs.length > 0) {
      const payeeService = serviceFactory.getPayeeService();
      const transactionService = serviceFactory.getTransactionService();

      // Pre-resolve all category names in one query so we don't loop with DB hits.
      const wantedCategories = Array.from(
        new Set(updatePairs.map((p) => p.input.category).filter((c): c is string => !!c))
      );
      const categoryRows =
        wantedCategories.length > 0
          ? await db
              .select({ id: categoryTable.id, name: categoryTable.name })
              .from(categoryTable)
              .where(
                and(
                  eq(categoryTable.workspaceId, workspaceId),
                  inArray(categoryTable.name, wantedCategories),
                  isNull(categoryTable.deletedAt)
                )
              )
          : [];
      const categoryByName = new Map<string, number>();
      for (const c of categoryRows) {
        if (c.name) categoryByName.set(c.name.toLowerCase(), c.id);
      }

      for (const { input: tx, existing } of updatePairs) {
        try {
          // Resolve payee: look up by name; create if missing (mirrors orchestrator behavior).
          let payeeId: number | null = existing.payeeId;
          if (tx.payee) {
            const trimmed = tx.payee.trim();
            const payeeRepo = (payeeService as unknown as { repository: { findByName(name: string, workspaceId: number): Promise<{ id: number } | null> } }).repository;
            const existingPayee = await payeeRepo.findByName(trimmed, workspaceId);
            if (existingPayee) {
              payeeId = existingPayee.id;
            } else {
              const created = await payeeService.createPayee({ name: trimmed }, workspaceId);
              payeeId = created.id;
            }
          }

          // Resolve category by exact name (case-insensitive). Don't auto-create.
          let categoryId: number | null = existing.categoryId;
          if (tx.category) {
            const resolved = categoryByName.get(tx.category.toLowerCase());
            if (resolved !== undefined) categoryId = resolved;
          }

          const updates: {
            payeeId?: number | null;
            categoryId?: number | null;
            notes?: string | null;
          } = {};
          if (payeeId !== existing.payeeId) updates.payeeId = payeeId;
          if (categoryId !== existing.categoryId) updates.categoryId = categoryId;
          const incomingNotes = tx.notes?.trim() || null;
          if (incomingNotes !== null && incomingNotes !== existing.notes) {
            updates.notes = incomingNotes;
          }

          if (Object.keys(updates).length === 0) {
            unchangedSkipped++;
            continue;
          }

          await transactionService.updateTransaction(existing.id, updates, workspaceId);
          transactionsUpdated++;
        } catch (error) {
          upsertErrors.push(
            `Update on transaction ${existing.id} failed: ${
              error instanceof Error ? error.message : "Unknown error"
            }`
          );
        }
      }
    }

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
      transactionsUpdated,
      unchangedSkipped,
      duplicatesSkipped:
        strategy === "insert" ? importResult.duplicatesDetected.length : 0,
      errors: [
        ...importResult.errors.map((e) => `Row ${e.row}: ${e.message}`),
        ...upsertErrors,
      ],
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
