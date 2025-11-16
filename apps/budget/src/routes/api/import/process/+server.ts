import { ImportOrchestrator } from "$lib/server/import/import-orchestrator";
import { json } from "@sveltejs/kit";
import type { RequestHandler } from "./$types";

export const POST: RequestHandler = async ({ request }) => {
  try {
    const body = await request.json();
    const { accountId, data, selectedEntities, options, scheduleMatches } = body;

    console.log("=== IMPORT PROCESS ENDPOINT ===");
    console.log("AccountId:", accountId);
    console.log("Data rows count:", data?.length);
    console.log("Selected entities:", selectedEntities);
    console.log("Options:", options);
    console.log("Schedule matches:", scheduleMatches?.length || 0);

    if (!accountId || !data) {
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

    // Create orchestrator and process import with selected entities and schedule matches
    const orchestrator = new ImportOrchestrator();
    const result = await orchestrator.processImport(
      accountId,
      data,
      options || {},
      selectedEntities,
      selectedScheduleMatches
    );

    console.log("=== IMPORT RESULT ===");
    console.log("Transactions created:", result.transactionsCreated);
    console.log("Entities created:", result.entitiesCreated);
    console.log("Errors:", result.errors);

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
