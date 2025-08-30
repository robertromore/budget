import {
  categories,
  formInsertCategorySchema,
  removeCategoriesSchema,
  removeCategorySchema,
  type Category,
} from "$lib/schema";
import { eq, isNull, inArray } from "drizzle-orm";
import { publicProcedure, rateLimitedProcedure, t } from "../t";
import { z } from "zod";
import { TRPCError } from "@trpc/server";

export const categoriesRoutes = t.router({
  all: publicProcedure.query(async ({ ctx }) => {
    return await ctx.db.select().from(categories).where(isNull(categories.deletedAt));
  }),
  load: publicProcedure.input(z.object({ id: z.coerce.number() })).query(async ({ ctx, input }) => {
    const result = await ctx.db.query.categories.findMany({
      where: (categories, { eq, and, isNull }) =>
        and(eq(categories.id, input.id), isNull(categories.deletedAt)),
    });
    if (!result[0]) {
      throw new TRPCError({
        code: "NOT_FOUND",
        message: "Category not found",
      });
    }
    return result[0];
  }),
  remove: rateLimitedProcedure.input(removeCategorySchema).mutation(async ({ ctx, input }) => {
    if (!input) {
      throw new TRPCError({
        code: "BAD_REQUEST",
        message: "Category ID is required for deletion",
      });
    }
    const result = await ctx.db
      .update(categories)
      .set({ deletedAt: new Date().toISOString() })
      .where(eq(categories.id, input.id))
      .returning();
    if (!result[0]) {
      throw new TRPCError({
        code: "NOT_FOUND",
        message: "Category not found or could not be deleted",
      });
    }
    return result[0];
  }),
  delete: rateLimitedProcedure
    .input(removeCategoriesSchema)
    .mutation(async ({ input: { entities }, ctx: { db } }) => {
      return await db
        .update(categories)
        .set({ deletedAt: new Date().toISOString() })
        .where(inArray(categories.id, entities))
        .returning();
    }),
  save: rateLimitedProcedure
    .input(formInsertCategorySchema)
    .mutation(async ({ input: { id, name, notes }, ctx: { db } }) => {
      let entities;
      if (id) {
        entities = await db
          .update(categories)
          .set({
            name,
            notes,
          })
          .where(eq(categories.id, id))
          .returning();
      } else {
        entities = await db
          .insert(categories)
          .values({
            name,
            notes,
          })
          .returning();
      }
      if (!entities[0]) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to save category",
        });
      }
      const entity = entities[0];
      (entity as any).is_new = !!id;
      return entity;
    }),
});
