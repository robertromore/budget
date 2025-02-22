import {
  categories,
  insertCategorySchema,
  removeCategoriesSchema,
  removeCategorySchema,
  type Category,
} from "$lib/schema";
import { eq, sql } from "drizzle-orm";
import { publicProcedure, t } from "../t";
import { z } from "zod";

export const categoriesRoutes = t.router({
  all: publicProcedure.query(async ({ ctx }) => {
    return await ctx.db.select().from(categories);
  }),
  load: publicProcedure.input(z.object({ id: z.coerce.number() })).query(async ({ ctx, input }) => {
    return (
      await ctx.db.query.categories.findMany({
        where: eq(categories.id, input.id),
      })
    )[0];
  }),
  remove: publicProcedure.input(removeCategorySchema).mutation(async ({ ctx, input }) => {
    if (!input) throw new Error("id can't be null when deleting a category");
    return (await ctx.db.delete(categories).where(eq(categories.id, input.id)).returning())[0];
  }),
  delete: publicProcedure
    .input(removeCategoriesSchema)
    .mutation(async ({ input: { entities }, ctx: { db } }) => {
      return await db
        .delete(categories)
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
      const entity = entities[0] as Category;
      entity.is_new = !!id;
      return entity;
    }),
});
