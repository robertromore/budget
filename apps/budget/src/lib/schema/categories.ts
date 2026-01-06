import { isValidIconName } from "$lib/utils/icon-validation";
import { relations, sql } from "drizzle-orm";
import {
  index,
  integer,
  real,
  sqliteTable,
  text,
  type AnySQLiteColumn,
} from "drizzle-orm/sqlite-core";
import { createInsertSchema, createSelectSchema } from "drizzle-zod";
import validator from "validator";
import { z } from "zod/v4";
import { workspaces } from "./workspaces";

export const categoryTypeEnum = [
  "income", // Salary, freelance, investments, gifts received
  "expense", // Most categories (default)
  "transfer", // Between accounts (not counted in income/expense)
  "savings", // Goal-based savings categories
] as const;

export type CategoryType = (typeof categoryTypeEnum)[number];

export const taxCategories = [
  "charitable_contributions",
  "medical_expenses",
  "business_expenses",
  "home_office",
  "education",
  "state_local_taxes",
  "mortgage_interest",
  "investment_expenses",
  "other",
] as const;

export type TaxCategory = (typeof taxCategories)[number];

export const spendingPriorityEnum = [
  "essential", // Rent, utilities, groceries
  "important", // Insurance, healthcare
  "discretionary", // Entertainment, dining out
  "luxury", // Vacations, high-end purchases
] as const;

export type SpendingPriority = (typeof spendingPriorityEnum)[number];

export const incomeReliabilityEnum = [
  "guaranteed", // Salary, pension, annuities
  "recurring", // Regular freelance, rental income
  "variable", // Commissions, bonuses, overtime
  "occasional", // Gifts, side gigs, one-time payments
] as const;

export type IncomeReliability = (typeof incomeReliabilityEnum)[number];

export const categories = sqliteTable(
  "categories",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    seq: integer("seq"), // Per-workspace sequential ID
    workspaceId: integer("workspace_id")
      .notNull()
      .references(() => workspaces.id, { onDelete: "cascade" }),
    parentId: integer("parent_id").references((): AnySQLiteColumn => categories.id, {
      onDelete: "set null",
    }),
    name: text("name"),
    slug: text("slug").notNull().unique(),
    notes: text("notes"),

    // Type classification
    categoryType: text("category_type", { enum: categoryTypeEnum }).notNull().default("expense"),

    // Visual customization
    categoryIcon: text("category_icon"),
    categoryColor: text("category_color"),
    isActive: integer("is_active", { mode: "boolean" }).notNull().default(true),
    displayOrder: integer("display_order").notNull().default(0),

    // Tax tracking
    isTaxDeductible: integer("is_tax_deductible", { mode: "boolean" }).notNull().default(false),
    taxCategory: text("tax_category", { enum: taxCategories }),
    deductiblePercentage: integer("deductible_percentage"),

    // Spending patterns (for expenses)
    isSeasonal: integer("is_seasonal", { mode: "boolean" }).notNull().default(false),
    seasonalMonths: text("seasonal_months", { mode: "json" }).$type<string[]>(),
    expectedMonthlyMin: real("expected_monthly_min"),
    expectedMonthlyMax: real("expected_monthly_max"),
    spendingPriority: text("spending_priority", { enum: spendingPriorityEnum }),

    // Income patterns (for income)
    incomeReliability: text("income_reliability", { enum: incomeReliabilityEnum }),

    dateCreated: text("date_created")
      .notNull()
      .default(sql`CURRENT_TIMESTAMP`),
    createdAt: text("created_at")
      .notNull()
      .default(sql`CURRENT_TIMESTAMP`),
    updatedAt: text("updated_at")
      .notNull()
      .default(sql`CURRENT_TIMESTAMP`),
    deletedAt: text("deleted_at"),
  },
  (table) => [
    index("category_workspace_id_idx").on(table.workspaceId),
    index("category_name_idx").on(table.name),
    index("category_slug_idx").on(table.slug),
    index("category_parent_idx").on(table.parentId),
    index("category_deleted_at_idx").on(table.deletedAt),
    index("category_type_idx").on(table.categoryType),
    index("category_icon_idx").on(table.categoryIcon),
    index("category_is_active_idx").on(table.isActive),
    index("category_display_order_idx").on(table.displayOrder),
    index("category_tax_deductible_idx").on(table.isTaxDeductible),
    index("category_is_seasonal_idx").on(table.isSeasonal),
    index("category_spending_priority_idx").on(table.spendingPriority),
    index("category_income_reliability_idx").on(table.incomeReliability),
  ]
);

export const categoriesRelations = relations(categories, ({ one }) => ({
  workspace: one(workspaces, {
    fields: [categories.workspaceId],
    references: [workspaces.id],
  }),
  parent: one(categories, {
    fields: [categories.parentId],
    references: [categories.id],
  }),
}));

export const selectCategorySchema = createSelectSchema(categories);
export const insertCategorySchema = createInsertSchema(categories);
export const formInsertCategorySchema = createInsertSchema(categories, {
  workspaceId: (schema) => schema.optional(),
  name: (schema) =>
    schema
      .transform((val) => val?.trim())
      .pipe(
        z
          .string()
          .min(1, "Category name is required")
          .max(50, "Category name must be less than 50 characters")
          .refine((val) => {
            // Only reject XSS/HTML injection patterns and structural characters
            if (validator.contains(val, "<") || validator.contains(val, ">")) return false;
            if (validator.contains(val, "{") || validator.contains(val, "}")) return false;
            if (validator.contains(val, "[") || validator.contains(val, "]")) return false;
            if (validator.contains(val, "\\") || validator.contains(val, "|")) return false;
            return true;
          }, "Category name contains invalid characters")
      ),
  slug: (schema) => schema.optional(),
  notes: (schema) =>
    schema
      .transform((val) => val?.trim())
      .pipe(
        z
          .string()
          .max(500, "Notes must be less than 500 characters")
          .refine((val) => {
            if (!val) return true; // Allow empty/null values
            // Reject any HTML tags
            if (validator.contains(val, "<") || validator.contains(val, ">")) {
              return false;
            }
            return true;
          }, "Notes cannot contain HTML tags")
      )
      .optional()
      .nullable(),
  categoryType: (schema) =>
    schema
      .pipe(
        z.enum(categoryTypeEnum, {
          message: "Please select a valid category type",
        })
      )
      .optional()
      .default("expense"),
  categoryIcon: (schema) =>
    schema
      .pipe(z.string().refine((val) => !val || isValidIconName(val), "Invalid icon selection"))
      .optional()
      .nullable(),
  categoryColor: (schema) =>
    schema
      .pipe(z.string().regex(/^#[0-9A-Fa-f]{6}$/, "Color must be a valid hex code"))
      .optional()
      .nullable(),
  isActive: (schema) => schema.pipe(z.boolean()).optional().default(true),
  displayOrder: (schema) => schema.pipe(z.number()).optional().default(0),
  isTaxDeductible: (schema) => schema.pipe(z.boolean()).optional().default(false),
  taxCategory: (schema) =>
    schema
      .pipe(
        z.enum(taxCategories, {
          message: "Please select a valid tax category",
        })
      )
      .optional()
      .nullable(),
  deductiblePercentage: (schema) => schema.pipe(z.number().min(0).max(100)).optional().nullable(),
  isSeasonal: (schema) => schema.pipe(z.boolean()).optional().default(false),
  seasonalMonths: (schema) =>
    schema
      .pipe(z.array(z.string()).max(12, "Cannot have more than 12 months"))
      .optional()
      .nullable(),
  expectedMonthlyMin: (schema) => schema.pipe(z.number().nonnegative()).optional().nullable(),
  expectedMonthlyMax: (schema) => schema.pipe(z.number().nonnegative()).optional().nullable(),
  spendingPriority: (schema) =>
    schema
      .pipe(
        z.enum(spendingPriorityEnum, {
          message: "Please select a valid spending priority",
        })
      )
      .optional()
      .nullable(),
  incomeReliability: (schema) =>
    schema
      .pipe(
        z.enum(incomeReliabilityEnum, {
          message: "Please select a valid income reliability",
        })
      )
      .optional()
      .nullable(),
});
export const removeCategorySchema = z.object({ id: z.number().nonnegative() });
export const removeCategoriesSchema = z.object({ entities: z.array(z.number().nonnegative()) });

export type Category = typeof categories.$inferSelect;
export type NewCategory = typeof categories.$inferInsert;
export type InsertCategorySchema = typeof insertCategorySchema;
export type FormInsertCategorySchema = typeof formInsertCategorySchema;
export type RemoveCategorySchema = typeof removeCategorySchema;
export type RemoveCategoriesSchema = typeof removeCategoriesSchema;
export type HasCategories = {
  categories?: Category[];
};
