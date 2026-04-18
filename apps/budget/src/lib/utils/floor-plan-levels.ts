/**
 * Pure level-tree helpers for floor-plan multi-storey navigation.
 *
 * Handles sorting levels by elevation, collecting a level's descendant
 * subtree, and generating unique level names. Extracted from
 * `FloorPlanStore` so each helper can be covered directly and shared
 * without coupling to the reactive shell.
 */

import type { FloorPlanNode } from "$core/schema/home/home-floor-plan-nodes";

/**
 * Order building levels bottom-to-top by elevation, falling back to name
 * and id for deterministic output when elevations tie.
 */
export function sortLevels(levels: FloorPlanNode[]): FloorPlanNode[] {
  return [...levels].sort((a, b) => {
    const elevationDiff = (a.elevation ?? 0) - (b.elevation ?? 0);
    if (elevationDiff !== 0) return elevationDiff;
    const aName = (a.name ?? "").toLowerCase();
    const bName = (b.name ?? "").toLowerCase();
    if (aName !== bName) return aName.localeCompare(bName);
    return a.id.localeCompare(b.id);
  });
}

/**
 * Filter a node list down to the `level` children of a specific building.
 * Does not sort — callers that need elevation-ordered output should
 * chain through `sortLevels`.
 */
export function getBuildingLevels(
  nodeList: FloorPlanNode[],
  buildingId: string
): FloorPlanNode[] {
  return nodeList.filter(
    (node) => node.nodeType === "level" && node.parentId === buildingId
  );
}

/**
 * Lowercase-normalized set of existing level names for a building, with
 * an optional exclusion (used during rename / duplicate flows).
 */
export function buildLevelNameSet(
  buildingLevels: FloorPlanNode[],
  excludeId?: string
): Set<string> {
  const names = new Set<string>();
  for (const level of buildingLevels) {
    if (excludeId && level.id === excludeId) continue;
    const name = (level.name ?? "").trim().toLowerCase();
    if (name) names.add(name);
  }
  return names;
}

/**
 * Return a level name that doesn't collide with any existing name in
 * `existingNames`. Appends " 2", " 3", … as needed.
 */
export function makeUniqueLevelName(
  existingNames: Set<string>,
  baseName: string
): string {
  const trimmedBase = baseName.trim() || "Level";
  if (!existingNames.has(trimmedBase.toLowerCase())) return trimmedBase;
  let suffix = 2;
  while (existingNames.has(`${trimmedBase} ${suffix}`.toLowerCase())) {
    suffix++;
  }
  return `${trimmedBase} ${suffix}`;
}

/**
 * Next "Level N" name for a building — inspects existing names that match
 * `/^Level \d+$/i` to continue the numbering sequence.
 */
export function nextNumberedLevelName(buildingLevels: FloorPlanNode[]): string {
  let maxIndex = 0;
  for (const level of buildingLevels) {
    const match = (level.name ?? "").trim().match(/^Level\s+(\d+)$/i);
    if (!match) continue;
    const value = Number.parseInt(match[1] ?? "0", 10);
    if (Number.isFinite(value)) {
      maxIndex = Math.max(maxIndex, value);
    }
  }
  const base = `Level ${Math.max(1, maxIndex + 1)}`;
  const names = buildLevelNameSet(buildingLevels);
  return makeUniqueLevelName(names, base);
}

/**
 * Depth-first walk of a level's descendant subtree, level-first. Returns
 * the level itself followed by every node transitively parented to it,
 * preserving discovery order so duplicate/move flows can iterate in a
 * stable sequence.
 */
export function collectLevelSubtree(
  nodeList: FloorPlanNode[],
  levelsById: Record<string, FloorPlanNode>,
  levelId: string
): FloorPlanNode[] {
  const level = levelsById[levelId];
  if (!level || level.nodeType !== "level") return [];

  const childrenByParent = new Map<string, FloorPlanNode[]>();
  for (const node of nodeList) {
    if (!node.parentId) continue;
    const grouped = childrenByParent.get(node.parentId);
    if (grouped) grouped.push(node);
    else childrenByParent.set(node.parentId, [node]);
  }

  const ordered: FloorPlanNode[] = [];
  const visited = new Set<string>();
  const walk = (node: FloorPlanNode) => {
    if (visited.has(node.id)) return;
    visited.add(node.id);
    ordered.push(node);
    for (const child of childrenByParent.get(node.id) ?? []) {
      walk(child);
    }
  };
  walk(level);
  return ordered;
}
