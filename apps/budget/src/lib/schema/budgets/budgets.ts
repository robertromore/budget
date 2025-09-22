import { sqliteTable, text, integer, real, blob } from 'drizzle-orm/sqlite-core';
import { createInsertSchema, createSelectSchema } from 'drizzle-zod';
import { z } from 'zod';

export const budgets = sqliteTable('budgets', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  name: text('name').notNull(),
  description: text('description'),
  type: text('type', {
    enum: ['account-monthly', 'category-envelope', 'goal-based', 'scheduled-expense']
  }).notNull(),
  scope: text('scope', {
    enum: ['account', 'category', 'global', 'mixed']
  }).notNull(),
  status: text('status', {
    enum: ['active', 'inactive', 'archived']
  }).notNull().default('active'),
  enforcementLevel: text('enforcement_level', {
    enum: ['none', 'warning', 'strict']
  }).notNull().default('warning'),
  metadata: blob('metadata', { mode: 'json' }).$type<Record<string, any>>(),
  createdAt: text('created_at').notNull().default(new Date().toISOString()),
  updatedAt: text('updated_at').notNull().default(new Date().toISOString()),
  deletedAt: text('deleted_at')
});

// Zod schemas
export const insertBudgetSchema = createInsertSchema(budgets, {
  name: z.string().min(1, 'Budget name is required').max(255, 'Budget name too long'),
  description: z.string().max(1000, 'Description too long').optional(),
  type: z.enum(['account-monthly', 'category-envelope', 'goal-based', 'scheduled-expense']),
  scope: z.enum(['account', 'category', 'global', 'mixed']),
  status: z.enum(['active', 'inactive', 'archived']).default('active'),
  enforcementLevel: z.enum(['none', 'warning', 'strict']).default('warning'),
  metadata: z.record(z.any()).optional()
});

export const selectBudgetSchema = createSelectSchema(budgets);
export const updateBudgetSchema = insertBudgetSchema.partial().omit({ id: true });

export type Budget = z.infer<typeof selectBudgetSchema>;
export type NewBudget = z.infer<typeof insertBudgetSchema>;
export type UpdateBudget = z.infer<typeof updateBudgetSchema>;