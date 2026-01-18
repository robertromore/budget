/**
 * Workspace Invitations - Integration Tests
 *
 * Tests the workspace invitation system for inviting users to workspaces.
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
  adminId: string;
}

async function setupTestContext(): Promise<TestContext> {
  const db = await setupTestDb();

  // Create owner user
  const ownerId = createId();
  await db.insert(schema.users).values({
    id: ownerId,
    name: "Owner User",
    displayName: "Owner User",
    email: "owner@example.com",
    createdAt: new Date(),
    updatedAt: new Date(),
  });

  // Create admin user
  const adminId = createId();
  await db.insert(schema.users).values({
    id: adminId,
    name: "Admin User",
    displayName: "Admin User",
    email: "admin@example.com",
    createdAt: new Date(),
    updatedAt: new Date(),
  });

  // Create workspace
  const [workspace] = await db
    .insert(schema.workspaces)
    .values({
      displayName: "Test Workspace",
      slug: "test-workspace",
    })
    .returning();

  // Add owner as workspace owner
  await db.insert(schema.workspaceMembers).values({
    workspaceId: workspace.id,
    userId: ownerId,
    role: "owner",
    joinedAt: new Date().toISOString(),
  });

  // Add admin as workspace admin
  await db.insert(schema.workspaceMembers).values({
    workspaceId: workspace.id,
    userId: adminId,
    role: "admin",
    joinedAt: new Date().toISOString(),
  });

  return {
    db,
    workspaceId: workspace.id,
    ownerId,
    adminId,
  };
}

function generateToken(): string {
  return createId() + createId(); // Generate a longer token
}

function getExpiryDate(days: number = 7): string {
  const date = new Date();
  date.setDate(date.getDate() + days);
  return date.toISOString();
}

describe("Workspace Invitations", () => {
  let ctx: TestContext;

  beforeEach(async () => {
    ctx = await setupTestContext();
  });

  describe("create invitation", () => {
    it("should create an invitation with correct properties", async () => {
      const token = generateToken();
      const expiresAt = getExpiryDate();
      const invitedEmail = "newuser@example.com";

      const [invitation] = await ctx.db
        .insert(schema.workspaceInvitations)
        .values({
          workspaceId: ctx.workspaceId,
          email: invitedEmail,
          role: "editor",
          invitedBy: ctx.ownerId,
          token,
          expiresAt,
          status: "pending",
          message: "Welcome to our workspace!",
        })
        .returning();

      expect(invitation).toBeDefined();
      expect(invitation.workspaceId).toBe(ctx.workspaceId);
      expect(invitation.email).toBe(invitedEmail);
      expect(invitation.role).toBe("editor");
      expect(invitation.invitedBy).toBe(ctx.ownerId);
      expect(invitation.token).toBe(token);
      expect(invitation.status).toBe("pending");
      expect(invitation.expiresAt).toBe(expiresAt);
      expect(invitation.message).toBe("Welcome to our workspace!");
      expect(invitation.respondedAt).toBeNull();
      expect(invitation.acceptedUserId).toBeNull();
    });

    it("should support all role types", async () => {
      const roles = ["admin", "editor", "viewer"] as const;

      for (const role of roles) {
        const [invitation] = await ctx.db
          .insert(schema.workspaceInvitations)
          .values({
            workspaceId: ctx.workspaceId,
            email: `${role}@example.com`,
            role,
            invitedBy: ctx.ownerId,
            token: generateToken(),
            expiresAt: getExpiryDate(),
            status: "pending",
          })
          .returning();

        expect(invitation.role).toBe(role);
      }
    });

    it("should support all invitation statuses", async () => {
      const statuses = ["pending", "accepted", "declined", "expired", "revoked"] as const;

      for (const status of statuses) {
        const [invitation] = await ctx.db
          .insert(schema.workspaceInvitations)
          .values({
            workspaceId: ctx.workspaceId,
            email: `${status}@example.com`,
            role: "viewer",
            invitedBy: ctx.ownerId,
            token: generateToken(),
            expiresAt: getExpiryDate(),
            status,
          })
          .returning();

        expect(invitation.status).toBe(status);
      }
    });

    it("should enforce unique token constraint", async () => {
      const token = generateToken();

      // First insert
      await ctx.db.insert(schema.workspaceInvitations).values({
        workspaceId: ctx.workspaceId,
        email: "first@example.com",
        role: "viewer",
        invitedBy: ctx.ownerId,
        token,
        expiresAt: getExpiryDate(),
        status: "pending",
      });

      // Second insert with same token should fail
      try {
        await ctx.db
          .insert(schema.workspaceInvitations)
          .values({
            workspaceId: ctx.workspaceId,
            email: "second@example.com",
            role: "viewer",
            invitedBy: ctx.ownerId,
            token, // Same token
            expiresAt: getExpiryDate(),
            status: "pending",
          })
          .run();
        expect.fail("Expected unique constraint violation");
      } catch (error) {
        expect(error).toBeDefined();
      }
    });
  });

  describe("find invitations", () => {
    beforeEach(async () => {
      // Create test invitations
      await ctx.db.insert(schema.workspaceInvitations).values([
        {
          workspaceId: ctx.workspaceId,
          email: "pending1@example.com",
          role: "editor",
          invitedBy: ctx.ownerId,
          token: generateToken(),
          expiresAt: getExpiryDate(),
          status: "pending",
        },
        {
          workspaceId: ctx.workspaceId,
          email: "pending2@example.com",
          role: "viewer",
          invitedBy: ctx.adminId,
          token: generateToken(),
          expiresAt: getExpiryDate(),
          status: "pending",
        },
        {
          workspaceId: ctx.workspaceId,
          email: "accepted@example.com",
          role: "admin",
          invitedBy: ctx.ownerId,
          token: generateToken(),
          expiresAt: getExpiryDate(),
          status: "accepted",
          respondedAt: new Date().toISOString(),
        },
      ]);
    });

    it("should find invitation by token", async () => {
      const token = generateToken();
      await ctx.db.insert(schema.workspaceInvitations).values({
        workspaceId: ctx.workspaceId,
        email: "findbytoken@example.com",
        role: "editor",
        invitedBy: ctx.ownerId,
        token,
        expiresAt: getExpiryDate(),
        status: "pending",
      });

      const [invitation] = await ctx.db
        .select()
        .from(schema.workspaceInvitations)
        .where(eq(schema.workspaceInvitations.token, token))
        .limit(1);

      expect(invitation).toBeDefined();
      expect(invitation.email).toBe("findbytoken@example.com");
    });

    it("should find pending invitations for workspace", async () => {
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
      expect(pending.every((inv) => inv.status === "pending")).toBe(true);
    });

    it("should find pending invitations for email", async () => {
      const email = "pending1@example.com";
      const invitations = await ctx.db
        .select()
        .from(schema.workspaceInvitations)
        .where(
          and(eq(schema.workspaceInvitations.email, email), eq(schema.workspaceInvitations.status, "pending"))
        );

      expect(invitations).toHaveLength(1);
      expect(invitations[0].email).toBe(email);
    });

    it("should check if pending invitation exists for email and workspace", async () => {
      const [existing] = await ctx.db
        .select()
        .from(schema.workspaceInvitations)
        .where(
          and(
            eq(schema.workspaceInvitations.email, "pending1@example.com"),
            eq(schema.workspaceInvitations.workspaceId, ctx.workspaceId),
            eq(schema.workspaceInvitations.status, "pending")
          )
        )
        .limit(1);

      expect(existing).toBeDefined();

      const [nonExisting] = await ctx.db
        .select()
        .from(schema.workspaceInvitations)
        .where(
          and(
            eq(schema.workspaceInvitations.email, "nonexistent@example.com"),
            eq(schema.workspaceInvitations.workspaceId, ctx.workspaceId),
            eq(schema.workspaceInvitations.status, "pending")
          )
        )
        .limit(1);

      expect(nonExisting).toBeUndefined();
    });
  });

  describe("update invitation status", () => {
    it("should accept invitation", async () => {
      const [invitation] = await ctx.db
        .insert(schema.workspaceInvitations)
        .values({
          workspaceId: ctx.workspaceId,
          email: "toaccept@example.com",
          role: "editor",
          invitedBy: ctx.ownerId,
          token: generateToken(),
          expiresAt: getExpiryDate(),
          status: "pending",
        })
        .returning();

      const newUserId = createId();
      const respondedAt = new Date().toISOString();

      const [updated] = await ctx.db
        .update(schema.workspaceInvitations)
        .set({
          status: "accepted",
          respondedAt,
          acceptedUserId: newUserId,
        })
        .where(eq(schema.workspaceInvitations.id, invitation.id))
        .returning();

      expect(updated.status).toBe("accepted");
      expect(updated.respondedAt).toBe(respondedAt);
      expect(updated.acceptedUserId).toBe(newUserId);
    });

    it("should decline invitation", async () => {
      const [invitation] = await ctx.db
        .insert(schema.workspaceInvitations)
        .values({
          workspaceId: ctx.workspaceId,
          email: "todecline@example.com",
          role: "editor",
          invitedBy: ctx.ownerId,
          token: generateToken(),
          expiresAt: getExpiryDate(),
          status: "pending",
        })
        .returning();

      const respondedAt = new Date().toISOString();

      const [updated] = await ctx.db
        .update(schema.workspaceInvitations)
        .set({
          status: "declined",
          respondedAt,
        })
        .where(eq(schema.workspaceInvitations.id, invitation.id))
        .returning();

      expect(updated.status).toBe("declined");
      expect(updated.respondedAt).toBe(respondedAt);
      expect(updated.acceptedUserId).toBeNull();
    });

    it("should revoke invitation", async () => {
      const [invitation] = await ctx.db
        .insert(schema.workspaceInvitations)
        .values({
          workspaceId: ctx.workspaceId,
          email: "torevoke@example.com",
          role: "editor",
          invitedBy: ctx.ownerId,
          token: generateToken(),
          expiresAt: getExpiryDate(),
          status: "pending",
        })
        .returning();

      const [updated] = await ctx.db
        .update(schema.workspaceInvitations)
        .set({
          status: "revoked",
          respondedAt: new Date().toISOString(),
        })
        .where(eq(schema.workspaceInvitations.id, invitation.id))
        .returning();

      expect(updated.status).toBe("revoked");
    });

    it("should expire invitation", async () => {
      const [invitation] = await ctx.db
        .insert(schema.workspaceInvitations)
        .values({
          workspaceId: ctx.workspaceId,
          email: "toexpire@example.com",
          role: "editor",
          invitedBy: ctx.ownerId,
          token: generateToken(),
          expiresAt: getExpiryDate(-1), // Already expired
          status: "pending",
        })
        .returning();

      const [updated] = await ctx.db
        .update(schema.workspaceInvitations)
        .set({
          status: "expired",
        })
        .where(eq(schema.workspaceInvitations.id, invitation.id))
        .returning();

      expect(updated.status).toBe("expired");
    });
  });

  describe("expiration handling", () => {
    it("should identify expired invitations", async () => {
      // Create expired invitation
      await ctx.db.insert(schema.workspaceInvitations).values({
        workspaceId: ctx.workspaceId,
        email: "expired@example.com",
        role: "editor",
        invitedBy: ctx.ownerId,
        token: generateToken(),
        expiresAt: getExpiryDate(-1), // Expired yesterday
        status: "pending",
      });

      // Create valid invitation
      await ctx.db.insert(schema.workspaceInvitations).values({
        workspaceId: ctx.workspaceId,
        email: "valid@example.com",
        role: "editor",
        invitedBy: ctx.ownerId,
        token: generateToken(),
        expiresAt: getExpiryDate(7), // Expires in 7 days
        status: "pending",
      });

      const now = new Date().toISOString();

      // Find expired pending invitations
      const allPending = await ctx.db
        .select()
        .from(schema.workspaceInvitations)
        .where(
          and(
            eq(schema.workspaceInvitations.workspaceId, ctx.workspaceId),
            eq(schema.workspaceInvitations.status, "pending")
          )
        );

      const expired = allPending.filter((inv) => new Date(inv.expiresAt) < new Date(now));
      const valid = allPending.filter((inv) => new Date(inv.expiresAt) >= new Date(now));

      expect(expired).toHaveLength(1);
      expect(expired[0].email).toBe("expired@example.com");
      expect(valid).toHaveLength(1);
      expect(valid[0].email).toBe("valid@example.com");
    });

    it("should bulk expire old invitations", async () => {
      // Create multiple expired invitations
      await ctx.db.insert(schema.workspaceInvitations).values([
        {
          workspaceId: ctx.workspaceId,
          email: "expired1@example.com",
          role: "editor",
          invitedBy: ctx.ownerId,
          token: generateToken(),
          expiresAt: getExpiryDate(-5),
          status: "pending",
        },
        {
          workspaceId: ctx.workspaceId,
          email: "expired2@example.com",
          role: "viewer",
          invitedBy: ctx.ownerId,
          token: generateToken(),
          expiresAt: getExpiryDate(-3),
          status: "pending",
        },
        {
          workspaceId: ctx.workspaceId,
          email: "stillvalid@example.com",
          role: "admin",
          invitedBy: ctx.ownerId,
          token: generateToken(),
          expiresAt: getExpiryDate(7),
          status: "pending",
        },
      ]);

      const now = new Date().toISOString();

      // Find all pending invitations that have expired
      const allPending = await ctx.db
        .select()
        .from(schema.workspaceInvitations)
        .where(eq(schema.workspaceInvitations.status, "pending"));

      const toExpire = allPending.filter((inv) => new Date(inv.expiresAt) < new Date(now));

      // Update expired invitations
      for (const inv of toExpire) {
        await ctx.db
          .update(schema.workspaceInvitations)
          .set({status: "expired"})
          .where(eq(schema.workspaceInvitations.id, inv.id));
      }

      // Verify results
      const stillPending = await ctx.db
        .select()
        .from(schema.workspaceInvitations)
        .where(eq(schema.workspaceInvitations.status, "pending"));

      expect(stillPending).toHaveLength(1);
      expect(stillPending[0].email).toBe("stillvalid@example.com");

      const expiredInvitations = await ctx.db
        .select()
        .from(schema.workspaceInvitations)
        .where(eq(schema.workspaceInvitations.status, "expired"));

      expect(expiredInvitations).toHaveLength(2);
    });
  });

  describe("delete invitation", () => {
    it("should delete invitation", async () => {
      const [invitation] = await ctx.db
        .insert(schema.workspaceInvitations)
        .values({
          workspaceId: ctx.workspaceId,
          email: "todelete@example.com",
          role: "editor",
          invitedBy: ctx.ownerId,
          token: generateToken(),
          expiresAt: getExpiryDate(),
          status: "pending",
        })
        .returning();

      // Verify it exists
      const [before] = await ctx.db
        .select()
        .from(schema.workspaceInvitations)
        .where(eq(schema.workspaceInvitations.id, invitation.id));
      expect(before).toBeDefined();

      // Delete
      await ctx.db.delete(schema.workspaceInvitations).where(eq(schema.workspaceInvitations.id, invitation.id));

      // Verify it's gone
      const [after] = await ctx.db
        .select()
        .from(schema.workspaceInvitations)
        .where(eq(schema.workspaceInvitations.id, invitation.id));
      expect(after).toBeUndefined();
    });
  });

  describe("workspace isolation", () => {
    it("should isolate invitations between workspaces", async () => {
      // Create a second workspace
      const [workspace2] = await ctx.db
        .insert(schema.workspaces)
        .values({
          displayName: "Second Workspace",
          slug: "second-workspace",
        })
        .returning();

      // Add owner to second workspace
      await ctx.db.insert(schema.workspaceMembers).values({
        workspaceId: workspace2.id,
        userId: ctx.ownerId,
        role: "owner",
        joinedAt: new Date().toISOString(),
      });

      // Create invitation in first workspace
      await ctx.db.insert(schema.workspaceInvitations).values({
        workspaceId: ctx.workspaceId,
        email: "shared@example.com",
        role: "editor",
        invitedBy: ctx.ownerId,
        token: generateToken(),
        expiresAt: getExpiryDate(),
        status: "pending",
      });

      // Create invitation in second workspace
      await ctx.db.insert(schema.workspaceInvitations).values({
        workspaceId: workspace2.id,
        email: "shared@example.com",
        role: "viewer",
        invitedBy: ctx.ownerId,
        token: generateToken(),
        expiresAt: getExpiryDate(),
        status: "pending",
      });

      // Query first workspace
      const workspace1Invitations = await ctx.db
        .select()
        .from(schema.workspaceInvitations)
        .where(eq(schema.workspaceInvitations.workspaceId, ctx.workspaceId));

      expect(workspace1Invitations).toHaveLength(1);
      expect(workspace1Invitations[0].role).toBe("editor");

      // Query second workspace
      const workspace2Invitations = await ctx.db
        .select()
        .from(schema.workspaceInvitations)
        .where(eq(schema.workspaceInvitations.workspaceId, workspace2.id));

      expect(workspace2Invitations).toHaveLength(1);
      expect(workspace2Invitations[0].role).toBe("viewer");
    });
  });

  describe("relationships", () => {
    it("should join with workspace to get workspace details", async () => {
      await ctx.db.insert(schema.workspaceInvitations).values({
        workspaceId: ctx.workspaceId,
        email: "jointest@example.com",
        role: "editor",
        invitedBy: ctx.ownerId,
        token: generateToken(),
        expiresAt: getExpiryDate(),
        status: "pending",
      });

      const results = await ctx.db
        .select({
          invitation: schema.workspaceInvitations,
          workspace: {
            id: schema.workspaces.id,
            displayName: schema.workspaces.displayName,
            slug: schema.workspaces.slug,
          },
        })
        .from(schema.workspaceInvitations)
        .innerJoin(schema.workspaces, eq(schema.workspaceInvitations.workspaceId, schema.workspaces.id))
        .where(eq(schema.workspaceInvitations.email, "jointest@example.com"));

      expect(results).toHaveLength(1);
      expect(results[0].workspace.displayName).toBe("Test Workspace");
      expect(results[0].workspace.slug).toBe("test-workspace");
    });

    it("should join with user to get inviter details", async () => {
      await ctx.db.insert(schema.workspaceInvitations).values({
        workspaceId: ctx.workspaceId,
        email: "invitertest@example.com",
        role: "editor",
        invitedBy: ctx.ownerId,
        token: generateToken(),
        expiresAt: getExpiryDate(),
        status: "pending",
      });

      const results = await ctx.db
        .select({
          invitation: schema.workspaceInvitations,
          inviter: {
            id: schema.users.id,
            displayName: schema.users.displayName,
            email: schema.users.email,
          },
        })
        .from(schema.workspaceInvitations)
        .innerJoin(schema.users, eq(schema.workspaceInvitations.invitedBy, schema.users.id))
        .where(eq(schema.workspaceInvitations.email, "invitertest@example.com"));

      expect(results).toHaveLength(1);
      expect(results[0].inviter.displayName).toBe("Owner User");
      expect(results[0].inviter.email).toBe("owner@example.com");
    });
  });
});
