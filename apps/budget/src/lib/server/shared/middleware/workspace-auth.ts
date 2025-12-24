import type { WorkspaceRole } from "$lib/schema/workspace-members";
import { workspaceMembers } from "$lib/schema/workspace-members";
import type { Permission } from "$lib/server/config/permissions";
import { roleHasPermission } from "$lib/server/config/permissions";
import { ForbiddenError, UnauthorizedError } from "$lib/server/shared/types";
import type { Context } from "$lib/trpc/context";
import { t } from "$lib/trpc/t";
import { and, eq } from "drizzle-orm";

/**
 * Extended context after workspace authentication
 */
export interface WorkspaceAuthContext extends Context {
  membership: {
    id: number;
    userId: string;
    workspaceId: number;
    role: WorkspaceRole;
  };
}

/**
 * Get user's membership in a workspace
 */
async function getMembershipForUser(
  db: Context["db"],
  userId: string,
  workspaceId: number
) {
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
  return membership;
}

/**
 * Middleware that requires valid workspace membership
 *
 * Validates that:
 * 1. User is authenticated
 * 2. Workspace is selected
 * 3. User is a member of the workspace
 *
 * Adds membership info to context
 */
export const requireWorkspaceMembership = t.middleware(async ({ ctx, next }) => {
  if (!ctx.workspaceId) {
    throw new UnauthorizedError("No workspace selected");
  }

  if (!ctx.userId) {
    throw new UnauthorizedError("Authentication required");
  }

  // Get user's membership in this workspace
  const membership = await getMembershipForUser(ctx.db, ctx.userId, ctx.workspaceId);

  if (!membership) {
    throw new ForbiddenError("You are not a member of this workspace");
  }

  return next({
    ctx: {
      ...ctx,
      membership: {
        id: membership.id,
        userId: ctx.userId,
        workspaceId: ctx.workspaceId,
        role: membership.role as WorkspaceRole,
      },
    } as WorkspaceAuthContext,
  });
});

/**
 * Middleware factory for permission-based authorization
 *
 * @param permission - The permission required to proceed
 */
export const requirePermission = (permission: Permission) =>
  t.middleware(async ({ ctx, next }) => {
    const authCtx = ctx as WorkspaceAuthContext;

    if (!authCtx.membership) {
      throw new UnauthorizedError("Workspace membership required");
    }

    if (!roleHasPermission(authCtx.membership.role, permission)) {
      throw new ForbiddenError(`Permission '${permission}' required for this action`);
    }

    return next({ ctx });
  });

/**
 * Middleware that requires specific roles
 *
 * @param roles - Single role or array of roles that are allowed
 */
export const requireRole = (roles: WorkspaceRole | WorkspaceRole[]) =>
  t.middleware(async ({ ctx, next }) => {
    const authCtx = ctx as WorkspaceAuthContext;

    if (!authCtx.membership) {
      throw new UnauthorizedError("Workspace membership required");
    }

    const allowedRoles = Array.isArray(roles) ? roles : [roles];

    if (!allowedRoles.includes(authCtx.membership.role)) {
      throw new ForbiddenError(`Role '${allowedRoles.join(" or ")}' required`);
    }

    return next({ ctx });
  });

// Convenience middlewares for common role checks
export const requireOwner = requireRole("owner");
export const requireAdmin = requireRole(["owner", "admin"]);
export const requireEditor = requireRole(["owner", "admin", "editor"]);

/**
 * Middleware that requires user to be authenticated (any role)
 * Use this for routes that need authentication but not specific permissions
 */
export const requireAuthenticated = t.middleware(async ({ ctx, next }) => {
  if (!ctx.userId) {
    throw new UnauthorizedError("Authentication required");
  }

  return next({ ctx });
});
