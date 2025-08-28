import {
  categories,
  insertCategorySchema,
  removeCategoriesSchema,
  removeCategorySchema,
} from "$lib/schema";
import { eq, sql, isNull } from "drizzle-orm";
import { publicProcedure } from "../orpc";
import { z } from "zod";
import { ORPCError } from "@orpc/server";

export const categoriesRoutes = {
  all: publicProcedure.handler(async ({ context }) => {
    return await context.db.select().from(categories).where(isNull(categories.deletedAt));
  }),

  load: publicProcedure
    .input(z.object({ id: z.coerce.number() }))
    .handler(async ({ input, context }) => {
      const result = await context.db.query.categories.findMany({
        where: sql`${categories.id} = ${input.id} AND ${categories.deletedAt} IS NULL`,
      });
      if (!result[0]) {
        throw new ORPCError("NOT_FOUND", {
          message: "Category not found",
        });
      }
      return result[0];
    }),

  remove: publicProcedure.input(removeCategorySchema).handler(async ({ input, context }) => {
    if (!input) {
      throw new ORPCError("BAD_REQUEST", {
        message: "Category ID is required for deletion",
      });
    }
    const result = await context.db
      .update(categories)
      .set({ deletedAt: sql`CURRENT_TIMESTAMP` })
      .where(eq(categories.id, input.id))
      .returning();
    if (!result[0]) {
      throw new ORPCError("NOT_FOUND", {
        message: "Category not found or could not be deleted",
      });
    }
    return result[0];
  }),

  delete: publicProcedure.input(removeCategoriesSchema).handler(async ({ input, context }) => {
    return await context.db
      .update(categories)
      .set({ deletedAt: sql`CURRENT_TIMESTAMP` })
      .where(sql`${categories.id} in ${input.entities}`)
      .returning();
  }),

  save: publicProcedure.input(insertCategorySchema).handler(async ({ input, context }) => {
    const { id, name, notes } = input;
    let entities;
    if (id) {
      entities = await context.db
        .update(categories)
        .set({
          name,
          notes,
        })
        .where(eq(categories.id, id))
        .returning();
    } else {
      entities = await context.db
        .insert(categories)
        .values({
          name,
          notes,
        })
        .returning();
    }
    if (!entities[0]) {
      throw new ORPCError("INTERNAL_SERVER_ERROR", {
        message: "Failed to save category",
      });
    }
    const entity = entities[0];
    (entity as any).is_new = !!id;
    return entity;
  }),
};
