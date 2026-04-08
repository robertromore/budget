import { workspaces } from "$core/schema/workspaces";
import { workspaceMembers } from "$core/schema/workspace-members";
import { users } from "$core/schema/users";
import { sessions } from "$core/schema/auth";
import { db } from "$core/server/db";
import { auth } from "$core/server/auth";
import { generateUniqueSlugForDB } from "$core/utils/slug-utils";
import { and, eq, isNull } from "drizzle-orm";

/**
 * Cookie options for the RequestAdapter
 */
export interface CookieOptions {
  path?: string;
  maxAge?: number;
  sameSite?: "strict" | "lax" | "none";
  httpOnly?: boolean;
  secure?: boolean;
  domain?: string;
  expires?: Date;
}

/**
 * Pre-authenticated identity for bypassing cookie-based session lookup.
 * Used in desktop mode where the session is established server-side.
 * `sessionToken` is the raw session token returned by Better Auth's
 * signInEmail endpoint — the database session ID is resolved from it.
 */
export interface PreAuthContext {
  userId: string;
  sessionToken: string;
}

/**
 * Platform-agnostic request adapter.
 *
 * Abstracts cookie/header access so the tRPC context layer works with
 * SvelteKit, Bun.serve, or any other HTTP runtime.
 */
export interface RequestAdapter {
  headers: Headers;
  getCookie(name: string): string | undefined;
  setCookie(name: string, value: string, options: CookieOptions): void;
  /** Pre-authenticated identity, bypasses cookie-based session lookup. */
  preAuth?: PreAuthContext;
}

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
async function getSessionInfo(headers: Headers): Promise<SessionInfo> {
  try {
    const session = await auth.api.getSession({ headers });

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
async function getCurrentWorkspaceId(
  workspaceIdCookie: string | undefined,
  userId: string | null
): Promise<number> {
  // Unauthenticated requests should never get workspace access.
  if (!userId) {
    return 0;
  }

  // First, check cookie for workspace selection
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
 * Resolve the database session ID from a Better Auth session token.
 */
async function resolveSessionId(token: string): Promise<string | null> {
  const [row] = await db
    .select({ id: sessions.id })
    .from(sessions)
    .where(eq(sessions.token, token))
    .limit(1);
  return row?.id ?? null;
}

/**
 * Create tRPC context with user and workspace isolation.
 *
 * When `preAuth` is provided (second argument or via `request.preAuth`),
 * the cookie-based session lookup is skipped. The session token is used
 * directly as the session identifier — it's unique and satisfies the
 * isAuthenticated middleware without a DB round-trip.
 */
export async function createContext(request: RequestAdapter, preAuth?: PreAuthContext) {
  const effectivePreAuth = preAuth ?? request.preAuth;
  let userId: string | null;
  let sessionId: string | null;

  if (effectivePreAuth) {
    userId = effectivePreAuth.userId;
    sessionId = effectivePreAuth.sessionToken;
  } else {
    ({ userId, sessionId } = await getSessionInfo(request.headers));
  }
  const workspaceId = await getCurrentWorkspaceId(request.getCookie("workspaceId"), userId);

  return {
    db,
    userId,
    sessionId,
    workspaceId,
    request,
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
