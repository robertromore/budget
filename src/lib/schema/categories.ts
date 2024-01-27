// A "category" is a

import { relations, sql } from 'drizzle-orm';
import { sqliteTable, integer, text, type AnySQLiteColumn } from 'drizzle-orm/sqlite-core';
import { createSelectSchema } from 'drizzle-zod';
// import { z } from 'zod';

export const categories = sqliteTable('categories', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  parentId: integer('parent_id').references((): AnySQLiteColumn => categories.id),
  name: text('name'),
  notes: text('notes'),
  // categoryGroupId: integer('category_group_id'),
  dateCreated: text('date_created')
    .notNull()
    .default(sql`CURRENT_TIMESTAMP`)
});

export const categoriesRelations = relations(categories, ({ one }) => ({
  // category_group: one(categoryGroups, {
  //   fields: [categories.categoryGroupId],
  //   references: [categoryGroups.id]
  // })
  parent: one(categories, {
    fields: [categories.parentId],
    references: [categories.id]
  })
}));

export const selectCategorySchema = createSelectSchema(categories);
// export const formDataMovieSchema = createInsertSchema(account, {
// 	allow_user_registrations: z.boolean(),
// 	enforce_user_registrations: z.boolean()
// });

export type Category = typeof categories.$inferSelect;
