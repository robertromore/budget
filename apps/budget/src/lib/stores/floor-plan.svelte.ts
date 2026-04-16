import type { FloorPlanNode, FloorPlanNodeType } from "$core/schema/home/home-floor-plan-nodes";
import type { FloorPlanNodeInput } from "$core/server/domains/home/floor-plans/services";
import { nanoid } from "$lib/utils/nanoid";

export type EditorTool = "select" | "wall" | "room" | "door" | "window" | "furniture" | "pan";

const MAX_HISTORY = 50;

interface HistorySnapshot {
  nodes: string;
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
   * `$state.raw` avoids deep-proxying the Set on every read and signals
   * reactivity only on reassignment. All selection mutations below already
   * produce a new Set (copy-on-write), so subscribers still see a fresh
   * value whenever the selection changes — we just skip Svelte's
   * per-element proxy wrapping, which is O(n) on large selections.
   */
  selectedNodeIds = $state.raw<Set<string>>(new Set());
  activeTool = $state<EditorTool>("select");
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
  isDirty = $state(false);

  // Undo/redo
  private history: HistorySnapshot[] = [];
  private historyIndex = -1;
  canUndo = $state(false);
  canRedo = $state(false);

  // Grid
  gridSize = $state(20);
  showGrid = $state(true);
  snapToGrid = $state(true);

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

  walls = $derived(this.nodeList.filter((n) => n.nodeType === "wall"));
  rooms = $derived(this.nodeList.filter((n) => n.nodeType === "room"));
  furniture = $derived(
    this.nodeList.filter((n) => n.nodeType === "furniture" || n.nodeType === "appliance")
  );
  annotations = $derived(this.nodeList.filter((n) => n.nodeType === "annotation"));
  doors = $derived(this.nodeList.filter((n) => n.nodeType === "door"));
  windows = $derived(this.nodeList.filter((n) => n.nodeType === "window"));

  loadNodes(nodes: FloorPlanNode[], homeId: number, floorLevel: number) {
    this.homeId = homeId;
    this.floorLevel = floorLevel;
    this.nodes = {};
    for (const node of nodes) {
      this.nodes[node.id] = node;
    }
    this.deletedNodeIds = [];
    this.isDirty = false;
    this.selectedNodeIds = new Set();
    this.history = [];
    this.historyIndex = -1;
    this.pushHistory();
  }

  // Node operations
  addNode(
    type: FloorPlanNodeType,
    props: Partial<FloorPlanNode> & { posX: number; posY: number }
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
      posX: this.snap(props.posX),
      posY: this.snap(props.posY),
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

  /**
   * Place a door or window. Snaps onto the nearest wall within `maxDistance`
   * and inherits the wall's orientation so the 3D mesh aligns with the CSG
   * opening. Falls back to an unparented placement if no wall is near — the
   * user can still see the node in both views, but it won't cut an opening.
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
    const snap = this.findNearestWall(x, y, options.maxDistance);
    const wall = snap ? this.nodes[snap.wallId] : null;

    let posX = x;
    let posY = y;
    let rotation = 0;
    let parentId: string | null = null;

    if (snap && wall) {
      posX = snap.projectedX;
      posY = snap.projectedY;
      parentId = snap.wallId;
      // Match the wall's orientation so the 3D mesh aligns with the CSG
      // opening. The 2D view centres the rectangle on `posX,posY`, so the
      // visual stays tidy even when rotated.
      const wx1 = wall.posX;
      const wy1 = wall.posY;
      const wx2 = wall.x2 ?? wx1;
      const wy2 = wall.y2 ?? wy1;
      rotation = (Math.atan2(wy2 - wy1, wx2 - wx1) * 180) / Math.PI;
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
    });
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
    let best: {
      wallId: string;
      projectedX: number;
      projectedY: number;
      distance: number;
    } | null = null;
    for (const wall of this.walls) {
      const x1 = wall.posX;
      const y1 = wall.posY;
      const x2 = wall.x2 ?? x1;
      const y2 = wall.y2 ?? y1;
      const dx = x2 - x1;
      const dy = y2 - y1;
      const lenSq = dx * dx + dy * dy;
      if (lenSq < 1) continue; // zero-length wall segment
      let t = ((x - x1) * dx + (y - y1) * dy) / lenSq;
      t = Math.max(0, Math.min(1, t));
      const px = x1 + dx * t;
      const py = y1 + dy * t;
      const distance = Math.hypot(x - px, y - py);
      if (distance <= maxDistance && (!best || distance < best.distance)) {
        best = { wallId: wall.id, projectedX: px, projectedY: py, distance };
      }
    }
    if (!best) return null;
    return {
      wallId: best.wallId,
      projectedX: best.projectedX,
      projectedY: best.projectedY,
    };
  }

  /**
   * After dragging a door/window, re-attach it to whatever wall it's now
   * closest to. Removes the parent + resets rotation if no wall is near.
   * Called after drag-end so moving a door across the plan re-parents it.
   */
  reparentOpeningToNearestWall(id: string, maxDistance = 30): void {
    const node = this.nodes[id];
    if (!node) return;
    if (node.nodeType !== "door" && node.nodeType !== "window") return;

    const snap = this.findNearestWall(node.posX, node.posY, maxDistance);
    if (snap) {
      const wall = this.nodes[snap.wallId];
      if (!wall) return;
      const wx1 = wall.posX;
      const wy1 = wall.posY;
      const wx2 = wall.x2 ?? wx1;
      const wy2 = wall.y2 ?? wy1;
      const rotation = (Math.atan2(wy2 - wy1, wx2 - wx1) * 180) / Math.PI;
      this.updateNode(id, {
        parentId: snap.wallId,
        posX: snap.projectedX,
        posY: snap.projectedY,
        rotation,
      });
    } else if (node.parentId !== null) {
      this.updateNode(id, { parentId: null, rotation: 0 });
    }
  }

  updateNode(id: string, updates: Partial<FloorPlanNode>) {
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
    for (const id of this.selectedNodeIds) {
      this.moveNode(id, dx, dy);
    }
    if (this.nudgeCommitTimer !== null) {
      clearTimeout(this.nudgeCommitTimer);
    }
    this.nudgeCommitTimer = setTimeout(() => {
      this.nudgeCommitTimer = null;
      this.commitChange();
    }, 250);
  }

  moveNode(id: string, dx: number, dy: number) {
    const node = this.nodes[id];
    if (!node) return;

    const newX = this.snap(node.posX + dx);
    const newY = this.snap(node.posY + dy);

    const updates: Partial<FloorPlanNode> = { posX: newX, posY: newY };

    if (node.nodeType === "wall" && node.x2 !== null && node.y2 !== null) {
      updates.x2 = this.snap((node.x2 ?? 0) + dx);
      updates.y2 = this.snap((node.y2 ?? 0) + dy);
    }

    this.nodes[id] = { ...node, ...updates, updatedAt: new Date().toISOString() };
    this.isDirty = true;
  }

  deleteNode(id: string) {
    if (!this.nodes[id]) return;

    this.deletedNodeIds = [...this.deletedNodeIds, id];
    delete this.nodes[id];
    // `selectedNodeIds` is `$state.raw` — reassign with a fresh Set rather
    // than mutate in place so subscribers see the change.
    if (this.selectedNodeIds.has(id)) {
      const next = new Set(this.selectedNodeIds);
      next.delete(id);
      this.selectedNodeIds = next;
    }
    this.isDirty = true;
    this.pushHistory();
  }

  deleteSelected() {
    const ids = [...this.selectedNodeIds];
    if (ids.length === 0) return;
    this.deletedNodeIds = [...this.deletedNodeIds, ...ids];
    for (const id of ids) {
      delete this.nodes[id];
    }
    this.selectedNodeIds = new Set();
    this.isDirty = true;
    this.pushHistory();
  }

  // Selection
  selectNode(id: string, addToSelection = false) {
    if (addToSelection) {
      const newSet = new Set(this.selectedNodeIds);
      if (newSet.has(id)) {
        newSet.delete(id);
      } else {
        newSet.add(id);
      }
      this.selectedNodeIds = newSet;
    } else {
      this.selectedNodeIds = new Set([id]);
    }
  }

  clearSelection() {
    this.selectedNodeIds = new Set();
  }

  selectAll() {
    this.selectedNodeIds = new Set(Object.keys(this.nodes));
  }

  // Viewport
  pan(dx: number, dy: number) {
    this.viewBoxX -= dx / this.zoom;
    this.viewBoxY -= dy / this.zoom;
  }

  zoomTo(newZoom: number, centerX?: number, centerY?: number) {
    const clampedZoom = Math.max(0.1, Math.min(5, newZoom));
    const cx = centerX ?? this.viewBoxX + this.viewBoxWidth / 2;
    const cy = centerY ?? this.viewBoxY + this.viewBoxHeight / 2;

    this.viewBoxWidth = 1200 / clampedZoom;
    this.viewBoxHeight = 800 / clampedZoom;

    this.viewBoxX = cx - this.viewBoxWidth / 2;
    this.viewBoxY = cy - this.viewBoxHeight / 2;

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
  pushHistory() {
    const snapshot: HistorySnapshot = {
      nodes: JSON.stringify(this.nodes),
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
    this.nodes = JSON.parse(snapshot.nodes);
    this.deletedNodeIds = [...snapshot.deletedNodeIds];
    this.selectedNodeIds = new Set(snapshot.selectedNodeIds);
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

  // Serialization for saving — strip workspaceId (set server-side from the
  // authenticated context, never trusted from the client).
  getNodesForSave(): FloorPlanNodeInput[] {
    return Object.values(this.nodes).map(({ workspaceId: _workspaceId, ...n }) => ({
      ...n,
      homeId: this.homeId,
      floorLevel: this.floorLevel,
    }));
  }

  markSaved() {
    this.deletedNodeIds = [];
    this.isDirty = false;
  }
}
