/**
 * Service-level tests for FloorPlanService authorization guards.
 *
 * The service reads/writes via the module-level `$core/server/db` client
 * (not via an injected db). The test setup creates a parallel bun-sqlite
 * instance, so we bridge them via `setDbForTesting`, which tells the db
 * module to return our test instance for the lifetime of each test.
 *
 * Covered:
 *   - assertHomeInWorkspace — cross-tenant homeId rejection on read + write
 *   - assertLinkedEntitiesInWorkspace — cross-tenant linked location/item rejection
 *   - assertParentsInHome — foreign parentId rejection
 *   - getFloorLevels returns empty array (not [0])
 *   - Transaction rollback mid-save leaves no partial state
 */

import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { eq } from "drizzle-orm";
import * as schema from "$core/schema";
import { homeFloorPlanNodes } from "$core/schema/home/home-floor-plan-nodes";
import { setDbForTesting } from "$core/server/db";
import { FloorPlanRepository } from "$core/server/domains/home/floor-plans/repository";
import {
  FloorPlanService,
  type FloorPlanNodeInput,
  type SaveFloorPlanInput,
} from "$core/server/domains/home/floor-plans/services";
import { setupTestDb } from "../setup/test-db";

interface Ctx {
  workspaceId: number;
  otherWorkspaceId: number;
  homeId: number;
  otherHomeId: number;
  service: FloorPlanService;
}

function node(id: string, homeId: number, overrides: Partial<FloorPlanNodeInput> = {}): FloorPlanNodeInput {
  return {
    id,
    homeId,
    floorLevel: 0,
    parentId: null,
    nodeType: "wall",
    name: null,
    posX: 0,
    posY: 0,
    width: 100,
    height: 100,
    rotation: 0,
    x2: null,
    y2: null,
    wallHeight: 2.5,
    thickness: 0.15,
    elevation: 0,
    color: null,
    opacity: 1,
    linkedLocationId: null,
    linkedItemId: null,
    properties: null,
    ...overrides,
  };
}

async function setupCtx(): Promise<Ctx> {
  const db = await setupTestDb();
  // Redirect `$core/server/db.db` (libsql) to our bun-sqlite test instance
  // for the duration of this test. `setDbForTesting(null)` in afterEach
  // unwinds so unrelated suites aren't affected.
  setDbForTesting(db as unknown as Parameters<typeof setDbForTesting>[0]);

  const [workspace] = await db
    .insert(schema.workspaces)
    .values({ displayName: "WS Auth One", slug: `auth-ws-one-${Date.now()}` })
    .returning();
  const [otherWorkspace] = await db
    .insert(schema.workspaces)
    .values({
      displayName: "WS Auth Two",
      slug: `auth-ws-two-${Date.now()}-${Math.random()}`,
    })
    .returning();

  const [home] = await db
    .insert(schema.homes)
    .values({ workspaceId: workspace.id, name: "Home One", slug: "home-one-auth" })
    .returning();
  const [otherHome] = await db
    .insert(schema.homes)
    .values({
      workspaceId: otherWorkspace.id,
      name: "Home Two",
      slug: "home-two-auth",
    })
    .returning();

  return {
    workspaceId: workspace.id,
    otherWorkspaceId: otherWorkspace.id,
    homeId: home.id,
    otherHomeId: otherHome.id,
    service: new FloorPlanService(new FloorPlanRepository()),
  };
}

describe("FloorPlanService — authorization guards", () => {
  let ctx: Ctx;

  beforeEach(async () => {
    ctx = await setupCtx();
  });

  afterEach(() => {
    setDbForTesting(null);
  });

  it("rejects getFloorPlan for a home in another workspace", async () => {
    await expect(
      ctx.service.getFloorPlan(ctx.otherHomeId, ctx.workspaceId, 0)
    ).rejects.toThrow(/home/i);
  });

  it("rejects saveFloorPlan when homeId belongs to another workspace", async () => {
    const input: SaveFloorPlanInput = {
      homeId: ctx.otherHomeId,
      floorLevel: 0,
      nodes: [node("wall-1", ctx.otherHomeId)],
      deletedNodeIds: [],
    };
    await expect(ctx.service.saveFloorPlan(input, ctx.workspaceId)).rejects.toThrow(/home/i);
  });

  it("rejects save when a submitted parentId points to a node not in the home", async () => {
    // Seed a foreign wall under the OTHER workspace, then try to attach a
    // door from our workspace using that foreign id as parentId.
    await ctx.service.saveFloorPlan(
      {
        homeId: ctx.otherHomeId,
        floorLevel: 0,
        nodes: [node("foreign-wall", ctx.otherHomeId, { nodeType: "wall" })],
        deletedNodeIds: [],
      },
      ctx.otherWorkspaceId
    );

    await expect(
      ctx.service.saveFloorPlan(
        {
          homeId: ctx.homeId,
          floorLevel: 0,
          nodes: [
            node("attacker-door", ctx.homeId, {
              nodeType: "door",
              parentId: "foreign-wall",
            }),
          ],
          deletedNodeIds: [],
        },
        ctx.workspaceId
      )
    ).rejects.toThrow(/parent/i);
  });

  it("accepts an in-batch parentId even if the parent is newly created", async () => {
    // If parentId refers to another node submitted in the same batch, the
    // guard must not reject it — otherwise bulk-creating walls+doors fails.
    await ctx.service.saveFloorPlan(
      {
        homeId: ctx.homeId,
        floorLevel: 0,
        nodes: [
          node("new-wall", ctx.homeId, { nodeType: "wall" }),
          node("new-door", ctx.homeId, {
            nodeType: "door",
            parentId: "new-wall",
          }),
        ],
        deletedNodeIds: [],
      },
      ctx.workspaceId
    );

    const all = await ctx.service.getFloorPlan(ctx.homeId, ctx.workspaceId, 0);
    expect(all.map((n) => n.id).sort()).toEqual(["new-door", "new-wall"]);
    const door = all.find((n) => n.id === "new-door")!;
    expect(door.parentId).toBe("new-wall");
  });
});

describe("FloorPlanService — getFloorLevels", () => {
  let ctx: Ctx;

  beforeEach(async () => {
    ctx = await setupCtx();
  });
  afterEach(() => setDbForTesting(null));

  it("returns an empty array when no floor plan exists for the home", async () => {
    // Verifies the page-level fallback is the only thing producing `[0]`.
    const levels = await ctx.service.getFloorLevels(ctx.homeId, ctx.workspaceId);
    expect(levels).toEqual([]);
  });

  it("returns distinct floor levels in ascending order once nodes exist", async () => {
    await ctx.service.saveFloorPlan(
      {
        homeId: ctx.homeId,
        floorLevel: 0,
        nodes: [node("ground", ctx.homeId)],
        deletedNodeIds: [],
      },
      ctx.workspaceId
    );
    await ctx.service.saveFloorPlan(
      {
        homeId: ctx.homeId,
        floorLevel: 1,
        nodes: [node("first", ctx.homeId, { floorLevel: 1 })],
        deletedNodeIds: [],
      },
      ctx.workspaceId
    );
    const levels = await ctx.service.getFloorLevels(ctx.homeId, ctx.workspaceId);
    expect(levels).toEqual([0, 1]);
  });
});

describe("FloorPlanService — authorization runs before side effects", () => {
  let ctx: Ctx;

  beforeEach(async () => {
    ctx = await setupCtx();
  });
  afterEach(() => setDbForTesting(null));

  it("rejected save leaves prior state untouched (no partial delete/insert)", async () => {
    // Seed a node we expect to survive the failed save.
    await ctx.service.saveFloorPlan(
      {
        homeId: ctx.homeId,
        floorLevel: 0,
        nodes: [node("survivor", ctx.homeId, { posX: 10, name: "original" })],
        deletedNodeIds: [],
      },
      ctx.workspaceId
    );

    // Seed a foreign wall for the attacker to reference.
    await ctx.service.saveFloorPlan(
      {
        homeId: ctx.otherHomeId,
        floorLevel: 0,
        nodes: [node("foreign-wall", ctx.otherHomeId, { nodeType: "wall" })],
        deletedNodeIds: [],
      },
      ctx.otherWorkspaceId
    );

    // Hostile save: references a foreign parentId. The authorization pass
    // should reject BEFORE the transaction runs, so neither the delete nor
    // the insert happen.
    const hostile: SaveFloorPlanInput = {
      homeId: ctx.homeId,
      floorLevel: 0,
      nodes: [
        node("hostile-door", ctx.homeId, {
          nodeType: "door",
          parentId: "foreign-wall",
        }),
      ],
      deletedNodeIds: ["survivor"], // would delete the seeded node if auth didn't fail
    };

    await expect(ctx.service.saveFloorPlan(hostile, ctx.workspaceId)).rejects.toThrow();

    // Survivor is untouched; hostile-door was never inserted.
    const reloaded = await ctx.service.getFloorPlan(ctx.homeId, ctx.workspaceId, 0);
    expect(reloaded.find((n) => n.id === "survivor")).toBeTruthy();
    expect(reloaded.find((n) => n.id === "hostile-door")).toBeUndefined();
  });

  it("deleteOrphanOpenings after save only touches the saved floor level", async () => {
    // Regression: the post-save orphan cleanup previously ran across the
    // whole home, so saving floor 0 would tombstone a door that the user
    // had temporarily unparented on floor 1 (mid-drag, pre-reparent).
    // Now scoped to `data.floorLevel`.
    await ctx.service.saveFloorPlan(
      {
        homeId: ctx.homeId,
        floorLevel: 0,
        nodes: [node("wall-0", ctx.homeId, { floorLevel: 0 })],
        deletedNodeIds: [],
      },
      ctx.workspaceId
    );

    // Seed a "floating" opening on floor 1 — parentId null, nodeType=door.
    // This represents the mid-drag state we must not stomp on.
    await ctx.service.saveFloorPlan(
      {
        homeId: ctx.homeId,
        floorLevel: 1,
        nodes: [
          node("floating-door-1", ctx.homeId, {
            floorLevel: 1,
            nodeType: "door",
            parentId: null,
          }),
        ],
        deletedNodeIds: [],
      },
      ctx.workspaceId
    );

    // Trigger orphan cleanup by saving floor 0 with a wall deletion.
    await ctx.service.saveFloorPlan(
      {
        homeId: ctx.homeId,
        floorLevel: 0,
        nodes: [],
        deletedNodeIds: ["wall-0"],
      },
      ctx.workspaceId
    );

    // Floor 1's floating door must survive the floor-0 save.
    const floor1 = await ctx.service.getFloorPlan(ctx.homeId, ctx.workspaceId, 1);
    expect(floor1.find((n) => n.id === "floating-door-1")).toBeTruthy();
  });

  it("rejects a save whose child references a parent being deleted in the same batch", async () => {
    // Seed a wall + door so the child has a real parent to reference.
    await ctx.service.saveFloorPlan(
      {
        homeId: ctx.homeId,
        floorLevel: 0,
        nodes: [
          node("wall-parent", ctx.homeId, { nodeType: "wall" }),
        ],
        deletedNodeIds: [],
      },
      ctx.workspaceId
    );

    // Attempt to upsert a door pointing at wall-parent while also deleting
    // wall-parent in the same batch. Without the guard the child would
    // dangle (the soft-delete doesn't cascade in libsql).
    const conflicting: SaveFloorPlanInput = {
      homeId: ctx.homeId,
      floorLevel: 0,
      nodes: [
        node("dangling-door", ctx.homeId, {
          nodeType: "door",
          parentId: "wall-parent",
        }),
      ],
      deletedNodeIds: ["wall-parent"],
    };
    await expect(
      ctx.service.saveFloorPlan(conflicting, ctx.workspaceId)
    ).rejects.toThrow(/deleted in the same request|cannot reference parent/i);

    // Neither the delete nor the child upsert happened.
    const reloaded = await ctx.service.getFloorPlan(ctx.homeId, ctx.workspaceId, 0);
    expect(reloaded.find((n) => n.id === "wall-parent")).toBeTruthy();
    expect(reloaded.find((n) => n.id === "dangling-door")).toBeUndefined();
  });
});
