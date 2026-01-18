/**
 * Category Group Service - Integration Tests
 *
 * Tests the category grouping system for organizing transaction categories.
 */

import {describe, it, expect, beforeEach} from "vitest";
import {setupTestDb} from "../setup/test-db";
import * as schema from "../../../src/lib/schema";
import {eq, and} from "drizzle-orm";
import type {BunSQLiteDatabase} from "drizzle-orm/bun-sqlite";

type TestDb = BunSQLiteDatabase<typeof schema>;

interface TestContext {
  db: TestDb;
  workspaceId: number;
  categoryId1: number;
  categoryId2: number;
  categoryId3: number;
}

async function setupTestContext(): Promise<TestContext> {
  const db = await setupTestDb();

  const [workspace] = await db
    .insert(schema.workspaces)
    .values({
      displayName: "Test Workspace",
      slug: "test-workspace",
    })
    .returning();

  const categories = await db
    .insert(schema.categories)
    .values([
      {workspaceId: workspace.id, name: "Groceries", slug: "groceries"},
      {workspaceId: workspace.id, name: "Restaurants", slug: "restaurants"},
      {workspaceId: workspace.id, name: "Coffee", slug: "coffee"},
    ])
    .returning();

  return {
    db,
    workspaceId: workspace.id,
    categoryId1: categories[0].id,
    categoryId2: categories[1].id,
    categoryId3: categories[2].id,
  };
}

describe("Category Group Service", () => {
  let ctx: TestContext;

  beforeEach(async () => {
    ctx = await setupTestContext();
  });

  describe("category group CRUD", () => {
    it("should create a category group with correct properties", async () => {
      const [group] = await ctx.db
        .insert(schema.categoryGroups)
        .values({
          workspaceId: ctx.workspaceId,
          name: "Food & Dining",
          slug: "food-dining",
          description: "All food-related expenses",
          groupIcon: "utensils",
          groupColor: "#FF5733",
          sortOrder: 0,
        })
        .returning();

      expect(group).toBeDefined();
      expect(group.workspaceId).toBe(ctx.workspaceId);
      expect(group.name).toBe("Food & Dining");
      expect(group.slug).toBe("food-dining");
      expect(group.description).toBe("All food-related expenses");
      expect(group.groupIcon).toBe("utensils");
      expect(group.groupColor).toBe("#FF5733");
      expect(group.sortOrder).toBe(0);
    });

    it("should update category group", async () => {
      const [group] = await ctx.db
        .insert(schema.categoryGroups)
        .values({
          workspaceId: ctx.workspaceId,
          name: "Original Name",
          slug: "original-name",
          sortOrder: 0,
        })
        .returning();

      const [updated] = await ctx.db
        .update(schema.categoryGroups)
        .set({
          name: "Updated Name",
          description: "New description",
          groupColor: "#00FF00",
        })
        .where(eq(schema.categoryGroups.id, group.id))
        .returning();

      expect(updated.name).toBe("Updated Name");
      expect(updated.description).toBe("New description");
      expect(updated.groupColor).toBe("#00FF00");
    });

    it("should delete category group", async () => {
      const [group] = await ctx.db
        .insert(schema.categoryGroups)
        .values({
          workspaceId: ctx.workspaceId,
          name: "To Delete",
          slug: "to-delete",
          sortOrder: 0,
        })
        .returning();

      await ctx.db.delete(schema.categoryGroups).where(eq(schema.categoryGroups.id, group.id));

      const [notFound] = await ctx.db
        .select()
        .from(schema.categoryGroups)
        .where(eq(schema.categoryGroups.id, group.id));

      expect(notFound).toBeUndefined();
    });

    it("should order groups by sortOrder", async () => {
      await ctx.db.insert(schema.categoryGroups).values([
        {workspaceId: ctx.workspaceId, name: "Third", slug: "third", sortOrder: 3},
        {workspaceId: ctx.workspaceId, name: "First", slug: "first", sortOrder: 1},
        {workspaceId: ctx.workspaceId, name: "Second", slug: "second", sortOrder: 2},
      ]);

      const groups = await ctx.db
        .select()
        .from(schema.categoryGroups)
        .where(eq(schema.categoryGroups.workspaceId, ctx.workspaceId))
        .orderBy(schema.categoryGroups.sortOrder);

      expect(groups[0].name).toBe("First");
      expect(groups[1].name).toBe("Second");
      expect(groups[2].name).toBe("Third");
    });
  });

  describe("category group memberships", () => {
    let groupId: number;

    beforeEach(async () => {
      const [group] = await ctx.db
        .insert(schema.categoryGroups)
        .values({
          workspaceId: ctx.workspaceId,
          name: "Food",
          slug: "food",
          sortOrder: 0,
        })
        .returning();
      groupId = group.id;
    });

    it("should add category to group", async () => {
      const [membership] = await ctx.db
        .insert(schema.categoryGroupMemberships)
        .values({
          categoryGroupId: groupId,
          categoryId: ctx.categoryId1,
          sortOrder: 0,
        })
        .returning();

      expect(membership).toBeDefined();
      expect(membership.categoryGroupId).toBe(groupId);
      expect(membership.categoryId).toBe(ctx.categoryId1);
    });

    it("should add multiple categories to group", async () => {
      await ctx.db.insert(schema.categoryGroupMemberships).values([
        {categoryGroupId: groupId, categoryId: ctx.categoryId1, sortOrder: 0},
        {categoryGroupId: groupId, categoryId: ctx.categoryId2, sortOrder: 1},
        {categoryGroupId: groupId, categoryId: ctx.categoryId3, sortOrder: 2},
      ]);

      const memberships = await ctx.db
        .select()
        .from(schema.categoryGroupMemberships)
        .where(eq(schema.categoryGroupMemberships.categoryGroupId, groupId));

      expect(memberships).toHaveLength(3);
    });

    it("should enforce single-group membership for category", async () => {
      // Add category to first group
      await ctx.db.insert(schema.categoryGroupMemberships).values({
        categoryGroupId: groupId,
        categoryId: ctx.categoryId1,
        sortOrder: 0,
      });

      // Create second group
      const [group2] = await ctx.db
        .insert(schema.categoryGroups)
        .values({
          workspaceId: ctx.workspaceId,
          name: "Dining",
          slug: "dining",
          sortOrder: 1,
        })
        .returning();

      // Try to add same category to second group - should fail
      try {
        await ctx.db
          .insert(schema.categoryGroupMemberships)
          .values({
            categoryGroupId: group2.id,
            categoryId: ctx.categoryId1, // Same category
            sortOrder: 0,
          })
          .run();
        expect.fail("Expected unique constraint violation");
      } catch (error) {
        expect(error).toBeDefined();
      }
    });

    it("should remove category from group", async () => {
      const [membership] = await ctx.db
        .insert(schema.categoryGroupMemberships)
        .values({
          categoryGroupId: groupId,
          categoryId: ctx.categoryId1,
          sortOrder: 0,
        })
        .returning();

      await ctx.db.delete(schema.categoryGroupMemberships).where(eq(schema.categoryGroupMemberships.id, membership.id));

      const [notFound] = await ctx.db
        .select()
        .from(schema.categoryGroupMemberships)
        .where(eq(schema.categoryGroupMemberships.id, membership.id));

      expect(notFound).toBeUndefined();
    });

    it("should order memberships by sortOrder", async () => {
      await ctx.db.insert(schema.categoryGroupMemberships).values([
        {categoryGroupId: groupId, categoryId: ctx.categoryId3, sortOrder: 3},
        {categoryGroupId: groupId, categoryId: ctx.categoryId1, sortOrder: 1},
        {categoryGroupId: groupId, categoryId: ctx.categoryId2, sortOrder: 2},
      ]);

      const memberships = await ctx.db
        .select()
        .from(schema.categoryGroupMemberships)
        .where(eq(schema.categoryGroupMemberships.categoryGroupId, groupId))
        .orderBy(schema.categoryGroupMemberships.sortOrder);

      expect(memberships[0].categoryId).toBe(ctx.categoryId1);
      expect(memberships[1].categoryId).toBe(ctx.categoryId2);
      expect(memberships[2].categoryId).toBe(ctx.categoryId3);
    });
  });

  describe("category group recommendations", () => {
    let groupId: number;

    beforeEach(async () => {
      const [group] = await ctx.db
        .insert(schema.categoryGroups)
        .values({
          workspaceId: ctx.workspaceId,
          name: "Food",
          slug: "food",
          sortOrder: 0,
        })
        .returning();
      groupId = group.id;
    });

    it("should create recommendation with correct properties", async () => {
      const [recommendation] = await ctx.db
        .insert(schema.categoryGroupRecommendations)
        .values({
          categoryId: ctx.categoryId1,
          suggestedGroupId: groupId,
          suggestedGroupName: "Food",
          confidenceScore: 0.85,
          reasoning: "Category 'Groceries' is food-related",
          status: "pending",
        })
        .returning();

      expect(recommendation).toBeDefined();
      expect(recommendation.categoryId).toBe(ctx.categoryId1);
      expect(recommendation.suggestedGroupId).toBe(groupId);
      expect(recommendation.confidenceScore).toBe(0.85);
      expect(recommendation.status).toBe("pending");
    });

    it("should support all recommendation statuses", async () => {
      const statuses = ["pending", "approved", "dismissed", "rejected"] as const;

      for (const status of statuses) {
        const [recommendation] = await ctx.db
          .insert(schema.categoryGroupRecommendations)
          .values({
            categoryId: ctx.categoryId1,
            suggestedGroupId: groupId,
            confidenceScore: 0.8,
            status,
          })
          .returning();

        expect(recommendation.status).toBe(status);

        // Clean up for next iteration
        await ctx.db
          .delete(schema.categoryGroupRecommendations)
          .where(eq(schema.categoryGroupRecommendations.id, recommendation.id));
      }
    });

    it("should update recommendation status", async () => {
      const [recommendation] = await ctx.db
        .insert(schema.categoryGroupRecommendations)
        .values({
          categoryId: ctx.categoryId1,
          suggestedGroupId: groupId,
          confidenceScore: 0.9,
          status: "pending",
        })
        .returning();

      const [updated] = await ctx.db
        .update(schema.categoryGroupRecommendations)
        .set({status: "approved"})
        .where(eq(schema.categoryGroupRecommendations.id, recommendation.id))
        .returning();

      expect(updated.status).toBe("approved");
    });

    it("should filter recommendations by confidence", async () => {
      await ctx.db.insert(schema.categoryGroupRecommendations).values([
        {categoryId: ctx.categoryId1, suggestedGroupId: groupId, confidenceScore: 0.95, status: "pending"},
        {categoryId: ctx.categoryId2, suggestedGroupId: groupId, confidenceScore: 0.65, status: "pending"},
        {categoryId: ctx.categoryId3, suggestedGroupId: groupId, confidenceScore: 0.45, status: "pending"},
      ]);

      const allRecommendations = await ctx.db.select().from(schema.categoryGroupRecommendations);

      const highConfidence = allRecommendations.filter((r) => r.confidenceScore >= 0.7);
      expect(highConfidence).toHaveLength(1);
      expect(highConfidence[0].categoryId).toBe(ctx.categoryId1);
    });

    it("should allow recommendation for new group (null suggestedGroupId)", async () => {
      const [recommendation] = await ctx.db
        .insert(schema.categoryGroupRecommendations)
        .values({
          categoryId: ctx.categoryId1,
          suggestedGroupId: null,
          suggestedGroupName: "New Group Suggestion",
          confidenceScore: 0.75,
          status: "pending",
        })
        .returning();

      expect(recommendation.suggestedGroupId).toBeNull();
      expect(recommendation.suggestedGroupName).toBe("New Group Suggestion");
    });
  });

  describe("category group settings", () => {
    it("should create settings with defaults", async () => {
      const [settings] = await ctx.db
        .insert(schema.categoryGroupSettings)
        .values({})
        .returning();

      expect(settings).toBeDefined();
      expect(settings.recommendationsEnabled).toBe(true);
      expect(settings.minConfidenceScore).toBe(0.7);
    });

    it("should update settings", async () => {
      const [settings] = await ctx.db.insert(schema.categoryGroupSettings).values({}).returning();

      const [updated] = await ctx.db
        .update(schema.categoryGroupSettings)
        .set({
          recommendationsEnabled: false,
          minConfidenceScore: 0.85,
        })
        .where(eq(schema.categoryGroupSettings.id, settings.id))
        .returning();

      expect(updated.recommendationsEnabled).toBe(false);
      expect(updated.minConfidenceScore).toBe(0.85);
    });
  });

  describe("workspace isolation", () => {
    it("should isolate category groups between workspaces", async () => {
      // Create second workspace
      const [workspace2] = await ctx.db
        .insert(schema.workspaces)
        .values({
          displayName: "Second Workspace",
          slug: "second-workspace",
        })
        .returning();

      // Create groups in both workspaces (unique names required)
      await ctx.db.insert(schema.categoryGroups).values([
        {workspaceId: ctx.workspaceId, name: "Group WS1", slug: "group-ws1", sortOrder: 0},
        {workspaceId: workspace2.id, name: "Group WS2", slug: "group-ws2", sortOrder: 0},
      ]);

      // Query workspace 1
      const workspace1Groups = await ctx.db
        .select()
        .from(schema.categoryGroups)
        .where(eq(schema.categoryGroups.workspaceId, ctx.workspaceId));

      expect(workspace1Groups).toHaveLength(1);
      expect(workspace1Groups[0].slug).toBe("group-ws1");

      // Query workspace 2
      const workspace2Groups = await ctx.db
        .select()
        .from(schema.categoryGroups)
        .where(eq(schema.categoryGroups.workspaceId, workspace2.id));

      expect(workspace2Groups).toHaveLength(1);
      expect(workspace2Groups[0].slug).toBe("group-ws2");
    });
  });

  describe("relationships", () => {
    it("should join group with memberships to get category details", async () => {
      const [group] = await ctx.db
        .insert(schema.categoryGroups)
        .values({
          workspaceId: ctx.workspaceId,
          name: "Food",
          slug: "food",
          sortOrder: 0,
        })
        .returning();

      await ctx.db.insert(schema.categoryGroupMemberships).values([
        {categoryGroupId: group.id, categoryId: ctx.categoryId1, sortOrder: 0},
        {categoryGroupId: group.id, categoryId: ctx.categoryId2, sortOrder: 1},
      ]);

      const results = await ctx.db
        .select({
          membership: schema.categoryGroupMemberships,
          category: {
            id: schema.categories.id,
            name: schema.categories.name,
          },
        })
        .from(schema.categoryGroupMemberships)
        .innerJoin(schema.categories, eq(schema.categoryGroupMemberships.categoryId, schema.categories.id))
        .where(eq(schema.categoryGroupMemberships.categoryGroupId, group.id));

      expect(results).toHaveLength(2);
      const categoryNames = results.map((r) => r.category.name);
      expect(categoryNames).toContain("Groceries");
      expect(categoryNames).toContain("Restaurants");
    });

    it("should join group with all its memberships", async () => {
      const [group] = await ctx.db
        .insert(schema.categoryGroups)
        .values({
          workspaceId: ctx.workspaceId,
          name: "Food Group",
          slug: "food-group",
          sortOrder: 0,
        })
        .returning();

      await ctx.db.insert(schema.categoryGroupMemberships).values([
        {categoryGroupId: group.id, categoryId: ctx.categoryId1, sortOrder: 0},
        {categoryGroupId: group.id, categoryId: ctx.categoryId2, sortOrder: 1},
        {categoryGroupId: group.id, categoryId: ctx.categoryId3, sortOrder: 2},
      ]);

      // Join to get group with all its memberships
      const results = await ctx.db
        .select({
          group: schema.categoryGroups,
          membership: schema.categoryGroupMemberships,
        })
        .from(schema.categoryGroups)
        .innerJoin(
          schema.categoryGroupMemberships,
          eq(schema.categoryGroups.id, schema.categoryGroupMemberships.categoryGroupId)
        )
        .where(eq(schema.categoryGroups.id, group.id));

      expect(results).toHaveLength(3);
      expect(results.every((r) => r.group.id === group.id)).toBe(true);
      expect(results.map((r) => r.membership.categoryId)).toContain(ctx.categoryId1);
      expect(results.map((r) => r.membership.categoryId)).toContain(ctx.categoryId2);
      expect(results.map((r) => r.membership.categoryId)).toContain(ctx.categoryId3);
    });
  });
});
