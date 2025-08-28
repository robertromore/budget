import { eq, sql } from "drizzle-orm";
import { publicProcedure } from "../orpc";
import { z } from "zod";
import { ORPCError } from "@orpc/server";
import { insertViewSchema, removeViewSchema, removeViewsSchema, views } from "$lib/schema";

export const viewsRoutes = {
  all: publicProcedure.handler(async ({ context }) => {
    return await context.db.select().from(views);
  }),

  load: publicProcedure
    .input(z.object({ id: z.coerce.number() }))
    .handler(async ({ input, context }) => {
      const result = await context.db.query.views.findMany({
        where: eq(views.id, input.id),
      });
      if (!result[0]) {
        throw new ORPCError("NOT_FOUND", {
          message: "View not found",
        });
      }
      return result[0];
    }),

  remove: publicProcedure.input(removeViewSchema).handler(async ({ input, context }) => {
    if (!input) {
      throw new ORPCError("BAD_REQUEST", {
        message: "View ID is required for deletion",
      });
    }
    const result = await context.db.delete(views).where(eq(views.id, input.id)).returning();
    if (!result[0]) {
      throw new ORPCError("NOT_FOUND", {
        message: "View not found or could not be deleted",
      });
    }
    return result[0];
  }),

  delete: publicProcedure.input(removeViewsSchema).handler(async ({ input, context }) => {
    return await context.db
      .delete(views)
      .where(sql`${views.id} in ${input.entities}`)
      .returning();
  }),

  save: publicProcedure.input(insertViewSchema).handler(async ({ input, context }) => {
    const { id, name, description, icon, filters, display } = input;
    let entities;
    if (id) {
      entities = await context.db
        .update(views)
        .set({
          name,
          description,
          icon,
          filters,
          // Simplified display handling to avoid type issues
          display: display as any,
        })
        .where(eq(views.id, id))
        .returning();
    } else {
      entities = await context.db
        .insert(views)
        .values({
          name,
          description,
          icon,
          filters,
          // Simplified display handling to avoid type issues
          display: display as any,
        })
        .returning();
    }
    if (!entities[0]) {
      throw new ORPCError("INTERNAL_SERVER_ERROR", {
        message: "Failed to save view",
      });
    }
    const entity = entities[0];
    return entity;
  }),
};
