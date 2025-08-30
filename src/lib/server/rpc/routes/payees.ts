import {
  payees,
  removePayeeSchema,
  removePayeesSchema,
  type Payee,
  payeeFormSchema,
} from "$lib/schema";
import { z } from "zod/v4";
import { publicProcedure } from "../orpc";
import { eq, sql, inArray, isNull } from "drizzle-orm";
import { ORPCError } from "@orpc/server";

export const payeesRoutes = {
  all: publicProcedure.handler(async ({ context }) => {
    return (await context.db.query.payees.findMany({
      where: isNull(payees.deletedAt),
      orderBy: [payees.name],
    })) as Payee[];
  }),

  load: publicProcedure
    .input(z.object({ id: z.coerce.number() }))
    .handler(async ({ input, context }) => {
      const payee = await context.db.query.payees.findFirst({
        where: sql`${payees.id} = ${input.id} AND ${payees.deletedAt} IS NULL`,
      });

      if (!payee) {
        throw new ORPCError("PAYEE_NOT_FOUND", {
          message: "Payee not found",
        });
      }

      return payee as Payee;
    }),

  save: publicProcedure.input(payeeFormSchema).handler(async ({ input, context }) => {
    if (input.id) {
      const result = await context.db
        .update(payees)
        .set(input)
        .where(eq(payees.id, input.id))
        .returning();
      if (!result[0]) {
        throw new ORPCError("INTERNAL_SERVER_ERROR", {
          message: "Failed to update payee",
        });
      }
      return result[0];
    }

    const insertResult = await context.db.insert(payees).values(input).returning();
    if (!insertResult[0]) {
      throw new ORPCError("INTERNAL_SERVER_ERROR", {
        message: "Failed to create payee",
      });
    }
    return insertResult[0];
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

  removeMany: publicProcedure.input(removePayeesSchema).handler(async ({ input, context }) => {
    if (!input?.entities?.length) {
      throw new ORPCError("BAD_REQUEST", {
        message: "Payee IDs are required for deletion",
      });
    }
    const result = await context.db
      .update(payees)
      .set({ deletedAt: sql`CURRENT_TIMESTAMP` })
      .where(inArray(payees.id, input.entities))
      .returning();
    if (!result.length) {
      throw new ORPCError("NOT_FOUND", {
        message: "Payees not found or could not be deleted",
      });
    }
    return result;
  }),
};