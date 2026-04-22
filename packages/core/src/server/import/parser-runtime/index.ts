/**
 * Parser runtime — entry point that turns a raw extraction plus a
 * profile config into `ImportRow[]`. Phase 1 only wires the
 * `pdf-ai-schema` executor; `csv-column-map`, `csv-regex`, and
 * `pdf-text-regex` land in Phase 2 as additional executors under
 * `./executors/`.
 */

import { DEFAULT_LLM_PREFERENCES } from "$core/schema/workspaces";
import type { ImportRow } from "$core/types/import";
import { runPdfAiSchemaExtraction } from "./executors/pdf-ai-schema";
import type {
  ParserContext,
  PdfAiSchemaConfig,
  PdfExtraction,
  ProfileConfig,
} from "./types";

export type { ParserContext, PdfExtraction, ProfileConfig } from "./types";
export type {
  CsvRegexConfig,
  FormatType,
  PdfAiSchemaConfig,
  PdfTextRegexConfig,
} from "./types";

/**
 * Default config used when the caller has no saved profile for this
 * file. Plain AI extraction with sensible defaults — any field
 * customization happens inside the profile editor UI later.
 */
export const DEFAULT_PDF_AI_CONFIG: PdfAiSchemaConfig = {};

/**
 * Run a PDF extraction through the appropriate executor. Throws only
 * on programmer error (unknown formatType); execution failures are
 * encoded as invalid `ImportRow` entries by the executor itself.
 */
export async function runPdfExtraction(
  extraction: PdfExtraction,
  profile: ProfileConfig,
  ctx: ParserContext,
): Promise<ImportRow[]> {
  switch (profile.formatType) {
    case "pdf-ai-schema":
      return runPdfAiSchemaExtraction(
        extraction,
        profile.config,
        ctx,
        // Fall back to defaults so the executor's own
        // intelligence-disabled branch produces the right error
        // row rather than crashing on a missing object.
        ctx.llmPreferences ?? DEFAULT_LLM_PREFERENCES,
      );
    case "pdf-text-regex":
      throw new Error("pdf-text-regex executor not yet wired (Phase 2)");
    case "csv-column-map":
    case "csv-regex":
      throw new Error(
        `Config formatType "${profile.formatType}" is a CSV format; use the CSV processor path.`,
      );
    default: {
      // Exhaustiveness check — fires at compile time if someone adds
      // a new formatType and forgets to register its executor.
      const exhaustive: never = profile;
      throw new Error(`Unhandled profile formatType: ${JSON.stringify(exhaustive)}`);
    }
  }
}
