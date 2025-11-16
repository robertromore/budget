import {t, publicProcedure} from "$lib/trpc";
import {workspaces} from "$lib/schema/workspaces";
import {formInsertWorkspaceSchema} from "$lib/schema/workspaces";
import {eq, and, isNull} from "drizzle-orm";
import {z} from "zod/v4";
import {TRPCError} from "@trpc/server";

export const workspaceRoutes = t.router({
  /**
   * Get current workspace (from context)
   */
  getCurrent: publicProcedure.query(async ({ctx}) => {
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
   * List all workspaces
   */
  list: publicProcedure.query(async ({ctx}) => {
    return await ctx.db
      .select()
      .from(workspaces)
      .where(isNull(workspaces.deletedAt))
      .orderBy(workspaces.displayName);
  }),

  /**
   * Create new workspace
   */
  create: publicProcedure.input(formInsertWorkspaceSchema).mutation(async ({ctx, input}) => {
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
    .input(z.object({workspaceId: z.number()}))
    .mutation(async ({ctx, input}) => {
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

      // Set cookie (expires in 1 year)
      ctx.event.cookies.set("userId", input.workspaceId.toString(), {
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
        preferences: z.record(z.any()),
      })
    )
    .mutation(async ({ctx, input}) => {
      const [updated] = await ctx.db
        .update(workspaces)
        .set({
          preferences: JSON.stringify(input.preferences),
          updatedAt: new Date().toISOString(),
        })
        .where(eq(workspaces.id, input.workspaceId))
        .returning();

      return updated;
    }),

  /**
   * Delete workspace (soft delete)
   */
  delete: publicProcedure
    .input(z.object({workspaceId: z.number()}))
    .mutation(async ({ctx, input}) => {
      // Prevent deleting the current workspace
      if (input.workspaceId === ctx.workspaceId) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Cannot delete the currently active workspace",
        });
      }

      // Soft delete
      await ctx.db
        .update(workspaces)
        .set({
          deletedAt: new Date().toISOString(),
        })
        .where(eq(workspaces.id, input.workspaceId));

      return {success: true};
    }),
});
