/**
 * Category Groups - Integration Tests
 *
 * Tests category group management including creation,
 * membership, recommendations, and settings.
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
  categoryIds: number[];
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

  // Create categories
  const categories = await db
    .insert(schema.categories)
    .values([
      {workspaceId: workspace.id, name: "Groceries", slug: "groceries"},
      {workspaceId: workspace.id, name: "Restaurants", slug: "restaurants"},
      {workspaceId: workspace.id, name: "Coffee Shops", slug: "coffee-shops"},
      {workspaceId: workspace.id, name: "Electricity", slug: "electricity"},
      {workspaceId: workspace.id, name: "Gas", slug: "gas"},
      {workspaceId: workspace.id, name: "Water", slug: "water"},
    ])
    .returning();

  return {
    db,
    workspaceId: workspace.id,
    categoryIds: categories.map((c) => c.id),
  };
}

describe("Category Groups", () => {
  let ctx: TestContext;

  beforeEach(async () => {
    ctx = await setupTestContext();
  });

  describe("group creation", () => {
    it("should create a category group", async () => {
      const [group] = await ctx.db
        .insert(schema.categoryGroups)
        .values({
          workspaceId: ctx.workspaceId,
          name: "Food & Dining",
          slug: "food-dining",
          description: "All food-related expenses",
          sortOrder: 0,
        })
        .returning();

      expect(group.name).toBe("Food & Dining");
      expect(group.slug).toBe("food-dining");
      expect(group.description).toBe("All food-related expenses");
    });

    it("should create group with icon and color", async () => {
      const [group] = await ctx.db
        .insert(schema.categoryGroups)
        .values({
          workspaceId: ctx.workspaceId,
          name: "Utilities",
          slug: "utilities",
          groupIcon: "zap",
          groupColor: "#FF5733",
          sortOrder: 1,
        })
        .returning();

      expect(group.groupIcon).toBe("zap");
      expect(group.groupColor).toBe("#FF5733");
    });

    it("should enforce unique group names", async () => {
      await ctx.db.insert(schema.categoryGroups).values({
        workspaceId: ctx.workspaceId,
        name: "Food & Dining",
        slug: "food-dining",
        sortOrder: 0,
      });

      // Attempting to create duplicate should fail (catches SQLite UNIQUE constraint)
      let errorThrown = false;
      try {
        await ctx.db.insert(schema.categoryGroups).values({
          workspaceId: ctx.workspaceId,
          name: "Food & Dining",
          slug: "food-dining-2",
          sortOrder: 1,
        });
      } catch (error) {
        errorThrown = true;
        expect((error as Error).message).toContain("UNIQUE constraint failed");
      }
      expect(errorThrown).toBe(true);
    });

    it("should enforce unique slugs", async () => {
      await ctx.db.insert(schema.categoryGroups).values({
        workspaceId: ctx.workspaceId,
        name: "Food & Dining",
        slug: "food-dining",
        sortOrder: 0,
      });

      let errorThrown = false;
      try {
        await ctx.db.insert(schema.categoryGroups).values({
          workspaceId: ctx.workspaceId,
          name: "Food and Dining",
          slug: "food-dining",
          sortOrder: 1,
        });
      } catch (error) {
        errorThrown = true;
        expect((error as Error).message).toContain("UNIQUE constraint failed");
      }
      expect(errorThrown).toBe(true);
    });
  });

  describe("group membership", () => {
    it("should add category to group", async () => {
      const [group] = await ctx.db
        .insert(schema.categoryGroups)
        .values({
          workspaceId: ctx.workspaceId,
          name: "Food & Dining",
          slug: "food-dining",
          sortOrder: 0,
        })
        .returning();

      const [membership] = await ctx.db
        .insert(schema.categoryGroupMemberships)
        .values({
          categoryGroupId: group.id,
          categoryId: ctx.categoryIds[0], // Groceries
          sortOrder: 0,
        })
        .returning();

      expect(membership.categoryGroupId).toBe(group.id);
      expect(membership.categoryId).toBe(ctx.categoryIds[0]);
    });

    it("should add multiple categories to group", async () => {
      const [group] = await ctx.db
        .insert(schema.categoryGroups)
        .values({
          workspaceId: ctx.workspaceId,
          name: "Food & Dining",
          slug: "food-dining",
          sortOrder: 0,
        })
        .returning();

      await ctx.db.insert(schema.categoryGroupMemberships).values([
        {categoryGroupId: group.id, categoryId: ctx.categoryIds[0], sortOrder: 0}, // Groceries
        {categoryGroupId: group.id, categoryId: ctx.categoryIds[1], sortOrder: 1}, // Restaurants
        {categoryGroupId: group.id, categoryId: ctx.categoryIds[2], sortOrder: 2}, // Coffee Shops
      ]);

      const memberships = await ctx.db
        .select()
        .from(schema.categoryGroupMemberships)
        .where(eq(schema.categoryGroupMemberships.categoryGroupId, group.id));

      expect(memberships).toHaveLength(3);
    });

    it("should enforce single-group membership per category", async () => {
      const [group1] = await ctx.db
        .insert(schema.categoryGroups)
        .values({
          workspaceId: ctx.workspaceId,
          name: "Food",
          slug: "food",
          sortOrder: 0,
        })
        .returning();

      const [group2] = await ctx.db
        .insert(schema.categoryGroups)
        .values({
          workspaceId: ctx.workspaceId,
          name: "Other Food",
          slug: "other-food",
          sortOrder: 1,
        })
        .returning();

      await ctx.db.insert(schema.categoryGroupMemberships).values({
        categoryGroupId: group1.id,
        categoryId: ctx.categoryIds[0],
        sortOrder: 0,
      });

      // Same category cannot belong to another group
      let errorThrown = false;
      try {
        await ctx.db.insert(schema.categoryGroupMemberships).values({
          categoryGroupId: group2.id,
          categoryId: ctx.categoryIds[0],
          sortOrder: 0,
        });
      } catch (error) {
        errorThrown = true;
        expect((error as Error).message).toContain("UNIQUE constraint failed");
      }
      expect(errorThrown).toBe(true);
    });

    it("should remove category from group", async () => {
      const [group] = await ctx.db
        .insert(schema.categoryGroups)
        .values({
          workspaceId: ctx.workspaceId,
          name: "Food & Dining",
          slug: "food-dining",
          sortOrder: 0,
        })
        .returning();

      const [membership] = await ctx.db
        .insert(schema.categoryGroupMemberships)
        .values({
          categoryGroupId: group.id,
          categoryId: ctx.categoryIds[0],
          sortOrder: 0,
        })
        .returning();

      await ctx.db
        .delete(schema.categoryGroupMemberships)
        .where(eq(schema.categoryGroupMemberships.id, membership.id));

      const remaining = await ctx.db
        .select()
        .from(schema.categoryGroupMemberships)
        .where(eq(schema.categoryGroupMemberships.categoryGroupId, group.id));

      expect(remaining).toHaveLength(0);
    });

    it("should update membership sort order", async () => {
      const [group] = await ctx.db
        .insert(schema.categoryGroups)
        .values({
          workspaceId: ctx.workspaceId,
          name: "Food & Dining",
          slug: "food-dining",
          sortOrder: 0,
        })
        .returning();

      const [membership] = await ctx.db
        .insert(schema.categoryGroupMemberships)
        .values({
          categoryGroupId: group.id,
          categoryId: ctx.categoryIds[0],
          sortOrder: 0,
        })
        .returning();

      await ctx.db
        .update(schema.categoryGroupMemberships)
        .set({sortOrder: 5})
        .where(eq(schema.categoryGroupMemberships.id, membership.id));

      const updated = await ctx.db.query.categoryGroupMemberships.findFirst({
        where: eq(schema.categoryGroupMemberships.id, membership.id),
      });

      expect(updated?.sortOrder).toBe(5);
    });
  });

  describe("group recommendations", () => {
    it("should create group recommendation", async () => {
      const [group] = await ctx.db
        .insert(schema.categoryGroups)
        .values({
          workspaceId: ctx.workspaceId,
          name: "Utilities",
          slug: "utilities",
          sortOrder: 0,
        })
        .returning();

      const [recommendation] = await ctx.db
        .insert(schema.categoryGroupRecommendations)
        .values({
          categoryId: ctx.categoryIds[3], // Electricity
          suggestedGroupId: group.id,
          confidenceScore: 0.85,
          reasoning: "This category is commonly grouped with other utilities",
          status: "pending",
        })
        .returning();

      expect(recommendation.suggestedGroupId).toBe(group.id);
      expect(recommendation.confidenceScore).toBe(0.85);
      expect(recommendation.status).toBe("pending");
    });

    it("should recommend new group name when group doesn't exist", async () => {
      const [recommendation] = await ctx.db
        .insert(schema.categoryGroupRecommendations)
        .values({
          categoryId: ctx.categoryIds[3], // Electricity
          suggestedGroupId: null,
          suggestedGroupName: "Home Utilities",
          confidenceScore: 0.9,
          reasoning: "Based on similar categories in other workspaces",
          status: "pending",
        })
        .returning();

      expect(recommendation.suggestedGroupId).toBeNull();
      expect(recommendation.suggestedGroupName).toBe("Home Utilities");
    });

    it("should approve recommendation", async () => {
      const [group] = await ctx.db
        .insert(schema.categoryGroups)
        .values({
          workspaceId: ctx.workspaceId,
          name: "Utilities",
          slug: "utilities",
          sortOrder: 0,
        })
        .returning();

      const [recommendation] = await ctx.db
        .insert(schema.categoryGroupRecommendations)
        .values({
          categoryId: ctx.categoryIds[3],
          suggestedGroupId: group.id,
          confidenceScore: 0.85,
          status: "pending",
        })
        .returning();

      // Approve recommendation
      await ctx.db
        .update(schema.categoryGroupRecommendations)
        .set({status: "approved"})
        .where(eq(schema.categoryGroupRecommendations.id, recommendation.id));

      // Create membership
      await ctx.db.insert(schema.categoryGroupMemberships).values({
        categoryGroupId: group.id,
        categoryId: ctx.categoryIds[3],
        sortOrder: 0,
      });

      const updated = await ctx.db.query.categoryGroupRecommendations.findFirst({
        where: eq(schema.categoryGroupRecommendations.id, recommendation.id),
      });

      expect(updated?.status).toBe("approved");
    });

    it("should dismiss recommendation", async () => {
      const [recommendation] = await ctx.db
        .insert(schema.categoryGroupRecommendations)
        .values({
          categoryId: ctx.categoryIds[0],
          suggestedGroupName: "Food",
          confidenceScore: 0.7,
          status: "pending",
        })
        .returning();

      await ctx.db
        .update(schema.categoryGroupRecommendations)
        .set({status: "dismissed"})
        .where(eq(schema.categoryGroupRecommendations.id, recommendation.id));

      const updated = await ctx.db.query.categoryGroupRecommendations.findFirst({
        where: eq(schema.categoryGroupRecommendations.id, recommendation.id),
      });

      expect(updated?.status).toBe("dismissed");
    });

    it("should reject recommendation", async () => {
      const [recommendation] = await ctx.db
        .insert(schema.categoryGroupRecommendations)
        .values({
          categoryId: ctx.categoryIds[0],
          suggestedGroupName: "Bad Group",
          confidenceScore: 0.5,
          status: "pending",
        })
        .returning();

      await ctx.db
        .update(schema.categoryGroupRecommendations)
        .set({status: "rejected"})
        .where(eq(schema.categoryGroupRecommendations.id, recommendation.id));

      const updated = await ctx.db.query.categoryGroupRecommendations.findFirst({
        where: eq(schema.categoryGroupRecommendations.id, recommendation.id),
      });

      expect(updated?.status).toBe("rejected");
    });

    it("should filter recommendations by confidence", async () => {
      await ctx.db.insert(schema.categoryGroupRecommendations).values([
        {
          categoryId: ctx.categoryIds[0],
          suggestedGroupName: "Low Confidence",
          confidenceScore: 0.5,
          status: "pending",
        },
        {
          categoryId: ctx.categoryIds[1],
          suggestedGroupName: "Medium Confidence",
          confidenceScore: 0.75,
          status: "pending",
        },
        {
          categoryId: ctx.categoryIds[2],
          suggestedGroupName: "High Confidence",
          confidenceScore: 0.95,
          status: "pending",
        },
      ]);

      const allRecs = await ctx.db.select().from(schema.categoryGroupRecommendations);

      const highConfidence = allRecs.filter((r) => r.confidenceScore >= 0.7);

      expect(allRecs).toHaveLength(3);
      expect(highConfidence).toHaveLength(2);
    });
  });

  describe("group settings", () => {
    it("should create default group settings", async () => {
      const [settings] = await ctx.db
        .insert(schema.categoryGroupSettings)
        .values({
          recommendationsEnabled: true,
          minConfidenceScore: 0.7,
        })
        .returning();

      expect(settings.recommendationsEnabled).toBe(true);
      expect(settings.minConfidenceScore).toBe(0.7);
    });

    it("should update recommendation settings", async () => {
      const [settings] = await ctx.db
        .insert(schema.categoryGroupSettings)
        .values({
          recommendationsEnabled: true,
          minConfidenceScore: 0.7,
        })
        .returning();

      await ctx.db
        .update(schema.categoryGroupSettings)
        .set({
          recommendationsEnabled: false,
          minConfidenceScore: 0.8,
        })
        .where(eq(schema.categoryGroupSettings.id, settings.id));

      const updated = await ctx.db.query.categoryGroupSettings.findFirst({
        where: eq(schema.categoryGroupSettings.id, settings.id),
      });

      expect(updated?.recommendationsEnabled).toBe(false);
      expect(updated?.minConfidenceScore).toBe(0.8);
    });
  });

  describe("group updates", () => {
    it("should update group details", async () => {
      const [group] = await ctx.db
        .insert(schema.categoryGroups)
        .values({
          workspaceId: ctx.workspaceId,
          name: "Food",
          slug: "food",
          sortOrder: 0,
        })
        .returning();

      await ctx.db
        .update(schema.categoryGroups)
        .set({
          name: "Food & Dining",
          description: "All food and restaurant expenses",
          groupIcon: "utensils",
          groupColor: "#4CAF50",
        })
        .where(eq(schema.categoryGroups.id, group.id));

      const updated = await ctx.db.query.categoryGroups.findFirst({
        where: eq(schema.categoryGroups.id, group.id),
      });

      expect(updated?.name).toBe("Food & Dining");
      expect(updated?.description).toBe("All food and restaurant expenses");
      expect(updated?.groupIcon).toBe("utensils");
    });

    it("should update group sort order", async () => {
      const groups = await ctx.db
        .insert(schema.categoryGroups)
        .values([
          {workspaceId: ctx.workspaceId, name: "Group A", slug: "group-a", sortOrder: 0},
          {workspaceId: ctx.workspaceId, name: "Group B", slug: "group-b", sortOrder: 1},
          {workspaceId: ctx.workspaceId, name: "Group C", slug: "group-c", sortOrder: 2},
        ])
        .returning();

      // Reorder: C -> A -> B
      await ctx.db
        .update(schema.categoryGroups)
        .set({sortOrder: 0})
        .where(eq(schema.categoryGroups.id, groups[2].id));
      await ctx.db
        .update(schema.categoryGroups)
        .set({sortOrder: 1})
        .where(eq(schema.categoryGroups.id, groups[0].id));
      await ctx.db
        .update(schema.categoryGroups)
        .set({sortOrder: 2})
        .where(eq(schema.categoryGroups.id, groups[1].id));

      const reordered = await ctx.db
        .select()
        .from(schema.categoryGroups)
        .where(eq(schema.categoryGroups.workspaceId, ctx.workspaceId));

      const sorted = reordered.sort((a, b) => a.sortOrder - b.sortOrder);
      expect(sorted[0].name).toBe("Group C");
      expect(sorted[1].name).toBe("Group A");
      expect(sorted[2].name).toBe("Group B");
    });
  });

  describe("group deletion", () => {
    it("should delete group and memberships (manual cleanup)", async () => {
      const [group] = await ctx.db
        .insert(schema.categoryGroups)
        .values({
          workspaceId: ctx.workspaceId,
          name: "Food",
          slug: "food",
          sortOrder: 0,
        })
        .returning();

      await ctx.db.insert(schema.categoryGroupMemberships).values({
        categoryGroupId: group.id,
        categoryId: ctx.categoryIds[0],
        sortOrder: 0,
      });

      // Manual cleanup since SQLite FK cascade may not work in test DB
      await ctx.db
        .delete(schema.categoryGroupMemberships)
        .where(eq(schema.categoryGroupMemberships.categoryGroupId, group.id));

      await ctx.db.delete(schema.categoryGroups).where(eq(schema.categoryGroups.id, group.id));

      const deletedGroup = await ctx.db.query.categoryGroups.findFirst({
        where: eq(schema.categoryGroups.id, group.id),
      });

      const orphanedMemberships = await ctx.db
        .select()
        .from(schema.categoryGroupMemberships)
        .where(eq(schema.categoryGroupMemberships.categoryGroupId, group.id));

      expect(deletedGroup).toBeUndefined();
      expect(orphanedMemberships).toHaveLength(0);
    });

    it("should delete membership when category is deleted (manual cleanup)", async () => {
      const [group] = await ctx.db
        .insert(schema.categoryGroups)
        .values({
          workspaceId: ctx.workspaceId,
          name: "Food",
          slug: "food",
          sortOrder: 0,
        })
        .returning();

      await ctx.db.insert(schema.categoryGroupMemberships).values({
        categoryGroupId: group.id,
        categoryId: ctx.categoryIds[0],
        sortOrder: 0,
      });

      // Manual cleanup since SQLite FK cascade may not work in test DB
      await ctx.db
        .delete(schema.categoryGroupMemberships)
        .where(eq(schema.categoryGroupMemberships.categoryId, ctx.categoryIds[0]));

      // Delete the category
      await ctx.db.delete(schema.categories).where(eq(schema.categories.id, ctx.categoryIds[0]));

      const remainingMemberships = await ctx.db
        .select()
        .from(schema.categoryGroupMemberships)
        .where(eq(schema.categoryGroupMemberships.categoryGroupId, group.id));

      expect(remainingMemberships).toHaveLength(0);
    });
  });

  describe("workspace isolation", () => {
    it("should isolate groups by workspace", async () => {
      const [workspace2] = await ctx.db
        .insert(schema.workspaces)
        .values({
          displayName: "Second Workspace",
          slug: "second-workspace",
        })
        .returning();

      await ctx.db.insert(schema.categoryGroups).values({
        workspaceId: ctx.workspaceId,
        name: "WS1 Group",
        slug: "ws1-group",
        sortOrder: 0,
      });

      await ctx.db.insert(schema.categoryGroups).values({
        workspaceId: workspace2.id,
        name: "WS2 Group",
        slug: "ws2-group",
        sortOrder: 0,
      });

      const ws1Groups = await ctx.db
        .select()
        .from(schema.categoryGroups)
        .where(eq(schema.categoryGroups.workspaceId, ctx.workspaceId));

      const ws2Groups = await ctx.db
        .select()
        .from(schema.categoryGroups)
        .where(eq(schema.categoryGroups.workspaceId, workspace2.id));

      expect(ws1Groups).toHaveLength(1);
      expect(ws1Groups[0].name).toBe("WS1 Group");

      expect(ws2Groups).toHaveLength(1);
      expect(ws2Groups[0].name).toBe("WS2 Group");
    });
  });
});
