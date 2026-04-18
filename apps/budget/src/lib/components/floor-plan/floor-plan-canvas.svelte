<script lang="ts">
  import type { FloorPlanNode } from "$core/schema/home/home-floor-plan-nodes";
  import type { FloorPlanStore, EditorTool } from "$lib/stores/floor-plan.svelte";
  import {
    defaultElevationForSurface,
    defaultNameForNodeType,
    defaultSegmentHeight,
    defaultSegmentThickness,
    resolveSegmentTypeFromTool,
    resolveSurfaceTypeFromTool,
    segmentNeedsHierarchyParent,
    surfaceNeedsHierarchyParent,
  } from "$lib/utils/floor-plan-tools";
  import WallNode from "./nodes/wall-node.svelte";
  import RoomNode from "./nodes/room-node.svelte";
  import FurnitureNode from "./nodes/furniture-node.svelte";
  import AssetLayerNode from "./nodes/asset-layer-node.svelte";
  import AnnotationNode from "./nodes/annotation-node.svelte";

  let { store }: { store: FloorPlanStore } = $props();

  let svgEl: SVGSVGElement;
  let isPanning = $state(false);
  let isDrawing = $state(false);
  let drawStart = $state<{ x: number; y: number } | null>(null);
  let drawCurrent = $state<{ x: number; y: number } | null>(null);
  let panStart = $state<{ x: number; y: number } | null>(null);
  let spaceHeld = $state(false);
  const segmentTools = new Set<EditorTool>([
    "wall",
    "fence",
    "roof-segment",
    "stair-segment",
  ]);
  const surfaceTools = new Set<EditorTool>([
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
  const itemTools = new Set<EditorTool>(["furniture", "item"]);
  const assetTools = new Set<EditorTool>(["scan", "guide"]);
  const segmentNodeTypes = new Set<FloorPlanNode["nodeType"]>([
    "wall",
    "fence",
    "roof-segment",
    "stair-segment",
  ]);
  const MARQUEE_CLICK_TOLERANCE = 4;

  type BoundsRect = {
    left: number;
    top: number;
    right: number;
    bottom: number;
    width: number;
    height: number;
  };
  let isMarqueeSelecting = $state(false);
  let marqueeStart = $state<{ x: number; y: number } | null>(null);
  let marqueeCurrent = $state<{ x: number; y: number } | null>(null);
  let marqueeAdditive = $state(false);

  function normalizeRect(a: { x: number; y: number }, b: { x: number; y: number }): BoundsRect {
    const left = Math.min(a.x, b.x);
    const right = Math.max(a.x, b.x);
    const top = Math.min(a.y, b.y);
    const bottom = Math.max(a.y, b.y);
    return {
      left,
      right,
      top,
      bottom,
      width: right - left,
      height: bottom - top,
    };
  }

  function rotatedRectBounds(
    x: number,
    y: number,
    width: number,
    height: number,
    rotation = 0
  ): BoundsRect {
    if (!rotation) {
      return normalizeRect({ x, y }, { x: x + width, y: y + height });
    }
    const cx = x + width / 2;
    const cy = y + height / 2;
    const rad = (rotation * Math.PI) / 180;
    const cos = Math.cos(rad);
    const sin = Math.sin(rad);
    const corners = [
      [x, y],
      [x + width, y],
      [x, y + height],
      [x + width, y + height],
    ];
    let minX = Number.POSITIVE_INFINITY;
    let minY = Number.POSITIVE_INFINITY;
    let maxX = Number.NEGATIVE_INFINITY;
    let maxY = Number.NEGATIVE_INFINITY;
    for (const [px, py] of corners) {
      const dx = px - cx;
      const dy = py - cy;
      const rx = cx + dx * cos - dy * sin;
      const ry = cy + dx * sin + dy * cos;
      minX = Math.min(minX, rx);
      minY = Math.min(minY, ry);
      maxX = Math.max(maxX, rx);
      maxY = Math.max(maxY, ry);
    }
    return {
      left: minX,
      right: maxX,
      top: minY,
      bottom: maxY,
      width: maxX - minX,
      height: maxY - minY,
    };
  }

  function rectsIntersect(a: BoundsRect, b: BoundsRect): boolean {
    return a.left <= b.right && a.right >= b.left && a.top <= b.bottom && a.bottom >= b.top;
  }

  function getNodeBounds(node: FloorPlanNode): BoundsRect {
    if (segmentNodeTypes.has(node.nodeType)) {
      const x1 = node.posX;
      const y1 = node.posY;
      const x2 = node.x2 ?? x1;
      const y2 = node.y2 ?? y1;
      const pad = 8;
      return {
        left: Math.min(x1, x2) - pad,
        right: Math.max(x1, x2) + pad,
        top: Math.min(y1, y2) - pad,
        bottom: Math.max(y1, y2) + pad,
        width: Math.abs(x2 - x1) + pad * 2,
        height: Math.abs(y2 - y1) + pad * 2,
      };
    }

    if (node.nodeType === "scan" || node.nodeType === "guide") {
      if (node.width > 0 && node.height > 0) {
        return rotatedRectBounds(node.posX, node.posY, node.width, node.height, node.rotation);
      }
      const radius = 12;
      return {
        left: node.posX - radius,
        right: node.posX + radius,
        top: node.posY - radius,
        bottom: node.posY + radius,
        width: radius * 2,
        height: radius * 2,
      };
    }

    if (node.nodeType === "annotation") {
      const radius = 12;
      return {
        left: node.posX - radius,
        right: node.posX + radius,
        top: node.posY - radius,
        bottom: node.posY + radius,
        width: radius * 2,
        height: radius * 2,
      };
    }

    if (
      node.nodeType === "door" ||
      node.nodeType === "window" ||
      node.nodeType === "furniture" ||
      node.nodeType === "appliance" ||
      node.nodeType === "item"
    ) {
      const isOpening = node.nodeType === "door" || node.nodeType === "window";
      const x = isOpening ? node.posX - node.width / 2 : node.posX;
      const y = isOpening ? node.posY - node.height / 2 : node.posY;
      return rotatedRectBounds(x, y, node.width, node.height, node.rotation);
    }

    if (node.width > 0 && node.height > 0) {
      return rotatedRectBounds(node.posX, node.posY, node.width, node.height, node.rotation);
    }

    return {
      left: node.posX - 4,
      right: node.posX + 4,
      top: node.posY - 4,
      bottom: node.posY + 4,
      width: 8,
      height: 8,
    };
  }

  function findNodeIdsInRect(rect: BoundsRect): string[] {
    const ids: string[] = [];
    for (const node of store.visibleNodeList) {
      if (rectsIntersect(rect, getNodeBounds(node))) {
        ids.push(node.id);
      }
    }
    return ids;
  }

  function clearMarqueeState(): void {
    isMarqueeSelecting = false;
    marqueeStart = null;
    marqueeCurrent = null;
    marqueeAdditive = false;
  }

  function finishMarqueeSelection(): void {
    if (!isMarqueeSelecting || !marqueeStart || !marqueeCurrent) {
      clearMarqueeState();
      return;
    }
    const rect = normalizeRect(marqueeStart, marqueeCurrent);
    const isClickLike =
      rect.width < MARQUEE_CLICK_TOLERANCE && rect.height < MARQUEE_CLICK_TOLERANCE;
    if (isClickLike) {
      if (!marqueeAdditive) store.clearSelection();
      clearMarqueeState();
      return;
    }

    const ids = findNodeIdsInRect(rect);
    if (marqueeAdditive) {
      const next = new Set(store.selectedNodeIds);
      for (const id of ids) next.add(id);
      store.setSelection(next);
    } else {
      store.setSelection(ids);
    }
    clearMarqueeState();
  }

  // Shared tool/type helpers live in `$lib/utils/floor-plan-tools` so the
  // 3D scene (scene-3d.svelte) and this canvas can't drift on defaults.

  function handleKeyDown(e: KeyboardEvent) {
    if (e.code === "Space" && !spaceHeld) {
      spaceHeld = true;
      e.preventDefault();
    }
  }

  function handleKeyUp(e: KeyboardEvent) {
    if (e.code === "Space") {
      spaceHeld = false;
    }
  }

  function svgPoint(e: MouseEvent): { x: number; y: number } {
    if (!svgEl) return { x: 0, y: 0 };
    const rect = svgEl.getBoundingClientRect();
    const scaleX = store.viewBoxWidth / rect.width;
    const scaleY = store.viewBoxHeight / rect.height;
    return {
      x: (e.clientX - rect.left) * scaleX + store.viewBoxX,
      y: (e.clientY - rect.top) * scaleY + store.viewBoxY,
    };
  }

  function handleMouseDown(e: MouseEvent) {
    if (e.button === 1 || (e.button === 0 && (store.activeTool === "pan" || spaceHeld))) {
      isPanning = true;
      panStart = { x: e.clientX, y: e.clientY };
      e.preventDefault();
      return;
    }

    if (e.button !== 0) return;

    const pt = svgPoint(e);

    if (segmentTools.has(store.activeTool)) {
      // Draw attempt — `tryActivateTool` may auto-create parents +
      // toast the user; `canActivateTool` is the silent predicate.
      if (!store.tryActivateTool(store.activeTool)) {
        return;
      }
      isDrawing = true;
      drawStart = pt;
      drawCurrent = pt;
    } else if (surfaceTools.has(store.activeTool)) {
      if (!store.tryActivateTool(store.activeTool)) {
        return;
      }
      isDrawing = true;
      drawStart = pt;
      drawCurrent = pt;
    } else if (store.activeTool === "door" || store.activeTool === "window") {
      // Doors/windows snap onto the nearest wall so they render consistently
      // in 2D (rectangle aligned with wall) and 3D (hole in wall + mesh).
      store.placeOpening(store.activeTool, pt.x, pt.y, {
        defaultWidth: store.activeTool === "door" ? 40 : 60,
        defaultHeight: 10,
        name: store.activeTool === "door" ? "Door" : "Window",
      });
    } else if (itemTools.has(store.activeTool)) {
      const isCatalogItem = store.activeTool === "item";
      store.addNode(isCatalogItem ? "item" : "furniture", {
        posX: pt.x,
        posY: pt.y,
        parentId: store.resolveDefaultContentParentId(),
        width: 60,
        height: 60,
        name: isCatalogItem ? "Item" : "Furniture",
        color: null,
      });
    } else if (assetTools.has(store.activeTool)) {
      if (store.activeTool === "scan" || store.activeTool === "guide") {
        store.createAssetReference(store.activeTool, pt.x, pt.y);
      }
    } else if (store.activeTool === "select") {
      const target = e.target as Element | null;
      const isBackground =
        target?.tagName?.toLowerCase() === "svg" || target?.classList.contains("grid-bg");
      if (isBackground) {
        if (store.selectionToolMode === "marquee") {
          // Click-drag empty canvas for marquee multi-select.
          isMarqueeSelecting = true;
          marqueeStart = pt;
          marqueeCurrent = pt;
          marqueeAdditive = e.shiftKey;
        } else if (!e.shiftKey) {
          // Click mode keeps classic empty-canvas clear behaviour.
          store.clearSelection();
        }
      }
    }
  }

  function handleMouseMove(e: MouseEvent) {
    if (isPanning && panStart) {
      store.pan(e.clientX - panStart.x, e.clientY - panStart.y);
      panStart = { x: e.clientX, y: e.clientY };
      return;
    }

    if (isDrawing && drawStart) {
      drawCurrent = svgPoint(e);
    }

    if (isMarqueeSelecting && marqueeStart) {
      marqueeCurrent = svgPoint(e);
    }
  }

  function handleMouseUp(e: MouseEvent) {
    if (isPanning) {
      isPanning = false;
      panStart = null;
      return;
    }

    if (isMarqueeSelecting) {
      finishMarqueeSelection();
      return;
    }

    if (isDrawing && drawStart && drawCurrent) {
      const segmentType = resolveSegmentTypeFromTool(store.activeTool);
      if (segmentType) {
        const dx = drawCurrent.x - drawStart.x;
        const dy = drawCurrent.y - drawStart.y;
        const len = Math.sqrt(dx * dx + dy * dy);
        if (len > 10) {
          const centerX = (drawStart.x + drawCurrent.x) / 2;
          const centerY = (drawStart.y + drawCurrent.y) / 2;
          const needsHierarchyParent = segmentNeedsHierarchyParent(segmentType);
          const parentId = needsHierarchyParent
            ? store.resolveParentForCreation(segmentType, centerX, centerY)
            : store.resolveDefaultContentParentId();
          if (!store.requireParentForCreation(segmentType, parentId)) {
            isDrawing = false;
            drawStart = null;
            drawCurrent = null;
            return;
          }
          store.addNode(segmentType, {
            posX: store.snap(drawStart.x),
            posY: store.snap(drawStart.y),
            parentId,
            x2: store.snap(drawCurrent.x),
            y2: store.snap(drawCurrent.y),
            wallHeight: defaultSegmentHeight(segmentType),
            thickness: defaultSegmentThickness(segmentType),
            name: needsHierarchyParent ? defaultNameForNodeType(segmentType) : null,
            color: null,
          });
        }
      } else {
        const surfaceType = resolveSurfaceTypeFromTool(store.activeTool);
        if (!surfaceType) {
          isDrawing = false;
          drawStart = null;
          drawCurrent = null;
          return;
        }
        const x = Math.min(drawStart.x, drawCurrent.x);
        const y = Math.min(drawStart.y, drawCurrent.y);
        const w = Math.abs(drawCurrent.x - drawStart.x);
        const h = Math.abs(drawCurrent.y - drawStart.y);
        if (w > 20 && h > 20) {
          const centerX = x + w / 2;
          const centerY = y + h / 2;
          const parentId = surfaceNeedsHierarchyParent(surfaceType)
            ? store.resolveParentForCreation(surfaceType, centerX, centerY)
            : store.resolveDefaultContentParentId();
          if (!store.requireParentForCreation(surfaceType, parentId)) {
            isDrawing = false;
            drawStart = null;
            drawCurrent = null;
            return;
          }
          store.addNode(surfaceType, {
            posX: store.snap(x),
            posY: store.snap(y),
            width: store.snap(w),
            height: store.snap(h),
            parentId,
            name: defaultNameForNodeType(surfaceType),
            elevation: defaultElevationForSurface(surfaceType),
            color: null,
          });
        }
      }
    }

    isDrawing = false;
    drawStart = null;
    drawCurrent = null;
  }

  function handleWheel(e: WheelEvent) {
    if (!svgEl) return;
    // preventDefault is ignored silently when the listener is attached passively.
    // We attach via addEventListener({ passive: false }) below so preventDefault
    // actually cancels the default scroll.
    e.preventDefault();
    const delta = e.deltaY > 0 ? 0.9 : 1.1;
    const pt = svgPoint(e);
    store.zoomTo(store.zoom * delta, pt.x, pt.y);
  }

  // Svelte 5's `onwheel={...}` binding attaches the handler passively, which
  // makes `preventDefault()` inside the handler silently no-op and produces
  // a browser warning. Attach a non-passive listener imperatively so zoom
  // actually suppresses the page's default scroll.
  $effect(() => {
    if (!svgEl) return;
    const el = svgEl;
    el.addEventListener("wheel", handleWheel, { passive: false });
    return () => el.removeEventListener("wheel", handleWheel);
  });

  function handleNodeClick(id: string, e: MouseEvent) {
    if (store.activeTool !== "select") return;
    e.stopPropagation();
    store.selectNode(id, e.shiftKey);
  }

  /**
   * Arrow-key handler bound per-node via `onkeydown`. Nudges the current
   * selection by one grid cell (Shift+arrow = 10 cells). Non-arrow keys
   * fall through so the page-level shortcuts (undo, delete, etc.) still run.
   */
  function handleNodeKeyDown(e: KeyboardEvent) {
    const step = store.gridSize * (e.shiftKey ? 10 : 1);
    switch (e.key) {
      case "ArrowLeft":
        e.preventDefault();
        store.nudgeSelection(-step, 0);
        break;
      case "ArrowRight":
        e.preventDefault();
        store.nudgeSelection(step, 0);
        break;
      case "ArrowUp":
        e.preventDefault();
        store.nudgeSelection(0, -step);
        break;
      case "ArrowDown":
        e.preventDefault();
        store.nudgeSelection(0, step);
        break;
    }
  }

  let dragNodeId = $state<string | null>(null);
  let dragOffset = $state<{ x: number; y: number } | null>(null);
  let dragDidMove = $state(false);

  function handleNodeMouseDown(id: string, e: MouseEvent) {
    if (store.activeTool !== "select" || e.button !== 0) return;
    e.stopPropagation();

    // Let shift-click run through the click handler only (single toggle) and
    // don't arm dragging while the user is multi-selecting.
    if (e.shiftKey) {
      dragNodeId = null;
      dragOffset = null;
      dragDidMove = false;
      return;
    }

    const pt = svgPoint(e);
    const node = store.nodes[id];
    if (!node) return;

    if (!store.selectNode(id)) return;
    dragNodeId = id;
    dragOffset = { x: pt.x - node.posX, y: pt.y - node.posY };
    dragDidMove = false;
  }

  function handleCanvasMouseMove(e: MouseEvent) {
    handleMouseMove(e);

    if (dragNodeId && dragOffset) {
      const pt = svgPoint(e);
      const node = store.nodes[dragNodeId];
      if (node) {
        const newX = store.snap(pt.x - dragOffset.x);
        const newY = store.snap(pt.y - dragOffset.y);
        const dx = newX - node.posX;
        const dy = newY - node.posY;
        if (dx !== 0 || dy !== 0) {
          dragDidMove = store.moveNode(dragNodeId, dx, dy) || dragDidMove;
        }
      }
    }
  }

  function handleCanvasMouseUp(e: MouseEvent) {
    handleMouseUp(e);
    if (dragNodeId) {
      if (dragDidMove) {
        // Re-snap doors/windows onto whichever wall they were dropped on. If
        // dragged away from every wall they become unparented (and won't cut
        // an opening in 3D) — the mesh still renders so the user can pick
        // them back up and drop them onto a wall.
        const dragged = store.nodes[dragNodeId];
        if (dragged && (dragged.nodeType === "door" || dragged.nodeType === "window")) {
          store.reparentOpeningToNearestWall(dragNodeId);
        }
        store.commitChange();
      }
      dragNodeId = null;
      dragOffset = null;
      dragDidMove = false;
    }
  }

  const viewBox = $derived(
    `${store.viewBoxX} ${store.viewBoxY} ${store.viewBoxWidth} ${store.viewBoxHeight}`
  );

  const cursorClass = $derived(
    store.activeTool === "pan" || isPanning || spaceHeld
      ? "cursor-grab"
      : store.activeTool === "select"
        ? store.selectionToolMode === "marquee"
          ? "cursor-crosshair"
          : "cursor-default"
        : "cursor-crosshair"
  );

  const marqueeRect = $derived.by(() => {
    if (!isMarqueeSelecting || !marqueeStart || !marqueeCurrent) return null;
    return normalizeRect(marqueeStart, marqueeCurrent);
  });

  /**
   * Summary sentence for assistive tech — announces how many of each
   * visible type the canvas currently contains plus the active tool.
   * Screen-reader users can't see the canvas; this gives them a sense of
   * scope before they Tab into the nodes. The count updates reactively.
   */
  const canvasA11yLabel = $derived.by(() => {
    const counts: string[] = [];
    const add = (n: number, singular: string, plural = `${singular}s`) => {
      if (n > 0) counts.push(`${n} ${n === 1 ? singular : plural}`);
    };
    add(store.walls.length, "wall");
    add(store.rooms.length, "room");
    add(store.furniture.length, "furniture item");
    add(store.doors.length, "door");
    add(store.windows.length, "window");
    add(store.annotations.length, "annotation");
    const countSummary = counts.length > 0 ? counts.join(", ") : "empty";
    return `Floor plan editor canvas: ${countSummary}. Active tool: ${store.activeTool}.`;
  });
</script>

<!-- svelte-ignore a11y_no_noninteractive_tabindex a11y_no_noninteractive_element_interactions -->
<svg
  role="application"
  aria-label={canvasA11yLabel}
  bind:this={svgEl}
  class="h-full w-full bg-white outline-none dark:bg-zinc-900 {cursorClass}"
  {viewBox}
  preserveAspectRatio="none"
  tabindex="0"
  onmousedown={handleMouseDown}
  onmousemove={handleCanvasMouseMove}
  onmouseup={handleCanvasMouseUp}
  onkeydown={handleKeyDown}
  onkeyup={handleKeyUp}
>
  <!-- Grid -->
  {#if store.showGrid}
    <defs>
      <pattern
        id="grid"
        width={store.gridSize}
        height={store.gridSize}
        patternUnits="userSpaceOnUse"
      >
        <path
          d="M {store.gridSize} 0 L 0 0 0 {store.gridSize}"
          fill="none"
          class="stroke-border"
          stroke-width="0.5"
        />
      </pattern>
      <pattern
        id="grid-large"
        width={store.gridSize * 5}
        height={store.gridSize * 5}
        patternUnits="userSpaceOnUse"
      >
        <rect width={store.gridSize * 5} height={store.gridSize * 5} fill="url(#grid)" />
        <path
          d="M {store.gridSize * 5} 0 L 0 0 0 {store.gridSize * 5}"
          fill="none"
          class="stroke-muted-foreground/40"
          stroke-width="1"
        />
      </pattern>
    </defs>
    <rect
      class="grid-bg"
      x={store.viewBoxX - 5000}
      y={store.viewBoxY - 5000}
      width={store.viewBoxWidth + 10000}
      height={store.viewBoxHeight + 10000}
      fill="url(#grid-large)"
    />
  {/if}

  <!-- Scan underlay assets -->
  {#each store.scans as node (node.id)}
    <AssetLayerNode
      {node}
      selected={store.selectedNodeIds.has(node.id)}
      onmousedown={(e) => handleNodeMouseDown(node.id, e)}
      onclick={(e) => handleNodeClick(node.id, e)}
      onkeydown={handleNodeKeyDown}
    />
  {/each}

  <!-- Rooms (rendered first, as background) -->
  {#each store.rooms as node (node.id)}
    <RoomNode
      {node}
      selected={store.selectedNodeIds.has(node.id)}
      onmousedown={(e) => handleNodeMouseDown(node.id, e)}
      onclick={(e) => handleNodeClick(node.id, e)}
      onkeydown={handleNodeKeyDown}
    />
  {/each}

  <!-- Walls -->
  {#each store.walls as node (node.id)}
    <WallNode
      {node}
      selected={store.selectedNodeIds.has(node.id)}
      onmousedown={(e) => handleNodeMouseDown(node.id, e)}
      onclick={(e) => handleNodeClick(node.id, e)}
      onkeydown={handleNodeKeyDown}
    />
  {/each}

  <!-- Doors and Windows -->
  {#each [...store.doors, ...store.windows] as node (node.id)}
    <FurnitureNode
      {node}
      selected={store.selectedNodeIds.has(node.id)}
      onmousedown={(e) => handleNodeMouseDown(node.id, e)}
      onclick={(e) => handleNodeClick(node.id, e)}
      onkeydown={handleNodeKeyDown}
    />
  {/each}

  <!-- Furniture -->
  {#each store.furniture as node (node.id)}
    <FurnitureNode
      {node}
      selected={store.selectedNodeIds.has(node.id)}
      onmousedown={(e) => handleNodeMouseDown(node.id, e)}
      onclick={(e) => handleNodeClick(node.id, e)}
      onkeydown={handleNodeKeyDown}
    />
  {/each}

  <!-- Guide overlays -->
  {#each store.guides as node (node.id)}
    <AssetLayerNode
      {node}
      selected={store.selectedNodeIds.has(node.id)}
      onmousedown={(e) => handleNodeMouseDown(node.id, e)}
      onclick={(e) => handleNodeClick(node.id, e)}
      onkeydown={handleNodeKeyDown}
    />
  {/each}

  <!-- Annotations -->
  {#each store.annotations as node (node.id)}
    <AnnotationNode
      {node}
      selected={store.selectedNodeIds.has(node.id)}
      onmousedown={(e) => handleNodeMouseDown(node.id, e)}
      onclick={(e) => handleNodeClick(node.id, e)}
      onkeydown={handleNodeKeyDown}
    />
  {/each}

  {#if marqueeRect}
    <rect
      x={marqueeRect.left}
      y={marqueeRect.top}
      width={marqueeRect.width}
      height={marqueeRect.height}
      class="fill-primary/10 stroke-primary pointer-events-none"
      stroke-width="1.5"
      stroke-dasharray="6 4"
    />
  {/if}

  <!-- Drawing preview -->
  {#if isDrawing && drawStart && drawCurrent}
    {#if segmentTools.has(store.activeTool)}
      <line
        x1={store.snap(drawStart.x)}
        y1={store.snap(drawStart.y)}
        x2={store.snap(drawCurrent.x)}
        y2={store.snap(drawCurrent.y)}
        class="stroke-foreground/50"
        stroke-width="6"
        stroke-linecap="round"
      />
    {:else if surfaceTools.has(store.activeTool)}
      <rect
        x={Math.min(drawStart.x, drawCurrent.x)}
        y={Math.min(drawStart.y, drawCurrent.y)}
        width={Math.abs(drawCurrent.x - drawStart.x)}
        height={Math.abs(drawCurrent.y - drawStart.y)}
        class="fill-muted/50 stroke-muted-foreground"
        stroke-width="2"
        stroke-dasharray="8 4"
      />
    {/if}
  {/if}
</svg>
