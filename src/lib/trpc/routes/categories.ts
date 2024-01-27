import { categories } from '$lib/schema';
import { publicProcedure, t } from '../t';

export const categoriesRoutes = t.router({
  all: publicProcedure.query(async ({ ctx }) => {
    return await ctx.db.select().from(categories);
  }),
});
