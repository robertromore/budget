/**
 * `pdf-statement-extraction` executor.
 *
 * Sibling to `pdf-ai-schema` for the bulk-import flow. Extracts both
 * the statement *header* (institution, last-4, statement period,
 * opening/closing balance) and the transactions in one LLM call, so
 * the client can route each file to the right account and reconcile
 * balances on commit.
 *
 * Kept separate from `pdf-ai-schema.ts` because:
 *  - The single-account import path doesn't need the header (the user
 *    has already chosen the account) and we don't want to pay extra
 *    tokens or risk schema confusion there.
 *  - This executor returns a richer object than `ImportRow[]`, so the
 *    parser-runtime switch stays clean.
 *
 * The header fields are all nullable — the LLM is instructed to leave
 * a field null rather than fabricate it. That way the matcher and
 * commit logic can degrade gracefully (e.g. propose a new account
 * without an account number, or skip reconciliation when the closing
 * balance is missing).
 */

import { accountTypeEnum, loanSubtypeEnum } from "$core/schema/accounts";
import type { LLMPreferences } from "$core/schema/workspaces";
import { getProviderForFeature } from "$core/server/ai/providers";
import { generateText, Output } from "ai";
import { z } from "zod";

const StatementHeaderSchema = z.object({
  institution: z
    .string()
    .nullable()
    .describe(
      "Bank or card issuer name as printed on the statement (e.g. 'Chase', 'American Express'). Null if not present.",
    ),
  accountNumberLast4: z
    .string()
    .nullable()
    .describe(
      "Account or card number reference as printed (last 4 digits if shown, full number if available, or e.g. '5915-75'). Up to 32 characters; null if not shown.",
    ),
  accountType: z
    .enum([...accountTypeEnum])
    .nullable()
    .describe(
      "Best inference of the account type from statement context: 'checking', 'savings', 'credit_card', 'loan', 'investment', 'hsa', 'cash', 'utility', or 'other'. Null if unclear.",
    ),
  accountName: z
    .string()
    .nullable()
    .describe(
      "Display name shown for the account (e.g. 'Chase Total Checking', 'Sapphire Preferred'). Null if not present.",
    ),
  statementPeriodStart: z
    .string()
    .nullable()
    .describe("Statement period start date in YYYY-MM-DD. Null if not present."),
  statementPeriodEnd: z
    .string()
    .nullable()
    .describe("Statement period end date in YYYY-MM-DD. Null if not present."),
  openingBalance: z
    .number()
    .nullable()
    .describe(
      "Opening / previous balance for the statement period. For credit cards this is typically the previous statement balance. Null if not present.",
    ),
  closingBalance: z
    .number()
    .nullable()
    .describe(
      "Closing / new balance for the statement period. For credit cards this is the new statement balance owed. Null if not present.",
    ),
  currency: z
    .string()
    .nullable()
    .describe("ISO 4217 currency code (e.g. 'USD'). Null if not present."),
  portalUrl: z
    .string()
    .nullable()
    .describe(
      "URL of the institution's online portal as printed on the statement (e.g. 'https://www.chase.com/amazon', 'myibmcloan.com'). Include the scheme if shown. Null if not present.",
    ),
  statementCycleDay: z
    .number()
    .int()
    .min(1)
    .max(31)
    .nullable()
    .describe(
      "Day of month the billing cycle closes (1-31). For credit card / loan statements, this is the day of the closing date (e.g. statement closes on the 24th → 24). Derive from `statementPeriodEnd` when not stated explicitly. Null otherwise.",
    ),
  // Loan-specific (mortgage, auto, student, personal, heloc).
  loanSubtype: z
    .enum([...loanSubtypeEnum])
    .nullable()
    .describe(
      "If this is a loan statement, classify it: 'mortgage', 'auto', 'student', 'personal', 'heloc', or 'other_loan'. Null for non-loan statements.",
    ),
  originalPrincipal: z
    .number()
    .nullable()
    .describe(
      "Original loan principal at origination, if printed (e.g. mortgage 'Original Principal Balance'). Null if not present or not a loan.",
    ),
  escrowBalance: z
    .number()
    .nullable()
    .describe(
      "Escrow balance held by the loan servicer for taxes/insurance, if printed. Mortgage-only. Null otherwise.",
    ),
  maturityDate: z
    .string()
    .nullable()
    .describe(
      "Loan payoff date or term-deposit maturity date in YYYY-MM-DD. If only month/year is shown (e.g. '07/2053'), use the first day of that month. Null if not present.",
    ),
  // Retirement-specific.
  vestedBalance: z
    .number()
    .nullable()
    .describe(
      "For 401(k)/employer-match accounts: the vested portion of the balance (the amount the employee would keep on departure). Null if not a retirement plan with vesting.",
    ),
});

export type StatementHeader = z.infer<typeof StatementHeaderSchema>;

const ExtractedTxSchema = z.object({
  date: z
    .string()
    .describe(
      "Transaction date in YYYY-MM-DD. Resolve relative dates against the statement period.",
    ),
  amount: z
    .number()
    .describe(
      "Signed amount. Negative = debit/charge/outflow, positive = credit/deposit/payment-received. For credit card statements, purchases are negative and payments-to-card are positive.",
    ),
  payee: z.string().describe("Merchant or counter-party name, cleaned of transaction codes."),
  notes: z.string().optional().describe("Additional description / memo not already in payee."),
  category: z
    .string()
    .optional()
    .describe("Category the statement itself assigns, if any. Do not invent one."),
});

export type ExtractedStatementTx = z.infer<typeof ExtractedTxSchema>;

/**
 * Combined statement-extraction shape: header + transactions array.
 * Exported so the paste-parser path (BYOA mode) can validate
 * user-pasted JSON against the same schema the in-process LLM call
 * is held to. Single source of truth.
 */
export const StatementResultSchema = z.object({
  header: StatementHeaderSchema,
  transactions: z
    .array(ExtractedTxSchema)
    .describe(
      "Every transaction present in the statement. Skip summary rows, balance lines, totals, and page boilerplate. Empty array if no transactions.",
    ),
});

export type StatementResult = z.infer<typeof StatementResultSchema>;

const SYSTEM_PROMPT = `You are a precise financial-statement extractor. Given the text of one statement, return:
1. A header describing the account (institution, last 4 digits, account type, statement period, opening/closing balance, currency).
2. Every real transaction in the statement period.

Rules:
- Only return what is actually printed. Leave header fields null when not present rather than guessing.
- Skip summary/balance/totals/page-header/footer lines from the transactions list.
- Preserve the statement's sign convention: charges/debits/withdrawals negative, payments/credits/deposits positive.
- For credit-card statements, purchases are negative and payments toward the card are positive.
- Last-4 must be exactly four digits with no other characters; if the statement only shows ****1234 use "1234"; if it shows fewer or more digits, use null.
- Statement dates must be YYYY-MM-DD.`;

export interface PdfStatementExtractionInput {
  /** Concatenated PDF text (form-feed-separated pages). */
  text: string;
  pages: string[];
  pageCount: number;
  fileName: string;
  /** Workspace LLM preferences — determines provider + feature mode. */
  llmPreferences: LLMPreferences;
  /** Optional currency hint to disambiguate ambiguous statements. */
  currencyHint?: string;
  /** Soft cap before chunking by page; defaults to 80k chars. */
  maxCharsPerCall?: number;
}

export interface PdfStatementExtractionResult {
  header: StatementHeader;
  transactions: ExtractedStatementTx[];
  /** Per-chunk failure messages — surface these in the UI without blocking the file. */
  chunkErrors: string[];
  /** Top-level failure (e.g. no provider configured); when set the rest is meaningless. */
  fatalError?: string;
}

const DEFAULT_MAX_CHARS_PER_CALL = 80_000;

const EMPTY_HEADER: StatementHeader = {
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

function buildChunks(
  text: string,
  pages: string[],
  pageCount: number,
  maxChars: number,
): Array<{ label: string; text: string; isFirst: boolean }> {
  if (text.length <= maxChars) {
    return [
      {
        label: `full (${pageCount} page${pageCount === 1 ? "" : "s"})`,
        text,
        isFirst: true,
      },
    ];
  }

  return pages.map((pageText, i) => ({
    label: `page ${i + 1} of ${pages.length}`,
    text: pageText,
    isFirst: i === 0,
  }));
}

/**
 * Quick, single-sentence "what is this document?" describe call.
 * Runs in parallel with the heavy structured extraction so the UI
 * can show "Looks like a Chase Prime Visa credit-card statement for
 * Feb 25–Mar 24, 2026." within a few seconds while the full
 * extraction continues.
 *
 * Intentionally tiny: ~80 tokens of output, no schema, no chunking.
 * Uses the same workspace provider as the heavy call so it inherits
 * the same enable/disable + key configuration. Failure is silent —
 * the caller treats `null` as "no narration available" and the rest
 * of the pipeline still runs.
 */
export async function runPdfStatementDescribe(
  text: string,
  fileName: string,
  preferences: LLMPreferences,
): Promise<string | null> {
  if (!preferences.enabled) return null;
  const { provider, mode } = getProviderForFeature(preferences, "statementExtraction");
  if (mode === "disabled" || !provider) return null;

  // Cap input at ~6k chars (≈1500 tokens). Plenty for the header /
  // first page; we don't need the whole statement to know what it is.
  const sample = text.slice(0, 6000);

  try {
    const { text: summary } = await generateText({
      model: provider.provider(provider.model),
      system:
        "You describe financial documents in one short sentence. Identify the institution, document type (credit-card statement, mortgage statement, brokerage/IRA statement, paystub, etc.), and statement period if visible. Be concise — under 25 words. Do not list transactions or balances.",
      prompt: [`File name: ${fileName}`, "", "Document text (first portion):", sample].join("\n"),
    });
    const trimmed = summary.trim();
    return trimmed.length > 0 ? trimmed : null;
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown describe error";
    console.error(`pdf-statement-describe failed: ${message}`);
    return null;
  }
}

export async function runPdfStatementExtraction(
  input: PdfStatementExtractionInput,
): Promise<PdfStatementExtractionResult> {
  const { llmPreferences, fileName, text, pages, pageCount } = input;

  if (!llmPreferences.enabled) {
    return {
      header: EMPTY_HEADER,
      transactions: [],
      chunkErrors: [],
      fatalError:
        "Intelligence is turned off for this workspace. Enable AI in Settings → Intelligence to bulk-import PDF statements.",
    };
  }

  const { provider, mode } = getProviderForFeature(llmPreferences, "statementExtraction");

  if (mode === "disabled") {
    return {
      header: EMPTY_HEADER,
      transactions: [],
      chunkErrors: [],
      fatalError:
        "Statement extraction is disabled for this workspace. Enable it under Settings → Intelligence → Features.",
    };
  }

  if (!provider) {
    return {
      header: EMPTY_HEADER,
      transactions: [],
      chunkErrors: [],
      fatalError:
        "No LLM provider is configured. Add an OpenAI / Anthropic / Google key (or point to an Ollama endpoint) in Settings → Intelligence and try again.",
    };
  }

  const chunks = buildChunks(
    text,
    pages,
    pageCount,
    input.maxCharsPerCall ?? DEFAULT_MAX_CHARS_PER_CALL,
  );

  // Header is taken from the first successful chunk (header info almost
  // always lives on page 1). Subsequent chunks contribute transactions
  // only — their headers are ignored.
  let header: StatementHeader = EMPTY_HEADER;
  let headerCaptured = false;
  const transactions: ExtractedStatementTx[] = [];
  const chunkErrors: string[] = [];

  for (const chunk of chunks) {
    try {
      const promptParts = [
        `Statement file: ${fileName}`,
        input.currencyHint ? `Currency hint: ${input.currencyHint}` : null,
        `Chunk: ${chunk.label}`,
        chunk.isFirst
          ? "This chunk includes the statement header — populate the header fields."
          : "This chunk is a continuation — focus on transactions; header fields can be null.",
        "",
        "Statement text:",
        chunk.text,
      ]
        .filter(Boolean)
        .join("\n");

      const { output } = await generateText({
        model: provider.provider(provider.model),
        output: Output.object({ schema: StatementResultSchema }),
        system: SYSTEM_PROMPT,
        prompt: promptParts,
      });

      if (!headerCaptured && hasAnyHeaderField(output.header)) {
        header = output.header;
        headerCaptured = true;
      }
      transactions.push(...output.transactions);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unknown extraction error";
      console.error(`pdf-statement-extraction: chunk "${chunk.label}" failed: ${message}`);
      chunkErrors.push(`${chunk.label}: ${message}`);
    }
  }

  return { header, transactions, chunkErrors };
}

function hasAnyHeaderField(header: StatementHeader): boolean {
  return (
    header.institution !== null ||
    header.accountNumberLast4 !== null ||
    header.accountType !== null ||
    header.accountName !== null ||
    header.statementPeriodStart !== null ||
    header.statementPeriodEnd !== null ||
    header.openingBalance !== null ||
    header.closingBalance !== null ||
    header.currency !== null ||
    header.portalUrl !== null ||
    header.statementCycleDay !== null ||
    header.loanSubtype !== null ||
    header.originalPrincipal !== null ||
    header.escrowBalance !== null ||
    header.maturityDate !== null ||
    header.vestedBalance !== null
  );
}
