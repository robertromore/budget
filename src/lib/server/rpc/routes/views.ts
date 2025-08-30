import {
  views,
  removeViewSchema,
  removeViewsSchema,
  type View,
  viewFormSchema,
} from "$lib/schema";
import { z } from "zod/v4";
import { publicProcedure } from "../orpc";
import { eq, sql, inArray, isNull } from "drizzle-orm";
import { ORPCError } from "@orpc/server";

export const viewsRoutes = {
  all: publicProcedure.handler(async ({ context }) => {
    return (await context.db.query.views.findMany({
      orderBy: [views.name],
    })) as View[];
  }),

  load: publicProcedure
    .input(z.object({ id: z.coerce.number() }))
    .handler(async ({ input, context }) => {
      const view = await context.db.query.views.findFirst({
        where: sql`${views.id} = ${input.id}`,
      });

      if (!view) {
        throw new ORPCError("VIEW_NOT_FOUND", {
          message: "View not found",
        });
      }

      return view as View;
    }),

  save: publicProcedure.input(viewFormSchema).handler(async ({ input, context }) => {
    if (input.id) {
      const result = await context.db
        .update(views)
        .set(input)
        .where(eq(views.id, input.id))
        .returning();
      if (!result[0]) {
        throw new ORPCError("INTERNAL_SERVER_ERROR", {
          message: "Failed to update view",
        });
      }
      return result[0];
    }

    const insertResult = await context.db.insert(views).values(input).returning();
    if (!insertResult[0]) {
      throw new ORPCError("INTERNAL_SERVER_ERROR", {
        message: "Failed to create view",
      });
    }
    return insertResult[0];
  }),

  remove: publicProcedure.input(removeViewSchema).handler(async ({ input, context }) => {
    if (!input) {
      throw new ORPCError("BAD_REQUEST", {
        message: "View ID is required for deletion",
      });
    }
    const result = await context.db
      .delete(views)
      .where(eq(views.id, input.id))
      .returning();
    if (!result[0]) {
      throw new ORPCError("NOT_FOUND", {
        message: "View not found or could not be deleted",
      });
    }
    return result[0];
  }),

  removeMany: publicProcedure.input(removeViewsSchema).handler(async ({ input, context }) => {
    if (!input?.entities?.length) {
      throw new ORPCError("BAD_REQUEST", {
        message: "View IDs are required for deletion",
      });
    }
    const result = await context.db
      .delete(views)
      .where(inArray(views.id, input.entities))
      .returning();
    if (!result.length) {
      throw new ORPCError("NOT_FOUND", {
        message: "Views not found or could not be deleted",
      });
    }
    return result;
  }),
};