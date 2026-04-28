/**
 * Bulk-import extraction endpoint.
 *
 * Streams progress events over Server-Sent Events as it works, then
 * the final BulkExtractResponse. Each line is `data: {json}\n\n`. The
 * client reads the stream and updates per-file phase narration as
 * events land.
 *
 * Pipeline:
 *  1. PDF → text via pdf-parse.
 *  2. Two LLM calls fire in parallel:
 *     - a fast "describe this document" call (~3-5s) so the user
 *       sees what we're looking at almost immediately
 *     - the heavy structured extraction (~10-30s)
 *  3. Match the extracted header against existing accounts.
 *
 * One file per request — the client fans out N PDFs in parallel so
 * each gets independent progress and one failure can't block others.
 */

import { accounts as accountTable } from "$core/schema/accounts";
import { db } from "$core/server/db";
import { extractPdfTextFromBuffer } from "$core/server/domains/document-extraction/extractors/pdf-extractor";
import { matchAccountFromStatement } from "$core/server/import/matchers/account-matcher";
import {
  runPdfStatementDescribe,
  runPdfStatementExtraction,
} from "$core/server/import/parser-runtime/executors/pdf-statement-extraction";
import type { BulkExtractResponse } from "$lib/types/bulk-import";
import { loadWorkspaceLlmPreferences } from "$core/server/shared/workspace-llm-preferences";
import { createContext } from "$core/trpc/context";
import { fromSvelteKit } from "$lib/trpc/adapters/sveltekit";
import { json } from "@sveltejs/kit";
import { and, eq, isNull } from "drizzle-orm";
import type { RequestHandler } from "./$types";

const MAX_PDF_SIZE = 20 * 1024 * 1024; // matches PDFProcessor

/**
 * Server-Sent Event shapes sent to the client. The client reads
 * these from the stream as the pipeline progresses.
 */
type ProgressEvent =
  | { type: "phase"; label: string }
  | { type: "describe"; text: string }
  | { type: "complete"; payload: BulkExtractResponse };

export const POST: RequestHandler = async (event) => {
  const ctx = await createContext(fromSvelteKit(event));

  if (!ctx.userId || !ctx.workspaceId) {
    return json({ error: "Authentication required" }, { status: 401 });
  }

  let formData: FormData;
  try {
    formData = await event.request.formData();
  } catch {
    return json({ error: "Invalid form data" }, { status: 400 });
  }

  const file = formData.get("file");
  if (!(file instanceof File)) {
    return json({ error: "Missing 'file' field" }, { status: 400 });
  }

  if (!file.name.toLowerCase().endsWith(".pdf")) {
    return json({ error: "Only .pdf files are accepted" }, { status: 400 });
  }
  if (file.size === 0) {
    return json({ error: "File is empty" }, { status: 400 });
  }
  if (file.size > MAX_PDF_SIZE) {
    return json({ error: `File exceeds ${MAX_PDF_SIZE / 1024 / 1024}MB limit` }, { status: 400 });
  }

  const workspaceId = ctx.workspaceId;
  const buffer = Buffer.from(await file.arrayBuffer());
  const fileName = file.name;
  const fileSize = file.size;

  const encoder = new TextEncoder();
  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      const send = (e: ProgressEvent) =>
        controller.enqueue(encoder.encode(`data: ${JSON.stringify(e)}\n\n`));

      try {
        send({ type: "phase", label: "Reading the PDF…" });

        let extraction;
        try {
          extraction = await extractPdfTextFromBuffer(buffer);
        } catch (error) {
          const message = error instanceof Error ? error.message : "Unknown PDF parse error";
          send({
            type: "complete",
            payload: buildFailureResponse(fileName, fileSize, `Failed to read PDF: ${message}`),
          });
          controller.close();
          return;
        }

        if (!extraction.text || extraction.text.trim().length === 0) {
          send({
            type: "complete",
            payload: buildFailureResponse(
              fileName,
              fileSize,
              "No extractable text found in PDF. The document may be image-only (scanned).",
            ),
          });
          controller.close();
          return;
        }

        const pages = extraction.text.split(/\f/).map((p) => p.trim());
        const pageCount = extraction.pageCount;

        send({
          type: "phase",
          label: `Asking AI to look at this ${pageCount}-page document…`,
        });

        const llmPreferences = await loadWorkspaceLlmPreferences(workspaceId);

        // Fire describe + structured extraction in parallel. Describe
        // returns first (a few seconds) and updates the UI; extraction
        // continues running. We don't gate the structured call on the
        // describe result.
        const describePromise = runPdfStatementDescribe(
          extraction.text,
          fileName,
          llmPreferences,
        ).then((narration) => {
          if (narration) send({ type: "describe", text: narration });
        });

        const extractionPromise = runPdfStatementExtraction({
          text: extraction.text,
          pages: pages.length > 0 ? pages : [extraction.text],
          pageCount,
          fileName,
          llmPreferences,
        });

        const result = await extractionPromise;
        // Wait for describe so the event ordering is sensible — but
        // it's already finished by now in almost every case.
        await describePromise.catch(() => undefined);

        send({ type: "phase", label: "Matching to your accounts…" });

        const candidates = await db
          .select({
            id: accountTable.id,
            name: accountTable.name,
            institution: accountTable.institution,
            accountNumberLast4: accountTable.accountNumberLast4,
            accountType: accountTable.accountType,
            closed: accountTable.closed,
          })
          .from(accountTable)
          .where(and(eq(accountTable.workspaceId, workspaceId), isNull(accountTable.deletedAt)));

        const match = matchAccountFromStatement(result.header, candidates);

        const payload: BulkExtractResponse = {
          fileName,
          fileSize,
          header: result.header,
          transactions: result.transactions,
          match: {
            confidence: match.confidence,
            accountId: match.account?.id ?? null,
            accountName: match.account?.name ?? null,
            reason: match.reason,
          },
          chunkErrors: result.chunkErrors,
          ...(result.fatalError ? { fatalError: result.fatalError } : {}),
        };

        send({ type: "complete", payload });
      } catch (error) {
        const message = error instanceof Error ? error.message : "Unknown server error";
        send({
          type: "complete",
          payload: buildFailureResponse(fileName, fileSize, message),
        });
      } finally {
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
      // Disable nginx-style buffering when the app is reverse-proxied;
      // SSE only works if intermediaries flush per-line.
      "X-Accel-Buffering": "no",
    },
  });
};

function buildFailureResponse(
  fileName: string,
  fileSize: number,
  reason: string,
): BulkExtractResponse {
  return {
    fileName,
    fileSize,
    header: {
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
    },
    transactions: [],
    match: {
      confidence: "none",
      accountId: null,
      accountName: null,
      reason: "Extraction failed",
    },
    chunkErrors: [],
    fatalError: reason,
  };
}
