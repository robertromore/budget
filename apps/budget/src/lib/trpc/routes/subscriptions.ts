import {
  billingCycles,
  subscriptionStatuses,
  subscriptionTypes,
} from "$lib/schema/subscriptions";
import {
  insertSubscriptionSchema,
  updateSubscriptionSchema,
} from "$lib/schema/subscriptions-table";
import { SubscriptionService } from "$lib/server/domains/subscriptions";
import { publicProcedure, rateLimitedProcedure, t } from "$lib/trpc";
import { TRPCError } from "@trpc/server";
import { z } from "zod";

const subscriptionService = new SubscriptionService();

// Input schemas
const filtersSchema = z.object({
  status: z.enum(subscriptionStatuses).or(z.array(z.enum(subscriptionStatuses))).optional(),
  type: z.enum(subscriptionTypes).or(z.array(z.enum(subscriptionTypes))).optional(),
  billingCycle: z.enum(billingCycles).or(z.array(z.enum(billingCycles))).optional(),
  accountId: z.number().optional(),
  payeeId: z.number().optional(),
  minAmount: z.number().optional(),
  maxAmount: z.number().optional(),
  isManuallyAdded: z.boolean().optional(),
  isUserConfirmed: z.boolean().optional(),
  search: z.string().optional(),
}).optional();

const sortSchema = z.object({
  field: z.enum(["name", "amount", "renewalDate", "createdAt", "type", "status"]),
  direction: z.enum(["asc", "desc"]),
}).optional();

export const subscriptionRoutes = t.router({
  // ==================== CRUD ====================

  all: publicProcedure
    .input(z.object({
      filters: filtersSchema,
      sort: sortSchema,
    }).optional())
    .query(async ({ ctx, input }) => {
      return await subscriptionService.getAll(
        ctx.workspaceId,
        input?.filters ?? undefined,
        input?.sort ?? undefined
      );
    }),

  byId: publicProcedure
    .input(z.object({ id: z.number().positive() }))
    .query(async ({ ctx, input }) => {
      const subscription = await subscriptionService.getById(input.id, ctx.workspaceId);
      if (!subscription) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Subscription not found",
        });
      }
      return subscription;
    }),

  byAccount: publicProcedure
    .input(z.object({ accountId: z.number().positive() }))
    .query(async ({ ctx, input }) => {
      return await subscriptionService.getByAccount(input.accountId, ctx.workspaceId);
    }),

  create: rateLimitedProcedure
    .input(insertSubscriptionSchema)
    .mutation(async ({ ctx, input }) => {
      return await subscriptionService.create(input, ctx.workspaceId);
    }),

  update: rateLimitedProcedure
    .input(updateSubscriptionSchema)
    .mutation(async ({ ctx, input }) => {
      const subscription = await subscriptionService.update(input, ctx.workspaceId);
      if (!subscription) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Subscription not found",
        });
      }
      return subscription;
    }),

  delete: rateLimitedProcedure
    .input(z.object({ id: z.number().positive() }))
    .mutation(async ({ ctx, input }) => {
      const success = await subscriptionService.delete(input.id, ctx.workspaceId);
      if (!success) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Subscription not found",
        });
      }
      return { success: true };
    }),

  // ==================== DETECTION ====================

  detect: publicProcedure
    .input(z.object({
      payeeIds: z.array(z.number().positive()).optional(),
      includeAlreadyTracked: z.boolean().optional(),
      minConfidence: z.number().min(0).max(1).optional(),
      accountId: z.number().positive().optional(),
    }).optional())
    .query(async ({ ctx, input }) => {
      return await subscriptionService.detectSubscriptions(ctx.workspaceId, input);
    }),

  confirm: rateLimitedProcedure
    .input(z.object({
      payeeId: z.number().positive(),
      name: z.string().optional(),
      type: z.enum(subscriptionTypes).optional(),
      billingCycle: z.enum(billingCycles).optional(),
      amount: z.number().positive().optional(),
      accountId: z.number().positive().optional(),
      renewalDate: z.string().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      return await subscriptionService.confirmSubscription(input, ctx.workspaceId);
    }),

  reject: rateLimitedProcedure
    .input(z.object({ payeeId: z.number().positive() }))
    .mutation(async ({ ctx, input }) => {
      await subscriptionService.rejectSubscription(input.payeeId, ctx.workspaceId);
      return { success: true };
    }),

  /**
   * Detect subscriptions by analyzing transaction patterns directly
   * Similar to how budgets analyze transactions for recurring expenses
   */
  detectFromTransactions: publicProcedure
    .input(z.object({
      accountIds: z.array(z.number().positive()).optional(),
      months: z.number().positive().max(24).optional(),
      minTransactions: z.number().positive().optional(),
      minConfidence: z.number().min(0).max(100).optional(),
      minPredictability: z.number().min(0).max(100).optional(),
    }).optional())
    .query(async ({ ctx, input }) => {
      return await subscriptionService.detectFromTransactions(ctx.workspaceId, input);
    }),

  // ==================== PRICE TRACKING ====================

  priceHistory: publicProcedure
    .input(z.object({ subscriptionId: z.number().positive() }))
    .query(async ({ ctx, input }) => {
      return await subscriptionService.getPriceHistory(input.subscriptionId, ctx.workspaceId);
    }),

  recordPriceChange: rateLimitedProcedure
    .input(z.object({
      subscriptionId: z.number().positive(),
      newAmount: z.number().positive(),
      effectiveDate: z.string().optional(),
      transactionId: z.number().positive().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      await subscriptionService.recordPriceChange(input, ctx.workspaceId);
      return { success: true };
    }),

  detectPriceChanges: publicProcedure.query(async ({ ctx }) => {
    return await subscriptionService.detectPriceChanges(ctx.workspaceId);
  }),

  // ==================== ALERTS ====================

  alerts: publicProcedure.query(async ({ ctx }) => {
    return await subscriptionService.getAlerts(ctx.workspaceId);
  }),

  generateAlerts: rateLimitedProcedure.mutation(async ({ ctx }) => {
    const count = await subscriptionService.generateAndCreateAlerts(ctx.workspaceId);
    return { created: count };
  }),

  dismissAlert: rateLimitedProcedure
    .input(z.object({ alertId: z.number().positive() }))
    .mutation(async ({ ctx, input }) => {
      const success = await subscriptionService.dismissAlert(input.alertId, ctx.workspaceId);
      if (!success) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Alert not found",
        });
      }
      return { success: true };
    }),

  // ==================== ANALYTICS ====================

  analytics: publicProcedure.query(async ({ ctx }) => {
    return await subscriptionService.getAnalytics(ctx.workspaceId);
  }),

  upcomingRenewals: publicProcedure
    .input(z.object({ days: z.number().positive().default(30) }).optional())
    .query(async ({ ctx, input }) => {
      return await subscriptionService.getUpcomingRenewals(ctx.workspaceId, input?.days ?? 30);
    }),

  calendarView: publicProcedure
    .input(z.object({
      startDate: z.string(),
      endDate: z.string(),
    }))
    .query(async ({ ctx, input }) => {
      return await subscriptionService.getCalendarView(
        ctx.workspaceId,
        input.startDate,
        input.endDate
      );
    }),

  // ==================== BULK OPERATIONS ====================

  bulkDelete: rateLimitedProcedure
    .input(z.object({ ids: z.array(z.number().positive()).min(1) }))
    .mutation(async ({ ctx, input }) => {
      const results = {
        success: 0,
        failed: 0,
        errors: [] as Array<{ id: number; error: string }>,
      };

      for (const id of input.ids) {
        try {
          const success = await subscriptionService.delete(id, ctx.workspaceId);
          if (success) {
            results.success++;
          } else {
            results.failed++;
            results.errors.push({ id, error: "Subscription not found" });
          }
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

  bulkUpdateStatus: rateLimitedProcedure
    .input(z.object({
      ids: z.array(z.number().positive()).min(1),
      status: z.enum(subscriptionStatuses),
    }))
    .mutation(async ({ ctx, input }) => {
      const results = {
        success: 0,
        failed: 0,
        errors: [] as Array<{ id: number; error: string }>,
      };

      for (const id of input.ids) {
        try {
          const subscription = await subscriptionService.update(
            { id, status: input.status },
            ctx.workspaceId
          );
          if (subscription) {
            results.success++;
          } else {
            results.failed++;
            results.errors.push({ id, error: "Subscription not found" });
          }
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
