import { afterEach, beforeEach, describe, expect, test } from "vitest";
import { payees, users, workspaceMembers, workspaces } from "$lib/schema";
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
      event: {} as any,
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
});
