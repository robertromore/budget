/**
 * Floor-plan schema round-trip + soft-delete + cross-tenant isolation tests.
 *
 * These exercise the `home_floor_plan_node` table directly through Drizzle
 * rather than through the FloorPlanService — the service binds to the
 * module-level `$core/server/db` client, and the test infrastructure uses a
 * parallel bun-sqlite in-memory instance for fast isolation. Schema-level
 * tests run against the test instance and lock down every invariant we
 * rely on in the service code (soft-delete filter, composite index,
 * workspace scoping on upsert, orphan cleanup).
 *
 * Service-layer authorization tests (assert cross-workspace save throws,
 * etc.) live adjacent and use `createCaller` — see `floor-plan-routes.test.ts`
 * if/when the db-injection shim is added.
 */

import { and, desc, eq, inArray, isNull } from "drizzle-orm";
import { beforeEach, describe, expect, it } from "vitest";
import * as schema from "$core/schema";
import { homeFloorPlanNodes } from "$core/schema/home/home-floor-plan-nodes";
import { setupTestDb } from "../setup/test-db";

type TestDb = Awaited<ReturnType<typeof setupTestDb>>;

interface Ctx {
  db: TestDb;
  workspaceId: number;
  otherWorkspaceId: number;
  homeId: number;
  otherHomeId: number;
}

async function setupCtx(): Promise<Ctx> {
  const db = await setupTestDb();

  const [workspace] = await db
    .insert(schema.workspaces)
    .values({ displayName: "WS One", slug: `fp-ws-one-${Date.now()}` })
    .returning();
  const [otherWorkspace] = await db
    .insert(schema.workspaces)
    .values({ displayName: "WS Two", slug: `fp-ws-two-${Date.now()}` })
    .returning();

  const [home] = await db
    .insert(schema.homes)
    .values({ workspaceId: workspace.id, name: "Home One", slug: "home-one" })
    .returning();
  const [otherHome] = await db
    .insert(schema.homes)
    .values({ workspaceId: otherWorkspace.id, name: "Home Two", slug: "home-two" })
    .returning();

  return {
    db,
    workspaceId: workspace.id,
    otherWorkspaceId: otherWorkspace.id,
    homeId: home.id,
    otherHomeId: otherHome.id,
  };
}

type NodeOverrides = Partial<typeof homeFloorPlanNodes.$inferInsert>;

function makeNode(
  id: string,
  homeId: number,
  workspaceId: number,
  overrides: NodeOverrides = {}
): typeof homeFloorPlanNodes.$inferInsert {
  return {
    id,
    workspaceId,
    homeId,
    floorLevel: 0,
    nodeType: "wall",
    posX: 0,
    posY: 0,
    width: 100,
    height: 100,
    rotation: 0,
    wallHeight: 2.5,
    thickness: 0.15,
    elevation: 0,
    opacity: 1,
    ...overrides,
  };
}

describe("home_floor_plan_node — schema round trip", () => {
  let ctx: Ctx;

  beforeEach(async () => {
    ctx = await setupCtx();
  });

  it("inserts and reads back all mutable fields", async () => {
    await ctx.db.insert(homeFloorPlanNodes).values(
      makeNode("wall-1", ctx.homeId, ctx.workspaceId, {
        nodeType: "wall",
        posX: 10,
        posY: 20,
        x2: 110,
        y2: 20,
        width: 100,
        thickness: 0.2,
        wallHeight: 3.0,
        color: "#abcdef",
        name: "West wall",
      })
    );
    const [row] = await ctx.db
      .select()
      .from(homeFloorPlanNodes)
      .where(eq(homeFloorPlanNodes.id, "wall-1"));
    expect(row.posX).toBe(10);
    expect(row.x2).toBe(110);
    expect(row.wallHeight).toBe(3.0);
    expect(row.color).toBe("#abcdef");
    expect(row.name).toBe("West wall");
    expect(row.deletedAt).toBeNull();
  });

  it("scopes reads by workspace — rows from other workspace are invisible", async () => {
    await ctx.db.insert(homeFloorPlanNodes).values([
      makeNode("ours", ctx.homeId, ctx.workspaceId),
      makeNode("theirs", ctx.otherHomeId, ctx.otherWorkspaceId),
    ]);
    const rows = await ctx.db
      .select()
      .from(homeFloorPlanNodes)
      .where(
        and(
          eq(homeFloorPlanNodes.homeId, ctx.homeId),
          eq(homeFloorPlanNodes.workspaceId, ctx.workspaceId),
          isNull(homeFloorPlanNodes.deletedAt)
        )
      );
    expect(rows.map((r) => r.id)).toEqual(["ours"]);
  });
});

describe("home_floor_plan_node — soft delete", () => {
  let ctx: Ctx;

  beforeEach(async () => {
    ctx = await setupCtx();
  });

  it("tombstones the row instead of removing it", async () => {
    await ctx.db
      .insert(homeFloorPlanNodes)
      .values(makeNode("wall-1", ctx.homeId, ctx.workspaceId));

    await ctx.db
      .update(homeFloorPlanNodes)
      .set({ deletedAt: "2024-01-02T00:00:00Z" })
      .where(eq(homeFloorPlanNodes.id, "wall-1"));

    const visible = await ctx.db
      .select()
      .from(homeFloorPlanNodes)
      .where(isNull(homeFloorPlanNodes.deletedAt));
    expect(visible).toHaveLength(0);

    const onDisk = await ctx.db
      .select()
      .from(homeFloorPlanNodes)
      .where(eq(homeFloorPlanNodes.id, "wall-1"));
    expect(onDisk).toHaveLength(1);
    expect(onDisk[0].deletedAt).toBe("2024-01-02T00:00:00Z");
  });

  it("soft-delete filter skips tombstones even when the id is reused", async () => {
    await ctx.db
      .insert(homeFloorPlanNodes)
      .values(makeNode("reused", ctx.homeId, ctx.workspaceId, { posX: 1 }));
    await ctx.db
      .update(homeFloorPlanNodes)
      .set({ deletedAt: "2024-01-01T00:00:00Z" })
      .where(eq(homeFloorPlanNodes.id, "reused"));

    // Upsert a new version of the same id with a fresh posX + cleared tombstone.
    await ctx.db
      .insert(homeFloorPlanNodes)
      .values(makeNode("reused", ctx.homeId, ctx.workspaceId, { posX: 99 }))
      .onConflictDoUpdate({
        target: homeFloorPlanNodes.id,
        set: { posX: 99, deletedAt: null },
      });

    const rows = await ctx.db
      .select()
      .from(homeFloorPlanNodes)
      .where(isNull(homeFloorPlanNodes.deletedAt));
    expect(rows).toHaveLength(1);
    expect(rows[0].posX).toBe(99);
  });
});

describe("home_floor_plan_node — orphan cleanup + cascade", () => {
  let ctx: Ctx;

  beforeEach(async () => {
    ctx = await setupCtx();
  });

  // NB: the schema declares `parentId ... onDelete: "set null"`, but the
  // in-memory bun-sqlite instance used here does not enable `PRAGMA
  // foreign_keys = ON` by default. We rely on the explicit orphan-cleanup
  // query below to prune dangling openings after a wall is removed. If
  // this invariant ever changes we should re-add an FK-cascade test with
  // explicit PRAGMA setup.

  it("upsert with setWhere does not overwrite another workspace's colliding id", async () => {
    // The repository's upsert includes `setWhere: workspace_id = ?` as a
    // tenancy defense-in-depth. Verify it at the SQL level.
    await ctx.db
      .insert(homeFloorPlanNodes)
      .values(
        makeNode("collision", ctx.otherHomeId, ctx.otherWorkspaceId, {
          posX: 111,
          name: "victim",
        })
      );

    // Same id, same content shape, but different workspace tries to upsert.
    // Mimic the repository's setWhere guard directly.
    await ctx.db
      .insert(homeFloorPlanNodes)
      .values(makeNode("collision", ctx.homeId, ctx.workspaceId, { posX: 999 }))
      .onConflictDoUpdate({
        target: homeFloorPlanNodes.id,
        set: { posX: 999 },
        setWhere: eq(homeFloorPlanNodes.workspaceId, ctx.workspaceId),
      });

    // The victim row is untouched.
    const rows = await ctx.db
      .select()
      .from(homeFloorPlanNodes)
      .where(eq(homeFloorPlanNodes.id, "collision"));
    expect(rows).toHaveLength(1);
    expect(rows[0].workspaceId).toBe(ctx.otherWorkspaceId);
    expect(rows[0].posX).toBe(111);
    expect(rows[0].name).toBe("victim");
  });

  it("deletes orphan doors/windows in bulk via the query the repository uses", async () => {
    // Seed an orphan door + a still-parented window.
    await ctx.db.insert(homeFloorPlanNodes).values([
      makeNode("wall-kept", ctx.homeId, ctx.workspaceId, { nodeType: "wall" }),
      makeNode("window-kept", ctx.homeId, ctx.workspaceId, {
        nodeType: "window",
        parentId: "wall-kept",
      }),
      makeNode("door-orphan", ctx.homeId, ctx.workspaceId, {
        nodeType: "door",
        parentId: null,
      }),
    ]);

    await ctx.db
      .update(homeFloorPlanNodes)
      .set({ deletedAt: "2024-02-01T00:00:00Z" })
      .where(
        and(
          eq(homeFloorPlanNodes.homeId, ctx.homeId),
          eq(homeFloorPlanNodes.workspaceId, ctx.workspaceId),
          isNull(homeFloorPlanNodes.parentId),
          isNull(homeFloorPlanNodes.deletedAt),
          inArray(homeFloorPlanNodes.nodeType, ["door", "window"])
        )
      );

    const visible = await ctx.db
      .select()
      .from(homeFloorPlanNodes)
      .where(isNull(homeFloorPlanNodes.deletedAt))
      .orderBy(desc(homeFloorPlanNodes.id));
    expect(visible.map((n) => n.id).sort()).toEqual(["wall-kept", "window-kept"]);
  });
});
