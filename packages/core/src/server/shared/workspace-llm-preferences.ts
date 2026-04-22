/**
 * Shared helper for loading a workspace's `LLMPreferences` off the
 * `workspaces.preferences` JSON blob. Merges over
 * `DEFAULT_LLM_PREFERENCES` so callers can rely on every feature
 * mode being present — including newer keys (e.g. `statementExtraction`)
 * that existing workspaces haven't explicitly stored yet.
 *
 * Kept side-effect-free + deliberately tolerant: any parse error or
 * missing row quietly returns the defaults so an import / ML call
 * can proceed with LLM disabled rather than 500.
 */

import { workspaces as workspacesTable } from "$core/schema/workspaces";
import {
  DEFAULT_LLM_PREFERENCES,
  type LLMPreferences,
} from "$core/schema/workspaces";
import { db } from "$core/server/db";
import { eq } from "drizzle-orm";

export async function loadWorkspaceLlmPreferences(
  workspaceId: number,
): Promise<LLMPreferences> {
  try {
    const row = await db.query.workspaces.findFirst({
      where: eq(workspacesTable.id, workspaceId),
    });
    if (!row?.preferences) return DEFAULT_LLM_PREFERENCES;
    const parsed = JSON.parse(row.preferences) as { llm?: Partial<LLMPreferences> };
    return {
      ...DEFAULT_LLM_PREFERENCES,
      ...(parsed.llm ?? {}),
      featureModes: {
        ...DEFAULT_LLM_PREFERENCES.featureModes,
        ...(parsed.llm?.featureModes ?? {}),
      },
      providers: {
        ...DEFAULT_LLM_PREFERENCES.providers,
        ...(parsed.llm?.providers ?? {}),
      },
    };
  } catch (error) {
    console.error(
      `Failed to load LLM preferences for workspace ${workspaceId}:`,
      error,
    );
    return DEFAULT_LLM_PREFERENCES;
  }
}
