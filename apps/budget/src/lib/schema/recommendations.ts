import { relations, sql } from "drizzle-orm";
import {
  sqliteTable,
  integer,
  text,
  real,
  index,
} from "drizzle-orm/sqlite-core";
import { createInsertSchema, createSelectSchema } from "drizzle-zod";
import { budgets } from "./budgets";
import { accounts } from "./accounts";
import { categories } from "./categories";
import { z } from "zod";

export const recommendationTypes = [
  "create_budget",
  "increase_budget",
  "decrease_budget",
  "merge_budgets",
  "seasonal_adjustment",
  "missing_category",
] as const;

export const recommendationPriorities = ["high", "medium", "low"] as const;

export const recommendationStatuses = [
  "pending",
  "dismissed",
  "applied",
  "expired",
] as const;

export type RecommendationType = (typeof recommendationTypes)[number];
export type RecommendationPriority = (typeof recommendationPriorities)[number];
export type RecommendationStatus = (typeof recommendationStatuses)[number];

export interface RecommendationMetadata {
  // For all types
  analysisTimeRange?: {
    startDate: string;
    endDate: string;
    monthsAnalyzed: number;
  };
  transactionCount?: number;
  averageMonthlySpend?: number;
  medianMonthlySpend?: number;
  spendingVariance?: number;
  trend?: "increasing" | "decreasing" | "stable";

  // For create_budget
  suggestedAmount?: number;
  suggestedType?: string;
  suggestedScope?: string;
  detectedFrequency?: string;
  payeeIds?: number[];

  // For increase/decrease_budget
  currentAmount?: number;
  recommendedAmount?: number;
  utilizationRate?: number;
  monthsExceeded?: number;
  monthsUnderutilized?: number;

  // For merge_budgets
  budgetIdsToMerge?: number[];
  budgetNamesToMerge?: string[];
  combinedSuggestedAmount?: number;

  // For seasonal_adjustment
  seasonalPattern?: {
    month: number;
    averageSpend: number;
    variance: number;
  }[];
  peakMonths?: number[];
  lowMonths?: number[];

  // For missing_category
  uncategorizedCount?: number;
  suggestedCategoryName?: string;

  [key: string]: unknown;
}

export const budgetRecommendations = sqliteTable(
  "budget_recommendation",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    type: text("type", { enum: recommendationTypes }).notNull(),
    priority: text("priority", { enum: recommendationPriorities })
      .notNull()
      .default("medium"),
    title: text("title").notNull(),
    description: text("description").notNull(),
    confidence: real("confidence").notNull(), // 0-100
    metadata: text("metadata", { mode: "json" })
      .$type<RecommendationMetadata>()
      .default({})
      .notNull(),
    status: text("status", { enum: recommendationStatuses })
      .notNull()
      .default("pending"),
    budgetId: integer("budget_id").references(() => budgets.id, {
      onDelete: "cascade",
    }),
    accountId: integer("account_id").references(() => accounts.id, {
      onDelete: "cascade",
    }),
    categoryId: integer("category_id").references(() => categories.id, {
      onDelete: "cascade",
    }),
    createdAt: text("created_at")
      .notNull()
      .default(sql`CURRENT_TIMESTAMP`),
    expiresAt: text("expires_at"), // Recommendations expire after 30 days
    updatedAt: text("updated_at")
      .notNull()
      .default(sql`CURRENT_TIMESTAMP`),
    appliedAt: text("applied_at"),
    dismissedAt: text("dismissed_at"),
  },
  (table) => [
    index("recommendation_type_idx").on(table.type),
    index("recommendation_status_idx").on(table.status),
    index("recommendation_priority_idx").on(table.priority),
    index("recommendation_budget_id_idx").on(table.budgetId),
    index("recommendation_category_id_idx").on(table.categoryId),
    index("recommendation_account_id_idx").on(table.accountId),
    index("recommendation_created_at_idx").on(table.createdAt),
    index("recommendation_expires_at_idx").on(table.expiresAt),
  ]
);

export const budgetRecommendationsRelations = relations(
  budgetRecommendations,
  ({ one }) => ({
    budget: one(budgets, {
      fields: [budgetRecommendations.budgetId],
      references: [budgets.id],
    }),
    account: one(accounts, {
      fields: [budgetRecommendations.accountId],
      references: [accounts.id],
    }),
    category: one(categories, {
      fields: [budgetRecommendations.categoryId],
      references: [categories.id],
    }),
  })
);

export const selectRecommendationSchema = createSelectSchema(budgetRecommendations);
export const insertRecommendationSchema = createInsertSchema(budgetRecommendations);

export type BudgetRecommendation = typeof budgetRecommendations.$inferSelect;
export type NewBudgetRecommendation = typeof budgetRecommendations.$inferInsert;

export interface BudgetRecommendationWithRelations extends BudgetRecommendation {
  budget?: typeof budgets.$inferSelect | null;
  account?: typeof accounts.$inferSelect | null;
  category?: typeof categories.$inferSelect | null;
}
