import { createId } from "@paralleldrive/cuid2";
import { sql } from "drizzle-orm";
import { index, integer, sqliteTable, text } from "drizzle-orm/sqlite-core";
import { createInsertSchema, createSelectSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { workspaces } from "../workspaces";
import { homeItems } from "./home-items";

export const attachmentTypeEnum = [
  "photo",
  "receipt",
  "manual",
  "warranty",
  "other",
] as const;

export type AttachmentType = (typeof attachmentTypeEnum)[number];

export const homeAttachments = sqliteTable(
  "home_attachment",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    cuid: text("cuid")
      .notNull()
      .$defaultFn(() => createId()),
    workspaceId: integer("workspace_id")
      .notNull()
      .references(() => workspaces.id, { onDelete: "cascade" }),
    itemId: integer("item_id")
      .notNull()
      .references(() => homeItems.id, { onDelete: "cascade" }),
    fileName: text("file_name").notNull(),
    fileType: text("file_type", { enum: attachmentTypeEnum }).notNull().default("other"),
    mimeType: text("mime_type"),
    fileSize: integer("file_size"),
    url: text("url").notNull(),
    isPrimary: integer("is_primary", { mode: "boolean" }).notNull().default(false),
    notes: text("notes"),
    createdAt: text("created_at")
      .notNull()
      .default(sql`CURRENT_TIMESTAMP`),
    updatedAt: text("updated_at")
      .notNull()
      .default(sql`CURRENT_TIMESTAMP`),
  },
  (table) => [
    index("home_attachment_workspace_id_idx").on(table.workspaceId),
    index("home_attachment_item_id_idx").on(table.itemId),
  ]
);

export const selectHomeAttachmentSchema = createSelectSchema(homeAttachments);
export const insertHomeAttachmentSchema = createInsertSchema(homeAttachments, {
  fileName: (schema) =>
    schema
      .transform((val) => val?.trim())
      .pipe(z.string().min(1, "File name is required").max(255, "File name must be less than 255 characters")),
  url: (schema) => schema.pipe(z.string().min(1, "URL is required")),
});

export type HomeAttachment = typeof homeAttachments.$inferSelect;
export type NewHomeAttachment = typeof homeAttachments.$inferInsert;
