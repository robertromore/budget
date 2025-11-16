import {relations, sql} from "drizzle-orm";
import {index, integer, real, sqliteTable, text, uniqueIndex} from "drizzle-orm/sqlite-core";
import {createInsertSchema, createSelectSchema} from "drizzle-zod";
import validator from "validator";
import {z} from "zod/v4";
import {categories} from "./categories";
import {workspaces} from "./workspaces";

// ================================================================================
// Table: category_groups
// ================================================================================

export const categoryGroups = sqliteTable(
  "category_groups",
  {
    id: integer("id").primaryKey({autoIncrement: true}),
    workspaceId: integer("workspace_id")
      .notNull()
      .references(() => workspaces.id, {onDelete: "cascade"}),
    name: text("name").notNull().unique(),
    slug: text("slug").notNull().unique(),
    description: text("description"),
    groupIcon: text("group_icon"),
    groupColor: text("group_color"),
    sortOrder: integer("sort_order").notNull().default(0),
    createdAt: text("created_at")
      .notNull()
      .default(sql`(datetime('now'))`),
    updatedAt: text("updated_at")
      .notNull()
      .default(sql`(datetime('now'))`),
  },
  (table) => [
    index("category_groups_workspace_id_idx").on(table.workspaceId),
    index("idx_category_groups_slug").on(table.slug),
    index("idx_category_groups_sort_order").on(table.sortOrder),
  ]
);

export const categoryGroupsRelations = relations(categoryGroups, ({one, many}) => ({
  workspace: one(workspaces, {
    fields: [categoryGroups.workspaceId],
    references: [workspaces.id],
  }),
  memberships: many(categoryGroupMemberships),
  recommendations: many(categoryGroupRecommendations),
}));

export type CategoryGroup = typeof categoryGroups.$inferSelect;
export type NewCategoryGroup = typeof categoryGroups.$inferInsert;

// Extended types with computed fields
export interface CategoryGroupWithCounts extends CategoryGroup {
  memberCount: number;
  pendingRecommendationCount: number;
}

// ================================================================================
// Table: category_group_memberships
// ================================================================================

export const categoryGroupMemberships = sqliteTable(
  "category_group_memberships",
  {
    id: integer("id").primaryKey({autoIncrement: true}),
    categoryGroupId: integer("category_group_id")
      .notNull()
      .references(() => categoryGroups.id, {onDelete: "cascade"}),
    categoryId: integer("category_id")
      .notNull()
      .references(() => categories.id, {onDelete: "cascade"}),
    sortOrder: integer("sort_order").notNull().default(0),
    createdAt: text("created_at")
      .notNull()
      .default(sql`(datetime('now'))`),
  },
  (table) => [
    uniqueIndex("unique_pair").on(table.categoryGroupId, table.categoryId),
    // CRITICAL: Enforces single-group membership
    uniqueIndex("unique_category_single_group").on(table.categoryId),
    index("idx_cgm_group_id").on(table.categoryGroupId),
  ]
);

export const categoryGroupMembershipsRelations = relations(categoryGroupMemberships, ({one}) => ({
  categoryGroup: one(categoryGroups, {
    fields: [categoryGroupMemberships.categoryGroupId],
    references: [categoryGroups.id],
  }),
  category: one(categories, {
    fields: [categoryGroupMemberships.categoryId],
    references: [categories.id],
  }),
}));

export type CategoryGroupMembership = typeof categoryGroupMemberships.$inferSelect;
export type NewCategoryGroupMembership = typeof categoryGroupMemberships.$inferInsert;

// ================================================================================
// Table: category_group_recommendations
// ================================================================================

export const categoryGroupRecommendationStatusEnum = [
  "pending",
  "approved",
  "dismissed",
  "rejected",
] as const;
export type CategoryGroupRecommendationStatus =
  (typeof categoryGroupRecommendationStatusEnum)[number];

export const categoryGroupRecommendations = sqliteTable(
  "category_group_recommendations",
  {
    id: integer("id").primaryKey({autoIncrement: true}),
    categoryId: integer("category_id")
      .notNull()
      .references(() => categories.id, {onDelete: "cascade"}),
    suggestedGroupId: integer("suggested_group_id").references(() => categoryGroups.id, {
      onDelete: "set null",
    }),
    suggestedGroupName: text("suggested_group_name"),
    confidenceScore: real("confidence_score").notNull(),
    reasoning: text("reasoning"),
    status: text("status", {enum: categoryGroupRecommendationStatusEnum})
      .notNull()
      .default("pending"),
    createdAt: text("created_at")
      .notNull()
      .default(sql`(datetime('now'))`),
    updatedAt: text("updated_at")
      .notNull()
      .default(sql`(datetime('now'))`),
  },
  (table) => [
    index("idx_cgr_category_id").on(table.categoryId),
    index("idx_cgr_status").on(table.status),
    index("idx_cgr_confidence").on(table.confidenceScore),
  ]
);

export const categoryGroupRecommendationsRelations = relations(
  categoryGroupRecommendations,
  ({one}) => ({
    category: one(categories, {
      fields: [categoryGroupRecommendations.categoryId],
      references: [categories.id],
    }),
    suggestedGroup: one(categoryGroups, {
      fields: [categoryGroupRecommendations.suggestedGroupId],
      references: [categoryGroups.id],
    }),
  })
);

export type CategoryGroupRecommendation = typeof categoryGroupRecommendations.$inferSelect;
export type NewCategoryGroupRecommendation = typeof categoryGroupRecommendations.$inferInsert;

// ================================================================================
// Table: category_group_settings
// ================================================================================

export const categoryGroupSettings = sqliteTable("category_group_settings", {
  id: integer("id").primaryKey({autoIncrement: true}),
  recommendationsEnabled: integer("recommendations_enabled", {mode: "boolean"})
    .notNull()
    .default(true),
  minConfidenceScore: real("min_confidence_score").notNull().default(0.7),
  updatedAt: text("updated_at")
    .notNull()
    .default(sql`(datetime('now'))`),
});

export type CategoryGroupSettings = typeof categoryGroupSettings.$inferSelect;
export type NewCategoryGroupSettings = typeof categoryGroupSettings.$inferInsert;

// ================================================================================
// Zod Schemas
// ================================================================================

// Category Group schemas
export const insertCategoryGroupSchema = createInsertSchema(categoryGroups, {
  name: (schema) =>
    schema
      .transform((val) => val?.trim())
      .pipe(
        z
          .string()
          .min(1, "Category group name is required")
          .refine((val) => {
            if (validator.contains(val, "<") || validator.contains(val, ">")) return false;
            return true;
          }, "Category group name contains invalid characters")
      ),
  description: (schema) =>
    schema.transform((val) => (val?.trim() ? val.trim() : null)).pipe(z.string().nullable()),
  groupIcon: z.string().nullable().optional(),
  groupColor: z
    .string()
    .regex(/^#[0-9A-Fa-f]{6}$/, "Invalid color format")
    .nullable()
    .optional(),
});

export const selectCategoryGroupSchema = createSelectSchema(categoryGroups);

export const updateCategoryGroupSchema = insertCategoryGroupSchema
  .partial()
  .extend({id: z.number()});

// Membership schemas
export const insertCategoryGroupMembershipSchema = createInsertSchema(categoryGroupMemberships);
export const selectCategoryGroupMembershipSchema = createSelectSchema(categoryGroupMemberships);

// Recommendation schemas
export const insertCategoryGroupRecommendationSchema = createInsertSchema(
  categoryGroupRecommendations,
  {
    confidenceScore: z.number().min(0).max(1),
    status: z.enum(categoryGroupRecommendationStatusEnum),
  }
);
export const selectCategoryGroupRecommendationSchema = createSelectSchema(
  categoryGroupRecommendations
);

// Settings schemas
export const insertCategoryGroupSettingsSchema = createInsertSchema(categoryGroupSettings, {
  minConfidenceScore: z.number().min(0).max(1),
});
export const selectCategoryGroupSettingsSchema = createSelectSchema(categoryGroupSettings);
export const updateCategoryGroupSettingsSchema = insertCategoryGroupSettingsSchema
  .partial()
  .omit({id: true});

// ================================================================================
// Form Schemas (for tRPC and Superforms)
// ================================================================================

// Category Group form schemas
export const formInsertCategoryGroupSchema = z.object({
  name: z
    .string()
    .min(1, "Category group name is required")
    .max(100, "Category group name must be less than 100 characters")
    .refine((val) => {
      if (validator.contains(val, "<") || validator.contains(val, ">")) return false;
      if (validator.contains(val, "{") || validator.contains(val, "}")) return false;
      return true;
    }, "Category group name contains invalid characters"),
  description: z
    .string()
    .max(500, "Description must be less than 500 characters")
    .refine((val) => {
      if (!val) return true;
      if (validator.contains(val, "<") || validator.contains(val, ">")) return false;
      return true;
    }, "Description cannot contain HTML tags")
    .optional()
    .nullable(),
  groupIcon: z.string().optional().nullable(),
  groupColor: z
    .string()
    .regex(/^#[0-9A-Fa-f]{6}$/, "Invalid color format")
    .optional()
    .nullable(),
  sortOrder: z.number().nonnegative().optional(),
});

export const formUpdateCategoryGroupSchema = formInsertCategoryGroupSchema.partial().extend({
  id: z.number().positive(),
});

// Settings form schema
export const formUpdateCategoryGroupSettingsSchema = z.object({
  recommendationsEnabled: z.boolean().optional(),
  minConfidenceScore: z.number().min(0).max(1).optional(),
});
