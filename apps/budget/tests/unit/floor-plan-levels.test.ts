/**
 * Unit tests for the pure level-tree helpers.
 */

import { describe, expect, it } from "vitest";
import type { FloorPlanNode } from "$core/schema/home/home-floor-plan-nodes";
import {
  buildLevelNameSet,
  collectLevelSubtree,
  getBuildingLevels,
  makeUniqueLevelName,
  nextNumberedLevelName,
  sortLevels,
} from "$lib/utils/floor-plan-levels";

function node(overrides: Partial<FloorPlanNode> & Pick<FloorPlanNode, "id">): FloorPlanNode {
  const now = new Date().toISOString();
  return {
    workspaceId: 1,
    homeId: 1,
    floorLevel: 0,
    parentId: null,
    nodeType: "level",
    name: null,
    posX: 0, posY: 0, width: 0, height: 0, rotation: 0,
    x2: null, y2: null,
    wallHeight: 2.5, thickness: 0.15, elevation: 0,
    color: null, opacity: 1,
    linkedLocationId: null, linkedItemId: null, properties: null,
    createdAt: now, updatedAt: now, deletedAt: null,
    ...overrides,
  } as FloorPlanNode;
}

describe("sortLevels", () => {
  it("orders levels by elevation ascending", () => {
    const levels = [
      node({ id: "top", elevation: 6 }),
      node({ id: "mid", elevation: 3 }),
      node({ id: "ground", elevation: 0 }),
    ];
    expect(sortLevels(levels).map((l) => l.id)).toEqual(["ground", "mid", "top"]);
  });

  it("falls back to name then id when elevations match", () => {
    const levels = [
      node({ id: "b", elevation: 0, name: "Beta" }),
      node({ id: "a", elevation: 0, name: "Alpha" }),
      node({ id: "c", elevation: 0, name: "Alpha" }),
    ];
    expect(sortLevels(levels).map((l) => l.id)).toEqual(["a", "c", "b"]);
  });
});

describe("getBuildingLevels", () => {
  it("returns only level nodes whose parent matches", () => {
    const nodes = [
      node({ id: "L1", parentId: "B1" }),
      node({ id: "L2", parentId: "B1" }),
      node({ id: "L3", parentId: "B2" }),
      node({ id: "room", parentId: "B1", nodeType: "room" }),
    ];
    expect(getBuildingLevels(nodes, "B1").map((n) => n.id).sort()).toEqual(["L1", "L2"]);
  });
});

describe("buildLevelNameSet / makeUniqueLevelName", () => {
  it("returns the base name when no collision", () => {
    expect(makeUniqueLevelName(new Set(), "Ground")).toBe("Ground");
  });

  it("appends an incrementing suffix on collision", () => {
    const names = new Set(["ground", "ground 2"]);
    expect(makeUniqueLevelName(names, "Ground")).toBe("Ground 3");
  });

  it("respects excludeId when building the name set", () => {
    const levels = [
      node({ id: "self", parentId: "B", name: "Ground" }),
      node({ id: "other", parentId: "B", name: "Attic" }),
    ];
    const names = buildLevelNameSet(levels, "self");
    expect(names.has("ground")).toBe(false);
    expect(names.has("attic")).toBe(true);
  });
});

describe("nextNumberedLevelName", () => {
  it("starts at Level 1 for an empty building", () => {
    expect(nextNumberedLevelName([])).toBe("Level 1");
  });

  it("continues the existing Level N sequence", () => {
    const levels = [
      node({ id: "L1", parentId: "B", name: "Level 1" }),
      node({ id: "L2", parentId: "B", name: "Level 2" }),
      node({ id: "Lother", parentId: "B", name: "Mezzanine" }),
    ];
    expect(nextNumberedLevelName(levels)).toBe("Level 3");
  });
});

describe("collectLevelSubtree", () => {
  it("returns the level plus its descendants, level-first", () => {
    const nodes = [
      node({ id: "L", parentId: "B" }),
      node({ id: "R1", parentId: "L", nodeType: "room" }),
      node({ id: "R2", parentId: "L", nodeType: "room" }),
      node({ id: "W1", parentId: "R1", nodeType: "wall" }),
      node({ id: "outside", parentId: "B", nodeType: "room" }),
    ];
    const byId: Record<string, FloorPlanNode> = {};
    for (const n of nodes) byId[n.id] = n;
    const subtree = collectLevelSubtree(nodes, byId, "L");
    expect(subtree.map((n) => n.id)).toEqual(["L", "R1", "W1", "R2"]);
    expect(subtree.find((n) => n.id === "outside")).toBeUndefined();
  });

  it("returns empty for non-level ids", () => {
    const nodes = [node({ id: "R1", nodeType: "room" })];
    const byId = { R1: nodes[0] };
    expect(collectLevelSubtree(nodes, byId, "R1")).toEqual([]);
  });
});
