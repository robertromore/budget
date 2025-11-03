export * from "./workspaces";
export * from "./accounts";
export * from "./budget-automation-settings";
export * from "./budgets";
export * from "./categories";
export * from "./category-groups";
export * from "./detected-patterns";
export * from "./payee-category-corrections";
export * from "./payees";
export * from "./recommendations";
export * from "./schedule-dates";
export * from "./schedules";
export * from "./transactions";
export * from "./views";

// HSA-related schemas
export * from "./expense-receipts";
export * from "./hsa-claims";
export * from "./medical-expenses";

// Import table definitions for HSA relations
import { relations } from "drizzle-orm";
import { accounts } from "./accounts";
import { expenseReceipts } from "./expense-receipts";
import { hsaClaims } from "./hsa-claims";
import { medicalExpenses } from "./medical-expenses";
import { transactions } from "./transactions";

// Define HSA-related relations here to avoid circular dependencies
export const medicalExpensesRelations = relations(medicalExpenses, ({ one, many }) => ({
  transaction: one(transactions, {
    fields: [medicalExpenses.transactionId],
    references: [transactions.id],
  }),
  hsaAccount: one(accounts, {
    fields: [medicalExpenses.hsaAccountId],
    references: [accounts.id],
  }),
  receipts: many(expenseReceipts),
  claims: many(hsaClaims),
}));

export const expenseReceiptsRelations = relations(expenseReceipts, ({ one }) => ({
  medicalExpense: one(medicalExpenses, {
    fields: [expenseReceipts.medicalExpenseId],
    references: [medicalExpenses.id],
  }),
}));

export const hsaClaimsRelations = relations(hsaClaims, ({ one }) => ({
  medicalExpense: one(medicalExpenses, {
    fields: [hsaClaims.medicalExpenseId],
    references: [medicalExpenses.id],
  }),
}));
