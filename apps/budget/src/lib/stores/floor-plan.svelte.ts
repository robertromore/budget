import type { FloorPlanNode, FloorPlanNodeType } from "$core/schema/home/home-floor-plan-nodes";
import type { FloorPlanNodeInput } from "$core/server/domains/home/floor-plans/services";
import { nanoid } from "$lib/utils/nanoid";
import {
  findNearestWall as findNearestWallPure,
  findOpeningPlacement as findOpeningPlacementPure,
  type OpeningPlacement,
} from "$lib/utils/floor-plan-geometry";
import {
  detectAutoDetectedRegions,
  getAutoDetectedSignature,
  makeAutoDetectedProperties,
  toParentGroupKey,
} from "$lib/utils/floor-plan-auto-detect";
import {
  buildLevelNameSet,
  collectLevelSubtree as collectLevelSubtreePure,
  getBuildingLevels as getBuildingLevelsPure,
  makeUniqueLevelName as makeUniqueLevelNamePure,
  nextNumberedLevelName as nextNumberedLevelNamePure,
  sortLevels as sortLevelsPure,
} from "$lib/utils/floor-plan-levels";
import {
  parseFloorPlanNodeProperties,
  patchFloorPlanNodeProperties,
} from "$lib/utils/floor-plan-node-properties";

export type EditorTool =
  | "select"
  | "wall"
  | "fence"
  | "roof-segment"
  | "stair-segment"
  | "room"
  | "zone"
  | "site"
  | "building"
  | "level"
  | "slab"
  | "ceiling"
  | "roof"
  | "stair"
  | "door"
  | "window"
  | "furniture"
  | "item"
  | "scan"
  | "guide"
  | "pan";
export type SelectionToolMode = "click" | "marquee";
export type LevelMoveDirection = "up" | "down";
export type LevelDisplayMode = "stacked" | "exploded" | "solo" | "manual";
export type StructuralSurfaceNodeType = "slab" | "ceiling" | "roof" | "stair";
export type StructuralSegmentNodeType = "roof-segment" | "stair-segment";
const STRUCTURAL_SURFACE_TYPES: StructuralSurfaceNodeType[] = [
  "slab",
  "ceiling",
  "roof",
  "stair",
];

const MAX_HISTORY = 50;
const DEFAULT_LEVEL_EXPLODE_SPACING = 3.5;
/**
 * Default vertical spacing between stacked levels, in meters. Sized to
 * exceed the default wall height (2.5m, see `defaultSegmentHeight` in
 * `$lib/utils/floor-plan-tools`) plus a floor/ceiling allowance so a wall
 * on the level below doesn't poke into the slab of the level above.
 * Referenced by `createDefaultLevel` and `duplicateLevel` to keep the two
 * code paths in lockstep; bump both when changing default wall height.
 */
const DEFAULT_LEVEL_STACK_SPACING_M = 3;
const WALL_LIKE_NODE_TYPES = new Set<FloorPlanNodeType>([
  "wall",
  "fence",
  "roof-segment",
  "stair-segment",
]);
const ROOM_LIKE_NODE_TYPES = new Set<FloorPlanNodeType>([
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
const FURNITURE_LIKE_NODE_TYPES = new Set<FloorPlanNodeType>([
  "furniture",
  "appliance",
  "item",
]);
const ASSET_NODE_TYPES = new Set<FloorPlanNodeType>(["scan", "guide"]);
const ANNOTATION_LIKE_NODE_TYPES = new Set<FloorPlanNodeType>(["annotation"]);
const OPENING_NODE_TYPES = new Set<FloorPlanNodeType>(["door", "window"]);
const NODE_PROPERTY_HIDDEN = "hidden";
const NODE_PROPERTY_LOCKED = "locked";
const HIERARCHY_PARENT_BY_TYPE: Partial<Record<FloorPlanNodeType, FloorPlanNodeType>> = {
  building: "site",
  level: "building",
  slab: "level",
  ceiling: "level",
  roof: "level",
  stair: "level",
  "roof-segment": "roof",
  "stair-segment": "stair",
};
const TOOL_NODE_TYPE: Partial<Record<EditorTool, FloorPlanNodeType>> = {
  wall: "wall",
  fence: "fence",
  "roof-segment": "roof-segment",
  "stair-segment": "stair-segment",
  room: "room",
  zone: "zone",
  site: "site",
  building: "building",
  level: "level",
  slab: "slab",
  ceiling: "ceiling",
  roof: "roof",
  stair: "stair",
  door: "door",
  window: "window",
  furniture: "furniture",
  item: "item",
  scan: "scan",
  guide: "guide",
};

export type AutoDetectSpacesSummary = {
  detected: number;
  created: number;
  updated: number;
  deleted: number;
};

export type FloorPlanWizardTemplate = "single-family" | "apartment" | "studio";
export type FloorPlanWizardFootprint = "compact" | "standard" | "large";
export type FloorPlanWizardInput = {
  template: FloorPlanWizardTemplate;
  footprint: FloorPlanWizardFootprint;
  levels: number;
  bedrooms: number;
  bathrooms: number;
  includeGarage: boolean;
  includeDining: boolean;
  includeOffice: boolean;
  furnished: boolean;
  replaceExisting: boolean;
};

export type FloorPlanWizardResult = {
  createdNodeCount: number;
  levelIds: string[];
  replacedExisting: boolean;
};

interface HistorySnapshot {
  /**
   * Shallow clone of the nodes map. Every mutation produces a new node
   * object via `{...node, ...updates}` (see `updateNode`/`moveNode`), so
   * node records can be treated as immutable and referenced directly
   * from multiple snapshots without a deep copy. `pushHistory` and
   * `applySnapshot` each spread into a fresh object so subsequent
   * mutations to one version don't leak into others.
   */
  nodes: Record<string, FloorPlanNode>;
  deletedNodeIds: string[];
  selectedNodeIds: string[];
  viewBoxX: number;
  viewBoxY: number;
  viewBoxWidth: number;
  viewBoxHeight: number;
  zoom: number;
}

export class FloorPlanStore {
  // Reactive state
  nodes = $state<Record<string, FloorPlanNode>>({});
  /**
   * Reactive Set. Mutated in place via `replaceSelection` / `.add` / `.delete`
   * so Svelte 5's Set proxy can track `.has(id)` reads at the per-key level:
   * a node whose membership didn't change doesn't re-render. Reassigning
   * this field would collapse reactivity back to field-level (coarse)
   * invalidation — don't do it; use the helpers below instead.
   */
  selectedNodeIds = $state<Set<string>>(new Set());
  activeTool = $state<EditorTool>("select");
  selectionToolMode = $state<SelectionToolMode>("click");
  autoCreateMissingParents = $state(false);
  activeSiteId = $state<string | null>(null);
  activeBuildingId = $state<string | null>(null);
  activeLevelId = $state<string | null>(null);
  levelDisplayMode = $state<LevelDisplayMode>("stacked");
  levelExplodeSpacing = $state(DEFAULT_LEVEL_EXPLODE_SPACING);
  manualLevelOffsets = $state<Record<string, number>>({});
  floorLevel = $state(0);
  homeId = $state(0);

  // Viewport state
  viewBoxX = $state(0);
  viewBoxY = $state(0);
  viewBoxWidth = $state(1200);
  viewBoxHeight = $state(800);
  zoom = $state(1);

  // Dirty tracking
  deletedNodeIds = $state<string[]>([]);
  /**
   * O(1)-membership mirror of `deletedNodeIds` kept in lockstep by the
   * mutator helpers below. Without it, a batched op like
   * `autoDetectSpacesAndZones` that deletes N stale rooms would pay
   * O(N²) rebuilding the reactive array on each `deleteNode` call
   * (`[...new Set([...arr, ...ids])]`).
   */
  private deletedNodeIdsSet = new Set<string>();
  isDirty = $state(false);
  /**
   * Baseline of the last persisted node set. Every mutation path produces
   * a NEW node reference via `{...node, ...updates}` (see `updateNode` and
   * `moveNode`), so reference inequality with this map is an exact test
   * for "changed since last save". `getNodesForSave` uses it to ship only
   * created or mutated nodes on save, turning a 2k-node plan with one
   * tweak into a 1-node payload.
   *
   * Not reactive — internal accounting. Reset by `loadNodes`, `markSaved`,
   * and `applySnapshot` (undo/redo restores the map shape but the baseline
   * still reflects what the server has).
   */
  private lastSavedNodes: Record<string, FloorPlanNode> = {};

  // Undo/redo
  private history: HistorySnapshot[] = [];
  private historyIndex = -1;
  // When >0, pushHistory() is a no-op. Used by batched operations
  // (auto-detect, bulk placements) to avoid flooding the 50-entry undo
  // ring with a snapshot per node. Exit the batch with `commitChange()`
  // to land a single combined snapshot.
  private historySuppressionDepth = 0;
  canUndo = $state(false);
  canRedo = $state(false);

  // Grid
  gridSize = $state(20);
  showGrid = $state(true);
  snapToGrid = $state(true);

  // Lightweight user feedback for blocked tool/creation actions.
  statusMessage = $state<string | null>(null);
  statusMessageTone = $state<"warning" | "info">("info");
  private statusMessageTimer: ReturnType<typeof setTimeout> | null = null;

  // Derived
  selectedNodes = $derived.by(() => {
    const result: FloorPlanNode[] = [];
    for (const id of this.selectedNodeIds) {
      const node = this.nodes[id];
      if (node) result.push(node);
    }
    return result;
  });

  selectedNode = $derived(this.selectedNodes.length === 1 ? this.selectedNodes[0] : null);

  nodeList = $derived(Object.values(this.nodes));
  private nodeInteractionFlags = $derived.by(() => {
    const hidden = new Set<string>();
    const locked = new Set<string>();
    for (const node of this.nodeList) {
      const properties = parseFloorPlanNodeProperties(node.properties);
      if (properties[NODE_PROPERTY_HIDDEN] === true) hidden.add(node.id);
      if (properties[NODE_PROPERTY_LOCKED] === true) locked.add(node.id);
    }
    return { hidden, locked };
  });
  visibleNodeList = $derived(
    this.nodeList.filter(
      (node) => this.isNodeVisibleInCurrentContext(node) && !this.isNodeHidden(node.id)
    )
  );
  /**
   * Per-type index built from the full node list. Lets type-scoped queries
   * (`hasNodeTypeInActiveContext`, `findFirstNodeId…`, toolbar predicates)
   * iterate just the nodes of a type instead of the full collection —
   * meaningful on plans approaching the MAX_NODES_PER_SAVE ceiling.
   */
  nodesByType = $derived.by(() => {
    const map = new Map<FloorPlanNodeType, FloorPlanNode[]>();
    for (const node of this.nodeList) {
      const bucket = map.get(node.nodeType);
      if (bucket) bucket.push(node);
      else map.set(node.nodeType, [node]);
    }
    return map;
  });

  /**
   * Parent-id → children index, unsorted. Shared by the hierarchy panel
   * and any other tree-consumer so a door drag doesn't rebuild the index
   * per component. Consumers that need a specific ordering sort at
   * consumption time (cheap per-group; the expensive iteration is here).
   */
  childrenByParentId = $derived.by(() => {
    const map = new Map<string, FloorPlanNode[]>();
    for (const node of this.nodeList) {
      if (!node.parentId) continue;
      const bucket = map.get(node.parentId);
      if (bucket) bucket.push(node);
      else map.set(node.parentId, [node]);
    }
    return map;
  });

  walls = $derived(this.visibleNodeList.filter((n) => WALL_LIKE_NODE_TYPES.has(n.nodeType)));
  rooms = $derived(this.visibleNodeList.filter((n) => ROOM_LIKE_NODE_TYPES.has(n.nodeType)));
  furniture = $derived(
    this.visibleNodeList.filter((n) => FURNITURE_LIKE_NODE_TYPES.has(n.nodeType))
  );
  assetLayers = $derived(this.visibleNodeList.filter((n) => ASSET_NODE_TYPES.has(n.nodeType)));
  scans = $derived(this.visibleNodeList.filter((n) => n.nodeType === "scan"));
  guides = $derived(this.visibleNodeList.filter((n) => n.nodeType === "guide"));
  annotations = $derived(
    this.visibleNodeList.filter((n) => ANNOTATION_LIKE_NODE_TYPES.has(n.nodeType))
  );
  doors = $derived(this.visibleNodeList.filter((n) => n.nodeType === "door"));
  windows = $derived(this.visibleNodeList.filter((n) => n.nodeType === "window"));

  loadNodes(nodes: FloorPlanNode[], homeId: number, floorLevel: number) {
    this.homeId = homeId;
    this.floorLevel = floorLevel;
    this.nodes = {};
    for (const node of nodes) {
      this.nodes[node.id] = node;
    }
    this.deletedNodeIds = [];
    this.deletedNodeIdsSet.clear();
    this.isDirty = false;
    // Snapshot the persisted state as the save baseline: every node
    // currently in `this.nodes` came straight from the server, so their
    // references ARE the "last saved" references. Future mutations will
    // swap in fresh object refs, which `getNodesForSave` uses to detect
    // which nodes actually need upserting.
    this.lastSavedNodes = { ...this.nodes };
    this.selectedNodeIds.clear();
    this.activeSiteId = null;
    this.activeBuildingId = null;
    this.activeLevelId = null;
    this.levelDisplayMode = "stacked";
    this.levelExplodeSpacing = DEFAULT_LEVEL_EXPLODE_SPACING;
    this.manualLevelOffsets = {};
    this.initializeHierarchyContext();
    this.history = [];
    this.historyIndex = -1;
    this.clearStatusMessage();
    this.pushHistory();
  }

  private formatTypeLabel(type: FloorPlanNodeType): string {
    return type.charAt(0).toUpperCase() + type.slice(1);
  }

  private hasOwnNodeFlag(nodeId: string | null, flag: "hidden" | "locked"): boolean {
    if (!nodeId) return false;
    if (!this.nodes[nodeId]) return false;
    const flags =
      flag === "hidden" ? this.nodeInteractionFlags.hidden : this.nodeInteractionFlags.locked;
    return flags.has(nodeId);
  }

  private hasInheritedNodeFlag(nodeId: string | null, flag: "hidden" | "locked"): boolean {
    if (!nodeId) return false;
    const node = this.nodes[nodeId];
    if (!node) return false;
    const flags =
      flag === "hidden" ? this.nodeInteractionFlags.hidden : this.nodeInteractionFlags.locked;
    const visited = new Set<string>();
    let parentId = node.parentId;
    while (parentId) {
      if (visited.has(parentId)) break;
      visited.add(parentId);
      if (flags.has(parentId)) return true;
      const parent = this.nodes[parentId];
      if (!parent) break;
      parentId = parent.parentId;
    }
    return false;
  }

  isNodeHiddenOwn(nodeId: string | null): boolean {
    return this.hasOwnNodeFlag(nodeId, "hidden");
  }

  isNodeHiddenInherited(nodeId: string | null): boolean {
    return this.hasInheritedNodeFlag(nodeId, "hidden");
  }

  isNodeHidden(nodeId: string | null): boolean {
    return this.isNodeHiddenOwn(nodeId) || this.isNodeHiddenInherited(nodeId);
  }

  isNodeLockedOwn(nodeId: string | null): boolean {
    return this.hasOwnNodeFlag(nodeId, "locked");
  }

  isNodeLockedInherited(nodeId: string | null): boolean {
    return this.hasInheritedNodeFlag(nodeId, "locked");
  }

  isNodeLocked(nodeId: string | null): boolean {
    return this.isNodeLockedOwn(nodeId) || this.isNodeLockedInherited(nodeId);
  }

  private describeLockState(nodeId: string): string {
    if (this.isNodeLockedOwn(nodeId)) return "This node is locked.";
    if (this.isNodeLockedInherited(nodeId)) return "This node is locked by a parent.";
    return "This node is locked.";
  }

  setNodeHidden(nodeId: string, hidden: boolean): boolean {
    const node = this.nodes[nodeId];
    if (!node) return false;
    if (this.isNodeHiddenOwn(nodeId) === hidden) return true;
    const nextProperties = patchFloorPlanNodeProperties(node.properties, {
      [NODE_PROPERTY_HIDDEN]: hidden ? true : null,
    });
    // Visibility is a view-state toggle, not a geometric edit — allow it
    // on locked nodes so users can show / hide reference underlays they
    // intentionally froze in place.
    this.updateNodeUnchecked(nodeId, { properties: nextProperties });
    this.pruneSelectionToVisibleNodes();
    this.commitChange();
    return true;
  }

  toggleNodeVisibility(nodeId: string): boolean {
    return this.setNodeHidden(nodeId, !this.isNodeHiddenOwn(nodeId));
  }

  setNodeLocked(nodeId: string, locked: boolean): boolean {
    const node = this.nodes[nodeId];
    if (!node) return false;
    if (this.isNodeLockedOwn(nodeId) === locked) return true;
    const nextProperties = patchFloorPlanNodeProperties(node.properties, {
      [NODE_PROPERTY_LOCKED]: locked ? true : null,
    });
    // Bypass the lock check: this mutation IS the unlock (or re-lock)
    // itself. Going through `updateNode` would block unlocking forever
    // once a node is locked.
    this.updateNodeUnchecked(nodeId, { properties: nextProperties });
    this.pruneSelectionToVisibleNodes();
    this.commitChange();
    return true;
  }

  toggleNodeLock(nodeId: string): boolean {
    return this.setNodeLocked(nodeId, !this.isNodeLockedOwn(nodeId));
  }

  private isDescendantOf(nodeId: string, ancestorId: string): boolean {
    const visited = new Set<string>();
    let current: FloorPlanNode | undefined = this.nodes[nodeId];
    while (current?.parentId) {
      if (current.parentId === ancestorId) return true;
      if (visited.has(current.parentId)) return false;
      visited.add(current.parentId);
      current = this.nodes[current.parentId];
    }
    return false;
  }

  private isNodeVisibleInCurrentContext(node: FloorPlanNode): boolean {
    if (!this.activeSiteId && !this.activeBuildingId && !this.activeLevelId) {
      return true;
    }

    if (
      node.id === this.activeSiteId ||
      node.id === this.activeBuildingId ||
      node.id === this.activeLevelId
    ) {
      return true;
    }

    if (this.activeLevelId) {
      return this.isDescendantOf(node.id, this.activeLevelId);
    }

    if (this.activeBuildingId) {
      return this.isDescendantOf(node.id, this.activeBuildingId);
    }

    if (this.activeSiteId) {
      return this.isDescendantOf(node.id, this.activeSiteId);
    }

    return true;
  }

  private pruneSelectionToVisibleNodes(): void {
    const toRemove: string[] = [];
    for (const id of this.selectedNodeIds) {
      const node = this.nodes[id];
      if (!node || !this.isNodeVisibleInCurrentContext(node) || this.isNodeHidden(id) || this.isNodeLocked(id)) {
        toRemove.push(id);
      }
    }
    for (const id of toRemove) {
      this.selectedNodeIds.delete(id);
    }
  }

  /**
   * Overwrite the current selection in place. Preserves the proxy Set
   * identity so per-key `.has()` subscribers only re-run for ids whose
   * membership actually changed.
   */
  private replaceSelection(ids: Iterable<string>): void {
    const next = new Set<string>();
    for (const id of ids) {
      const node = this.nodes[id];
      if (!node) continue;
      if (!this.isNodeVisibleInCurrentContext(node)) continue;
      if (this.isNodeHidden(id) || this.isNodeLocked(id)) continue;
      next.add(id);
    }
    for (const id of this.selectedNodeIds) {
      if (!next.has(id)) this.selectedNodeIds.delete(id);
    }
    for (const id of next) {
      if (!this.selectedNodeIds.has(id)) this.selectedNodeIds.add(id);
    }
  }

  private normalizeHierarchyContext(): void {
    const site =
      this.activeSiteId && this.nodes[this.activeSiteId]?.nodeType === "site"
        ? this.nodes[this.activeSiteId]
        : null;
    const building =
      this.activeBuildingId && this.nodes[this.activeBuildingId]?.nodeType === "building"
        ? this.nodes[this.activeBuildingId]
        : null;
    const level =
      this.activeLevelId && this.nodes[this.activeLevelId]?.nodeType === "level"
        ? this.nodes[this.activeLevelId]
        : null;

    if (level) {
      this.activeLevelId = level.id;
      const levelParent = level.parentId ? this.nodes[level.parentId] : null;
      if (levelParent?.nodeType === "building") {
        this.activeBuildingId = levelParent.id;
        const siteParent = levelParent.parentId ? this.nodes[levelParent.parentId] : null;
        this.activeSiteId = siteParent?.nodeType === "site" ? siteParent.id : null;
      } else {
        this.activeBuildingId = null;
        this.activeSiteId = null;
      }
      return;
    }

    this.activeLevelId = null;

    if (building) {
      this.activeBuildingId = building.id;
      const siteParent = building.parentId ? this.nodes[building.parentId] : null;
      this.activeSiteId = siteParent?.nodeType === "site" ? siteParent.id : null;
      return;
    }

    this.activeBuildingId = null;
    this.activeSiteId = site ? site.id : null;
  }

  setHierarchyContextFromNodeId(nodeId: string | null): void {
    if (!nodeId) {
      this.clearHierarchyContext();
      return;
    }
    const node = this.nodes[nodeId];
    if (!node) return;

    let current: FloorPlanNode | undefined = node;
    const visited = new Set<string>();
    let siteId: string | null = null;
    let buildingId: string | null = null;
    let levelId: string | null = null;

    while (current) {
      if (current.nodeType === "site" && !siteId) siteId = current.id;
      if (current.nodeType === "building" && !buildingId) buildingId = current.id;
      if (current.nodeType === "level" && !levelId) levelId = current.id;
      if (!current.parentId) break;
      if (visited.has(current.parentId)) break;
      visited.add(current.parentId);
      current = this.nodes[current.parentId];
    }

    if (!siteId && !buildingId && !levelId) {
      return;
    }

    this.activeSiteId = siteId;
    this.activeBuildingId = buildingId;
    this.activeLevelId = levelId;
    this.normalizeHierarchyContext();
    this.pruneSelectionToVisibleNodes();
  }

  clearHierarchyContext(): void {
    this.activeSiteId = null;
    this.activeBuildingId = null;
    this.activeLevelId = null;
  }

  private initializeHierarchyContext(): void {
    const nodes = Object.values(this.nodes);
    const level = nodes.find((node) => node.nodeType === "level");
    if (level) {
      this.setHierarchyContextFromNodeId(level.id);
      return;
    }
    const building = nodes.find((node) => node.nodeType === "building");
    if (building) {
      this.setHierarchyContextFromNodeId(building.id);
      return;
    }
    const site = nodes.find((node) => node.nodeType === "site");
    if (site) {
      this.setHierarchyContextFromNodeId(site.id);
    }
  }

  private getViewportCenter(): { x: number; y: number } {
    return {
      x: this.viewBoxX + this.viewBoxWidth / 2,
      y: this.viewBoxY + this.viewBoxHeight / 2,
    };
  }

  private hasHierarchyContext(): boolean {
    return !!(this.activeSiteId || this.activeBuildingId || this.activeLevelId);
  }

  private isNodeInActiveHierarchyContext(node: FloorPlanNode): boolean {
    if (!this.hasHierarchyContext()) return true;
    return this.isNodeVisibleInCurrentContext(node);
  }

  private hasNodeTypeInActiveContext(type: FloorPlanNodeType): boolean {
    const bucket = this.nodesByType.get(type);
    if (!bucket) return false;
    for (const node of bucket) {
      if (this.isNodeInActiveHierarchyContext(node)) return true;
    }
    return false;
  }

  private findFirstNodeIdInActiveContext(type: FloorPlanNodeType): string | null {
    const bucket = this.nodesByType.get(type);
    if (!bucket) return null;
    for (const node of bucket) {
      if (this.isNodeInActiveHierarchyContext(node)) return node.id;
    }
    return null;
  }

  private findFirstNodeId(type: FloorPlanNodeType): string | null {
    const bucket = this.nodesByType.get(type);
    return bucket && bucket.length > 0 ? bucket[0].id : null;
  }

  private createDefaultSite(): string {
    const margin = this.gridSize * 2;
    const width = Math.max(this.gridSize * 20, this.viewBoxWidth - margin * 2);
    const height = Math.max(this.gridSize * 14, this.viewBoxHeight - margin * 2);
    const x = this.viewBoxX + (this.viewBoxWidth - width) / 2;
    const y = this.viewBoxY + (this.viewBoxHeight - height) / 2;
    return this.addNode("site", {
      posX: this.snap(x),
      posY: this.snap(y),
      width: this.snap(width),
      height: this.snap(height),
      name: "Site",
      color: null,
    });
  }

  private createDefaultBuilding(parentSiteId: string | null): string {
    let width = this.viewBoxWidth * 0.65;
    let height = this.viewBoxHeight * 0.65;
    let x = this.viewBoxX + (this.viewBoxWidth - width) / 2;
    let y = this.viewBoxY + (this.viewBoxHeight - height) / 2;

    if (parentSiteId) {
      const site = this.nodes[parentSiteId];
      if (site && site.nodeType === "site" && site.width > 0 && site.height > 0) {
        width = Math.max(this.gridSize * 10, site.width * 0.7);
        height = Math.max(this.gridSize * 8, site.height * 0.7);
        x = site.posX + (site.width - width) / 2;
        y = site.posY + (site.height - height) / 2;
      }
    }

    return this.addNode("building", {
      posX: this.snap(x),
      posY: this.snap(y),
      width: this.snap(width),
      height: this.snap(height),
      parentId: parentSiteId,
      name: "Building",
      color: null,
    });
  }

  private createDefaultLevel(parentBuildingId: string): string | null {
    const building = this.nodes[parentBuildingId];
    if (!building || building.nodeType !== "building") return null;

    const levels = this.sortLevels(this.getBuildingLevels(parentBuildingId));
    const maxElevation = levels.reduce((max, level) => Math.max(max, level.elevation ?? 0), 0);
    const nextElevation =
      levels.length === 0 ? 0 : maxElevation + DEFAULT_LEVEL_STACK_SPACING_M;

    const width =
      building.width > 0 ? this.snap(Math.max(this.gridSize * 8, building.width * 0.9)) : 400;
    const height =
      building.height > 0
        ? this.snap(Math.max(this.gridSize * 8, building.height * 0.9))
        : 300;
    const x =
      building.width > 0
        ? this.snap(building.posX + (building.width - width) / 2)
        : this.snap(building.posX);
    const y =
      building.height > 0
        ? this.snap(building.posY + (building.height - height) / 2)
        : this.snap(building.posY);

    const levelName =
      levels.length === 0
        ? this.makeUniqueLevelName(parentBuildingId, "Ground Level")
        : this.nextNumberedLevelName(parentBuildingId);

    return this.addNode("level", {
      posX: x,
      posY: y,
      width,
      height,
      parentId: parentBuildingId,
      elevation: nextElevation,
      name: levelName,
      color: null,
    });
  }

  private createDefaultStructuralSurface(
    type: "slab" | "ceiling" | "roof" | "stair",
    parentLevelId: string
  ): string | null {
    const level = this.nodes[parentLevelId];
    if (!level || level.nodeType !== "level") return null;

    const width = level.width > 0 ? this.snap(Math.max(this.gridSize * 6, level.width * 0.9)) : 320;
    const height =
      level.height > 0 ? this.snap(Math.max(this.gridSize * 6, level.height * 0.9)) : 240;
    const posX =
      level.width > 0
        ? this.snap(level.posX + (level.width - width) / 2)
        : this.snap(level.posX);
    const posY =
      level.height > 0
        ? this.snap(level.posY + (level.height - height) / 2)
        : this.snap(level.posY);
    const elevation =
      type === "ceiling" ? 2.4 : type === "roof" ? 3 : type === "stair" ? 0.15 : 0;
    const name = type.charAt(0).toUpperCase() + type.slice(1);

    return this.addNode(type, {
      posX,
      posY,
      width,
      height,
      parentId: parentLevelId,
      elevation,
      name,
      color: null,
    });
  }

  private ensureHierarchyNodeExists(type: FloorPlanNodeType, x: number, y: number): boolean {
    if (this.hasNodeTypeInActiveContext(type)) return false;

    if (type === "site") {
      this.createDefaultSite();
      return true;
    }

    if (type === "building") {
      this.ensureHierarchyNodeExists("site", x, y);
      const parentSiteId =
        this.resolveDefaultParent("building", x, y) ??
        this.findFirstNodeIdInActiveContext("site") ??
        (this.hasHierarchyContext() ? null : this.findFirstNodeId("site"));
      this.createDefaultBuilding(parentSiteId);
      return true;
    }

    if (type === "level") {
      let created = false;
      created = this.ensureHierarchyNodeExists("building", x, y) || created;
      const parentBuildingId =
        this.resolveDefaultParent("level", x, y) ??
        this.findFirstNodeIdInActiveContext("building") ??
        (this.hasHierarchyContext() ? null : this.findFirstNodeId("building"));
      if (!parentBuildingId) return created;
      const levelId = this.createDefaultLevel(parentBuildingId);
      return created || !!levelId;
    }

    if (type === "slab" || type === "ceiling" || type === "roof" || type === "stair") {
      let created = false;
      created = this.ensureHierarchyNodeExists("level", x, y) || created;
      const parentLevelId =
        this.resolveDefaultParent(type, x, y) ??
        this.findFirstNodeIdInActiveContext("level") ??
        (this.hasHierarchyContext() ? null : this.findFirstNodeId("level"));
      if (!parentLevelId) return created;
      const nodeId = this.createDefaultStructuralSurface(type, parentLevelId);
      return created || !!nodeId;
    }

    return false;
  }

  private autoCreateHierarchyParentsForType(
    targetType: FloorPlanNodeType,
    x: number,
    y: number
  ): boolean {
    const requiredParentType = HIERARCHY_PARENT_BY_TYPE[targetType];
    if (!requiredParentType) return false;
    return this.ensureHierarchyNodeExists(requiredParentType, x, y);
  }

  resolveDefaultContentParentId(): string | null {
    if (this.activeLevelId && this.nodes[this.activeLevelId]?.nodeType === "level") {
      return this.activeLevelId;
    }
    if (this.activeBuildingId && this.nodes[this.activeBuildingId]?.nodeType === "building") {
      return this.activeBuildingId;
    }
    if (this.activeSiteId && this.nodes[this.activeSiteId]?.nodeType === "site") {
      return this.activeSiteId;
    }
    return null;
  }

  getBuildingLevels(buildingId: string): FloorPlanNode[] {
    return getBuildingLevelsPure(this.nodeList, buildingId);
  }

  private sortLevels(levels: FloorPlanNode[]): FloorPlanNode[] {
    return sortLevelsPure(levels);
  }

  private getLevelSiblings(levelId: string): FloorPlanNode[] {
    const level = this.nodes[levelId];
    if (!level || level.nodeType !== "level" || !level.parentId) return [];
    return sortLevelsPure(getBuildingLevelsPure(this.nodeList, level.parentId));
  }

  private getLevelForNode(nodeId: string | null): FloorPlanNode | null {
    if (!nodeId) return null;
    let current: FloorPlanNode | undefined = this.nodes[nodeId];
    if (!current) return null;
    const visited = new Set<string>();
    while (current) {
      if (current.nodeType === "level") return current;
      if (!current.parentId) break;
      if (visited.has(current.parentId)) break;
      visited.add(current.parentId);
      current = this.nodes[current.parentId];
    }
    return null;
  }

  private getLevelDisplayIndex(levelId: string): number {
    const siblings = this.getLevelSiblings(levelId);
    const index = siblings.findIndex((level) => level.id === levelId);
    return index < 0 ? 0 : index;
  }

  private makeUniqueLevelName(
    buildingId: string,
    baseName: string,
    excludeId?: string
  ): string {
    const names = buildLevelNameSet(
      getBuildingLevelsPure(this.nodeList, buildingId),
      excludeId
    );
    return makeUniqueLevelNamePure(names, baseName);
  }

  private nextNumberedLevelName(buildingId: string): string {
    return nextNumberedLevelNamePure(getBuildingLevelsPure(this.nodeList, buildingId));
  }

  private collectLevelSubtree(levelId: string): FloorPlanNode[] {
    return collectLevelSubtreePure(this.nodeList, this.nodes, levelId);
  }

  getNodeAncestorElevation(nodeId: string | null): number {
    if (!nodeId) return 0;
    const node = this.nodes[nodeId];
    if (!node) return 0;

    let total = 0;
    const visited = new Set<string>();
    let parentId = node.parentId;
    while (parentId) {
      if (visited.has(parentId)) break;
      visited.add(parentId);
      const parent = this.nodes[parentId];
      if (!parent) break;
      total += parent.elevation ?? 0;
      parentId = parent.parentId;
    }
    return total;
  }

  getNodeWorldElevation(nodeId: string | null): number {
    if (!nodeId) return 0;
    const node = this.nodes[nodeId];
    if (!node) return 0;
    return (node.elevation ?? 0) + this.getNodeAncestorElevation(nodeId);
  }

  isNodeVisibleInLevelDisplayMode(nodeId: string | null): boolean {
    if (!nodeId) return false;
    if (this.levelDisplayMode !== "solo") return true;
    const node = this.nodes[nodeId];
    if (!node) return false;
    const activeLevel =
      this.activeLevelId && this.nodes[this.activeLevelId]?.nodeType === "level"
        ? this.nodes[this.activeLevelId]
        : null;
    if (!activeLevel) return true;
    if (node.id === activeLevel.id) return true;
    return this.isDescendantOf(node.id, activeLevel.id);
  }

  getNodeDisplayElevationOffset(nodeId: string | null): number {
    if (!nodeId) return 0;
    const node = this.nodes[nodeId];
    if (!node) return 0;
    const level = this.getLevelForNode(node.id);
    if (!level) return 0;
    if (this.levelDisplayMode === "exploded") {
      return this.getLevelDisplayIndex(level.id) * this.levelExplodeSpacing;
    }
    if (this.levelDisplayMode === "manual") {
      return this.manualLevelOffsets[level.id] ?? 0;
    }
    return 0;
  }

  getManualLevelOffset(levelId: string | null): number {
    if (!levelId) return 0;
    const level = this.nodes[levelId];
    if (!level || level.nodeType !== "level") return 0;
    return this.manualLevelOffsets[level.id] ?? 0;
  }

  setLevelDisplayMode(mode: LevelDisplayMode): void {
    this.levelDisplayMode = mode;
  }

  setLevelExplodeSpacing(spacing: number): void {
    if (!Number.isFinite(spacing)) return;
    const clamped = Math.max(0, Math.min(20, spacing));
    this.levelExplodeSpacing = Math.round(clamped * 100) / 100;
  }

  setManualLevelOffset(levelId: string, offset: number): void {
    const level = this.nodes[levelId];
    if (!level || level.nodeType !== "level") return;
    if (!Number.isFinite(offset)) return;
    const nextOffset = Math.round(offset * 100) / 100;
    if ((this.manualLevelOffsets[levelId] ?? 0) === nextOffset) return;
    this.manualLevelOffsets = {
      ...this.manualLevelOffsets,
      [levelId]: nextOffset,
    };
  }

  resetManualLevelOffsets(): void {
    this.manualLevelOffsets = {};
  }

  // Auto-detect graph algorithm lives in `$lib/utils/floor-plan-auto-detect`.
  // This file owns the reactive glue that turns detected regions into
  // node mutations.

  autoDetectSpacesAndZones(): AutoDetectSpacesSummary {
    // Suppress intermediate history snapshots — a single auto-detect pass
    // can add/update/delete dozens of nodes and would otherwise evict the
    // entire undo ring with one click. Push a single combined snapshot at
    // the end when anything actually changed.
    const summary = this.withHistoryBatch(
      () => this.autoDetectSpacesAndZonesImpl(),
      false
    );
    if (summary.created > 0 || summary.updated > 0 || summary.deleted > 0) {
      this.pushHistory();
    }
    return summary;
  }

  private autoDetectSpacesAndZonesImpl(): AutoDetectSpacesSummary {
    const summary: AutoDetectSpacesSummary = {
      detected: 0,
      created: 0,
      updated: 0,
      deleted: 0,
    };

    const { regions: detectedRegions, blockedDeletionParentKeys, processedParentKeys } =
      detectAutoDetectedRegions(this.walls, this.gridSize);

    // No edges to process — sweep stale auto-detected spaces and exit.
    if (processedParentKeys.size === 0) {
      let removed = 0;
      for (const node of this.nodeList) {
        if (node.nodeType !== "room" && node.nodeType !== "zone") continue;
        if (!getAutoDetectedSignature(node)) continue;
        if (!this.isNodeVisibleInCurrentContext(node)) continue;
        this.deleteNode(node.id);
        removed++;
      }
      if (removed > 0) {
        summary.deleted = removed;
        this.showStatusMessage(
          `Removed ${removed} stale auto-detected ${removed === 1 ? "space" : "spaces"}.`,
          "info"
        );
        return summary;
      }
      this.showStatusMessage("No wall/fence segments in the current context.", "info");
      return summary;
    }

    summary.detected = detectedRegions.length;

    const existingAutoNodesBySignature = new Map<string, FloorPlanNode[]>();
    const existingAutoNodes: FloorPlanNode[] = [];
    for (const node of this.nodeList) {
      if (node.nodeType !== "room" && node.nodeType !== "zone") continue;
      const signature = getAutoDetectedSignature(node);
      if (!signature) continue;
      existingAutoNodes.push(node);
      const grouped = existingAutoNodesBySignature.get(signature);
      if (grouped) grouped.push(node);
      else existingAutoNodesBySignature.set(signature, [node]);
    }

    const matchedExistingIds = new Set<string>();
    const nearlyEqual = (a: number, b: number): boolean => Math.abs(a - b) < 0.5;

    for (const region of detectedRegions) {
      const matches = existingAutoNodesBySignature.get(region.signature);
      const match = matches && matches.length > 0 ? matches.shift()! : null;
      const nextProperties = makeAutoDetectedProperties(region.signature, region.edgeIds);
      const defaultName = region.nodeType === "zone" ? "Zone" : "Room";

      if (match) {
        matchedExistingIds.add(match.id);
        const updates: Partial<FloorPlanNode> = {};
        if (match.nodeType !== region.nodeType) updates.nodeType = region.nodeType;
        if ((match.parentId ?? null) !== region.parentId) updates.parentId = region.parentId;
        if (!nearlyEqual(match.posX, region.minX)) updates.posX = region.minX;
        if (!nearlyEqual(match.posY, region.minY)) updates.posY = region.minY;
        if (!nearlyEqual(match.width, region.width)) updates.width = region.width;
        if (!nearlyEqual(match.height, region.height)) updates.height = region.height;
        if ((match.name ?? "").trim().length === 0) updates.name = defaultName;
        if (match.properties !== nextProperties) updates.properties = nextProperties;
        if (Object.keys(updates).length > 0) {
          this.updateNode(match.id, updates);
          summary.updated++;
        }
      } else {
        this.addNode(
          region.nodeType,
          {
            posX: region.minX,
            posY: region.minY,
            width: region.width,
            height: region.height,
            parentId: region.parentId,
            name: defaultName,
            color: null,
            properties: nextProperties,
          },
          false
        );
        summary.created++;
      }
    }

    for (const node of existingAutoNodes) {
      const parentKey = toParentGroupKey(node.parentId ?? null);
      if (!processedParentKeys.has(parentKey)) continue;
      if (blockedDeletionParentKeys.has(parentKey)) continue;
      if (matchedExistingIds.has(node.id)) continue;
      this.deleteNode(node.id);
      summary.deleted++;
    }

    if (summary.detected === 0 && summary.deleted === 0) {
      this.showStatusMessage("No enclosed wall/fence loops detected.", "info");
      return summary;
    }

    const noun = (count: number, singular: string): string =>
      `${count} ${singular}${count === 1 ? "" : "s"}`;
    this.showStatusMessage(
      `Auto-detected ${noun(summary.detected, "space")} (${noun(summary.created, "created")}, ${noun(summary.updated, "updated")}, ${noun(summary.deleted, "removed")}).`,
      "info",
      4200
    );
    return summary;
  }

  isGroundLevel(levelId: string): boolean {
    const siblings = this.getLevelSiblings(levelId);
    return siblings.length > 0 && siblings[0]?.id === levelId;
  }

  canDeleteLevel(levelId: string): boolean {
    const level = this.nodes[levelId];
    if (!level || level.nodeType !== "level") return false;
    return !this.isGroundLevel(levelId);
  }

  canMoveLevel(levelId: string, direction: LevelMoveDirection): boolean {
    const siblings = this.getLevelSiblings(levelId);
    const index = siblings.findIndex((candidate) => candidate.id === levelId);
    if (index < 0) return false;
    return direction === "up" ? index > 0 : index < siblings.length - 1;
  }

  addLevelToBuilding(buildingId: string): string | null {
    const building = this.nodes[buildingId];
    if (!building || building.nodeType !== "building") {
      this.showStatusMessage("Select a valid Building before adding a Level.");
      return null;
    }
    const levelId = this.createDefaultLevel(buildingId);
    if (!levelId) return null;

    this.setSelection([levelId]);
    this.setHierarchyContextFromNodeId(levelId);
    return levelId;
  }

  addLevelWithStructureToBuilding(
    buildingId: string
  ): { levelId: string; structuralIds: string[] } | null {
    const building = this.nodes[buildingId];
    if (!building || building.nodeType !== "building") {
      this.showStatusMessage("Select a valid Building before adding a Level.");
      return null;
    }

    const levelId = this.createDefaultLevel(buildingId);
    if (!levelId) return null;

    const structuralIds: string[] = [];
    for (const type of STRUCTURAL_SURFACE_TYPES) {
      const nodeId = this.createDefaultStructuralSurface(type, levelId);
      if (nodeId) structuralIds.push(nodeId);
    }

    this.setSelection([levelId]);
    this.setHierarchyContextFromNodeId(levelId);
    this.showStatusMessage(
      `Added Level with ${structuralIds.length} structural node${structuralIds.length === 1 ? "" : "s"}.`,
      "info"
    );
    return {
      levelId,
      structuralIds,
    };
  }

  addStructuralNodeToLevel(levelId: string, type: StructuralSurfaceNodeType): string | null {
    const level = this.nodes[levelId];
    if (!level || level.nodeType !== "level") {
      this.showStatusMessage("Select a valid Level before adding structural nodes.");
      return null;
    }

    const existing = this.nodeList.find(
      (node) => node.parentId === levelId && node.nodeType === type
    );
    if (existing) {
      this.setSelection([existing.id]);
      this.setHierarchyContextFromNodeId(existing.id);
      this.showStatusMessage(
        `${this.formatTypeLabel(type)} already exists for this Level.`,
        "info"
      );
      return existing.id;
    }

    const nodeId = this.createDefaultStructuralSurface(type, levelId);
    if (!nodeId) {
      this.showStatusMessage(`Unable to add ${this.formatTypeLabel(type)} to this Level.`);
      return null;
    }

    this.setSelection([nodeId]);
    this.setHierarchyContextFromNodeId(nodeId);
    return nodeId;
  }

  addStructurePackToLevel(levelId: string): string[] | null {
    const level = this.nodes[levelId];
    if (!level || level.nodeType !== "level") {
      this.showStatusMessage("Select a valid Level before adding structural nodes.");
      return null;
    }

    const createdIds: string[] = [];
    for (const type of STRUCTURAL_SURFACE_TYPES) {
      const existing = this.nodeList.find(
        (node) => node.parentId === levelId && node.nodeType === type
      );
      if (existing) continue;
      const nodeId = this.createDefaultStructuralSurface(type, levelId);
      if (nodeId) createdIds.push(nodeId);
    }

    if (createdIds.length === 0) {
      this.showStatusMessage("This Level already has slab, ceiling, roof, and stair.", "info");
      return [];
    }

    const firstCreated = createdIds[0];
    if (firstCreated) {
      this.setSelection([firstCreated]);
      this.setHierarchyContextFromNodeId(firstCreated);
    }
    this.showStatusMessage(
      `Added ${createdIds.length} structural node${createdIds.length === 1 ? "" : "s"} to this Level.`,
      "info"
    );
    return createdIds;
  }

  /**
   * Generate a starter plan from the new-home wizard.
   *
   * Scope: operates entirely within the CURRENT floor-level partition
   * (`this.floorLevel`). Specifically:
   *   - `this.nodes` is already scoped by `loadNodes(..., floorLevel)`,
   *     so `replaceExisting` only wipes nodes on this floor — nodes on
   *     other floor-levels in the same home are untouched.
   *   - Multi-level output (`input.levels > 1`) creates multiple `level`
   *     *nodes* at stacked `elevation` values, all stored under the
   *     same `floorLevel` row. "Levels" here means architectural storeys
   *     visible together in 3D exploded/stacked view — not separate
   *     editor floor-level partitions.
   *
   * If you need a true multi-floor-level plan (e.g. "page 1" = ground,
   * "page 2" = basement), the user must switch floors via the Floor
   * picker and run the wizard again for each partition.
   */
  generateDefaultPlanFromWizard(input: FloorPlanWizardInput): FloorPlanWizardResult {
    const template = input.template;
    const footprint = input.footprint;
    const replaceExisting = !!input.replaceExisting;
    const levels = Math.max(1, Math.min(4, Math.round(input.levels || 1)));
    const bedroomCap = template === "studio" ? 1 : 8;
    const bedrooms = Math.max(0, Math.min(bedroomCap, Math.round(input.bedrooms || 0)));
    // Clamp bathrooms to AT LEAST `levels` so every generated storey
    // ends up with one. Without this, a user picking "3 levels, 2
    // bathrooms" would silently get a floor with zero bathrooms (a
    // plumbing layout that surprises more than it serves).
    const requestedBathrooms = Math.max(1, Math.min(6, Math.round(input.bathrooms || 1)));
    const bathrooms = template === "studio"
      ? requestedBathrooms
      : Math.max(requestedBathrooms, levels);
    const includeGarage = !!input.includeGarage && template === "single-family";
    const includeDining = !!input.includeDining && template !== "studio";
    const includeOffice = !!input.includeOffice && template !== "studio";
    const furnished = !!input.furnished;

    const footprintScale = {
      compact: { width: 0.5, height: 0.44 },
      standard: { width: 0.64, height: 0.56 },
      large: { width: 0.78, height: 0.68 },
    }[footprint];

    const beforeNodeCount = Object.keys(this.nodes).length;
    const levelIds = this.withHistoryBatch(() => {
      const existingNodeIds = Object.keys(this.nodes);
      if (replaceExisting && existingNodeIds.length > 0) {
        this.recordDeletedIds(existingNodeIds);
        this.nodes = {};
        this.selectedNodeIds.clear();
        this.activeSiteId = null;
        this.activeBuildingId = null;
        this.activeLevelId = null;
      }

      const center = this.getViewportCenter();
      const buildingWidth = this.snap(Math.max(this.gridSize * 18, this.viewBoxWidth * footprintScale.width));
      const buildingHeight = this.snap(Math.max(this.gridSize * 14, this.viewBoxHeight * footprintScale.height));
      const buildingX = this.snap(center.x - buildingWidth / 2);
      const buildingY = this.snap(center.y - buildingHeight / 2);
      const sitePadding = this.gridSize * 3;
      const siteWidth = this.snap(buildingWidth + sitePadding * 2);
      const siteHeight = this.snap(buildingHeight + sitePadding * 2);
      const siteX = this.snap(buildingX - sitePadding);
      const siteY = this.snap(buildingY - sitePadding);

      const siteId = this.addNode("site", {
        posX: siteX,
        posY: siteY,
        width: siteWidth,
        height: siteHeight,
        name: "Site",
        color: null,
      });
      const buildingName =
        template === "apartment"
          ? levels > 1
            ? "Apartment Building"
            : "Apartment Unit"
          : template === "studio"
            ? "Studio Home"
            : "House";
      const buildingId = this.addNode("building", {
        posX: buildingX,
        posY: buildingY,
        width: buildingWidth,
        height: buildingHeight,
        parentId: siteId,
        name: buildingName,
        color: null,
      });

      const createdLevelIds: string[] = [];
      let remainingBedrooms = bedrooms;
      let remainingBathrooms = bathrooms;
      let nextBedroomNumber = 1;
      let nextBathroomNumber = 1;

      const allocateForLevel = (
        remaining: number,
        levelsLeft: number,
        minimumForLevel = 0
      ): number => {
        if (remaining <= 0) return 0;
        const baseline = Math.ceil(remaining / Math.max(1, levelsLeft));
        return Math.min(remaining, Math.max(minimumForLevel, baseline));
      };

      type WizardRoomKind =
        | "entry"
        | "living"
        | "kitchen"
        | "dining"
        | "office"
        | "garage"
        | "bedroom"
        | "bathroom"
        | "hall"
        | "studio"
        | "open";
      type WizardRoomSpec = {
        name: string;
        kind: WizardRoomKind;
      };
      const roomKindForName = (name: string): WizardRoomKind => {
        const normalized = name.toLowerCase();
        if (normalized.includes("studio")) return "studio";
        if (normalized.includes("kitchen")) return "kitchen";
        if (normalized.includes("dining")) return "dining";
        if (normalized.includes("office")) return "office";
        if (normalized.includes("garage")) return "garage";
        if (normalized.includes("bedroom")) return "bedroom";
        if (normalized.includes("bath")) return "bathroom";
        if (normalized.includes("hall")) return "hall";
        if (normalized.includes("entry")) return "entry";
        if (normalized.includes("living")) return "living";
        return "open";
      };
      const roomSizing = (
        kind: WizardRoomKind
      ): {
        widthFactor: number;
        heightFactor: number;
        minWidthCells: number;
        minHeightCells: number;
      } => {
        if (kind === "studio") {
          return { widthFactor: 0.96, heightFactor: 0.96, minWidthCells: 7, minHeightCells: 6 };
        }
        if (kind === "living") {
          return { widthFactor: 0.94, heightFactor: 0.9, minWidthCells: 6, minHeightCells: 5 };
        }
        if (kind === "kitchen") {
          return { widthFactor: 0.88, heightFactor: 0.82, minWidthCells: 5, minHeightCells: 4 };
        }
        if (kind === "dining") {
          return { widthFactor: 0.84, heightFactor: 0.8, minWidthCells: 4, minHeightCells: 4 };
        }
        if (kind === "bedroom") {
          return { widthFactor: 0.84, heightFactor: 0.84, minWidthCells: 4, minHeightCells: 4 };
        }
        if (kind === "bathroom") {
          return { widthFactor: 0.64, heightFactor: 0.64, minWidthCells: 3, minHeightCells: 3 };
        }
        if (kind === "office") {
          return { widthFactor: 0.78, heightFactor: 0.78, minWidthCells: 4, minHeightCells: 4 };
        }
        if (kind === "garage") {
          return { widthFactor: 0.96, heightFactor: 0.9, minWidthCells: 6, minHeightCells: 5 };
        }
        if (kind === "hall" || kind === "entry") {
          return { widthFactor: 0.7, heightFactor: 0.7, minWidthCells: 3, minHeightCells: 3 };
        }
        return { widthFactor: 0.86, heightFactor: 0.86, minWidthCells: 4, minHeightCells: 4 };
      };

      const addPerimeterWall = (
        levelId: string,
        x1: number,
        y1: number,
        x2: number,
        y2: number
      ): void => {
        this.addNode(
          "wall",
          {
            posX: x1,
            posY: y1,
            x2,
            y2,
            parentId: levelId,
            name: "Exterior Wall",
            wallHeight: 2.7,
            thickness: 0.18,
            color: null,
          },
          false
        );
      };

      for (let levelIndex = 0; levelIndex < levels; levelIndex++) {
        const isGroundLevel = levelIndex === 0;
        const isTopLevel = levelIndex === levels - 1;
        const levelsLeft = levels - levelIndex;

        const levelInset = this.gridSize * 1.5;
        const levelWidth = this.snap(Math.max(this.gridSize * 12, buildingWidth - levelInset * 2));
        const levelHeight = this.snap(Math.max(this.gridSize * 10, buildingHeight - levelInset * 2));
        const levelX = this.snap(buildingX + (buildingWidth - levelWidth) / 2);
        const levelY = this.snap(buildingY + (buildingHeight - levelHeight) / 2);
        const levelName =
          template === "studio"
            ? "Studio Level"
            : template === "apartment"
              ? levels === 1
                ? "Unit Level"
                : `Unit Level ${levelIndex + 1}`
              : levelIndex === 0
                ? "Ground Level"
                : levelIndex === 1
                  ? "Second Level"
                  : `Level ${levelIndex + 1}`;
        const levelId = this.addNode("level", {
          posX: levelX,
          posY: levelY,
          width: levelWidth,
          height: levelHeight,
          parentId: buildingId,
          elevation: levelIndex * DEFAULT_LEVEL_STACK_SPACING_M,
          name: levelName,
          color: null,
        });
        createdLevelIds.push(levelId);

        this.addNode("slab", {
          posX: levelX,
          posY: levelY,
          width: levelWidth,
          height: levelHeight,
          parentId: levelId,
          elevation: 0,
          name: "Slab",
          color: null,
        });
        this.addNode("ceiling", {
          posX: levelX,
          posY: levelY,
          width: levelWidth,
          height: levelHeight,
          parentId: levelId,
          elevation: 2.4,
          name: "Ceiling",
          color: null,
        });
        if (isTopLevel) {
          this.addNode("roof", {
            posX: levelX,
            posY: levelY,
            width: levelWidth,
            height: levelHeight,
            parentId: levelId,
            elevation: 3,
            name: "Roof",
            color: null,
          });
        }
        if (levels > 1 && !isTopLevel) {
          this.addNode("stair", {
            posX: this.snap(levelX + levelWidth * 0.68),
            posY: this.snap(levelY + levelHeight * 0.64),
            width: this.snap(Math.max(this.gridSize * 4, levelWidth * 0.2)),
            height: this.snap(Math.max(this.gridSize * 3, levelHeight * 0.22)),
            parentId: levelId,
            elevation: 0.15,
            name: "Stair",
            color: null,
          });
        }

        addPerimeterWall(levelId, levelX, levelY, levelX + levelWidth, levelY);
        addPerimeterWall(levelId, levelX + levelWidth, levelY, levelX + levelWidth, levelY + levelHeight);
        addPerimeterWall(levelId, levelX + levelWidth, levelY + levelHeight, levelX, levelY + levelHeight);
        addPerimeterWall(levelId, levelX, levelY + levelHeight, levelX, levelY);

        const bedroomsForLevel = allocateForLevel(remainingBedrooms, levelsLeft);
        remainingBedrooms -= bedroomsForLevel;
        const bathroomsForLevel = allocateForLevel(
          remainingBathrooms,
          levelsLeft,
          isGroundLevel && remainingBathrooms > 0 ? 1 : 0
        );
        remainingBathrooms -= bathroomsForLevel;

        const roomSpecs: WizardRoomSpec[] = [];
        const pushRoom = (name: string): void => {
          roomSpecs.push({ name, kind: roomKindForName(name) });
        };
        if (template === "studio") {
          if (isGroundLevel) {
            pushRoom("Studio");
            pushRoom("Kitchenette");
          }
        } else if (template === "apartment") {
          pushRoom("Living Room");
          pushRoom(isGroundLevel ? "Kitchen" : "Kitchenette");
          if (includeDining && isGroundLevel) pushRoom("Dining Nook");
          if (levels > 1) pushRoom("Hall");
          if (includeOffice && isGroundLevel) pushRoom("Office");
        } else if (isGroundLevel) {
          pushRoom("Entry");
          pushRoom("Living Room");
          pushRoom("Kitchen");
          if (includeDining) pushRoom("Dining Room");
          if (includeOffice) pushRoom("Office");
          if (includeGarage) pushRoom("Garage");
        } else {
          pushRoom("Hall");
        }

        for (let i = 0; i < bedroomsForLevel; i++) {
          pushRoom(`Bedroom ${nextBedroomNumber}`);
          nextBedroomNumber++;
        }
        for (let i = 0; i < bathroomsForLevel; i++) {
          pushRoom(`Bathroom ${nextBathroomNumber}`);
          nextBathroomNumber++;
        }
        if (roomSpecs.length === 0) {
          pushRoom(`Open Area ${levelIndex + 1}`);
        }

        const roomInset = this.gridSize * 0.9;
        const roomAreaX = levelX + roomInset;
        const roomAreaY = levelY + roomInset;
        const roomAreaWidth = Math.max(this.gridSize * 6, levelWidth - roomInset * 2);
        const roomAreaHeight = Math.max(this.gridSize * 6, levelHeight - roomInset * 2);
        const columns =
          roomSpecs.length <= 2 ? roomSpecs.length : roomSpecs.length <= 5 ? 2 : 3;
        const rows = Math.max(1, Math.ceil(roomSpecs.length / Math.max(1, columns)));
        const cellWidth = roomAreaWidth / Math.max(1, columns);
        const cellHeight = roomAreaHeight / rows;
        const cellPadding = this.gridSize * 0.4;

        for (let index = 0; index < roomSpecs.length; index++) {
          const col = columns === 0 ? 0 : index % columns;
          const row = columns === 0 ? 0 : Math.floor(index / columns);
          const roomSpec = roomSpecs[index];
          if (!roomSpec) continue;
          const sizing = roomSizing(roomSpec.kind);
          const maxRoomWidth = Math.max(this.gridSize * 2, cellWidth - cellPadding * 2);
          const maxRoomHeight = Math.max(this.gridSize * 2, cellHeight - cellPadding * 2);
          const targetWidth = cellWidth * sizing.widthFactor;
          const targetHeight = cellHeight * sizing.heightFactor;
          const minRoomWidth = Math.min(maxRoomWidth, this.gridSize * sizing.minWidthCells);
          const minRoomHeight = Math.min(maxRoomHeight, this.gridSize * sizing.minHeightCells);
          const roomWidth = this.snap(
            Math.max(
              minRoomWidth,
              Math.min(maxRoomWidth, targetWidth)
            )
          );
          const roomHeight = this.snap(
            Math.max(
              minRoomHeight,
              Math.min(maxRoomHeight, targetHeight)
            )
          );
          const roomX = this.snap(roomAreaX + col * cellWidth + (cellWidth - roomWidth) / 2);
          const roomY = this.snap(roomAreaY + row * cellHeight + (cellHeight - roomHeight) / 2);
          const roomName = roomSpec.name;
          this.addNode("room", {
            posX: roomX,
            posY: roomY,
            width: roomWidth,
            height: roomHeight,
            parentId: levelId,
            name: roomName,
            color: null,
          });

          if (!furnished) continue;
          const normalized = roomSpec.kind;
          if (
            normalized === "bathroom" ||
            normalized === "hall" ||
            normalized === "entry"
          ) {
            continue;
          }
          const furnishingName = normalized === "bedroom"
            ? "Bed"
            : normalized === "office"
              ? "Desk"
              : normalized === "kitchen"
                ? "Kitchen Island"
                : normalized === "dining"
                  ? "Dining Table"
                  : normalized === "garage"
                    ? "Workbench"
                    : "Sofa";
          this.addNode("furniture", {
            posX: this.snap(roomX + roomWidth * 0.5),
            posY: this.snap(roomY + roomHeight * 0.5),
            width: this.snap(Math.max(this.gridSize * 1.5, roomWidth * 0.32)),
            height: this.snap(Math.max(this.gridSize * 1.2, roomHeight * 0.26)),
            parentId: levelId,
            name: furnishingName,
            color: null,
          });
        }

        if (isGroundLevel) {
          this.placeOpening("door", levelX + levelWidth * 0.5, levelY + levelHeight - this.gridSize * 0.2, {
            defaultWidth: 40,
            defaultHeight: 10,
            name: "Front Door",
            maxDistance: this.gridSize * 2,
          });
        }

        const windowTargets = [
          { x: levelX + levelWidth * 0.24, y: levelY + this.gridSize * 0.2 },
          { x: levelX + levelWidth * 0.76, y: levelY + this.gridSize * 0.2 },
          { x: levelX + this.gridSize * 0.2, y: levelY + levelHeight * 0.5 },
          { x: levelX + levelWidth - this.gridSize * 0.2, y: levelY + levelHeight * 0.5 },
          { x: levelX + levelWidth * 0.5, y: levelY + levelHeight - this.gridSize * 0.2 },
        ];
        const windowsToCreate =
          template === "studio"
            ? 2
            : template === "apartment"
              ? isGroundLevel
                ? 3
                : 2
              : isGroundLevel
                ? 4
                : 3;
        for (let i = 0; i < windowsToCreate; i++) {
          const target = windowTargets[i];
          if (!target) continue;
          this.placeOpening("window", target.x, target.y, {
            defaultWidth: 60,
            defaultHeight: 10,
            name: "Window",
            maxDistance: this.gridSize * 2,
          });
        }
      }

      const anchorId = createdLevelIds[0] ?? buildingId;
      this.setSelection([anchorId]);
      this.setHierarchyContextFromNodeId(anchorId);
      this.activeTool = "select";
      return createdLevelIds;
    });

    const afterNodeCount = Object.keys(this.nodes).length;
    const createdNodeCount = replaceExisting
      ? afterNodeCount
      : Math.max(0, afterNodeCount - beforeNodeCount);
    const planTypeLabel =
      template === "single-family"
        ? "single-family"
        : template === "apartment"
          ? "apartment"
          : "studio";
    this.showStatusMessage(
      `Generated ${planTypeLabel} starter plan with ${levelIds.length} level${levelIds.length === 1 ? "" : "s"} (${createdNodeCount} nodes).`,
      "info"
    );

    return {
      createdNodeCount,
      levelIds,
      replacedExisting: replaceExisting,
    };
  }

  addStructuralNodeWithSegmentToLevel(
    levelId: string,
    type: "roof" | "stair"
  ): { structuralId: string; segmentId: string } | null {
    const level = this.nodes[levelId];
    if (!level || level.nodeType !== "level") {
      this.showStatusMessage("Select a valid Level before adding structural nodes.");
      return null;
    }

    let structuralId =
      this.nodeList.find((node) => node.parentId === levelId && node.nodeType === type)?.id ?? null;
    const createdStructural = !structuralId;
    if (!structuralId) {
      structuralId = this.createDefaultStructuralSurface(type, levelId);
    }
    if (!structuralId) {
      this.showStatusMessage(`Unable to add ${this.formatTypeLabel(type)} to this Level.`);
      return null;
    }

    const segmentId = this.addStructuralSegmentToNode(structuralId);
    if (!segmentId) return null;

    this.showStatusMessage(
      createdStructural
        ? `Added ${this.formatTypeLabel(type)} with a segment.`
        : `Added ${this.formatTypeLabel(type)} segment.`,
      "info"
    );
    return { structuralId, segmentId };
  }

  private resolveDefaultStructuralSegmentEndpoints(
    structuralNode: FloorPlanNode,
    siblingIndex: number
  ): { x1: number; y1: number; x2: number; y2: number } {
    const minX = Math.min(structuralNode.posX, structuralNode.posX + structuralNode.width);
    const maxX = Math.max(structuralNode.posX, structuralNode.posX + structuralNode.width);
    const minY = Math.min(structuralNode.posY, structuralNode.posY + structuralNode.height);
    const maxY = Math.max(structuralNode.posY, structuralNode.posY + structuralNode.height);
    const width = maxX - minX;
    const height = maxY - minY;
    const margin = this.gridSize;
    const horizontal = width >= height;

    if (horizontal) {
      let startX = this.snap(minX + margin);
      let endX = this.snap(maxX - margin);
      if (endX <= startX) {
        const centerX = this.snap((minX + maxX) / 2);
        startX = this.snap(centerX - this.gridSize * 2);
        endX = this.snap(centerX + this.gridSize * 2);
      }

      const minLane = minY + margin;
      const maxLane = maxY - margin;
      const laneSpan = maxLane - minLane;
      const laneCount = laneSpan > 0 ? Math.floor(laneSpan / this.gridSize) + 1 : 1;
      const laneIndex = laneCount > 0 ? siblingIndex % laneCount : 0;
      const laneY =
        laneCount <= 1
          ? (minY + maxY) / 2
          : minLane + (laneSpan * laneIndex) / Math.max(1, laneCount - 1);
      const y = this.snap(laneY);
      return { x1: startX, y1: y, x2: endX, y2: y };
    }

    let startY = this.snap(minY + margin);
    let endY = this.snap(maxY - margin);
    if (endY <= startY) {
      const centerY = this.snap((minY + maxY) / 2);
      startY = this.snap(centerY - this.gridSize * 2);
      endY = this.snap(centerY + this.gridSize * 2);
    }

    const minLane = minX + margin;
    const maxLane = maxX - margin;
    const laneSpan = maxLane - minLane;
    const laneCount = laneSpan > 0 ? Math.floor(laneSpan / this.gridSize) + 1 : 1;
    const laneIndex = laneCount > 0 ? siblingIndex % laneCount : 0;
    const laneX =
      laneCount <= 1
        ? (minX + maxX) / 2
        : minLane + (laneSpan * laneIndex) / Math.max(1, laneCount - 1);
    const x = this.snap(laneX);
    return { x1: x, y1: startY, x2: x, y2: endY };
  }

  addStructuralSegmentToNode(parentId: string): string | null {
    const parent = this.nodes[parentId];
    if (!parent || (parent.nodeType !== "roof" && parent.nodeType !== "stair")) {
      this.showStatusMessage("Select a valid Roof or Stair before adding a segment.");
      return null;
    }

    const segmentType: StructuralSegmentNodeType =
      parent.nodeType === "roof" ? "roof-segment" : "stair-segment";
    const siblings = this.nodeList.filter(
      (node) => node.parentId === parent.id && node.nodeType === segmentType
    );
    const { x1, y1, x2, y2 } = this.resolveDefaultStructuralSegmentEndpoints(
      parent,
      siblings.length
    );
    const nodeId = this.addNode(
      segmentType,
      {
        posX: x1,
        posY: y1,
        x2,
        y2,
        parentId: parent.id,
        name: this.formatTypeLabel(segmentType),
        wallHeight: segmentType === "roof-segment" ? 0.4 : 0.22,
        thickness: segmentType === "roof-segment" ? 0.25 : 0.16,
        elevation: parent.elevation ?? 0,
        color: null,
      },
      false
    );

    this.setSelection([nodeId]);
    this.setHierarchyContextFromNodeId(nodeId);
    return nodeId;
  }

  resolveParentForCreation(nodeType: FloorPlanNodeType, x: number, y: number): string | null {
    let parentId = this.resolveDefaultParent(nodeType, x, y);
    if (parentId) return parentId;

    const requiredParentType = HIERARCHY_PARENT_BY_TYPE[nodeType];
    if (!requiredParentType) return null;
    if (!this.autoCreateMissingParents) return null;

    const created = this.autoCreateHierarchyParentsForType(nodeType, x, y);
    parentId =
      this.resolveDefaultParent(nodeType, x, y) ??
      this.findFirstNodeIdInActiveContext(requiredParentType) ??
      (this.hasHierarchyContext() ? null : this.findFirstNodeId(requiredParentType));

    if (created) {
      this.showStatusMessage(
        `Created missing parent nodes for ${this.formatTypeLabel(nodeType)}.`,
        "info"
      );
    }

    return parentId;
  }

  duplicateLevel(
    levelId: string,
    options?: {
      includeDescendants?: boolean;
    }
  ): string | null {
    const level = this.nodes[levelId];
    if (!level || level.nodeType !== "level") return null;
    const buildingId = level.parentId;
    if (!buildingId || this.nodes[buildingId]?.nodeType !== "building") {
      this.showStatusMessage("Level must be parented to a Building before duplicating.");
      return null;
    }

    const siblings = this.sortLevels(this.getBuildingLevels(buildingId));
    const maxElevation = siblings.reduce(
      (max, candidate) => Math.max(max, candidate.elevation ?? 0),
      0
    );
    const nextElevation = maxElevation + DEFAULT_LEVEL_STACK_SPACING_M;
    const includeDescendants = options?.includeDescendants ?? true;
    const subtree = includeDescendants ? this.collectLevelSubtree(levelId) : [level];
    if (subtree.length === 0) return null;

    const idMap = new Map<string, string>();
    for (const node of subtree) {
      idMap.set(node.id, nanoid());
    }

    const now = new Date().toISOString();
    const nextLevelId = idMap.get(levelId);
    if (!nextLevelId) return null;

    const clonedLevelName = this.makeUniqueLevelName(
      buildingId,
      `${level.name ?? "Level"} Copy`
    );

    for (const node of subtree) {
      const clonedId = idMap.get(node.id);
      if (!clonedId) continue;
      const clonedParentId =
        node.id === levelId
          ? buildingId
          : node.parentId && idMap.has(node.parentId)
            ? idMap.get(node.parentId)!
            : node.parentId;
      // Note: `...node` copies `workspaceId` from the source. Today every
      // node in `this.nodes` shares the single active workspace and the
      // server strips client-supplied `workspaceId` anyway. If multi-
      // workspace node handling is ever added, this clone path needs to
      // re-derive `workspaceId` (and related tenant fields) from the
      // active auth context rather than inheriting from the source.
      const clone: FloorPlanNode = {
        ...node,
        id: clonedId,
        parentId: clonedParentId,
        elevation: node.id === levelId ? nextElevation : node.elevation,
        name: node.id === levelId ? clonedLevelName : node.name,
        createdAt: now,
        updatedAt: now,
        deletedAt: null,
      };
      this.nodes[clone.id] = clone;
    }

    this.isDirty = true;
    this.pushHistory();
    this.setSelection([nextLevelId]);
    this.setHierarchyContextFromNodeId(nextLevelId);
    return nextLevelId;
  }

  moveLevel(levelId: string, direction: LevelMoveDirection): boolean {
    const level = this.nodes[levelId];
    if (!level || level.nodeType !== "level") return false;
    const siblings = this.getLevelSiblings(levelId);
    const currentIndex = siblings.findIndex((candidate) => candidate.id === levelId);
    if (currentIndex < 0) return false;
    const swapIndex = direction === "up" ? currentIndex - 1 : currentIndex + 1;
    if (swapIndex < 0 || swapIndex >= siblings.length) {
      this.showStatusMessage(
        direction === "up" ? "Level is already at the top." : "Level is already at the bottom."
      );
      return false;
    }

    const target = siblings[swapIndex];
    // Pre-check both ends of the swap — if either is locked, skip
    // entirely rather than half-complete (which would leave the
    // elevations out of sync between the two levels).
    if (this.isNodeLocked(level.id) || this.isNodeLocked(target.id)) {
      this.showStatusMessage("One of the levels is locked.");
      return false;
    }
    const levelElevation = level.elevation ?? 0;
    const targetElevation = target.elevation ?? 0;
    this.updateNodeUnchecked(level.id, { elevation: targetElevation });
    this.updateNodeUnchecked(target.id, { elevation: levelElevation });
    this.commitChange();
    return true;
  }

  deleteLevelWithFallback(levelId: string): boolean {
    const level = this.nodes[levelId];
    if (!level || level.nodeType !== "level") return false;
    if (!this.canDeleteLevel(levelId)) {
      this.showStatusMessage("Ground level cannot be deleted.");
      return false;
    }

    const siblings = this.getLevelSiblings(levelId);
    const index = siblings.findIndex((candidate) => candidate.id === levelId);
    const fallbackLevel =
      (index > 0 ? siblings[index - 1] : siblings[index + 1]) ?? null;
    const buildingId = level.parentId;

    if (fallbackLevel) {
      // Change context BEFORE calling setSelection so the fallback
      // level is in scope when `replaceSelection` filters by visibility.
      // If we set the selection first, the current active level (which
      // is about to be deleted) is still the active context, so the
      // fallback — being a sibling, not a descendant — gets filtered
      // out and selection ends up empty after the context swap.
      this.setHierarchyContextFromNodeId(fallbackLevel.id);
      this.setSelection([levelId, fallbackLevel.id]);
    } else if (buildingId && this.nodes[buildingId]?.nodeType === "building") {
      this.setHierarchyContextFromNodeId(buildingId);
      this.setSelection([levelId, buildingId]);
    }

    this.deleteNode(levelId);
    return true;
  }

  showStatusMessage(
    message: string,
    tone: "warning" | "info" = "warning",
    durationMs = 2800
  ): void {
    if (this.statusMessageTimer !== null) {
      clearTimeout(this.statusMessageTimer);
    }
    this.statusMessage = message;
    this.statusMessageTone = tone;
    this.statusMessageTimer = setTimeout(() => {
      this.statusMessage = null;
      this.statusMessageTimer = null;
    }, durationMs);
  }

  clearStatusMessage(): void {
    if (this.statusMessageTimer !== null) {
      clearTimeout(this.statusMessageTimer);
      this.statusMessageTimer = null;
    }
    this.statusMessage = null;
  }

  /**
   * Pure predicate: would the tool be valid to activate right now,
   * WITHOUT creating missing parents or emitting status messages?
   * Use from derivations and disabled-state checks where a side
   * effect would be surprising.
   */
  canActivateTool(tool: EditorTool): boolean {
    const targetType = TOOL_NODE_TYPE[tool] ?? null;
    if (!targetType) return true;
    const requiredParentType = HIERARCHY_PARENT_BY_TYPE[targetType];
    if (!requiredParentType) return true;
    return this.hasNodeTypeInActiveContext(requiredParentType);
  }

  /**
   * Activation gate for event handlers. If the tool isn't currently
   * valid, this may auto-create missing parent nodes (when the user
   * has enabled `autoCreateMissingParents`) and will always emit a
   * status message explaining the outcome. Returns `true` iff the
   * tool is ready to use after this call.
   *
   * Callers that just need to ask "is this tool usable?" (e.g. to
   * grey out a button) should use `canActivateTool` instead — that
   * variant is a pure predicate with no side effects.
   */
  tryActivateTool(tool: EditorTool): boolean {
    const targetType = TOOL_NODE_TYPE[tool] ?? null;
    if (!targetType) return true;
    const requiredParentType = HIERARCHY_PARENT_BY_TYPE[targetType];
    if (!requiredParentType) return true;
    if (this.hasNodeTypeInActiveContext(requiredParentType)) return true;
    if (this.autoCreateMissingParents) {
      const center = this.getViewportCenter();
      const created = this.autoCreateHierarchyParentsForType(targetType, center.x, center.y);
      if (this.hasNodeTypeInActiveContext(requiredParentType)) {
        if (created) {
          this.showStatusMessage(
            `Created missing parent nodes for ${this.formatTypeLabel(targetType)}.`,
            "info"
          );
        }
        return true;
      }
    }
    this.showStatusMessage(
      `Create a ${this.formatTypeLabel(requiredParentType)} before using ${this.formatTypeLabel(targetType)}.`
    );
    return false;
  }

  requireParentForCreation(
    nodeType: FloorPlanNodeType,
    parentId: string | null
  ): boolean {
    const requiredParentType = HIERARCHY_PARENT_BY_TYPE[nodeType];
    if (!requiredParentType) return true;
    if (parentId) return true;
    this.showStatusMessage(
      `Create a ${this.formatTypeLabel(requiredParentType)} first, then draw ${this.formatTypeLabel(nodeType)}.`
    );
    return false;
  }

  reparentHierarchyNode(nodeId: string, parentId: string | null): boolean {
    const node = this.nodes[nodeId];
    if (!node) return false;
    if (this.isNodeLocked(nodeId)) {
      this.showStatusMessage(this.describeLockState(nodeId));
      return false;
    }
    if (parentId === nodeId) {
      this.showStatusMessage("A node cannot be parented to itself.");
      return false;
    }

    const requiredParentType = HIERARCHY_PARENT_BY_TYPE[node.nodeType];
    if (!requiredParentType) return false;
    const allowNullParent = node.nodeType === "building";
    if (parentId === null && !allowNullParent) {
      this.showStatusMessage(
        `${this.formatTypeLabel(node.nodeType)} nodes require a ${this.formatTypeLabel(requiredParentType)} parent.`
      );
      return false;
    }

    if (parentId !== null) {
      const parent = this.nodes[parentId];
      if (!parent) {
        this.showStatusMessage("Drop target parent no longer exists.");
        return false;
      }
      if (this.isNodeLocked(parentId)) {
        this.showStatusMessage(this.describeLockState(parentId));
        return false;
      }
      if (parent.nodeType !== requiredParentType) {
        this.showStatusMessage(
          `${this.formatTypeLabel(node.nodeType)} nodes must be parented to ${this.formatTypeLabel(requiredParentType)} nodes.`
        );
        return false;
      }
      if (this.isDescendantOf(parentId, nodeId)) {
        this.showStatusMessage("Cannot reparent a node under one of its descendants.");
        return false;
      }
    }

    if (node.parentId === parentId) return true;
    this.updateNode(nodeId, { parentId });
    this.normalizeHierarchyContext();
    this.commitChange();
    return true;
  }

  // Node operations
  addNode(
    type: FloorPlanNodeType,
    props: Partial<FloorPlanNode> & { posX: number; posY: number },
    snapPosition = true
  ): string {
    const id = nanoid();
    const now = new Date().toISOString();

    const node: FloorPlanNode = {
      id,
      workspaceId: 0,
      homeId: this.homeId,
      floorLevel: this.floorLevel,
      parentId: props.parentId ?? null,
      nodeType: type,
      name: props.name ?? null,
      posX: snapPosition ? this.snap(props.posX) : props.posX,
      posY: snapPosition ? this.snap(props.posY) : props.posY,
      width: props.width ?? 0,
      height: props.height ?? 0,
      rotation: props.rotation ?? 0,
      x2: props.x2 ?? null,
      y2: props.y2 ?? null,
      wallHeight: props.wallHeight ?? 2.5,
      thickness: props.thickness ?? 0.15,
      elevation: props.elevation ?? 0,
      color: props.color ?? null,
      opacity: props.opacity ?? 1,
      linkedLocationId: props.linkedLocationId ?? null,
      linkedItemId: props.linkedItemId ?? null,
      properties: props.properties ?? null,
      createdAt: now,
      updatedAt: now,
      deletedAt: null,
    };

    this.nodes[id] = node;
    this.isDirty = true;
    this.pushHistory();
    return id;
  }

  createAssetReference(type: "scan" | "guide", centerX: number, centerY: number): string {
    const minWidth = this.gridSize * 8;
    const maxWidth = this.gridSize * 30;
    const targetWidth = Math.max(minWidth, Math.min(this.viewBoxWidth * 0.45, maxWidth));
    const width = this.snap(targetWidth);
    const height = this.snap(Math.max(this.gridSize * 6, width * 0.75));
    const posX = this.snap(centerX - width / 2);
    const posY = this.snap(centerY - height / 2);
    const properties = JSON.stringify({
      lockAspectRatio: true,
    });

    return this.addNode(type, {
      posX,
      posY,
      width,
      height,
      parentId: this.resolveDefaultContentParentId(),
      name: type === "scan" ? "Scan" : "Guide",
      opacity: type === "scan" ? 0.65 : 0.8,
      color: null,
      properties,
    });
  }

  /**
   * Thin reactive wrapper around the pure `findOpeningPlacement` helper.
   * The store owns the node map; the geometry module owns the math.
   *
   * Scoped by `floorLevel` so the 3D exploded/stacked views (which render
   * walls from every floor simultaneously) can't reparent a dragged door
   * onto a wall on a different storey. `floorLevel === undefined` falls
   * back to the store's active floor for new placements.
   */
  private findOpeningPlacement(
    x: number,
    y: number,
    openingWidth: number,
    maxDistance = 30,
    excludeOpeningId?: string,
    floorLevel?: number
  ): OpeningPlacement | null {
    const level = floorLevel ?? this.floorLevel;
    const walls: FloorPlanNode[] = [];
    const openings: FloorPlanNode[] = [];
    for (const node of this.nodeList) {
      if (node.floorLevel !== level) continue;
      if (node.nodeType === "wall") walls.push(node);
      else if (OPENING_NODE_TYPES.has(node.nodeType)) openings.push(node);
    }
    return findOpeningPlacementPure(
      walls,
      openings,
      x,
      y,
      openingWidth,
      maxDistance,
      excludeOpeningId
    );
  }

  /**
   * Place a door or window. Snaps onto the nearest wall within `maxDistance`
   * and inherits the wall's orientation so the 3D mesh aligns with the CSG
   * opening. Placement is clamped inside wall extents and avoids overlap with
   * sibling openings. Falls back to an unparented placement if no valid wall
   * slot is near — the user can still see the node in both views, but it
   * won't cut an opening.
   *
   * Used by both the 2D canvas and the 3D scene creation handlers so the
   * placement behaviour is identical regardless of which view the user is in.
   */
  placeOpening(
    type: "door" | "window",
    x: number,
    y: number,
    options: {
      defaultWidth: number;
      defaultHeight: number;
      name: string;
      maxDistance?: number;
    }
  ): string {
    let posX = x;
    let posY = y;
    let rotation = 0;
    let parentId: string | null = null;

    const placement = this.findOpeningPlacement(
      x,
      y,
      options.defaultWidth,
      options.maxDistance
    );
    if (placement) {
      posX = placement.posX;
      posY = placement.posY;
      parentId = placement.wallId;
      rotation = placement.rotation;
    } else {
      // No valid wall was found near the cursor. The schema only lets
      // doors and windows attach to `wall` nodes — not fences, roof
      // segments, or stair segments — so a user clicking on a visually
      // similar fence gets silent no-op placement. Surface a hint so
      // they know the placement won't cut an opening in 3D.
      const searchRadius = options.maxDistance ?? 30;
      const nearSegmentOtherType = this.nodeList.some(
        (candidate) =>
          candidate.floorLevel === this.floorLevel &&
          (candidate.nodeType === "fence" ||
            candidate.nodeType === "roof-segment" ||
            candidate.nodeType === "stair-segment") &&
          candidate.x2 !== null &&
          candidate.y2 !== null &&
          this.pointToSegmentDistance(
            x,
            y,
            candidate.posX,
            candidate.posY,
            candidate.x2,
            candidate.y2
          ) <= searchRadius
      );
      if (nearSegmentOtherType) {
        this.showStatusMessage(
          `${type === "door" ? "Doors" : "Windows"} can only attach to walls. Placed unparented.`,
          "info"
        );
      }
    }

    return this.addNode(type, {
      posX,
      posY,
      parentId,
      rotation,
      width: options.defaultWidth,
      height: options.defaultHeight,
      name: options.name,
      color: null,
    }, false);
  }

  /**
   * Shortest perpendicular distance from `(px, py)` to the segment
   * `(x1, y1) → (x2, y2)`. Used by opening-placement feedback to notice
   * when the user is hovering near a non-wall segment (fence / roof /
   * stair) that the door/window can't attach to.
   */
  private pointToSegmentDistance(
    px: number,
    py: number,
    x1: number,
    y1: number,
    x2: number,
    y2: number
  ): number {
    const dx = x2 - x1;
    const dy = y2 - y1;
    const lenSq = dx * dx + dy * dy;
    if (lenSq < 1) return Math.hypot(px - x1, py - y1);
    const t = Math.max(0, Math.min(1, ((px - x1) * dx + (py - y1) * dy) / lenSq));
    const projX = x1 + dx * t;
    const projY = y1 + dy * t;
    return Math.hypot(px - projX, py - projY);
  }

  /**
   * Resolve a sensible default parent for hierarchy nodes at a given point.
   * Preference order:
   *   1) Parent whose bounds contain the point (smallest containing area wins)
   *   2) Closest parent by centre distance
   */
  resolveDefaultParent(nodeType: FloorPlanNodeType, x: number, y: number): string | null {
    const requiredParentType = HIERARCHY_PARENT_BY_TYPE[nodeType];
    if (!requiredParentType) return null;

    const resolveCandidate = (candidates: FloorPlanNode[]): string | null => {
      let bestContaining: { id: string; area: number } | null = null;
      let bestNearest: { id: string; dist: number } | null = null;

      for (const node of candidates) {
        if (node.width <= 0 || node.height <= 0) continue;

        const minX = Math.min(node.posX, node.posX + node.width);
        const maxX = Math.max(node.posX, node.posX + node.width);
        const minY = Math.min(node.posY, node.posY + node.height);
        const maxY = Math.max(node.posY, node.posY + node.height);
        const area = (maxX - minX) * (maxY - minY);
        if (area <= 0) continue;

        const contains = x >= minX && x <= maxX && y >= minY && y <= maxY;
        if (contains && (!bestContaining || area < bestContaining.area)) {
          bestContaining = { id: node.id, area };
        }

        const cx = minX + (maxX - minX) / 2;
        const cy = minY + (maxY - minY) / 2;
        const dist = Math.hypot(x - cx, y - cy);
        if (!bestNearest || dist < bestNearest.dist) {
          bestNearest = { id: node.id, dist };
        }
      }

      return bestContaining?.id ?? bestNearest?.id ?? null;
    };

    const allCandidates = this.nodeList.filter(
      (node) => node.nodeType === requiredParentType
    );
    if (allCandidates.length === 0) return null;
    const contextCandidates = allCandidates.filter((node) =>
      this.isNodeInActiveHierarchyContext(node)
    );
    const scoped = resolveCandidate(contextCandidates);
    if (scoped) return scoped;
    if (this.hasHierarchyContext()) return null;
    return resolveCandidate(allCandidates);
  }

  /**
   * Return the wall whose segment is closest to `(x, y)` within `maxDistance`
   * pixels, and the projected point on that wall. Used to snap doors/windows
   * onto walls at creation time and on drag.
   */
  findNearestWall(
    x: number,
    y: number,
    maxDistance = 30
  ): { wallId: string; projectedX: number; projectedY: number } | null {
    return findNearestWallPure(
      this.nodeList.filter((n) => n.nodeType === "wall"),
      x,
      y,
      maxDistance
    );
  }

  /**
   * After dragging a door/window, re-attach it to whatever wall it's now
   * closest to while preserving non-overlap constraints. Removes the parent +
   * resets rotation if no valid wall slot is near. Called after drag-end so
   * moving a door across the plan re-parents it.
   */
  reparentOpeningToNearestWall(id: string, maxDistance = 30): void {
    const node = this.nodes[id];
    if (!node) return;
    if (node.nodeType !== "door" && node.nodeType !== "window") return;

    // Restrict candidate walls to the dragged node's own floor. In 3D
    // exploded/stacked views, walls from other storeys are visible and
    // geometrically nearest; without this scope a door dragged through
    // the air could reattach to a wall on the level above.
    const placement = this.findOpeningPlacement(
      node.posX,
      node.posY,
      node.width || 1,
      maxDistance,
      id,
      node.floorLevel
    );
    if (placement) {
      this.updateNode(id, {
        parentId: placement.wallId,
        posX: placement.posX,
        posY: placement.posY,
        rotation: placement.rotation,
      });
    } else if (node.parentId !== null) {
      this.updateNode(id, { parentId: null, rotation: 0 });
    }
  }

  /**
   * Public mutation entry point. Respects `isNodeLocked` so panel inputs,
   * scripts, or AI flows can't silently edit a node the user has frozen
   * in place. Callers that specifically need to mutate a locked node
   * (e.g. `setNodeLocked` flipping the lock itself, undo/redo restore)
   * use `updateNodeUnchecked` directly.
   */
  updateNode(id: string, updates: Partial<FloorPlanNode>): boolean {
    if (this.isNodeLocked(id)) {
      this.showStatusMessage(this.describeLockState(id));
      return false;
    }
    this.updateNodeUnchecked(id, updates);
    return true;
  }

  /**
   * Trusted mutation: bypasses the lock check. Only for internal store
   * machinery (lock toggling, snapshot restore, wall-child rigid
   * translation of UNLOCKED children — callers are responsible for the
   * per-child lock check in that last case).
   */
  private updateNodeUnchecked(id: string, updates: Partial<FloorPlanNode>): void {
    const node = this.nodes[id];
    if (!node) return;
    this.nodes[id] = { ...node, ...updates, updatedAt: new Date().toISOString() };
    this.isDirty = true;
    // No pushHistory here — call commitChange() after a batch of updates (e.g. drag end)
  }

  commitChange() {
    this.pushHistory();
  }

  /**
   * Nudge every selected node by the given pixel delta. Used by the
   * keyboard handler on individual node components: pressing an arrow key
   * while a node is selected shifts it one grid cell (Shift+arrow = 10x).
   * Walls update both endpoints so the node moves rigidly.
   *
   * History is committed lazily via a trailing timer so rapid arrow-key
   * presses collapse into a single undo step. Without coalescing, holding
   * an arrow would evict the entire 50-entry undo ring within seconds.
   */
  private nudgeCommitTimer: ReturnType<typeof setTimeout> | null = null;

  nudgeSelection(dx: number, dy: number): void {
    if (this.selectedNodeIds.size === 0) return;
    let moved = false;
    for (const id of this.selectedNodeIds) {
      moved = this.moveNode(id, dx, dy) || moved;
    }
    if (!moved) return;
    if (this.nudgeCommitTimer !== null) {
      clearTimeout(this.nudgeCommitTimer);
    }
    this.nudgeCommitTimer = setTimeout(() => {
      this.nudgeCommitTimer = null;
      this.commitChange();
    }, 250);
  }

  moveNode(id: string, dx: number, dy: number): boolean {
    const node = this.nodes[id];
    if (!node) return false;
    if (this.isNodeLocked(id)) return false;

    const newX = this.snap(node.posX + dx);
    const newY = this.snap(node.posY + dy);
    const appliedDx = newX - node.posX;
    const appliedDy = newY - node.posY;
    if (appliedDx === 0 && appliedDy === 0) return false;

    const updates: Partial<FloorPlanNode> = { posX: newX, posY: newY };

    if (WALL_LIKE_NODE_TYPES.has(node.nodeType) && node.x2 !== null && node.y2 !== null) {
      updates.x2 = this.snap((node.x2 ?? 0) + dx);
      updates.y2 = this.snap((node.y2 ?? 0) + dy);
    }

    const now = new Date().toISOString();
    this.nodes[id] = { ...node, ...updates, updatedAt: now };

    // Keep wall children (doors/windows) rigidly attached when translating a wall.
    //
    // Per-child guards:
    //   - Lock: a door the user explicitly froze stays put even when its
    //     parent wall moves. A warning would be noisy during drags, so the
    //     cascade quietly skips locked children; the properties panel
    //     enforces the user-facing "locked" feedback on explicit edits.
    //   - Floor: in 3D exploded/stacked views a door that was previously
    //     reparented onto a wall on a different storey (via a bug that
    //     earlier fixes closed) would otherwise get dragged across floors.
    //     Treat the wall's own `floorLevel` as the authoritative scope.
    if (node.nodeType === "wall") {
      const children = Object.values(this.nodes).filter(
        (candidate) =>
          candidate.parentId === id &&
          OPENING_NODE_TYPES.has(candidate.nodeType) &&
          candidate.floorLevel === node.floorLevel &&
          !this.isNodeLocked(candidate.id)
      );
      for (const child of children) {
        const childX = this.snap(child.posX + appliedDx);
        const childY = this.snap(child.posY + appliedDy);
        this.nodes[child.id] = {
          ...child,
          posX: childX,
          posY: childY,
          updatedAt: now,
        };
      }
    }

    this.isDirty = true;
    return true;
  }

  private expandCascadeDeleteIds(ids: string[]): string[] {
    const expanded = new Set(ids.filter((id) => !!this.nodes[id]));
    if (expanded.size === 0) return [];

    // Cascade deletes through the full parent chain (site -> building ->
    // level, wall -> door/window, etc.) so parent deletion never leaves
    // orphan descendants behind.
    let didExpand = true;
    while (didExpand) {
      didExpand = false;
      for (const node of Object.values(this.nodes)) {
        if (!node.parentId) continue;
        if (!expanded.has(node.parentId)) continue;
        if (expanded.has(node.id)) continue;
        expanded.add(node.id);
        didExpand = true;
      }
    }
    return [...expanded];
  }

  /**
   * Record a batch of ids as pending deletion. O(1) per id via the Set
   * mirror, then one reactive reassignment of `deletedNodeIds` if any
   * ids were new. Existing ids are no-ops (idempotent).
   */
  private recordDeletedIds(ids: Iterable<string>): void {
    let didAdd = false;
    for (const id of ids) {
      if (this.deletedNodeIdsSet.has(id)) continue;
      this.deletedNodeIdsSet.add(id);
      didAdd = true;
    }
    if (didAdd) {
      this.deletedNodeIds = [...this.deletedNodeIdsSet];
    }
  }

  deleteNode(id: string) {
    if (!this.nodes[id]) return;
    if (this.isNodeLocked(id)) {
      this.showStatusMessage(this.describeLockState(id));
      return;
    }

    const deleteIds = this.expandCascadeDeleteIds([id]);
    const lockedId = deleteIds.find((deleteId) => this.isNodeLocked(deleteId));
    if (lockedId) {
      this.showStatusMessage(this.describeLockState(lockedId));
      return;
    }
    this.recordDeletedIds(deleteIds);
    for (const deleteId of deleteIds) {
      delete this.nodes[deleteId];
    }
    for (const deleteId of deleteIds) {
      this.selectedNodeIds.delete(deleteId);
    }
    this.normalizeHierarchyContext();
    this.isDirty = true;
    this.pushHistory();
  }

  deleteSelected() {
    const ids = this.expandCascadeDeleteIds([...this.selectedNodeIds]);
    if (ids.length === 0) return;
    const lockedId = ids.find((id) => this.isNodeLocked(id));
    if (lockedId) {
      this.showStatusMessage(this.describeLockState(lockedId));
      return;
    }
    this.recordDeletedIds(ids);
    for (const id of ids) {
      delete this.nodes[id];
    }
    this.selectedNodeIds.clear();
    this.normalizeHierarchyContext();
    this.isDirty = true;
    this.pushHistory();
  }

  // Selection
  setSelection(ids: Iterable<string>) {
    this.replaceSelection(ids);
    if (this.selectedNodeIds.size === 1) {
      const onlyId = this.selectedNodeIds.values().next().value as string | undefined;
      if (onlyId) {
        this.setHierarchyContextFromNodeId(onlyId);
      }
    }
  }

  selectNode(id: string, addToSelection = false): boolean {
    const node = this.nodes[id];
    if (!node) return false;
    if (this.isNodeHidden(id)) return false;
    if (this.isNodeLocked(id)) {
      this.showStatusMessage(this.describeLockState(id));
      return false;
    }
    if (!this.isNodeVisibleInCurrentContext(node)) {
      // Single-click jumps scope to the clicked node so sidebar / hierarchy
      // picks work regardless of current context.
      // Shift-click (addToSelection) deliberately does NOT auto-scope —
      // it would surprise users who expected to extend the selection
      // inside the current scope. Instead surface a clear message and
      // refuse, so the failure path is visible rather than silent.
      if (!addToSelection) {
        this.setHierarchyContextFromNodeId(id);
        if (!this.isNodeVisibleInCurrentContext(node)) return false;
      } else {
        this.showStatusMessage(
          "Node is outside the current scope. Click it without Shift to jump there first.",
          "info"
        );
        return false;
      }
    }
    if (addToSelection) {
      if (this.selectedNodeIds.has(id)) {
        this.selectedNodeIds.delete(id);
      } else {
        this.selectedNodeIds.add(id);
      }
    } else {
      this.replaceSelection([id]);
      this.setHierarchyContextFromNodeId(id);
    }
    return true;
  }

  clearSelection() {
    this.selectedNodeIds.clear();
  }

  selectAll() {
    this.replaceSelection(Object.keys(this.nodes));
  }

  // Viewport
  pan(dx: number, dy: number) {
    this.viewBoxX -= dx / this.zoom;
    this.viewBoxY -= dy / this.zoom;
  }

  zoomTo(newZoom: number, centerX?: number, centerY?: number) {
    const clampedZoom = Math.max(0.1, Math.min(5, newZoom));
    // Cursor-anchored zoom: scale the current viewBox around the provided
    // world pivot so the pivot stays under the cursor after zoom. Preserves
    // whatever aspect ratio the view currently has instead of snapping back
    // to a hardcoded 1200×800, which would drift on any non-default size.
    const scale = this.zoom === 0 ? 1 : this.zoom / clampedZoom;

    if (centerX !== undefined && centerY !== undefined) {
      this.viewBoxX = centerX - (centerX - this.viewBoxX) * scale;
      this.viewBoxY = centerY - (centerY - this.viewBoxY) * scale;
    } else {
      const cx = this.viewBoxX + this.viewBoxWidth / 2;
      const cy = this.viewBoxY + this.viewBoxHeight / 2;
      this.viewBoxX = cx - (this.viewBoxWidth * scale) / 2;
      this.viewBoxY = cy - (this.viewBoxHeight * scale) / 2;
    }
    this.viewBoxWidth *= scale;
    this.viewBoxHeight *= scale;
    this.zoom = clampedZoom;
  }

  zoomIn() {
    this.zoomTo(this.zoom * 1.2);
  }

  zoomOut() {
    this.zoomTo(this.zoom / 1.2);
  }

  resetView() {
    this.viewBoxX = 0;
    this.viewBoxY = 0;
    this.viewBoxWidth = 1200;
    this.viewBoxHeight = 800;
    this.zoom = 1;
  }

  // Grid snapping
  snap(value: number): number {
    if (!this.snapToGrid) return value;
    return Math.round(value / this.gridSize) * this.gridSize;
  }

  /**
   * Capture the current editor state — nodes + deletions + selection +
   * viewport — as a single snapshot. Selection and viewport are included
   * so an undo doesn't yank the user somewhere unexpected after a drag or
   * zoom, which used to happen because only `nodes` was snapshotted.
   */
  /**
   * Run a batch of mutations with history disabled, then push a single
   * combined snapshot at the end (unless nothing changed or the caller
   * wants to suppress it via `commit = false`). Nested calls are
   * supported — only the outermost batch records the snapshot.
   *
   * If the mutator throws, the thrown error propagates and NO snapshot
   * is committed — snapshotting partial state would bake an incoherent
   * in-between state into the undo stack.
   */
  withHistoryBatch<T>(mutator: () => T, commit = true): T {
    this.historySuppressionDepth++;
    let threw = false;
    try {
      return mutator();
    } catch (error) {
      threw = true;
      throw error;
    } finally {
      this.historySuppressionDepth--;
      if (!threw && this.historySuppressionDepth === 0 && commit) {
        this.pushHistory();
      }
    }
  }

  pushHistory() {
    if (this.historySuppressionDepth > 0) return;
    const snapshot: HistorySnapshot = {
      nodes: { ...this.nodes },
      deletedNodeIds: [...this.deletedNodeIds],
      selectedNodeIds: [...this.selectedNodeIds],
      viewBoxX: this.viewBoxX,
      viewBoxY: this.viewBoxY,
      viewBoxWidth: this.viewBoxWidth,
      viewBoxHeight: this.viewBoxHeight,
      zoom: this.zoom,
    };

    if (this.historyIndex < this.history.length - 1) {
      this.history = this.history.slice(0, this.historyIndex + 1);
    }

    this.history.push(snapshot);

    if (this.history.length > MAX_HISTORY) {
      this.history.shift();
    }

    this.historyIndex = this.history.length - 1;
    this.canUndo = this.historyIndex > 0;
    this.canRedo = false;
  }

  private applySnapshot(snapshot: HistorySnapshot) {
    // Spread into a fresh object so later `this.nodes[id] = …` mutations
    // only touch the active map, not the snapshot we just restored from.
    this.nodes = { ...snapshot.nodes };
    this.deletedNodeIds = [...snapshot.deletedNodeIds];
    this.deletedNodeIdsSet = new Set(snapshot.deletedNodeIds);
    this.replaceSelection(snapshot.selectedNodeIds);
    if (this.selectedNodeIds.size === 1) {
      const selectedId = this.selectedNodeIds.values().next().value as string | undefined;
      if (selectedId) {
        this.setHierarchyContextFromNodeId(selectedId);
      }
    } else {
      this.normalizeHierarchyContext();
      this.pruneSelectionToVisibleNodes();
    }
    this.viewBoxX = snapshot.viewBoxX;
    this.viewBoxY = snapshot.viewBoxY;
    this.viewBoxWidth = snapshot.viewBoxWidth;
    this.viewBoxHeight = snapshot.viewBoxHeight;
    this.zoom = snapshot.zoom;
  }

  undo() {
    if (this.historyIndex <= 0) return;
    this.historyIndex--;
    this.applySnapshot(this.history[this.historyIndex]);
    this.isDirty = true;
    this.canUndo = this.historyIndex > 0;
    this.canRedo = true;
  }

  redo() {
    if (this.historyIndex >= this.history.length - 1) return;
    this.historyIndex++;
    this.applySnapshot(this.history[this.historyIndex]);
    this.isDirty = true;
    this.canUndo = true;
    this.canRedo = this.historyIndex < this.history.length - 1;
  }

  /**
   * Serialization for saving. Emits only nodes whose reference differs
   * from the last-persisted baseline (or have no baseline entry at all,
   * i.e. newly created). Reference inequality is an exact diff because
   * every mutation path creates a fresh object via `{...node, ...updates}`.
   * A 2000-node plan with a single tweak ships a 1-node payload.
   *
   * `workspaceId` is stripped — the server sets it from the authenticated
   * context and never trusts a client-supplied value.
   */
  getNodesForSave(): FloorPlanNodeInput[] {
    const result: FloorPlanNodeInput[] = [];
    for (const node of Object.values(this.nodes)) {
      if (this.lastSavedNodes[node.id] === node) continue;
      const { workspaceId: _workspaceId, ...rest } = node;
      result.push({
        ...rest,
        homeId: this.homeId,
        floorLevel: this.floorLevel,
      });
    }
    return result;
  }

  /**
   * Snapshot the save payload along with the live node references that
   * back it. Call `markSaved(captured.sentRefs, captured.sentDeletedIds)`
   * after the network mutation succeeds to baseline exactly those records,
   * NOT any mutations that happened while the save was in flight.
   *
   * Without this split, a new node drawn between `await` start and
   * success would be included in `markSaved()`'s baseline (treated as
   * persisted) and silently skipped on the next save — lost work.
   */
  prepareSave(): {
    nodes: FloorPlanNodeInput[];
    deletedNodeIds: string[];
    sentRefs: Record<string, FloorPlanNode>;
    sentDeletedIds: string[];
  } {
    const nodes = this.getNodesForSave();
    const sentDeletedIds = [...this.deletedNodeIds];
    const sentRefs: Record<string, FloorPlanNode> = {};
    for (const input of nodes) {
      const ref = this.nodes[input.id];
      if (ref) sentRefs[input.id] = ref;
    }
    return { nodes, deletedNodeIds: sentDeletedIds, sentRefs, sentDeletedIds };
  }

  /**
   * Baseline exactly the node references that were sent on a prior
   * `prepareSave()` + successful server round-trip. References created
   * AFTER `prepareSave` stay dirty and will ship on the next save.
   *
   * Called with no arguments: baselines ALL current nodes as persisted
   * and clears the full `deletedNodeIds` queue. Suitable for tests and
   * non-racing flows where the whole store state is known to be flushed;
   * production saves should always pass the captured refs to preserve
   * in-flight work.
   */
  markSaved(
    sentRefs?: Record<string, FloorPlanNode>,
    sentDeletedIds?: string[]
  ): void {
    if (sentRefs === undefined && sentDeletedIds === undefined) {
      this.deletedNodeIds = [];
      this.deletedNodeIdsSet.clear();
      this.lastSavedNodes = { ...this.nodes };
      this.isDirty = false;
      return;
    }
    const deletedSet = new Set(sentDeletedIds ?? []);
    this.deletedNodeIds = this.deletedNodeIds.filter((id) => !deletedSet.has(id));
    for (const id of deletedSet) {
      this.deletedNodeIdsSet.delete(id);
    }

    if (sentRefs) {
      for (const [id, ref] of Object.entries(sentRefs)) {
        this.lastSavedNodes[id] = ref;
      }
    }
    for (const id of deletedSet) {
      delete this.lastSavedNodes[id];
    }

    // Recompute dirty flag from the still-pending diff + deletions.
    this.isDirty =
      this.deletedNodeIds.length > 0 ||
      Object.values(this.nodes).some((n) => this.lastSavedNodes[n.id] !== n);
  }
}
