import { workspaceMembers } from "$lib/schema/workspace-members";
import { formInsertWorkspaceSchema, workspaces } from "$lib/schema/workspaces";
import { publicProcedure, t } from "$lib/trpc";
import { nowISOString } from "$lib/utils/dates";
import { TRPCError } from "@trpc/server";
import { and, eq, isNull } from "drizzle-orm";
import { z } from "zod/v4";

export const workspaceRoutes = t.router({
  /**
   * Get current workspace (from context)
   */
  getCurrent: publicProcedure.query(async ({ ctx }) => {
    const [workspace] = await ctx.db
      .select()
      .from(workspaces)
      .where(eq(workspaces.id, ctx.workspaceId))
      .limit(1);

    if (!workspace) {
      throw new TRPCError({
        code: "NOT_FOUND",
        message: "Current workspace not found",
      });
    }

    return workspace;
  }),

  /**
   * List workspaces the user has access to
   * For authenticated users: workspaces they're a member of
   * For unauthenticated users: all workspaces (backward compatibility during migration)
   */
  list: publicProcedure.query(async ({ ctx }) => {
    // If user is authenticated, only show workspaces they're a member of
    if (ctx.userId) {
      const results = await ctx.db
        .select({
          id: workspaces.id,
          cuid: workspaces.cuid,
          displayName: workspaces.displayName,
          slug: workspaces.slug,
          ownerId: workspaces.ownerId,
          preferences: workspaces.preferences,
          createdAt: workspaces.createdAt,
          updatedAt: workspaces.updatedAt,
          deletedAt: workspaces.deletedAt,
        })
        .from(workspaces)
        .innerJoin(workspaceMembers, eq(workspaceMembers.workspaceId, workspaces.id))
        .where(
          and(
            eq(workspaceMembers.userId, ctx.userId),
            isNull(workspaces.deletedAt)
          )
        )
        .orderBy(workspaces.displayName);

      return results;
    }

    // Fallback for unauthenticated access (backward compatibility)
    return await ctx.db
      .select()
      .from(workspaces)
      .where(isNull(workspaces.deletedAt))
      .orderBy(workspaces.displayName);
  }),

  /**
   * Create new workspace
   */
  create: publicProcedure.input(formInsertWorkspaceSchema).mutation(async ({ ctx, input }) => {
    // Check if slug is already taken
    const existing = await ctx.db
      .select()
      .from(workspaces)
      .where(eq(workspaces.slug, input.slug))
      .limit(1);

    if (existing.length > 0) {
      throw new TRPCError({
        code: "CONFLICT",
        message: "A workspace with this slug already exists",
      });
    }

    // Create workspace
    const [newWorkspace] = await ctx.db
      .insert(workspaces)
      .values({
        ...input,
        preferences: input.preferences ? JSON.stringify(input.preferences) : null,
      })
      .returning();

    return newWorkspace;
  }),

  /**
   * Switch to a different workspace
   * Sets a cookie to persist the selection
   */
  switchWorkspace: publicProcedure
    .input(z.object({ workspaceId: z.number() }))
    .mutation(async ({ ctx, input }) => {
      // Verify workspace exists
      const [workspace] = await ctx.db
        .select()
        .from(workspaces)
        .where(and(eq(workspaces.id, input.workspaceId), isNull(workspaces.deletedAt)))
        .limit(1);

      if (!workspace) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Workspace not found",
        });
      }

      // If user is authenticated, verify they have access to this workspace
      if (ctx.userId) {
        const [membership] = await ctx.db
          .select()
          .from(workspaceMembers)
          .where(
            and(
              eq(workspaceMembers.userId, ctx.userId),
              eq(workspaceMembers.workspaceId, input.workspaceId)
            )
          )
          .limit(1);

        if (!membership) {
          throw new TRPCError({
            code: "FORBIDDEN",
            message: "You do not have access to this workspace",
          });
        }
      }

      // Set cookie (expires in 1 year)
      ctx.event.cookies.set("workspaceId", input.workspaceId.toString(), {
        path: "/",
        maxAge: 60 * 60 * 24 * 365,
        sameSite: "strict",
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
      });

      return workspace;
    }),

  /**
   * Update workspace preferences
   */
  updatePreferences: publicProcedure
    .input(
      z.object({
        workspaceId: z.number(),
        preferences: z.record(z.string(), z.any()),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const [updated] = await ctx.db
        .update(workspaces)
        .set({
          preferences: JSON.stringify(input.preferences),
          updatedAt: nowISOString(),
        })
        .where(eq(workspaces.id, input.workspaceId))
        .returning();

      return updated;
    }),

  /**
   * Delete workspace (soft delete)
   * Only workspace owners can delete workspaces
   */
  delete: publicProcedure
    .input(z.object({ workspaceId: z.number() }))
    .mutation(async ({ ctx, input }) => {
      // Prevent deleting the current workspace
      if (input.workspaceId === ctx.workspaceId) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Cannot delete the currently active workspace",
        });
      }

      // If user is authenticated, verify they own this workspace
      if (ctx.userId) {
        const [membership] = await ctx.db
          .select()
          .from(workspaceMembers)
          .where(
            and(
              eq(workspaceMembers.userId, ctx.userId),
              eq(workspaceMembers.workspaceId, input.workspaceId),
              eq(workspaceMembers.role, "owner")
            )
          )
          .limit(1);

        if (!membership) {
          throw new TRPCError({
            code: "FORBIDDEN",
            message: "Only workspace owners can delete workspaces",
          });
        }
      }

      // Soft delete
      await ctx.db
        .update(workspaces)
        .set({
          deletedAt: nowISOString(),
        })
        .where(eq(workspaces.id, input.workspaceId));

      return { success: true };
    }),
});
