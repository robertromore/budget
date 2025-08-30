import {
  schedules,
  removeScheduleSchema,
  removeSchedulesSchema,
  type Schedule,
  scheduleFormSchema,
} from "$lib/schema";
import { z } from "zod/v4";
import { publicProcedure } from "../orpc";
import { eq, sql, inArray, isNull } from "drizzle-orm";
import slugify from "@sindresorhus/slugify";
import { ORPCError } from "@orpc/server";

export const schedulesRoutes = {
  all: publicProcedure.handler(async ({ context }) => {
    return (await context.db.query.schedules.findMany({
      where: isNull(schedules.deletedAt),
      with: {
        payee: true,
        account: true,
      },
      orderBy: [schedules.name],
    })) as Schedule[];
  }),

  load: publicProcedure
    .input(z.object({ id: z.coerce.number() }))
    .handler(async ({ input, context }) => {
      const schedule = await context.db.query.schedules.findFirst({
        where: sql`${schedules.id} = ${input.id} AND ${schedules.deletedAt} IS NULL`,
        with: {
          payee: true,
          account: true,
        },
      });

      if (!schedule) {
        throw new ORPCError("SCHEDULE_NOT_FOUND", {
          message: "Schedule not found",
        });
      }

      return schedule as Schedule;
    }),

  save: publicProcedure.input(scheduleFormSchema).handler(async ({ input, context }) => {
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

    const merged = {
      ...input,
      slug: slugify(input.name),
    };

    const insertResult = await context.db.insert(schedules).values(merged).returning();
    if (!insertResult[0]) {
      throw new ORPCError("INTERNAL_SERVER_ERROR", {
        message: "Failed to create schedule",
      });
    }
    return insertResult[0];
  }),

  remove: publicProcedure.input(removeScheduleSchema).handler(async ({ input, context }) => {
    if (!input) {
      throw new ORPCError("BAD_REQUEST", {
        message: "Schedule ID is required for deletion",
      });
    }
    const result = await context.db
      .update(schedules)
      .set({ deletedAt: sql`CURRENT_TIMESTAMP` })
      .where(eq(schedules.id, input.id))
      .returning();
    if (!result[0]) {
      throw new ORPCError("NOT_FOUND", {
        message: "Schedule not found or could not be deleted",
      });
    }
    return result[0];
  }),

  removeMany: publicProcedure.input(removeSchedulesSchema).handler(async ({ input, context }) => {
    if (!input?.entities?.length) {
      throw new ORPCError("BAD_REQUEST", {
        message: "Schedule IDs are required for deletion",
      });
    }
    const result = await context.db
      .update(schedules)
      .set({ deletedAt: sql`CURRENT_TIMESTAMP` })
      .where(inArray(schedules.id, input.entities))
      .returning();
    if (!result.length) {
      throw new ORPCError("NOT_FOUND", {
        message: "Schedules not found or could not be deleted",
      });
    }
    return result;
  }),
};