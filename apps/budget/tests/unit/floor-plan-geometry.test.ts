/**
 * Unit tests for the pure geometry helpers extracted from `FloorPlanStore`.
 *
 * These tests exercise the module directly (no store instance) so the math
 * stays covered independent of the reactive shell that wraps it.
 */

import { describe, expect, it } from "vitest";
import type { FloorPlanNode } from "$core/schema/home/home-floor-plan-nodes";
import {
  findNearestWall,
  findOpeningPlacement,
  projectPointOnWall,
  resolveOpeningCenterAlongWall,
} from "$lib/utils/floor-plan-geometry";

function makeWall(overrides: Partial<FloorPlanNode>): FloorPlanNode {
  const now = new Date().toISOString();
  return {
    id: "wall-test",
    workspaceId: 1,
    homeId: 1,
    floorLevel: 0,
    parentId: null,
    nodeType: "wall",
    name: null,
    posX: 0, posY: 0, width: 0, height: 0, rotation: 0,
    x2: 200, y2: 0,
    wallHeight: 2.5, thickness: 0.15, elevation: 0,
    color: null, opacity: 1,
    linkedLocationId: null, linkedItemId: null, properties: null,
    createdAt: now, updatedAt: now, deletedAt: null,
    ...overrides,
  };
}

function makeOpening(overrides: Partial<FloorPlanNode>): FloorPlanNode {
  return makeWall({
    nodeType: "door",
    width: 40,
    height: 10,
    x2: null,
    y2: null,
    ...overrides,
  });
}

describe("projectPointOnWall", () => {
  it("projects to the nearest point on a horizontal wall", () => {
    const wall = makeWall({ x2: 200, y2: 0 });
    const result = projectPointOnWall(wall, 100, 10);
    expect(result).not.toBeNull();
    expect(result?.projectedX).toBe(100);
    expect(result?.projectedY).toBe(0);
    expect(result?.distance).toBe(10);
    expect(result?.along).toBe(100);
  });

  it("clamps the projection to the wall endpoints", () => {
    const wall = makeWall({ x2: 200, y2: 0 });
    expect(projectPointOnWall(wall, 300, 0)?.projectedX).toBe(200);
    expect(projectPointOnWall(wall, -50, 0)?.projectedX).toBe(0);
  });

  it("returns null for zero-length walls", () => {
    const wall = makeWall({ x2: 0, y2: 0 });
    expect(projectPointOnWall(wall, 10, 10)).toBeNull();
  });

  it("returns null for non-wall nodes", () => {
    const door = makeOpening({ nodeType: "door" });
    expect(projectPointOnWall(door, 10, 10)).toBeNull();
  });
});

describe("resolveOpeningCenterAlongWall", () => {
  it("returns the desired along-centre when no other openings block", () => {
    const wall = makeWall({ x2: 200, y2: 0 });
    const projection = projectPointOnWall(wall, 100, 0)!;
    const center = resolveOpeningCenterAlongWall(projection, 40, []);
    expect(center).toBe(100);
  });

  it("returns null when the wall is shorter than the opening", () => {
    const wall = makeWall({ x2: 20, y2: 0 });
    const projection = projectPointOnWall(wall, 5, 0)!;
    expect(resolveOpeningCenterAlongWall(projection, 40, [])).toBeNull();
  });

  it("avoids existing openings on the wall", () => {
    const wall = makeWall({ x2: 200, y2: 0 });
    const projection = projectPointOnWall(wall, 100, 0)!;
    const existing = makeOpening({
      id: "door-1",
      parentId: wall.id,
      posX: 100,
      posY: 0,
      width: 40,
    });
    // Desired is 100, but an existing opening centred at 100 blocks it.
    const center = resolveOpeningCenterAlongWall(projection, 40, [existing]);
    expect(center).not.toBeNull();
    expect(Math.abs(center! - 100)).toBeGreaterThan(40);
  });

  it("skips the excluded opening id (used during drag-reparent)", () => {
    const wall = makeWall({ x2: 200, y2: 0 });
    const projection = projectPointOnWall(wall, 100, 0)!;
    const self = makeOpening({
      id: "self",
      parentId: wall.id,
      posX: 100,
      posY: 0,
      width: 40,
    });
    const center = resolveOpeningCenterAlongWall(projection, 40, [self], "self");
    expect(center).toBe(100);
  });

  it("returns null when every wall slot is saturated by existing openings", () => {
    // Two existing openings pin the wall such that no legal centre for a
    // new opening exists. Exercises the "allowed intervals empty" branch.
    const wall = makeWall({ x2: 200, y2: 0 });
    const projection = projectPointOnWall(wall, 100, 0)!;
    const a = makeOpening({ id: "a", parentId: wall.id, posX: 40, posY: 0, width: 80 });
    const b = makeOpening({ id: "b", parentId: wall.id, posX: 160, posY: 0, width: 80 });
    expect(resolveOpeningCenterAlongWall(projection, 80, [a, b])).toBeNull();
  });

  it("places a new opening in the gap between two existing openings when it fits", () => {
    // Wall length 400. Two doors of width 40 centred at 80 and 320 leave
    // a gap centred at 200. A 40-wide opening with desired=200 must fit
    // there without being pushed to an endpoint.
    const wall = makeWall({ x2: 400, y2: 0 });
    const projection = projectPointOnWall(wall, 200, 0)!;
    const a = makeOpening({ id: "a", parentId: wall.id, posX: 80, posY: 0, width: 40 });
    const b = makeOpening({ id: "b", parentId: wall.id, posX: 320, posY: 0, width: 40 });
    const center = resolveOpeningCenterAlongWall(projection, 40, [a, b]);
    expect(center).toBe(200);
  });
});

describe("findOpeningPlacement", () => {
  it("places on the closest wall within maxDistance", () => {
    const near = makeWall({ id: "near", posX: 0, posY: 0, x2: 200, y2: 0 });
    const far = makeWall({ id: "far", posX: 0, posY: 500, x2: 200, y2: 500 });
    const placement = findOpeningPlacement(
      [near, far],
      [],
      100,
      10,
      40
    );
    expect(placement?.wallId).toBe("near");
    expect(placement?.posX).toBe(100);
    expect(placement?.rotation).toBe(0);
  });

  it("returns null when no wall is in range", () => {
    const wall = makeWall({ x2: 200, y2: 0 });
    expect(findOpeningPlacement([wall], [], 500, 500, 40, 30)).toBeNull();
  });

  it("derives rotation from the wall orientation", () => {
    const vertical = makeWall({ id: "v", posX: 0, posY: 0, x2: 0, y2: 200 });
    const placement = findOpeningPlacement([vertical], [], 10, 100, 40);
    expect(placement?.rotation).toBeCloseTo(90);
  });
});

describe("findNearestWall", () => {
  it("returns the closest wall within maxDistance", () => {
    const a = makeWall({ id: "a", posX: 0, posY: 0, x2: 200, y2: 0 });
    const b = makeWall({ id: "b", posX: 0, posY: 200, x2: 200, y2: 200 });
    const snap = findNearestWall([a, b], 100, 10);
    expect(snap?.wallId).toBe("a");
  });

  it("returns null when nothing is within range", () => {
    const wall = makeWall({ x2: 200, y2: 0 });
    expect(findNearestWall([wall], 500, 500, 30)).toBeNull();
  });
});
