import { relations, sql } from "drizzle-orm";
import { index, integer, sqliteTable, text, type AnySQLiteColumn } from "drizzle-orm/sqlite-core";
import { createInsertSchema, createSelectSchema } from "drizzle-zod";
import validator from "validator";
import { z } from "zod/v4";

export const categories = sqliteTable(
  "categories",
  {
    id: integer("id").primaryKey({autoIncrement: true}),
    parentId: integer("parent_id").references((): AnySQLiteColumn => categories.id),
    name: text("name"),
    notes: text("notes"),
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
    index("category_name_idx").on(table.name),
    index("category_parent_idx").on(table.parentId),
    index("category_deleted_at_idx").on(table.deletedAt),
  ]
);

export const categoriesRelations = relations(categories, ({one}) => ({
  parent: one(categories, {
    fields: [categories.parentId],
    references: [categories.id],
  }),
}));

export const selectCategorySchema = createSelectSchema(categories);
export const insertCategorySchema = createInsertSchema(categories);
export const formInsertCategorySchema = createInsertSchema(categories, {
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
});
export const removeCategorySchema = z.object({id: z.number().nonnegative()});
export const removeCategoriesSchema = z.object({entities: z.array(z.number().nonnegative())});

export type Category = typeof categories.$inferSelect;
export type NewCategory = typeof categories.$inferInsert;
export type InsertCategorySchema = typeof insertCategorySchema;
export type FormInsertCategorySchema = typeof formInsertCategorySchema;
export type RemoveCategorySchema = typeof removeCategorySchema;
export type RemoveCategoriesSchema = typeof removeCategoriesSchema;
export type HasCategories = {
  categories?: Category[];
};
