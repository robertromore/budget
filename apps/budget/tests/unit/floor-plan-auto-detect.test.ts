/**
 * Unit tests for the pure auto-detect module.
 *
 * These cover the topology primitives (canonicalization, area, signature
 * parse) plus a handful of full-pipeline cases (square room, branching
 * wall graph, zone from fences) that used to be reachable only through
 * the store's `autoDetectSpacesAndZones`.
 */

import { describe, expect, it } from "vitest";
import type { FloorPlanNode } from "$core/schema/home/home-floor-plan-nodes";
import {
  canonicalizeCycleKeys,
  detectAutoDetectedRegions,
  getAutoDetectedSignature,
  makeAutoDetectedProperties,
  polygonArea,
  toBoundaryPointKey,
  toParentGroupKey,
} from "$lib/utils/floor-plan-auto-detect";

function makeWallLike(overrides: Partial<FloorPlanNode> & Pick<FloorPlanNode, "id" | "posX" | "posY" | "x2" | "y2">): FloorPlanNode {
  const now = new Date().toISOString();
  return {
    workspaceId: 1,
    homeId: 1,
    floorLevel: 0,
    parentId: null,
    nodeType: "wall",
    name: null,
    width: 0, height: 0, rotation: 0,
    wallHeight: 2.5, thickness: 0.15, elevation: 0,
    color: null, opacity: 1,
    linkedLocationId: null, linkedItemId: null, properties: null,
    createdAt: now, updatedAt: now, deletedAt: null,
    ...overrides,
  } as FloorPlanNode;
}

describe("toParentGroupKey", () => {
  it("uses a sentinel for root", () => {
    expect(toParentGroupKey(null)).toBe("__root__");
  });

  it("preserves non-null parent ids", () => {
    expect(toParentGroupKey("level-1")).toBe("level-1");
  });
});

describe("toBoundaryPointKey", () => {
  it("quantizes coordinates by tolerance", () => {
    expect(toBoundaryPointKey(100, 200, 10)).toBe("10:20");
    expect(toBoundaryPointKey(103, 207, 10)).toBe("10:21");
  });

  it("merges nearby points within tolerance", () => {
    const a = toBoundaryPointKey(100.4, 100, 1);
    const b = toBoundaryPointKey(99.9, 100, 1);
    expect(a).toBe(b);
  });
});

describe("canonicalizeCycleKeys", () => {
  it("returns the same key for rotated traversals", () => {
    const forward = canonicalizeCycleKeys(["a", "b", "c", "d"]);
    const rotated = canonicalizeCycleKeys(["c", "d", "a", "b"]);
    expect(forward).toBe(rotated);
  });

  it("returns the same key for reversed traversals", () => {
    const forward = canonicalizeCycleKeys(["a", "b", "c", "d"]);
    const reversed = canonicalizeCycleKeys(["d", "c", "b", "a"]);
    expect(forward).toBe(reversed);
  });

  it("returns empty string for empty input", () => {
    expect(canonicalizeCycleKeys([])).toBe("");
  });
});

describe("polygonArea", () => {
  it("returns 0 for < 3 points", () => {
    expect(polygonArea([])).toBe(0);
    expect(polygonArea([{ x: 0, y: 0 }, { x: 10, y: 0 }])).toBe(0);
  });

  it("computes the signed area of a unit square", () => {
    const area = polygonArea([
      { x: 0, y: 0 },
      { x: 10, y: 0 },
      { x: 10, y: 10 },
      { x: 0, y: 10 },
    ]);
    expect(Math.abs(area)).toBe(100);
  });
});

describe("makeAutoDetectedProperties / getAutoDetectedSignature", () => {
  it("round-trips a signature through node.properties", () => {
    const props = makeAutoDetectedProperties("sig-1", ["wall-a", "wall-b"]);
    const node = makeWallLike({
      id: "room-x",
      nodeType: "room",
      posX: 0, posY: 0, x2: null, y2: null,
      properties: props,
    });
    expect(getAutoDetectedSignature(node)).toBe("sig-1");
  });

  it("returns null for nodes without the autoDetected flag", () => {
    const node = makeWallLike({
      id: "room-y",
      nodeType: "room",
      posX: 0, posY: 0, x2: null, y2: null,
      properties: JSON.stringify({ someOtherField: true }),
    });
    expect(getAutoDetectedSignature(node)).toBeNull();
  });

  it("returns null for malformed JSON", () => {
    const node = makeWallLike({
      id: "room-z",
      nodeType: "room",
      posX: 0, posY: 0, x2: null, y2: null,
      properties: "{not json",
    });
    expect(getAutoDetectedSignature(node)).toBeNull();
  });
});

describe("detectAutoDetectedRegions", () => {
  it("detects a single square room from 4 walls", () => {
    const walls = [
      makeWallLike({ id: "w1", posX: 0, posY: 0, x2: 200, y2: 0 }),
      makeWallLike({ id: "w2", posX: 200, posY: 0, x2: 200, y2: 200 }),
      makeWallLike({ id: "w3", posX: 200, posY: 200, x2: 0, y2: 200 }),
      makeWallLike({ id: "w4", posX: 0, posY: 200, x2: 0, y2: 0 }),
    ];
    const result = detectAutoDetectedRegions(walls, 20);
    expect(result.regions).toHaveLength(1);
    expect(result.regions[0].nodeType).toBe("room");
    expect(result.regions[0].width).toBeCloseTo(200);
    expect(result.regions[0].height).toBeCloseTo(200);
    expect(result.blockedDeletionParentKeys.size).toBe(0);
  });

  it("classifies all-fence cycles as zones", () => {
    const fences = [
      makeWallLike({ id: "f1", nodeType: "fence", posX: 0, posY: 0, x2: 200, y2: 0 }),
      makeWallLike({ id: "f2", nodeType: "fence", posX: 200, posY: 0, x2: 200, y2: 200 }),
      makeWallLike({ id: "f3", nodeType: "fence", posX: 200, posY: 200, x2: 0, y2: 200 }),
      makeWallLike({ id: "f4", nodeType: "fence", posX: 0, posY: 200, x2: 0, y2: 0 }),
    ];
    const result = detectAutoDetectedRegions(fences, 20);
    expect(result.regions).toHaveLength(1);
    expect(result.regions[0].nodeType).toBe("zone");
  });

  it("flags branching wall graphs and skips detection for that parent", () => {
    // Square loop plus an extra spur off one corner: degree-3 vertex → branching.
    const walls = [
      makeWallLike({ id: "w1", posX: 0, posY: 0, x2: 200, y2: 0 }),
      makeWallLike({ id: "w2", posX: 200, posY: 0, x2: 200, y2: 200 }),
      makeWallLike({ id: "w3", posX: 200, posY: 200, x2: 0, y2: 200 }),
      makeWallLike({ id: "w4", posX: 0, posY: 200, x2: 0, y2: 0 }),
      makeWallLike({ id: "spur", posX: 200, posY: 0, x2: 300, y2: 0 }),
    ];
    const result = detectAutoDetectedRegions(walls, 20);
    expect(result.blockedDeletionParentKeys.has("__root__")).toBe(true);
  });

  it("groups walls by parent and detects independently", () => {
    const walls = [
      // Room in parent "A"
      makeWallLike({ id: "a1", parentId: "A", posX: 0, posY: 0, x2: 200, y2: 0 }),
      makeWallLike({ id: "a2", parentId: "A", posX: 200, posY: 0, x2: 200, y2: 200 }),
      makeWallLike({ id: "a3", parentId: "A", posX: 200, posY: 200, x2: 0, y2: 200 }),
      makeWallLike({ id: "a4", parentId: "A", posX: 0, posY: 200, x2: 0, y2: 0 }),
      // Room in parent "B"
      makeWallLike({ id: "b1", parentId: "B", posX: 500, posY: 0, x2: 700, y2: 0 }),
      makeWallLike({ id: "b2", parentId: "B", posX: 700, posY: 0, x2: 700, y2: 200 }),
      makeWallLike({ id: "b3", parentId: "B", posX: 700, posY: 200, x2: 500, y2: 200 }),
      makeWallLike({ id: "b4", parentId: "B", posX: 500, posY: 200, x2: 500, y2: 0 }),
    ];
    const result = detectAutoDetectedRegions(walls, 20);
    expect(result.regions).toHaveLength(2);
    expect(result.regions.map((r) => r.parentId).sort()).toEqual(["A", "B"]);
  });

  it("rejects polygons below the minimum area threshold", () => {
    // 5×5 box is below AUTO_DETECT_MIN_AREA (400)
    const walls = [
      makeWallLike({ id: "w1", posX: 0, posY: 0, x2: 5, y2: 0 }),
      makeWallLike({ id: "w2", posX: 5, posY: 0, x2: 5, y2: 5 }),
      makeWallLike({ id: "w3", posX: 5, posY: 5, x2: 0, y2: 5 }),
      makeWallLike({ id: "w4", posX: 0, posY: 5, x2: 0, y2: 0 }),
    ];
    const result = detectAutoDetectedRegions(walls, 20);
    expect(result.regions).toHaveLength(0);
  });

  it("returns an empty result when no walls exist", () => {
    const result = detectAutoDetectedRegions([], 20);
    expect(result.regions).toEqual([]);
    expect(result.processedParentKeys.size).toBe(0);
  });

  it("aborts a component cleanly when endpoint quantization merges vertices (no silent emit)", () => {
    // Regression guard for the cycle-traversal visited-key check: a cycle
    // whose traversal re-encounters a non-first key must produce zero
    // regions rather than a malformed signature. Constructed graph is a
    // bowtie: two triangles share a central vertex, giving a degree-4
    // node that the degree-2 simple-cycle check must reject — but if it
    // ever slipped through, the traversal must still refuse to emit.
    const walls = [
      // Left triangle (0,0)-(100,0)-(50,80)
      makeWallLike({ id: "L1", posX: 0, posY: 0, x2: 100, y2: 0 }),
      makeWallLike({ id: "L2", posX: 100, posY: 0, x2: 50, y2: 80 }),
      makeWallLike({ id: "L3", posX: 50, posY: 80, x2: 0, y2: 0 }),
      // Right triangle sharing the (100,0) vertex: (100,0)-(200,0)-(150,80)
      makeWallLike({ id: "R1", posX: 100, posY: 0, x2: 200, y2: 0 }),
      makeWallLike({ id: "R2", posX: 200, posY: 0, x2: 150, y2: 80 }),
      makeWallLike({ id: "R3", posX: 150, posY: 80, x2: 100, y2: 0 }),
    ];
    const result = detectAutoDetectedRegions(walls, 20);
    // Figure-8: degree > 2 at the shared vertex → branching flag set,
    // no regions emitted, no crash.
    expect(result.regions).toHaveLength(0);
    expect(result.blockedDeletionParentKeys.has("__root__")).toBe(true);
  });
});
