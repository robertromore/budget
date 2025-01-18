import { integer, text, sqliteTable } from 'drizzle-orm/sqlite-core';

export const viewSchema = sqliteTable('view', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  name: text('name').notNull(),
  label: text('label').notNull(),
  description: text('description'),
  icon: text('icon'),
  filters: text('filters', { mode: 'json' }),
  display: text('display', { mode: 'json' })
});

export type View = typeof viewSchema.$inferSelect;
export type NewView = typeof viewSchema.$inferInsert;
