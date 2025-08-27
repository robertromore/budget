import {
  categories,
  insertCategorySchema,
  removeCategoriesSchema,
  removeCategorySchema,
  type Category,
} from "$lib/schema";
import { eq, sql, isNull } from "drizzle-orm";
import { publicProcedure, t } from "../t";
import { z } from "zod";
import { TRPCError } from "@trpc/server";

export const categoriesRoutes = t.router({
  all: publicProcedure.query(async ({ ctx }) => {
    return await ctx.db.select().from(categories).where(isNull(categories.deletedAt));
  }),
  load: publicProcedure.input(z.object({ id: z.coerce.number() })).query(async ({ ctx, input }) => {
    const result = await ctx.db.query.categories.findMany({
      where: sql`${categories.id} = ${input.id} AND ${categories.deletedAt} IS NULL`,
    });
    if (!result[0]) {
      throw new TRPCError({
        code: "NOT_FOUND",
        message: "Category not found",
      });
    }
    return result[0];
  }),
  remove: publicProcedure.input(removeCategorySchema).mutation(async ({ ctx, input }) => {
    if (!input) {
      throw new TRPCError({
        code: "BAD_REQUEST",
        message: "Category ID is required for deletion",
      });
    }
    const result = await ctx.db.update(categories)
      .set({ deletedAt: sql`CURRENT_TIMESTAMP` })
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
  delete: publicProcedure
    .input(removeCategoriesSchema)
    .mutation(async ({ input: { entities }, ctx: { db } }) => {
      return await db
        .update(categories)
        .set({ deletedAt: sql`CURRENT_TIMESTAMP` })
        .where(sql`${categories.id} in ${entities}`)
        .returning();
    }),
  save: publicProcedure
    .input(insertCategorySchema)
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
