import { schedules, removeScheduleSchema, formInsertScheduleSchema } from "$lib/schema";
import { z } from "zod";
import { publicProcedure, t } from "../t";
import { eq } from "drizzle-orm";

export const scheduleRoutes = t.router({
  all: publicProcedure.query(async ({ ctx }) => {
    return await ctx.db.query.schedules.findMany();
  }),
  load: publicProcedure.input(z.object({ id: z.coerce.number() })).query(async ({ ctx, input }) => {
    return (
      await ctx.db.query.schedules.findMany({
        where: eq(schedules.id, input.id),
        with: {
          transactions: {
            with: {
              payee: true,
              category: true,
            },
          },
        },
      })
    )[0];
  }),
  save: publicProcedure.input(formInsertScheduleSchema).mutation(async ({ ctx, input }) => {
    if (input.id) {
      return (
        await ctx.db.update(schedules).set(input).where(eq(schedules.id, input.id)).returning()
      )[0];
    }

    const new_schedule = (await ctx.db.insert(schedules).values(input).returning())[0];

    return new_schedule;
  }),
  remove: publicProcedure.input(removeScheduleSchema).mutation(async ({ ctx, input }) => {
    if (!input) throw new Error("id can't be null when deleting a schedule");
    return (await ctx.db.delete(schedules).where(eq(schedules.id, input.id)).returning())[0];
  }),
});
