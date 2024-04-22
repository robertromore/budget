import { insertPayeeSchema, payees, removePayeeSchema, removePayeesSchema } from '$lib/schema';
import { z } from 'zod';
import { publicProcedure, t } from '../t';
import { eq, sql } from 'drizzle-orm';

export const payeeRoutes = t.router({
  all: publicProcedure.query(async ({ ctx }) => {
    return await ctx.db.select().from(payees);
  }),
  load: publicProcedure.input(z.object({ id: z.coerce.number() })).query(async ({ ctx, input }) => {
    return (
      await ctx.db.query.payees.findMany({
        where: eq(payees.id, input.id)
      })
    )[0];
  }),
  remove: publicProcedure.input(removePayeeSchema).mutation(async ({ ctx, input }) => {
    if (!input) throw new Error("id can't be null when deleting a payee");
    return (await ctx.db.delete(payees).where(eq(payees.id, input.id)).returning())[0];
  }),
  delete: publicProcedure
    .input(removePayeesSchema)
    .mutation(async ({ input: { entities }, ctx: { db } }) => {
      return await db
        .delete(payees)
        .where(sql`${payees.id} in ${entities}`)
        .returning();
    }),
  save: publicProcedure
    .input(insertPayeeSchema)
    .mutation(async ({ input: { id, name, notes }, ctx: { db } }) => {
      if (id) {
        return await db
          .update(payees)
          .set({
            name,
            notes
          })
          .where(eq(payees.id, id))
          .returning();
      }
      return (
        await db
          .insert(payees)
          .values({
            name,
            notes
          })
          .returning()
      )[0];
    })
});
