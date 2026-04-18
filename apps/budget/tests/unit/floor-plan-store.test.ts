/**
 * Unit tests for the floor-plan store's wall-snap + opening placement logic.
 *
 * The behaviour under test: doors/windows created via the tool snap onto
 * the nearest wall, inheriting the wall's orientation so the 3D CSG opening
 * and the 3D mesh align. The same helper is used from both the 2D canvas
 * and the 3D scene, so view-switching preserves door/window placement.
 */

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { FloorPlanStore } from "$lib/stores/floor-plan.svelte";

function seedStore(): FloorPlanStore {
  const store = new FloorPlanStore();
  store.homeId = 1;
  store.floorLevel = 0;
  return store;
}

describe("FloorPlanStore.findNearestWall", () => {
  it("projects a nearby point onto a horizontal wall", () => {
    const store = seedStore();
    store.addNode("wall", { posX: 0, posY: 0, x2: 200, y2: 0 });

    const snap = store.findNearestWall(100, 10);
    expect(snap).not.toBeNull();
    expect(snap?.projectedX).toBe(100);
    expect(snap?.projectedY).toBe(0);
  });

  it("clamps the projection to the wall endpoints", () => {
    const store = seedStore();
    store.addNode("wall", { posX: 0, posY: 0, x2: 200, y2: 0 });

    // Widen maxDistance so these off-segment queries still resolve (the
    // endpoint-projection behaviour is what's under test, not distance
    // culling).
    const beyond = store.findNearestWall(250, 0, 100);
    expect(beyond?.projectedX).toBe(200);
    expect(beyond?.projectedY).toBe(0);

    const before = store.findNearestWall(-40, 0, 100);
    expect(before?.projectedX).toBe(0);
    expect(before?.projectedY).toBe(0);
  });

  it("returns null when no wall is within maxDistance", () => {
    const store = seedStore();
    store.addNode("wall", { posX: 0, posY: 0, x2: 200, y2: 0 });
    expect(store.findNearestWall(500, 500, 30)).toBeNull();
  });

  it("picks the closest wall when multiple are in range", () => {
    const store = seedStore();
    const closeId = store.addNode("wall", { posX: 0, posY: 0, x2: 200, y2: 0 });
    store.addNode("wall", { posX: 0, posY: 200, x2: 200, y2: 200 });

    const snap = store.findNearestWall(100, 10);
    expect(snap?.wallId).toBe(closeId);
  });
});

describe("FloorPlanStore.resolveDefaultParent", () => {
  it("chooses the containing site for a new building", () => {
    const store = seedStore();
    const siteId = store.addNode("site", {
      posX: 0,
      posY: 0,
      width: 400,
      height: 400,
      name: "Lot",
    });

    const parentId = store.resolveDefaultParent("building", 120, 120);
    expect(parentId).toBe(siteId);
  });

  it("falls back to nearest building for a new level when not contained", () => {
    const store = seedStore();
    const farBuilding = store.addNode("building", {
      posX: 600,
      posY: 600,
      width: 200,
      height: 200,
      name: "Far",
    });
    const nearBuilding = store.addNode("building", {
      posX: 100,
      posY: 100,
      width: 200,
      height: 200,
      name: "Near",
    });

    const parentId = store.resolveDefaultParent("level", 350, 120);
    expect(parentId).toBe(nearBuilding);
    expect(parentId).not.toBe(farBuilding);
  });

  it("chooses the containing roof for a new roof-segment", () => {
    const store = seedStore();
    const buildingId = store.addNode("building", {
      posX: 0,
      posY: 0,
      width: 500,
      height: 400,
      name: "B1",
    });
    const levelId = store.addNode("level", {
      posX: 20,
      posY: 20,
      width: 420,
      height: 300,
      parentId: buildingId,
      name: "L1",
    });
    const roofId = store.addNode("roof", {
      posX: 40,
      posY: 40,
      width: 320,
      height: 220,
      parentId: levelId,
      name: "Roof",
    });

    const parentId = store.resolveDefaultParent("roof-segment", 140, 120);
    expect(parentId).toBe(roofId);
  });

  it("does not fall back to parents outside the active hierarchy context", () => {
    const store = seedStore();
    const siteA = store.addNode("site", {
      posX: 0,
      posY: 0,
      width: 400,
      height: 320,
      name: "Site A",
    });
    const buildingA = store.addNode("building", {
      posX: 20,
      posY: 20,
      width: 260,
      height: 220,
      parentId: siteA,
      name: "Building A",
    });
    store.addNode("level", {
      posX: 40,
      posY: 40,
      width: 220,
      height: 180,
      parentId: buildingA,
      name: "A-1",
    });

    const siteB = store.addNode("site", {
      posX: 500,
      posY: 0,
      width: 400,
      height: 320,
      name: "Site B",
    });
    const buildingB = store.addNode("building", {
      posX: 540,
      posY: 20,
      width: 260,
      height: 220,
      parentId: siteB,
      name: "Building B",
    });

    store.setHierarchyContextFromNodeId(buildingB);
    const parentId = store.resolveDefaultParent("slab", 620, 120);
    expect(parentId).toBeNull();
  });
});

describe("FloorPlanStore hierarchy guards", () => {
  it("blocks activating building tool until a site exists", () => {
    const store = seedStore();
    // Side-effecting variant emits a status message and returns false.
    expect(store.tryActivateTool("building")).toBe(false);
    expect(store.statusMessage).toContain("Site");
    // Pure predicate agrees.
    expect(store.canActivateTool("building")).toBe(false);
  });

  it("allows activating building tool when a site exists", () => {
    const store = seedStore();
    store.addNode("site", { posX: 0, posY: 0, width: 200, height: 200, name: "Lot" });
    expect(store.canActivateTool("building")).toBe(true);
    expect(store.tryActivateTool("building")).toBe(true);
  });

  it("auto-creates a site when building tool is activated with auto-parent enabled", () => {
    const store = seedStore();
    store.autoCreateMissingParents = true;

    // Pure predicate still reports false — no side effects.
    expect(store.canActivateTool("building")).toBe(false);
    // Side-effecting variant creates the site and reports true.
    expect(store.tryActivateTool("building")).toBe(true);
    const sites = store.nodeList.filter((node) => node.nodeType === "site");
    expect(sites.length).toBe(1);
  });

  it("auto-creates site and building for level tool when auto-parent is enabled", () => {
    const store = seedStore();
    store.autoCreateMissingParents = true;

    expect(store.tryActivateTool("level")).toBe(true);
    const sites = store.nodeList.filter((node) => node.nodeType === "site");
    const buildings = store.nodeList.filter((node) => node.nodeType === "building");
    expect(sites.length).toBe(1);
    expect(buildings.length).toBe(1);
    expect(buildings[0].parentId).toBe(sites[0].id);
  });

  it("auto-creates missing parents during creation-time parent resolution", () => {
    const store = seedStore();
    store.autoCreateMissingParents = true;

    const parentId = store.resolveParentForCreation("level", 120, 140);
    expect(parentId).toBeTruthy();
    expect(parentId ? store.nodes[parentId]?.nodeType : null).toBe("building");

    const sites = store.nodeList.filter((node) => node.nodeType === "site");
    const buildings = store.nodeList.filter((node) => node.nodeType === "building");
    expect(sites.length).toBe(1);
    expect(buildings.length).toBe(1);
    expect(buildings[0]?.parentId).toBe(sites[0]?.id);
  });

  it("does not create parents at creation-time when auto-parent is disabled", () => {
    const store = seedStore();
    store.autoCreateMissingParents = false;

    const parentId = store.resolveParentForCreation("level", 120, 140);
    expect(parentId).toBeNull();
    expect(store.nodeList.find((node) => node.nodeType === "site")).toBeUndefined();
    expect(store.nodeList.find((node) => node.nodeType === "building")).toBeUndefined();
  });

  it("rejects creating level without a parent id", () => {
    const store = seedStore();
    expect(store.requireParentForCreation("level", null)).toBe(false);
    expect(store.statusMessage).toContain("Building");
  });

  it("allows creating level when parent id is provided", () => {
    const store = seedStore();
    expect(store.requireParentForCreation("level", "building-1")).toBe(true);
  });

  it("blocks slab tool until a level exists", () => {
    const store = seedStore();
    expect(store.tryActivateTool("slab")).toBe(false);
    expect(store.statusMessage).toContain("Level");

    const buildingId = store.addNode("building", {
      posX: 0,
      posY: 0,
      width: 240,
      height: 180,
    });
    store.addNode("level", {
      posX: 20,
      posY: 20,
      width: 200,
      height: 140,
      parentId: buildingId,
    });
    expect(store.canActivateTool("slab")).toBe(true);
  });

  it("requires a roof parent before creating roof-segment", () => {
    const store = seedStore();
    expect(store.tryActivateTool("roof-segment")).toBe(false);
    expect(store.statusMessage).toContain("Roof");
    expect(store.requireParentForCreation("roof-segment", null)).toBe(false);
    expect(store.statusMessage).toContain("Roof");
  });

  it("resolves a level parent for slab creation", () => {
    const store = seedStore();
    const buildingId = store.addNode("building", {
      posX: 0,
      posY: 0,
      width: 300,
      height: 240,
    });
    const levelId = store.addNode("level", {
      posX: 10,
      posY: 10,
      width: 220,
      height: 160,
      parentId: buildingId,
    });

    const parentId = store.resolveParentForCreation("slab", 80, 70);
    expect(parentId).toBe(levelId);
    expect(store.requireParentForCreation("slab", parentId)).toBe(true);
  });

  it("auto-creates parent chain for roof-segment tool when enabled", () => {
    const store = seedStore();
    store.autoCreateMissingParents = true;

    expect(store.tryActivateTool("roof-segment")).toBe(true);
    expect(store.nodeList.find((node) => node.nodeType === "site")).toBeTruthy();
    expect(store.nodeList.find((node) => node.nodeType === "building")).toBeTruthy();
    expect(store.nodeList.find((node) => node.nodeType === "level")).toBeTruthy();
    expect(store.nodeList.find((node) => node.nodeType === "roof")).toBeTruthy();
  });

  it("auto-creates parent chain for roof-segment creation-time parent resolution", () => {
    const store = seedStore();
    store.autoCreateMissingParents = true;

    const parentId = store.resolveParentForCreation("roof-segment", 120, 140);
    expect(parentId).toBeTruthy();
    expect(parentId ? store.nodes[parentId]?.nodeType : null).toBe("roof");
  });

  it("auto-creates context-local level for slab tool when levels exist only in another branch", () => {
    const store = seedStore();
    store.autoCreateMissingParents = true;

    const siteA = store.addNode("site", {
      posX: 0,
      posY: 0,
      width: 420,
      height: 320,
      name: "Site A",
    });
    const buildingA = store.addNode("building", {
      posX: 20,
      posY: 20,
      width: 260,
      height: 220,
      parentId: siteA,
      name: "Building A",
    });
    store.addNode("level", {
      posX: 40,
      posY: 40,
      width: 220,
      height: 180,
      parentId: buildingA,
      name: "A-1",
    });

    const siteB = store.addNode("site", {
      posX: 520,
      posY: 0,
      width: 420,
      height: 320,
      name: "Site B",
    });
    const buildingB = store.addNode("building", {
      posX: 560,
      posY: 20,
      width: 260,
      height: 220,
      parentId: siteB,
      name: "Building B",
    });

    store.setHierarchyContextFromNodeId(buildingB);
    expect(store.tryActivateTool("slab")).toBe(true);
    const levelsInBuildingB = store.nodeList.filter(
      (node) => node.nodeType === "level" && node.parentId === buildingB
    );
    expect(levelsInBuildingB).toHaveLength(1);
  });

  it("auto-creates context-local roof for roof-segment creation", () => {
    const store = seedStore();
    store.autoCreateMissingParents = true;

    const siteA = store.addNode("site", {
      posX: 0,
      posY: 0,
      width: 420,
      height: 320,
      name: "Site A",
    });
    const buildingA = store.addNode("building", {
      posX: 20,
      posY: 20,
      width: 260,
      height: 220,
      parentId: siteA,
      name: "Building A",
    });
    const levelA = store.addNode("level", {
      posX: 40,
      posY: 40,
      width: 220,
      height: 180,
      parentId: buildingA,
      name: "A-1",
    });
    store.addNode("roof", {
      posX: 50,
      posY: 50,
      width: 200,
      height: 140,
      parentId: levelA,
      name: "Roof A",
    });

    const siteB = store.addNode("site", {
      posX: 520,
      posY: 0,
      width: 420,
      height: 320,
      name: "Site B",
    });
    const buildingB = store.addNode("building", {
      posX: 560,
      posY: 20,
      width: 260,
      height: 220,
      parentId: siteB,
      name: "Building B",
    });
    const levelB = store.addNode("level", {
      posX: 580,
      posY: 40,
      width: 220,
      height: 180,
      parentId: buildingB,
      name: "B-1",
    });

    store.setHierarchyContextFromNodeId(levelB);
    const parentId = store.resolveParentForCreation("roof-segment", 620, 120);
    expect(parentId).toBeTruthy();
    expect(parentId ? store.nodes[parentId]?.nodeType : null).toBe("roof");
    if (parentId) {
      expect(store.nodes[parentId]?.parentId).toBe(levelB);
    }
  });
});

describe("FloorPlanStore.reparentHierarchyNode", () => {
  it("reparents building to a different site", () => {
    const store = seedStore();
    const siteA = store.addNode("site", { posX: 0, posY: 0, width: 200, height: 200, name: "A" });
    const siteB = store.addNode("site", { posX: 300, posY: 0, width: 200, height: 200, name: "B" });
    const building = store.addNode("building", {
      posX: 20,
      posY: 20,
      width: 80,
      height: 80,
      parentId: siteA,
      name: "House",
    });

    expect(store.reparentHierarchyNode(building, siteB)).toBe(true);
    expect(store.nodes[building].parentId).toBe(siteB);
  });

  it("rejects level unparenting", () => {
    const store = seedStore();
    const building = store.addNode("building", { posX: 0, posY: 0, width: 200, height: 200 });
    const level = store.addNode("level", {
      posX: 10,
      posY: 10,
      width: 120,
      height: 120,
      parentId: building,
    });

    expect(store.reparentHierarchyNode(level, null)).toBe(false);
    expect(store.nodes[level].parentId).toBe(building);
    expect(store.statusMessage).toContain("Level nodes require");
  });

  it("rejects invalid parent type for building", () => {
    const store = seedStore();
    const wrongParent = store.addNode("building", { posX: 0, posY: 0, width: 200, height: 200 });
    const building = store.addNode("building", { posX: 10, posY: 10, width: 80, height: 80 });

    expect(store.reparentHierarchyNode(building, wrongParent)).toBe(false);
    expect(store.nodes[building].parentId).toBeNull();
    expect(store.statusMessage).toContain("must be parented");
  });

  it("reparents roof-segment to a different roof", () => {
    const store = seedStore();
    const site = store.addNode("site", { posX: 0, posY: 0, width: 600, height: 400 });
    const building = store.addNode("building", {
      posX: 20,
      posY: 20,
      width: 520,
      height: 320,
      parentId: site,
    });
    const level = store.addNode("level", {
      posX: 30,
      posY: 30,
      width: 480,
      height: 280,
      parentId: building,
    });
    const roofA = store.addNode("roof", {
      posX: 40,
      posY: 40,
      width: 200,
      height: 140,
      parentId: level,
    });
    const roofB = store.addNode("roof", {
      posX: 260,
      posY: 40,
      width: 200,
      height: 140,
      parentId: level,
    });
    const segment = store.addNode("roof-segment", {
      posX: 70,
      posY: 70,
      x2: 170,
      y2: 70,
      parentId: roofA,
    });

    expect(store.reparentHierarchyNode(segment, roofB)).toBe(true);
    expect(store.nodes[segment].parentId).toBe(roofB);
  });

  it("rejects unparenting roof-segment nodes", () => {
    const store = seedStore();
    const roof = store.addNode("roof", {
      posX: 10,
      posY: 10,
      width: 180,
      height: 120,
    });
    const segment = store.addNode("roof-segment", {
      posX: 20,
      posY: 20,
      x2: 120,
      y2: 20,
      parentId: roof,
    });

    expect(store.reparentHierarchyNode(segment, null)).toBe(false);
    expect(store.nodes[segment].parentId).toBe(roof);
    expect(store.statusMessage).toContain("require");
  });

  it("rejects wrong parent type for roof-segment", () => {
    const store = seedStore();
    const level = store.addNode("level", { posX: 0, posY: 0, width: 240, height: 180 });
    const roof = store.addNode("roof", {
      posX: 10,
      posY: 10,
      width: 180,
      height: 120,
      parentId: level,
    });
    const segment = store.addNode("roof-segment", {
      posX: 20,
      posY: 20,
      x2: 120,
      y2: 20,
      parentId: roof,
    });

    expect(store.reparentHierarchyNode(segment, level)).toBe(false);
    expect(store.nodes[segment].parentId).toBe(roof);
    expect(store.statusMessage).toContain("must be parented");
  });
});

describe("FloorPlanStore hierarchy context", () => {
  it("filters rendered walls to the active level context", () => {
    const store = seedStore();
    const siteId = store.addNode("site", { posX: 0, posY: 0, width: 600, height: 400 });
    const buildingId = store.addNode("building", {
      posX: 20,
      posY: 20,
      width: 500,
      height: 300,
      parentId: siteId,
    });
    const levelA = store.addNode("level", {
      posX: 30,
      posY: 30,
      width: 220,
      height: 220,
      parentId: buildingId,
      name: "A",
    });
    const levelB = store.addNode("level", {
      posX: 280,
      posY: 30,
      width: 220,
      height: 220,
      parentId: buildingId,
      name: "B",
    });
    const wallA = store.addNode("wall", {
      posX: 50,
      posY: 50,
      x2: 200,
      y2: 50,
      parentId: levelA,
    });
    const wallB = store.addNode("wall", {
      posX: 300,
      posY: 50,
      x2: 450,
      y2: 50,
      parentId: levelB,
    });

    store.setHierarchyContextFromNodeId(levelA);
    expect(store.walls.map((node) => node.id)).toEqual([wallA]);

    store.clearHierarchyContext();
    expect(store.walls.map((node) => node.id).sort()).toEqual([wallA, wallB].sort());
  });

  it("selecting a level updates default content parent to that level", () => {
    const store = seedStore();
    const siteId = store.addNode("site", { posX: 0, posY: 0, width: 300, height: 300 });
    const buildingId = store.addNode("building", {
      posX: 10,
      posY: 10,
      width: 260,
      height: 260,
      parentId: siteId,
    });
    const levelId = store.addNode("level", {
      posX: 20,
      posY: 20,
      width: 200,
      height: 200,
      parentId: buildingId,
    });

    store.selectNode(levelId);
    expect(store.activeLevelId).toBe(levelId);
    expect(store.activeBuildingId).toBe(buildingId);
    expect(store.activeSiteId).toBe(siteId);
    expect(store.resolveDefaultContentParentId()).toBe(levelId);
  });
});

describe("FloorPlanStore inherited visibility and locking", () => {
  it("hides descendants when a parent is hidden", () => {
    const store = seedStore();
    const siteId = store.addNode("site", { posX: 0, posY: 0, width: 600, height: 400 });
    const buildingId = store.addNode("building", {
      posX: 20,
      posY: 20,
      width: 500,
      height: 300,
      parentId: siteId,
    });
    const levelId = store.addNode("level", {
      posX: 30,
      posY: 30,
      width: 220,
      height: 220,
      parentId: buildingId,
    });
    const wallId = store.addNode("wall", {
      posX: 50,
      posY: 50,
      x2: 200,
      y2: 50,
      parentId: levelId,
    });

    expect(store.setNodeHidden(buildingId, true)).toBe(true);
    expect(store.isNodeHiddenOwn(buildingId)).toBe(true);
    expect(store.isNodeHiddenInherited(levelId)).toBe(true);
    expect(store.isNodeHidden(levelId)).toBe(true);
    expect(store.isNodeHidden(wallId)).toBe(true);
    expect(store.visibleNodeList.some((node) => node.id === levelId)).toBe(false);
    expect(store.visibleNodeList.some((node) => node.id === wallId)).toBe(false);
    expect(store.selectNode(wallId)).toBe(false);
  });

  it("keeps child hidden after parent re-show if child was explicitly hidden", () => {
    const store = seedStore();
    const siteId = store.addNode("site", { posX: 0, posY: 0, width: 400, height: 300 });
    const buildingId = store.addNode("building", {
      posX: 10,
      posY: 10,
      width: 320,
      height: 220,
      parentId: siteId,
    });
    const levelId = store.addNode("level", {
      posX: 20,
      posY: 20,
      width: 240,
      height: 180,
      parentId: buildingId,
    });

    store.setNodeHidden(buildingId, true);
    store.toggleNodeVisibility(levelId);
    expect(store.isNodeHiddenOwn(levelId)).toBe(true);
    store.setNodeHidden(buildingId, false);
    expect(store.isNodeHiddenInherited(levelId)).toBe(false);
    expect(store.isNodeHidden(levelId)).toBe(true);
  });

  it("locks descendants and blocks select/move/reparent/delete", () => {
    const store = seedStore();
    const siteA = store.addNode("site", { posX: 0, posY: 0, width: 600, height: 400 });
    const siteB = store.addNode("site", { posX: 700, posY: 0, width: 600, height: 400 });
    const buildingB = store.addNode("building", {
      posX: 740,
      posY: 40,
      width: 400,
      height: 260,
      parentId: siteB,
    });
    const buildingId = store.addNode("building", {
      posX: 20,
      posY: 20,
      width: 500,
      height: 300,
      parentId: siteA,
    });
    const levelId = store.addNode("level", {
      posX: 30,
      posY: 30,
      width: 220,
      height: 220,
      parentId: buildingId,
    });

    store.setNodeLocked(buildingId, true);
    expect(store.isNodeLockedOwn(buildingId)).toBe(true);
    expect(store.isNodeLockedInherited(levelId)).toBe(true);
    expect(store.selectNode(levelId)).toBe(false);

    const beforeMove = store.nodes[levelId];
    expect(store.moveNode(levelId, 40, 0)).toBe(false);
    expect(store.nodes[levelId].posX).toBe(beforeMove.posX);
    expect(store.nodes[levelId].posY).toBe(beforeMove.posY);

    expect(store.reparentHierarchyNode(levelId, buildingB)).toBe(false);
    expect(store.nodes[levelId].parentId).toBe(buildingId);

    store.deleteNode(levelId);
    expect(store.nodes[levelId]).toBeTruthy();
  });
});

describe("FloorPlanStore elevation hierarchy", () => {
  it("computes ancestor and world elevation for nested nodes", () => {
    const store = seedStore();
    const siteId = store.addNode("site", {
      posX: 0,
      posY: 0,
      width: 500,
      height: 400,
      elevation: 0.5,
    });
    const buildingId = store.addNode("building", {
      posX: 20,
      posY: 20,
      width: 300,
      height: 240,
      parentId: siteId,
      elevation: 1.25,
    });
    const levelId = store.addNode("level", {
      posX: 30,
      posY: 30,
      width: 220,
      height: 180,
      parentId: buildingId,
      elevation: 3,
    });
    const wallId = store.addNode("wall", {
      posX: 40,
      posY: 50,
      x2: 180,
      y2: 50,
      parentId: levelId,
      elevation: 0.2,
    });
    const doorId = store.addNode("door", {
      posX: 100,
      posY: 50,
      width: 40,
      height: 10,
      parentId: wallId,
      elevation: 0.1,
    });

    expect(store.getNodeAncestorElevation(doorId)).toBeCloseTo(4.95, 5);
    expect(store.getNodeWorldElevation(doorId)).toBeCloseTo(5.05, 5);
    expect(store.getNodeAncestorElevation(wallId)).toBeCloseTo(4.75, 5);
    expect(store.getNodeWorldElevation(wallId)).toBeCloseTo(4.95, 5);
  });
});

describe("FloorPlanStore level display modes", () => {
  it("applies exploded offsets by sorted level order", () => {
    const store = seedStore();
    const siteId = store.addNode("site", { posX: 0, posY: 0, width: 500, height: 400 });
    const buildingId = store.addNode("building", {
      posX: 20,
      posY: 20,
      width: 300,
      height: 240,
      parentId: siteId,
    });
    const groundId = store.addNode("level", {
      posX: 30,
      posY: 30,
      width: 200,
      height: 160,
      parentId: buildingId,
      elevation: 0,
      name: "Ground",
    });
    const upperId = store.addNode("level", {
      posX: 30,
      posY: 30,
      width: 200,
      height: 160,
      parentId: buildingId,
      elevation: 3,
      name: "Upper",
    });
    const groundWall = store.addNode("wall", {
      posX: 40,
      posY: 40,
      x2: 180,
      y2: 40,
      parentId: groundId,
    });
    const upperWall = store.addNode("wall", {
      posX: 40,
      posY: 80,
      x2: 180,
      y2: 80,
      parentId: upperId,
    });

    store.setLevelDisplayMode("exploded");
    store.setLevelExplodeSpacing(4);

    expect(store.getNodeDisplayElevationOffset(groundWall)).toBe(0);
    expect(store.getNodeDisplayElevationOffset(upperWall)).toBe(4);
  });

  it("shows only the active level subtree in solo mode", () => {
    const store = seedStore();
    const siteId = store.addNode("site", { posX: 0, posY: 0, width: 500, height: 400 });
    const buildingId = store.addNode("building", {
      posX: 20,
      posY: 20,
      width: 300,
      height: 240,
      parentId: siteId,
    });
    const levelA = store.addNode("level", {
      posX: 30,
      posY: 30,
      width: 200,
      height: 160,
      parentId: buildingId,
      elevation: 0,
      name: "A",
    });
    const levelB = store.addNode("level", {
      posX: 30,
      posY: 30,
      width: 200,
      height: 160,
      parentId: buildingId,
      elevation: 3,
      name: "B",
    });
    const wallA = store.addNode("wall", {
      posX: 40,
      posY: 40,
      x2: 180,
      y2: 40,
      parentId: levelA,
    });
    const wallB = store.addNode("wall", {
      posX: 40,
      posY: 80,
      x2: 180,
      y2: 80,
      parentId: levelB,
    });

    store.setHierarchyContextFromNodeId(levelA);
    store.setLevelDisplayMode("solo");

    expect(store.isNodeVisibleInLevelDisplayMode(levelA)).toBe(true);
    expect(store.isNodeVisibleInLevelDisplayMode(wallA)).toBe(true);
    expect(store.isNodeVisibleInLevelDisplayMode(levelB)).toBe(false);
    expect(store.isNodeVisibleInLevelDisplayMode(wallB)).toBe(false);
  });

  it("supports manual per-level offsets and reset", () => {
    const store = seedStore();
    const siteId = store.addNode("site", { posX: 0, posY: 0, width: 500, height: 400 });
    const buildingId = store.addNode("building", {
      posX: 20,
      posY: 20,
      width: 300,
      height: 240,
      parentId: siteId,
    });
    const levelId = store.addNode("level", {
      posX: 30,
      posY: 30,
      width: 200,
      height: 160,
      parentId: buildingId,
      elevation: 0,
    });
    const wallId = store.addNode("wall", {
      posX: 40,
      posY: 40,
      x2: 180,
      y2: 40,
      parentId: levelId,
    });

    store.setLevelDisplayMode("manual");
    store.setManualLevelOffset(levelId, 2.75);
    expect(store.getManualLevelOffset(levelId)).toBe(2.75);
    expect(store.getNodeDisplayElevationOffset(wallId)).toBe(2.75);

    store.resetManualLevelOffsets();
    expect(store.getManualLevelOffset(levelId)).toBe(0);
    expect(store.getNodeDisplayElevationOffset(wallId)).toBe(0);
  });
});

describe("FloorPlanStore.autoDetectSpacesAndZones", () => {
  it("detects a closed wall loop as a room and is idempotent on rerun", () => {
    const store = seedStore();
    const siteId = store.addNode("site", { posX: 0, posY: 0, width: 600, height: 500 });
    const buildingId = store.addNode("building", {
      posX: 20,
      posY: 20,
      width: 500,
      height: 400,
      parentId: siteId,
    });
    const levelId = store.addNode("level", {
      posX: 40,
      posY: 40,
      width: 420,
      height: 320,
      parentId: buildingId,
      elevation: 0,
    });

    store.addNode("wall", { posX: 100, posY: 100, x2: 300, y2: 100, parentId: levelId });
    store.addNode("wall", { posX: 300, posY: 100, x2: 300, y2: 220, parentId: levelId });
    store.addNode("wall", { posX: 300, posY: 220, x2: 100, y2: 220, parentId: levelId });
    store.addNode("wall", { posX: 100, posY: 220, x2: 100, y2: 100, parentId: levelId });

    const first = store.autoDetectSpacesAndZones();
    expect(first.detected).toBe(1);
    expect(first.created).toBe(1);
    expect(first.deleted).toBe(0);

    const rooms = store.nodeList.filter((node) => node.nodeType === "room");
    expect(rooms).toHaveLength(1);
    expect(rooms[0]?.parentId).toBe(levelId);
    expect(rooms[0]?.posX).toBe(100);
    expect(rooms[0]?.posY).toBe(100);
    expect(rooms[0]?.width).toBe(200);
    expect(rooms[0]?.height).toBe(120);
    const roomProps = JSON.parse(rooms[0]?.properties ?? "{}") as Record<string, unknown>;
    expect(roomProps.autoDetected).toBe(true);
    expect(typeof roomProps.boundarySignature).toBe("string");

    const second = store.autoDetectSpacesAndZones();
    expect(second.detected).toBe(1);
    expect(second.created).toBe(0);
    expect(second.updated).toBe(0);
    expect(second.deleted).toBe(0);
    expect(store.nodeList.filter((node) => node.nodeType === "room")).toHaveLength(1);
  });

  it("detects fence loops as zones and removes stale auto-detected zones after boundary breaks", () => {
    const store = seedStore();
    const siteId = store.addNode("site", { posX: 0, posY: 0, width: 700, height: 500 });
    const buildingId = store.addNode("building", {
      posX: 20,
      posY: 20,
      width: 620,
      height: 420,
      parentId: siteId,
    });
    const levelId = store.addNode("level", {
      posX: 40,
      posY: 40,
      width: 540,
      height: 340,
      parentId: buildingId,
      elevation: 0,
    });

    const fenceA = store.addNode("fence", {
      posX: 360,
      posY: 120,
      x2: 560,
      y2: 120,
      parentId: levelId,
    });
    store.addNode("fence", { posX: 560, posY: 120, x2: 560, y2: 260, parentId: levelId });
    store.addNode("fence", { posX: 560, posY: 260, x2: 360, y2: 260, parentId: levelId });
    store.addNode("fence", { posX: 360, posY: 260, x2: 360, y2: 120, parentId: levelId });

    const first = store.autoDetectSpacesAndZones();
    expect(first.detected).toBe(1);
    expect(first.created).toBe(1);
    const zones = store.nodeList.filter((node) => node.nodeType === "zone");
    expect(zones).toHaveLength(1);
    expect(zones[0]?.parentId).toBe(levelId);

    store.deleteNode(fenceA);
    const second = store.autoDetectSpacesAndZones();
    expect(second.detected).toBe(0);
    expect(second.deleted).toBe(1);
    expect(store.nodeList.filter((node) => node.nodeType === "zone")).toHaveLength(0);
  });
});

describe("FloorPlanStore level lifecycle", () => {
  it("adds levels under a building and protects the first level as ground", () => {
    const store = seedStore();
    const siteId = store.addNode("site", { posX: 0, posY: 0, width: 500, height: 400 });
    const buildingId = store.addNode("building", {
      posX: 20,
      posY: 20,
      width: 300,
      height: 240,
      parentId: siteId,
    });

    const groundId = store.addLevelToBuilding(buildingId);
    const upperId = store.addLevelToBuilding(buildingId);
    expect(groundId).toBeTruthy();
    expect(upperId).toBeTruthy();
    expect(groundId).not.toBe(upperId);
    expect(store.isGroundLevel(groundId!)).toBe(true);
    expect(store.canDeleteLevel(groundId!)).toBe(false);
    expect(store.canDeleteLevel(upperId!)).toBe(true);
  });

  it("adds a level with structural nodes in one action", () => {
    const store = seedStore();
    const siteId = store.addNode("site", { posX: 0, posY: 0, width: 500, height: 400 });
    const buildingId = store.addNode("building", {
      posX: 20,
      posY: 20,
      width: 300,
      height: 240,
      parentId: siteId,
    });

    const created = store.addLevelWithStructureToBuilding(buildingId);
    expect(created).toBeTruthy();
    const levelId = created?.levelId;
    expect(levelId ? store.nodes[levelId]?.nodeType : null).toBe("level");
    expect(levelId ? store.nodes[levelId]?.parentId : null).toBe(buildingId);
    expect(created?.structuralIds).toHaveLength(4);
    expect(levelId ? store.selectedNodeIds.has(levelId) : false).toBe(true);
    expect(store.statusMessage).toContain("Added Level with 4 structural nodes");

    const levelChildren = store.nodeList.filter((node) => node.parentId === levelId);
    const structuralTypes = new Set(levelChildren.map((node) => node.nodeType));
    expect(structuralTypes.has("slab")).toBe(true);
    expect(structuralTypes.has("ceiling")).toBe(true);
    expect(structuralTypes.has("roof")).toBe(true);
    expect(structuralTypes.has("stair")).toBe(true);
  });

  it("blocks level+structure quick action for invalid building", () => {
    const store = seedStore();
    const levelId = store.addNode("level", {
      posX: 10,
      posY: 10,
      width: 120,
      height: 80,
      parentId: null,
      elevation: 0,
      name: "Orphan",
    });

    const created = store.addLevelWithStructureToBuilding(levelId);
    expect(created).toBeNull();
    expect(store.statusMessage).toContain("valid Building");
  });

  it("adds numbered levels with unique names", () => {
    const store = seedStore();
    const siteId = store.addNode("site", { posX: 0, posY: 0, width: 500, height: 400 });
    const buildingId = store.addNode("building", {
      posX: 20,
      posY: 20,
      width: 300,
      height: 240,
      parentId: siteId,
    });
    store.addNode("level", {
      posX: 10,
      posY: 10,
      width: 200,
      height: 120,
      parentId: buildingId,
      name: "Ground Level",
      elevation: 0,
    });
    store.addNode("level", {
      posX: 10,
      posY: 10,
      width: 200,
      height: 120,
      parentId: buildingId,
      name: "Level 1",
      elevation: 3,
    });
    store.addNode("level", {
      posX: 10,
      posY: 10,
      width: 200,
      height: 120,
      parentId: buildingId,
      name: "Level 3",
      elevation: 9,
    });

    const nextId = store.addLevelToBuilding(buildingId);
    expect(nextId).toBeTruthy();
    expect(nextId ? store.nodes[nextId]?.name : null).toBe("Level 4");
  });

  it("quick-creates structural surfaces under a level", () => {
    const store = seedStore();
    const siteId = store.addNode("site", { posX: 0, posY: 0, width: 500, height: 400 });
    const buildingId = store.addNode("building", {
      posX: 20,
      posY: 20,
      width: 300,
      height: 240,
      parentId: siteId,
    });
    const levelId = store.addNode("level", {
      posX: 40,
      posY: 40,
      width: 220,
      height: 180,
      parentId: buildingId,
      elevation: 0,
      name: "Ground",
    });

    const slabId = store.addStructuralNodeToLevel(levelId, "slab");
    expect(slabId).toBeTruthy();
    expect(slabId ? store.nodes[slabId]?.nodeType : null).toBe("slab");
    expect(slabId ? store.nodes[slabId]?.parentId : null).toBe(levelId);
    expect(slabId ? store.selectedNodeIds.has(slabId) : false).toBe(true);
  });

  it("reuses existing structural surface on quick-create", () => {
    const store = seedStore();
    const siteId = store.addNode("site", { posX: 0, posY: 0, width: 500, height: 400 });
    const buildingId = store.addNode("building", {
      posX: 20,
      posY: 20,
      width: 300,
      height: 240,
      parentId: siteId,
    });
    const levelId = store.addNode("level", {
      posX: 40,
      posY: 40,
      width: 220,
      height: 180,
      parentId: buildingId,
      elevation: 0,
      name: "Ground",
    });
    const existingRoofId = store.addNode("roof", {
      posX: 50,
      posY: 50,
      width: 200,
      height: 140,
      parentId: levelId,
      name: "Main Roof",
    });

    const returnedId = store.addStructuralNodeToLevel(levelId, "roof");
    expect(returnedId).toBe(existingRoofId);
    const roofs = store.nodeList.filter(
      (node) => node.nodeType === "roof" && node.parentId === levelId
    );
    expect(roofs).toHaveLength(1);
    expect(store.statusMessage).toContain("already exists");
  });

  it("quick-creates roof segments under roof nodes", () => {
    const store = seedStore();
    const siteId = store.addNode("site", { posX: 0, posY: 0, width: 500, height: 400 });
    const buildingId = store.addNode("building", {
      posX: 20,
      posY: 20,
      width: 300,
      height: 240,
      parentId: siteId,
    });
    const levelId = store.addNode("level", {
      posX: 40,
      posY: 40,
      width: 220,
      height: 180,
      parentId: buildingId,
      elevation: 0,
      name: "Ground",
    });
    const roofId = store.addNode("roof", {
      posX: 60,
      posY: 60,
      width: 180,
      height: 120,
      parentId: levelId,
      elevation: 3,
      name: "Roof",
    });

    const segmentId = store.addStructuralSegmentToNode(roofId);
    expect(segmentId).toBeTruthy();
    const segment = segmentId ? store.nodes[segmentId] : null;
    expect(segment?.nodeType).toBe("roof-segment");
    expect(segment?.parentId).toBe(roofId);
    expect(segment?.x2).not.toBeNull();
    expect(segment?.y2).not.toBeNull();
    expect(segment?.wallHeight).toBeCloseTo(0.4, 5);
    expect(segment?.thickness).toBeCloseTo(0.25, 5);
  });

  it("quick-creates roof with segment from a level", () => {
    const store = seedStore();
    const siteId = store.addNode("site", { posX: 0, posY: 0, width: 500, height: 400 });
    const buildingId = store.addNode("building", {
      posX: 20,
      posY: 20,
      width: 300,
      height: 240,
      parentId: siteId,
    });
    const levelId = store.addNode("level", {
      posX: 40,
      posY: 40,
      width: 220,
      height: 180,
      parentId: buildingId,
      elevation: 0,
      name: "Ground",
    });

    const result = store.addStructuralNodeWithSegmentToLevel(levelId, "roof");
    expect(result).toBeTruthy();
    expect(result ? store.nodes[result.structuralId]?.nodeType : null).toBe("roof");
    expect(result ? store.nodes[result.structuralId]?.parentId : null).toBe(levelId);
    expect(result ? store.nodes[result.segmentId]?.nodeType : null).toBe("roof-segment");
    expect(result ? store.nodes[result.segmentId]?.parentId : null).toBe(result?.structuralId);
    expect(store.statusMessage).toContain("Added Roof with a segment");
  });

  it("quick-creates stair with segment from a level", () => {
    const store = seedStore();
    const siteId = store.addNode("site", { posX: 0, posY: 0, width: 500, height: 400 });
    const buildingId = store.addNode("building", {
      posX: 20,
      posY: 20,
      width: 300,
      height: 240,
      parentId: siteId,
    });
    const levelId = store.addNode("level", {
      posX: 40,
      posY: 40,
      width: 220,
      height: 180,
      parentId: buildingId,
      elevation: 0,
      name: "Ground",
    });

    const result = store.addStructuralNodeWithSegmentToLevel(levelId, "stair");
    expect(result).toBeTruthy();
    expect(result ? store.nodes[result.structuralId]?.nodeType : null).toBe("stair");
    expect(result ? store.nodes[result.segmentId]?.nodeType : null).toBe("stair-segment");
  });

  it("adds a segment to existing roof from level combo action without duplicating roof", () => {
    const store = seedStore();
    const siteId = store.addNode("site", { posX: 0, posY: 0, width: 500, height: 400 });
    const buildingId = store.addNode("building", {
      posX: 20,
      posY: 20,
      width: 300,
      height: 240,
      parentId: siteId,
    });
    const levelId = store.addNode("level", {
      posX: 40,
      posY: 40,
      width: 220,
      height: 180,
      parentId: buildingId,
      elevation: 0,
      name: "Ground",
    });
    const roofId = store.addNode("roof", {
      posX: 60,
      posY: 60,
      width: 180,
      height: 120,
      parentId: levelId,
      elevation: 3,
      name: "Roof",
    });

    const result = store.addStructuralNodeWithSegmentToLevel(levelId, "roof");
    expect(result).toBeTruthy();
    expect(result?.structuralId).toBe(roofId);
    const roofs = store.nodeList.filter((node) => node.parentId === levelId && node.nodeType === "roof");
    expect(roofs).toHaveLength(1);
    expect(result ? store.nodes[result.segmentId]?.parentId : null).toBe(roofId);
    expect(store.statusMessage).toContain("Added Roof segment");
  });

  it("blocks level combo action when target is not a level", () => {
    const store = seedStore();
    const wallId = store.addNode("wall", { posX: 20, posY: 20, x2: 180, y2: 20 });

    const result = store.addStructuralNodeWithSegmentToLevel(wallId, "roof");
    expect(result).toBeNull();
    expect(store.statusMessage).toContain("valid Level");
  });

  it("blocks quick-create segment for non-structural parents", () => {
    const store = seedStore();
    const wallId = store.addNode("wall", { posX: 20, posY: 20, x2: 180, y2: 20 });

    const segmentId = store.addStructuralSegmentToNode(wallId);
    expect(segmentId).toBeNull();
    expect(store.statusMessage).toContain("Roof or Stair");
  });

  it("quick-creates a full structural bundle for a level", () => {
    const store = seedStore();
    const siteId = store.addNode("site", { posX: 0, posY: 0, width: 500, height: 400 });
    const buildingId = store.addNode("building", {
      posX: 20,
      posY: 20,
      width: 300,
      height: 240,
      parentId: siteId,
    });
    const levelId = store.addNode("level", {
      posX: 40,
      posY: 40,
      width: 220,
      height: 180,
      parentId: buildingId,
      elevation: 0,
      name: "Ground",
    });

    const created = store.addStructurePackToLevel(levelId);
    expect(created).toHaveLength(4);
    const structuralChildren = store.nodeList.filter(
      (node) =>
        node.parentId === levelId &&
        (node.nodeType === "slab" ||
          node.nodeType === "ceiling" ||
          node.nodeType === "roof" ||
          node.nodeType === "stair")
    );
    expect(structuralChildren).toHaveLength(4);
    expect(store.statusMessage).toContain("Added 4 structural nodes");
  });

  it("quick-creates only missing structural nodes in a level bundle", () => {
    const store = seedStore();
    const siteId = store.addNode("site", { posX: 0, posY: 0, width: 500, height: 400 });
    const buildingId = store.addNode("building", {
      posX: 20,
      posY: 20,
      width: 300,
      height: 240,
      parentId: siteId,
    });
    const levelId = store.addNode("level", {
      posX: 40,
      posY: 40,
      width: 220,
      height: 180,
      parentId: buildingId,
      elevation: 0,
      name: "Ground",
    });
    store.addNode("roof", {
      posX: 60,
      posY: 60,
      width: 180,
      height: 120,
      parentId: levelId,
      elevation: 3,
      name: "Roof",
    });

    const created = store.addStructurePackToLevel(levelId);
    expect(created).toHaveLength(3);
    const roofs = store.nodeList.filter((node) => node.parentId === levelId && node.nodeType === "roof");
    expect(roofs).toHaveLength(1);
  });

  it("no-ops structural bundle when all surfaces already exist", () => {
    const store = seedStore();
    const siteId = store.addNode("site", { posX: 0, posY: 0, width: 500, height: 400 });
    const buildingId = store.addNode("building", {
      posX: 20,
      posY: 20,
      width: 300,
      height: 240,
      parentId: siteId,
    });
    const levelId = store.addNode("level", {
      posX: 40,
      posY: 40,
      width: 220,
      height: 180,
      parentId: buildingId,
      elevation: 0,
      name: "Ground",
    });
    store.addNode("slab", { posX: 50, posY: 50, width: 200, height: 140, parentId: levelId });
    store.addNode("ceiling", { posX: 50, posY: 50, width: 200, height: 140, parentId: levelId });
    store.addNode("roof", { posX: 50, posY: 50, width: 200, height: 140, parentId: levelId });
    store.addNode("stair", { posX: 50, posY: 50, width: 200, height: 140, parentId: levelId });

    const created = store.addStructurePackToLevel(levelId);
    expect(created).toEqual([]);
    expect(store.statusMessage).toContain("already has slab, ceiling, roof, and stair");
  });

  it("blocks structural bundle quick-create for invalid level", () => {
    const store = seedStore();
    const wallId = store.addNode("wall", { posX: 20, posY: 20, x2: 180, y2: 20 });

    const created = store.addStructurePackToLevel(wallId);
    expect(created).toBeNull();
    expect(store.statusMessage).toContain("valid Level");
  });

  it("moves levels by swapping elevation order", () => {
    const store = seedStore();
    const siteId = store.addNode("site", { posX: 0, posY: 0, width: 500, height: 400 });
    const buildingId = store.addNode("building", {
      posX: 20,
      posY: 20,
      width: 300,
      height: 240,
      parentId: siteId,
    });
    const levelA = store.addNode("level", {
      posX: 30,
      posY: 30,
      width: 200,
      height: 160,
      parentId: buildingId,
      elevation: 0,
      name: "A",
    });
    const levelB = store.addNode("level", {
      posX: 30,
      posY: 30,
      width: 200,
      height: 160,
      parentId: buildingId,
      elevation: 3,
      name: "B",
    });

    expect(store.canMoveLevel(levelA, "up")).toBe(false);
    expect(store.canMoveLevel(levelA, "down")).toBe(true);
    expect(store.moveLevel(levelA, "down")).toBe(true);
    expect(store.nodes[levelA].elevation).toBe(3);
    expect(store.nodes[levelB].elevation).toBe(0);
  });

  it("duplicates a level with descendants and reselects the cloned level", () => {
    const store = seedStore();
    const siteId = store.addNode("site", { posX: 0, posY: 0, width: 500, height: 400 });
    const buildingId = store.addNode("building", {
      posX: 20,
      posY: 20,
      width: 300,
      height: 240,
      parentId: siteId,
    });
    const levelId = store.addNode("level", {
      posX: 30,
      posY: 30,
      width: 220,
      height: 180,
      parentId: buildingId,
      elevation: 0,
      name: "Ground",
    });
    store.addNode("level", {
      posX: 30,
      posY: 30,
      width: 220,
      height: 180,
      parentId: buildingId,
      elevation: 3,
      name: "Upper",
    });
    const wallId = store.addNode("wall", {
      posX: 40,
      posY: 50,
      x2: 180,
      y2: 50,
      parentId: levelId,
      thickness: 0.2,
    });
    const doorId = store.addNode("door", {
      posX: 100,
      posY: 50,
      width: 40,
      height: 10,
      parentId: wallId,
      rotation: 90,
    });

    const cloneLevelId = store.duplicateLevel(levelId);
    expect(cloneLevelId).toBeTruthy();
    expect(cloneLevelId).not.toBe(levelId);

    const cloneLevel = cloneLevelId ? store.nodes[cloneLevelId] : null;
    expect(cloneLevel?.nodeType).toBe("level");
    expect(cloneLevel?.parentId).toBe(buildingId);
    expect(cloneLevel?.elevation).toBe(6);
    expect(cloneLevel?.name).toContain("Copy");

    const clonedWall = store.nodeList.find(
      (node) =>
        node.nodeType === "wall" &&
        node.parentId === cloneLevelId &&
        node.id !== wallId &&
        node.posX === store.nodes[wallId].posX &&
        node.posY === store.nodes[wallId].posY &&
        node.x2 === store.nodes[wallId].x2 &&
        node.y2 === store.nodes[wallId].y2
    );
    expect(clonedWall).toBeTruthy();

    const clonedDoor = store.nodeList.find(
      (node) =>
        node.nodeType === "door" &&
        node.id !== doorId &&
        node.parentId === clonedWall?.id &&
        node.posX === store.nodes[doorId].posX &&
        node.posY === store.nodes[doorId].posY
    );
    expect(clonedDoor).toBeTruthy();
    expect(store.activeLevelId).toBe(cloneLevelId);
    expect(store.selectedNodeIds.has(cloneLevelId!)).toBe(true);
  });

  it("duplicates a level without descendants when requested", () => {
    const store = seedStore();
    const siteId = store.addNode("site", { posX: 0, posY: 0, width: 500, height: 400 });
    const buildingId = store.addNode("building", {
      posX: 20,
      posY: 20,
      width: 300,
      height: 240,
      parentId: siteId,
    });
    const levelId = store.addNode("level", {
      posX: 30,
      posY: 30,
      width: 220,
      height: 180,
      parentId: buildingId,
      elevation: 0,
      name: "Ground",
    });
    const wallId = store.addNode("wall", {
      posX: 40,
      posY: 50,
      x2: 180,
      y2: 50,
      parentId: levelId,
    });

    const cloneLevelId = store.duplicateLevel(levelId, { includeDescendants: false });
    expect(cloneLevelId).toBeTruthy();
    expect(
      store.nodeList.find(
        (node) => node.id !== wallId && node.nodeType === "wall" && node.parentId === cloneLevelId
      )
    ).toBeUndefined();
  });

  it("increments duplicate copy names", () => {
    const store = seedStore();
    const siteId = store.addNode("site", { posX: 0, posY: 0, width: 500, height: 400 });
    const buildingId = store.addNode("building", {
      posX: 20,
      posY: 20,
      width: 300,
      height: 240,
      parentId: siteId,
    });
    const levelId = store.addNode("level", {
      posX: 30,
      posY: 30,
      width: 220,
      height: 180,
      parentId: buildingId,
      elevation: 0,
      name: "Ground",
    });

    const copyA = store.duplicateLevel(levelId, { includeDescendants: false });
    const copyB = store.duplicateLevel(levelId, { includeDescendants: false });
    expect(copyA ? store.nodes[copyA]?.name : null).toBe("Ground Copy");
    expect(copyB ? store.nodes[copyB]?.name : null).toBe("Ground Copy 2");
  });

  it("blocks duplicating levels without a valid building parent", () => {
    const store = seedStore();
    const levelId = store.addNode("level", {
      posX: 10,
      posY: 10,
      width: 120,
      height: 80,
      parentId: null,
      elevation: 0,
      name: "Orphan",
    });

    expect(store.duplicateLevel(levelId)).toBeNull();
    expect(store.statusMessage).toContain("Building");
  });

  it("deleting an active non-ground level falls back to sibling context", () => {
    const store = seedStore();
    const siteId = store.addNode("site", { posX: 0, posY: 0, width: 500, height: 400 });
    const buildingId = store.addNode("building", {
      posX: 20,
      posY: 20,
      width: 300,
      height: 240,
      parentId: siteId,
    });
    const groundId = store.addNode("level", {
      posX: 30,
      posY: 30,
      width: 200,
      height: 160,
      parentId: buildingId,
      elevation: 0,
      name: "Ground",
    });
    const upperId = store.addNode("level", {
      posX: 30,
      posY: 30,
      width: 200,
      height: 160,
      parentId: buildingId,
      elevation: 3,
      name: "Upper",
    });

    store.selectNode(upperId);
    expect(store.activeLevelId).toBe(upperId);
    expect(store.deleteLevelWithFallback(upperId)).toBe(true);

    expect(store.nodes[upperId]).toBeUndefined();
    expect(store.activeLevelId).toBe(groundId);
    expect(store.selectedNodeIds.has(groundId)).toBe(true);
  });

  it("blocks deleting ground level", () => {
    const store = seedStore();
    const siteId = store.addNode("site", { posX: 0, posY: 0, width: 500, height: 400 });
    const buildingId = store.addNode("building", {
      posX: 20,
      posY: 20,
      width: 300,
      height: 240,
      parentId: siteId,
    });
    const groundId = store.addNode("level", {
      posX: 30,
      posY: 30,
      width: 200,
      height: 160,
      parentId: buildingId,
      elevation: 0,
      name: "Ground",
    });
    store.addNode("level", {
      posX: 30,
      posY: 30,
      width: 200,
      height: 160,
      parentId: buildingId,
      elevation: 3,
      name: "Upper",
    });

    expect(store.deleteLevelWithFallback(groundId)).toBe(false);
    expect(store.nodes[groundId]).toBeTruthy();
    expect(store.statusMessage).toContain("Ground level");
  });
});

describe("FloorPlanStore hierarchy cascade delete", () => {
  it("deleting a site cascades to building, level, and descendants", () => {
    const store = seedStore();
    const siteId = store.addNode("site", {
      posX: 0,
      posY: 0,
      width: 500,
      height: 500,
      name: "Lot",
    });
    const buildingId = store.addNode("building", {
      posX: 20,
      posY: 20,
      width: 240,
      height: 240,
      parentId: siteId,
      name: "House",
    });
    const levelId = store.addNode("level", {
      posX: 30,
      posY: 30,
      width: 220,
      height: 220,
      parentId: buildingId,
      name: "Ground",
    });
    const roomId = store.addNode("room", {
      posX: 40,
      posY: 40,
      width: 120,
      height: 80,
      parentId: levelId,
      name: "Living",
    });

    store.deleteNode(siteId);

    expect(store.nodes[siteId]).toBeUndefined();
    expect(store.nodes[buildingId]).toBeUndefined();
    expect(store.nodes[levelId]).toBeUndefined();
    expect(store.nodes[roomId]).toBeUndefined();
    expect(store.deletedNodeIds).toEqual(
      expect.arrayContaining([siteId, buildingId, levelId, roomId])
    );
  });

  it("deleteSelected removes selected parent and all descendants", () => {
    const store = seedStore();
    const siteId = store.addNode("site", {
      posX: 0,
      posY: 0,
      width: 500,
      height: 500,
    });
    const buildingId = store.addNode("building", {
      posX: 40,
      posY: 40,
      width: 220,
      height: 220,
      parentId: siteId,
    });
    const levelId = store.addNode("level", {
      posX: 40,
      posY: 40,
      width: 220,
      height: 220,
      parentId: buildingId,
    });
    const wallId = store.addNode("wall", {
      posX: 60,
      posY: 60,
      x2: 220,
      y2: 60,
      parentId: levelId,
    });
    const doorId = store.placeOpening("door", 140, 60, {
      defaultWidth: 40,
      defaultHeight: 10,
      name: "Front",
    });
    // Ensure wall/door are linked under this hierarchy branch.
    store.updateNode(doorId, { parentId: wallId });

    store.selectNode(buildingId);
    store.deleteSelected();

    expect(store.nodes[siteId]).toBeTruthy();
    expect(store.nodes[buildingId]).toBeUndefined();
    expect(store.nodes[levelId]).toBeUndefined();
    expect(store.nodes[wallId]).toBeUndefined();
    expect(store.nodes[doorId]).toBeUndefined();
  });
});

describe("FloorPlanStore.placeOpening", () => {
  it("auto-parents a door to the wall it's near and projects the position", () => {
    const store = seedStore();
    const wallId = store.addNode("wall", { posX: 0, posY: 0, x2: 200, y2: 0 });

    const doorId = store.placeOpening("door", 100, 12, {
      defaultWidth: 40,
      defaultHeight: 10,
      name: "Door",
    });
    const door = store.nodes[doorId];
    expect(door.parentId).toBe(wallId);
    expect(door.posX).toBe(100);
    expect(door.posY).toBe(0);
    // Horizontal wall → rotation ≈ 0 degrees
    expect(door.rotation).toBe(0);
  });

  it("inherits wall rotation so the 3D mesh aligns with the CSG opening", () => {
    const store = seedStore();
    // 45° wall from origin to (200, 200)
    store.addNode("wall", { posX: 0, posY: 0, x2: 200, y2: 200 });

    const windowId = store.placeOpening("window", 100, 110, {
      defaultWidth: 60,
      defaultHeight: 10,
      name: "Window",
    });
    const win = store.nodes[windowId];
    expect(win.rotation).toBeCloseTo(45, 5);
  });

  it("anchors the opening's (posX, posY) AT the wall projection point, " +
     "not offset by width/2", () => {
    // Regression guard (B1/B2 from review): if placeOpening ever stores
    // the top-left again, both 2D and 3D would render the opening beside
    // its hole instead of inside it.
    const store = seedStore();
    // 45° wall from (0,0) to (200,200); midpoint = (100, 100).
    store.addNode("wall", { posX: 0, posY: 0, x2: 200, y2: 200 });

    const doorId = store.placeOpening("door", 100, 100, {
      defaultWidth: 40,
      defaultHeight: 10,
      name: "Door",
    });
    const door = store.nodes[doorId];
    expect(door.posX).toBeCloseTo(100, 5);
    expect(door.posY).toBeCloseTo(100, 5);
    // And on a horizontal wall the centre-Y matches the wall Y (not
    // wall Y + height/2).
    store.addNode("wall", { posX: 0, posY: 400, x2: 200, y2: 400 });
    const doorH = store.placeOpening("door", 100, 400, {
      defaultWidth: 40,
      defaultHeight: 10,
      name: "Door",
    });
    expect(store.nodes[doorH].posY).toBe(400);
  });

  it("falls back to unparented placement when no wall is nearby", () => {
    const store = seedStore();
    store.addNode("wall", { posX: 0, posY: 0, x2: 100, y2: 0 });

    const doorId = store.placeOpening("door", 500, 500, {
      defaultWidth: 40,
      defaultHeight: 10,
      name: "Door",
    });
    const door = store.nodes[doorId];
    expect(door.parentId).toBeNull();
    expect(door.rotation).toBe(0);
    // Position preserves the click point (openings are not force-snapped here).
    expect(door.posX).toBe(500);
    expect(door.posY).toBe(500);
  });

  it("clamps openings away from wall endpoints", () => {
    const store = seedStore();
    const wallId = store.addNode("wall", { posX: 0, posY: 0, x2: 200, y2: 0 });

    const doorId = store.placeOpening("door", 0, 0, {
      defaultWidth: 40,
      defaultHeight: 10,
      name: "Edge Door",
    });
    const door = store.nodes[doorId];
    expect(door.parentId).toBe(wallId);
    // Half-width (20) + edge padding (4) => min centre at x=24.
    expect(door.posX).toBe(24);
    expect(door.posY).toBe(0);
  });

  it("prevents overlapping sibling openings on one wall", () => {
    const store = seedStore();
    const wallId = store.addNode("wall", { posX: 0, posY: 0, x2: 200, y2: 0 });

    const firstDoorId = store.placeOpening("door", 100, 0, {
      defaultWidth: 40,
      defaultHeight: 10,
      name: "Door 1",
    });
    const secondDoorId = store.placeOpening("door", 110, 0, {
      defaultWidth: 40,
      defaultHeight: 10,
      name: "Door 2",
    });

    const first = store.nodes[firstDoorId];
    const second = store.nodes[secondDoorId];
    expect(first.parentId).toBe(wallId);
    expect(second.parentId).toBe(wallId);
    // Desired x=110 is blocked by Door 1; nearest valid slot on this wall is 144.
    expect(second.posX).toBe(144);
    expect(second.posY).toBe(0);
  });

  it("falls back to unparented when nearby walls have no non-overlapping slot", () => {
    const store = seedStore();
    store.addNode("wall", { posX: 0, posY: 0, x2: 120, y2: 0 });

    store.placeOpening("door", 0, 0, {
      defaultWidth: 40,
      defaultHeight: 10,
      name: "Door A",
    });
    store.placeOpening("door", 120, 0, {
      defaultWidth: 40,
      defaultHeight: 10,
      name: "Door B",
    });

    const thirdDoorId = store.placeOpening("door", 60, 0, {
      defaultWidth: 40,
      defaultHeight: 10,
      name: "Door C",
    });
    const third = store.nodes[thirdDoorId];
    expect(third.parentId).toBeNull();
    expect(third.rotation).toBe(0);
    expect(third.posX).toBe(60);
    expect(third.posY).toBe(0);
  });
});

describe("FloorPlanStore.reparentOpeningToNearestWall", () => {
  it("re-snaps a door onto a different wall after a drag", () => {
    const store = seedStore();
    const firstWall = store.addNode("wall", { posX: 0, posY: 0, x2: 200, y2: 0 });
    const secondWall = store.addNode("wall", { posX: 0, posY: 200, x2: 200, y2: 200 });

    const doorId = store.placeOpening("door", 100, 12, {
      defaultWidth: 40,
      defaultHeight: 10,
      name: "Door",
    });
    expect(store.nodes[doorId].parentId).toBe(firstWall);

    // Simulate a drag onto the second wall, then re-snap.
    store.updateNode(doorId, { posX: 100, posY: 210 });
    store.reparentOpeningToNearestWall(doorId);
    expect(store.nodes[doorId].parentId).toBe(secondWall);
    expect(store.nodes[doorId].posY).toBe(200);
  });

  it("clears parentId when dragged away from every wall", () => {
    const store = seedStore();
    const wallId = store.addNode("wall", { posX: 0, posY: 0, x2: 200, y2: 0 });
    const doorId = store.placeOpening("door", 100, 12, {
      defaultWidth: 40,
      defaultHeight: 10,
      name: "Door",
    });
    expect(store.nodes[doorId].parentId).toBe(wallId);

    store.updateNode(doorId, { posX: 500, posY: 500 });
    store.reparentOpeningToNearestWall(doorId);
    expect(store.nodes[doorId].parentId).toBeNull();
    expect(store.nodes[doorId].rotation).toBe(0);
  });

  it("ignores non-opening node types", () => {
    const store = seedStore();
    const wallId = store.addNode("wall", { posX: 0, posY: 0, x2: 200, y2: 0 });
    const furnitureId = store.addNode("furniture", {
      posX: 100,
      posY: 10,
      width: 20,
      height: 20,
    });

    store.reparentOpeningToNearestWall(furnitureId);
    expect(store.nodes[furnitureId].parentId).toBeNull();
    // Wall still exists; nothing was mutated.
    expect(store.nodes[wallId]).toBeTruthy();
  });

  it("reparents to the nearest valid non-overlapping slot", () => {
    const store = seedStore();
    const targetWall = store.addNode("wall", { posX: 0, posY: 0, x2: 200, y2: 0 });
    store.addNode("wall", { posX: 0, posY: 200, x2: 200, y2: 200 });

    store.placeOpening("door", 100, 0, {
      defaultWidth: 40,
      defaultHeight: 10,
      name: "Door 1",
    });
    const movingDoorId = store.placeOpening("door", 100, 200, {
      defaultWidth: 40,
      defaultHeight: 10,
      name: "Door 2",
    });

    // Drag near Door 1 on target wall; reparenting should push Door 2 to a
    // valid adjacent slot rather than overlapping.
    store.updateNode(movingDoorId, { posX: 110, posY: 8 });
    store.reparentOpeningToNearestWall(movingDoorId);

    const moved = store.nodes[movingDoorId];
    expect(moved.parentId).toBe(targetWall);
    expect(moved.posX).toBe(144);
    expect(moved.posY).toBe(0);
  });
});

describe("FloorPlanStore wall/opening cascade behaviour", () => {
  it("moves wall-attached openings when the wall moves", () => {
    const store = seedStore();
    const wallId = store.addNode("wall", { posX: 0, posY: 0, x2: 200, y2: 0 });
    const doorId = store.placeOpening("door", 100, 0, {
      defaultWidth: 40,
      defaultHeight: 10,
      name: "Front",
    });

    store.moveNode(wallId, 40, 20);

    const wall = store.nodes[wallId];
    const door = store.nodes[doorId];
    expect(wall.posX).toBe(40);
    expect(wall.posY).toBe(20);
    expect(wall.x2).toBe(240);
    expect(wall.y2).toBe(20);
    expect(door.parentId).toBe(wallId);
    expect(door.posX).toBe(140);
    expect(door.posY).toBe(20);
  });

  it("deleting a wall cascades to child doors/windows", () => {
    const store = seedStore();
    const wallId = store.addNode("wall", { posX: 0, posY: 0, x2: 200, y2: 0 });
    const doorId = store.placeOpening("door", 100, 0, {
      defaultWidth: 40,
      defaultHeight: 10,
      name: "Front",
    });
    expect(store.nodes[doorId].parentId).toBe(wallId);

    store.deleteNode(wallId);
    expect(store.nodes[wallId]).toBeUndefined();
    expect(store.nodes[doorId]).toBeUndefined();
    expect(store.deletedNodeIds).toContain(wallId);
    expect(store.deletedNodeIds).toContain(doorId);
  });

  it("deleteSelected cascades wall children and clears selection", () => {
    const store = seedStore();
    const wallId = store.addNode("wall", { posX: 0, posY: 0, x2: 200, y2: 0 });
    const doorId = store.placeOpening("door", 100, 0, {
      defaultWidth: 40,
      defaultHeight: 10,
      name: "Front",
    });

    store.selectNode(wallId);
    store.deleteSelected();

    expect(store.nodes[wallId]).toBeUndefined();
    expect(store.nodes[doorId]).toBeUndefined();
    expect(store.selectedNodeIds.size).toBe(0);
    expect(store.deletedNodeIds).toContain(wallId);
    expect(store.deletedNodeIds).toContain(doorId);
  });
});

describe("FloorPlanStore asset references", () => {
  it("creates a scan node with default asset workflow metadata", () => {
    const store = seedStore();
    const scanId = store.createAssetReference("scan", 300, 260);
    const scan = store.nodes[scanId];

    expect(scan.nodeType).toBe("scan");
    expect(scan.width).toBeGreaterThan(0);
    expect(scan.height).toBeGreaterThan(0);
    expect(scan.opacity).toBeCloseTo(0.65, 5);
    expect(scan.properties).toBeTruthy();
    expect(scan.properties ? JSON.parse(scan.properties).lockAspectRatio : null).toBe(true);
  });

  it("keeps scan/guide nodes out of the annotations derived list", () => {
    const store = seedStore();
    const annotationId = store.addNode("annotation", { posX: 40, posY: 40 });
    const guideId = store.createAssetReference("guide", 120, 140);
    const scanId = store.createAssetReference("scan", 180, 200);

    expect(store.annotations.map((node) => node.id)).toEqual([annotationId]);
    expect(store.guides.map((node) => node.id)).toContain(guideId);
    expect(store.scans.map((node) => node.id)).toContain(scanId);
  });
});

describe("FloorPlanStore.getNodesForSave (diff payload)", () => {
  function makeLoadedStore(): { store: FloorPlanStore; ids: { wallA: string; wallB: string } } {
    const store = new FloorPlanStore();
    const now = new Date().toISOString();
    const wallA = "wall-a";
    const wallB = "wall-b";
    store.loadNodes(
      [
        {
          id: wallA,
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
        },
        {
          id: wallB,
          workspaceId: 1,
          homeId: 1,
          floorLevel: 0,
          parentId: null,
          nodeType: "wall",
          name: null,
          posX: 0, posY: 200, width: 0, height: 0, rotation: 0,
          x2: 200, y2: 200,
          wallHeight: 2.5, thickness: 0.15, elevation: 0,
          color: null, opacity: 1,
          linkedLocationId: null, linkedItemId: null, properties: null,
          createdAt: now, updatedAt: now, deletedAt: null,
        },
      ],
      1,
      0
    );
    return { store, ids: { wallA, wallB } };
  }

  it("returns an empty payload immediately after load (no changes)", () => {
    const { store } = makeLoadedStore();
    expect(store.getNodesForSave()).toEqual([]);
  });

  it("returns only mutated nodes on save, not the full set", () => {
    const { store, ids } = makeLoadedStore();
    store.updateNode(ids.wallA, { name: "Front" });
    const payload = store.getNodesForSave();
    expect(payload).toHaveLength(1);
    expect(payload[0].id).toBe(ids.wallA);
    expect(payload[0].name).toBe("Front");
  });

  it("includes newly added nodes with no prior baseline entry", () => {
    const { store } = makeLoadedStore();
    const newId = store.addNode("wall", { posX: 0, posY: 400, x2: 200, y2: 400 });
    const payload = store.getNodesForSave();
    expect(payload.map((n) => n.id)).toEqual([newId]);
  });

  it("returns an empty payload again after markSaved re-seeds the baseline", () => {
    const { store, ids } = makeLoadedStore();
    store.updateNode(ids.wallA, { name: "Front" });
    expect(store.getNodesForSave()).toHaveLength(1);
    store.markSaved();
    expect(store.getNodesForSave()).toEqual([]);
    store.updateNode(ids.wallB, { name: "Back" });
    const nextPayload = store.getNodesForSave();
    expect(nextPayload.map((n) => n.id)).toEqual([ids.wallB]);
  });

  it("prepareSave + markSaved preserves work done during an in-flight save", () => {
    // Regression: previously, a save that captured payload X then awaited
    // while the user added node Y would baseline Y as "saved" via the
    // zero-arg markSaved(), losing Y on the next save.
    const { store, ids } = makeLoadedStore();
    store.updateNode(ids.wallA, { name: "Front" });
    const captured = store.prepareSave();
    expect(captured.nodes.map((n) => n.id)).toEqual([ids.wallA]);

    // User adds a new node while the save is in flight.
    const addedId = store.addNode("wall", { posX: 0, posY: 400, x2: 200, y2: 400 });

    // Server round-trip completes; baseline only the refs we actually sent.
    store.markSaved(captured.sentRefs, captured.sentDeletedIds);

    // Sent node is now baselined, new node is still dirty and WILL ship next.
    const next = store.getNodesForSave();
    expect(next.map((n) => n.id)).toEqual([addedId]);
    expect(store.isDirty).toBe(true);
  });

  it("prepareSave + markSaved preserves a mutation that lands mid-save on an already-dirty node", () => {
    const { store, ids } = makeLoadedStore();
    store.updateNode(ids.wallA, { name: "v1" });
    const captured = store.prepareSave();

    // User edits the same node again while save is in flight — fresh ref.
    store.updateNode(ids.wallA, { name: "v2" });

    store.markSaved(captured.sentRefs, captured.sentDeletedIds);

    // The v2 ref !== v1 ref, so diff still ships wallA.
    const next = store.getNodesForSave();
    expect(next.map((n) => n.id)).toEqual([ids.wallA]);
    expect(next[0].name).toBe("v2");
  });

  it("markSaved() with no args baselines the full state (non-race callers)", () => {
    const { store, ids } = makeLoadedStore();
    store.updateNode(ids.wallA, { name: "Front" });
    store.markSaved();
    expect(store.getNodesForSave()).toEqual([]);
    expect(store.isDirty).toBe(false);
  });

  it("prepareSave + undo mid-flight: restored node reappears as dirty after save acks", () => {
    // Regression guard for the subtle invariant the fresh review flagged:
    //   1. User deletes node X (added to deletedNodeIds, removed from nodes).
    //   2. `prepareSave` captures the delete.
    //   3. Before the server acks, user hits Undo — X is restored.
    //   4. Server ack arrives; `markSaved(sentRefs, sentDeletedIds)` runs.
    // Expected: X is present in `this.nodes` but its restored reference
    // does NOT match the (now-cleared) `lastSavedNodes[X]` entry, so the
    // next save correctly re-ships X as an upsert. If the invariant ever
    // breaks, this test will fail.
    const { store, ids } = makeLoadedStore();
    // Mutate wallA so we have something to commit in history.
    store.updateNode(ids.wallA, { name: "Front" });
    store.commitChange();

    // User deletes wallB; we capture the save as if it were in flight.
    store.deleteNode(ids.wallB);
    const captured = store.prepareSave();
    expect(captured.sentDeletedIds).toContain(ids.wallB);

    // Mid-flight: user hits Undo — wallB comes back.
    store.undo();
    expect(store.nodes[ids.wallB]).toBeDefined();

    // Server ack arrives; baseline only what we sent.
    store.markSaved(captured.sentRefs, captured.sentDeletedIds);

    // wallB is restored client-side but the server still thinks it's
    // deleted. Next save must ship wallB as an upsert.
    const nextPayload = store.getNodesForSave();
    expect(nextPayload.map((n) => n.id)).toContain(ids.wallB);
  });
});

describe("FloorPlanStore.moveNode wall-child rigid translation", () => {
  it("moves door/window children along with their parent wall", () => {
    const store = seedStore();
    // Disable snap so the test isn't at the mercy of opening-placement
    // nudges and grid rounding for non-aligned positions.
    store.snapToGrid = false;
    const wallId = store.addNode("wall", { posX: 0, posY: 0, x2: 400, y2: 0 });
    const doorId = store.placeOpening("door", 300, 0, {
      defaultWidth: 40,
      defaultHeight: 10,
      name: "Back",
    });
    const windowId = store.placeOpening("window", 60, 0, {
      defaultWidth: 40,
      defaultHeight: 10,
      name: "Front",
    });

    const doorBefore = store.nodes[doorId];
    const windowBefore = store.nodes[windowId];

    store.moveNode(wallId, 80, 20);

    const wall = store.nodes[wallId];
    expect(wall.posX).toBe(80);
    expect(wall.posY).toBe(20);
    expect(wall.x2).toBe(480);
    expect(wall.y2).toBe(20);

    // Children translate rigidly by the applied wall delta.
    expect(store.nodes[doorId].posX).toBe(doorBefore.posX + 80);
    expect(store.nodes[doorId].posY).toBe(doorBefore.posY + 20);
    expect(store.nodes[windowId].posX).toBe(windowBefore.posX + 80);
    expect(store.nodes[windowId].posY).toBe(windowBefore.posY + 20);
  });

  it("does not drag non-opening children (e.g. a room parented to a wall would not exist, but guards the type check)", () => {
    const store = seedStore();
    const wallId = store.addNode("wall", { posX: 0, posY: 0, x2: 200, y2: 0 });
    // Create a furniture node and reparent it to the wall (unusual but possible).
    const furnitureId = store.addNode("furniture", {
      posX: 50, posY: 50, width: 30, height: 30, name: "Chair",
    });
    store.updateNode(furnitureId, { parentId: wallId });
    const before = store.nodes[furnitureId];

    store.moveNode(wallId, 100, 0);

    // Non-opening child should not be rigidly translated.
    expect(store.nodes[furnitureId].posX).toBe(before.posX);
    expect(store.nodes[furnitureId].posY).toBe(before.posY);
  });
});

describe("FloorPlanStore.reparentOpeningToNearestWall", () => {
  it("reparents a door onto a different wall after it is dragged near", () => {
    const store = seedStore();
    const wallA = store.addNode("wall", { posX: 0, posY: 0, x2: 200, y2: 0 });
    const wallB = store.addNode("wall", { posX: 0, posY: 300, x2: 200, y2: 300 });

    const doorId = store.placeOpening("door", 100, 0, {
      defaultWidth: 40,
      defaultHeight: 10,
      name: "Front",
    });
    expect(store.nodes[doorId].parentId).toBe(wallA);

    // Simulate the drag: move the door near wall B, then reparent.
    store.moveNode(doorId, 0, 300);
    store.reparentOpeningToNearestWall(doorId);

    expect(store.nodes[doorId].parentId).toBe(wallB);
    // Position snapped onto wall B's line (y=300).
    expect(store.nodes[doorId].posY).toBeCloseTo(300, 0);
  });

  it("leaves non-opening nodes alone", () => {
    const store = seedStore();
    const wallId = store.addNode("wall", { posX: 0, posY: 0, x2: 200, y2: 0 });
    const furnitureId = store.addNode("furniture", {
      posX: 10, posY: 10, width: 30, height: 30, name: "Chair",
    });
    const before = store.nodes[furnitureId];
    store.reparentOpeningToNearestWall(furnitureId);
    expect(store.nodes[furnitureId]).toEqual(before);
    // Unused var silencer.
    void wallId;
  });
});

describe("FloorPlanStore.nudgeSelection history coalescing", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });
  afterEach(() => {
    vi.useRealTimers();
  });

  it("collapses rapid arrow-key nudges into one undo entry", () => {
    const store = seedStore();
    const id = store.addNode("furniture", {
      posX: 100, posY: 100, width: 30, height: 30, name: "Chair",
    });
    // Commit a checkpoint so there's a prior snapshot to undo back to.
    store.commitChange();
    store.selectNode(id);

    // Three rapid nudges within the 250ms coalescing window.
    store.nudgeSelection(20, 0);
    store.nudgeSelection(20, 0);
    store.nudgeSelection(20, 0);

    // Advance just under the debounce — position has moved but no commit yet.
    vi.advanceTimersByTime(240);
    expect(store.nodes[id].posX).toBe(160);

    // Letting the timer complete commits once.
    vi.advanceTimersByTime(20);

    // Undo collapses all three nudges back to the pre-burst checkpoint.
    store.undo();
    expect(store.nodes[id].posX).toBe(100);
  });

  it("does not nudge when the selection is empty", () => {
    const store = seedStore();
    expect(() => store.nudgeSelection(10, 0)).not.toThrow();
  });
});

describe("FloorPlanStore.duplicateLevel", () => {
  function buildBuildingWithLevel(store: FloorPlanStore) {
    const siteId = store.addNode("site", {
      posX: 0, posY: 0, width: 800, height: 800, name: "Lot",
    });
    const buildingId = store.addNode("building", {
      posX: 0, posY: 0, width: 600, height: 600, parentId: siteId, name: "House",
    });
    const levelId = store.addNode("level", {
      posX: 0, posY: 0, width: 400, height: 400, parentId: buildingId, name: "Ground",
    });
    const roomId = store.addNode("room", {
      posX: 20, posY: 20, width: 100, height: 100, parentId: levelId, name: "Kitchen",
    });
    const wallId = store.addNode("wall", {
      posX: 20, posY: 20, x2: 120, y2: 20, parentId: roomId,
    });
    return { siteId, buildingId, levelId, roomId, wallId };
  }

  it("assigns fresh ids to the level and every descendant", () => {
    const store = seedStore();
    const { levelId, roomId, wallId } = buildBuildingWithLevel(store);

    const newLevelId = store.duplicateLevel(levelId);
    expect(newLevelId).not.toBeNull();
    expect(newLevelId).not.toBe(levelId);

    const newLevel = store.nodes[newLevelId!];
    expect(newLevel.nodeType).toBe("level");
    expect(newLevel.parentId).toBe(store.nodes[levelId].parentId);

    // New room is a child of the new level, not the original.
    const newRooms = Object.values(store.nodes).filter(
      (n) => n.nodeType === "room" && n.parentId === newLevelId
    );
    expect(newRooms).toHaveLength(1);
    const newRoomId = newRooms[0].id;
    expect(newRoomId).not.toBe(roomId);

    // New wall is a child of the new room.
    const newWalls = Object.values(store.nodes).filter(
      (n) => n.nodeType === "wall" && n.parentId === newRoomId
    );
    expect(newWalls).toHaveLength(1);
    expect(newWalls[0].id).not.toBe(wallId);
  });

  it("elevates the duplicated level and gives it a unique name", () => {
    const store = seedStore();
    const { levelId } = buildBuildingWithLevel(store);
    const originalElevation = store.nodes[levelId].elevation ?? 0;

    const newLevelId = store.duplicateLevel(levelId);
    const newLevel = store.nodes[newLevelId!];
    expect(newLevel.elevation).toBeGreaterThan(originalElevation);
    expect(newLevel.name).not.toBe(store.nodes[levelId].name);
  });

  it("returns null when duplicating a level with no parent building", () => {
    const store = seedStore();
    const orphanLevel = store.addNode("level", {
      posX: 0, posY: 0, width: 100, height: 100, name: "Orphan",
    });
    expect(store.duplicateLevel(orphanLevel)).toBeNull();
  });

  it("skips descendants when includeDescendants is false", () => {
    const store = seedStore();
    const { levelId } = buildBuildingWithLevel(store);
    const newLevelId = store.duplicateLevel(levelId, { includeDescendants: false });
    expect(newLevelId).not.toBeNull();
    const newChildren = Object.values(store.nodes).filter((n) => n.parentId === newLevelId);
    expect(newChildren).toHaveLength(0);
  });
});

describe("FloorPlanStore undo/redo integrity", () => {
  it("restores multi-selection via undo after it was dropped", () => {
    const store = seedStore();
    const a = store.addNode("wall", { posX: 0, posY: 0, x2: 100, y2: 0 });
    const b = store.addNode("wall", { posX: 0, posY: 100, x2: 100, y2: 100 });

    // Snapshot #1: selection [a, b]
    store.setSelection([a, b]);
    store.updateNode(a, { name: "Front" });
    store.commitChange();

    // Snapshot #2: selection cleared, different state.
    store.clearSelection();
    store.updateNode(b, { name: "Back" });
    store.commitChange();

    expect(store.selectedNodeIds.size).toBe(0);

    // Undo restores snapshot #1, including the captured selection.
    store.undo();
    expect(store.selectedNodeIds.has(a)).toBe(true);
    expect(store.selectedNodeIds.has(b)).toBe(true);
  });

  it("redo replays a move that was undone", () => {
    const store = seedStore();
    const id = store.addNode("furniture", {
      posX: 0, posY: 0, width: 40, height: 40, name: "Chair",
    });
    store.moveNode(id, 60, 0);
    store.commitChange();
    expect(store.nodes[id].posX).toBe(60);

    store.undo();
    expect(store.nodes[id].posX).toBe(0);

    store.redo();
    expect(store.nodes[id].posX).toBe(60);
  });

  it("decouples snapshots from live mutations (no cross-contamination)", () => {
    const store = seedStore();
    const id = store.addNode("furniture", {
      posX: 0, posY: 0, width: 40, height: 40, name: "Chair",
    });

    store.moveNode(id, 60, 0);
    store.commitChange();
    const snapshotState = store.nodes[id];

    // Further mutation should not touch the snapshot's node reference.
    store.moveNode(id, 20, 0);
    store.commitChange();
    expect(store.nodes[id]).not.toBe(snapshotState);
    expect(snapshotState.posX).toBe(60);
    expect(store.nodes[id].posX).toBe(80);

    store.undo();
    expect(store.nodes[id].posX).toBe(60);
  });
});

describe("FloorPlanStore.autoDetectSpacesAndZones (reactive flow)", () => {
  it("materializes a detected square as a Room node", () => {
    const store = seedStore();
    store.addNode("wall", { posX: 0, posY: 0, x2: 200, y2: 0 });
    store.addNode("wall", { posX: 200, posY: 0, x2: 200, y2: 200 });
    store.addNode("wall", { posX: 200, posY: 200, x2: 0, y2: 200 });
    store.addNode("wall", { posX: 0, posY: 200, x2: 0, y2: 0 });

    const summary = store.autoDetectSpacesAndZones();
    expect(summary.detected).toBe(1);
    expect(summary.created).toBe(1);

    const rooms = Object.values(store.nodes).filter(
      (n) => n.nodeType === "room" && n.properties?.includes("autoDetected")
    );
    expect(rooms).toHaveLength(1);
  });

  it("emits a zone (not a room) for an all-fence cycle", () => {
    const store = seedStore();
    store.addNode("fence", { posX: 0, posY: 0, x2: 200, y2: 0 });
    store.addNode("fence", { posX: 200, posY: 0, x2: 200, y2: 200 });
    store.addNode("fence", { posX: 200, posY: 200, x2: 0, y2: 200 });
    store.addNode("fence", { posX: 0, posY: 200, x2: 0, y2: 0 });

    const summary = store.autoDetectSpacesAndZones();
    expect(summary.created).toBe(1);

    const zones = Object.values(store.nodes).filter(
      (n) => n.nodeType === "zone" && n.properties?.includes("autoDetected")
    );
    expect(zones).toHaveLength(1);
  });

  it("lands a single undo entry for the whole pass", () => {
    const store = seedStore();
    store.addNode("wall", { posX: 0, posY: 0, x2: 200, y2: 0 });
    store.addNode("wall", { posX: 200, posY: 0, x2: 200, y2: 200 });
    store.addNode("wall", { posX: 200, posY: 200, x2: 0, y2: 200 });
    store.addNode("wall", { posX: 0, posY: 200, x2: 0, y2: 0 });

    const summary = store.autoDetectSpacesAndZones();
    expect(summary.created).toBe(1);

    // One undo should remove the auto-detected room but keep the walls.
    store.undo();
    const rooms = Object.values(store.nodes).filter((n) => n.nodeType === "room");
    expect(rooms).toHaveLength(0);
    const walls = Object.values(store.nodes).filter((n) => n.nodeType === "wall");
    expect(walls).toHaveLength(4);
  });

  it("no-op summary when there are no enclosed cycles", () => {
    const store = seedStore();
    store.addNode("wall", { posX: 0, posY: 0, x2: 200, y2: 0 });
    store.addNode("wall", { posX: 0, posY: 100, x2: 200, y2: 100 });

    const summary = store.autoDetectSpacesAndZones();
    expect(summary.detected).toBe(0);
    expect(summary.created).toBe(0);
  });
});

describe("FloorPlanStore.reparentOpeningToNearestWall floor scoping", () => {
  it("does not reparent a door across floors even when a cross-floor wall is closer", () => {
    const store = seedStore();
    store.floorLevel = 0;

    // Floor 0 wall, far from the door.
    const floor0Wall = store.addNode("wall", { posX: 0, posY: 0, x2: 200, y2: 0 });
    // Floor 1 wall, same X/Y coordinates — geometrically on top of the door.
    // If the reparent ignored floor, this wall would win.
    store.floorLevel = 1;
    store.addNode("wall", { posX: 0, posY: 500, x2: 200, y2: 500 });

    // Place a door on the floor-1 wall (store is currently on floor 1).
    const doorId = store.placeOpening("door", 100, 500, {
      defaultWidth: 40,
      defaultHeight: 10,
      name: "Upstairs",
    });

    // Now switch the store "active floor" back to 0 and move the door
    // down onto the floor-0 wall's position, then reparent.
    store.floorLevel = 0;
    // Manually set the door's floorLevel to 0 and move — simulate a
    // user who has dragged it to floor 0 in the 3D view.
    store.updateNode(doorId, { floorLevel: 0, posY: 0 });
    store.reparentOpeningToNearestWall(doorId);

    // The door should attach to the floor-0 wall since it's on floor 0.
    const door = store.nodes[doorId];
    expect(door.floorLevel).toBe(0);
    expect(door.parentId).toBe(floor0Wall);
  });
});

describe("FloorPlanStore.withHistoryBatch throw safety", () => {
  it("does not push a snapshot when the mutator throws", () => {
    const store = seedStore();
    store.addNode("wall", { posX: 0, posY: 0, x2: 100, y2: 0 });
    store.commitChange();
    const undoableBefore = store.canUndo;

    expect(() =>
      store.withHistoryBatch(() => {
        store.updateNode(
          // this id doesn't exist; updateNode is a no-op, but let's force a throw:
          "nonexistent",
          { posX: 50 }
        );
        throw new Error("boom");
      })
    ).toThrow("boom");

    // No new undo entry from the failed batch.
    expect(store.canUndo).toBe(undoableBefore);
  });
});

describe("FloorPlanStore childrenByParentId derivation", () => {
  it("indexes children by parentId and reflects updates", () => {
    const store = seedStore();
    const parentId = store.addNode("room", {
      posX: 0, posY: 0, width: 200, height: 200, name: "Kitchen",
    });
    const a = store.addNode("furniture", {
      posX: 10, posY: 10, width: 20, height: 20, parentId, name: "Chair",
    });
    const b = store.addNode("furniture", {
      posX: 40, posY: 40, width: 20, height: 20, parentId, name: "Table",
    });

    const children = store.childrenByParentId.get(parentId) ?? [];
    expect(children.map((n) => n.id).sort()).toEqual([a, b].sort());

    // Moving a child to a different parent should drop it from this bucket.
    const otherRoom = store.addNode("room", {
      posX: 300, posY: 0, width: 100, height: 100, name: "Living",
    });
    store.updateNode(a, { parentId: otherRoom });

    expect(store.childrenByParentId.get(parentId)?.map((n) => n.id)).toEqual([b]);
    expect(store.childrenByParentId.get(otherRoom)?.map((n) => n.id)).toEqual([a]);
  });
});

describe("FloorPlanStore.generateDefaultPlanFromWizard", () => {
  it("creates a starter hierarchy from wizard answers", () => {
    const store = seedStore();

    const result = store.generateDefaultPlanFromWizard({
      template: "single-family",
      footprint: "standard",
      levels: 2,
      bedrooms: 3,
      bathrooms: 2,
      includeGarage: true,
      includeDining: true,
      includeOffice: false,
      furnished: true,
      replaceExisting: false,
    });

    expect(result.levelIds).toHaveLength(2);
    expect(result.createdNodeCount).toBeGreaterThan(0);
    expect(store.nodeList.filter((n) => n.nodeType === "site")).toHaveLength(1);
    expect(store.nodeList.filter((n) => n.nodeType === "building")).toHaveLength(1);
    expect(store.nodeList.filter((n) => n.nodeType === "level")).toHaveLength(2);
    expect(store.nodeList.some((n) => n.nodeType === "room")).toBe(true);
    expect(store.nodeList.some((n) => n.nodeType === "wall")).toBe(true);
    expect(store.nodeList.some((n) => n.nodeType === "door")).toBe(true);
    expect(store.nodeList.some((n) => n.nodeType === "window")).toBe(true);

    const windowLevelIds = new Set(
      store.nodeList
        .filter((node) => node.nodeType === "window")
        .map((windowNode) => {
          const wall =
            windowNode.parentId && store.nodes[windowNode.parentId]
              ? store.nodes[windowNode.parentId]
              : null;
          return wall && wall.nodeType === "wall" ? wall.parentId : null;
        })
        .filter((levelId): levelId is string => !!levelId)
    );
    expect(result.levelIds.every((levelId) => windowLevelIds.has(levelId))).toBe(true);

    const rooms = store.nodeList.filter((node) => node.nodeType === "room");
    const kitchen = rooms.find((node) => (node.name ?? "").toLowerCase().includes("kitchen"));
    const bathroom = rooms.find((node) => (node.name ?? "").toLowerCase().includes("bathroom"));
    expect(kitchen).toBeTruthy();
    expect(bathroom).toBeTruthy();
    expect((kitchen?.width ?? 0) * (kitchen?.height ?? 0)).toBeGreaterThanOrEqual(
      (bathroom?.width ?? 0) * (bathroom?.height ?? 0)
    );
  });

  it("can replace existing nodes when requested", () => {
    const store = seedStore();
    const staleWallId = store.addNode("wall", { posX: 0, posY: 0, x2: 100, y2: 0 });

    const result = store.generateDefaultPlanFromWizard({
      template: "apartment",
      footprint: "compact",
      levels: 1,
      bedrooms: 1,
      bathrooms: 1,
      includeGarage: false,
      includeDining: false,
      includeOffice: false,
      furnished: false,
      replaceExisting: true,
    });

    expect(result.replacedExisting).toBe(true);
    expect(store.nodes[staleWallId]).toBeUndefined();
    expect(store.deletedNodeIds).toContain(staleWallId);
  });

  it("uses apartment room program defaults", () => {
    const store = seedStore();

    store.generateDefaultPlanFromWizard({
      template: "apartment",
      footprint: "standard",
      levels: 1,
      bedrooms: 1,
      bathrooms: 1,
      includeGarage: true,
      includeDining: true,
      includeOffice: false,
      furnished: false,
      replaceExisting: false,
    });

    const building = store.nodeList.find((node) => node.nodeType === "building");
    expect(building?.name).toBe("Apartment Unit");
    const roomNames = store.nodeList
      .filter((node) => node.nodeType === "room")
      .map((node) => (node.name ?? "").toLowerCase());
    expect(roomNames.some((name) => name.includes("living room"))).toBe(true);
    expect(roomNames.some((name) => name.includes("kitchen"))).toBe(true);
    expect(roomNames.some((name) => name.includes("entry"))).toBe(false);
    expect(roomNames.some((name) => name.includes("garage"))).toBe(false);
  });
});
