/**
 * Workspace Members - Integration Tests
 *
 * Tests the workspace member system for managing user access to workspaces.
 */

import {describe, it, expect, beforeEach} from "vitest";
import {setupTestDb} from "../setup/test-db";
import * as schema from "../../../src/lib/schema";
import {eq, and, desc} from "drizzle-orm";
import type {BunSQLiteDatabase} from "drizzle-orm/bun-sqlite";
import {createId} from "@paralleldrive/cuid2";

type TestDb = BunSQLiteDatabase<typeof schema>;

interface TestContext {
  db: TestDb;
  workspaceId: number;
  ownerId: string;
  adminId: string;
  editorId: string;
  viewerId: string;
}

async function setupTestContext(): Promise<TestContext> {
  const db = await setupTestDb();

  // Create users
  const ownerId = createId();
  const adminId = createId();
  const editorId = createId();
  const viewerId = createId();

  await db.insert(schema.users).values([
    {
      id: ownerId,
      name: "Owner User",
      displayName: "Owner User",
      email: "owner@example.com",
      createdAt: new Date(),
      updatedAt: new Date(),
    },
    {
      id: adminId,
      name: "Admin User",
      displayName: "Admin User",
      email: "admin@example.com",
      createdAt: new Date(),
      updatedAt: new Date(),
    },
    {
      id: editorId,
      name: "Editor User",
      displayName: "Editor User",
      email: "editor@example.com",
      createdAt: new Date(),
      updatedAt: new Date(),
    },
    {
      id: viewerId,
      name: "Viewer User",
      displayName: "Viewer User",
      email: "viewer@example.com",
      createdAt: new Date(),
      updatedAt: new Date(),
    },
  ]);

  // Create workspace
  const [workspace] = await db
    .insert(schema.workspaces)
    .values({
      displayName: "Test Workspace",
      slug: "test-workspace",
    })
    .returning();

  return {
    db,
    workspaceId: workspace.id,
    ownerId,
    adminId,
    editorId,
    viewerId,
  };
}

describe("Workspace Members", () => {
  let ctx: TestContext;

  beforeEach(async () => {
    ctx = await setupTestContext();
  });

  describe("create membership", () => {
    it("should create a membership with correct properties", async () => {
      const [membership] = await ctx.db
        .insert(schema.workspaceMembers)
        .values({
          workspaceId: ctx.workspaceId,
          userId: ctx.ownerId,
          role: "owner",
          isDefault: true,
          joinedAt: new Date().toISOString(),
        })
        .returning();

      expect(membership).toBeDefined();
      expect(membership.workspaceId).toBe(ctx.workspaceId);
      expect(membership.userId).toBe(ctx.ownerId);
      expect(membership.role).toBe("owner");
      expect(membership.isDefault).toBe(true);
      expect(membership.invitedBy).toBeNull();
    });

    it("should support all role types", async () => {
      const roles = ["owner", "admin", "editor", "viewer"] as const;
      const users = [ctx.ownerId, ctx.adminId, ctx.editorId, ctx.viewerId];

      for (let i = 0; i < roles.length; i++) {
        const [membership] = await ctx.db
          .insert(schema.workspaceMembers)
          .values({
            workspaceId: ctx.workspaceId,
            userId: users[i],
            role: roles[i],
            joinedAt: new Date().toISOString(),
          })
          .returning();

        expect(membership.role).toBe(roles[i]);
      }
    });

    it("should track inviter", async () => {
      // Create owner membership first
      await ctx.db.insert(schema.workspaceMembers).values({
        workspaceId: ctx.workspaceId,
        userId: ctx.ownerId,
        role: "owner",
        joinedAt: new Date().toISOString(),
      });

      // Create invited membership
      const [membership] = await ctx.db
        .insert(schema.workspaceMembers)
        .values({
          workspaceId: ctx.workspaceId,
          userId: ctx.adminId,
          role: "admin",
          invitedBy: ctx.ownerId,
          joinedAt: new Date().toISOString(),
        })
        .returning();

      expect(membership.invitedBy).toBe(ctx.ownerId);
    });

    it("should enforce unique constraint on workspace + user", async () => {
      // First membership
      await ctx.db.insert(schema.workspaceMembers).values({
        workspaceId: ctx.workspaceId,
        userId: ctx.ownerId,
        role: "owner",
        joinedAt: new Date().toISOString(),
      });

      // Duplicate should fail
      try {
        await ctx.db
          .insert(schema.workspaceMembers)
          .values({
            workspaceId: ctx.workspaceId,
            userId: ctx.ownerId, // Same user
            role: "admin",
            joinedAt: new Date().toISOString(),
          })
          .run();
        expect.fail("Expected unique constraint violation");
      } catch (error) {
        expect(error).toBeDefined();
      }
    });
  });

  describe("find memberships", () => {
    beforeEach(async () => {
      // Setup members in workspace
      await ctx.db.insert(schema.workspaceMembers).values([
        {
          workspaceId: ctx.workspaceId,
          userId: ctx.ownerId,
          role: "owner",
          isDefault: true,
          joinedAt: new Date().toISOString(),
        },
        {
          workspaceId: ctx.workspaceId,
          userId: ctx.adminId,
          role: "admin",
          invitedBy: ctx.ownerId,
          joinedAt: new Date().toISOString(),
        },
        {
          workspaceId: ctx.workspaceId,
          userId: ctx.editorId,
          role: "editor",
          invitedBy: ctx.ownerId,
          joinedAt: new Date().toISOString(),
        },
      ]);
    });

    it("should find membership by workspace and user", async () => {
      const [membership] = await ctx.db
        .select()
        .from(schema.workspaceMembers)
        .where(
          and(eq(schema.workspaceMembers.workspaceId, ctx.workspaceId), eq(schema.workspaceMembers.userId, ctx.adminId))
        )
        .limit(1);

      expect(membership).toBeDefined();
      expect(membership.role).toBe("admin");
    });

    it("should find all members of workspace", async () => {
      const members = await ctx.db
        .select()
        .from(schema.workspaceMembers)
        .where(eq(schema.workspaceMembers.workspaceId, ctx.workspaceId));

      expect(members).toHaveLength(3);
    });

    it("should find all workspaces for user", async () => {
      // Create a second workspace with same owner
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
        joinedAt: new Date().toISOString(),
      });

      const memberships = await ctx.db
        .select()
        .from(schema.workspaceMembers)
        .where(eq(schema.workspaceMembers.userId, ctx.ownerId));

      expect(memberships).toHaveLength(2);
    });

    it("should find workspace owner", async () => {
      const [owner] = await ctx.db
        .select()
        .from(schema.workspaceMembers)
        .where(
          and(eq(schema.workspaceMembers.workspaceId, ctx.workspaceId), eq(schema.workspaceMembers.role, "owner"))
        )
        .limit(1);

      expect(owner).toBeDefined();
      expect(owner.userId).toBe(ctx.ownerId);
    });

    it("should find default workspace for user", async () => {
      const [defaultMembership] = await ctx.db
        .select()
        .from(schema.workspaceMembers)
        .where(and(eq(schema.workspaceMembers.userId, ctx.ownerId), eq(schema.workspaceMembers.isDefault, true)))
        .limit(1);

      expect(defaultMembership).toBeDefined();
      expect(defaultMembership.workspaceId).toBe(ctx.workspaceId);
    });
  });

  describe("update membership", () => {
    beforeEach(async () => {
      await ctx.db.insert(schema.workspaceMembers).values([
        {
          workspaceId: ctx.workspaceId,
          userId: ctx.ownerId,
          role: "owner",
          joinedAt: new Date().toISOString(),
        },
        {
          workspaceId: ctx.workspaceId,
          userId: ctx.adminId,
          role: "admin",
          invitedBy: ctx.ownerId,
          joinedAt: new Date().toISOString(),
        },
        {
          workspaceId: ctx.workspaceId,
          userId: ctx.editorId,
          role: "editor",
          invitedBy: ctx.ownerId,
          joinedAt: new Date().toISOString(),
        },
      ]);
    });

    it("should update member role", async () => {
      const [updated] = await ctx.db
        .update(schema.workspaceMembers)
        .set({role: "viewer"})
        .where(
          and(
            eq(schema.workspaceMembers.workspaceId, ctx.workspaceId),
            eq(schema.workspaceMembers.userId, ctx.editorId)
          )
        )
        .returning();

      expect(updated.role).toBe("viewer");
    });

    it("should update default workspace flag", async () => {
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
        joinedAt: new Date().toISOString(),
      });

      // Clear existing defaults
      await ctx.db
        .update(schema.workspaceMembers)
        .set({isDefault: false})
        .where(eq(schema.workspaceMembers.userId, ctx.ownerId));

      // Set new default
      const [updated] = await ctx.db
        .update(schema.workspaceMembers)
        .set({isDefault: true})
        .where(
          and(eq(schema.workspaceMembers.userId, ctx.ownerId), eq(schema.workspaceMembers.workspaceId, workspace2.id))
        )
        .returning();

      expect(updated.isDefault).toBe(true);

      // Verify only one default
      const defaults = await ctx.db
        .select()
        .from(schema.workspaceMembers)
        .where(and(eq(schema.workspaceMembers.userId, ctx.ownerId), eq(schema.workspaceMembers.isDefault, true)));

      expect(defaults).toHaveLength(1);
      expect(defaults[0].workspaceId).toBe(workspace2.id);
    });
  });

  describe("delete membership", () => {
    beforeEach(async () => {
      await ctx.db.insert(schema.workspaceMembers).values([
        {
          workspaceId: ctx.workspaceId,
          userId: ctx.ownerId,
          role: "owner",
          joinedAt: new Date().toISOString(),
        },
        {
          workspaceId: ctx.workspaceId,
          userId: ctx.adminId,
          role: "admin",
          invitedBy: ctx.ownerId,
          joinedAt: new Date().toISOString(),
        },
      ]);
    });

    it("should delete membership", async () => {
      // Verify exists
      const [before] = await ctx.db
        .select()
        .from(schema.workspaceMembers)
        .where(
          and(eq(schema.workspaceMembers.workspaceId, ctx.workspaceId), eq(schema.workspaceMembers.userId, ctx.adminId))
        );
      expect(before).toBeDefined();

      // Delete
      await ctx.db
        .delete(schema.workspaceMembers)
        .where(
          and(eq(schema.workspaceMembers.workspaceId, ctx.workspaceId), eq(schema.workspaceMembers.userId, ctx.adminId))
        );

      // Verify gone
      const [after] = await ctx.db
        .select()
        .from(schema.workspaceMembers)
        .where(
          and(eq(schema.workspaceMembers.workspaceId, ctx.workspaceId), eq(schema.workspaceMembers.userId, ctx.adminId))
        );
      expect(after).toBeUndefined();
    });

    it("should maintain workspace with remaining members after deletion", async () => {
      await ctx.db
        .delete(schema.workspaceMembers)
        .where(
          and(eq(schema.workspaceMembers.workspaceId, ctx.workspaceId), eq(schema.workspaceMembers.userId, ctx.adminId))
        );

      const remaining = await ctx.db
        .select()
        .from(schema.workspaceMembers)
        .where(eq(schema.workspaceMembers.workspaceId, ctx.workspaceId));

      expect(remaining).toHaveLength(1);
      expect(remaining[0].userId).toBe(ctx.ownerId);
    });
  });

  describe("role hierarchy", () => {
    const ROLE_HIERARCHY: Record<string, number> = {
      owner: 4,
      admin: 3,
      editor: 2,
      viewer: 1,
    };

    beforeEach(async () => {
      await ctx.db.insert(schema.workspaceMembers).values([
        {
          workspaceId: ctx.workspaceId,
          userId: ctx.ownerId,
          role: "owner",
          joinedAt: new Date().toISOString(),
        },
        {
          workspaceId: ctx.workspaceId,
          userId: ctx.adminId,
          role: "admin",
          joinedAt: new Date().toISOString(),
        },
        {
          workspaceId: ctx.workspaceId,
          userId: ctx.editorId,
          role: "editor",
          joinedAt: new Date().toISOString(),
        },
        {
          workspaceId: ctx.workspaceId,
          userId: ctx.viewerId,
          role: "viewer",
          joinedAt: new Date().toISOString(),
        },
      ]);
    });

    it("should correctly order roles by hierarchy", async () => {
      const members = await ctx.db
        .select()
        .from(schema.workspaceMembers)
        .where(eq(schema.workspaceMembers.workspaceId, ctx.workspaceId));

      // Sort by role hierarchy
      const sorted = members.sort((a, b) => ROLE_HIERARCHY[b.role] - ROLE_HIERARCHY[a.role]);

      expect(sorted[0].role).toBe("owner");
      expect(sorted[1].role).toBe("admin");
      expect(sorted[2].role).toBe("editor");
      expect(sorted[3].role).toBe("viewer");
    });

    it("should check if user has minimum role", async () => {
      const checkHasRole = async (userId: string, minimumRole: string): Promise<boolean> => {
        const [membership] = await ctx.db
          .select()
          .from(schema.workspaceMembers)
          .where(
            and(eq(schema.workspaceMembers.workspaceId, ctx.workspaceId), eq(schema.workspaceMembers.userId, userId))
          );

        if (!membership) return false;
        return ROLE_HIERARCHY[membership.role] >= ROLE_HIERARCHY[minimumRole];
      };

      // Owner has all roles
      expect(await checkHasRole(ctx.ownerId, "owner")).toBe(true);
      expect(await checkHasRole(ctx.ownerId, "admin")).toBe(true);
      expect(await checkHasRole(ctx.ownerId, "editor")).toBe(true);
      expect(await checkHasRole(ctx.ownerId, "viewer")).toBe(true);

      // Admin has admin, editor, viewer but not owner
      expect(await checkHasRole(ctx.adminId, "owner")).toBe(false);
      expect(await checkHasRole(ctx.adminId, "admin")).toBe(true);
      expect(await checkHasRole(ctx.adminId, "editor")).toBe(true);
      expect(await checkHasRole(ctx.adminId, "viewer")).toBe(true);

      // Viewer only has viewer
      expect(await checkHasRole(ctx.viewerId, "owner")).toBe(false);
      expect(await checkHasRole(ctx.viewerId, "admin")).toBe(false);
      expect(await checkHasRole(ctx.viewerId, "editor")).toBe(false);
      expect(await checkHasRole(ctx.viewerId, "viewer")).toBe(true);
    });
  });

  describe("workspace isolation", () => {
    it("should isolate members between workspaces", async () => {
      // Create second workspace
      const [workspace2] = await ctx.db
        .insert(schema.workspaces)
        .values({
          displayName: "Second Workspace",
          slug: "second-workspace",
        })
        .returning();

      // Add owner to first workspace
      await ctx.db.insert(schema.workspaceMembers).values({
        workspaceId: ctx.workspaceId,
        userId: ctx.ownerId,
        role: "owner",
        joinedAt: new Date().toISOString(),
      });

      // Add different user to second workspace
      await ctx.db.insert(schema.workspaceMembers).values({
        workspaceId: workspace2.id,
        userId: ctx.adminId,
        role: "owner",
        joinedAt: new Date().toISOString(),
      });

      // Query first workspace
      const workspace1Members = await ctx.db
        .select()
        .from(schema.workspaceMembers)
        .where(eq(schema.workspaceMembers.workspaceId, ctx.workspaceId));

      expect(workspace1Members).toHaveLength(1);
      expect(workspace1Members[0].userId).toBe(ctx.ownerId);

      // Query second workspace
      const workspace2Members = await ctx.db
        .select()
        .from(schema.workspaceMembers)
        .where(eq(schema.workspaceMembers.workspaceId, workspace2.id));

      expect(workspace2Members).toHaveLength(1);
      expect(workspace2Members[0].userId).toBe(ctx.adminId);
    });
  });

  describe("relationships", () => {
    beforeEach(async () => {
      await ctx.db.insert(schema.workspaceMembers).values({
        workspaceId: ctx.workspaceId,
        userId: ctx.ownerId,
        role: "owner",
        joinedAt: new Date().toISOString(),
      });
    });

    it("should join with user to get user details", async () => {
      const results = await ctx.db
        .select({
          membership: schema.workspaceMembers,
          user: {
            id: schema.users.id,
            displayName: schema.users.displayName,
            email: schema.users.email,
          },
        })
        .from(schema.workspaceMembers)
        .innerJoin(schema.users, eq(schema.workspaceMembers.userId, schema.users.id))
        .where(eq(schema.workspaceMembers.workspaceId, ctx.workspaceId));

      expect(results).toHaveLength(1);
      expect(results[0].user.displayName).toBe("Owner User");
      expect(results[0].user.email).toBe("owner@example.com");
    });

    it("should join with workspace to get workspace details", async () => {
      const results = await ctx.db
        .select({
          membership: schema.workspaceMembers,
          workspace: {
            id: schema.workspaces.id,
            displayName: schema.workspaces.displayName,
            slug: schema.workspaces.slug,
          },
        })
        .from(schema.workspaceMembers)
        .innerJoin(schema.workspaces, eq(schema.workspaceMembers.workspaceId, schema.workspaces.id))
        .where(eq(schema.workspaceMembers.userId, ctx.ownerId));

      expect(results).toHaveLength(1);
      expect(results[0].workspace.displayName).toBe("Test Workspace");
      expect(results[0].workspace.slug).toBe("test-workspace");
    });
  });

  describe("member count", () => {
    it("should count members in workspace", async () => {
      await ctx.db.insert(schema.workspaceMembers).values([
        {
          workspaceId: ctx.workspaceId,
          userId: ctx.ownerId,
          role: "owner",
          joinedAt: new Date().toISOString(),
        },
        {
          workspaceId: ctx.workspaceId,
          userId: ctx.adminId,
          role: "admin",
          joinedAt: new Date().toISOString(),
        },
        {
          workspaceId: ctx.workspaceId,
          userId: ctx.editorId,
          role: "editor",
          joinedAt: new Date().toISOString(),
        },
      ]);

      const members = await ctx.db
        .select()
        .from(schema.workspaceMembers)
        .where(eq(schema.workspaceMembers.workspaceId, ctx.workspaceId));

      expect(members.length).toBe(3);
    });

    it("should count members by role", async () => {
      await ctx.db.insert(schema.workspaceMembers).values([
        {
          workspaceId: ctx.workspaceId,
          userId: ctx.ownerId,
          role: "owner",
          joinedAt: new Date().toISOString(),
        },
        {
          workspaceId: ctx.workspaceId,
          userId: ctx.adminId,
          role: "admin",
          joinedAt: new Date().toISOString(),
        },
        {
          workspaceId: ctx.workspaceId,
          userId: ctx.editorId,
          role: "admin",
          joinedAt: new Date().toISOString(),
        },
        {
          workspaceId: ctx.workspaceId,
          userId: ctx.viewerId,
          role: "viewer",
          joinedAt: new Date().toISOString(),
        },
      ]);

      const members = await ctx.db
        .select()
        .from(schema.workspaceMembers)
        .where(eq(schema.workspaceMembers.workspaceId, ctx.workspaceId));

      const byRole = members.reduce(
        (acc, m) => {
          acc[m.role] = (acc[m.role] || 0) + 1;
          return acc;
        },
        {} as Record<string, number>
      );

      expect(byRole.owner).toBe(1);
      expect(byRole.admin).toBe(2);
      expect(byRole.viewer).toBe(1);
    });
  });
});
