import { processOverdueChecks } from "$core/server/domains/price-watcher/scheduler";
import { db } from "$core/server/db";
import { workspaces } from "$core/schema";
import { json } from "@sveltejs/kit";
import type { RequestHandler } from "./$types";
import { isNull } from "drizzle-orm";
import { env } from "$env/dynamic/private";

export const GET: RequestHandler = async ({ request }) => {
  // Authenticate with CRON_SECRET env var
  const cronSecret = env.CRON_SECRET;
  if (cronSecret) {
    const authHeader = request.headers.get("authorization");
    if (authHeader !== `Bearer ${cronSecret}`) {
      return json({ ok: false, error: "Unauthorized" }, { status: 401 });
    }
  }

  try {
    // Process all active workspaces
    const allWorkspaces = await db.query.workspaces.findMany({
      where: isNull(workspaces.deletedAt),
    });

    const results = [];
    for (const workspace of allWorkspaces) {
      const result = await processOverdueChecks(workspace.id);
      results.push({
        workspaceId: workspace.id,
        ...result,
      });
    }

    const totals = results.reduce(
      (acc, r) => ({
        checked: acc.checked + r.checked,
        succeeded: acc.succeeded + r.succeeded,
        failed: acc.failed + r.failed,
        skipped: acc.skipped + r.skipped,
      }),
      { checked: 0, succeeded: 0, failed: 0, skipped: 0 }
    );

    return json({
      ok: true,
      ...totals,
      workspaces: results.length,
    });
  } catch (error) {
    return json(
      {
        ok: false,
        error: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
};
