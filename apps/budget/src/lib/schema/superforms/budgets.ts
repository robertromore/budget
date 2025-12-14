import {
  budgetEnforcementLevels,
  budgetScopes,
  budgetStatuses,
  budgetTypes,
  periodTemplateTypes,
} from "$lib/schema/budgets";
import { z } from "zod";

// Superform-compatible schema for creating budgets
export const superformInsertBudgetSchema = z.object({
  name: z
    .string()
    .min(2, "Budget name must be at least 2 characters")
    .max(80, "Budget name must be less than 80 characters"),
  description: z
    .string()
    .max(500, "Description must be less than 500 characters")
    .optional()
    .nullable(),
  type: z.enum(budgetTypes),
  scope: z.enum(budgetScopes),
  status: z.enum(budgetStatuses).optional(),
  enforcementLevel: z.enum(budgetEnforcementLevels).optional(),
  allocatedAmount: z.number().min(0).optional(),
  periodType: z.enum(periodTemplateTypes).optional(),
  startDay: z.number().min(1).max(366).optional(),
  accountIds: z.array(z.number().int().positive()).optional(),
  categoryIds: z.array(z.number().int().positive()).optional(),
  linkedScheduleId: z.number().int().positive().optional().nullable(),
});

// Superform-compatible schema for updating budgets
export const superformUpdateBudgetSchema = z.object({
  id: z.number().int().positive(),
  name: z
    .string()
    .transform((val) => val?.trim())
    .pipe(
      z
        .string()
        .min(2, "Budget name must be at least 2 characters")
        .max(80, "Budget name must be less than 80 characters")
    )
    .optional(),
  description: z
    .string()
    .transform((val) => val?.trim())
    .pipe(z.string().max(500, "Description must be less than 500 characters"))
    .optional()
    .nullable(),
  status: z.enum(budgetStatuses).optional(),
  enforcementLevel: z.enum(budgetEnforcementLevels).optional(),
  allocatedAmount: z.number().min(0).optional(),
  periodType: z.enum(periodTemplateTypes).optional(),
  startDay: z.number().min(1).max(366).optional(),
  accountIds: z.array(z.number().int().positive()).optional(),
  categoryIds: z.array(z.number().int().positive()).optional(),
  linkedScheduleId: z.number().int().positive().optional().nullable(),
});

export type SuperformInsertBudgetSchema = typeof superformInsertBudgetSchema;
export type SuperformUpdateBudgetSchema = typeof superformUpdateBudgetSchema;

// Superform-compatible schema for creating budget period templates
export const superformCreatePeriodTemplateSchema = z.object({
  budgetId: z.number().int().positive(),
  type: z.enum(periodTemplateTypes),
  intervalCount: z.number().int().min(1).max(52).default(1),
  startDayOfWeek: z.number().int().min(1).max(7).optional(),
  startDayOfMonth: z.number().int().min(1).max(31).optional(),
  startMonth: z.number().int().min(1).max(12).optional(),
  timezone: z.string().optional(),
});

export type SuperformCreatePeriodTemplateSchema = typeof superformCreatePeriodTemplateSchema;
