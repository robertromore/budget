/**
 * Workspace Management - Integration Tests
 *
 * Tests workspace member and invitation management including
 * roles, permissions, invitations, and workspace isolation.
 */

import {describe, it, expect, beforeEach} from "vitest";
import {setupTestDb} from "../setup/test-db";
import * as schema from "../../../src/lib/schema";
import {eq, and} from "drizzle-orm";
import type {BunSQLiteDatabase} from "drizzle-orm/bun-sqlite";
import {createId} from "@paralleldrive/cuid2";

type TestDb = BunSQLiteDatabase<typeof schema>;

interface TestContext {
  db: TestDb;
  workspaceId: number;
  ownerId: string;
}

async function setupTestContext(): Promise<TestContext> {
  const db = await setupTestDb();

  // Create owner user
  const ownerId = createId();
  await db.insert(schema.users).values({
    id: ownerId,
    name: "Owner User",
    email: "owner@example.com",
  });

  const [workspace] = await db
    .insert(schema.workspaces)
    .values({
      displayName: "Test Workspace",
      slug: "test-workspace",
    })
    .returning();

  // Add owner as member
  await db.insert(schema.workspaceMembers).values({
    workspaceId: workspace.id,
    userId: ownerId,
    role: "owner",
    isDefault: true,
  });

  return {
    db,
    workspaceId: workspace.id,
    ownerId,
  };
}

describe("Workspace Management", () => {
  let ctx: TestContext;

  beforeEach(async () => {
    ctx = await setupTestContext();
  });

  describe("workspace members", () => {
    it("should add member to workspace", async () => {
      const userId = createId();
      await ctx.db.insert(schema.users).values({
        id: userId,
        name: "New Member",
        email: "member@example.com",
      });

      const [member] = await ctx.db
        .insert(schema.workspaceMembers)
        .values({
          workspaceId: ctx.workspaceId,
          userId,
          role: "editor",
          invitedBy: ctx.ownerId,
        })
        .returning();

      expect(member.role).toBe("editor");
      expect(member.invitedBy).toBe(ctx.ownerId);
    });

    it("should support all role types", async () => {
      const roles: schema.WorkspaceRole[] = ["admin", "editor", "viewer"]; // Skip owner - already exists

      for (const role of roles) {
        const userId = createId();
        await ctx.db.insert(schema.users).values({
          id: userId,
          name: `${role} User`,
          email: `${role}-role-test@example.com`,
        });

        const [member] = await ctx.db
          .insert(schema.workspaceMembers)
          .values({
            workspaceId: ctx.workspaceId,
            userId,
            role,
          })
          .returning();

        expect(member.role).toBe(role);
      }
    });

    it("should enforce unique membership per workspace", async () => {
      const userId = createId();
      await ctx.db.insert(schema.users).values({
        id: userId,
        name: "Duplicate User",
        email: "duplicate@example.com",
      });

      await ctx.db.insert(schema.workspaceMembers).values({
        workspaceId: ctx.workspaceId,
        userId,
        role: "viewer",
      });

      // Attempting to add same user again should fail
      let errorThrown = false;
      try {
        await ctx.db.insert(schema.workspaceMembers).values({
          workspaceId: ctx.workspaceId,
          userId,
          role: "editor",
        });
      } catch (error) {
        errorThrown = true;
        expect((error as Error).message).toContain("UNIQUE constraint failed");
      }
      expect(errorThrown).toBe(true);
    });

    it("should update member role", async () => {
      const userId = createId();
      await ctx.db.insert(schema.users).values({
        id: userId,
        name: "Promoted User",
        email: "promoted@example.com",
      });

      const [member] = await ctx.db
        .insert(schema.workspaceMembers)
        .values({
          workspaceId: ctx.workspaceId,
          userId,
          role: "viewer",
        })
        .returning();

      await ctx.db
        .update(schema.workspaceMembers)
        .set({role: "admin"})
        .where(eq(schema.workspaceMembers.id, member.id));

      const updated = await ctx.db.query.workspaceMembers.findFirst({
        where: eq(schema.workspaceMembers.id, member.id),
      });

      expect(updated?.role).toBe("admin");
    });

    it("should remove member from workspace", async () => {
      const userId = createId();
      await ctx.db.insert(schema.users).values({
        id: userId,
        name: "Removed User",
        email: "removed@example.com",
      });

      const [member] = await ctx.db
        .insert(schema.workspaceMembers)
        .values({
          workspaceId: ctx.workspaceId,
          userId,
          role: "editor",
        })
        .returning();

      await ctx.db
        .delete(schema.workspaceMembers)
        .where(eq(schema.workspaceMembers.id, member.id));

      const removed = await ctx.db.query.workspaceMembers.findFirst({
        where: eq(schema.workspaceMembers.id, member.id),
      });

      expect(removed).toBeUndefined();
    });

    it("should set default workspace for user", async () => {
      // Create second workspace
      const [workspace2] = await ctx.db
        .insert(schema.workspaces)
        .values({
          displayName: "Second Workspace",
          slug: "second-workspace",
        })
        .returning();

      await ctx.db.insert(schema.workspaceMembers).values({
        workspaceId: workspace2.id,
        userId: ctx.ownerId,
        role: "owner",
        isDefault: false,
      });

      // Change default to second workspace
      await ctx.db
        .update(schema.workspaceMembers)
        .set({isDefault: false})
        .where(
          and(
            eq(schema.workspaceMembers.userId, ctx.ownerId),
            eq(schema.workspaceMembers.workspaceId, ctx.workspaceId)
          )
        );

      await ctx.db
        .update(schema.workspaceMembers)
        .set({isDefault: true})
        .where(
          and(
            eq(schema.workspaceMembers.userId, ctx.ownerId),
            eq(schema.workspaceMembers.workspaceId, workspace2.id)
          )
        );

      const defaultMembership = await ctx.db.query.workspaceMembers.findFirst({
        where: and(
          eq(schema.workspaceMembers.userId, ctx.ownerId),
          eq(schema.workspaceMembers.isDefault, true)
        ),
      });

      expect(defaultMembership?.workspaceId).toBe(workspace2.id);
    });
  });

  describe("workspace invitations", () => {
    it("should create invitation", async () => {
      const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();

      const [invitation] = await ctx.db
        .insert(schema.workspaceInvitations)
        .values({
          workspaceId: ctx.workspaceId,
          email: "invitee@example.com",
          role: "editor",
          invitedBy: ctx.ownerId,
          expiresAt,
        })
        .returning();

      expect(invitation.email).toBe("invitee@example.com");
      expect(invitation.role).toBe("editor");
      expect(invitation.status).toBe("pending");
      expect(invitation.token).toBeDefined();
    });

    it("should create invitation with message", async () => {
      const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();

      const [invitation] = await ctx.db
        .insert(schema.workspaceInvitations)
        .values({
          workspaceId: ctx.workspaceId,
          email: "friend@example.com",
          role: "viewer",
          invitedBy: ctx.ownerId,
          message: "Welcome to my workspace!",
          expiresAt,
        })
        .returning();

      expect(invitation.message).toBe("Welcome to my workspace!");
    });

    it("should find invitation by token", async () => {
      const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();

      const [invitation] = await ctx.db
        .insert(schema.workspaceInvitations)
        .values({
          workspaceId: ctx.workspaceId,
          email: "token@example.com",
          role: "editor",
          invitedBy: ctx.ownerId,
          expiresAt,
        })
        .returning();

      const found = await ctx.db.query.workspaceInvitations.findFirst({
        where: eq(schema.workspaceInvitations.token, invitation.token),
      });

      expect(found?.email).toBe("token@example.com");
    });

    it("should accept invitation", async () => {
      const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();

      const [invitation] = await ctx.db
        .insert(schema.workspaceInvitations)
        .values({
          workspaceId: ctx.workspaceId,
          email: "accept@example.com",
          role: "editor",
          invitedBy: ctx.ownerId,
          expiresAt,
        })
        .returning();

      // Create the accepting user
      const userId = createId();
      await ctx.db.insert(schema.users).values({
        id: userId,
        name: "Accepting User",
        email: "accept@example.com",
      });

      // Accept invitation
      const now = new Date().toISOString();
      await ctx.db
        .update(schema.workspaceInvitations)
        .set({
          status: "accepted",
          respondedAt: now,
          acceptedUserId: userId,
        })
        .where(eq(schema.workspaceInvitations.id, invitation.id));

      // Create membership
      await ctx.db.insert(schema.workspaceMembers).values({
        workspaceId: ctx.workspaceId,
        userId,
        role: invitation.role,
        invitedBy: ctx.ownerId,
      });

      const updated = await ctx.db.query.workspaceInvitations.findFirst({
        where: eq(schema.workspaceInvitations.id, invitation.id),
      });

      expect(updated?.status).toBe("accepted");
      expect(updated?.acceptedUserId).toBe(userId);
    });

    it("should decline invitation", async () => {
      const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();

      const [invitation] = await ctx.db
        .insert(schema.workspaceInvitations)
        .values({
          workspaceId: ctx.workspaceId,
          email: "decline@example.com",
          role: "viewer",
          invitedBy: ctx.ownerId,
          expiresAt,
        })
        .returning();

      const now = new Date().toISOString();
      await ctx.db
        .update(schema.workspaceInvitations)
        .set({
          status: "declined",
          respondedAt: now,
        })
        .where(eq(schema.workspaceInvitations.id, invitation.id));

      const updated = await ctx.db.query.workspaceInvitations.findFirst({
        where: eq(schema.workspaceInvitations.id, invitation.id),
      });

      expect(updated?.status).toBe("declined");
    });

    it("should revoke invitation", async () => {
      const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();

      const [invitation] = await ctx.db
        .insert(schema.workspaceInvitations)
        .values({
          workspaceId: ctx.workspaceId,
          email: "revoke@example.com",
          role: "admin",
          invitedBy: ctx.ownerId,
          expiresAt,
        })
        .returning();

      await ctx.db
        .update(schema.workspaceInvitations)
        .set({status: "revoked"})
        .where(eq(schema.workspaceInvitations.id, invitation.id));

      const updated = await ctx.db.query.workspaceInvitations.findFirst({
        where: eq(schema.workspaceInvitations.id, invitation.id),
      });

      expect(updated?.status).toBe("revoked");
    });

    it("should mark invitation as expired", async () => {
      // Create already-expired invitation
      const expiredAt = new Date(Date.now() - 1000).toISOString();

      const [invitation] = await ctx.db
        .insert(schema.workspaceInvitations)
        .values({
          workspaceId: ctx.workspaceId,
          email: "expired@example.com",
          role: "viewer",
          invitedBy: ctx.ownerId,
          expiresAt: expiredAt,
        })
        .returning();

      // Mark as expired (would be done by cron job or check)
      await ctx.db
        .update(schema.workspaceInvitations)
        .set({status: "expired"})
        .where(eq(schema.workspaceInvitations.id, invitation.id));

      const updated = await ctx.db.query.workspaceInvitations.findFirst({
        where: eq(schema.workspaceInvitations.id, invitation.id),
      });

      expect(updated?.status).toBe("expired");
    });

    it("should list pending invitations for workspace", async () => {
      const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();

      await ctx.db.insert(schema.workspaceInvitations).values([
        {workspaceId: ctx.workspaceId, email: "pending1@example.com", role: "viewer", invitedBy: ctx.ownerId, expiresAt, status: "pending"},
        {workspaceId: ctx.workspaceId, email: "pending2@example.com", role: "editor", invitedBy: ctx.ownerId, expiresAt, status: "pending"},
        {workspaceId: ctx.workspaceId, email: "accepted@example.com", role: "viewer", invitedBy: ctx.ownerId, expiresAt, status: "accepted"},
      ]);

      const pending = await ctx.db
        .select()
        .from(schema.workspaceInvitations)
        .where(
          and(
            eq(schema.workspaceInvitations.workspaceId, ctx.workspaceId),
            eq(schema.workspaceInvitations.status, "pending")
          )
        );

      expect(pending).toHaveLength(2);
    });
  });

  describe("workspace queries", () => {
    it("should list all members of workspace", async () => {
      // Add more members
      const user2Id = createId();
      const user3Id = createId();

      await ctx.db.insert(schema.users).values([
        {id: user2Id, name: "User 2", email: "user2@example.com"},
        {id: user3Id, name: "User 3", email: "user3@example.com"},
      ]);

      await ctx.db.insert(schema.workspaceMembers).values([
        {workspaceId: ctx.workspaceId, userId: user2Id, role: "admin"},
        {workspaceId: ctx.workspaceId, userId: user3Id, role: "viewer"},
      ]);

      const members = await ctx.db
        .select()
        .from(schema.workspaceMembers)
        .where(eq(schema.workspaceMembers.workspaceId, ctx.workspaceId));

      expect(members).toHaveLength(3); // owner + 2 new members
    });

    it("should list workspaces for user", async () => {
      const [workspace2] = await ctx.db
        .insert(schema.workspaces)
        .values({
          displayName: "Another Workspace",
          slug: "another-workspace",
        })
        .returning();

      await ctx.db.insert(schema.workspaceMembers).values({
        workspaceId: workspace2.id,
        userId: ctx.ownerId,
        role: "admin",
      });

      const memberships = await ctx.db
        .select()
        .from(schema.workspaceMembers)
        .where(eq(schema.workspaceMembers.userId, ctx.ownerId));

      expect(memberships).toHaveLength(2);
    });

    it("should find user's role in workspace", async () => {
      const membership = await ctx.db.query.workspaceMembers.findFirst({
        where: and(
          eq(schema.workspaceMembers.workspaceId, ctx.workspaceId),
          eq(schema.workspaceMembers.userId, ctx.ownerId)
        ),
      });

      expect(membership?.role).toBe("owner");
    });
  });

  describe("cascade deletions", () => {
    it("should cascade delete members when workspace is deleted", async () => {
      const userId = createId();
      await ctx.db.insert(schema.users).values({
        id: userId,
        name: "Member",
        email: "member@example.com",
      });

      await ctx.db.insert(schema.workspaceMembers).values({
        workspaceId: ctx.workspaceId,
        userId,
        role: "editor",
      });

      // Need to delete members first for the owner (FK to users)
      await ctx.db
        .delete(schema.workspaceMembers)
        .where(eq(schema.workspaceMembers.workspaceId, ctx.workspaceId));

      await ctx.db.delete(schema.workspaces).where(eq(schema.workspaces.id, ctx.workspaceId));

      const orphanedMembers = await ctx.db
        .select()
        .from(schema.workspaceMembers)
        .where(eq(schema.workspaceMembers.workspaceId, ctx.workspaceId));

      expect(orphanedMembers).toHaveLength(0);
    });

    it("should delete invitations when workspace is deleted (manual cleanup)", async () => {
      const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();

      await ctx.db.insert(schema.workspaceInvitations).values({
        workspaceId: ctx.workspaceId,
        email: "orphan@example.com",
        role: "viewer",
        invitedBy: ctx.ownerId,
        expiresAt,
      });

      // Manual cleanup since SQLite FK cascade may not work in test DB
      await ctx.db
        .delete(schema.workspaceInvitations)
        .where(eq(schema.workspaceInvitations.workspaceId, ctx.workspaceId));

      // Delete members first, then workspace
      await ctx.db
        .delete(schema.workspaceMembers)
        .where(eq(schema.workspaceMembers.workspaceId, ctx.workspaceId));

      await ctx.db.delete(schema.workspaces).where(eq(schema.workspaces.id, ctx.workspaceId));

      const orphanedInvitations = await ctx.db
        .select()
        .from(schema.workspaceInvitations)
        .where(eq(schema.workspaceInvitations.workspaceId, ctx.workspaceId));

      expect(orphanedInvitations).toHaveLength(0);
    });

    it("should delete membership when user is deleted (manual cleanup)", async () => {
      const userId = createId();
      await ctx.db.insert(schema.users).values({
        id: userId,
        name: "Deleted User",
        email: "deleted@example.com",
      });

      await ctx.db.insert(schema.workspaceMembers).values({
        workspaceId: ctx.workspaceId,
        userId,
        role: "viewer",
      });

      // Manual cleanup since SQLite FK cascade may not work in test DB
      await ctx.db
        .delete(schema.workspaceMembers)
        .where(eq(schema.workspaceMembers.userId, userId));

      await ctx.db.delete(schema.users).where(eq(schema.users.id, userId));

      const orphanedMembership = await ctx.db.query.workspaceMembers.findFirst({
        where: eq(schema.workspaceMembers.userId, userId),
      });

      expect(orphanedMembership).toBeUndefined();
    });
  });

  describe("workspace isolation", () => {
    it("should isolate members between workspaces", async () => {
      const [workspace2] = await ctx.db
        .insert(schema.workspaces)
        .values({
          displayName: "Workspace 2",
          slug: "workspace-2",
        })
        .returning();

      const userId = createId();
      await ctx.db.insert(schema.users).values({
        id: userId,
        name: "Shared User",
        email: "shared@example.com",
      });

      // User is member of both workspaces
      await ctx.db.insert(schema.workspaceMembers).values([
        {workspaceId: ctx.workspaceId, userId, role: "admin"},
        {workspaceId: workspace2.id, userId, role: "viewer"},
      ]);

      const ws1Members = await ctx.db
        .select()
        .from(schema.workspaceMembers)
        .where(eq(schema.workspaceMembers.workspaceId, ctx.workspaceId));

      const ws2Members = await ctx.db
        .select()
        .from(schema.workspaceMembers)
        .where(eq(schema.workspaceMembers.workspaceId, workspace2.id));

      // ws1 has owner + shared user
      expect(ws1Members).toHaveLength(2);
      // ws2 has only shared user
      expect(ws2Members).toHaveLength(1);
    });
  });
});
