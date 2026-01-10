import { ImportOrchestrator } from "$lib/server/import/import-orchestrator";
import type { CategoryDismissal, ImportProgress } from "$lib/server/import/import-orchestrator";
import { json } from "@sveltejs/kit";
import type { RequestHandler } from "./$types";

export const POST: RequestHandler = async ({ request, url }) => {
  // Check if client wants streaming response
  const wantsStream = url.searchParams.get("stream") === "true";

  try {
    const body = await request.json();
    const { accountId, data, rows, selectedEntities, options, scheduleMatches, categoryDismissals } = body;

    // Support both 'data' (legacy) and 'rows' (multi-file) field names
    const importRows = rows || data;

    console.log("=== IMPORT PROCESS ENDPOINT ===");
    console.log("AccountId:", accountId);
    console.log("Data rows count:", importRows?.length);
    console.log("Selected entities:", selectedEntities);
    console.log("Options:", options);
    console.log("Schedule matches:", scheduleMatches?.length || 0);
    console.log("Category dismissals:", categoryDismissals?.length || 0);
    console.log("Streaming:", wantsStream);

    if (!accountId || !importRows) {
      return json({ error: "Missing required fields" }, { status: 400 });
    }

    // Filter schedule matches to only include selected ones
    const selectedScheduleMatches = scheduleMatches
      ?.filter((match: any) => match.selected)
      .map((match: any) => ({
        rowIndex: match.rowIndex,
        scheduleId: match.scheduleId,
      }));

    console.log("Selected schedule matches:", selectedScheduleMatches?.length || 0);

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

            console.log("=== IMPORT RESULT (STREAMED) ===");
            console.log("Transactions created:", result.transactionsCreated);
            console.log("Entities created:", result.entitiesCreated);
            console.log("Errors:", result.errors);

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

    console.log("=== IMPORT RESULT ===");
    console.log("Transactions created:", result.transactionsCreated);
    console.log("Entities created:", result.entitiesCreated);
    console.log("Errors:", result.errors);
    if (result.byFile) {
      console.log("Per-file breakdown:", result.byFile);
    }

    return json({ result });
  } catch (error) {
    console.error("Import processing error:", error);
    return json(
      {
        error: error instanceof Error ? error.message : "Failed to process import",
      },
      { status: 500 }
    );
  }
};
