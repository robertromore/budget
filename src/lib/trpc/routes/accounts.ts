import { accounts, insertAccountSchema, removeAccountSchema } from "$lib/schema";
import { z } from "zod";
import { publicProcedure, t } from "../t";
import { eq } from "drizzle-orm";
import slugify from '@sindresorhus/slugify';

export const accountRoutes = t.router({
	all: publicProcedure.query(async ({ ctx }) => {
		return await ctx.db.select().from(accounts);
	}),
	load: publicProcedure.input(z.object({ id: z.coerce.number() })).query(async ({ ctx, input }) => {
    return (await ctx.db.query.accounts.findMany({
      where: eq(accounts.id, input.id),
      with: {
        transactions: {
          with: {
            payee: true,
            category: true
          }
        }
      },
    }))[0];
	}),
	save: publicProcedure.input(insertAccountSchema).mutation(async ({ ctx, input }) => {
    if (input.id) {
      return (await ctx.db.update(accounts).set(input).where(eq(accounts.id, input.id)).returning())[0];
    }

    const defaults = {
      slug: slugify(input.name)
    };
    const merged = {
      ...defaults,
      ...input
    };
		return (await ctx.db.insert(accounts).values(merged).returning())[0];
	}),
	remove: publicProcedure.input(removeAccountSchema).mutation(async ({ ctx, input }) => {
		if (!input) throw new Error("id can't be null when deleting an account");
		return (await ctx.db.delete(accounts).where(eq(accounts.id, input.id)).returning())[0];
	})
});
