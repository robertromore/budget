import { insertPayeeSchema, payees, removePayeeSchema, removePayeesSchema } from "$lib/schema";
import { z } from "zod";
import { publicProcedure } from "../orpc";
import { eq, sql, isNull } from "drizzle-orm";
import { ORPCError } from "@orpc/server";

export const payeesRoutes = {
  all: publicProcedure.handler(async ({ context }) => {
    return await context.db.select().from(payees).where(isNull(payees.deletedAt));
  }),

  load: publicProcedure
    .input(z.object({ id: z.coerce.number() }))
    .handler(async ({ input, context }) => {
      const result = await context.db.query.payees.findMany({
        where: sql`${payees.id} = ${input.id} AND ${payees.deletedAt} IS NULL`,
      });
      if (!result[0]) {
        throw new ORPCError("NOT_FOUND", {
          message: "Payee not found",
        });
      }
      return result[0];
    }),

  remove: publicProcedure.input(removePayeeSchema).handler(async ({ input, context }) => {
    if (!input) {
      throw new ORPCError("BAD_REQUEST", {
        message: "Payee ID is required for deletion",
      });
    }
    const result = await context.db
      .update(payees)
      .set({ deletedAt: sql`CURRENT_TIMESTAMP` })
      .where(eq(payees.id, input.id))
      .returning();
    if (!result[0]) {
      throw new ORPCError("NOT_FOUND", {
        message: "Payee not found or could not be deleted",
      });
    }
    return result[0];
  }),

  delete: publicProcedure.input(removePayeesSchema).handler(async ({ input, context }) => {
    return await context.db
      .update(payees)
      .set({ deletedAt: sql`CURRENT_TIMESTAMP` })
      .where(sql`${payees.id} in ${input.entities}`)
      .returning();
  }),

  save: publicProcedure.input(insertPayeeSchema).handler(async ({ input, context }) => {
    const { id, name, notes } = input;
    if (id) {
      const result = await context.db
        .update(payees)
        .set({
          name,
          notes,
        })
        .where(eq(payees.id, id))
        .returning();
      if (!result[0]) {
        throw new ORPCError("INTERNAL_SERVER_ERROR", {
          message: "Failed to update payee",
        });
      }
      return result[0];
    }
    const result = await context.db
      .insert(payees)
      .values({
        name,
        notes,
      })
      .returning();
    if (!result[0]) {
      throw new ORPCError("INTERNAL_SERVER_ERROR", {
        message: "Failed to create payee",
      });
    }
    return result[0];
  }),
};
