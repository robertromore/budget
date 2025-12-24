import { createId } from "@paralleldrive/cuid2";
import { relations, sql } from "drizzle-orm";
import { index, integer, sqliteTable, text, uniqueIndex } from "drizzle-orm/sqlite-core";
import { createInsertSchema, createSelectSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { users } from "./users";
import { workspaces } from "./workspaces";
import { workspaceRoleEnum } from "./workspace-members";

/**
 * Invitation status enum
 * - pending: Invitation sent, awaiting response
 * - accepted: User accepted the invitation
 * - declined: User declined the invitation
 * - expired: Invitation passed its expiration date
 * - revoked: Admin cancelled the invitation
 */
export const invitationStatusEnum = ["pending", "accepted", "declined", "expired", "revoked"] as const;
export type InvitationStatus = (typeof invitationStatusEnum)[number];

/**
 * Workspace Invitations Table
 * Tracks pending invitations with secure token-based acceptance
 */
export const workspaceInvitations = sqliteTable(
  "workspace_invitation",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    cuid: text("cuid").$defaultFn(() => createId()),

    // Core data
    workspaceId: integer("workspace_id")
      .notNull()
      .references(() => workspaces.id, { onDelete: "cascade" }),
    email: text("email").notNull(), // Invited email address (lowercase)

    // Invitation details
    role: text("role", { enum: workspaceRoleEnum }).notNull().default("viewer"),
    invitedBy: text("invited_by")
      .notNull()
      .references(() => users.id),

    // Security token for acceptance (CUID for uniqueness)
    token: text("token")
      .notNull()
      .$defaultFn(() => createId()),

    // Status tracking
    status: text("status", { enum: invitationStatusEnum }).notNull().default("pending"),

    // Expiration (7 days from creation by default)
    expiresAt: text("expires_at").notNull(),

    // Response tracking
    respondedAt: text("responded_at"),
    acceptedUserId: text("accepted_user_id").references(() => users.id),

    // Personal message from inviter
    message: text("message"),

    // Metadata
    createdAt: text("created_at")
      .notNull()
      .default(sql`CURRENT_TIMESTAMP`),
    updatedAt: text("updated_at")
      .notNull()
      .default(sql`CURRENT_TIMESTAMP`),
  },
  (table) => [
    // Unique token for secure lookups
    uniqueIndex("workspace_invitation_token_idx").on(table.token),
    index("workspace_invitation_workspace_idx").on(table.workspaceId),
    index("workspace_invitation_email_idx").on(table.email),
    index("workspace_invitation_status_idx").on(table.status),
    index("workspace_invitation_expires_idx").on(table.expiresAt),
  ]
);

// Relations
export const workspaceInvitationsRelations = relations(workspaceInvitations, ({ one }) => ({
  workspace: one(workspaces, {
    fields: [workspaceInvitations.workspaceId],
    references: [workspaces.id],
  }),
  inviter: one(users, {
    fields: [workspaceInvitations.invitedBy],
    references: [users.id],
    relationName: "inviter",
  }),
  acceptedUser: one(users, {
    fields: [workspaceInvitations.acceptedUserId],
    references: [users.id],
    relationName: "acceptedUser",
  }),
}));

// Zod schemas
export const selectWorkspaceInvitationSchema = createSelectSchema(workspaceInvitations);
export const insertWorkspaceInvitationSchema = createInsertSchema(workspaceInvitations, {
  email: (schema) =>
    schema
      .transform((val) => val?.trim()?.toLowerCase())
      .pipe(z.string().email("Invalid email address")),
  role: (schema) => schema.pipe(z.enum(workspaceRoleEnum)),
  status: (schema) => schema.pipe(z.enum(invitationStatusEnum)),
  message: (schema) => schema.pipe(z.string().max(500, "Message must be less than 500 characters")).optional().nullable(),
});

export const formCreateInvitationSchema = z.object({
  email: z.string().email("Invalid email address").transform((val) => val.toLowerCase()),
  role: z.enum(["admin", "editor", "viewer"]), // Cannot invite as owner
  message: z.string().max(500, "Message must be less than 500 characters").optional(),
});

// Types
export type WorkspaceInvitation = typeof workspaceInvitations.$inferSelect;
export type NewWorkspaceInvitation = typeof workspaceInvitations.$inferInsert;
export type InsertWorkspaceInvitationSchema = typeof insertWorkspaceInvitationSchema;
export type FormCreateInvitationSchema = z.infer<typeof formCreateInvitationSchema>;
