import { sqliteTable, integer } from 'drizzle-orm/sqlite-core';
import { createInsertSchema, createSelectSchema } from 'drizzle-zod';
import { z } from 'zod';

export const settings = sqliteTable('settings', {
	allow_user_registrations: integer('allow_user_registrations', { mode: 'boolean' }),
	enforce_user_registrations: integer('enforce_user_registrations', { mode: 'boolean' }),
});

export const selectSettingsSchema = createSelectSchema(settings);
export const formDataMovieSchema = createInsertSchema(settings, {
	allow_user_registrations: z.boolean(),
	enforce_user_registrations: z.boolean(),
});

export type Settings = typeof settings.$inferSelect;
