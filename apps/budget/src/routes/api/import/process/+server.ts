import { ImportOrchestrator } from "$lib/server/import/import-orchestrator";
import type { CategoryDismissal, ImportProgress } from "$lib/server/import/import-orchestrator";
import type { ImportRow } from "$core/types/import";
import { json } from "@sveltejs/kit";
import { z } from "zod/v4";
import {
  isImportApiError,
  requireImportAccountAccess,
  requireImportUserId,
} from "../auth";
import type { RequestHandler } from "./$types";

// Validates structural shape of import rows. Uses passthrough() because rows
// contain complex nested types (DuplicateMatch, TransferTargetMatch) that are
// created by the upload/remap endpoints and passed back unchanged.
const importRowSchema = z.object({
  rowIndex: z.number().int().min(0),
  rawData: z.record(z.string(), z.unknown()),
  normalizedData: z.record(z.string(), z.unknown()),
  validationStatus: z.enum(["pending", "valid", "invalid", "warning", "duplicate", "skipped", "transfer_match"]),
}).passthrough();

const processImportSchema = z.object({
  accountId: z.union([z.number().int().positive(), z.string().regex(/^\d+$/)]),
  data: z.array(importRowSchema).optional(),
  rows: z.array(importRowSchema).optional(),
  selectedEntities: z.object({
    payees: z.array(z.string()),
    categories: z.array(z.string()),
  }).optional(),
  options: z.object({
    allowPartialImport: z.boolean().optional(),
    createMissingEntities: z.boolean().optional(),
    createMissingPayees: z.boolean().optional(),
    createMissingCategories: z.boolean().optional(),
    skipDuplicates: z.boolean().optional(),
    duplicateThreshold: z.number().optional(),
    reverseAmountSigns: z.boolean().optional(),
    fileName: z.string().max(500).optional(),
  }).optional(),
  scheduleMatches: z.array(z.object({
    rowIndex: z.number().int().min(0),
    scheduleId: z.number().int().positive(),
    selected: z.boolean().optional(),
  }).passthrough()).optional(),
  categoryDismissals: z.array(z.object({
    rowIndex: z.number().int().min(0),
    payeeId: z.number().nullable(),
    payeeName: z.string().max(500),
    rawPayeeString: z.string().max(500),
    dismissedCategoryId: z.number().int().positive(),
    dismissedCategoryName: z.string().max(500),
    amount: z.number().optional(),
    date: z.string().max(30).optional(),
  })).optional(),
});

export const POST: RequestHandler = async ({ request, url }) => {
  // Check if client wants streaming response
  const wantsStream = url.searchParams.get("stream") === "true";

  try {
    const userId = await requireImportUserId(request);
    const body = await request.json();

    const parsed = processImportSchema.safeParse(body);
    if (!parsed.success) {
      return json({ error: "Invalid request body", details: parsed.error.issues }, { status: 400 });
    }

    const { data: validatedData, rows, selectedEntities, options, scheduleMatches, categoryDismissals } = parsed.data;
    const accountId = typeof parsed.data.accountId === "string" ? parseInt(parsed.data.accountId, 10) : parsed.data.accountId;
    await requireImportAccountAccess(userId, accountId);

    // Support both 'data' (legacy) and 'rows' (multi-file) field names
    const importRows = (rows || validatedData) as ImportRow[] | undefined;

    if (!accountId || !importRows) {
      return json({ error: "Missing required fields" }, { status: 400 });
    }

    // Filter schedule matches to only include selected ones
    const selectedScheduleMatches = scheduleMatches
      ?.filter((match) => match.selected)
      .map((match) => ({
        rowIndex: match.rowIndex,
        scheduleId: match.scheduleId,
      }));

    // Create orchestrator
    const orchestrator = new ImportOrchestrator();

    // If streaming is requested, return Server-Sent Events
    if (wantsStream) {
      const encoder = new TextEncoder();

      const stream = new ReadableStream({
        async start(controller) {
          try {
            // Progress callback sends updates via SSE
            const onProgress = (progress: ImportProgress) => {
              const data = JSON.stringify({ type: "progress", progress });
              controller.enqueue(encoder.encode(`data: ${data}\n\n`));
            };

            // Process import with progress callback
            const result = await orchestrator.processImport(
              accountId,
              importRows,
              options || {},
              selectedEntities,
              selectedScheduleMatches,
              categoryDismissals as CategoryDismissal[] | undefined,
              onProgress
            );

            // Send final result
            const finalData = JSON.stringify({ type: "complete", result });
            controller.enqueue(encoder.encode(`data: ${finalData}\n\n`));
            controller.close();
          } catch (error) {
            console.error("Import processing error (streamed):", error);
            const errorData = JSON.stringify({
              type: "error",
              error: error instanceof Error ? error.message : "Failed to process import",
            });
            controller.enqueue(encoder.encode(`data: ${errorData}\n\n`));
            controller.close();
          }
        },
      });

      return new Response(stream, {
        headers: {
          "Content-Type": "text/event-stream",
          "Cache-Control": "no-cache",
          Connection: "keep-alive",
        },
      });
    }

    // Non-streaming: Original behavior
    const result = await orchestrator.processImport(
      accountId,
      importRows,
      options || {},
      selectedEntities,
      selectedScheduleMatches,
      categoryDismissals as CategoryDismissal[] | undefined
    );

    return json({ result });
  } catch (error) {
    console.error("Import processing error:", error);
    if (isImportApiError(error)) {
      return json({ error: error.message }, { status: error.status });
    }

    return json(
      {
        error: error instanceof Error ? error.message : "Failed to process import",
      },
      { status: 500 }
    );
  }
};
