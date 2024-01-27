import { payees } from '$lib/schema';
import { publicProcedure, t } from '../t';

export const payeeRoutes = t.router({
  all: publicProcedure.query(async ({ ctx }) => {
    return await ctx.db.select().from(payees);
  }),
});
