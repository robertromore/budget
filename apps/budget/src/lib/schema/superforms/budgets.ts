import {
  budgetAssociationTypes,
  budgetEnforcementLevels,
  budgetScopes,
  budgetStatuses,
  budgetTypes,
  periodTemplateTypes,
} from "../budgets";
import { z } from "zod";

// Schema for account associations with types (for goal-based budgets)
export const accountAssociationSchema = z.object({
  accountId: z.number().int().positive(),
  associationType: z.enum(budgetAssociationTypes),
});

export type AccountAssociation = z.infer<typeof accountAssociationSchema>;

// Schedule creation modes for scheduled-expense budgets
// "link" is first/default - existing schedules can be linked to the budget
export const scheduleCreationModes = ["link", "create"] as const;
export type ScheduleCreationMode = (typeof scheduleCreationModes)[number];

// Schedule frequency options for inline creation
export const scheduleFrequencies = [
  "weekly",
  "bi-weekly",
  "monthly",
  "quarterly",
  "yearly",
] as const;
export type ScheduleFrequency = (typeof scheduleFrequencies)[number];

// Schema for inline schedule creation
export const newScheduleSchema = z.object({
  name: z
    .string()
    .min(2, "Schedule name must be at least 2 characters")
    .max(80, "Schedule name must be less than 80 characters"),
  amount: z.number().positive("Amount must be positive"),
  accountId: z.number().int().positive("Account is required"),
  payeeId: z.number().int().positive().optional().nullable(),
  categoryId: z.number().int().positive().optional().nullable(),
  frequency: z.enum(scheduleFrequencies),
  startDate: z.string().min(1, "Start date is required"),
});

export type NewScheduleData = z.infer<typeof newScheduleSchema>;

// Superform-compatible schema for creating budgets
export const superformInsertBudgetSchema = z
  .object({
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
    intervalCount: z.number().int().min(1).max(365).optional(),
    accountIds: z.array(z.number().int().positive()).optional(),
    // Account associations with types (for goal-based budgets)
    accountAssociations: z.array(accountAssociationSchema).optional(),
    categoryIds: z.array(z.number().int().positive()).optional(),
    linkedScheduleId: z.number().int().positive().optional().nullable(),
    // Schedule creation mode for scheduled-expense budgets
    scheduleMode: z.enum(scheduleCreationModes).default("link"),
    // New schedule data (used when scheduleMode === 'create')
    newSchedule: newScheduleSchema.optional().nullable(),
  })
  .refine(
    (data) => {
      // Only validate newSchedule when type is scheduled-expense and mode is create
      if (data.type === "scheduled-expense" && data.scheduleMode === "create") {
        return data.newSchedule !== null && data.newSchedule !== undefined;
      }
      return true;
    },
    {
      message: "Schedule details are required when creating a new schedule",
      path: ["newSchedule"],
    }
  );

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
  intervalCount: z.number().int().min(1).max(365).optional(),
  accountIds: z.array(z.number().int().positive()).optional(),
  categoryIds: z.array(z.number().int().positive()).optional(),
  linkedScheduleId: z.number().int().positive().optional().nullable(),
});

export type SuperformInsertBudgetSchema = typeof superformInsertBudgetSchema;
export type SuperformInsertBudgetData = z.infer<typeof superformInsertBudgetSchema>;
export type SuperformUpdateBudgetSchema = typeof superformUpdateBudgetSchema;
export type SuperformUpdateBudgetData = z.infer<typeof superformUpdateBudgetSchema>;

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
