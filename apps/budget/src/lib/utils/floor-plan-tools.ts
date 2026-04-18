import type { EditorTool } from "$lib/stores/floor-plan.svelte";
import type { FloorPlanNodeType } from "$core/schema/home/home-floor-plan-nodes";

export type SegmentNodeType = "wall" | "fence" | "roof-segment" | "stair-segment";
export type SurfaceNodeType =
  | "room"
  | "zone"
  | "site"
  | "building"
  | "level"
  | "slab"
  | "ceiling"
  | "roof"
  | "stair";

const SEGMENT_TOOLS = new Set<EditorTool>(["wall", "fence", "roof-segment", "stair-segment"]);
const SURFACE_TOOLS = new Set<EditorTool>([
  "room",
  "zone",
  "site",
  "building",
  "level",
  "slab",
  "ceiling",
  "roof",
  "stair",
]);

export function resolveSegmentTypeFromTool(tool: EditorTool): SegmentNodeType | null {
  return SEGMENT_TOOLS.has(tool) ? (tool as SegmentNodeType) : null;
}

export function resolveSurfaceTypeFromTool(tool: EditorTool): SurfaceNodeType | null {
  return SURFACE_TOOLS.has(tool) ? (tool as SurfaceNodeType) : null;
}

export type StructuralSegmentType = "roof-segment" | "stair-segment";
export type StructuralSurfaceType =
  | "building"
  | "level"
  | "slab"
  | "ceiling"
  | "roof"
  | "stair";

/**
 * Does this segment type need a hierarchy parent (roof or stair) resolved
 * via `store.resolveParentForCreation`? Walls and fences don't; roof and
 * stair segments do. Returning as a type predicate so TS narrows callers
 * correctly when they branch on the result.
 */
export function segmentNeedsHierarchyParent(
  type: SegmentNodeType
): type is StructuralSegmentType {
  return type === "roof-segment" || type === "stair-segment";
}

/**
 * Does this surface type need a hierarchy parent? Rooms, zones, and sites
 * are free-standing; everything else (building / level / slab / ceiling /
 * roof / stair) must be parented.
 */
export function surfaceNeedsHierarchyParent(
  type: SurfaceNodeType
): type is StructuralSurfaceType {
  return type !== "room" && type !== "zone" && type !== "site";
}

const DEFAULT_NAMES: Partial<Record<FloorPlanNodeType, string>> = {
  wall: "Wall",
  fence: "Fence",
  zone: "Zone",
  site: "Site",
  building: "Building",
  level: "Level",
  slab: "Slab",
  ceiling: "Ceiling",
  roof: "Roof",
  stair: "Stair",
  "roof-segment": "Roof Segment",
  "stair-segment": "Stair Segment",
};

export function defaultNameForNodeType(nodeType: FloorPlanNodeType): string {
  return DEFAULT_NAMES[nodeType] ?? "Room";
}

export function defaultElevationForSurface(nodeType: SurfaceNodeType): number {
  if (nodeType === "ceiling") return 2.4;
  if (nodeType === "roof") return 3;
  if (nodeType === "stair") return 0.15;
  return 0;
}

export function defaultSegmentHeight(nodeType: SegmentNodeType): number {
  if (nodeType === "roof-segment") return 0.4;
  if (nodeType === "stair-segment") return 0.22;
  return 2.5;
}

export function defaultSegmentThickness(nodeType: SegmentNodeType): number {
  if (nodeType === "roof-segment") return 0.25;
  if (nodeType === "stair-segment") return 0.16;
  return 0.15;
}
