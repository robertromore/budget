import { db } from "$core/server/db";
import { workspaces } from "$core/schema/workspaces";
import { workspaceMembers } from "$core/schema/workspace-members";
import { invalidateWorkspaceCacheForUser } from "$core/trpc/context";

/**
 * Creates a default "Personal" workspace for a new user
 * Called automatically when a user signs up
 */
export async function createDefaultWorkspaceForUser(userId: string): Promise<number> {
  // Create the workspace
  const [workspace] = await db
    .insert(workspaces)
    .values({
      displayName: "Personal",
      slug: `personal-${userId.slice(0, 8)}`,
      ownerId: userId,
      preferences: JSON.stringify({
        locale: "en-US",
        currency: "USD",
        dateFormat: "MM/DD/YYYY",
        theme: "system",
      }),
    })
    .returning();

  // Add user as owner member
  await db.insert(workspaceMembers).values({
    workspaceId: workspace!.id,
    userId: userId,
    role: "owner",
    isDefault: true,
  });
  // The repository invalidates automatically; this direct-insert path does not,
  // so clear the cache explicitly to avoid a brief window where the new user's
  // workspace is invisible to subsequent requests.
  invalidateWorkspaceCacheForUser(userId);

  return workspace!.id;
}
