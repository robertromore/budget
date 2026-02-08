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

// Account documents schemas
export * from "./account-documents";

// Metric alert schemas
export * from "./metric-alerts";

// ML-related schemas
export * from "./ml-models";
export * from "./prediction-feedback";

// Import table definitions for relations that need to be defined here
// to avoid circular dependencies between schema files
import { relations } from "drizzle-orm";
import { accounts } from "./accounts";
import { budgetAutomationSettings } from "./budget-automation-settings";
import { budgets } from "./budgets";
import { categories } from "./categories";
import { categoryGroups } from "./category-groups";
import { detectedPatterns } from "./detected-patterns";
import { expenseReceipts } from "./expense-receipts";
import { hsaClaims } from "./hsa-claims";
import { importProfiles } from "./import-profiles";
import { medicalExpenses } from "./medical-expenses";
import { payeeCategoryCorrections } from "./payee-category-corrections";
import { payees } from "./payees";
import { schedules } from "./schedules";
import { transactions } from "./transactions";
import { users } from "./users";
import { views } from "./views";
import { workspaces } from "./workspaces";

// Accounts relations (defined here to break accounts ↔ transactions cycle)
export const accountsRelations = relations(accounts, ({ one, many }) => ({
  workspace: one(workspaces, {
    fields: [accounts.workspaceId],
    references: [workspaces.id],
  }),
  transactions: many(transactions, { relationName: "transactionAccount" }),
  transferTransactions: many(transactions, { relationName: "transactionTransferAccount" }),
}));

// Workspace relations (defined here to break workspaces ↔ accounts cycle)
export const workspacesRelations = relations(workspaces, ({ one, many }) => ({
  owner: one(users, {
    fields: [workspaces.ownerId],
    references: [users.id],
  }),
  accounts: many(accounts),
  categories: many(categories),
  categoryGroups: many(categoryGroups),
  payees: many(payees),
  budgets: many(budgets),
  schedules: many(schedules),
  views: many(views),
  budgetAutomationSettings: many(budgetAutomationSettings),
  detectedPatterns: many(detectedPatterns),
  payeeCategoryCorrections: many(payeeCategoryCorrections),
  importProfiles: many(importProfiles),
}));

// User relations (defined here to break accounts → workspaces → users → accounts cycle)
export const usersRelations = relations(users, ({ many }) => ({
  accounts: many(accounts),
  categories: many(categories),
  categoryGroups: many(categoryGroups),
  payees: many(payees),
  budgets: many(budgets),
  schedules: many(schedules),
  views: many(views),
  budgetAutomationSettings: many(budgetAutomationSettings),
  detectedPatterns: many(detectedPatterns),
  payeeCategoryCorrections: many(payeeCategoryCorrections),
}));

// HSA-related relations (defined here to break multi-way cycles)
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
