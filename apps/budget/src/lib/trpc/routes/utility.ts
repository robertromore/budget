import { usageUnitEnum } from "$lib/schema/utility-usage";
import { utilityUsageService } from "$lib/server/domains/utility";
import { publicProcedure, t } from "$lib/trpc";
import { translateDomainError } from "$lib/trpc/shared/errors";
import {
  detectAnomalies,
  forecastUsage,
  projectBill,
  calculateUtilityStats,
} from "$lib/utils/utility-analytics";
import { z } from "zod";

// Input schemas
const usageIdSchema = z.object({
  id: z.number().int().positive(),
});

const accountIdSchema = z.object({
  accountId: z.number().int().positive(),
});

const createUsageRecordSchema = z.object({
  accountId: z.number().int().positive(),
  transactionId: z.number().int().positive().optional(),
  periodStart: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Date must be in YYYY-MM-DD format"),
  periodEnd: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Date must be in YYYY-MM-DD format"),
  dueDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  statementDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  usageAmount: z.number().min(0, "Usage amount must be non-negative"),
  usageUnit: z.enum(usageUnitEnum),
  meterReadingStart: z.number().optional(),
  meterReadingEnd: z.number().optional(),
  ratePerUnit: z.number().positive().optional(),
  baseCharge: z.number().min(0).optional(),
  usageCost: z.number().min(0).optional(),
  taxes: z.number().min(0).optional(),
  fees: z.number().min(0).optional(),
  totalAmount: z.number().min(0, "Total amount must be non-negative"),
  avgTemperature: z.number().optional(),
  notes: z.string().max(500).optional(),
});

const updateUsageRecordSchema = z.object({
  id: z.number().int().positive(),
  transactionId: z.number().int().positive().optional().nullable(),
  periodStart: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  periodEnd: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  dueDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional().nullable(),
  statementDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional().nullable(),
  usageAmount: z.number().min(0).optional(),
  usageUnit: z.enum(usageUnitEnum).optional(),
  meterReadingStart: z.number().optional().nullable(),
  meterReadingEnd: z.number().optional().nullable(),
  ratePerUnit: z.number().positive().optional().nullable(),
  baseCharge: z.number().min(0).optional().nullable(),
  usageCost: z.number().min(0).optional().nullable(),
  taxes: z.number().min(0).optional().nullable(),
  fees: z.number().min(0).optional().nullable(),
  totalAmount: z.number().min(0).optional(),
  avgTemperature: z.number().optional().nullable(),
  notes: z.string().max(500).optional().nullable(),
});

const dateRangeSchema = z.object({
  accountId: z.number().int().positive(),
  startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  endDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
});

const rateTierSchema = z.object({
  tierName: z.string().min(1).max(50),
  tierOrder: z.number().int().positive(),
  usageMin: z.number().min(0),
  usageMax: z.number().positive().optional(),
  ratePerUnit: z.number().positive(),
  effectiveDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  expirationDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
});

const setRateTiersSchema = z.object({
  accountId: z.number().int().positive(),
  tiers: z.array(rateTierSchema),
});

const calculateTieredCostSchema = z.object({
  accountId: z.number().int().positive(),
  usageAmount: z.number().min(0),
});

export const utilityRoutes = t.router({
  // Get all usage records for an account
  getUsageRecords: publicProcedure.input(accountIdSchema).query(async ({ input, ctx }) => {
    try {
      return await utilityUsageService.getUsageRecords(input.accountId);
    } catch (error) {
      throw translateDomainError(error);
    }
  }),

  // Get a single usage record by ID
  getUsageRecord: publicProcedure.input(usageIdSchema).query(async ({ input, ctx }) => {
    try {
      return await utilityUsageService.getUsageRecord(input.id);
    } catch (error) {
      throw translateDomainError(error);
    }
  }),

  // Get usage records by date range
  getUsageByDateRange: publicProcedure.input(dateRangeSchema).query(async ({ input, ctx }) => {
    try {
      return await utilityUsageService.getUsageRecordsByDateRange(
        input.accountId,
        input.startDate,
        input.endDate
      );
    } catch (error) {
      throw translateDomainError(error);
    }
  }),

  // Get usage analytics for an account
  getUsageAnalytics: publicProcedure.input(accountIdSchema).query(async ({ input, ctx }) => {
    try {
      return await utilityUsageService.getUsageAnalytics(input.accountId);
    } catch (error) {
      throw translateDomainError(error);
    }
  }),

  // Get year-over-year comparison data
  getYearOverYearData: publicProcedure.input(accountIdSchema).query(async ({ input, ctx }) => {
    try {
      return await utilityUsageService.getYearOverYearData(input.accountId);
    } catch (error) {
      throw translateDomainError(error);
    }
  }),

  // Create a new usage record
  createUsageRecord: publicProcedure
    .input(createUsageRecordSchema)
    .mutation(async ({ input, ctx }) => {
      try {
        return await utilityUsageService.createUsageRecord({
          ...input,
          workspaceId: ctx.workspaceId,
        });
      } catch (error) {
        throw translateDomainError(error);
      }
    }),

  // Update a usage record
  updateUsageRecord: publicProcedure
    .input(updateUsageRecordSchema)
    .mutation(async ({ input, ctx }) => {
      try {
        const { id, ...data } = input;
        return await utilityUsageService.updateUsageRecord(id, data, ctx.workspaceId);
      } catch (error) {
        throw translateDomainError(error);
      }
    }),

  // Delete a usage record
  deleteUsageRecord: publicProcedure.input(usageIdSchema).mutation(async ({ input, ctx }) => {
    try {
      await utilityUsageService.deleteUsageRecord(input.id, ctx.workspaceId);
      return { success: true };
    } catch (error) {
      throw translateDomainError(error);
    }
  }),

  // Get current rate tiers for an account
  getRateTiers: publicProcedure.input(accountIdSchema).query(async ({ input, ctx }) => {
    try {
      return await utilityUsageService.getCurrentRateTiers(input.accountId);
    } catch (error) {
      throw translateDomainError(error);
    }
  }),

  // Set rate tiers for an account (replaces existing)
  setRateTiers: publicProcedure.input(setRateTiersSchema).mutation(async ({ input, ctx }) => {
    try {
      return await utilityUsageService.replaceRateTiers(input.accountId, input.tiers);
    } catch (error) {
      throw translateDomainError(error);
    }
  }),

  // Calculate tiered cost for a usage amount
  calculateTieredCost: publicProcedure
    .input(calculateTieredCostSchema)
    .query(async ({ input, ctx }) => {
      try {
        return await utilityUsageService.calculateTieredCost(input.accountId, input.usageAmount);
      } catch (error) {
        throw translateDomainError(error);
      }
    }),

  // ============================================================================
  // Advanced Analytics
  // ============================================================================

  // Detect anomalies in usage patterns
  getAnomalies: publicProcedure
    .input(
      z.object({
        accountId: z.number().int().positive(),
        options: z
          .object({
            zScoreThreshold: z.number().positive().optional(),
            monthOverMonthThreshold: z.number().positive().optional(),
            potentialLeakDays: z.number().int().positive().optional(),
          })
          .optional(),
      })
    )
    .query(async ({ input, ctx }) => {
      try {
        const records = await utilityUsageService.getUsageRecords(input.accountId);
        return detectAnomalies(records, {
          zsScoreThreshold: input.options?.zScoreThreshold,
          monthOverMonthThreshold: input.options?.monthOverMonthThreshold,
          potentialLeakDays: input.options?.potentialLeakDays,
        });
      } catch (error) {
        throw translateDomainError(error);
      }
    }),

  // Forecast future usage
  getForecast: publicProcedure
    .input(
      z.object({
        accountId: z.number().int().positive(),
        targetMonth: z.number().int().min(0).max(11).optional(),
        useSeasonal: z.boolean().optional(),
      })
    )
    .query(async ({ input, ctx }) => {
      try {
        const records = await utilityUsageService.getUsageRecords(input.accountId);
        return forecastUsage(records, {
          targetMonth: input.targetMonth,
          useSeasonal: input.useSeasonal,
        });
      } catch (error) {
        throw translateDomainError(error);
      }
    }),

  // Project next bill amount
  getBillProjection: publicProcedure
    .input(
      z.object({
        accountId: z.number().int().positive(),
        projectedUsage: z.number().min(0).optional(),
        targetMonth: z.number().int().min(0).max(11).optional(),
      })
    )
    .query(async ({ input, ctx }) => {
      try {
        const records = await utilityUsageService.getUsageRecords(input.accountId);
        return projectBill(records, {
          projectedUsage: input.projectedUsage,
          targetMonth: input.targetMonth,
        });
      } catch (error) {
        throw translateDomainError(error);
      }
    }),

  // Get comprehensive utility statistics
  getStats: publicProcedure.input(accountIdSchema).query(async ({ input, ctx }) => {
    try {
      const records = await utilityUsageService.getUsageRecords(input.accountId);
      return calculateUtilityStats(records);
    } catch (error) {
      throw translateDomainError(error);
    }
  }),
});
