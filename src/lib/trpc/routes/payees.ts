import { formInsertPayeeSchema, payees, removePayeeSchema, removePayeesSchema } from "$lib/schema";
import { z } from "zod";
import { publicProcedure, rateLimitedProcedure, bulkOperationProcedure, t } from "../t";
import { eq, isNull, inArray } from "drizzle-orm";
import { TRPCError } from "@trpc/server";

export const payeeRoutes = t.router({
  all: publicProcedure.query(async ({ ctx }) => {
    return await ctx.db.select().from(payees).where(isNull(payees.deletedAt));
  }),
  load: publicProcedure.input(z.object({ id: z.coerce.number() })).query(async ({ ctx, input }) => {
    const result = await ctx.db.query.payees.findMany({
      where: (payees, { eq, and, isNull }) =>
        and(eq(payees.id, input.id), isNull(payees.deletedAt)),
    });
    if (!result[0]) {
      throw new TRPCError({
        code: "NOT_FOUND",
        message: "Payee not found",
      });
    }
    return result[0];
  }),
  remove: rateLimitedProcedure.input(removePayeeSchema).mutation(async ({ ctx, input }) => {
    if (!input) {
      throw new TRPCError({
        code: "BAD_REQUEST",
        message: "Payee ID is required for deletion",
      });
    }
    const result = await ctx.db
      .update(payees)
      .set({ deletedAt: new Date().toISOString() })
      .where(eq(payees.id, input.id))
      .returning();
    if (!result[0]) {
      throw new TRPCError({
        code: "NOT_FOUND",
        message: "Payee not found or could not be deleted",
      });
    }
    return result[0];
  }),
  delete: bulkOperationProcedure
    .input(removePayeesSchema)
    .mutation(async ({ input: { entities }, ctx: { db } }) => {
      return await db
        .update(payees)
        .set({ deletedAt: new Date().toISOString() })
        .where(inArray(payees.id, entities))
        .returning();
    }),
  save: rateLimitedProcedure
    .input(formInsertPayeeSchema)
    .mutation(async ({ input: { id, name, notes }, ctx: { db } }) => {
      if (id) {
        const result = await db
          .update(payees)
          .set({
            name,
            notes,
          })
          .where(eq(payees.id, id))
          .returning();
        if (!result[0]) {
          throw new TRPCError({
            code: "INTERNAL_SERVER_ERROR",
            message: "Failed to update payee",
          });
        }
        return result[0];
      }
      const result = await db
        .insert(payees)
        .values({
          name,
          notes,
        })
        .returning();
      if (!result[0]) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to create payee",
        });
      }
      return result[0];
    }),
});
