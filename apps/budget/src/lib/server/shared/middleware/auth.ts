import { initTRPC } from "@trpc/server";
import type { Context } from "$lib/trpc/context";
import { UnauthorizedError, ForbiddenError } from "$lib/server/shared/types";
import type { Permission, UserRole } from "$lib/server/config/auth";

// Initialize tRPC for middleware creation
const t = initTRPC.context<Context>().create();

/**
 * Authentication middleware - requires valid user session
 */
export const requireAuth = t.middleware(async ({ ctx, next }) => {
  // Skip auth for tests
  if ((ctx as any).isTest) {
    return next({
      ctx: {
        ...ctx,
        user: { id: "test-user", role: "admin" as UserRole },
      },
    });
  }

  if (!ctx.session?.user) {
    throw new UnauthorizedError("Authentication required");
  }

  return next({
    ctx: {
      ...ctx,
      user: ctx.session.user,
    },
  });
});

/**
 * Permission-based authorization middleware
 */
export const requirePermission = (permission: Permission) =>
  t.middleware(async ({ ctx, next }) => {
    // This middleware should be used after requireAuth
    if (!ctx.user) {
      throw new UnauthorizedError("Authentication required");
    }

    // Check if user has required permission
    if (!hasPermission(ctx.user, permission)) {
      throw new ForbiddenError(`Permission '${permission}' required`);
    }

    return next({ ctx });
  });

/**
 * Role-based authorization middleware
 */
export const requireRole = (role: UserRole | UserRole[]) =>
  t.middleware(async ({ ctx, next }) => {
    // This middleware should be used after requireAuth
    if (!ctx.user) {
      throw new UnauthorizedError("Authentication required");
    }

    const requiredRoles = Array.isArray(role) ? role : [role];
    if (!requiredRoles.includes(ctx.user.role)) {
      throw new ForbiddenError(`Role '${requiredRoles.join(" or ")}' required`);
    }

    return next({ ctx });
  });

/**
 * Admin-only middleware
 */
export const requireAdmin = requireRole("admin");

// Helper function to check permissions
function hasPermission(user: any, permission: Permission): boolean {
  // Simple role-based permission check
  // In a real app, you might have more complex permission logic
  const userRole = user.role as UserRole;

  switch (userRole) {
    case "admin":
      return true; // Admin has all permissions
    case "user":
      return !permission.includes("delete"); // Users can't delete
    case "readonly":
      return permission.includes("read"); // Readonly users can only read
    default:
      return false;
  }
}
