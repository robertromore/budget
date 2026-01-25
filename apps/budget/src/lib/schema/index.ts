export * from "./accounts";
export * from "./automation-rules";
export * from "./budget-automation-settings";
export * from "./budgets";
export * from "./categories";
export * from "./category-aliases";
export * from "./category-groups";
export * from "./detected-patterns";
export * from "./import-profiles";
export * from "./month-annotations";
export * from "./notifications";
export * from "./payee-ai-enhancements";
export * from "./payee-aliases";
export * from "./payee-categories";
export * from "./payee-category-corrections";
export * from "./payees";
export * from "./recommendations";
export * from "./report-templates";
export * from "./schedule-dates";
export * from "./schedule-price-history";
export * from "./schedule-skips";
export * from "./schedules";
export * from "./transactions";
export * from "./transfer-mappings";
export * from "./users";
export * from "./views";
export * from "./workspace-counters";
export * from "./workspaces";

// Authentication schemas
export * from "./auth";
export * from "./workspace-invitations";
export * from "./workspace-members";

// Security schemas (encryption, risk assessment, access logging)
export * from "./security";

// AI-related schemas
export * from "./ai-conversations";

// HSA-related schemas
export * from "./expense-receipts";
export * from "./hsa-claims";
export * from "./medical-expenses";

// Utility-related schemas
export * from "./utility-usage";

// Subscription-related schemas
export * from "./subscriptions-table";

// Bank connection schemas
export * from "./account-connections";

// ML-related schemas
export * from "./ml-models";
export * from "./prediction-feedback";

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
