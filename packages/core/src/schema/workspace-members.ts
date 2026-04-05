import { createId } from "@paralleldrive/cuid2";
import { relations, sql } from "drizzle-orm";
import { index, integer, sqliteTable, text, uniqueIndex } from "drizzle-orm/sqlite-core";
import { createInsertSchema, createSelectSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { users } from "./users";
import { workspaces } from "./workspaces";

/**
 * Workspace role enum - defines permission levels within a workspace
 * - owner: Full control, can delete workspace and transfer ownership
 * - admin: Can manage members, full CRUD on all entities
 * - editor: Full CRUD on entities, cannot manage members
 * - viewer: Read-only access to workspace data
 */
export const workspaceRoleEnum = ["owner", "admin", "editor", "viewer"] as const;
export type WorkspaceRole = (typeof workspaceRoleEnum)[number];

/**
 * Workspace Members Table
 * Junction table linking users to workspaces with role-based permissions
 */
export const workspaceMembers = sqliteTable(
  "workspace_member",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    cuid: text("cuid").$defaultFn(() => createId()),

    // Core relationships
    workspaceId: integer("workspace_id")
      .notNull()
      .references(() => workspaces.id, { onDelete: "cascade" }),
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),

    // Role and permissions
    role: text("role", { enum: workspaceRoleEnum }).notNull().default("viewer"),

    // Invitation tracking
    invitedBy: text("invited_by").references(() => users.id),
    joinedAt: text("joined_at")
      .notNull()
      .default(sql`CURRENT_TIMESTAMP`),

    // User preferences within this workspace
    isDefault: integer("is_default", { mode: "boolean" }).default(false),

    // Metadata
    createdAt: text("created_at")
      .notNull()
      .default(sql`CURRENT_TIMESTAMP`),
    updatedAt: text("updated_at")
      .notNull()
      .default(sql`CURRENT_TIMESTAMP`),
  },
  (table) => [
    // Composite unique index - user can only be a member once per workspace
    uniqueIndex("workspace_member_unique_idx").on(table.workspaceId, table.userId),
    index("workspace_member_workspace_idx").on(table.workspaceId),
    index("workspace_member_user_idx").on(table.userId),
    index("workspace_member_role_idx").on(table.role),
    index("workspace_member_default_idx").on(table.userId, table.isDefault),
  ]
);

// Relations
export const workspaceMembersRelations = relations(workspaceMembers, ({ one }) => ({
  workspace: one(workspaces, {
    fields: [workspaceMembers.workspaceId],
    references: [workspaces.id],
  }),
  user: one(users, {
    fields: [workspaceMembers.userId],
    references: [users.id],
  }),
  inviter: one(users, {
    fields: [workspaceMembers.invitedBy],
    references: [users.id],
    relationName: "inviter",
  }),
}));

// Zod schemas
export const selectWorkspaceMemberSchema = createSelectSchema(workspaceMembers);
export const insertWorkspaceMemberSchema = createInsertSchema(workspaceMembers, {
  role: (schema) => schema.pipe(z.enum(workspaceRoleEnum)),
});

export const formInsertWorkspaceMemberSchema = insertWorkspaceMemberSchema.omit({
  id: true,
  cuid: true,
  createdAt: true,
  updatedAt: true,
});

// Types
export type WorkspaceMember = typeof workspaceMembers.$inferSelect;
export type NewWorkspaceMember = typeof workspaceMembers.$inferInsert;
export type InsertWorkspaceMemberSchema = typeof insertWorkspaceMemberSchema;
export type FormInsertWorkspaceMemberSchema = z.infer<typeof formInsertWorkspaceMemberSchema>;
