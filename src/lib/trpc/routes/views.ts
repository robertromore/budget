import { eq, inArray } from "drizzle-orm";
import { publicProcedure, rateLimitedProcedure, bulkOperationProcedure, t } from "$lib/trpc";
import { z } from "zod";
import { TRPCError } from "@trpc/server";
import {
  removeViewSchema,
  removeViewsSchema,
  insertViewSchema,
  views,
} from "$lib/schema";

export const viewsRoutes = t.router({
  all: publicProcedure.query(async ({ ctx }) => {
    return await ctx.db.select().from(views);
    // return (await ctx.db.select().from(views)).map((view) => {
    //   return Object.assign({}, view, {
    //     filters: new SvelteMap(view.filters?.map((filter) => [filter.column, filter]))
    //   });
    // });
  }),
  load: publicProcedure.input(z.object({ id: z.coerce.number() })).query(async ({ ctx, input }) => {
    const result = await ctx.db.query.views.findMany({
      where: eq(views.id, input.id),
    });
    if (!result[0]) {
      throw new TRPCError({
        code: "NOT_FOUND",
        message: "View not found",
      });
    }
    return result[0];
  }),
  remove: rateLimitedProcedure.input(removeViewSchema).mutation(async ({ ctx, input }) => {
    if (!input) {
      throw new TRPCError({
        code: "BAD_REQUEST",
        message: "View ID is required for deletion",
      });
    }
    const result = await ctx.db.delete(views).where(eq(views.id, input.id)).returning();
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
    .mutation(async ({ input: { entities }, ctx: { db } }) => {
      return await db.delete(views).where(inArray(views.id, entities)).returning();
    }),
  save: rateLimitedProcedure
    .input(insertViewSchema)
    .mutation(async ({ input: { id, name, description, icon, filters, display, dirty }, ctx: { db } }) => {
      // Transform display object to match database schema
      const transformedDisplay = display ? {
        ...display,
        expanded: display.expanded === true ? {} : display.expanded,
        visibility: display.visibility === true ? {} : display.visibility,
      } : display;
      let entities;
      if (id) {
        entities = await db
          .update(views)
          .set({
            name,
            description,
            icon,
            filters,
            display: transformedDisplay,
            dirty,
          })
          .where(eq(views.id, id))
          .returning();
      } else {
        entities = await db
          .insert(views)
          .values({
            name,
            description,
            icon,
            filters,
            display: transformedDisplay,
            dirty,
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
    }),
});
