// A "category group" represents a collection of related categories.

import { relations } from 'drizzle-orm';
import { sqliteTable, integer, text } from 'drizzle-orm/sqlite-core';
import { createSelectSchema } from 'drizzle-zod';
import { categories } from '../schema/categories';
// import { z } from 'zod';

export const categoryGroups = sqliteTable('category_group', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  name: text('name'),
  notes: text('notes')
});

export const categoryGroupsRelations = relations(categoryGroups, ({ many }) => ({
  categories: many(categories)
}));

export const selectCategoryGroupsSchema = createSelectSchema(categoryGroups);
// export const formDataMovieSchema = createInsertSchema(account, {
// 	allow_user_registrations: z.boolean(),
// 	enforce_user_registrations: z.boolean()
// });

export type CategoryGroup = typeof categoryGroups.$inferSelect;
