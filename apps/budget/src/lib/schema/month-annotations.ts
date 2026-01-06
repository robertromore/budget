import { relations, sql } from "drizzle-orm";
import { index, integer, sqliteTable, text } from "drizzle-orm/sqlite-core";
import { createInsertSchema, createSelectSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { accounts } from "./accounts";
import { categories } from "./categories";
import { workspaces } from "./workspaces";

/**
 * Month annotations allow users to add notes and flags to specific months
 * for tracking purposes. These can be attached to an account and/or category
 * for more specific context.
 */
export const monthAnnotations = sqliteTable(
  "month_annotations",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    workspaceId: integer("workspace_id")
      .notNull()
      .references(() => workspaces.id, { onDelete: "cascade" }),

    // The month being annotated (YYYY-MM format)
    month: text("month").notNull(),

    // Optional context - can be account-specific, category-specific, or both
    accountId: integer("account_id").references(() => accounts.id, {
      onDelete: "cascade",
    }),
    categoryId: integer("category_id").references(() => categories.id, {
      onDelete: "cascade",
    }),

    // Content
    note: text("note"),

    // Flags
    flaggedForReview: integer("flagged_for_review", { mode: "boolean" }).default(
      false
    ),

    // Tags for categorization (stored as JSON array)
    tags: text("tags", { mode: "json" }).$type<string[]>().default([]),

    // Metadata
    createdAt: text("created_at")
      .notNull()
      .default(sql`CURRENT_TIMESTAMP`),
    updatedAt: text("updated_at")
      .notNull()
      .default(sql`CURRENT_TIMESTAMP`),
  },
  (table) => [
    index("month_annotations_workspace_id_idx").on(table.workspaceId),
    index("month_annotations_workspace_month_idx").on(
      table.workspaceId,
      table.month
    ),
    index("month_annotations_account_idx").on(table.accountId),
    index("month_annotations_category_idx").on(table.categoryId),
    index("month_annotations_flagged_idx").on(table.flaggedForReview),
  ]
);

export const monthAnnotationsRelations = relations(
  monthAnnotations,
  ({ one }) => ({
    workspace: one(workspaces, {
      fields: [monthAnnotations.workspaceId],
      references: [workspaces.id],
    }),
    account: one(accounts, {
      fields: [monthAnnotations.accountId],
      references: [accounts.id],
    }),
    category: one(categories, {
      fields: [monthAnnotations.categoryId],
      references: [categories.id],
    }),
  })
);

// Zod schemas
export const selectMonthAnnotationSchema = createSelectSchema(monthAnnotations);
export const insertMonthAnnotationSchema = createInsertSchema(monthAnnotations);

// Predefined tag options for consistent UX
export const ANNOTATION_TAGS = [
  "unusual",
  "expected",
  "one-time",
  "recurring",
  "seasonal",
  "anomaly",
] as const;

export type AnnotationTag = (typeof ANNOTATION_TAGS)[number];

// Schema for creating an annotation
export const createAnnotationSchema = z.object({
  month: z
    .string()
    .regex(/^\d{4}-\d{2}$/, "Month must be in YYYY-MM format"),
  accountId: z.number().int().positive().optional(),
  categoryId: z.number().int().positive().optional(),
  note: z.string().max(500).optional(),
  flaggedForReview: z.boolean().optional().default(false),
  tags: z.array(z.string()).optional().default([]),
});

// Schema for updating an annotation
export const updateAnnotationSchema = z.object({
  id: z.number().int().positive(),
  note: z.string().max(500).optional(),
  flaggedForReview: z.boolean().optional(),
  tags: z.array(z.string()).optional(),
});

// Schema for deleting an annotation
export const deleteAnnotationSchema = z.object({
  id: z.number().int().positive(),
});

// Types
export type MonthAnnotation = typeof monthAnnotations.$inferSelect;
export type NewMonthAnnotation = typeof monthAnnotations.$inferInsert;
