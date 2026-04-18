<script lang="ts">
  import type {
    FloorPlanNode,
    FloorPlanNodeType,
  } from "$core/schema/home/home-floor-plan-nodes";
  import type {
    FloorPlanStore,
    StructuralSurfaceNodeType,
  } from "$lib/stores/floor-plan.svelte";
  import HierarchyRowControls from "./hierarchy-row-controls.svelte";

  let { store }: { store: FloorPlanStore } = $props();

  type DragNodeType =
    | "building"
    | "level"
    | "slab"
    | "ceiling"
    | "roof"
    | "stair"
    | "roof-segment"
    | "stair-segment";
  type DropTargetType =
    | "site"
    | "building"
    | "level"
    | "roof"
    | "stair"
    | "unparent-building";

  const DRAGGABLE_NODE_TYPES = new Set<FloorPlanNodeType>([
    "building",
    "level",
    "slab",
    "ceiling",
    "roof",
    "stair",
    "roof-segment",
    "stair-segment",
  ]);

  const REQUIRED_PARENT_BY_TYPE: Partial<Record<DragNodeType, FloorPlanNodeType>> = {
    building: "site",
    level: "building",
    slab: "level",
    ceiling: "level",
    roof: "level",
    stair: "level",
    "roof-segment": "roof",
    "stair-segment": "stair",
  };

  const LEVEL_STRUCTURE_ORDER: Record<string, number> = {
    slab: 0,
    ceiling: 1,
    roof: 2,
    stair: 3,
  };

  function sortNodes(nodes: FloorPlanNode[]): FloorPlanNode[] {
    return [...nodes].sort((a, b) => {
      const labelA = (a.name ?? "").toLowerCase();
      const labelB = (b.name ?? "").toLowerCase();
      if (labelA !== labelB) return labelA.localeCompare(labelB);
      return a.id.localeCompare(b.id);
    });
  }

  function nodeLabel(node: FloorPlanNode): string {
    return node.name ?? `${nodeTypeLabel(node.nodeType)} ${node.id.slice(0, 6)}`;
  }

  function nodeTypeLabel(type: FloorPlanNodeType): string {
    return type
      .split("-")
      .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
      .join(" ");
  }

  function handleAddLevel(buildingId: string, event: MouseEvent): void {
    event.stopPropagation();
    store.addLevelToBuilding(buildingId);
  }

  function handleAddLevelWithStructure(buildingId: string, event: MouseEvent): void {
    event.stopPropagation();
    store.addLevelWithStructureToBuilding(buildingId);
  }

  function handleMoveLevel(
    levelId: string,
    direction: "up" | "down",
    event: MouseEvent
  ): void {
    event.stopPropagation();
    store.moveLevel(levelId, direction);
  }

  function handleDeleteLevel(levelId: string, event: MouseEvent): void {
    event.stopPropagation();
    store.deleteLevelWithFallback(levelId);
  }

  function handleAddStructuralNode(
    levelId: string,
    type: StructuralSurfaceNodeType,
    event: MouseEvent
  ): void {
    event.stopPropagation();
    store.addStructuralNodeToLevel(levelId, type);
  }

  function handleAddStructuralWithSegment(
    levelId: string,
    type: "roof" | "stair",
    event: MouseEvent
  ): void {
    event.stopPropagation();
    store.addStructuralNodeWithSegmentToLevel(levelId, type);
  }

  function handleAddStructuralSegment(parentId: string, event: MouseEvent): void {
    event.stopPropagation();
    store.addStructuralSegmentToNode(parentId);
  }

  function handleAddStructurePack(levelId: string, event: MouseEvent): void {
    event.stopPropagation();
    store.addStructurePackToLevel(levelId);
  }

  function handleDuplicateLevel(levelId: string, event: MouseEvent): void {
    event.stopPropagation();
    store.duplicateLevel(levelId, { includeDescendants: !event.shiftKey });
  }

  function isAdditiveSelection(event: MouseEvent): boolean {
    return event.shiftKey || event.metaKey || event.ctrlKey;
  }

  function pickNode(node: FloorPlanNode, event: MouseEvent): void {
    event.stopPropagation();
    const additive = isAdditiveSelection(event);
    const didSelect = store.selectNode(node.id, additive);
    if (didSelect && !additive) {
      store.setHierarchyContextFromNodeId(node.id);
    }
  }

  function handleNodeCheckboxToggle(node: FloorPlanNode, event: Event): void {
    event.stopPropagation();
    const target = event.currentTarget as HTMLInputElement | null;
    const shouldSelect = target?.checked ?? !store.selectedNodeIds.has(node.id);
    if (shouldSelect) {
      const didSelect = store.selectNode(node.id, true);
      if (didSelect && store.selectedNodeIds.size === 1) {
        store.setHierarchyContextFromNodeId(node.id);
      }
      return;
    }
    if (store.selectedNodeIds.has(node.id)) {
      // Additive selection toggles an already-selected node off.
      store.selectNode(node.id, true);
    }
  }

  /**
   * Grouped listing of every visible content node (rooms, walls, furniture,
   * annotations, assets) so screen-reader and keyboard-only users can
   * discover and select nodes that aren't part of the hierarchy tree
   * above. Each button calls `store.selectNode`; shift/cmd/ctrl-click
   * extends selection, matching the canvas behaviour. Checkboxes provide
   * explicit multi-select without keyboard modifiers.
   */
  const contentNodeGroups = $derived.by(() => {
    type Group = { label: string; nodes: FloorPlanNode[] };
    const groups: Group[] = [
      { label: "Rooms & Zones", nodes: store.rooms.filter((n) => n.nodeType === "room" || n.nodeType === "zone") },
      { label: "Walls & Fences", nodes: store.walls },
      { label: "Doors", nodes: store.doors },
      { label: "Windows", nodes: store.windows },
      { label: "Furniture & Items", nodes: store.furniture },
      { label: "Annotations", nodes: store.annotations },
      { label: "Assets", nodes: store.assetLayers },
    ];
    return groups.filter((g) => g.nodes.length > 0);
  });

  function isContextAnchor(node: FloorPlanNode): boolean {
    if (node.nodeType === "site") return store.activeSiteId === node.id;
    if (node.nodeType === "building") return store.activeBuildingId === node.id;
    if (node.nodeType === "level") return store.activeLevelId === node.id;
    return false;
  }

  function getDragNodeType(node: FloorPlanNode): DragNodeType | null {
    if (!DRAGGABLE_NODE_TYPES.has(node.nodeType)) return null;
    return node.nodeType as DragNodeType;
  }

  function expectedDropTypeForNodeType(type: DragNodeType): DropTargetType {
    if (type === "building") return "site";
    if (type === "level") return "building";
    if (type === "roof-segment") return "roof";
    if (type === "stair-segment") return "stair";
    return "level";
  }

  function structuralDropType(node: FloorPlanNode): "roof" | "stair" | null {
    if (node.nodeType === "roof") return "roof";
    if (node.nodeType === "stair") return "stair";
    return null;
  }

  function keyForTarget(type: DropTargetType, parentId: string | null): string {
    return `${type}:${parentId ?? "none"}`;
  }

  // KNOWN LIMITATION (deferred UX work): re-parenting a node in this
  // tree is currently mouse-drag only. Keyboard-only users can focus
  // rows (buttons are natively focusable) and select / activate nodes,
  // but cannot move a level from one building to another without a
  // pointer. A proper solution — roving-tabindex with Alt+Arrow to
  // move between parents, or a "Move to…" popover on each row — is a
  // focused UX task that hasn't been scoped yet. The existing "↑ / ↓"
  // level-reorder buttons cover same-parent sibling ordering, which
  // is the most common case.
  let draggedNodeId = $state<string | null>(null);
  let draggedNodeType = $state<DragNodeType | null>(null);
  let dropTargetKey = $state<string | null>(null);

  function canDropOn(type: DropTargetType): boolean {
    if (!draggedNodeType) return false;
    if (draggedNodeType === "building") {
      return type === "site" || type === "unparent-building";
    }
    return expectedDropTypeForNodeType(draggedNodeType) === type;
  }

  function clearDragState(): void {
    draggedNodeId = null;
    draggedNodeType = null;
    dropTargetKey = null;
  }

  function handleDragStart(node: FloorPlanNode, event: DragEvent): void {
    const dragNodeType = getDragNodeType(node);
    if (!dragNodeType) {
      event.preventDefault();
      return;
    }
    draggedNodeId = node.id;
    draggedNodeType = dragNodeType;
    dropTargetKey = null;
    if (event.dataTransfer) {
      event.dataTransfer.effectAllowed = "move";
      event.dataTransfer.setData("text/plain", node.id);
      event.dataTransfer.setData("application/x-floorplan-node-type", dragNodeType);
    }
  }

  function handleDragOver(
    type: DropTargetType,
    parentId: string | null,
    event: DragEvent
  ): void {
    if (!draggedNodeId || !canDropOn(type)) return;
    event.preventDefault();
    event.stopPropagation();
    if (event.dataTransfer) {
      event.dataTransfer.dropEffect = "move";
    }
    dropTargetKey = keyForTarget(type, parentId);
  }

  function handleDragLeave(
    type: DropTargetType,
    parentId: string | null,
    event: DragEvent
  ): void {
    event.stopPropagation();
    const key = keyForTarget(type, parentId);
    if (dropTargetKey === key) {
      dropTargetKey = null;
    }
  }

  function handleDrop(type: DropTargetType, parentId: string | null, event: DragEvent): void {
    event.preventDefault();
    event.stopPropagation();
    if (!draggedNodeId || !canDropOn(type)) {
      clearDragState();
      return;
    }
    const nextParentId = type === "unparent-building" ? null : parentId;
    store.reparentHierarchyNode(draggedNodeId, nextParentId);
    clearDragState();
  }

  function isDropTargetActive(type: DropTargetType, parentId: string | null): boolean {
    return dropTargetKey === keyForTarget(type, parentId) && canDropOn(type);
  }

  function handleStructuralDragOver(node: FloorPlanNode, event: DragEvent): void {
    const targetType = structuralDropType(node);
    if (!targetType) return;
    handleDragOver(targetType, node.id, event);
  }

  function handleStructuralDragLeave(node: FloorPlanNode, event: DragEvent): void {
    const targetType = structuralDropType(node);
    if (!targetType) return;
    handleDragLeave(targetType, node.id, event);
  }

  function handleStructuralDrop(node: FloorPlanNode, event: DragEvent): void {
    const targetType = structuralDropType(node);
    if (!targetType) return;
    handleDrop(targetType, node.id, event);
  }

  function isStructuralDropTargetActive(node: FloorPlanNode): boolean {
    const targetType = structuralDropType(node);
    if (!targetType) return false;
    return isDropTargetActive(targetType, node.id);
  }

  const sites = $derived.by(() =>
    sortNodes(store.nodeList.filter((node) => node.nodeType === "site"))
  );
  const buildings = $derived.by(() =>
    sortNodes(store.nodeList.filter((node) => node.nodeType === "building"))
  );
  const levels = $derived.by(() =>
    sortNodes(store.nodeList.filter((node) => node.nodeType === "level"))
  );

  const structuralNodes = $derived.by(() =>
    sortNodes(
      store.nodeList.filter(
        (node) =>
          node.nodeType === "slab" ||
          node.nodeType === "ceiling" ||
          node.nodeType === "roof" ||
          node.nodeType === "stair" ||
          node.nodeType === "roof-segment" ||
          node.nodeType === "stair-segment"
      )
    )
  );

  /**
   * Panel-specific child ordering: by node-type then by display label.
   * The unsorted parent→children iteration is done once in the store
   * (`store.childrenByParentId`); we just re-sort each bucket for display.
   * For a 500-node plan, moving the iteration upstream means unrelated
   * node drags don't re-index the whole tree here.
   */
  const childrenByParent = $derived.by(() => {
    const sorted = new Map<string, FloorPlanNode[]>();
    for (const [parentId, group] of store.childrenByParentId) {
      const copy = [...group];
      copy.sort((a, b) => {
        const typeDiff = a.nodeType.localeCompare(b.nodeType);
        if (typeDiff !== 0) return typeDiff;
        return nodeLabel(a).localeCompare(nodeLabel(b));
      });
      sorted.set(parentId, copy);
    }
    return sorted;
  });

  function structuralChildrenForLevel(levelId: string): FloorPlanNode[] {
    const nodes = [...(childrenByParent.get(levelId) ?? [])].filter(
      (node) =>
        node.nodeType === "slab" ||
        node.nodeType === "ceiling" ||
        node.nodeType === "roof" ||
        node.nodeType === "stair"
    );
    nodes.sort((a, b) => {
      const orderA = LEVEL_STRUCTURE_ORDER[a.nodeType] ?? 99;
      const orderB = LEVEL_STRUCTURE_ORDER[b.nodeType] ?? 99;
      if (orderA !== orderB) return orderA - orderB;
      return nodeLabel(a).localeCompare(nodeLabel(b));
    });
    return nodes;
  }

  function hasStructuralChild(levelId: string, type: StructuralSurfaceNodeType): boolean {
    return structuralChildrenForLevel(levelId).some((node) => node.nodeType === type);
  }

  function hasAllStructuralChildren(levelId: string): boolean {
    return (
      hasStructuralChild(levelId, "slab") &&
      hasStructuralChild(levelId, "ceiling") &&
      hasStructuralChild(levelId, "roof") &&
      hasStructuralChild(levelId, "stair")
    );
  }

  function segmentChildrenForStructural(node: FloorPlanNode): FloorPlanNode[] {
    if (node.nodeType !== "roof" && node.nodeType !== "stair") return [];
    const segmentType = node.nodeType === "roof" ? "roof-segment" : "stair-segment";
    return (childrenByParent.get(node.id) ?? []).filter(
      (candidate) => candidate.nodeType === segmentType
    );
  }

  const buildingsBySite = $derived.by(() => {
    const map = new Map<string, FloorPlanNode[]>();
    for (const building of buildings) {
      if (!building.parentId) continue;
      const parent = store.nodes[building.parentId];
      if (!parent || parent.nodeType !== "site") continue;
      if (!map.has(parent.id)) map.set(parent.id, []);
      map.get(parent.id)!.push(building);
    }
    for (const grouped of map.values()) grouped.sort((a, b) => nodeLabel(a).localeCompare(nodeLabel(b)));
    return map;
  });

  const levelsByBuilding = $derived.by(() => {
    const map = new Map<string, FloorPlanNode[]>();
    for (const level of levels) {
      if (!level.parentId) continue;
      const parent = store.nodes[level.parentId];
      if (!parent || parent.nodeType !== "building") continue;
      if (!map.has(parent.id)) map.set(parent.id, []);
      map.get(parent.id)!.push(level);
    }
    for (const grouped of map.values()) {
      grouped.sort((a, b) => {
        const elevationDiff = (a.elevation ?? 0) - (b.elevation ?? 0);
        if (elevationDiff !== 0) return elevationDiff;
        return nodeLabel(a).localeCompare(nodeLabel(b));
      });
    }
    return map;
  });

  const orphanBuildings = $derived.by(
    () =>
      buildings.filter((building) => {
        if (!building.parentId) return true;
        const parent = store.nodes[building.parentId];
        return !parent || parent.nodeType !== "site";
      })
  );

  const orphanLevels = $derived.by(
    () =>
      levels.filter((level) => {
        if (!level.parentId) return true;
        const parent = store.nodes[level.parentId];
        return !parent || parent.nodeType !== "building";
      })
  );

  const orphanStructuralNodes = $derived.by(() =>
    structuralNodes.filter((node) => {
      const requiredParent = REQUIRED_PARENT_BY_TYPE[node.nodeType as DragNodeType];
      if (!requiredParent) return false;
      if (!node.parentId) return true;
      const parent = store.nodes[node.parentId];
      return !parent || parent.nodeType !== requiredParent;
    })
  );

  const totalHierarchyNodes = $derived(
    sites.length + buildings.length + levels.length + structuralNodes.length
  );
  const contextLabel = $derived.by(() => {
    if (store.activeLevelId) return "Level Scope";
    if (store.activeBuildingId) return "Building Scope";
    if (store.activeSiteId) return "Site Scope";
    return "All Nodes";
  });
</script>

<section class="border-b bg-white p-3 dark:bg-zinc-900">
  <div class="mb-2 flex items-center justify-between gap-2">
    <div class="flex min-w-0 items-center gap-2">
      <h3 class="text-xs font-semibold uppercase tracking-wide text-zinc-600 dark:text-zinc-300">Hierarchy</h3>
      <span class="text-muted-foreground truncate text-[11px]">{contextLabel}</span>
    </div>
    <div class="flex items-center gap-2">
      <span class="text-muted-foreground text-xs">{totalHierarchyNodes}</span>
      <button
        class="text-muted-foreground hover:bg-accent rounded px-1.5 py-0.5 text-[11px]"
        title="Show all nodes across hierarchy contexts"
        onclick={() => store.clearHierarchyContext()}
      >
        All
      </button>
    </div>
  </div>

  {#if totalHierarchyNodes === 0}
    <p class="text-muted-foreground text-xs">No hierarchy nodes yet.</p>
  {:else}
    <div class="max-h-56 space-y-1 overflow-y-auto pr-1">
      {#each sites as site (site.id)}
        <div
          class="flex items-center gap-1 rounded px-2 py-1 text-xs font-medium {isDropTargetActive('site', site.id)
            ? 'ring-primary bg-primary/10 ring-1'
            : isContextAnchor(site)
              ? 'ring-muted-foreground/40 bg-muted ring-1'
            : store.selectedNodeIds.has(site.id)
              ? 'bg-primary/15 text-primary'
              : 'hover:bg-accent'}"
          ondragover={(event) => handleDragOver("site", site.id, event)}
          ondragleave={(event) => handleDragLeave("site", site.id, event)}
          ondrop={(event) => handleDrop("site", site.id, event)}
        >
          <button class="min-w-0 flex-1 text-left" onclick={(event) => pickNode(site, event)}>
            <span class="truncate">Site: {nodeLabel(site)}</span>
          </button>
          <HierarchyRowControls {store} node={site} />
        </div>
        {#each buildingsBySite.get(site.id) ?? [] as building (building.id)}
          <div
            class="flex items-center gap-1 rounded px-6 py-1 text-xs {isDropTargetActive('building', building.id)
              ? 'ring-primary bg-primary/10 ring-1'
              : isContextAnchor(building)
                ? 'ring-muted-foreground/40 bg-muted ring-1'
              : store.selectedNodeIds.has(building.id)
                ? 'bg-primary/15 text-primary'
                : 'hover:bg-accent'}"
            draggable={true}
            ondragstart={(event) => handleDragStart(building, event)}
            ondragend={clearDragState}
            ondragover={(event) => handleDragOver("building", building.id, event)}
            ondragleave={(event) => handleDragLeave("building", building.id, event)}
            ondrop={(event) => handleDrop("building", building.id, event)}
          >
            <button class="min-w-0 flex-1 text-left" onclick={(event) => pickNode(building, event)}>
              <span class="truncate">Building: {nodeLabel(building)}</span>
            </button>
            <HierarchyRowControls {store} node={building} />
          </div>
          <div class="mb-1 flex items-center justify-between pl-10 pr-2">
            <span class="text-muted-foreground text-[11px]">
              {levelsByBuilding.get(building.id)?.length ?? 0} levels
            </span>
	            <button
	              class="text-muted-foreground hover:bg-accent rounded px-1.5 py-0.5 text-[11px]"
	              onclick={(event) => handleAddLevel(building.id, event)}
	              title="Add level to this building"
	            >
	              + Level
	            </button>
	            <button
	              class="text-muted-foreground hover:bg-accent rounded px-1.5 py-0.5 text-[11px]"
	              onclick={(event) => handleAddLevelWithStructure(building.id, event)}
	              title="Add level with slab, ceiling, roof, and stair"
	            >
	              + Level + Structure
	            </button>
	          </div>
          {#each levelsByBuilding.get(building.id) ?? [] as level (level.id)}
            <div
              role="group"
              aria-label="Level: {nodeLabel(level)}"
              class="rounded text-xs {isDropTargetActive('level', level.id)
                ? 'ring-primary bg-primary/10 ring-1'
                : store.selectedNodeIds.has(level.id)
                  ? 'bg-primary/15 text-primary'
                : isContextAnchor(level)
                  ? 'ring-muted-foreground/40 bg-muted ring-1'
                  : 'hover:bg-accent'}"
              draggable={true}
              ondragstart={(event) => handleDragStart(level, event)}
              ondragend={clearDragState}
              ondragover={(event) => handleDragOver("level", level.id, event)}
              ondragleave={(event) => handleDragLeave("level", level.id, event)}
              ondrop={(event) => handleDrop("level", level.id, event)}
            >
	              <div class="flex items-center gap-1 pl-10 pr-2">
                <button
                  class="flex min-w-0 flex-1 items-center gap-1 py-1 text-left"
                  onclick={(event) => pickNode(level, event)}
                >
                  <span class="truncate">Level: {nodeLabel(level)}</span>
                  {#if store.isGroundLevel(level.id)}
                    <span class="text-muted-foreground rounded border px-1 text-[10px]">Ground</span>
                  {/if}
                </button>
                <button
                  class="text-muted-foreground hover:bg-accent rounded px-1 py-0.5 disabled:opacity-40"
                  title="Move level up"
                  disabled={!store.canMoveLevel(level.id, "up")}
                  onclick={(event) => handleMoveLevel(level.id, "up", event)}
                >
                  ↑
                </button>
                <button
                  class="text-muted-foreground hover:bg-accent rounded px-1 py-0.5 disabled:opacity-40"
                  title="Move level down"
                  disabled={!store.canMoveLevel(level.id, "down")}
                  onclick={(event) => handleMoveLevel(level.id, "down", event)}
                >
                  ↓
                </button>
                <button
                  class="text-muted-foreground hover:bg-accent rounded px-1 py-0.5"
                  title="Duplicate level (Shift-click for empty copy)"
                  onclick={(event) => handleDuplicateLevel(level.id, event)}
                >
                  Copy
                </button>
                <HierarchyRowControls {store} node={level} />
	                <button
	                  class="text-destructive hover:bg-destructive/10 rounded px-1 py-0.5 disabled:opacity-40"
	                  title="Delete level"
	                  disabled={!store.canDeleteLevel(level.id)}
	                  onclick={(event) => handleDeleteLevel(level.id, event)}
	                >
	                  ×
	                </button>
	              </div>
	              <div class="mb-1 flex flex-wrap items-center gap-1 pl-12 pr-2">
	                <button
	                  class="text-muted-foreground hover:bg-accent rounded px-1.5 py-0.5 text-[11px] disabled:opacity-40"
	                  title="Quick-create slab for this level"
	                  disabled={hasStructuralChild(level.id, "slab")}
	                  onclick={(event) => handleAddStructuralNode(level.id, "slab", event)}
	                >
	                  + Slab
	                </button>
	                <button
	                  class="text-muted-foreground hover:bg-accent rounded px-1.5 py-0.5 text-[11px] disabled:opacity-40"
	                  title="Quick-create ceiling for this level"
	                  disabled={hasStructuralChild(level.id, "ceiling")}
	                  onclick={(event) => handleAddStructuralNode(level.id, "ceiling", event)}
	                >
	                  + Ceiling
	                </button>
		                <button
		                  class="text-muted-foreground hover:bg-accent rounded px-1.5 py-0.5 text-[11px] disabled:opacity-40"
		                  title="Quick-create roof for this level"
		                  disabled={hasStructuralChild(level.id, "roof")}
		                  onclick={(event) => handleAddStructuralNode(level.id, "roof", event)}
		                >
		                  + Roof
		                </button>
		                <button
		                  class="text-muted-foreground hover:bg-accent rounded px-1.5 py-0.5 text-[11px]"
		                  title="Quick-create roof and a segment for this level"
		                  onclick={(event) => handleAddStructuralWithSegment(level.id, "roof", event)}
		                >
		                  + Roof + Seg
		                </button>
			                <button
			                  class="text-muted-foreground hover:bg-accent rounded px-1.5 py-0.5 text-[11px] disabled:opacity-40"
			                  title="Quick-create stair for this level"
			                  disabled={hasStructuralChild(level.id, "stair")}
			                  onclick={(event) => handleAddStructuralNode(level.id, "stair", event)}
			                >
			                  + Stair
			                </button>
			                <button
			                  class="text-muted-foreground hover:bg-accent rounded px-1.5 py-0.5 text-[11px]"
			                  title="Quick-create stair and a segment for this level"
			                  onclick={(event) => handleAddStructuralWithSegment(level.id, "stair", event)}
			                >
			                  + Stair + Seg
			                </button>
			                <button
			                  class="text-muted-foreground hover:bg-accent rounded px-1.5 py-0.5 text-[11px] disabled:opacity-40"
			                  title="Quick-create all missing structural nodes for this level"
			                  disabled={hasAllStructuralChildren(level.id)}
			                  onclick={(event) => handleAddStructurePack(level.id, event)}
		                >
		                  + Structure
		                </button>
		              </div>
		            </div>

	            {#each structuralChildrenForLevel(level.id) as structural (structural.id)}
              <div
                role="group"
                aria-label="{nodeTypeLabel(structural.nodeType)}: {nodeLabel(structural)}"
                class="ml-12 rounded text-xs {isStructuralDropTargetActive(structural)
                  ? 'ring-primary bg-primary/10 ring-1'
                  : store.selectedNodeIds.has(structural.id)
                    ? 'bg-primary/15 text-primary'
                    : 'hover:bg-accent'}"
                draggable={true}
                ondragstart={(event) => handleDragStart(structural, event)}
                ondragend={clearDragState}
                ondragover={(event) => handleStructuralDragOver(structural, event)}
                ondragleave={(event) => handleStructuralDragLeave(structural, event)}
                ondrop={(event) => handleStructuralDrop(structural, event)}
              >
	                <div class="flex items-center gap-1 py-1 pl-2 pr-2">
	                  <button
	                    class="flex min-w-0 flex-1 items-center gap-1 text-left"
	                    onclick={(event) => pickNode(structural, event)}
	                  >
	                    <span class="truncate">{nodeTypeLabel(structural.nodeType)}: {nodeLabel(structural)}</span>
	                  </button>
                    <HierarchyRowControls {store} node={structural} />
	                  {#if structural.nodeType === "roof" || structural.nodeType === "stair"}
	                    <button
	                      class="text-muted-foreground hover:bg-accent rounded px-1.5 py-0.5 text-[11px]"
	                      title="Quick-create segment under this structural node"
	                      onclick={(event) => handleAddStructuralSegment(structural.id, event)}
	                    >
	                      + Seg
	                    </button>
	                  {/if}
	                </div>
	              </div>

	              {#if structural.nodeType === "roof" || structural.nodeType === "stair"}
	                {#each segmentChildrenForStructural(structural) as segment (segment.id)}
	                  <div
	                    class="ml-16 flex items-center gap-1 rounded px-2 py-1 text-xs {store.selectedNodeIds.has(segment.id)
	                      ? 'bg-primary/15 text-primary'
	                      : 'hover:bg-accent'}"
	                    draggable={true}
	                    ondragstart={(event) => handleDragStart(segment, event)}
	                    ondragend={clearDragState}
	                  >
	                    <button class="min-w-0 flex-1 text-left" onclick={(event) => pickNode(segment, event)}>
	                      <span class="truncate">{nodeTypeLabel(segment.nodeType)}: {nodeLabel(segment)}</span>
	                    </button>
                      <HierarchyRowControls {store} node={segment} />
	                  </div>
	                {/each}
	              {/if}
            {/each}
          {/each}
        {/each}
      {/each}

      {#if orphanBuildings.length > 0 || orphanLevels.length > 0 || orphanStructuralNodes.length > 0}
        <p class="text-muted-foreground pt-1 text-[11px]">Unparented</p>
      {/if}

      {#each orphanBuildings as building (building.id)}
        <div
          class="flex items-center gap-1 rounded px-2 py-1 text-xs {isDropTargetActive('building', building.id)
            ? 'ring-primary bg-primary/10 ring-1'
            : isContextAnchor(building)
              ? 'ring-muted-foreground/40 bg-muted ring-1'
            : store.selectedNodeIds.has(building.id)
              ? 'bg-primary/15 text-primary'
              : 'hover:bg-accent'}"
          draggable={true}
          ondragstart={(event) => handleDragStart(building, event)}
          ondragend={clearDragState}
          ondragover={(event) => handleDragOver("building", building.id, event)}
          ondragleave={(event) => handleDragLeave("building", building.id, event)}
          ondrop={(event) => handleDrop("building", building.id, event)}
        >
          <button class="min-w-0 flex-1 text-left" onclick={(event) => pickNode(building, event)}>
            <span class="truncate">Building: {nodeLabel(building)}</span>
          </button>
          <HierarchyRowControls {store} node={building} />
        </div>
        <div class="mb-1 flex items-center justify-end pr-2">
	          <button
	            class="text-muted-foreground hover:bg-accent rounded px-1.5 py-0.5 text-[11px]"
	            onclick={(event) => handleAddLevel(building.id, event)}
	            title="Add level to this building"
	          >
	            + Level
	          </button>
	          <button
	            class="text-muted-foreground hover:bg-accent rounded px-1.5 py-0.5 text-[11px]"
	            onclick={(event) => handleAddLevelWithStructure(building.id, event)}
	            title="Add level with slab, ceiling, roof, and stair"
	          >
	            + Level + Structure
	          </button>
	        </div>
      {/each}

	      {#each orphanLevels as level (level.id)}
	        <div
          role="group"
          aria-label="Unparented Level: {nodeLabel(level)}"
          class="rounded text-xs {isDropTargetActive('level', level.id)
            ? 'ring-primary bg-primary/10 ring-1'
            : store.selectedNodeIds.has(level.id)
              ? 'bg-primary/15 text-primary'
              : isContextAnchor(level)
                ? 'ring-muted-foreground/40 bg-muted ring-1'
                : 'hover:bg-accent'}"
          draggable={true}
          ondragstart={(event) => handleDragStart(level, event)}
          ondragend={clearDragState}
          ondragover={(event) => handleDragOver("level", level.id, event)}
          ondragleave={(event) => handleDragLeave("level", level.id, event)}
          ondrop={(event) => handleDrop("level", level.id, event)}
        >
		          <div class="flex items-center gap-1 px-2 py-1">
                <button class="min-w-0 flex-1 text-left" onclick={(event) => pickNode(level, event)}>
                  <span class="truncate">Level: {nodeLabel(level)}</span>
                </button>
                <HierarchyRowControls {store} node={level} />
              </div>
	          <div class="mb-1 flex flex-wrap items-center gap-1 px-2 pb-1">
	            <button
	              class="text-muted-foreground hover:bg-accent rounded px-1.5 py-0.5 text-[11px] disabled:opacity-40"
	              title="Quick-create slab for this level"
	              disabled={hasStructuralChild(level.id, "slab")}
	              onclick={(event) => handleAddStructuralNode(level.id, "slab", event)}
	            >
	              + Slab
	            </button>
	            <button
	              class="text-muted-foreground hover:bg-accent rounded px-1.5 py-0.5 text-[11px] disabled:opacity-40"
	              title="Quick-create ceiling for this level"
	              disabled={hasStructuralChild(level.id, "ceiling")}
	              onclick={(event) => handleAddStructuralNode(level.id, "ceiling", event)}
	            >
	              + Ceiling
	            </button>
		            <button
		              class="text-muted-foreground hover:bg-accent rounded px-1.5 py-0.5 text-[11px] disabled:opacity-40"
		              title="Quick-create roof for this level"
		              disabled={hasStructuralChild(level.id, "roof")}
		              onclick={(event) => handleAddStructuralNode(level.id, "roof", event)}
		            >
		              + Roof
		            </button>
		            <button
		              class="text-muted-foreground hover:bg-accent rounded px-1.5 py-0.5 text-[11px]"
		              title="Quick-create roof and a segment for this level"
		              onclick={(event) => handleAddStructuralWithSegment(level.id, "roof", event)}
		            >
		              + Roof + Seg
		            </button>
			            <button
			              class="text-muted-foreground hover:bg-accent rounded px-1.5 py-0.5 text-[11px] disabled:opacity-40"
			              title="Quick-create stair for this level"
			              disabled={hasStructuralChild(level.id, "stair")}
			              onclick={(event) => handleAddStructuralNode(level.id, "stair", event)}
			            >
			              + Stair
			            </button>
			            <button
			              class="text-muted-foreground hover:bg-accent rounded px-1.5 py-0.5 text-[11px]"
			              title="Quick-create stair and a segment for this level"
			              onclick={(event) => handleAddStructuralWithSegment(level.id, "stair", event)}
			            >
			              + Stair + Seg
			            </button>
			            <button
			              class="text-muted-foreground hover:bg-accent rounded px-1.5 py-0.5 text-[11px] disabled:opacity-40"
			              title="Quick-create all missing structural nodes for this level"
			              disabled={hasAllStructuralChildren(level.id)}
			              onclick={(event) => handleAddStructurePack(level.id, event)}
		            >
		              + Structure
		            </button>
		          </div>
		        </div>
	      {/each}

	      {#each orphanStructuralNodes as structural (structural.id)}
	        <div
          role="group"
          aria-label="Unparented {nodeTypeLabel(structural.nodeType)}: {nodeLabel(structural)}"
          class="rounded text-xs {isStructuralDropTargetActive(structural)
            ? 'ring-primary bg-primary/10 ring-1'
            : store.selectedNodeIds.has(structural.id)
              ? 'bg-primary/15 text-primary'
              : 'hover:bg-accent'}"
          draggable={true}
          ondragstart={(event) => handleDragStart(structural, event)}
          ondragend={clearDragState}
          ondragover={(event) => handleStructuralDragOver(structural, event)}
          ondragleave={(event) => handleStructuralDragLeave(structural, event)}
          ondrop={(event) => handleStructuralDrop(structural, event)}
        >
		          <div class="flex items-center gap-1 px-2 py-1">
		            <button
		              class="min-w-0 flex-1 rounded text-left"
		              onclick={(event) => pickNode(structural, event)}
		            >
		              <span class="truncate">{nodeTypeLabel(structural.nodeType)}: {nodeLabel(structural)}</span>
		            </button>
                <HierarchyRowControls {store} node={structural} />
		            {#if structural.nodeType === "roof" || structural.nodeType === "stair"}
		              <button
		                class="text-muted-foreground hover:bg-accent rounded px-1.5 py-0.5 text-[11px]"
		                title="Quick-create segment under this structural node"
	                onclick={(event) => handleAddStructuralSegment(structural.id, event)}
	              >
	                + Seg
	              </button>
	            {/if}
	          </div>
	        </div>
	      {/each}

      {#if draggedNodeType === "building"}
        <div
          role="region"
          aria-label="Drop zone: unparent building"
          class="text-muted-foreground rounded border border-dashed px-2 py-1 text-[11px] {isDropTargetActive('unparent-building', null)
            ? 'border-primary text-primary bg-primary/5'
            : ''}"
          ondragover={(event) => handleDragOver("unparent-building", null, event)}
          ondragleave={(event) => handleDragLeave("unparent-building", null, event)}
          ondrop={(event) => handleDrop("unparent-building", null, event)}
        >
          Drop Here To Unparent Building
        </div>
      {/if}
    </div>
  {/if}

  {#if contentNodeGroups.length > 0}
    <div class="mt-4 border-t pt-3">
      <h3 class="text-muted-foreground mb-2 text-xs font-medium uppercase tracking-wide">
        All Nodes
      </h3>
      <p class="text-muted-foreground mb-2 text-[10px]">
        Shift/Cmd/Ctrl-click rows, or use checkboxes to multi-select.
      </p>
      <div class="max-h-64 space-y-2 overflow-y-auto pr-1">
        {#each contentNodeGroups as group (group.label)}
          <div>
            <p class="text-muted-foreground mb-0.5 text-[10px] font-medium uppercase">
              {group.label} ({group.nodes.length})
            </p>
            <ul class="space-y-0.5" aria-label={group.label}>
              {#each group.nodes as node (node.id)}
                <li>
                  <div
                    class="flex items-center gap-1 rounded px-2 py-0.5 text-xs {store.selectedNodeIds.has(node.id)
                      ? 'bg-primary/15 text-primary'
                      : 'hover:bg-accent'}"
                  >
                    <input
                      type="checkbox"
                      class="h-3.5 w-3.5"
                      checked={store.selectedNodeIds.has(node.id)}
                      aria-label={`Toggle selection for ${nodeLabel(node)}`}
                      onclick={(event) => event.stopPropagation()}
                      onchange={(event) => handleNodeCheckboxToggle(node, event)}
                    />
                    <button
                      class="min-w-0 flex-1 text-left"
                      onclick={(event) => pickNode(node, event)}
                    >
                      <span class="truncate">{nodeLabel(node)}</span>
                    </button>
                  </div>
                </li>
              {/each}
            </ul>
          </div>
        {/each}
      </div>
    </div>
  {/if}
</section>
