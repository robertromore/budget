/**
 * `pdf-ai-schema` executor.
 *
 * Turns the raw text extraction from a PDF into `ImportRow[]` by
 * asking an LLM (via the workspace-scoped provider system) to return
 * a structured array of transactions against a Zod schema.
 *
 * Runs through the same intelligence plumbing the rest of the app
 * uses: `getProviderForFeature(preferences, "statementExtraction")`.
 * That means the workspace's master AI toggle, per-feature mode,
 * per-feature provider override, and encrypted API keys are all
 * honored. No env-var fallback — if no provider is configured we
 * surface an actionable error row.
 *
 * Kept intentionally simple in Phase 1:
 *  - one call per PDF unless the text exceeds `maxCharsPerCall`, in
 *    which case we chunk by page (pdf-parse inserts `\f` between
 *    pages, which `PdfProcessor` has already split for us).
 *  - no retry / no caching yet — profile matching in Phase 2 is what
 *    turns this into a one-time cost per bank format.
 */

import type { LLMPreferences } from "$core/schema/workspaces";
import { getProviderForFeature } from "$core/server/ai/providers";
import type { ImportRow } from "$core/types/import";
import { generateText, Output } from "ai";
import { z } from "zod";
import type { ParserContext, PdfAiSchemaConfig, PdfExtraction } from "../types";

const ExtractedTxSchema = z.object({
  date: z
    .string()
    .describe(
      "Transaction date in YYYY-MM-DD format. Resolve relative dates (e.g. '02/14') against the statement period.",
    ),
  amount: z
    .number()
    .describe(
      "Signed amount. Negative = debit/charge/outflow, positive = credit/deposit/payment-received. For credit card statements, purchases are negative and payments-to-card are positive.",
    ),
  payee: z.string().describe("Merchant or counter-party name, cleaned of transaction codes."),
  notes: z
    .string()
    .optional()
    .describe("Any additional description, memo, or reference not already in payee."),
  category: z
    .string()
    .optional()
    .describe("Category the statement itself assigns, if any. Do not invent one."),
});

const ExtractionResultSchema = z.object({
  transactions: z
    .array(ExtractedTxSchema)
    .describe(
      "Every transaction present in the statement. Skip summary rows, balance lines, totals, and page boilerplate. Return an empty array if no transactions are present (e.g. cover pages).",
    ),
});

type ExtractedTx = z.infer<typeof ExtractedTxSchema>;

const BASE_SYSTEM_PROMPT = `You are a precise financial-statement extractor. Read the provided statement text and return every real transaction as structured data. Follow the schema exactly. Skip summary/balance/totals/page-header rows. Never invent transactions that aren't in the text. Preserve the statement's sign convention on amounts: charges/debits/withdrawals are negative, payments/credits/deposits are positive.`;

const DEFAULT_MAX_CHARS_PER_CALL = 80_000;

/**
 * Helper: shape the single "no provider" row we return when the
 * workspace has intelligence disabled, no key configured, or the
 * feature mode is `disabled`.
 */
function noProviderRow(fileName: string, reason: string): ImportRow[] {
  return [
    {
      rowIndex: 0,
      rawData: { fileName },
      normalizedData: {},
      validationStatus: "invalid",
      validationErrors: [
        {
          field: "general",
          message: reason,
          severity: "error",
        },
      ],
    },
  ];
}

/**
 * Run the LLM once against a text chunk, returning the raw extracted
 * transactions. On failure, returns an empty array plus the error
 * string so the caller can surface it on the ImportRow.
 */
async function extractChunk(
  chunkText: string,
  chunkLabel: string,
  config: PdfAiSchemaConfig,
  ctx: ParserContext,
  provider: ReturnType<typeof getProviderForFeature>["provider"],
): Promise<{ transactions: ExtractedTx[]; error?: string }> {
  if (!provider) {
    return { transactions: [], error: "No provider available" };
  }
  try {
    const promptParts = [
      `Statement file: ${ctx.fileName}`,
      config.currency ? `Currency hint: ${config.currency}` : null,
      `Chunk: ${chunkLabel}`,
      config.promptSuffix ? `Additional instructions: ${config.promptSuffix}` : null,
      "",
      "Statement text:",
      chunkText,
    ]
      .filter(Boolean)
      .join("\n");

    const { output } = await generateText({
      model: provider.provider(provider.model),
      output: Output.object({ schema: ExtractionResultSchema }),
      system: BASE_SYSTEM_PROMPT,
      prompt: promptParts,
    });

    return { transactions: output.transactions };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown extraction error";
    console.error(`pdf-ai-schema: chunk "${chunkLabel}" failed: ${message}`);
    return { transactions: [], error: message };
  }
}

/**
 * Decide whether to send the whole text in one call or chunk by page.
 * Always at least one chunk, even when the PDF is empty — gives the
 * executor a consistent loop shape.
 */
function buildChunks(extraction: PdfExtraction, maxChars: number): Array<{ label: string; text: string }> {
  const combined = extraction.text;
  if (combined.length <= maxChars) {
    return [{ label: `full (${extraction.pageCount} page${extraction.pageCount === 1 ? "" : "s"})`, text: combined }];
  }

  // Fallback: one call per page. Pages are already split by pdf-parse.
  // If a single page happens to exceed maxChars we still send it —
  // the LLM will either handle it or error, and we log that as a chunk
  // failure rather than silently truncate.
  return extraction.pages.map((pageText, i) => ({
    label: `page ${i + 1} of ${extraction.pages.length}`,
    text: pageText,
  }));
}

/**
 * Entry point. Always resolves; every row's outcome is encoded in the
 * `ImportRow.validationStatus` and `validationErrors` fields.
 *
 * @param preferences Workspace `LLMPreferences` — passed in so this
 *   module stays side-effect-free and testable. The upload route
 *   loads these from `workspaces.preferences` before invoking the
 *   import.
 */
export async function runPdfAiSchemaExtraction(
  extraction: PdfExtraction,
  config: PdfAiSchemaConfig,
  ctx: ParserContext,
  preferences: LLMPreferences,
): Promise<ImportRow[]> {
  if (!preferences.enabled) {
    return noProviderRow(
      ctx.fileName,
      "Intelligence is turned off for this workspace. Enable AI in Settings → Intelligence to import PDFs, or wait for saved parsers in a future update.",
    );
  }

  const { provider, mode } = getProviderForFeature(preferences, "statementExtraction");

  if (mode === "disabled") {
    return noProviderRow(
      ctx.fileName,
      "Statement extraction is disabled for this workspace. Enable it under Settings → Intelligence → Features.",
    );
  }

  if (!provider) {
    return noProviderRow(
      ctx.fileName,
      "No LLM provider is configured. Add an OpenAI / Anthropic / Google key (or point to an Ollama endpoint) in Settings → Intelligence and try again.",
    );
  }

  const chunks = buildChunks(extraction, config.maxCharsPerCall ?? DEFAULT_MAX_CHARS_PER_CALL);
  const collected: ExtractedTx[] = [];
  const chunkErrors: string[] = [];

  for (const chunk of chunks) {
    const { transactions, error } = await extractChunk(chunk.text, chunk.label, config, ctx, provider);
    collected.push(...transactions);
    if (error) chunkErrors.push(`${chunk.label}: ${error}`);
  }

  const rows: ImportRow[] = collected.map((tx, index) => ({
    rowIndex: index,
    rawData: { ...tx, source: "pdf-ai-schema" },
    normalizedData: {
      date: tx.date,
      amount: tx.amount,
      payee: tx.payee,
      notes: tx.notes ?? "",
      ...(tx.category ? { category: tx.category } : {}),
    },
    originalPayee: tx.payee,
    validationStatus: "pending",
  }));

  // If every chunk errored AND we got nothing, surface a single
  // error row so the UI can explain what happened. Partial failures
  // keep the successful rows + log the chunks that blew up.
  if (rows.length === 0 && chunkErrors.length > 0) {
    return [
      {
        rowIndex: 0,
        rawData: { fileName: ctx.fileName, chunkErrors },
        normalizedData: {},
        validationStatus: "invalid",
        validationErrors: [
          {
            field: "general",
            message: `AI extraction failed for every chunk. First error: ${chunkErrors[0]}`,
            severity: "error",
          },
        ],
      },
    ];
  }

  return rows;
}
