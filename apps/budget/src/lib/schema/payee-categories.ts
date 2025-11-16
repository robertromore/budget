// Payee categories are used to organize and group payees in the UI.
// This is separate from transaction categories which categorize transactions.
// Examples: "Utilities", "Subscriptions", "Local Businesses", "Healthcare Providers"

import {relations, sql} from "drizzle-orm";
import {index, integer, sqliteTable, text} from "drizzle-orm/sqlite-core";
import {createInsertSchema, createSelectSchema} from "drizzle-zod";
import validator from "validator";
import {z} from "zod/v4";
import {isValidIconName} from "$lib/utils/icon-validation";
import {workspaces} from "./workspaces";
import {payees} from "./payees";

export const payeeCategories = sqliteTable(
  "payee_categories",
  {
    id: integer("id").primaryKey({autoIncrement: true}),
    workspaceId: integer("workspace_id")
      .notNull()
      .references(() => workspaces.id, {onDelete: "cascade"}),
    name: text("name").notNull(),
    slug: text("slug").notNull().unique(),
    description: text("description"),

    // Visual customization
    icon: text("icon"),
    color: text("color"),

    // Organization
    displayOrder: integer("display_order").notNull().default(0),
    isActive: integer("is_active", {mode: "boolean"}).notNull().default(true),

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
    index("payee_category_workspace_id_idx").on(table.workspaceId),
    index("payee_category_name_idx").on(table.name),
    index("payee_category_slug_idx").on(table.slug),
    index("payee_category_deleted_at_idx").on(table.deletedAt),
    index("payee_category_display_order_idx").on(table.displayOrder),
    index("payee_category_is_active_idx").on(table.isActive),
  ]
);

export const payeeCategoriesRelations = relations(payeeCategories, ({one, many}) => ({
  workspace: one(workspaces, {
    fields: [payeeCategories.workspaceId],
    references: [workspaces.id],
  }),
  payees: many(payees),
}));

export const selectPayeeCategorySchema = createSelectSchema(payeeCategories);
export const insertPayeeCategorySchema = createInsertSchema(payeeCategories);
export const formInsertPayeeCategorySchema = createInsertSchema(payeeCategories, {
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
  description: (schema) =>
    schema
      .transform((val) => val?.trim())
      .pipe(
        z
          .string()
          .max(500, "Description must be less than 500 characters")
          .refine((val) => {
            if (!val) return true; // Allow empty/null values
            // Reject any HTML tags
            if (validator.contains(val, "<") || validator.contains(val, ">")) {
              return false;
            }
            return true;
          }, "Description cannot contain HTML tags")
      )
      .optional()
      .nullable(),
  icon: (schema) =>
    schema
      .pipe(z.string().refine((val) => !val || isValidIconName(val), "Invalid icon selection"))
      .optional()
      .nullable(),
  color: (schema) =>
    schema
      .pipe(z.string().regex(/^#[0-9A-Fa-f]{6}$/, "Color must be a valid hex code"))
      .optional()
      .nullable(),
  isActive: (schema) => schema.pipe(z.boolean()).default(true),
  displayOrder: (schema) => schema.pipe(z.number()).default(0),
});

export const removePayeeCategorySchema = z.object({id: z.number().nonnegative()});
export const removePayeeCategoriesSchema = z.object({entities: z.array(z.number().nonnegative())});

export type PayeeCategory = typeof payeeCategories.$inferSelect;
export type NewPayeeCategory = typeof payeeCategories.$inferInsert;
export type InsertPayeeCategorySchema = typeof insertPayeeCategorySchema;
export type FormInsertPayeeCategorySchema = typeof formInsertPayeeCategorySchema;
export type RemovePayeeCategorySchema = typeof removePayeeCategorySchema;
export type RemovePayeeCategoriesSchema = typeof removePayeeCategoriesSchema;
export type HasPayeeCategories = {
  payeeCategories?: PayeeCategory[];
};
