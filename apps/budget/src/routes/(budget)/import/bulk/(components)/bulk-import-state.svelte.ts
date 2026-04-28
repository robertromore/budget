/**
 * Bulk-import wizard state.
 *
 * One BulkFile per dropped PDF. Each tracks its own extraction
 * lifecycle (pending → extracting → ready | failed) and the user's
 * final decision before commit (action: import | skip; target:
 * existing account or new-account form).
 *
 * The state machine is intentionally per-file rather than per-step so
 * the user can drop more files at any time and the review screen can
 * show partial progress while extraction runs in the background.
 */

import { ACCOUNT_TYPE_LABELS, type AccountType, type LoanSubtype } from "$core/schema/accounts";
import type {
  ExtractedStatementTx,
  StatementHeader,
} from "$core/server/import/parser-runtime/executors/pdf-statement-extraction";
import { accountKeys, cachePatterns } from "$lib/query";
import type { BulkExtractResponse } from "$lib/types/bulk-import";
import type { BulkCommitFileResult, BulkCommitResponse } from "$lib/types/bulk-import";

/** Mirrors the SSE event shape emitted by /api/import/bulk/extract. */
type ProgressEvent =
  | { type: "phase"; label: string }
  | { type: "describe"; text: string }
  | { type: "complete"; payload: BulkExtractResponse };

export type BulkFileStatus = "pending" | "extracting" | "ready" | "failed";

export type BulkFileTargetKind = "existing" | "new" | "skip";

export interface NewAccountDraft {
  name: string;
  accountType: AccountType;
  institution: string | null;
  accountNumberLast4: string | null;
  initialBalance: number;
  portalUrl: string | null;
  statementCycleDay: number | null;
  // Loan-specific (only sent when accountType === 'loan').
  loanSubtype: LoanSubtype | null;
  originalPrincipal: number | null;
  escrowBalance: number | null;
  maturityDate: string | null; // YYYY-MM-DD
  // Retirement-specific (only sent when accountType === 'investment').
  vestedBalance: number | null;
}

/**
 * Where this BulkFile came from. Drives a small UI badge and lets
 * `extractFile` skip files that don't have a backing PDF to upload.
 */
export type BulkFileSource = "extracted" | "pasted";

export interface BulkFile {
  id: string;
  /** Backing File for "extracted" sources (PDFs uploaded for AI extraction). Null for "pasted" — the JSON is already canonical. */
  file: File | null;
  fileName: string;
  fileSize: number;
  source: BulkFileSource;
  status: BulkFileStatus;
  /**
   * Current activity narration. Populated from SSE phase events
   * during extraction (e.g. "Reading the PDF…") and replaced by the
   * AI's "describe" sentence ("Looks like a Chase Prime Visa…")
   * when that returns. Cleared once status reaches "ready" / "failed".
   */
  phaseLabel: string | null;
  /**
   * AI's one-sentence "what is this document" summary, persisted past
   * the extraction phase so the review screen can explain *why* a
   * file was auto-skipped (e.g. "Looks like a Schwab portfolio
   * performance summary"). Null if the describe call didn't run or
   * came back empty.
   */
  aiSummary: string | null;
  /** Per-file error blocking review (e.g. extraction crashed). */
  fatalError: string | null;
  /** Non-fatal extraction warnings shown alongside the file. */
  chunkErrors: string[];
  header: StatementHeader | null;
  transactions: ExtractedStatementTx[];
  /** AI's matched account proposal — drives the default for `targetKind`. */
  match: {
    confidence: "exact" | "high" | "medium" | "none";
    accountId: number | null;
    accountName: string | null;
    reason: string;
  } | null;
  /** User's final decision for commit. */
  targetKind: BulkFileTargetKind;
  /** Selected existing account when `targetKind === "existing"`. */
  existingAccountId: number | null;
  /** Editable draft when `targetKind === "new"`. */
  newAccountDraft: NewAccountDraft;
  /** User can opt out of the closing-balance reconcile per file. */
  applyReconciledBalance: boolean;
  /** Populated after commit. */
  result: BulkCommitFileResult | null;
}

export type GlobalStep = "upload" | "review" | "committing" | "complete";

function defaultNewAccountDraft(): NewAccountDraft {
  return {
    name: "",
    accountType: "checking",
    institution: null,
    accountNumberLast4: null,
    initialBalance: 0,
    portalUrl: null,
    statementCycleDay: null,
    loanSubtype: null,
    originalPrincipal: null,
    escrowBalance: null,
    maturityDate: null,
    vestedBalance: null,
  };
}

function applyExtractionToDraft(header: StatementHeader): NewAccountDraft {
  // Pre-fill the new-account form with whatever the LLM gave us.
  // Falls back to a derived name when neither accountName nor
  // institution are present so the form has a non-empty default.
  const name =
    header.accountName?.trim() ||
    [header.institution?.trim(), header.accountType ? ACCOUNT_TYPE_LABELS[header.accountType] : null]
      .filter(Boolean)
      .join(" ") ||
    "New account";
  return {
    name: name.slice(0, 50),
    accountType: header.accountType ?? "checking",
    institution: header.institution?.trim() || null,
    accountNumberLast4: header.accountNumberLast4 || null,
    initialBalance: header.openingBalance ?? 0,
    portalUrl: header.portalUrl?.trim() || null,
    statementCycleDay: header.statementCycleDay ?? null,
    loanSubtype: header.loanSubtype ?? null,
    originalPrincipal: header.originalPrincipal ?? null,
    escrowBalance: header.escrowBalance ?? null,
    maturityDate: header.maturityDate ?? null,
    vestedBalance: header.vestedBalance ?? null,
  };
}

export function createBulkImportState() {
  let step = $state<GlobalStep>("upload");
  let files = $state<BulkFile[]>([]);
  let isCommitting = $state(false);
  let commitError = $state<string | null>(null);

  const totalFiles = $derived(files.length);
  const readyFiles = $derived(files.filter((f) => f.status === "ready"));
  const extractingCount = $derived(files.filter((f) => f.status === "extracting").length);
  const failedCount = $derived(files.filter((f) => f.status === "failed").length);
  const importableFiles = $derived(
    readyFiles.filter((f) => f.targetKind !== "skip" && hasResolvableTarget(f)),
  );
  const totalTransactionsToImport = $derived(
    importableFiles.reduce((sum, f) => sum + f.transactions.length, 0),
  );

  function addFiles(newFiles: File[]) {
    const additions: BulkFile[] = newFiles.map((file) => ({
      id: `${file.name}-${file.size}-${file.lastModified}-${crypto.randomUUID()}`,
      file,
      fileName: file.name,
      fileSize: file.size,
      source: "extracted",
      status: "pending",
      phaseLabel: null,
      aiSummary: null,
      fatalError: null,
      chunkErrors: [],
      header: null,
      transactions: [],
      match: null,
      targetKind: "skip",
      existingAccountId: null,
      newAccountDraft: defaultNewAccountDraft(),
      applyReconciledBalance: true,
      result: null,
    }));
    files = [...files, ...additions];
    // Kick off extraction in parallel — each file runs its own request.
    for (const bf of additions) {
      void extractFile(bf.id);
    }
  }

  /**
   * Add a file via the BYOA paste path. Sends the raw paste to the
   * parse-pasted endpoint, validates server-side, runs the matcher,
   * and stitches the result into `files` as a ready-to-review BulkFile.
   * Skips the extracting lifecycle entirely — the JSON is already
   * canonical.
   */
  async function addPastedFile(
    fileName: string,
    raw: string,
  ): Promise<{ ok: true } | { ok: false; error: string }> {
    const trimmedName = fileName.trim() || "Pasted statement";

    let response: Response;
    try {
      response = await fetch("/api/import/bulk/parse-pasted", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ fileName: trimmedName, raw }),
      });
    } catch (error) {
      return {
        ok: false,
        error: error instanceof Error ? error.message : "Network error",
      };
    }

    if (!response.ok) {
      const errBody = await response.json().catch(() => ({}));
      return {
        ok: false,
        error: (errBody as { error?: string }).error || `Request failed (${response.status})`,
      };
    }

    const data = (await response.json()) as BulkExtractResponse;

    // Parser-level failures come back as a normal payload with a
    // fatalError so the wizard's existing failure handling could
    // render them — but for the paste form, the user wants an inline
    // error, not a "failed file" entry. Surface fatalError directly.
    if (data.fatalError) {
      return { ok: false, error: data.fatalError };
    }

    const targetKind: BulkFileTargetKind =
      data.transactions.length === 0
        ? "skip"
        : data.match.confidence === "exact" ||
            data.match.confidence === "high" ||
            data.match.confidence === "medium"
          ? "existing"
          : "new";

    const newFile: BulkFile = {
      id: `paste-${Date.now()}-${crypto.randomUUID()}`,
      file: null,
      fileName: trimmedName,
      fileSize: data.fileSize,
      source: "pasted",
      status: "ready",
      phaseLabel: null,
      aiSummary: null,
      fatalError: null,
      chunkErrors: data.chunkErrors,
      header: data.header,
      transactions: data.transactions,
      match: data.match,
      targetKind,
      existingAccountId: data.match.accountId,
      newAccountDraft: applyExtractionToDraft(data.header),
      applyReconciledBalance:
        data.header.closingBalance != null && !!data.header.statementPeriodEnd,
      result: null,
    };

    files = [...files, newFile];
    return { ok: true };
  }

  function removeFile(fileId: string) {
    files = files.filter((f) => f.id !== fileId);
  }

  function updateFile(fileId: string, patch: Partial<BulkFile>) {
    files = files.map((f) => (f.id === fileId ? { ...f, ...patch } : f));
  }

  function updateNewAccountDraft(fileId: string, patch: Partial<NewAccountDraft>) {
    files = files.map((f) =>
      f.id === fileId ? { ...f, newAccountDraft: { ...f.newAccountDraft, ...patch } } : f,
    );
  }

  async function extractFile(fileId: string) {
    const target = files.find((f) => f.id === fileId);
    if (!target) return;
    if (!target.file) {
      // Pasted files don't have a backing PDF — nothing to extract.
      // The wizard shouldn't reach this branch but be defensive.
      updateFile(fileId, {
        status: "failed",
        phaseLabel: null,
        fatalError: "No PDF attached to this file",
      });
      return;
    }
    updateFile(fileId, { status: "extracting", phaseLabel: "Uploading…" });

    const formData = new FormData();
    formData.set("file", target.file);

    try {
      const response = await fetch("/api/import/bulk/extract", {
        method: "POST",
        body: formData,
      });

      if (!response.ok || !response.body) {
        const errBody = await response.json().catch(() => ({}));
        updateFile(fileId, {
          status: "failed",
          phaseLabel: null,
          fatalError:
            (errBody as { error?: string }).error || `Extraction failed (${response.status})`,
        });
        return;
      }

      // SSE stream: phase events update the spinner narration; the
      // describe event is the AI's "what is this" sentence; complete
      // carries the final BulkExtractResponse.
      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";
      let finalPayload: BulkExtractResponse | null = null;

      while (true) {
        const { value, done } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });

        const blocks = buffer.split("\n\n");
        buffer = blocks.pop() ?? "";
        for (const block of blocks) {
          const line = block.split("\n").find((l) => l.startsWith("data: "));
          if (!line) continue;
          let event: ProgressEvent;
          try {
            event = JSON.parse(line.slice(6)) as ProgressEvent;
          } catch {
            continue;
          }
          if (event.type === "phase") {
            updateFile(fileId, { phaseLabel: event.label });
          } else if (event.type === "describe") {
            updateFile(fileId, { phaseLabel: event.text, aiSummary: event.text });
          } else if (event.type === "complete") {
            finalPayload = event.payload;
          }
        }
      }

      if (!finalPayload) {
        updateFile(fileId, {
          status: "failed",
          phaseLabel: null,
          fatalError: "Stream ended without a result",
        });
        return;
      }

      const data = finalPayload;

      if (data.fatalError) {
        updateFile(fileId, {
          status: "failed",
          phaseLabel: null,
          fatalError: data.fatalError,
          header: data.header,
        });
        return;
      }

      // Default the user's decision based on the matcher's verdict.
      // High-confidence matches still surface in the review screen
      // so the user always sees what's about to happen.
      //
      // Special-case: if the extractor returned zero transactions the
      // file is almost certainly a holdings / portfolio-performance
      // summary rather than a transaction-bearing statement. Default
      // to "skip" so the user has to opt in to applying it; the review
      // card surfaces the AI's describe sentence so they understand
      // why.
      const hasTransactions = data.transactions.length > 0;
      const targetKind: BulkFileTargetKind = !hasTransactions
        ? "skip"
        : data.match.confidence === "exact" ||
            data.match.confidence === "high" ||
            data.match.confidence === "medium"
          ? "existing"
          : "new";

      updateFile(fileId, {
        status: "ready",
        phaseLabel: null,
        header: data.header,
        transactions: data.transactions,
        chunkErrors: data.chunkErrors,
        match: data.match,
        targetKind,
        existingAccountId: data.match.accountId,
        newAccountDraft: applyExtractionToDraft(data.header),
        applyReconciledBalance:
          data.header.closingBalance != null && !!data.header.statementPeriodEnd,
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : "Network error";
      updateFile(fileId, { status: "failed", phaseLabel: null, fatalError: message });
    }
  }

  function retryFile(fileId: string) {
    updateFile(fileId, {
      status: "pending",
      phaseLabel: null,
      aiSummary: null,
      fatalError: null,
      chunkErrors: [],
      header: null,
      transactions: [],
      match: null,
      result: null,
    });
    void extractFile(fileId);
  }

  function goToReview() {
    step = "review";
  }

  function goToUpload() {
    step = "upload";
  }

  async function commit(): Promise<BulkCommitResponse | null> {
    if (importableFiles.length === 0) return null;

    isCommitting = true;
    commitError = null;
    step = "committing";

    const plan = {
      files: importableFiles.map((f) => ({
        fileId: f.id,
        fileName: f.fileName,
        action: "import" as const,
        target:
          f.targetKind === "existing" && f.existingAccountId
            ? { kind: "existing" as const, accountId: f.existingAccountId }
            : {
                kind: "new" as const,
                newAccount: {
                  name: f.newAccountDraft.name.trim(),
                  accountType: f.newAccountDraft.accountType,
                  institution: f.newAccountDraft.institution?.trim() || null,
                  accountNumberLast4: f.newAccountDraft.accountNumberLast4?.trim() || null,
                  initialBalance: f.newAccountDraft.initialBalance,
                  portalUrl: f.newAccountDraft.portalUrl,
                  statementCycleDay: f.newAccountDraft.statementCycleDay,
                  loanSubtype: f.newAccountDraft.loanSubtype,
                  originalPrincipal: f.newAccountDraft.originalPrincipal,
                  escrowBalance: f.newAccountDraft.escrowBalance,
                  maturityDate: f.newAccountDraft.maturityDate,
                  vestedBalance: f.newAccountDraft.vestedBalance,
                },
              },
        transactions: f.transactions,
        closingBalance: f.applyReconciledBalance ? f.header?.closingBalance ?? null : null,
        statementPeriodEnd: f.applyReconciledBalance ? f.header?.statementPeriodEnd ?? null : null,
      })),
    };

    try {
      const response = await fetch("/api/import/bulk/commit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(plan),
      });
      if (!response.ok) {
        const errBody = await response.json().catch(() => ({}));
        commitError = (errBody as { error?: string }).error || `Commit failed (${response.status})`;
        step = "review";
        return null;
      }
      const data = (await response.json()) as BulkCommitResponse;
      const byId = new Map(data.results.map((r) => [r.fileId, r]));
      files = files.map((f) => {
        const r = byId.get(f.id);
        return r ? { ...f, result: r } : f;
      });
      step = "complete";

      // Refresh caches so the sidebar / accounts page / transaction
      // lists pick up the newly created accounts and freshly imported
      // rows. This bypasses tRPC's automatic invalidation since the
      // commit goes through a SvelteKit endpoint. The root +layout
      // re-inits AccountsState whenever accountsQuery.data changes,
      // so invalidating the list is enough to refresh the sidebar.
      const importedAny = data.results.some((r) => r.action === "imported");
      if (importedAny) {
        cachePatterns.invalidatePrefix(accountKeys.all());
        cachePatterns.invalidatePrefix(["transactions"]);
        cachePatterns.invalidatePrefix(["payees"]);
        cachePatterns.invalidatePrefix(["categories"]);
      }

      return data;
    } catch (error) {
      commitError = error instanceof Error ? error.message : "Network error";
      step = "review";
      return null;
    } finally {
      isCommitting = false;
    }
  }

  function reset() {
    files = [];
    step = "upload";
    commitError = null;
    isCommitting = false;
  }

  return {
    get step() {
      return step;
    },
    get files() {
      return files;
    },
    get isCommitting() {
      return isCommitting;
    },
    get commitError() {
      return commitError;
    },
    get totalFiles() {
      return totalFiles;
    },
    get readyFiles() {
      return readyFiles;
    },
    get extractingCount() {
      return extractingCount;
    },
    get failedCount() {
      return failedCount;
    },
    get importableFiles() {
      return importableFiles;
    },
    get totalTransactionsToImport() {
      return totalTransactionsToImport;
    },
    addFiles,
    addPastedFile,
    removeFile,
    updateFile,
    updateNewAccountDraft,
    retryFile,
    goToReview,
    goToUpload,
    commit,
    reset,
  };
}

export type BulkImportState = ReturnType<typeof createBulkImportState>;

function hasResolvableTarget(file: BulkFile): boolean {
  if (file.targetKind === "existing") {
    return file.existingAccountId != null;
  }
  if (file.targetKind === "new") {
    return file.newAccountDraft.name.trim().length >= 2;
  }
  return false;
}
