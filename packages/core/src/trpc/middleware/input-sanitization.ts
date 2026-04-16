import type { Context } from "$core/trpc";
import { initTRPC, TRPCError } from "@trpc/server";

// Initialize tRPC instance for middleware creation
const t = initTRPC.context<Context>().create();

/**
 * Validate that input doesn't exceed safe nesting depth (DoS protection).
 *
 * IMPORTANT: This middleware does NOT mutate user strings. String-level
 * sanitization for XSS protection must happen at the render boundary —
 * sanitizing here corrupts legitimate data (passwords containing `<`,
 * notes discussing HTML, regex patterns in automation rules) and provides
 * only superficial defense that bypasses trivially (multiline script tags,
 * malformed attributes, URL-encoded payloads).
 *
 * SQL injection is prevented by Drizzle's parameterized queries, not by
 * blacklisting substrings like "union select" which also rejects legitimate
 * user content.
 */
function validateInput(input: unknown): void {
  if (input === null || input === undefined) {
    return;
  }

  let inputStr: string;
  try {
    inputStr = JSON.stringify(input);
  } catch {
    // Circular or non-serializable input — let Zod reject it downstream.
    return;
  }

  // Guard against payload size as a secondary line of defense; request-limit
  // middleware is the primary size limiter.
  if (inputStr.length > 5_000_000) {
    throw new TRPCError({
      code: "PAYLOAD_TOO_LARGE",
      message: "Input payload is too large",
    });
  }

  // Depth check for DoS protection
  const maxDepth = 15;
  let depth = 0;
  let maxSeen = 0;
  let inString = false;
  let escaped = false;
  for (let i = 0; i < inputStr.length; i++) {
    const char = inputStr[i];
    if (escaped) {
      escaped = false;
      continue;
    }
    if (char === "\\") {
      escaped = true;
      continue;
    }
    if (char === '"') {
      inString = !inString;
      continue;
    }
    if (inString) continue;
    if (char === "{" || char === "[") {
      depth++;
      if (depth > maxSeen) maxSeen = depth;
      if (depth > maxDepth) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Input structure is too deeply nested",
        });
      }
    } else if (char === "}" || char === "]") {
      depth--;
    }
  }
}

/**
 * Input validation middleware for tRPC.
 *
 * Validates payload depth/size only; does NOT mutate strings. Downstream
 * route .input() Zod schemas are the source of truth for shape validation.
 * XSS protection happens at render time, not at ingestion.
 */
export const inputSanitization = t.middleware(async ({ next, input }) => {
  validateInput(input);
  return next({ input });
});

/**
 * Alias for backwards compatibility. Identical to inputSanitization now that
 * the string-mangling and SQL-blacklist behavior has been removed — both were
 * corrupting legitimate data and providing no actual security value.
 */
export const strictInputSanitization = inputSanitization;
