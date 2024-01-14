// A "transaction" is a representation of the transfer of an amount of resources
// from one account to another. Transactions can be "split" into multiple
// transactions. Split transactions have the same parent transaction.

import { relations } from 'drizzle-orm';
import { sqliteTable, integer, text } from 'drizzle-orm/sqlite-core';
import { createSelectSchema } from 'drizzle-zod';
import { categoryGroups } from './category_groups';
// import { z } from 'zod';

export const categories = sqliteTable('categories', {
	id: integer('id').primaryKey({ autoIncrement: true }),
  name: text('name'),
  notes: text('notes'),
  categoryGroupId: integer('category_group_id'),
});

export const categoriesRelations = relations(categories, ({ one }) => ({
  category_group: one(categoryGroups, {
    fields: [categories.categoryGroupId],
    references: [categoryGroups.id]
  })
}))

export const selectCategorySchema = createSelectSchema(categories);
// export const formDataMovieSchema = createInsertSchema(account, {
// 	allow_user_registrations: z.boolean(),
// 	enforce_user_registrations: z.boolean()
// });

export type Category = typeof categories.$inferSelect;
