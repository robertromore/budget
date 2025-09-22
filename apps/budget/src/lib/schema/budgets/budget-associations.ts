import { sqliteTable, text, integer, real } from 'drizzle-orm/sqlite-core';
import { createInsertSchema, createSelectSchema } from 'drizzle-zod';
import { z } from 'zod';
import { budgets } from './budgets';
import { accounts } from '../accounts';
import { categories } from '../categories';
import { transactions } from '../transactions';

// Budget-Account associations (which accounts this budget applies to)
export const budgetAccounts = sqliteTable('budget_accounts', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  budgetId: integer('budget_id').notNull().references(() => budgets.id),
  accountId: integer('account_id').notNull().references(() => accounts.id),
  createdAt: text('created_at').notNull().default(new Date().toISOString())
});

// Budget-Category associations (which categories this budget applies to)
export const budgetCategories = sqliteTable('budget_categories', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  budgetId: integer('budget_id').notNull().references(() => budgets.id),
  categoryId: integer('category_id').notNull().references(() => categories.id),
  allocationAmount: real('allocation_amount'), // For envelope budgeting
  createdAt: text('created_at').notNull().default(new Date().toISOString())
});

// Budget-Transaction associations (which transactions are assigned to budgets)
export const budgetTransactions = sqliteTable('budget_transactions', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  budgetId: integer('budget_id').notNull().references(() => budgets.id),
  transactionId: integer('transaction_id').notNull().references(() => transactions.id),
  amount: real('amount').notNull(), // Portion of transaction amount assigned to this budget
  assignmentType: text('assignment_type', {
    enum: ['automatic', 'manual', 'proportional']
  }).notNull().default('automatic'),
  createdAt: text('created_at').notNull().default(new Date().toISOString()),
  updatedAt: text('updated_at').notNull().default(new Date().toISOString())
});

// Zod schemas for budget-account associations
export const insertBudgetAccountSchema = createInsertSchema(budgetAccounts);
export const selectBudgetAccountSchema = createSelectSchema(budgetAccounts);

// Zod schemas for budget-category associations
export const insertBudgetCategorySchema = createInsertSchema(budgetCategories, {
  allocationAmount: z.number().min(0, 'Allocation amount must be positive').optional()
});
export const selectBudgetCategorySchema = createSelectSchema(budgetCategories);

// Zod schemas for budget-transaction associations
export const insertBudgetTransactionSchema = createInsertSchema(budgetTransactions, {
  amount: z.number().min(0, 'Amount must be positive'),
  assignmentType: z.enum(['automatic', 'manual', 'proportional']).default('automatic')
});
export const selectBudgetTransactionSchema = createSelectSchema(budgetTransactions);
export const updateBudgetTransactionSchema = insertBudgetTransactionSchema.partial().omit({ id: true, budgetId: true, transactionId: true });

export type BudgetAccount = z.infer<typeof selectBudgetAccountSchema>;
export type NewBudgetAccount = z.infer<typeof insertBudgetAccountSchema>;

export type BudgetCategory = z.infer<typeof selectBudgetCategorySchema>;
export type NewBudgetCategory = z.infer<typeof insertBudgetCategorySchema>;

export type BudgetTransaction = z.infer<typeof selectBudgetTransactionSchema>;
export type NewBudgetTransaction = z.infer<typeof insertBudgetTransactionSchema>;
export type UpdateBudgetTransaction = z.infer<typeof updateBudgetTransactionSchema>;