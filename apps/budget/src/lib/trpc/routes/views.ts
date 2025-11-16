import {and, eq, inArray} from "drizzle-orm";
import {publicProcedure, rateLimitedProcedure, bulkOperationProcedure, t} from "$lib/trpc";
import {z} from "zod";
import {TRPCError} from "@trpc/server";
import {removeViewSchema, removeViewsSchema, insertViewSchema, views} from "$lib/schema";

export const viewsRoutes = t.router({
  all: publicProcedure
    .input(
      z
        .object({
          entityType: z.enum(["transactions", "top_categories"]).optional(),
        })
        .optional()
    )
    .query(async ({ctx, input}) => {
      const whereClause = input?.entityType
        ? and(eq(views.workspaceId, ctx.workspaceId), eq(views.entityType, input.entityType))
        : eq(views.workspaceId, ctx.workspaceId);

      return await ctx.db.select().from(views).where(whereClause);
      // return (await ctx.db.select().from(views)).map((view) => {
      //   return Object.assign({}, view, {
      //     filters: new SvelteMap(view.filters?.map((filter) => [filter.column, filter]))
      //   });
      // });
    }),
  load: publicProcedure.input(z.object({id: z.coerce.number()})).query(async ({ctx, input}) => {
    const result = await ctx.db.query.views.findMany({
      where: (views, {eq, and}) =>
        and(eq(views.id, input.id), eq(views.workspaceId, ctx.workspaceId)),
    });
    if (!result[0]) {
      throw new TRPCError({
        code: "NOT_FOUND",
        message: "View not found",
      });
    }
    return result[0];
  }),
  remove: rateLimitedProcedure.input(removeViewSchema).mutation(async ({ctx, input}) => {
    if (!input) {
      throw new TRPCError({
        code: "BAD_REQUEST",
        message: "View ID is required for deletion",
      });
    }
    const result = await ctx.db
      .delete(views)
      .where(and(eq(views.id, input.id), eq(views.workspaceId, ctx.workspaceId)))
      .returning();
    if (!result[0]) {
      throw new TRPCError({
        code: "NOT_FOUND",
        message: "View not found or could not be deleted",
      });
    }
    return result[0];
  }),
  delete: bulkOperationProcedure
    .input(removeViewsSchema)
    .mutation(async ({input: {entities}, ctx}) => {
      return await ctx.db
        .delete(views)
        .where(and(inArray(views.id, entities), eq(views.workspaceId, ctx.workspaceId)))
        .returning();
    }),
  save: rateLimitedProcedure
    .input(insertViewSchema)
    .mutation(
      async ({input: {id, entityType, name, description, icon, filters, display, dirty}, ctx}) => {
        // Transform display object to match database schema
        const transformedDisplay = display
          ? {
              ...display,
              expanded: display.expanded === true ? {} : display.expanded,
              visibility: display.visibility === true ? {} : display.visibility,
            }
          : display;
        let entities;
        if (id) {
          entities = await ctx.db
            .update(views)
            .set({
              entityType,
              name,
              description,
              icon,
              filters,
              display: transformedDisplay,
              dirty,
            })
            .where(and(eq(views.id, id), eq(views.workspaceId, ctx.workspaceId)))
            .returning();
        } else {
          entities = await ctx.db
            .insert(views)
            .values({
              entityType,
              name,
              description,
              icon,
              filters,
              display: transformedDisplay,
              dirty,
              workspaceId: ctx.workspaceId,
            })
            .returning();
        }
        if (!entities[0]) {
          throw new TRPCError({
            code: "INTERNAL_SERVER_ERROR",
            message: "Failed to save view",
          });
        }
        const entity = entities[0];
        return entity;
      }
    ),
});
