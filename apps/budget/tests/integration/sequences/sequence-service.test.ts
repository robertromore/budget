/**
 * Sequence Service - Integration Tests
 *
 * Tests the per-workspace sequential ID generation system.
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
  workspaceId2: number;
}

async function setupTestContext(): Promise<TestContext> {
  const db = await setupTestDb();

  // Create two workspaces for isolation testing
  const [workspace1] = await db
    .insert(schema.workspaces)
    .values({
      displayName: "Test Workspace 1",
      slug: "test-workspace-1",
    })
    .returning();

  const [workspace2] = await db
    .insert(schema.workspaces)
    .values({
      displayName: "Test Workspace 2",
      slug: "test-workspace-2",
    })
    .returning();

  return {
    db,
    workspaceId: workspace1.id,
    workspaceId2: workspace2.id,
  };
}

describe("Sequence Service", () => {
  let ctx: TestContext;

  beforeEach(async () => {
    ctx = await setupTestContext();
  });

  describe("create counter", () => {
    it("should create a counter with initial value", async () => {
      const now = new Date().toISOString();

      const [counter] = await ctx.db
        .insert(schema.workspaceCounters)
        .values({
          workspaceId: ctx.workspaceId,
          entityType: "transaction",
          nextSeq: 1,
          createdAt: now,
          updatedAt: now,
        })
        .returning();

      expect(counter).toBeDefined();
      expect(counter.workspaceId).toBe(ctx.workspaceId);
      expect(counter.entityType).toBe("transaction");
      expect(counter.nextSeq).toBe(1);
    });

    it("should support all entity types", async () => {
      const entityTypes = ["account", "transaction", "budget", "category", "schedule", "payee"] as const;

      for (const entityType of entityTypes) {
        const [counter] = await ctx.db
          .insert(schema.workspaceCounters)
          .values({
            workspaceId: ctx.workspaceId,
            entityType,
            nextSeq: 1,
          })
          .returning();

        expect(counter.entityType).toBe(entityType);
      }
    });

    it("should enforce unique constraint on workspace + entityType", async () => {
      // First insert
      await ctx.db.insert(schema.workspaceCounters).values({
        workspaceId: ctx.workspaceId,
        entityType: "account",
        nextSeq: 1,
      });

      // Duplicate should fail
      try {
        await ctx.db
          .insert(schema.workspaceCounters)
          .values({
            workspaceId: ctx.workspaceId,
            entityType: "account", // Same entity type
            nextSeq: 5,
          })
          .run();
        expect.fail("Expected unique constraint violation");
      } catch (error) {
        expect(error).toBeDefined();
      }
    });
  });

  describe("get next sequence", () => {
    it("should return and increment sequence atomically", async () => {
      // Create initial counter
      await ctx.db.insert(schema.workspaceCounters).values({
        workspaceId: ctx.workspaceId,
        entityType: "transaction",
        nextSeq: 5,
      });

      // Simulate getNextSeq: update and return previous value
      const [result] = await ctx.db
        .update(schema.workspaceCounters)
        .set({
          nextSeq: 6, // Increment by 1
        })
        .where(
          and(
            eq(schema.workspaceCounters.workspaceId, ctx.workspaceId),
            eq(schema.workspaceCounters.entityType, "transaction")
          )
        )
        .returning();

      // The previous value was 5
      expect(result.nextSeq).toBe(6);

      // Verify counter was incremented
      const [updated] = await ctx.db
        .select()
        .from(schema.workspaceCounters)
        .where(
          and(
            eq(schema.workspaceCounters.workspaceId, ctx.workspaceId),
            eq(schema.workspaceCounters.entityType, "transaction")
          )
        );

      expect(updated.nextSeq).toBe(6);
    });

    it("should handle multiple sequential gets", async () => {
      await ctx.db.insert(schema.workspaceCounters).values({
        workspaceId: ctx.workspaceId,
        entityType: "account",
        nextSeq: 1,
      });

      const results: number[] = [];

      for (let i = 0; i < 5; i++) {
        const [counter] = await ctx.db
          .select()
          .from(schema.workspaceCounters)
          .where(
            and(
              eq(schema.workspaceCounters.workspaceId, ctx.workspaceId),
              eq(schema.workspaceCounters.entityType, "account")
            )
          );

        results.push(counter.nextSeq);

        // Increment for next iteration
        await ctx.db
          .update(schema.workspaceCounters)
          .set({nextSeq: counter.nextSeq + 1})
          .where(eq(schema.workspaceCounters.id, counter.id));
      }

      expect(results).toEqual([1, 2, 3, 4, 5]);
    });
  });

  describe("batch sequence allocation", () => {
    it("should allocate batch of sequences", async () => {
      await ctx.db.insert(schema.workspaceCounters).values({
        workspaceId: ctx.workspaceId,
        entityType: "transaction",
        nextSeq: 1,
      });

      const batchSize = 10;

      // Get current value as start
      const [counter] = await ctx.db
        .select()
        .from(schema.workspaceCounters)
        .where(
          and(
            eq(schema.workspaceCounters.workspaceId, ctx.workspaceId),
            eq(schema.workspaceCounters.entityType, "transaction")
          )
        );

      const startSeq = counter.nextSeq;

      // Increment by batch size
      await ctx.db
        .update(schema.workspaceCounters)
        .set({nextSeq: startSeq + batchSize})
        .where(eq(schema.workspaceCounters.id, counter.id));

      // Verify counter jumped by batch size
      const [updated] = await ctx.db
        .select()
        .from(schema.workspaceCounters)
        .where(eq(schema.workspaceCounters.id, counter.id));

      expect(updated.nextSeq).toBe(startSeq + batchSize);
      expect(updated.nextSeq).toBe(11);
    });

    it("should allocate non-overlapping batches", async () => {
      await ctx.db.insert(schema.workspaceCounters).values({
        workspaceId: ctx.workspaceId,
        entityType: "budget",
        nextSeq: 1,
      });

      // Allocate first batch of 5
      let [counter] = await ctx.db
        .select()
        .from(schema.workspaceCounters)
        .where(
          and(
            eq(schema.workspaceCounters.workspaceId, ctx.workspaceId),
            eq(schema.workspaceCounters.entityType, "budget")
          )
        );

      const batch1Start = counter.nextSeq;
      const batch1End = batch1Start + 4; // 1-5

      await ctx.db
        .update(schema.workspaceCounters)
        .set({nextSeq: batch1End + 1})
        .where(eq(schema.workspaceCounters.id, counter.id));

      // Allocate second batch of 3
      [counter] = await ctx.db
        .select()
        .from(schema.workspaceCounters)
        .where(
          and(
            eq(schema.workspaceCounters.workspaceId, ctx.workspaceId),
            eq(schema.workspaceCounters.entityType, "budget")
          )
        );

      const batch2Start = counter.nextSeq;
      const batch2End = batch2Start + 2; // 6-8

      await ctx.db
        .update(schema.workspaceCounters)
        .set({nextSeq: batch2End + 1})
        .where(eq(schema.workspaceCounters.id, counter.id));

      // Verify no overlap
      expect(batch1End).toBeLessThan(batch2Start);
      expect(batch1Start).toBe(1);
      expect(batch1End).toBe(5);
      expect(batch2Start).toBe(6);
      expect(batch2End).toBe(8);
    });
  });

  describe("initialize counter", () => {
    it("should create counter with specified value", async () => {
      const initialValue = 100;

      await ctx.db.insert(schema.workspaceCounters).values({
        workspaceId: ctx.workspaceId,
        entityType: "payee",
        nextSeq: initialValue,
      });

      const [counter] = await ctx.db
        .select()
        .from(schema.workspaceCounters)
        .where(
          and(
            eq(schema.workspaceCounters.workspaceId, ctx.workspaceId),
            eq(schema.workspaceCounters.entityType, "payee")
          )
        );

      expect(counter.nextSeq).toBe(initialValue);
    });

    it("should update counter if already exists (using onConflictDoUpdate pattern)", async () => {
      // Create initial counter
      await ctx.db.insert(schema.workspaceCounters).values({
        workspaceId: ctx.workspaceId,
        entityType: "category",
        nextSeq: 10,
      });

      // Upsert with new value
      await ctx.db
        .insert(schema.workspaceCounters)
        .values({
          workspaceId: ctx.workspaceId,
          entityType: "category",
          nextSeq: 50,
        })
        .onConflictDoUpdate({
          target: [schema.workspaceCounters.workspaceId, schema.workspaceCounters.entityType],
          set: {
            nextSeq: 50,
          },
        });

      const [counter] = await ctx.db
        .select()
        .from(schema.workspaceCounters)
        .where(
          and(
            eq(schema.workspaceCounters.workspaceId, ctx.workspaceId),
            eq(schema.workspaceCounters.entityType, "category")
          )
        );

      expect(counter.nextSeq).toBe(50);
    });
  });

  describe("workspace isolation", () => {
    it("should maintain separate counters per workspace", async () => {
      // Create counters for both workspaces
      await ctx.db.insert(schema.workspaceCounters).values([
        {
          workspaceId: ctx.workspaceId,
          entityType: "transaction",
          nextSeq: 100,
        },
        {
          workspaceId: ctx.workspaceId2,
          entityType: "transaction",
          nextSeq: 5,
        },
      ]);

      // Get workspace 1 counter
      const [counter1] = await ctx.db
        .select()
        .from(schema.workspaceCounters)
        .where(
          and(
            eq(schema.workspaceCounters.workspaceId, ctx.workspaceId),
            eq(schema.workspaceCounters.entityType, "transaction")
          )
        );

      // Get workspace 2 counter
      const [counter2] = await ctx.db
        .select()
        .from(schema.workspaceCounters)
        .where(
          and(
            eq(schema.workspaceCounters.workspaceId, ctx.workspaceId2),
            eq(schema.workspaceCounters.entityType, "transaction")
          )
        );

      expect(counter1.nextSeq).toBe(100);
      expect(counter2.nextSeq).toBe(5);
    });

    it("should allow same entity type counters in different workspaces", async () => {
      // Both workspaces can have account counters
      await ctx.db.insert(schema.workspaceCounters).values([
        {
          workspaceId: ctx.workspaceId,
          entityType: "account",
          nextSeq: 1,
        },
        {
          workspaceId: ctx.workspaceId2,
          entityType: "account",
          nextSeq: 1,
        },
      ]);

      // Increment workspace 1
      await ctx.db
        .update(schema.workspaceCounters)
        .set({nextSeq: 10})
        .where(
          and(
            eq(schema.workspaceCounters.workspaceId, ctx.workspaceId),
            eq(schema.workspaceCounters.entityType, "account")
          )
        );

      // Workspace 2 should be unaffected
      const [counter2] = await ctx.db
        .select()
        .from(schema.workspaceCounters)
        .where(
          and(
            eq(schema.workspaceCounters.workspaceId, ctx.workspaceId2),
            eq(schema.workspaceCounters.entityType, "account")
          )
        );

      expect(counter2.nextSeq).toBe(1);
    });
  });

  describe("entity type isolation", () => {
    it("should maintain separate counters per entity type", async () => {
      // Create multiple entity type counters for same workspace
      await ctx.db.insert(schema.workspaceCounters).values([
        {
          workspaceId: ctx.workspaceId,
          entityType: "account",
          nextSeq: 5,
        },
        {
          workspaceId: ctx.workspaceId,
          entityType: "transaction",
          nextSeq: 1000,
        },
        {
          workspaceId: ctx.workspaceId,
          entityType: "category",
          nextSeq: 20,
        },
      ]);

      const counters = await ctx.db
        .select()
        .from(schema.workspaceCounters)
        .where(eq(schema.workspaceCounters.workspaceId, ctx.workspaceId));

      expect(counters).toHaveLength(3);

      const accountCounter = counters.find((c) => c.entityType === "account");
      const transactionCounter = counters.find((c) => c.entityType === "transaction");
      const categoryCounter = counters.find((c) => c.entityType === "category");

      expect(accountCounter?.nextSeq).toBe(5);
      expect(transactionCounter?.nextSeq).toBe(1000);
      expect(categoryCounter?.nextSeq).toBe(20);
    });

    it("should increment entity type counters independently", async () => {
      await ctx.db.insert(schema.workspaceCounters).values([
        {
          workspaceId: ctx.workspaceId,
          entityType: "budget",
          nextSeq: 1,
        },
        {
          workspaceId: ctx.workspaceId,
          entityType: "schedule",
          nextSeq: 1,
        },
      ]);

      // Increment budget counter many times
      await ctx.db
        .update(schema.workspaceCounters)
        .set({nextSeq: 50})
        .where(
          and(
            eq(schema.workspaceCounters.workspaceId, ctx.workspaceId),
            eq(schema.workspaceCounters.entityType, "budget")
          )
        );

      // Schedule counter should be unaffected
      const [scheduleCounter] = await ctx.db
        .select()
        .from(schema.workspaceCounters)
        .where(
          and(
            eq(schema.workspaceCounters.workspaceId, ctx.workspaceId),
            eq(schema.workspaceCounters.entityType, "schedule")
          )
        );

      expect(scheduleCounter.nextSeq).toBe(1);
    });
  });

  describe("get all counters", () => {
    it("should get all counters for workspace", async () => {
      await ctx.db.insert(schema.workspaceCounters).values([
        {workspaceId: ctx.workspaceId, entityType: "account", nextSeq: 5},
        {workspaceId: ctx.workspaceId, entityType: "transaction", nextSeq: 100},
        {workspaceId: ctx.workspaceId, entityType: "category", nextSeq: 10},
        {workspaceId: ctx.workspaceId2, entityType: "account", nextSeq: 1}, // Different workspace
      ]);

      const counters = await ctx.db
        .select()
        .from(schema.workspaceCounters)
        .where(eq(schema.workspaceCounters.workspaceId, ctx.workspaceId));

      expect(counters).toHaveLength(3);
      expect(counters.every((c) => c.workspaceId === ctx.workspaceId)).toBe(true);
    });
  });

  describe("relationships", () => {
    it("should join with workspace to get workspace details", async () => {
      await ctx.db.insert(schema.workspaceCounters).values({
        workspaceId: ctx.workspaceId,
        entityType: "transaction",
        nextSeq: 1,
      });

      const results = await ctx.db
        .select({
          counter: schema.workspaceCounters,
          workspace: {
            id: schema.workspaces.id,
            displayName: schema.workspaces.displayName,
            slug: schema.workspaces.slug,
          },
        })
        .from(schema.workspaceCounters)
        .innerJoin(schema.workspaces, eq(schema.workspaceCounters.workspaceId, schema.workspaces.id))
        .where(eq(schema.workspaceCounters.workspaceId, ctx.workspaceId));

      expect(results).toHaveLength(1);
      expect(results[0].workspace.displayName).toBe("Test Workspace 1");
    });
  });
});
