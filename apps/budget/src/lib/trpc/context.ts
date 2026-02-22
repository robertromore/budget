import { workspaces } from "$lib/schema/workspaces";
import { workspaceMembers } from "$lib/schema/workspace-members";
import { users } from "$lib/schema/users";
import { db } from "$lib/server/db";
import { auth } from "$lib/server/auth";
import { generateUniqueSlugForDB } from "$lib/utils/slug-utils";
import type { RequestEvent } from "@sveltejs/kit";
import { and, eq, isNull } from "drizzle-orm";

/**
 * Session info from Better Auth
 */
interface SessionInfo {
  userId: string | null;
  sessionId: string | null;
}

/**
 * Verify that a user actually exists in the database
 * This handles cases where session data refers to a deleted user
 */
async function verifyUserExists(userId: string): Promise<boolean> {
  const [user] = await db.select({ id: users.id }).from(users).where(eq(users.id, userId)).limit(1);

  return !!user;
}

/**
 * Get the current user ID and session ID from the Better Auth session
 * Validates that the user still exists in the database
 */
async function getSessionInfo(event: RequestEvent): Promise<SessionInfo> {
  try {
    const session = await auth.api.getSession({
      headers: event.request.headers,
    });

    if (session?.user?.id && session?.session?.id) {
      // Verify the user actually exists in the database
      // This handles cases where the user was deleted but the session cookie still exists
      const userExists = await verifyUserExists(session.user.id);
      if (!userExists) {
        // User was deleted - treat as unauthenticated
        return { userId: null, sessionId: null };
      }

      return {
        userId: session.user.id,
        sessionId: session.session.id,
      };
    }
  } catch {
    // Session retrieval failed, user is not authenticated
  }

  return { userId: null, sessionId: null };
}

/**
 * Get the current workspace ID from the request
 * Uses session-based membership and never provisions workspace access for unauthenticated users.
 */
async function getCurrentWorkspaceId(event: RequestEvent, userId: string | null): Promise<number> {
  // Unauthenticated requests should never get workspace access.
  if (!userId) {
    return 0;
  }

  // First, check cookie for workspace selection
  const workspaceIdCookie = event.cookies.get("workspaceId");

  if (workspaceIdCookie) {
    const workspaceId = parseInt(workspaceIdCookie);
    if (!isNaN(workspaceId)) {
      const [membership] = await db
        .select()
        .from(workspaceMembers)
        .where(
          and(eq(workspaceMembers.userId, userId), eq(workspaceMembers.workspaceId, workspaceId))
        )
        .limit(1);

      if (membership) {
        return workspaceId;
      }
    }
  }

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
    .where(and(eq(workspaceMembers.userId, userId), isNull(workspaces.deletedAt)))
    .limit(1);

  if (anyMembership) {
    return anyMembership.workspace_member.workspaceId;
  }

  // No valid workspace found - get or create default workspace
  return await getOrCreateDefaultWorkspace(userId);
}

/**
 * Get or create a default workspace
 * Used for initial setup or when no workspace is selected
 * Note: userId is already validated in getCurrentWorkspaceId, so we can trust it here
 */
async function getOrCreateDefaultWorkspace(userId: string): Promise<number> {
  // First, prefer a workspace explicitly owned by this user (if any).
  const [ownedWorkspace] = await db
    .select()
    .from(workspaces)
    .where(and(eq(workspaces.ownerId, userId), isNull(workspaces.deletedAt)))
    .limit(1);

  if (ownedWorkspace) {
    const [existingMembership] = await db
      .select()
      .from(workspaceMembers)
      .where(
        and(
          eq(workspaceMembers.userId, userId),
          eq(workspaceMembers.workspaceId, ownedWorkspace.id)
        )
      )
      .limit(1);

    if (!existingMembership) {
      await db.insert(workspaceMembers).values({
        workspaceId: ownedWorkspace.id,
        userId,
        role: "owner",
        isDefault: true,
      });
    }

    return ownedWorkspace.id;
  }

  // Create a user-specific personal workspace rather than assigning ownership
  // of an arbitrary existing workspace.
  const userSuffix = userId
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 12);
  const baseSlug = userSuffix ? `personal-${userSuffix}` : "personal";
  const slug = await generateUniqueSlugForDB(db, "workspaces", workspaces.slug, baseSlug, {
    deletedAtColumn: workspaces.deletedAt,
  });

  const [newWorkspace] = await db
    .insert(workspaces)
    .values({
      displayName: "Personal",
      slug,
      ownerId: userId,
      preferences: JSON.stringify({
        locale: "en-US",
        currency: "USD",
        dateFormat: "MM/DD/YYYY",
        theme: "system",
      }),
    })
    .returning();

  await db.insert(workspaceMembers).values({
    workspaceId: newWorkspace.id,
    userId,
    role: "owner",
    isDefault: true,
  });

  return newWorkspace.id;
}

/**
 * Create tRPC context with user and workspace isolation
 */
export async function createContext(event: RequestEvent) {
  const { userId, sessionId } = await getSessionInfo(event);
  const workspaceId = await getCurrentWorkspaceId(event, userId);

  return {
    db,
    userId,
    sessionId,
    workspaceId,
    event,
  };
}

export type Context = Awaited<ReturnType<typeof createContext>> & {
  isTest?: boolean | undefined;
};

/**
 * Context type for authenticated procedures
 * Used after isAuthenticated middleware narrows the types
 */
export type AuthenticatedContext = Omit<Context, "userId" | "sessionId"> & {
  userId: string;
  sessionId: string;
};
