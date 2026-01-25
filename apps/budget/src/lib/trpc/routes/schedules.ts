import {
  duplicateScheduleSchema,
  removeScheduleSchema,
  scheduleDates,
  schedulePriceHistory,
  schedules,
  scheduleSubscriptionStatuses,
  scheduleSubscriptionTypes,
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

  // ==================== SUBSCRIPTION ENDPOINTS ====================

  /**
   * Create a new schedule (possibly with subscription tracking).
   * This is used by the unified detection UI to create schedules from detected patterns.
   */
  create: rateLimitedProcedure
    .input(
      z.object({
        workspaceId: z.number(),
        name: z.string().min(1),
        slug: z.string().min(1),
        status: z.enum(["active", "inactive"]).optional(),
        amount: z.number(),
        amount_2: z.number().optional(),
        amount_type: z.enum(["exact", "approximate", "range"]).optional(),
        recurring: z.boolean().optional(),
        auto_add: z.boolean().optional(),
        payeeId: z.number(),
        accountId: z.number(),
        categoryId: z.number().optional(),
        budgetId: z.number().optional(),
        // Subscription fields
        isSubscription: z.boolean().optional(),
        subscriptionType: z.enum(scheduleSubscriptionTypes).optional(),
        subscriptionStatus: z.enum(scheduleSubscriptionStatuses).optional(),
        detectionConfidence: z.number().min(0).max(1).optional(),
        isUserConfirmed: z.boolean().optional(),
        detectedAt: z.string().optional(),
        alertPreferences: z.string().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      // Generate unique slug
      const finalSlug = await generateUniqueSlugForDB(
        ctx.db,
        "schedules",
        schedules.slug,
        slugify(input.slug || input.name)
      );

      const insertResult = await ctx.db
        .insert(schedules)
        .values({
          workspaceId: ctx.workspaceId,
          name: input.name,
          slug: finalSlug,
          status: input.status ?? "active",
          amount: input.amount,
          amount_2: input.amount_2 ?? 0,
          amount_type: input.amount_type ?? "exact",
          recurring: input.recurring ?? true,
          auto_add: input.auto_add ?? false,
          payeeId: input.payeeId,
          accountId: input.accountId,
          categoryId: input.categoryId,
          budgetId: input.budgetId,
          isSubscription: input.isSubscription ?? false,
          subscriptionType: input.subscriptionType,
          subscriptionStatus: input.subscriptionStatus,
          detectionConfidence: input.detectionConfidence,
          isUserConfirmed: input.isUserConfirmed ?? false,
          detectedAt: input.detectedAt,
          alertPreferences: input.alertPreferences,
          lastKnownAmount: input.amount,
        })
        .returning();

      if (!insertResult[0]) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to create schedule",
        });
      }

      // If this is a subscription, record initial price history
      if (input.isSubscription && insertResult[0]) {
        await ctx.db.insert(schedulePriceHistory).values({
          scheduleId: insertResult[0].id,
          amount: input.amount,
          previousAmount: null,
          effectiveDate: new Date().toISOString().split("T")[0],
          changeType: "initial",
          changePercentage: null,
        });
      }

      return insertResult[0];
    }),

  /**
   * Get all schedules that are marked as subscriptions
   */
  getSubscriptions: publicProcedure
    .input(
      z
        .object({
          status: z.enum(scheduleSubscriptionStatuses).optional(),
          type: z.enum(scheduleSubscriptionTypes).optional(),
          accountId: z.number().optional(),
        })
        .optional()
    )
    .query(async ({ ctx, input }) => {
      return ctx.db.query.schedules.findMany({
        where: (schedules, { eq, and }) => {
          const conditions = [
            eq(schedules.workspaceId, ctx.workspaceId),
            eq(schedules.isSubscription, true),
          ];

          if (input?.status) {
            conditions.push(eq(schedules.subscriptionStatus, input.status));
          }
          if (input?.type) {
            conditions.push(eq(schedules.subscriptionType, input.type));
          }
          if (input?.accountId) {
            conditions.push(eq(schedules.accountId, input.accountId));
          }

          return and(...conditions);
        },
        with: {
          payee: true,
          category: true,
          account: true,
          priceHistory: {
            orderBy: (ph, { desc }) => [desc(ph.effectiveDate)],
            limit: 5,
          },
        },
        orderBy: (schedules, { asc }) => [asc(schedules.name)],
      });
    }),

  /**
   * Get subscription analytics (monthly totals, by type, etc.)
   */
  getSubscriptionAnalytics: publicProcedure.query(async ({ ctx }) => {
    const subscriptions = await ctx.db.query.schedules.findMany({
      where: (schedules, { eq, and }) =>
        and(
          eq(schedules.workspaceId, ctx.workspaceId),
          eq(schedules.isSubscription, true),
          eq(schedules.subscriptionStatus, "active")
        ),
      with: {
        scheduleDate: true,
        priceHistory: {
          orderBy: (ph, { desc }) => [desc(ph.effectiveDate)],
          limit: 2,
        },
      },
    });

    // Calculate monthly total
    let monthlyTotal = 0;
    let annualTotal = 0;

    // Group by type
    const byType: Record<string, { count: number; monthlyTotal: number }> = {};

    for (const sub of subscriptions) {
      // Estimate monthly amount based on schedule frequency
      const frequency = sub.scheduleDate?.frequency ?? "monthly";
      const monthlyAmount = normalizeAmountToMonthly(sub.amount, frequency);

      monthlyTotal += monthlyAmount;
      annualTotal += monthlyAmount * 12;

      const type = sub.subscriptionType ?? "other";
      if (!byType[type]) {
        byType[type] = { count: 0, monthlyTotal: 0 };
      }
      byType[type].count++;
      byType[type].monthlyTotal += monthlyAmount;
    }

    // Count price increases in the last 12 months
    const priceIncreases = subscriptions.filter((sub) => {
      const recentHistory = sub.priceHistory?.[0];
      if (!recentHistory) return false;
      const historyDate = new Date(recentHistory.effectiveDate);
      const oneYearAgo = new Date();
      oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1);
      return recentHistory.changeType === "increase" && historyDate > oneYearAgo;
    }).length;

    return {
      totalSubscriptions: subscriptions.length,
      monthlyTotal,
      annualTotal,
      byType,
      recentPriceIncreases: priceIncreases,
    };
  }),

  /**
   * Update subscription status (active, paused, cancelled, etc.)
   */
  updateSubscriptionStatus: rateLimitedProcedure
    .input(
      z.object({
        scheduleId: z.number(),
        status: z.enum(scheduleSubscriptionStatuses),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const result = await ctx.db
        .update(schedules)
        .set({
          subscriptionStatus: input.status,
          updatedAt: getCurrentTimestamp(),
        })
        .where(
          and(
            eq(schedules.id, input.scheduleId),
            eq(schedules.workspaceId, ctx.workspaceId),
            eq(schedules.isSubscription, true)
          )
        )
        .returning();

      if (!result[0]) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Subscription not found",
        });
      }

      return result[0];
    }),

  /**
   * Get price history for a schedule
   */
  getPriceHistory: publicProcedure
    .input(z.object({ scheduleId: z.number() }))
    .query(async ({ ctx, input }) => {
      // First verify the schedule belongs to this workspace
      const schedule = await ctx.db.query.schedules.findFirst({
        where: (schedules, { eq, and }) =>
          and(eq(schedules.id, input.scheduleId), eq(schedules.workspaceId, ctx.workspaceId)),
      });

      if (!schedule) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Schedule not found",
        });
      }

      return ctx.db.query.schedulePriceHistory.findMany({
        where: (ph, { eq }) => eq(ph.scheduleId, input.scheduleId),
        orderBy: (ph, { desc }) => [desc(ph.effectiveDate)],
      });
    }),

  /**
   * Record a price change for a subscription schedule
   */
  recordPriceChange: rateLimitedProcedure
    .input(
      z.object({
        scheduleId: z.number(),
        newAmount: z.number().positive(),
        effectiveDate: z.string().optional(),
        transactionId: z.number().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      // Get the current schedule
      const schedule = await ctx.db.query.schedules.findFirst({
        where: (schedules, { eq, and }) =>
          and(eq(schedules.id, input.scheduleId), eq(schedules.workspaceId, ctx.workspaceId)),
      });

      if (!schedule) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Schedule not found",
        });
      }

      const previousAmount = schedule.lastKnownAmount ?? schedule.amount;
      const changePercentage =
        previousAmount > 0 ? ((input.newAmount - previousAmount) / previousAmount) * 100 : null;
      const changeType =
        input.newAmount > previousAmount
          ? "increase"
          : input.newAmount < previousAmount
            ? "decrease"
            : "initial";

      // Insert price history record
      const historyResult = await ctx.db
        .insert(schedulePriceHistory)
        .values({
          scheduleId: input.scheduleId,
          amount: input.newAmount,
          previousAmount,
          effectiveDate: input.effectiveDate ?? new Date().toISOString().split("T")[0],
          changeType,
          changePercentage,
          detectedFromTransactionId: input.transactionId,
        })
        .returning();

      // Update the schedule's lastKnownAmount and priceChangeDetectedAt
      await ctx.db
        .update(schedules)
        .set({
          lastKnownAmount: input.newAmount,
          amount: input.newAmount,
          priceChangeDetectedAt: getCurrentTimestamp(),
          updatedAt: getCurrentTimestamp(),
        })
        .where(
          and(eq(schedules.id, input.scheduleId), eq(schedules.workspaceId, ctx.workspaceId))
        );

      return historyResult[0];
    }),

  /**
   * Convert an existing schedule to a subscription
   */
  convertToSubscription: rateLimitedProcedure
    .input(
      z.object({
        scheduleId: z.number(),
        subscriptionType: z.enum(scheduleSubscriptionTypes),
        subscriptionStatus: z.enum(scheduleSubscriptionStatuses).optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const schedule = await ctx.db.query.schedules.findFirst({
        where: (schedules, { eq, and }) =>
          and(eq(schedules.id, input.scheduleId), eq(schedules.workspaceId, ctx.workspaceId)),
      });

      if (!schedule) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Schedule not found",
        });
      }

      // Update schedule to be a subscription
      const result = await ctx.db
        .update(schedules)
        .set({
          isSubscription: true,
          subscriptionType: input.subscriptionType,
          subscriptionStatus: input.subscriptionStatus ?? "active",
          isUserConfirmed: true,
          lastKnownAmount: schedule.amount,
          updatedAt: getCurrentTimestamp(),
        })
        .where(
          and(eq(schedules.id, input.scheduleId), eq(schedules.workspaceId, ctx.workspaceId))
        )
        .returning();

      // Record initial price history
      if (result[0]) {
        await ctx.db.insert(schedulePriceHistory).values({
          scheduleId: input.scheduleId,
          amount: schedule.amount,
          previousAmount: null,
          effectiveDate: new Date().toISOString().split("T")[0],
          changeType: "initial",
          changePercentage: null,
        });
      }

      return result[0];
    }),
});

/**
 * Helper to normalize amounts to monthly based on frequency
 */
function normalizeAmountToMonthly(
  amount: number,
  frequency: string
): number {
  switch (frequency) {
    case "daily":
      return amount * 30;
    case "weekly":
      return amount * 4.33;
    case "biweekly":
      return amount * 2.17;
    case "monthly":
      return amount;
    case "quarterly":
      return amount / 3;
    case "yearly":
    case "annual":
      return amount / 12;
    default:
      return amount;
  }
}
