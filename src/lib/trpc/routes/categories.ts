import { categories, insertCategorySchema, removeCategorySchema } from '$lib/schema';
import { eq } from 'drizzle-orm';
import { publicProcedure, t } from '../t';

export const categoriesRoutes = t.router({
  all: publicProcedure.query(async ({ ctx }) => {
    return await ctx.db.select().from(categories);
  }),
  save: publicProcedure.input(insertCategorySchema).mutation(async ({ ctx, input }) => {
    if (input.id) {
      return (
        await ctx.db.update(categories).set(input).where(eq(categories.id, input.id)).returning()
      )[0];
    }

    return (await ctx.db.insert(categories).values(input).returning())[0];
  }),
  remove: publicProcedure.input(removeCategorySchema).mutation(async ({ ctx, input }) => {
    if (!input) throw new Error("id can't be null when deleting an account");
    return (await ctx.db.delete(categories).where(eq(categories.id, input.id)).returning())[0];
  })
});
