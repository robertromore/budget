import {schedules, removeScheduleSchema, duplicateScheduleSchema, scheduleDates} from "$lib/schema";
import {superformInsertScheduleSchema} from "$lib/schema/superforms";
import {z} from "zod";
import {publicProcedure, rateLimitedProcedure, t} from "$lib/trpc";
import {eq} from "drizzle-orm";
import {TRPCError} from "@trpc/server";
import slugify from "@sindresorhus/slugify";
import {generateUniqueSlugForDB} from "$lib/utils/slug-utils";
import {serviceFactory} from "$lib/server/shared/container/service-factory";
import {getCurrentTimestamp} from "$lib/utils/dates";

// PERFORMANCE: Services retrieved per-request to avoid module-level instantiation

export const scheduleRoutes = t.router({
  all: publicProcedure.query(async ({ctx}) => {
    return await ctx.db.query.schedules.findMany({
      with: {
        scheduleDate: true,
      },
    });
  }),
  load: publicProcedure.input(z.object({id: z.coerce.number()})).query(async ({ctx, input}) => {
    const result = await ctx.db.query.schedules.findMany({
      where: eq(schedules.id, input.id),
      with: {
        account: true,
        payee: true,
        scheduleDate: true,
        transactions: {
          with: {
            payee: true,
            category: true,
          },
          orderBy: (transactions, { desc }) => [desc(transactions.date)],
          limit: 50 // Get recent transactions for history
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
  save: rateLimitedProcedure.input(superformInsertScheduleSchema).mutation(async ({ctx, input}) => {
    console.log('Save schedule input:', JSON.stringify(input, null, 2));

    // Helper function to handle repeating date data
    const handleRepeatingDate = async (scheduleId: number, repeatingDateJson?: string) => {
      console.log('handleRepeatingDate called with:', repeatingDateJson ? 'data present' : 'NO DATA');
      if (!repeatingDateJson) return null;

      try {
        const repeatingDate = JSON.parse(repeatingDateJson);
        console.log('Parsed repeating date data:', JSON.stringify(repeatingDate, null, 2));

        // Helper to convert DateValue object to Date
        const convertDateValue = (dateValue: any) => {
          if (!dateValue) return null;
          if (typeof dateValue === 'string') return new Date(dateValue);
          if (dateValue.year && dateValue.month && dateValue.day) {
            return new Date(dateValue.year, dateValue.month - 1, dateValue.day);
          }
          return new Date(dateValue);
        };

        // Create schedule date record
        const scheduleDateResult = await ctx.db.insert(scheduleDates).values({
          scheduleId,
          start: repeatingDate.start ? convertDateValue(repeatingDate.start).toISOString() : getCurrentTimestamp(),
          end: repeatingDate.end ? convertDateValue(repeatingDate.end)?.toISOString() || null : null,
          frequency: repeatingDate.frequency || 'daily',
          interval: repeatingDate.interval || 1,
          limit: repeatingDate.limit || 0,
          move_weekends: repeatingDate.move_weekends || 'none',
          move_holidays: repeatingDate.move_holidays || 'none',
          specific_dates: repeatingDate.specific_dates || [],
          on: repeatingDate.on || false,
          on_type: repeatingDate.on_type || 'day',
          days: repeatingDate.days || [],
          weeks: repeatingDate.weeks || [],
          weeks_days: repeatingDate.weeks_days || [],
          week_days: repeatingDate.week_days || []
        }).returning();

        return scheduleDateResult[0]?.id || null;
      } catch (error) {
        console.warn('Failed to parse repeating date data:', error);
        return null;
      }
    };

    if (input.id) {
      // For updates, generate new slug if name changed
      const { repeating_date, ...scheduleData } = input;

      const updateData = {
        ...scheduleData,
        slug: await generateUniqueSlugForDB(
          ctx.db,
          "schedules",
          schedules.slug,
          slugify(input.name),
          { excludeId: input.id, idColumn: schedules.id }
        )
      };

      // Handle repeating date for updates
      if (repeating_date) {
        const dateId = await handleRepeatingDate(input.id, repeating_date);
        if (dateId) {
          updateData.dateId = dateId;
        }
      } else {
        // No repeating date provided - clear any existing schedule_date relationship
        // First get the current schedule to see if it has a dateId
        const currentSchedule = await ctx.db.query.schedules.findFirst({
          where: eq(schedules.id, input.id)
        });

        if (currentSchedule?.dateId) {
          // Delete the associated schedule_date record
          await ctx.db.delete(scheduleDates).where(eq(scheduleDates.id, currentSchedule.dateId));
        }

        // Clear the dateId reference
        updateData.dateId = null;
      }

      await ctx.db
        .update(schedules)
        .set(updateData)
        .where(eq(schedules.id, input.id));

      // Return the full schedule with relationships
      const updatedSchedule = await ctx.db.query.schedules.findFirst({
        where: eq(schedules.id, input.id),
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

    // For new schedules, separate repeating_date from schedule data
    const { repeating_date, ...scheduleData } = input;

    // Generate unique slug
    const insertData = {
      ...scheduleData,
      slug: await generateUniqueSlugForDB(
        ctx.db,
        "schedules",
        schedules.slug,
        slugify(input.name)
      )
    };

    const insertResult = await ctx.db.insert(schedules).values(insertData).returning();
    if (!insertResult[0]) {
      throw new TRPCError({
        code: "INTERNAL_SERVER_ERROR",
        message: "Failed to create schedule",
      });
    }
    const new_schedule = insertResult[0];

    // Handle repeating date for new schedules
    if (repeating_date) {
      const dateId = await handleRepeatingDate(new_schedule.id, repeating_date);
      if (dateId) {
        // Update the schedule with the dateId
        await ctx.db
          .update(schedules)
          .set({ dateId })
          .where(eq(schedules.id, new_schedule.id));
      }
    }

    // Return the full schedule with relationships
    const finalSchedule = await ctx.db.query.schedules.findFirst({
      where: eq(schedules.id, new_schedule.id),
      with: {
        scheduleDate: true,
      },
    });

    return finalSchedule || new_schedule;
  }),
  remove: rateLimitedProcedure.input(removeScheduleSchema).mutation(async ({ctx, input}) => {
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
  duplicate: rateLimitedProcedure.input(duplicateScheduleSchema).mutation(async ({ctx, input}) => {
    // Get the original schedule with all its related data
    const originalSchedule = await ctx.db.query.schedules.findFirst({
      where: eq(schedules.id, input.id),
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
      status: 'inactive' as const, // Set duplicates as inactive by default
      accountId: originalSchedule.accountId,
      payeeId: originalSchedule.payeeId,
      recurring: originalSchedule.recurring,
      auto_add: originalSchedule.auto_add,
      dateId: null, // Will be set if we duplicate the schedule date
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

      const scheduleDateResult = await ctx.db.insert(scheduleDates).values(scheduleDateData).returning();
      if (scheduleDateResult[0]) {
        // Update the new schedule with the dateId
        const updatedSchedule = await ctx.db
          .update(schedules)
          .set({ dateId: scheduleDateResult[0].id })
          .where(eq(schedules.id, newSchedule.id))
          .returning();

        return updatedSchedule[0] || newSchedule;
      }
    }

    return newSchedule;
  }),

  // Auto-add functionality
  executeAutoAdd: rateLimitedProcedure
    .input(z.object({ scheduleId: z.number() }))
    .mutation(async ({ input }) => {
      try {
        const scheduleService = serviceFactory.getScheduleService();
        const result = await scheduleService.executeAutoAddForSchedule(input.scheduleId);
        return result;
      } catch (error) {
        if (error instanceof Error) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: error.message,
          });
        }
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to execute auto-add",
        });
      }
    }),

  executeAutoAddAll: rateLimitedProcedure
    .mutation(async () => {
      try {
        const scheduleService = serviceFactory.getScheduleService();
        const result = await scheduleService.executeAutoAddForAllSchedules();
        return result;
      } catch (error) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to execute auto-add for all schedules",
        });
      }
    }),

  previewAutoAdd: publicProcedure
    .input(z.object({ scheduleId: z.number() }))
    .query(async ({ input }) => {
      try {
        const scheduleService = serviceFactory.getScheduleService();
        const result = await scheduleService.previewAutoAddForSchedule(input.scheduleId);
        return result;
      } catch (error) {
        if (error instanceof Error) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: error.message,
          });
        }
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to preview auto-add",
        });
      }
    }),

  toggleStatus: rateLimitedProcedure
    .input(z.object({ scheduleId: z.number() }))
    .mutation(async ({ ctx, input }) => {
      try {
        // Get current schedule
        const currentSchedule = await ctx.db.query.schedules.findFirst({
          where: eq(schedules.id, input.scheduleId)
        });

        if (!currentSchedule) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "Schedule not found",
          });
        }

        // Toggle status
        const newStatus = currentSchedule.status === 'active' ? 'inactive' : 'active';

        // Update schedule status
        const result = await ctx.db
          .update(schedules)
          .set({ status: newStatus })
          .where(eq(schedules.id, input.scheduleId))
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
    .mutation(async ({ctx, input}) => {
      try {
        const result = await ctx.db
          .update(schedules)
          .set({budgetId: input.budgetId})
          .where(eq(schedules.id, input.scheduleId))
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
    .input(z.object({scheduleId: z.number().int().positive()}))
    .mutation(async ({ctx, input}) => {
      try {
        const result = await ctx.db
          .update(schedules)
          .set({budgetId: null})
          .where(eq(schedules.id, input.scheduleId))
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
});
