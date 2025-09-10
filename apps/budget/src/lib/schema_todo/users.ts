import {sqliteTable, text, integer} from "drizzle-orm/sqlite-core";
import {createInsertSchema, createSelectSchema} from "drizzle-zod";
// import { z } from 'zod';

export const user = sqliteTable("users", {
  id: integer("id").primaryKey(),
  name: text("name"),
  password: text("password"),
  email: text("email"),
});

export const selectUserSchema = createSelectSchema(user);
export const insertUserSchema = createInsertSchema(user);
// export const formDataMovieSchema = createInsertSchema(movie, {
// 	id: z.optional(z.string().regex(/^\d+$/).transform(Number)),
// 	title: z.optional(z.nullable(z.string()))
// });

export type User = typeof user.$inferSelect;
export type NewUser = typeof user.$inferInsert;
