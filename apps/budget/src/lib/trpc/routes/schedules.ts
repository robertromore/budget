import { schedules, removeScheduleSchema, formInsertScheduleSchema } from "$lib/schema";
import { z } from "zod";
import { publicProcedure, rateLimitedProcedure, t } from "$lib/trpc";
import { eq } from "drizzle-orm";
import { TRPCError } from "@trpc/server";

export const scheduleRoutes = t.router({
  all: publicProcedure.query(async ({ ctx }) => {
    return await ctx.db.query.schedules.findMany();
  }),
  load: publicProcedure.input(z.object({ id: z.coerce.number() })).query(async ({ ctx, input }) => {
    const result = await ctx.db.query.schedules.findMany({
      where: eq(schedules.id, input.id),
      with: {
        transactions: {
          with: {
            payee: true,
            category: true,
          },
        },
      },
    });
    if (!result[0]) {
      throw new TRPCError({
        code: "NOT_FOUND",
        message: "Schedule not found",
      });
    }
    return result[0];
  }),
  save: rateLimitedProcedure.input(formInsertScheduleSchema).mutation(async ({ ctx, input }) => {
    if (input.id) {
      const result = await ctx.db
        .update(schedules)
        .set(input)
        .where(eq(schedules.id, input.id))
        .returning();
      if (!result[0]) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to update schedule",
        });
      }
      return result[0];
    }

    const insertResult = await ctx.db.insert(schedules).values(input).returning();
    if (!insertResult[0]) {
      throw new TRPCError({
        code: "INTERNAL_SERVER_ERROR",
        message: "Failed to create schedule",
      });
    }
    const new_schedule = insertResult[0];

    return new_schedule;
  }),
  remove: rateLimitedProcedure.input(removeScheduleSchema).mutation(async ({ ctx, input }) => {
    if (!input) {
      throw new TRPCError({
        code: "BAD_REQUEST",
        message: "Schedule ID is required for deletion",
      });
    }
    const result = await ctx.db.delete(schedules).where(eq(schedules.id, input.id)).returning();
    if (!result[0]) {
      throw new TRPCError({
        code: "NOT_FOUND",
        message: "Schedule not found or could not be deleted",
      });
    }
    return result[0];
  }),
});
