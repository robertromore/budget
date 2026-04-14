/**
 * Auto-scheduler for periodic price checks.
 *
 * Starts a setInterval on first call — subsequent calls are no-ops.
 * Runs as long as the server process is alive. Uses the same
 * processOverdueChecks logic as the cron endpoint.
 */

import { db } from "$core/server/db";
import { workspaces } from "$core/schema";
import { isNull } from "drizzle-orm";
import { processOverdueChecks } from "./scheduler";

let started = false;

/**
 * Start the automatic price check scheduler.
 * Safe to call multiple times — only starts once.
 *
 * @param intervalMinutes - How often to check (default 15 minutes)
 */
export function startPriceCheckScheduler(intervalMinutes = 15): void {
  if (started) return;
  started = true;

  // Initial check after 30 seconds (let the server warm up)
  setTimeout(() => runChecks(), 30_000);

  // Then every N minutes
  setInterval(() => runChecks(), intervalMinutes * 60 * 1000);
}

async function runChecks(): Promise<void> {
  try {
    const allWorkspaces = await db.query.workspaces.findMany({
      where: isNull(workspaces.deletedAt),
    });

    for (const workspace of allWorkspaces) {
      try {
        await processOverdueChecks(workspace.id);
      } catch {
        // Individual workspace errors don't stop the batch
      }
    }
  } catch {
    // DB errors don't crash the scheduler — it will retry on the next interval
  }
}
