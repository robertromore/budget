import {
  duplicateScheduleSchema,
  removeScheduleSchema,
  scheduleDates,
  schedules,
  transactions,
} from "$lib/schema";
import { superformInsertScheduleSchema } from "$lib/schema/superforms";
import { serviceFactory } from "$lib/server/shared/container/service-factory";
import { publicProcedure, rateLimitedProcedure, t } from "$lib/trpc";
import { withErrorHandler } from "$lib/trpc/shared/errors";
import { getCurrentTimestamp } from "$lib/utils/dates";
import { generateUniqueSlugForDB } from "$lib/utils/slug-utils";
import slugify from "@sindresorhus/slugify";
import { TRPCError } from "@trpc/server";
import { and, eq } from "drizzle-orm";
import { z } from "zod";

const scheduleService = serviceFactory.getScheduleService();

export const scheduleRoutes = t.router({
  all: publicProcedure.query(async ({ ctx }) => {
    return await ctx.db.query.schedules.findMany({
      where: (schedules, { eq }) => eq(schedules.workspaceId, ctx.workspaceId),
      with: {
        payee: true,
        scheduleDate: true,
      },
    });
  }),
  getByAccount: publicProcedure
    .input(z.object({ accountId: z.number() }))
    .query(async ({ ctx, input }) => {
      return await ctx.db.query.schedules.findMany({
        where: (schedules, { eq, and }) =>
          and(eq(schedules.workspaceId, ctx.workspaceId), eq(schedules.accountId, input.accountId)),
        with: {
          payee: true,
          category: true,
          scheduleDate: true,
        },
        orderBy: (schedules, { desc }) => [desc(schedules.createdAt)],
      });
    }),
  load: publicProcedure.input(z.object({ id: z.coerce.number() })).query(async ({ ctx, input }) => {
    const result = await ctx.db.query.schedules.findMany({
      where: (schedules, { eq, and }) =>
        and(eq(schedules.id, input.id), eq(schedules.workspaceId, ctx.workspaceId)),
      with: {
        account: true,
        payee: true,
        category: true,
        scheduleDate: true,
        transactions: {
          where: (transactions, { isNull }) => isNull(transactions.deletedAt),
          with: {
            payee: true,
            category: true,
          },
          orderBy: (transactions, { desc }) => [desc(transactions.date)],
          limit: 50, // Get recent transactions for history
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
  save: rateLimitedProcedure
    .input(superformInsertScheduleSchema)
    .mutation(async ({ ctx, input }) => {
      const handleRepeatingDate = async (scheduleId: number, repeatingDateJson?: string) => {
        if (!repeatingDateJson) return null;

        try {
          const repeatingDate = JSON.parse(repeatingDateJson);

          // Helper to convert DateValue object to Date
          const convertDateValue = (dateValue: any) => {
            if (!dateValue) return null;
            if (typeof dateValue === "string") return new Date(dateValue);
            if (dateValue.year && dateValue.month && dateValue.day) {
              return new Date(dateValue.year, dateValue.month - 1, dateValue.day);
            }
            return new Date(dateValue);
          };

          // Create schedule date record
          const scheduleDateResult = await ctx.db
            .insert(scheduleDates)
            .values({
              scheduleId,
              start: repeatingDate.start
                ? (convertDateValue(repeatingDate.start)?.toISOString() ?? getCurrentTimestamp())
                : getCurrentTimestamp(),
              end: repeatingDate.end
                ? convertDateValue(repeatingDate.end)?.toISOString() || null
                : null,
              frequency: repeatingDate.frequency || "daily",
              interval: repeatingDate.interval || 1,
              limit: repeatingDate.limit || 0,
              move_weekends: repeatingDate.move_weekends || "none",
              move_holidays: repeatingDate.move_holidays || "none",
              specific_dates: repeatingDate.specific_dates || [],
              on: repeatingDate.on || false,
              on_type: repeatingDate.on_type || "day",
              days: repeatingDate.days || [],
              weeks: repeatingDate.weeks || [],
              weeks_days: repeatingDate.weeks_days || [],
              week_days: repeatingDate.week_days || [],
            })
            .returning();

          return scheduleDateResult[0]?.id || null;
        } catch (error) {
          console.warn("Failed to parse repeating date data:", error);
          return null;
        }
      };

      if (input.id) {
        const scheduleId = input.id;
        // For updates, generate new slug if name changed
        const { repeating_date, ...scheduleData } = input;

        const updateData = {
          ...scheduleData,
          slug: await generateUniqueSlugForDB(
            ctx.db,
            "schedules",
            schedules.slug,
            slugify(input.name),
            { excludeId: scheduleId, idColumn: schedules.id }
          ),
        };

        // Handle repeating date for updates
        if (repeating_date) {
          const dateId = await handleRepeatingDate(scheduleId, repeating_date);
          if (dateId) {
            updateData.dateId = dateId;
          }
        } else {
          const currentSchedule = await ctx.db.query.schedules.findFirst({
            where: (schedules, { eq, and }) =>
              and(eq(schedules.id, scheduleId), eq(schedules.workspaceId, ctx.workspaceId)),
          });

          if (currentSchedule?.dateId) {
            await ctx.db.delete(scheduleDates).where(eq(scheduleDates.id, currentSchedule.dateId));
          }

          updateData.dateId = null;
        }

        await ctx.db
          .update(schedules)
          .set(updateData)
          .where(and(eq(schedules.id, scheduleId), eq(schedules.workspaceId, ctx.workspaceId)));

        // Return the full schedule with relationships
        const updatedSchedule = await ctx.db.query.schedules.findFirst({
          where: (schedules, { eq, and }) =>
            and(eq(schedules.id, scheduleId), eq(schedules.workspaceId, ctx.workspaceId)),
          with: {
            scheduleDate: true,
          },
        });

        if (!updatedSchedule) {
          throw new TRPCError({
            code: "INTERNAL_SERVER_ERROR",
            message: "Failed to update schedule",
          });
        }
        return updatedSchedule;
      }

      const { repeating_date, ...scheduleData } = input;

      // Generate unique slug
      const insertData = {
        ...scheduleData,
        workspaceId: ctx.workspaceId,
        slug: await generateUniqueSlugForDB(
          ctx.db,
          "schedules",
          schedules.slug,
          slugify(input.name)
        ),
      };

      const insertResult = await ctx.db.insert(schedules).values(insertData).returning();
      if (!insertResult[0]) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to create schedule",
        });
      }
      const new_schedule = insertResult[0];

      if (repeating_date) {
        const dateId = await handleRepeatingDate(new_schedule.id, repeating_date);
        if (dateId) {
          await ctx.db
            .update(schedules)
            .set({ dateId })
            .where(
              and(eq(schedules.id, new_schedule.id), eq(schedules.workspaceId, ctx.workspaceId))
            );
        }
      }

      const finalSchedule = await ctx.db.query.schedules.findFirst({
        where: (schedules, { eq, and }) =>
          and(eq(schedules.id, new_schedule.id), eq(schedules.workspaceId, ctx.workspaceId)),
        with: {
          scheduleDate: true,
        },
      });

      return finalSchedule || new_schedule;
    }),
  remove: rateLimitedProcedure.input(removeScheduleSchema).mutation(async ({ ctx, input }) => {
    if (!input) {
      throw new TRPCError({
        code: "BAD_REQUEST",
        message: "Schedule ID is required for deletion",
      });
    }

    // First, get the schedule to check if it exists and get its dateId
    const schedule = await ctx.db.query.schedules.findFirst({
      where: (schedules, { eq, and }) =>
        and(eq(schedules.id, input.id), eq(schedules.workspaceId, ctx.workspaceId)),
    });

    if (!schedule) {
      throw new TRPCError({
        code: "NOT_FOUND",
        message: "Schedule not found",
      });
    }

    // Clear scheduleId from any transactions that reference this schedule
    await ctx.db
      .update(transactions)
      .set({ scheduleId: null })
      .where(eq(transactions.scheduleId, input.id));

    // Clear dateId from the schedule first (breaks the circular reference)
    const dateIdToDelete = schedule.dateId;
    if (dateIdToDelete) {
      await ctx.db
        .update(schedules)
        .set({ dateId: null })
        .where(and(eq(schedules.id, input.id), eq(schedules.workspaceId, ctx.workspaceId)));
    }

    // Now delete schedule_dates records
    if (dateIdToDelete) {
      await ctx.db.delete(scheduleDates).where(eq(scheduleDates.id, dateIdToDelete));
    }
    // Also delete any other schedule_dates that reference this schedule
    await ctx.db.delete(scheduleDates).where(eq(scheduleDates.scheduleId, input.id));

    // Now delete the schedule
    const result = await ctx.db
      .delete(schedules)
      .where(and(eq(schedules.id, input.id), eq(schedules.workspaceId, ctx.workspaceId)))
      .returning();

    if (!result[0]) {
      throw new TRPCError({
        code: "INTERNAL_SERVER_ERROR",
        message: "Failed to delete schedule",
      });
    }
    return result[0];
  }),
  duplicate: rateLimitedProcedure
    .input(duplicateScheduleSchema)
    .mutation(async ({ ctx, input }) => {
      // Get the original schedule with all its related data
      const originalSchedule = await ctx.db.query.schedules.findFirst({
        where: (schedules, { eq, and }) =>
          and(eq(schedules.id, input.id), eq(schedules.workspaceId, ctx.workspaceId)),
        with: {
          scheduleDate: true,
        },
      });

      if (!originalSchedule) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Schedule not found",
        });
      }

      // Create a unique name for the duplicate
      const duplicateName = `${originalSchedule.name} (Copy)`;

      // Generate unique slug for the duplicate
      const duplicateSlug = await generateUniqueSlugForDB(
        ctx.db,
        "schedules",
        schedules.slug,
        slugify(duplicateName)
      );

      // Prepare the data for the new schedule (excluding id, createdAt, updatedAt)
      const duplicateData = {
        name: duplicateName,
        slug: duplicateSlug,
        amount: originalSchedule.amount,
        amount_2: originalSchedule.amount_2,
        amount_type: originalSchedule.amount_type,
        status: "inactive" as const, // Set duplicates as inactive by default
        accountId: originalSchedule.accountId,
        payeeId: originalSchedule.payeeId,
        recurring: originalSchedule.recurring,
        auto_add: originalSchedule.auto_add,
        dateId: null, // Will be set if we duplicate the schedule date
        workspaceId: ctx.workspaceId,
      };

      // Insert the new schedule
      const insertResult = await ctx.db.insert(schedules).values(duplicateData).returning();
      if (!insertResult[0]) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to duplicate schedule",
        });
      }
      const newSchedule = insertResult[0];

      // If the original schedule has a scheduleDate, duplicate it too
      if (originalSchedule.scheduleDate) {
        const scheduleDateData = {
          scheduleId: newSchedule.id,
          start: originalSchedule.scheduleDate.start,
          end: originalSchedule.scheduleDate.end,
          frequency: originalSchedule.scheduleDate.frequency,
          interval: originalSchedule.scheduleDate.interval,
          limit: originalSchedule.scheduleDate.limit,
          move_weekends: originalSchedule.scheduleDate.move_weekends,
          move_holidays: originalSchedule.scheduleDate.move_holidays,
          specific_dates: originalSchedule.scheduleDate.specific_dates,
          on: originalSchedule.scheduleDate.on,
          on_type: originalSchedule.scheduleDate.on_type,
          days: originalSchedule.scheduleDate.days,
          weeks: originalSchedule.scheduleDate.weeks,
          weeks_days: originalSchedule.scheduleDate.weeks_days,
          week_days: originalSchedule.scheduleDate.week_days,
        };

        const scheduleDateResult = await ctx.db
          .insert(scheduleDates)
          .values(scheduleDateData)
          .returning();
        if (scheduleDateResult[0]) {
          // Update the new schedule with the dateId
          const updatedSchedule = await ctx.db
            .update(schedules)
            .set({ dateId: scheduleDateResult[0].id })
            .where(
              and(eq(schedules.id, newSchedule.id), eq(schedules.workspaceId, ctx.workspaceId))
            )
            .returning();

          return updatedSchedule[0] || newSchedule;
        }
      }

      return newSchedule;
    }),

  // Auto-add functionality
  executeAutoAdd: rateLimitedProcedure
    .input(z.object({ scheduleId: z.number() }))
    .mutation(
      withErrorHandler(async ({ input }) =>
        scheduleService.executeAutoAddForSchedule(input.scheduleId)
      )
    ),

  executeAutoAddAll: rateLimitedProcedure.mutation(
    withErrorHandler(async () => scheduleService.executeAutoAddForAllSchedules())
  ),

  previewAutoAdd: publicProcedure
    .input(z.object({ scheduleId: z.number() }))
    .query(
      withErrorHandler(async ({ input }) =>
        scheduleService.previewAutoAddForSchedule(input.scheduleId)
      )
    ),

  toggleStatus: rateLimitedProcedure
    .input(z.object({ scheduleId: z.number() }))
    .mutation(async ({ ctx, input }) => {
      try {
        // Get current schedule
        const currentSchedule = await ctx.db.query.schedules.findFirst({
          where: (schedules, { eq, and }) =>
            and(eq(schedules.id, input.scheduleId), eq(schedules.workspaceId, ctx.workspaceId)),
        });

        if (!currentSchedule) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "Schedule not found",
          });
        }

        // Toggle status
        const newStatus = currentSchedule.status === "active" ? "inactive" : "active";

        // Update schedule status
        const result = await ctx.db
          .update(schedules)
          .set({ status: newStatus })
          .where(
            and(eq(schedules.id, input.scheduleId), eq(schedules.workspaceId, ctx.workspaceId))
          )
          .returning();

        if (!result[0]) {
          throw new TRPCError({
            code: "INTERNAL_SERVER_ERROR",
            message: "Failed to update schedule status",
          });
        }

        return result[0];
      } catch (error) {
        if (error instanceof TRPCError) {
          throw error;
        }
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to toggle schedule status",
        });
      }
    }),

  linkToBudget: publicProcedure
    .input(
      z.object({
        scheduleId: z.number().int().positive(),
        budgetId: z.number().int().positive(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      try {
        const result = await ctx.db
          .update(schedules)
          .set({ budgetId: input.budgetId })
          .where(
            and(eq(schedules.id, input.scheduleId), eq(schedules.workspaceId, ctx.workspaceId))
          )
          .returning();

        if (!result[0]) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "Schedule not found",
          });
        }

        return result[0];
      } catch (error) {
        if (error instanceof TRPCError) {
          throw error;
        }
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to link schedule to budget",
        });
      }
    }),

  unlinkFromBudget: publicProcedure
    .input(z.object({ scheduleId: z.number().int().positive() }))
    .mutation(async ({ ctx, input }) => {
      try {
        const result = await ctx.db
          .update(schedules)
          .set({ budgetId: null })
          .where(
            and(eq(schedules.id, input.scheduleId), eq(schedules.workspaceId, ctx.workspaceId))
          )
          .returning();

        if (!result[0]) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "Schedule not found",
          });
        }

        return result[0];
      } catch (error) {
        if (error instanceof TRPCError) {
          throw error;
        }
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to unlink schedule from budget",
        });
      }
    }),

  // Skip occurrence functionality
  skipOccurrence: rateLimitedProcedure
    .input(
      z.object({
        scheduleId: z.number().int().positive(),
        date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Date must be in YYYY-MM-DD format"),
        skipType: z.enum(["single", "push_forward"]),
        reason: z.string().optional(),
      })
    )
    .mutation(
      withErrorHandler(async ({ ctx, input }) => {
        if (input.skipType === "single") {
          return scheduleService.skipSingleOccurrence(
            input.scheduleId,
            input.date,
            ctx.workspaceId,
            input.reason
          );
        } else {
          return scheduleService.pushDatesForward(
            input.scheduleId,
            input.date,
            ctx.workspaceId,
            input.reason
          );
        }
      })
    ),

  getSkipHistory: publicProcedure
    .input(z.object({ scheduleId: z.number().int().positive() }))
    .query(
      withErrorHandler(async ({ input }) => scheduleService.getSkipHistory(input.scheduleId))
    ),

  removeSkip: rateLimitedProcedure
    .input(z.object({ skipId: z.number().int().positive() }))
    .mutation(withErrorHandler(async ({ input, ctx }) => scheduleService.removeSkip(input.skipId, ctx.workspaceId))),

  bulkRemove: rateLimitedProcedure
    .input(z.object({ ids: z.array(z.number().int().positive()).min(1) }))
    .mutation(async ({ ctx, input }) => {
      const results: { success: number; failed: number; errors: Array<{ id: number; error: string }> } = {
        success: 0,
        failed: 0,
        errors: [],
      };

      for (const id of input.ids) {
        try {
          // Get the schedule to check if it exists and get its dateId
          const schedule = await ctx.db.query.schedules.findFirst({
            where: (schedules, { eq, and }) =>
              and(eq(schedules.id, id), eq(schedules.workspaceId, ctx.workspaceId)),
          });

          if (!schedule) {
            results.failed++;
            results.errors.push({ id, error: "Schedule not found" });
            continue;
          }

          // Clear scheduleId from any transactions that reference this schedule
          await ctx.db
            .update(transactions)
            .set({ scheduleId: null })
            .where(eq(transactions.scheduleId, id));

          // Clear dateId from the schedule first (breaks the circular reference)
          const dateIdToDelete = schedule.dateId;
          if (dateIdToDelete) {
            await ctx.db
              .update(schedules)
              .set({ dateId: null })
              .where(and(eq(schedules.id, id), eq(schedules.workspaceId, ctx.workspaceId)));
          }

          // Delete schedule_dates records
          if (dateIdToDelete) {
            await ctx.db.delete(scheduleDates).where(eq(scheduleDates.id, dateIdToDelete));
          }
          await ctx.db.delete(scheduleDates).where(eq(scheduleDates.scheduleId, id));

          // Delete the schedule
          await ctx.db
            .delete(schedules)
            .where(and(eq(schedules.id, id), eq(schedules.workspaceId, ctx.workspaceId)));

          results.success++;
        } catch (error) {
          results.failed++;
          results.errors.push({
            id,
            error: error instanceof Error ? error.message : "Unknown error",
          });
        }
      }

      return results;
    }),
});
