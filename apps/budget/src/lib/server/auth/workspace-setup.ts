import { db } from "$lib/server/db";
import { workspaces } from "$lib/schema/workspaces";
import { workspaceMembers } from "$lib/schema/workspace-members";

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
    workspaceId: workspace.id,
    userId: userId,
    role: "owner",
    isDefault: true,
  });

  return workspace.id;
}
