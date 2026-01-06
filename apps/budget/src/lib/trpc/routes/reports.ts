import { serviceFactory } from "$lib/server/shared/container/service-factory";
import { publicProcedure, t } from "$lib/trpc";
import { translateDomainError } from "$lib/trpc/shared/errors";
import { REPORT_TEMPLATE_TYPES, type ReportConfig } from "$lib/schema/report-templates";
import { z } from "zod";

const reportTemplateService = serviceFactory.getReportTemplateService();

// Report config schema for validation
const reportConfigSchema = z.object({
  dateRange: z.object({
    type: z.enum(["selected", "custom", "ytd", "last_year"]),
    startDate: z.string().optional(),
    endDate: z.string().optional(),
  }),
  accountIds: z.array(z.number()).optional(),
  categoryIds: z.array(z.number()).optional(),
  sections: z.object({
    summaryStats: z.boolean(),
    categoryBreakdown: z.boolean(),
    monthlyTrend: z.boolean(),
    transactionDetails: z.boolean(),
    budgetComparison: z.boolean(),
    annotations: z.boolean(),
  }),
  charts: z.object({
    pieChart: z.boolean(),
    barChart: z.boolean(),
    lineChart: z.boolean(),
  }),
  display: z.object({
    showCurrency: z.boolean(),
    showPercentages: z.boolean(),
    groupByCategory: z.boolean(),
    sortBy: z.enum(["amount", "date", "category"]),
  }),
  branding: z
    .object({
      title: z.string().optional(),
      subtitle: z.string().optional(),
      notes: z.string().optional(),
    })
    .optional(),
  exportFormat: z.enum(["pdf", "html", "markdown"]),
}) satisfies z.ZodType<ReportConfig>;

// Input schemas
const templateIdSchema = z.object({
  id: z.number().int().positive(),
});

const createTemplateSchema = z.object({
  name: z.string().min(1).max(100),
  description: z.string().max(500).optional(),
  icon: z.string().max(50).optional(),
  templateType: z.enum(REPORT_TEMPLATE_TYPES),
  config: reportConfigSchema,
});

const updateTemplateSchema = z.object({
  id: z.number().int().positive(),
  name: z.string().min(1).max(100).optional(),
  description: z.string().max(500).optional().nullable(),
  icon: z.string().max(50).optional().nullable(),
  templateType: z.enum(REPORT_TEMPLATE_TYPES).optional(),
  config: reportConfigSchema.optional(),
});

const listByTypeSchema = z.object({
  type: z.enum(REPORT_TEMPLATE_TYPES).optional(),
});

export const reportRoutes = t.router({
  // List all report templates for the workspace
  list: publicProcedure.input(listByTypeSchema.optional()).query(async ({ input, ctx }) => {
    try {
      if (input?.type) {
        return await reportTemplateService.listByType(input.type, ctx.workspaceId);
      }
      return await reportTemplateService.listAll(ctx.workspaceId);
    } catch (error) {
      throw translateDomainError(error);
    }
  }),

  // Get a single report template by ID
  get: publicProcedure.input(templateIdSchema).query(async ({ input, ctx }) => {
    try {
      return await reportTemplateService.getById(input.id, ctx.workspaceId);
    } catch (error) {
      throw translateDomainError(error);
    }
  }),

  // Create a new report template
  create: publicProcedure.input(createTemplateSchema).mutation(async ({ input, ctx }) => {
    try {
      return await reportTemplateService.create(input, ctx.workspaceId);
    } catch (error) {
      throw translateDomainError(error);
    }
  }),

  // Update a report template
  update: publicProcedure.input(updateTemplateSchema).mutation(async ({ input, ctx }) => {
    try {
      const { id, ...data } = input;
      return await reportTemplateService.update(id, data, ctx.workspaceId);
    } catch (error) {
      throw translateDomainError(error);
    }
  }),

  // Delete a report template
  delete: publicProcedure.input(templateIdSchema).mutation(async ({ input, ctx }) => {
    try {
      await reportTemplateService.delete(input.id, ctx.workspaceId);
      return { success: true };
    } catch (error) {
      throw translateDomainError(error);
    }
  }),

  // Set a template as default
  setDefault: publicProcedure.input(templateIdSchema).mutation(async ({ input, ctx }) => {
    try {
      return await reportTemplateService.setDefault(input.id, ctx.workspaceId);
    } catch (error) {
      throw translateDomainError(error);
    }
  }),

  // Record template usage (updates lastUsedAt and useCount)
  recordUsage: publicProcedure.input(templateIdSchema).mutation(async ({ input, ctx }) => {
    try {
      await reportTemplateService.recordUsage(input.id, ctx.workspaceId);
      return { success: true };
    } catch (error) {
      throw translateDomainError(error);
    }
  }),
});
