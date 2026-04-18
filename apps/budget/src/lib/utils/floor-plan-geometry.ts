/**
 * Pure geometry helpers for floor-plan wall / opening placement.
 *
 * These functions are extracted from `FloorPlanStore` so the math is
 * testable without a reactive store instance and can be reused from
 * multiple call sites without coupling to store internals. Every function
 * takes the relevant node slice as an argument rather than reading from
 * `this`, which makes them trivial to cover in unit tests.
 */

import type { FloorPlanNode } from "$core/schema/home/home-floor-plan-nodes";

export type WallProjection = {
  wallId: string;
  projectedX: number;
  projectedY: number;
  distance: number;
  along: number;
  length: number;
  startX: number;
  startY: number;
  ux: number;
  uy: number;
};

export type OpeningPlacement = {
  wallId: string;
  posX: number;
  posY: number;
  rotation: number;
};

const OPENING_EDGE_PADDING = 4;
const OPENING_MIN_GAP = 4;

/**
 * Project a point onto a wall segment in store (pixel) space. Returns
 * `null` for zero-length walls or non-wall nodes.
 */
export function projectPointOnWall(
  wall: FloorPlanNode,
  x: number,
  y: number
): WallProjection | null {
  if (wall.nodeType !== "wall") return null;
  const startX = wall.posX;
  const startY = wall.posY;
  const endX = wall.x2 ?? startX;
  const endY = wall.y2 ?? startY;
  const dx = endX - startX;
  const dy = endY - startY;
  const length = Math.hypot(dx, dy);
  if (length < 1) return null;
  const ux = dx / length;
  const uy = dy / length;
  const vx = x - startX;
  const vy = y - startY;
  const alongUnclamped = vx * ux + vy * uy;
  const along = Math.max(0, Math.min(length, alongUnclamped));
  const projectedX = startX + ux * along;
  const projectedY = startY + uy * along;
  const distance = Math.hypot(x - projectedX, y - projectedY);
  return {
    wallId: wall.id,
    projectedX,
    projectedY,
    distance,
    along,
    length,
    startX,
    startY,
    ux,
    uy,
  };
}

/**
 * Find the closest non-overlapping opening centre on a wall for the given
 * opening width. Returns null when the wall has no valid placement.
 *
 * `openingsOnWall` is the full list of door/window nodes whose `parentId`
 * equals this wall. Passing them in keeps the function pure — the caller
 * decides which walls/openings are in scope.
 */
export function resolveOpeningCenterAlongWall(
  projection: WallProjection,
  openingWidth: number,
  openingsOnWall: FloorPlanNode[],
  excludeOpeningId?: string
): number | null {
  const half = Math.max(1, openingWidth) / 2;
  const minCenter = half + OPENING_EDGE_PADDING;
  const maxCenter = projection.length - half - OPENING_EDGE_PADDING;
  if (maxCenter < minCenter) return null;

  const desired = Math.max(minCenter, Math.min(maxCenter, projection.along));
  const blocked: Array<[number, number]> = [];

  for (const node of openingsOnWall) {
    if (excludeOpeningId && node.id === excludeOpeningId) continue;
    const existingHalf = Math.max(1, node.width || (node.nodeType === "door" ? 40 : 60)) / 2;
    const existingAlongRaw =
      (node.posX - projection.startX) * projection.ux +
      (node.posY - projection.startY) * projection.uy;
    const existingAlong = Math.max(0, Math.min(projection.length, existingAlongRaw));
    const radius = half + existingHalf + OPENING_MIN_GAP;
    const start = Math.max(minCenter, existingAlong - radius);
    const end = Math.min(maxCenter, existingAlong + radius);
    if (start <= end) blocked.push([start, end]);
  }

  if (blocked.length === 0) return desired;
  blocked.sort((a, b) => a[0] - b[0]);
  const merged: Array<[number, number]> = [];
  for (const [start, end] of blocked) {
    const last = merged[merged.length - 1];
    if (!last || start > last[1]) {
      merged.push([start, end]);
    } else {
      last[1] = Math.max(last[1], end);
    }
  }

  const allowed: Array<[number, number]> = [];
  let cursor = minCenter;
  for (const [start, end] of merged) {
    if (cursor < start) allowed.push([cursor, start]);
    cursor = Math.max(cursor, end);
  }
  if (cursor < maxCenter) allowed.push([cursor, maxCenter]);
  if (allowed.length === 0) return null;

  for (const [start, end] of allowed) {
    if (desired >= start && desired <= end) return desired;
  }

  // Every `allowed` interval is non-empty (start <= end after the merge
  // pass above), so `bestDist` will always be beaten by at least one
  // candidate. We keep the explicit `Infinity` sentinel so a future
  // refactor that allows zero-width `allowed` entries is caught — if
  // `bestDist` ever stays `Infinity`, something about the interval
  // construction is wrong and we'd rather return `null` than a door
  // placed at an unvalidated position.
  let best: number | null = null;
  let bestDist = Number.POSITIVE_INFINITY;
  for (const [start, end] of allowed) {
    for (const candidate of [start, end]) {
      const dist = Math.abs(candidate - desired);
      if (dist < bestDist) {
        best = candidate;
        bestDist = dist;
      }
    }
  }
  return best;
}

/**
 * Return the nearest valid wall placement for a door/window. "Valid" means
 * the opening fits within the wall extents and does not overlap sibling
 * openings on the same wall. Returns `null` if no wall within
 * `maxDistance` has a free slot.
 */
export function findOpeningPlacement(
  walls: FloorPlanNode[],
  allOpenings: FloorPlanNode[],
  x: number,
  y: number,
  openingWidth: number,
  maxDistance = 30,
  excludeOpeningId?: string
): OpeningPlacement | null {
  const candidates: WallProjection[] = [];
  for (const wall of walls) {
    const projection = projectPointOnWall(wall, x, y);
    if (!projection) continue;
    if (projection.distance <= maxDistance) candidates.push(projection);
  }
  candidates.sort((a, b) => a.distance - b.distance);

  for (const candidate of candidates) {
    const openingsOnWall = allOpenings.filter((o) => o.parentId === candidate.wallId);
    const centerAlong = resolveOpeningCenterAlongWall(
      candidate,
      openingWidth,
      openingsOnWall,
      excludeOpeningId
    );
    if (centerAlong === null) continue;
    const posX = candidate.startX + candidate.ux * centerAlong;
    const posY = candidate.startY + candidate.uy * centerAlong;
    const rotation = (Math.atan2(candidate.uy, candidate.ux) * 180) / Math.PI;
    return {
      wallId: candidate.wallId,
      posX,
      posY,
      rotation,
    };
  }
  return null;
}

/**
 * Return the wall whose segment is closest to `(x, y)` within `maxDistance`
 * pixels, plus the projected point on that wall. Used to snap doors and
 * windows onto walls at creation time and on drag.
 */
export function findNearestWall(
  walls: FloorPlanNode[],
  x: number,
  y: number,
  maxDistance = 30
): { wallId: string; projectedX: number; projectedY: number } | null {
  let best: WallProjection | null = null;
  for (const wall of walls) {
    const projection = projectPointOnWall(wall, x, y);
    if (!projection) continue;
    if (projection.distance <= maxDistance && (!best || projection.distance < best.distance)) {
      best = projection;
    }
  }
  if (!best) return null;
  return {
    wallId: best.wallId,
    projectedX: best.projectedX,
    projectedY: best.projectedY,
  };
}
