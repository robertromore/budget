export * from "./accounts";
export * from "./categories";
export * from "./budgets";
// export * from './category_groups';
export * from "./payees";
export * from "./payee-category-corrections";
export * from "./schedules";
export * from "./schedule-dates";
export * from "./transactions";
export * from "./views";
export * from "./detected-patterns";
export * from "./recommendations";

// HSA-related schemas
export * from "./medical-expenses";
export * from "./expense-receipts";
export * from "./hsa-claims";

// Import table definitions for HSA relations
import { relations } from "drizzle-orm";
import { medicalExpenses } from "./medical-expenses";
import { expenseReceipts } from "./expense-receipts";
import { hsaClaims } from "./hsa-claims";
import { transactions } from "./transactions";
import { accounts } from "./accounts";

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
