/**
 * Parse a user-pasted statement-extraction blob (BYOA mode).
 *
 * Accepts whatever the user pasted from an external AI:
 *   - clean JSON
 *   - JSON wrapped in ```json ... ``` markdown fences
 *   - JSON with a sentence of prose before/after ("Here's the JSON:")
 *
 * Returns either the validated `{ header, transactions }` shape (the
 * same one the in-process LLM extractor produces) or a structured
 * error the UI can display inline. Pure function — no I/O, no DB.
 *
 * Validation reuses `StatementResultSchema` from
 * `pdf-statement-extraction.ts` so the paste path and the LLM path
 * share a single source of truth.
 */

import type { ZodIssue } from "zod";
import {
  StatementResultSchema,
  type StatementResult,
} from "./pdf-statement-extraction";

export interface ParsePastedSuccess {
  ok: true;
  result: StatementResult;
}

export interface ParsePastedFailure {
  ok: false;
  /** Human-readable summary, shaped for inline display in the paste form. */
  error: string;
  /** Zod issues when validation failed; absent for JSON-parse failures. */
  details?: ZodIssue[];
}

export type ParsePastedResult = ParsePastedSuccess | ParsePastedFailure;

/**
 * Strip ```` ```json ... ``` ```` (and ```` ``` ... ``` ````) fences
 * if the AI wrapped the output in a markdown code block.
 */
function stripMarkdownFence(input: string): string {
  const trimmed = input.trim();
  // Match opening fence (optionally with language tag) and closing fence.
  const fenced = /^```(?:json|JSON)?\s*\n?([\s\S]*?)\n?```$/.exec(trimmed);
  if (fenced && fenced[1]) {
    return fenced[1].trim();
  }
  return trimmed;
}

/**
 * Find the first {...}-shaped JSON object inside a noisier blob. Used
 * as a fallback when the AI wrote prose around the JSON. We don't do
 * a proper brace-counting parser — most LLMs return clean JSON, and
 * the regex catches the prose-around-JSON case well enough. Edge
 * cases where prose contains stray braces fall through to a JSON
 * parse error, which is the right outcome.
 */
function extractJsonObject(input: string): string | null {
  const firstBrace = input.indexOf("{");
  const lastBrace = input.lastIndexOf("}");
  if (firstBrace === -1 || lastBrace === -1 || lastBrace <= firstBrace) {
    return null;
  }
  return input.slice(firstBrace, lastBrace + 1);
}

/** Format the first few Zod issues into a readable single-line error. */
function summarizeIssues(issues: ZodIssue[]): string {
  const top = issues.slice(0, 3).map((issue) => {
    const path = issue.path.length > 0 ? issue.path.join(".") : "(root)";
    return `${path}: ${issue.message}`;
  });
  const suffix = issues.length > 3 ? ` (+${issues.length - 3} more)` : "";
  return top.join("; ") + suffix;
}

export function parsePastedStatementResult(raw: string): ParsePastedResult {
  if (!raw || !raw.trim()) {
    return { ok: false, error: "Paste is empty." };
  }

  const cleaned = stripMarkdownFence(raw);

  // Try the cleaned text first; if JSON.parse rejects it, fall back to
  // pulling out the first {...} block in case the AI added prose.
  let parsed: unknown;
  try {
    parsed = JSON.parse(cleaned);
  } catch {
    const extracted = extractJsonObject(cleaned);
    if (!extracted) {
      return {
        ok: false,
        error: "Couldn't find a JSON object in the paste. Make sure the AI returned only JSON.",
      };
    }
    try {
      parsed = JSON.parse(extracted);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unknown JSON error";
      return { ok: false, error: `Invalid JSON: ${message}` };
    }
  }

  const validated = StatementResultSchema.safeParse(parsed);
  if (!validated.success) {
    return {
      ok: false,
      error: `Pasted JSON doesn't match the expected shape — ${summarizeIssues(validated.error.issues)}`,
      details: validated.error.issues,
    };
  }

  return { ok: true, result: validated.data };
}
