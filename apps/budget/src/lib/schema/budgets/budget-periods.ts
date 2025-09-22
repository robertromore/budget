import { sqliteTable, text, integer, real } from 'drizzle-orm/sqlite-core';
import { createInsertSchema, createSelectSchema } from 'drizzle-zod';
import { z } from 'zod';
import { budgets } from './budgets';

// Period templates define how periods should be created (weekly, monthly, etc.)
export const budgetPeriodTemplates = sqliteTable('budget_period_templates', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  budgetId: integer('budget_id').notNull().references(() => budgets.id),
  frequency: text('frequency', {
    enum: ['weekly', 'monthly', 'quarterly', 'yearly', 'custom']
  }).notNull(),
  interval: integer('interval').notNull().default(1), // Every N weeks/months
  startDate: text('start_date').notNull(), // ISO date string
  endDate: text('end_date'), // Optional end date for finite budgets
  autoCreate: integer('auto_create', { mode: 'boolean' }).notNull().default(true),
  createdAt: text('created_at').notNull().default(new Date().toISOString()),
  updatedAt: text('updated_at').notNull().default(new Date().toISOString())
});

// Actual period instances with allocations and spending tracking
export const budgetPeriodInstances = sqliteTable('budget_period_instances', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  budgetId: integer('budget_id').notNull().references(() => budgets.id),
  templateId: integer('template_id').references(() => budgetPeriodTemplates.id),
  name: text('name').notNull(), // e.g., "January 2024", "Q1 2024"
  startDate: text('start_date').notNull(), // ISO date string
  endDate: text('end_date').notNull(), // ISO date string
  allocatedAmount: real('allocated_amount').notNull().default(0),
  rolloverAmount: real('rollover_amount').notNull().default(0), // From previous period
  spentAmount: real('spent_amount').notNull().default(0), // Calculated from transactions
  adjustmentAmount: real('adjustment_amount').notNull().default(0), // Manual adjustments
  status: text('status', {
    enum: ['draft', 'active', 'closed', 'archived']
  }).notNull().default('active'),
  createdAt: text('created_at').notNull().default(new Date().toISOString()),
  updatedAt: text('updated_at').notNull().default(new Date().toISOString())
});

// Zod schemas for period templates
export const insertBudgetPeriodTemplateSchema = createInsertSchema(budgetPeriodTemplates, {
  frequency: z.enum(['weekly', 'monthly', 'quarterly', 'yearly', 'custom']),
  interval: z.number().int().min(1).default(1),
  startDate: z.string().min(1, 'Start date is required'),
  endDate: z.string().optional(),
  autoCreate: z.boolean().default(true)
});

export const selectBudgetPeriodTemplateSchema = createSelectSchema(budgetPeriodTemplates);
export const updateBudgetPeriodTemplateSchema = insertBudgetPeriodTemplateSchema.partial().omit({ id: true, budgetId: true });

// Zod schemas for period instances
export const insertBudgetPeriodInstanceSchema = createInsertSchema(budgetPeriodInstances, {
  name: z.string().min(1, 'Period name is required'),
  startDate: z.string().min(1, 'Start date is required'),
  endDate: z.string().min(1, 'End date is required'),
  allocatedAmount: z.number().min(0).default(0),
  rolloverAmount: z.number().default(0),
  spentAmount: z.number().default(0),
  adjustmentAmount: z.number().default(0),
  status: z.enum(['draft', 'active', 'closed', 'archived']).default('active')
});

export const selectBudgetPeriodInstanceSchema = createSelectSchema(budgetPeriodInstances);
export const updateBudgetPeriodInstanceSchema = insertBudgetPeriodInstanceSchema.partial().omit({ id: true, budgetId: true });

export type BudgetPeriodTemplate = z.infer<typeof selectBudgetPeriodTemplateSchema>;
export type NewBudgetPeriodTemplate = z.infer<typeof insertBudgetPeriodTemplateSchema>;
export type UpdateBudgetPeriodTemplate = z.infer<typeof updateBudgetPeriodTemplateSchema>;

export type BudgetPeriodInstance = z.infer<typeof selectBudgetPeriodInstanceSchema>;
export type NewBudgetPeriodInstance = z.infer<typeof insertBudgetPeriodInstanceSchema>;
export type UpdateBudgetPeriodInstance = z.infer<typeof updateBudgetPeriodInstanceSchema>;