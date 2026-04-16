<script lang="ts">
  import type { FloorPlanStore, EditorTool } from "$lib/stores/floor-plan.svelte";
  import WallNode from "./nodes/wall-node.svelte";
  import RoomNode from "./nodes/room-node.svelte";
  import FurnitureNode from "./nodes/furniture-node.svelte";
  import AnnotationNode from "./nodes/annotation-node.svelte";

  let { store }: { store: FloorPlanStore } = $props();

  let svgEl: SVGSVGElement;
  let isPanning = $state(false);
  let isDrawing = $state(false);
  let drawStart = $state<{ x: number; y: number } | null>(null);
  let drawCurrent = $state<{ x: number; y: number } | null>(null);
  let panStart = $state<{ x: number; y: number } | null>(null);
  let spaceHeld = $state(false);

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

    if (store.activeTool === "wall") {
      isDrawing = true;
      drawStart = pt;
      drawCurrent = pt;
    } else if (store.activeTool === "room") {
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
    } else if (store.activeTool === "furniture") {
      store.addNode("furniture", {
        posX: pt.x,
        posY: pt.y,
        width: 60,
        height: 60,
        name: "Furniture",
        color: null,
      });
    } else if (store.activeTool === "select") {
      // Click on empty space clears selection
      if ((e.target as Element)?.tagName === "svg" || (e.target as Element)?.classList.contains("grid-bg")) {
        store.clearSelection();
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
  }

  function handleMouseUp(e: MouseEvent) {
    if (isPanning) {
      isPanning = false;
      panStart = null;
      return;
    }

    if (isDrawing && drawStart && drawCurrent) {
      if (store.activeTool === "wall") {
        const dx = drawCurrent.x - drawStart.x;
        const dy = drawCurrent.y - drawStart.y;
        const len = Math.sqrt(dx * dx + dy * dy);
        if (len > 10) {
          store.addNode("wall", {
            posX: store.snap(drawStart.x),
            posY: store.snap(drawStart.y),
            x2: store.snap(drawCurrent.x),
            y2: store.snap(drawCurrent.y),
            color: null,
          });
        }
      } else if (store.activeTool === "room") {
        const x = Math.min(drawStart.x, drawCurrent.x);
        const y = Math.min(drawStart.y, drawCurrent.y);
        const w = Math.abs(drawCurrent.x - drawStart.x);
        const h = Math.abs(drawCurrent.y - drawStart.y);
        if (w > 20 && h > 20) {
          store.addNode("room", {
            posX: store.snap(x),
            posY: store.snap(y),
            width: store.snap(w),
            height: store.snap(h),
            name: "Room",
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

  function handleNodeMouseDown(id: string, e: MouseEvent) {
    if (store.activeTool !== "select" || e.button !== 0) return;
    e.stopPropagation();

    const pt = svgPoint(e);
    const node = store.nodes[id];
    if (!node) return;

    store.selectNode(id, e.shiftKey);
    dragNodeId = id;
    dragOffset = { x: pt.x - node.posX, y: pt.y - node.posY };
  }

  function handleCanvasMouseMove(e: MouseEvent) {
    handleMouseMove(e);

    if (dragNodeId && dragOffset) {
      const pt = svgPoint(e);
      const node = store.nodes[dragNodeId];
      if (node) {
        const newX = store.snap(pt.x - dragOffset.x);
        const newY = store.snap(pt.y - dragOffset.y);
        store.updateNode(dragNodeId, { posX: newX, posY: newY });
      }
    }
  }

  function handleCanvasMouseUp(e: MouseEvent) {
    handleMouseUp(e);
    if (dragNodeId) {
      // Re-snap doors/windows onto whichever wall they were dropped on. If
      // dragged away from every wall they become unparented (and won't cut
      // an opening in 3D) — the mesh still renders so the user can pick
      // them back up and drop them onto a wall.
      const dragged = store.nodes[dragNodeId];
      if (dragged && (dragged.nodeType === "door" || dragged.nodeType === "window")) {
        store.reparentOpeningToNearestWall(dragNodeId);
      }
      store.commitChange();
      dragNodeId = null;
      dragOffset = null;
    }
  }

  const viewBox = $derived(
    `${store.viewBoxX} ${store.viewBoxY} ${store.viewBoxWidth} ${store.viewBoxHeight}`
  );

  const cursorClass = $derived(
    store.activeTool === "pan" || isPanning || spaceHeld
      ? "cursor-grab"
      : store.activeTool === "select"
        ? "cursor-default"
        : "cursor-crosshair"
  );
</script>

<!-- svelte-ignore a11y_no_noninteractive_tabindex a11y_no_noninteractive_element_interactions -->
<svg
  role="application"
  aria-label="Floor plan editor canvas"
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

  <!-- Drawing preview -->
  {#if isDrawing && drawStart && drawCurrent}
    {#if store.activeTool === "wall"}
      <line
        x1={store.snap(drawStart.x)}
        y1={store.snap(drawStart.y)}
        x2={store.snap(drawCurrent.x)}
        y2={store.snap(drawCurrent.y)}
        class="stroke-foreground/50"
        stroke-width="6"
        stroke-linecap="round"
      />
    {:else if store.activeTool === "room"}
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
