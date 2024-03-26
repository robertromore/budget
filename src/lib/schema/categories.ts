// A "category" is a

import { relations, sql } from 'drizzle-orm';
import { sqliteTable, integer, text, type AnySQLiteColumn } from 'drizzle-orm/sqlite-core';
import { createInsertSchema, createSelectSchema } from 'drizzle-zod';
import { z } from 'zod';

export const categories = sqliteTable('categories', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  parentId: integer('parent_id').references((): AnySQLiteColumn => categories.id),
  name: text('name'),
  notes: text('notes'),
  dateCreated: text('date_created')
    .notNull()
    .default(sql`CURRENT_TIMESTAMP`)
});

export const categoriesRelations = relations(categories, ({ one }) => ({
  parent: one(categories, {
    fields: [categories.parentId],
    references: [categories.id]
  })
}));

export const selectCategorySchema = createSelectSchema(categories);
export const insertCategorySchema = createInsertSchema(categories);
export const removeCategorySchema = z.object({ id: z.number().nonnegative() });

export type Category = typeof categories.$inferSelect;
export type NewCategory = typeof categories.$inferInsert;
export type InsertCategorySchema = typeof insertCategorySchema;
export type RemoveCategorySchema = typeof removeCategorySchema;
