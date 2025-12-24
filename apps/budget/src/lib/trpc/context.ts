import { workspaces } from "$lib/schema/workspaces";
import { workspaceMembers } from "$lib/schema/workspace-members";
import { db } from "$lib/server/db";
import { auth } from "$lib/server/auth";
import type { RequestEvent } from "@sveltejs/kit";
import { and, eq, isNull } from "drizzle-orm";

/**
 * Get the current user ID from the Better Auth session
 */
async function getCurrentUserId(event: RequestEvent): Promise<string | null> {
  try {
    const session = await auth.api.getSession({
      headers: event.request.headers,
    });

    if (session?.user?.id) {
      return session.user.id;
    }
  } catch {
    // Session retrieval failed, user is not authenticated
  }

  return null;
}

/**
 * Get the current workspace ID from the request
 * Uses session-based membership or falls back to cookie for backward compatibility
 */
async function getCurrentWorkspaceId(
  event: RequestEvent,
  userId: string | null
): Promise<number> {
  // First, check cookie for workspace selection
  const workspaceIdCookie = event.cookies.get("workspaceId") || event.cookies.get("userId");

  if (workspaceIdCookie) {
    const workspaceId = parseInt(workspaceIdCookie);
    if (!isNaN(workspaceId)) {
      // If user is logged in, verify they have membership
      if (userId) {
        const [membership] = await db
          .select()
          .from(workspaceMembers)
          .where(
            and(
              eq(workspaceMembers.userId, userId),
              eq(workspaceMembers.workspaceId, workspaceId)
            )
          )
          .limit(1);

        if (membership) {
          return workspaceId;
        }
        // User doesn't have access to this workspace, try to find their default
      } else {
        // No user logged in - verify workspace exists (backward compatibility)
        const [workspace] = await db
          .select()
          .from(workspaces)
          .where(eq(workspaces.id, workspaceId))
          .limit(1);

        if (workspace) {
          return workspaceId;
        }
      }
    }
  }

  // If user is logged in, get their default workspace
  if (userId) {
    // Try to get user's default workspace
    const [defaultMembership] = await db
      .select()
      .from(workspaceMembers)
      .innerJoin(workspaces, eq(workspaceMembers.workspaceId, workspaces.id))
      .where(
        and(
          eq(workspaceMembers.userId, userId),
          eq(workspaceMembers.isDefault, true),
          isNull(workspaces.deletedAt)
        )
      )
      .limit(1);

    if (defaultMembership) {
      return defaultMembership.workspace_member.workspaceId;
    }

    // Get first available workspace for user
    const [anyMembership] = await db
      .select()
      .from(workspaceMembers)
      .innerJoin(workspaces, eq(workspaceMembers.workspaceId, workspaces.id))
      .where(
        and(eq(workspaceMembers.userId, userId), isNull(workspaces.deletedAt))
      )
      .limit(1);

    if (anyMembership) {
      return anyMembership.workspace_member.workspaceId;
    }
  }

  // No valid workspace found - get or create default workspace
  return await getOrCreateDefaultWorkspace(userId);
}

/**
 * Get or create a default workspace
 * Used for initial setup or when no workspace is selected
 */
async function getOrCreateDefaultWorkspace(userId: string | null): Promise<number> {
  // Try to find existing default workspace
  const existingWorkspaces = await db
    .select()
    .from(workspaces)
    .where(isNull(workspaces.deletedAt))
    .limit(1);

  if (existingWorkspaces.length > 0) {
    const workspace = existingWorkspaces[0];

    // If user is logged in, ensure they have membership
    if (userId) {
      const [existingMembership] = await db
        .select()
        .from(workspaceMembers)
        .where(
          and(
            eq(workspaceMembers.userId, userId),
            eq(workspaceMembers.workspaceId, workspace.id)
          )
        )
        .limit(1);

      if (!existingMembership) {
        // Add user as owner of existing workspace
        await db.insert(workspaceMembers).values({
          workspaceId: workspace.id,
          userId: userId,
          role: "owner",
          isDefault: true,
        });

        // Update workspace owner if not set
        if (!workspace.ownerId) {
          await db
            .update(workspaces)
            .set({ ownerId: userId })
            .where(eq(workspaces.id, workspace.id));
        }
      }
    }

    return workspace.id;
  }

  // Create default workspace
  const [newWorkspace] = await db
    .insert(workspaces)
    .values({
      displayName: "Personal",
      slug: "personal",
      ownerId: userId,
      preferences: JSON.stringify({
        locale: "en-US",
        currency: "USD",
        dateFormat: "MM/DD/YYYY",
        theme: "system",
      }),
    })
    .returning();

  // If user is logged in, add them as owner
  if (userId) {
    await db.insert(workspaceMembers).values({
      workspaceId: newWorkspace.id,
      userId: userId,
      role: "owner",
      isDefault: true,
    });
  }

  return newWorkspace.id;
}

/**
 * Create tRPC context with user and workspace isolation
 */
export async function createContext(event: RequestEvent) {
  const userId = await getCurrentUserId(event);
  const workspaceId = await getCurrentWorkspaceId(event, userId);

  return {
    db,
    userId,
    workspaceId,
    event,
  };
}

export type Context = Awaited<ReturnType<typeof createContext>> & {
  isTest?: boolean | undefined;
};
