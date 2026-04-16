/**
 * Unit tests for the floor-plan store's wall-snap + opening placement logic.
 *
 * The behaviour under test: doors/windows created via the tool snap onto
 * the nearest wall, inheriting the wall's orientation so the 3D CSG opening
 * and the 3D mesh align. The same helper is used from both the 2D canvas
 * and the 3D scene, so view-switching preserves door/window placement.
 */

import { describe, expect, it } from "vitest";
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
    // Position is snapped to the grid but otherwise respects the click point.
    expect(door.posX).toBe(500);
    expect(door.posY).toBe(500);
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
});

describe("FloorPlanStore — orphaned opening after wall deletion", () => {
  it("door with parentId pointing at a deleted wall is still rendered", () => {
    // Regression guard: when a user deletes a wall that has openings
    // attached, those openings keep their `parentId` in the client store
    // until the next reload (the server trims them on save via
    // `deleteOrphanOpenings`). Renderers must tolerate the dangling
    // reference without crashing, and the store's derived filters must
    // stay consistent.
    const store = seedStore();
    const wallId = store.addNode("wall", { posX: 0, posY: 0, x2: 200, y2: 0 });
    const doorId = store.placeOpening("door", 100, 0, {
      defaultWidth: 40,
      defaultHeight: 10,
      name: "Front",
    });
    expect(store.nodes[doorId].parentId).toBe(wallId);

    store.deleteNode(wallId);

    // Door still exists on the client and still references the deleted wall.
    const door = store.nodes[doorId];
    expect(door).toBeTruthy();
    expect(door.parentId).toBe(wallId);

    // The live walls array no longer contains the deleted id; it lives in
    // `deletedNodeIds` until the next save flushes it.
    expect(store.walls.find((n) => n.id === wallId)).toBeUndefined();
    expect(store.deletedNodeIds).toContain(wallId);

    // Doors list still includes the orphaned door — renderers get it via
    // `store.doors` and tolerate the dangling parentId (3D scene-content
    // builds `wallOpenings.get(deletedId) === undefined` and skips the cut).
    expect(store.doors.find((n) => n.id === doorId)).toBeTruthy();

    // Re-snapping the door clears the stale parentId once the user drags
    // it away from any wall.
    store.reparentOpeningToNearestWall(doorId);
    expect(store.nodes[doorId].parentId).toBeNull();
  });
});
