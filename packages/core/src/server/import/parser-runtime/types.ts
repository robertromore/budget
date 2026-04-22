/**
 * Parser runtime types. A "profile config" is a declarative JSON
 * recipe that turns a raw file extraction (CSV rows, PDF text) into
 * `ImportRow[]`. Each `formatType` is a distinct executor; configs
 * are Zod-validated at the profile boundary so the runtime can trust
 * whatever reaches it here.
 */

import type { ColumnMapping } from "$core/schema/import-profiles";
import type { LLMPreferences } from "$core/schema/workspaces";

/**
 * PDF raw extraction output — what `PdfProcessor` hands to an
 * executor. Carries the concatenated text, page count, and the
 * filename so regex rules can key off things like "which page" or
 * "filename-matches" without re-reading the PDF.
 */
export interface PdfExtraction {
  text: string;
  pageCount: number;
  fileName: string;
  /** Text split by form-feed (\f) — pdf-parse inserts these between pages. */
  pages: string[];
}

/**
 * Additional context an executor may consult. Kept minimal in Phase 1
 * — grows as more executors need workspace-scoped resources (payee
 * dictionary, currency, etc.).
 */
export interface ParserContext {
  fileName: string;
  /** Optional workspace id; executors that touch DB / provider settings need it. */
  workspaceId?: number;
  /**
   * Workspace LLM preferences for executors that need intelligence
   * (pdf-ai-schema). The upload route loads this from
   * `workspaces.preferences` and passes it through so the executor
   * stays a pure function of `(extraction, config, ctx)`.
   */
  llmPreferences?: LLMPreferences;
}

// ---- Config shapes ----

/**
 * Phase 2 — CSV with arbitrary pre-parse transforms (skip N header
 * rows, derived columns, custom delimiter). Shape is scaffolded here
 * so the discriminated union doesn't need a breaking change later.
 */
export interface CsvRegexConfig {
  skipRows?: number;
  headerRow?: number;
  delimiter?: string;
  columnMap: ColumnMapping;
  /** Simple derivations like `amount = inflow - outflow`. Phase 2. */
  derivations?: Array<{ target: string; expression: string }>;
}

/**
 * Phase 2 — deterministic PDF parsing using regex per line.
 */
export interface PdfTextRegexConfig {
  /** One rule per transaction shape. The first matching rule wins per line. */
  rules: Array<{
    lineRegex: string;
    dateGroup: number;
    descriptionGroup: number;
    amountGroup: number;
    /** Optional: pre-multiply the extracted amount (e.g. -1 for CC charges). */
    amountSign?: "negate" | "positive";
    /** Optional: only apply on specific pages (0-indexed). */
    pageFilter?: number[];
  }>;
  /** Lines matching any of these patterns are skipped (e.g. running-balance footers). */
  skipIfMatches?: string[];
}

/**
 * Phase 1 — LLM extraction. The profile can override the prompt or
 * pin a provider, but both have sane defaults so an unconfigured
 * PDF import still works end-to-end.
 */
export interface PdfAiSchemaConfig {
  /** Optional prompt override — injected after the base instructions. */
  promptSuffix?: string;
  /** Optional hint for statement currency; helps when the PDF is ambiguous. */
  currency?: string;
  /**
   * Max characters of PDF text to submit in a single LLM call. Beyond
   * this the extractor will call once per page (chunked). 80k leaves
   * comfortable headroom under typical 128k-token context windows.
   */
  maxCharsPerCall?: number;
}

export type ProfileConfig =
  | { formatType: "csv-column-map"; config: ColumnMapping }
  | { formatType: "csv-regex"; config: CsvRegexConfig }
  | { formatType: "pdf-text-regex"; config: PdfTextRegexConfig }
  | { formatType: "pdf-ai-schema"; config: PdfAiSchemaConfig };

export type FormatType = ProfileConfig["formatType"];
