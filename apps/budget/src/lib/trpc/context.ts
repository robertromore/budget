import type { RequestEvent } from "@sveltejs/kit";
import { db } from "$lib/server/db";
import { workspaces } from "$lib/schema/workspaces";
import { eq } from "drizzle-orm";

/**
 * Get the current workspace ID from the request
 * For now, uses a cookie. Later, will use auth session.
 */
async function getCurrentWorkspaceId(event: RequestEvent): Promise<number> {
  // Check for userId cookie (for backward compatibility, we still use 'userId' as the cookie name)
  const workspaceIdCookie = event.cookies.get("userId");
  if (workspaceIdCookie) {
    const workspaceId = parseInt(workspaceIdCookie);
    if (!isNaN(workspaceId)) {
      // Verify workspace exists
      const workspace = await db
        .select()
        .from(workspaces)
        .where(eq(workspaces.id, workspaceId))
        .limit(1);
      if (workspace.length > 0) {
        return workspaceId;
      }
    }
  }

  // No valid workspace found - get or create default workspace
  return await getOrCreateDefaultWorkspace();
}

/**
 * Get or create a default workspace
 * Used for initial setup or when no workspace is selected
 */
async function getOrCreateDefaultWorkspace(): Promise<number> {
  // Try to find existing default workspace
  const existingWorkspaces = await db.select().from(workspaces).limit(1);

  if (existingWorkspaces.length > 0) {
    return existingWorkspaces[0].id;
  }

  // Create default workspace
  const [newWorkspace] = await db
    .insert(workspaces)
    .values({
      displayName: "Personal",
      slug: "personal",
      preferences: JSON.stringify({
        locale: "en-US",
        currency: "USD",
        dateFormat: "MM/DD/YYYY",
        theme: "system",
      }),
    })
    .returning();

  return newWorkspace.id;
}

/**
 * Create tRPC context with workspace isolation
 */
export async function createContext(event: RequestEvent) {
  const workspaceId = await getCurrentWorkspaceId(event);

  return {
    db,
    workspaceId,
    event,
  };
}

export type Context = Awaited<ReturnType<typeof createContext>> & {
  isTest?: boolean | undefined;
};
