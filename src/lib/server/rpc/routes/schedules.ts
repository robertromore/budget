import { schedules, removeScheduleSchema, formInsertScheduleSchema } from "$lib/schema";
import { z } from "zod";
import { publicProcedure } from "../orpc";
import { eq, isNull } from "drizzle-orm";
import { ORPCError } from "@orpc/server";

export const schedulesRoutes = {
  all: publicProcedure.handler(async ({ context }) => {
    return await context.db.query.schedules.findMany({
      where: isNull(schedules.deletedAt),
    });
  }),

  load: publicProcedure
    .input(z.object({ id: z.coerce.number() }))
    .handler(async ({ input, context }) => {
      const result = await context.db.query.schedules.findMany({
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
        throw new ORPCError("NOT_FOUND", {
          message: "Schedule not found",
        });
      }
      return result[0];
    }),

  save: publicProcedure.input(formInsertScheduleSchema).handler(async ({ input, context }) => {
    if (input.id) {
      const result = await context.db
        .update(schedules)
        .set(input)
        .where(eq(schedules.id, input.id))
        .returning();
      if (!result[0]) {
        throw new ORPCError("INTERNAL_SERVER_ERROR", {
          message: "Failed to update schedule",
        });
      }
      return result[0];
    }

    const insertResult = await context.db.insert(schedules).values(input).returning();
    if (!insertResult[0]) {
      throw new ORPCError("INTERNAL_SERVER_ERROR", {
        message: "Failed to create schedule",
      });
    }
    const new_schedule = insertResult[0];

    return new_schedule;
  }),

  remove: publicProcedure.input(removeScheduleSchema).handler(async ({ input, context }) => {
    if (!input) {
      throw new ORPCError("BAD_REQUEST", {
        message: "Schedule ID is required for deletion",
      });
    }
    const result = await context.db.delete(schedules).where(eq(schedules.id, input.id)).returning();
    if (!result[0]) {
      throw new ORPCError("NOT_FOUND", {
        message: "Schedule not found or could not be deleted",
      });
    }
    return result[0];
  }),
};
