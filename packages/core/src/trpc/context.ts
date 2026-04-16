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
 * In-process cache for resolved workspace IDs.
 *
 * Key is `userId:cookie` (or `userId:` when no cookie is present). Every tRPC
 * call previously made 1–3 DB round-trips to resolve the workspace; under a
 * typical page load that's dozens of extra queries. Caching with a short TTL
 * collapses repeated lookups to a single hit.
 *
 * The cache is invalidated:
 *   - implicitly by TTL (short window, 30s default),
 *   - by `invalidateWorkspaceCacheForUser(userId)` when membership / default
 *     workspace changes (called from routes that mutate workspace_members).
 *
 * Entries are also evicted if the store grows beyond a reasonable cap so a
 * flood of distinct session IDs can't balloon memory.
 */
interface WorkspaceCacheEntry {
  workspaceId: number;
  expiresAt: number;
}

const WORKSPACE_CACHE_TTL_MS = 30_000;
const WORKSPACE_CACHE_MAX_ENTRIES = 10_000;
const workspaceCache = new Map<string, WorkspaceCacheEntry>();

function workspaceCacheKey(userId: string, cookie: string | undefined): string {
  return `${userId}:${cookie ?? ""}`;
}

/**
 * Drop all cached workspace resolutions for a user. Call after any change to
 * workspace_members or workspace default assignments so the next request sees
 * fresh data.
 */
export function invalidateWorkspaceCacheForUser(userId: string): void {
  const prefix = `${userId}:`;
  for (const key of workspaceCache.keys()) {
    if (key.startsWith(prefix)) {
      workspaceCache.delete(key);
    }
  }
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

  const cacheKey = workspaceCacheKey(userId, workspaceIdCookie);
  const now = Date.now();
  const cached = workspaceCache.get(cacheKey);
  if (cached && cached.expiresAt > now) {
    return cached.workspaceId;
  }

  const resolved = await resolveWorkspaceIdFromDb(workspaceIdCookie, userId);

  // Bound the cache — drop the oldest entries if we exceed the cap.
  if (workspaceCache.size >= WORKSPACE_CACHE_MAX_ENTRIES) {
    const excess = workspaceCache.size - WORKSPACE_CACHE_MAX_ENTRIES + 1;
    let dropped = 0;
    for (const key of workspaceCache.keys()) {
      if (dropped >= excess) break;
      workspaceCache.delete(key);
      dropped++;
    }
  }
  workspaceCache.set(cacheKey, {
    workspaceId: resolved,
    expiresAt: now + WORKSPACE_CACHE_TTL_MS,
  });
  return resolved;
}

/**
 * Perform the actual DB lookup chain. Extracted from `getCurrentWorkspaceId`
 * so the caching wrapper stays small.
 */
async function resolveWorkspaceIdFromDb(
  workspaceIdCookie: string | undefined,
  userId: string
): Promise<number> {
  // First, check cookie for workspace selection. Accept the cookie only if it
  // parses as a positive integer with no trailing characters — `parseInt` on
  // its own happily returns 123 for "123abc" which would let a malformed
  // cookie leak into downstream queries.
  if (workspaceIdCookie && /^[1-9]\d*$/.test(workspaceIdCookie)) {
    const workspaceId = Number(workspaceIdCookie);
    if (Number.isSafeInteger(workspaceId)) {
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
      // Keep the in-process workspace-resolution cache consistent with this
      // direct insert (the repository layer invalidates automatically, but
      // this path bypasses it).
      invalidateWorkspaceCacheForUser(userId);
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
  invalidateWorkspaceCacheForUser(userId);

  return newWorkspace.id;
}

/**
 * Resolve and verify a Better Auth session token.
 *
 * Returns the database session ID and the session's actual userId, or null
 * if the token is unknown or the session has expired. The caller must
 * cross-check the claimed userId against `session.userId` — never trust a
 * userId supplied alongside the token.
 */
async function resolveSession(
  token: string
): Promise<{ sessionId: string; userId: string } | null> {
  const [row] = await db
    .select({ id: sessions.id, userId: sessions.userId, expiresAt: sessions.expiresAt })
    .from(sessions)
    .where(eq(sessions.token, token))
    .limit(1);

  if (!row) return null;

  // Reject expired sessions. `expiresAt` is a Date (drizzle timestamp mode).
  const expiresAtMs =
    row.expiresAt instanceof Date ? row.expiresAt.getTime() : Number(row.expiresAt);
  if (!Number.isFinite(expiresAtMs) || expiresAtMs <= Date.now()) {
    return null;
  }

  return { sessionId: row.id, userId: row.userId };
}

/**
 * Create tRPC context with user and workspace isolation.
 *
 * When `preAuth` is provided (second argument or via `request.preAuth`),
 * the cookie-based session lookup is skipped, but the supplied session
 * token is still validated against the `sessions` table and the supplied
 * userId is cross-checked against the session's owner. Mismatched or
 * expired tokens fall through to an unauthenticated context — the caller
 * must never be able to impersonate a user by forging `preAuth.userId`.
 */
export async function createContext(request: RequestAdapter, preAuth?: PreAuthContext) {
  const effectivePreAuth = preAuth ?? request.preAuth;
  let userId: string | null;
  let sessionId: string | null;

  if (effectivePreAuth) {
    const resolved = await resolveSession(effectivePreAuth.sessionToken);
    if (resolved && resolved.userId === effectivePreAuth.userId) {
      // Also verify the user record still exists (handles deleted accounts).
      const userExists = await verifyUserExists(resolved.userId);
      if (userExists) {
        userId = resolved.userId;
        sessionId = resolved.sessionId;
      } else {
        userId = null;
        sessionId = null;
      }
    } else {
      // Unknown / expired token, or userId does not match the session's
      // actual owner. Drop to unauthenticated rather than trusting the
      // client-supplied identity.
      userId = null;
      sessionId = null;
    }
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
