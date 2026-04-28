/**
 * Bulk-import commit endpoint.
 *
 * Accepts a confirmed plan from the bulk-import review screen and:
 *  1. Creates each approved new account.
 *  2. Runs the existing ImportOrchestrator per file against the
 *     resolved account.
 *  3. Sets a reconciled checkpoint when the statement carries a
 *     closing balance + period end date.
 *
 * Files are processed sequentially so we can surface per-file results
 * and so a failure in one file doesn't poison the others — the
 * orchestrator already wraps its inserts in a DB transaction, so a
 * mid-file crash rolls back just that file.
 */

import { accounts as accountTable, accountTypeEnum, loanSubtypeEnum } from "$core/schema/accounts";
import { db } from "$core/server/db";
import { ImportOrchestrator } from "$core/server/import/import-orchestrator";
import { serviceFactory } from "$core/server/shared/container/service-factory";
import { createContext } from "$core/trpc/context";
import type { ImportRow } from "$core/types/import";
import { fromSvelteKit } from "$lib/trpc/adapters/sveltekit";
import type { BulkCommitFileResult, BulkCommitResponse } from "$lib/types/bulk-import";
import { json } from "@sveltejs/kit";
import { and, eq, isNull } from "drizzle-orm";
import { getCurrentTimestamp } from "$core/utils/dates-core";
import { z } from "zod/v4";
import type { RequestHandler } from "./$types";

const newAccountSchema = z.object({
  name: z.string().min(2).max(50),
  accountType: z.enum(accountTypeEnum).default("checking"),
  institution: z.string().max(100).optional().nullable(),
  accountNumberLast4: z.string().min(1).max(32).optional().nullable(),
  initialBalance: z.number().optional(),
  notes: z.string().max(500).optional().nullable(),
  portalUrl: z.string().max(200).optional().nullable(),
  statementCycleDay: z.number().int().min(1).max(31).optional().nullable(),
  // Loan-specific (only persisted when accountType === 'loan').
  loanSubtype: z.enum(loanSubtypeEnum).optional().nullable(),
  originalPrincipal: z.number().positive().optional().nullable(),
  escrowBalance: z.number().min(0).optional().nullable(),
  maturityDate: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .optional()
    .nullable(),
  // Retirement-specific (only persisted when accountType === 'investment').
  vestedBalance: z.number().min(0).optional().nullable(),
});

const extractedTxSchema = z.object({
  date: z.string(),
  amount: z.number(),
  payee: z.string(),
  notes: z.string().optional(),
  category: z.string().optional(),
});

const filePlanSchema = z.discriminatedUnion("action", [
  z.object({
    fileId: z.string().min(1),
    fileName: z.string().min(1).max(500),
    action: z.literal("skip"),
  }),
  z.object({
    fileId: z.string().min(1),
    fileName: z.string().min(1).max(500),
    action: z.literal("import"),
    target: z.discriminatedUnion("kind", [
      z.object({ kind: z.literal("existing"), accountId: z.number().int().positive() }),
      z.object({ kind: z.literal("new"), newAccount: newAccountSchema }),
    ]),
    transactions: z.array(extractedTxSchema),
    closingBalance: z.number().nullable().optional(),
    statementPeriodEnd: z.string().nullable().optional(),
  }),
]);

const commitSchema = z.object({
  files: z.array(filePlanSchema).min(1).max(50),
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

  const parsed = commitSchema.safeParse(body);
  if (!parsed.success) {
    return json({ error: "Invalid commit plan", details: parsed.error.issues }, { status: 400 });
  }

  const accountService = serviceFactory.getAccountService();
  const orchestrator = new ImportOrchestrator();
  const results: BulkCommitFileResult[] = [];

  for (const file of parsed.data.files) {
    if (file.action === "skip") {
      results.push({
        fileId: file.fileId,
        fileName: file.fileName,
        action: "skipped",
        accountId: null,
        accountName: null,
        accountCreated: false,
        transactionsCreated: 0,
        duplicatesSkipped: 0,
        errors: [],
        reconciledBalanceSet: false,
      });
      continue;
    }

    try {
      // 1. Resolve target account (create if needed). Pass the
      //    "will reconcile" flag so the create path can skip the
      //    initial-balance transaction when the reconciled checkpoint
      //    is going to be the source of truth — otherwise the
      //    initial-balance txn (dated today) lands AFTER the
      //    reconciled date and gets double-counted.
      const willReconcile =
        file.closingBalance != null &&
        !!file.statementPeriodEnd &&
        /^\d{4}-\d{2}-\d{2}$/.test(file.statementPeriodEnd);
      const { accountId, accountName, created } = await resolveTargetAccount(
        file.target,
        ctx.workspaceId,
        willReconcile,
      );

      // 2. Build ImportRow[] from the extracted transactions.
      const rows: ImportRow[] = file.transactions.map((tx, index) => ({
        rowIndex: index,
        rawData: { ...tx, source: "bulk-pdf-statement" },
        normalizedData: {
          date: tx.date,
          amount: tx.amount,
          payee: tx.payee,
          notes: tx.notes ?? "",
          ...(tx.category ? { category: tx.category } : {}),
        },
        originalPayee: tx.payee,
        validationStatus: "pending",
        sourceFileId: file.fileId,
        sourceFileName: file.fileName,
      }));

      // 3. Run the existing orchestrator. Match-on-import is fine because
      //    the orchestrator's window-based dedup handles re-runs of the
      //    same statement, and `createMissingPayees` mirrors the per-account
      //    import flow's defaults.
      const importResult = await orchestrator.processImport(accountId, rows, {
        skipDuplicates: true,
        createMissingPayees: true,
        createMissingCategories: false,
        fileName: file.fileName,
      });

      const duplicatesSkipped = importResult.duplicatesDetected.length;
      const errorMessages = importResult.errors.map((e) => `Row ${e.row}: ${e.message}`);

      // 4. Set reconciled checkpoint when the statement gives us both
      //    a closing balance and a period end date. Mirrors the
      //    accountRoutes.setReconciledBalance write so the running
      //    balance after import matches what the statement says.
      let reconciledBalanceSet = false;
      if (
        file.closingBalance != null &&
        file.statementPeriodEnd &&
        /^\d{4}-\d{2}-\d{2}$/.test(file.statementPeriodEnd)
      ) {
        await db
          .update(accountTable)
          .set({
            reconciledBalance: file.closingBalance,
            reconciledDate: file.statementPeriodEnd,
            updatedAt: getCurrentTimestamp(),
          })
          .where(
            and(
              eq(accountTable.id, accountId),
              eq(accountTable.workspaceId, ctx.workspaceId),
              isNull(accountTable.deletedAt),
            ),
          );
        reconciledBalanceSet = true;
      }

      results.push({
        fileId: file.fileId,
        fileName: file.fileName,
        action: "imported",
        accountId,
        accountName,
        accountCreated: created,
        transactionsCreated: importResult.transactionsCreated,
        duplicatesSkipped,
        errors: errorMessages,
        reconciledBalanceSet,
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unknown commit error";
      console.error(`bulk-import: file "${file.fileName}" failed: ${message}`);
      results.push({
        fileId: file.fileId,
        fileName: file.fileName,
        action: "failed",
        accountId: null,
        accountName: null,
        accountCreated: false,
        transactionsCreated: 0,
        duplicatesSkipped: 0,
        errors: [message],
        reconciledBalanceSet: false,
      });
    }
  }

  const response: BulkCommitResponse = { results };
  return json(response);
};

/**
 * Resolve a file's target account, creating one if the user opted to
 * create a new account. Mirrors `accountRoutes.save`'s create flow:
 * `AccountService.createAccount` for the core insert + initial-balance
 * transaction, then a follow-up update to set fields the service
 * doesn't expose (institution, last4, accountType).
 *
 * `willReconcile` controls whether to seed an initial-balance
 * transaction. When the caller is going to apply a reconciled
 * checkpoint immediately after, we skip it — the reconciled balance
 * is the source of truth, and an initial-balance txn (which the
 * service dates "today") would land AFTER the reconciled date and
 * get added on top, double-counting the opening balance.
 */
async function resolveTargetAccount(
  target:
    | { kind: "existing"; accountId: number }
    | { kind: "new"; newAccount: z.infer<typeof newAccountSchema> },
  workspaceId: number,
  willReconcile: boolean,
): Promise<{ accountId: number; accountName: string; created: boolean }> {
  if (target.kind === "existing") {
    const [account] = await db
      .select({ id: accountTable.id, name: accountTable.name })
      .from(accountTable)
      .where(
        and(
          eq(accountTable.id, target.accountId),
          eq(accountTable.workspaceId, workspaceId),
          isNull(accountTable.deletedAt),
        ),
      )
      .limit(1);
    if (!account) {
      throw new Error(`Account ${target.accountId} not found in workspace`);
    }
    return { accountId: account.id, accountName: account.name, created: false };
  }

  const accountService = serviceFactory.getAccountService();
  const created = await accountService.createAccount(
    {
      name: target.newAccount.name,
      accountType: target.newAccount.accountType,
      initialBalance: willReconcile ? 0 : (target.newAccount.initialBalance ?? 0),
      ...(target.newAccount.notes ? { notes: target.newAccount.notes } : {}),
    },
    workspaceId,
  );

  // Follow-up update for fields the service doesn't expose. Matches
  // the pattern in `accountRoutes.save` (trpc/routes/accounts.ts).
  // Type-specific fields (loan/investment) only persist when the
  // accountType matches — mirrors the route logic so we don't end up
  // with a checking account carrying a maturityDate.
  const draft = target.newAccount;
  const updates: Record<string, unknown> = {};
  if (draft.institution) updates.institution = draft.institution;
  if (draft.accountNumberLast4) updates.accountNumberLast4 = draft.accountNumberLast4;
  if (draft.portalUrl) updates.portalUrl = draft.portalUrl;
  if (draft.statementCycleDay != null) updates.statementCycleDay = draft.statementCycleDay;
  if (draft.accountType === "loan") {
    if (draft.loanSubtype) updates.loanSubtype = draft.loanSubtype;
    if (draft.originalPrincipal != null) updates.originalPrincipal = draft.originalPrincipal;
    if (draft.escrowBalance != null) updates.escrowBalance = draft.escrowBalance;
    if (draft.maturityDate) updates.maturityDate = draft.maturityDate;
  }
  if (draft.accountType === "investment") {
    if (draft.vestedBalance != null) updates.vestedBalance = draft.vestedBalance;
    if (draft.maturityDate) updates.maturityDate = draft.maturityDate;
  }
  if (Object.keys(updates).length > 0) {
    updates.updatedAt = getCurrentTimestamp();
    await db
      .update(accountTable)
      .set(updates)
      .where(and(eq(accountTable.id, created.id), eq(accountTable.workspaceId, workspaceId)));
  }

  return { accountId: created.id, accountName: created.name, created: true };
}
