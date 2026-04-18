import { readFileSync } from "node:fs";
import path from "node:path";
import { and, eq, isNull, sql } from "drizzle-orm";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import * as schema from "$core/schema";
import { homeFloorPlanNodes } from "$core/schema/home/home-floor-plan-nodes";
import { setDbForTesting } from "$core/server/db";
import { FloorPlanRepository } from "$core/server/domains/home/floor-plans/repository";
import { HomeRepository } from "$core/server/domains/home/homes/repository";
import { HomeService } from "$core/server/domains/home/homes/services";
import { resolveMigrationsFolder, setupTestDb } from "../setup/test-db";

describe("HomeService — default floor-plan hierarchy", () => {
  let db: Awaited<ReturnType<typeof setupTestDb>>;
  let workspaceId = 0;

  beforeEach(async () => {
    db = await setupTestDb();
    setDbForTesting(db as unknown as Parameters<typeof setDbForTesting>[0]);

    const [workspace] = await db
      .insert(schema.workspaces)
      .values({
        displayName: "Homes Workspace",
        slug: `homes-workspace-${Date.now()}-${Math.random()}`,
      })
      .returning();
    workspaceId = workspace.id;
  });

  afterEach(() => {
    setDbForTesting(null);
  });

  it("creates default site/building/level nodes for a new home", async () => {
    const service = new HomeService(new HomeRepository(), new FloorPlanRepository());
    const home = await service.createHome({ name: "Defaulted Home" }, workspaceId);

    const nodes = await db
      .select()
      .from(homeFloorPlanNodes)
      .where(
        and(
          eq(homeFloorPlanNodes.workspaceId, workspaceId),
          eq(homeFloorPlanNodes.homeId, home.id),
          isNull(homeFloorPlanNodes.deletedAt)
        )
      );

    expect(nodes).toHaveLength(3);

    const site = nodes.find((n) => n.nodeType === "site");
    const building = nodes.find((n) => n.nodeType === "building");
    const level = nodes.find((n) => n.nodeType === "level");

    expect(site).toBeTruthy();
    expect(building).toBeTruthy();
    expect(level).toBeTruthy();

    expect(site?.parentId).toBeNull();
    expect(building?.parentId).toBe(site?.id);
    expect(level?.parentId).toBe(building?.id);

    expect(site?.floorLevel).toBe(0);
    expect(building?.floorLevel).toBe(0);
    expect(level?.floorLevel).toBe(0);

    expect(site?.width).toBeGreaterThan(0);
    expect(site?.height).toBeGreaterThan(0);
    expect(building?.width).toBeGreaterThan(0);
    expect(building?.height).toBeGreaterThan(0);
    expect(level?.width).toBeGreaterThan(0);
    expect(level?.height).toBeGreaterThan(0);
  });

  it("rolls back home creation when default floor-plan seeding fails", async () => {
    const failingFloorPlanRepo = {
      async upsertManyTx(): Promise<void> {
        throw new Error("seed failed");
      },
      async deleteAllByHome(): Promise<void> {},
    } as unknown as FloorPlanRepository;

    const service = new HomeService(new HomeRepository(), failingFloorPlanRepo);

    await expect(
      service.createHome({ name: "Should Roll Back" }, workspaceId)
    ).rejects.toThrow("seed failed");

    const homesInWorkspace = await db
      .select()
      .from(schema.homes)
      .where(and(eq(schema.homes.workspaceId, workspaceId), isNull(schema.homes.deletedAt)));

    expect(homesInWorkspace).toHaveLength(0);
  });

  it("backfill migration seeds existing homes with no floor-plan nodes", async () => {
    const [home] = await db
      .insert(schema.homes)
      .values({
        workspaceId,
        name: "Legacy Home",
        slug: `legacy-home-${Date.now()}-${Math.random()}`,
      })
      .returning();

    const migrationPath = path.join(
      resolveMigrationsFolder(),
      "0016_mellow_floor_plan_defaults.sql"
    );
    const migrationSql = readFileSync(migrationPath, "utf8");
    await db.run(sql.raw(migrationSql));

    const nodesAfterFirstRun = await db
      .select()
      .from(homeFloorPlanNodes)
      .where(
        and(
          eq(homeFloorPlanNodes.workspaceId, workspaceId),
          eq(homeFloorPlanNodes.homeId, home.id),
          isNull(homeFloorPlanNodes.deletedAt)
        )
      );

    expect(nodesAfterFirstRun).toHaveLength(3);
    expect(nodesAfterFirstRun.some((n) => n.nodeType === "site")).toBe(true);
    expect(nodesAfterFirstRun.some((n) => n.nodeType === "building")).toBe(true);
    expect(nodesAfterFirstRun.some((n) => n.nodeType === "level")).toBe(true);

    // Re-running the one-time backfill should not duplicate rows.
    await db.run(sql.raw(migrationSql));

    const nodesAfterSecondRun = await db
      .select()
      .from(homeFloorPlanNodes)
      .where(
        and(
          eq(homeFloorPlanNodes.workspaceId, workspaceId),
          eq(homeFloorPlanNodes.homeId, home.id),
          isNull(homeFloorPlanNodes.deletedAt)
        )
      );

    expect(nodesAfterSecondRun).toHaveLength(3);
  });
});
