import { sqliteTable, text, integer, real } from 'drizzle-orm/sqlite-core';
import { createInsertSchema, createSelectSchema } from 'drizzle-zod';
import { z } from 'zod';
import { budgets } from './budgets';

export const budgetGroups = sqliteTable('budget_groups', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  name: text('name').notNull(),
  description: text('description'),
  parentId: integer('parent_id').references(() => budgetGroups.id),
  spendingLimit: real('spending_limit'), // Optional spending limit for the group
  color: text('color'), // Hex color code for UI
  sortOrder: integer('sort_order').notNull().default(0),
  createdAt: text('created_at').notNull().default(new Date().toISOString()),
  updatedAt: text('updated_at').notNull().default(new Date().toISOString()),
  deletedAt: text('deleted_at')
});

// Junction table for budget-group memberships (many-to-many)
export const budgetGroupMemberships = sqliteTable('budget_group_memberships', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  budgetId: integer('budget_id').notNull().references(() => budgets.id),
  groupId: integer('group_id').notNull().references(() => budgetGroups.id),
  createdAt: text('created_at').notNull().default(new Date().toISOString())
});

// Zod schemas
export const insertBudgetGroupSchema = createInsertSchema(budgetGroups, {
  name: z.string().min(1, 'Group name is required').max(255, 'Group name too long'),
  description: z.string().max(1000, 'Description too long').optional(),
  spendingLimit: z.number().positive('Spending limit must be positive').optional(),
  color: z.string().regex(/^#[0-9A-F]{6}$/i, 'Color must be valid hex code').optional(),
  sortOrder: z.number().int().min(0).default(0)
});

export const selectBudgetGroupSchema = createSelectSchema(budgetGroups);
export const updateBudgetGroupSchema = insertBudgetGroupSchema.partial().omit({ id: true });

export const insertBudgetGroupMembershipSchema = createInsertSchema(budgetGroupMemberships);
export const selectBudgetGroupMembershipSchema = createSelectSchema(budgetGroupMemberships);

export type BudgetGroup = z.infer<typeof selectBudgetGroupSchema>;
export type NewBudgetGroup = z.infer<typeof insertBudgetGroupSchema>;
export type UpdateBudgetGroup = z.infer<typeof updateBudgetGroupSchema>;
export type BudgetGroupMembership = z.infer<typeof selectBudgetGroupMembershipSchema>;
export type NewBudgetGroupMembership = z.infer<typeof insertBudgetGroupMembershipSchema>;