import { afterEach, beforeEach, describe, expect, test } from "vitest";
import { eq } from "drizzle-orm";
import { categories, payees, users, workspaceMembers, workspaces } from "$core/schema";
import { createCaller } from "../../../src/lib/trpc/router";
import { clearTestDb, setupTestDb } from "../setup/test-db";

describe("Similarity cache refresh", () => {
  let db: Awaited<ReturnType<typeof setupTestDb>>;
  let caller: ReturnType<typeof createCaller>;
  let workspaceId: number;

  beforeEach(async () => {
    db = await setupTestDb();

    const testUserId = `similarity-cache-user-${Date.now()}`;
    await db.insert(users).values({
      id: testUserId,
      name: "Similarity Cache User",
      displayName: "Similarity Cache User",
      email: `${testUserId}@example.com`,
    });

    const [workspace] = await db
      .insert(workspaces)
      .values({
        displayName: "Similarity Cache Workspace",
        slug: `similarity-cache-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
        ownerId: testUserId,
      })
      .returning();
    workspaceId = workspace.id;

    await db.insert(workspaceMembers).values({
      workspaceId,
      userId: testUserId,
      role: "owner",
      isDefault: true,
    });

    caller = createCaller({
      db: db as any,
      userId: testUserId,
      sessionId: "similarity-cache-session",
      workspaceId,
      request: { headers: new Headers(), getCookie: () => undefined, setCookie: () => {} } as any,
      isTest: true,
    });
  });

  afterEach(async () => {
    if (db) {
      await clearTestDb(db);
    }
  });

  test("canonicalizer caches refresh automatically when payees change", async () => {
    await db.insert(payees).values({
      workspaceId,
      name: "Acme Service",
      slug: `acme-service-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
    });

    const initialGroups = await caller.similarityRoutes.getCanonicalGroups();
    const initialVariants = initialGroups.groups.flatMap((group) => group.variants);
    expect(initialVariants).toContain("Acme Service");
    expect(initialVariants).not.toContain("Acme Services");

    await db.insert(payees).values({
      workspaceId,
      name: "Acme Services",
      slug: `acme-services-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
    });

    const refreshedGroups = await caller.similarityRoutes.getCanonicalGroups();
    const variants = refreshedGroups.groups.flatMap((group) => group.variants);
    expect(variants).toContain("Acme Service");
    expect(variants).toContain("Acme Services");
  });

  test("canonicalizer excludes soft-deleted payees after cache refresh", async () => {
    const [, , deletedPayee] = await db
      .insert(payees)
      .values([
        {
          workspaceId,
          name: "Live Merchant",
          slug: `live-merchant-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
        },
        {
          workspaceId,
          name: "Baseline Merchant",
          slug: `baseline-merchant-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
        },
        {
          workspaceId,
          name: "Ghost Merchant",
          slug: `ghost-merchant-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
        },
      ])
      .returning();

    const beforeDelete = await caller.similarityRoutes.getCanonicalGroups();
    const beforeVariants = beforeDelete.groups.flatMap((group) => group.variants);
    expect(beforeVariants).toContain("Ghost Merchant");

    await db
      .update(payees)
      .set({ deletedAt: new Date().toISOString() })
      .where(eq(payees.id, deletedPayee.id));

    const afterDelete = await caller.similarityRoutes.getCanonicalGroups();
    const afterVariants = afterDelete.groups.flatMap((group) => group.variants);

    expect(afterVariants).toContain("Live Merchant");
    expect(afterVariants).not.toContain("Ghost Merchant");
  });

  test("similar category matches exclude soft-deleted categories", async () => {
    const [visibleCategory, deletedCategory] = await db
      .insert(categories)
      .values([
        {
          workspaceId,
          name: "Dining Out Active",
          slug: `dining-out-active-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
        },
        {
          workspaceId,
          name: "Dining Out Legacy",
          slug: `dining-out-legacy-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
        },
      ])
      .returning();

    await db
      .update(categories)
      .set({ deletedAt: new Date().toISOString() })
      .where(eq(categories.id, deletedCategory.id));

    const results = await caller.similarityRoutes.findSimilarCategories({
      query: "dining out",
      limit: 10,
    });
    const names = results.results.map((entry) => entry.categoryName);

    expect(names).toContain(visibleCategory.name);
    expect(names).not.toContain(deletedCategory.name);
  });
});
