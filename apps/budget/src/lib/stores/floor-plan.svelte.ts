import type { FloorPlanNode, FloorPlanNodeType } from "$core/schema/home/home-floor-plan-nodes";
import { nanoid } from "$lib/utils/nanoid";

export type EditorTool = "select" | "wall" | "room" | "door" | "window" | "furniture" | "pan";

export interface FloorPlanState {
  nodes: Record<string, FloorPlanNode>;
  selectedNodeIds: Set<string>;
  activeTool: EditorTool;
  floorLevel: number;
  homeId: number;
  // Viewport
  viewBox: { x: number; y: number; width: number; height: number };
  zoom: number;
  // Dirty tracking
  deletedNodeIds: string[];
  isDirty: boolean;
}

const MAX_HISTORY = 50;

export class FloorPlanStore {
  // Reactive state
  nodes = $state<Record<string, FloorPlanNode>>({});
  selectedNodeIds = $state<Set<string>>(new Set());
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
  private history: string[] = [];
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
      workspaceId: 0, // Set on save
      homeId: this.homeId,
      floorLevel: this.floorLevel,
      parentId: null,
      nodeType: type,
      name: props.name ?? null,
      posX: this.snap(props.posX),
      posY: this.snap(props.posY),
      width: props.width ?? 0,
      height: props.height ?? 0,
      rotation: props.rotation ?? 0,
      x2: props.x2 ?? null,
      y2: props.y2 ?? null,
      color: props.color ?? null,
      opacity: props.opacity ?? 1,
      linkedLocationId: props.linkedLocationId ?? null,
      linkedItemId: props.linkedItemId ?? null,
      properties: props.properties ?? null,
      createdAt: now,
      updatedAt: now,
    };

    this.nodes[id] = node;
    this.isDirty = true;
    this.pushHistory();
    return id;
  }

  updateNode(id: string, updates: Partial<FloorPlanNode>) {
    const node = this.nodes[id];
    if (!node) return;

    this.nodes[id] = { ...node, ...updates, updatedAt: new Date().toISOString() };
    this.isDirty = true;
    this.pushHistory();
  }

  moveNode(id: string, dx: number, dy: number) {
    const node = this.nodes[id];
    if (!node) return;

    const newX = this.snap(node.posX + dx);
    const newY = this.snap(node.posY + dy);

    const updates: Partial<FloorPlanNode> = { posX: newX, posY: newY };

    // For walls, also move the end point
    if (node.nodeType === "wall" && node.x2 !== null && node.y2 !== null) {
      updates.x2 = this.snap((node.x2 ?? 0) + dx);
      updates.y2 = this.snap((node.y2 ?? 0) + dy);
    }

    this.nodes[id] = { ...node, ...updates, updatedAt: new Date().toISOString() };
    this.isDirty = true;
  }

  deleteNode(id: string) {
    if (!this.nodes[id]) return;

    // Track for server-side deletion
    this.deletedNodeIds.push(id);
    delete this.nodes[id];
    this.selectedNodeIds.delete(id);
    this.selectedNodeIds = new Set(this.selectedNodeIds);
    this.isDirty = true;
    this.pushHistory();
  }

  deleteSelected() {
    for (const id of this.selectedNodeIds) {
      this.deletedNodeIds.push(id);
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

    const oldWidth = this.viewBoxWidth;
    const oldHeight = this.viewBoxHeight;

    this.viewBoxWidth = 1200 / clampedZoom;
    this.viewBoxHeight = 800 / clampedZoom;

    // Keep the center point stable
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

  // Undo/Redo
  private pushHistory() {
    const snapshot = JSON.stringify(this.nodes);

    // Remove future history if we're in the middle
    if (this.historyIndex < this.history.length - 1) {
      this.history = this.history.slice(0, this.historyIndex + 1);
    }

    this.history.push(snapshot);

    // Limit history size
    if (this.history.length > MAX_HISTORY) {
      this.history.shift();
    }

    this.historyIndex = this.history.length - 1;
    this.canUndo = this.historyIndex > 0;
    this.canRedo = false;
  }

  undo() {
    if (this.historyIndex <= 0) return;
    this.historyIndex--;
    this.nodes = JSON.parse(this.history[this.historyIndex]);
    this.isDirty = true;
    this.canUndo = this.historyIndex > 0;
    this.canRedo = true;
  }

  redo() {
    if (this.historyIndex >= this.history.length - 1) return;
    this.historyIndex++;
    this.nodes = JSON.parse(this.history[this.historyIndex]);
    this.isDirty = true;
    this.canUndo = true;
    this.canRedo = this.historyIndex < this.history.length - 1;
  }

  // Serialization for saving
  getNodesForSave() {
    return Object.values(this.nodes).map((n) => ({
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
