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
    } else if (store.activeTool === "furniture" || store.activeTool === "door" || store.activeTool === "window") {
      const type = store.activeTool === "furniture" ? "furniture" : store.activeTool;
      store.addNode(type, {
        posX: pt.x,
        posY: pt.y,
        width: store.activeTool === "door" ? 40 : store.activeTool === "window" ? 60 : 60,
        height: store.activeTool === "door" ? 10 : store.activeTool === "window" ? 10 : 60,
        name: store.activeTool === "door" ? "Door" : store.activeTool === "window" ? "Window" : "Furniture",
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
    e.preventDefault();
    const delta = e.deltaY > 0 ? 0.9 : 1.1;
    const pt = svgPoint(e);
    store.zoomTo(store.zoom * delta, pt.x, pt.y);
  }

  function handleNodeClick(id: string, e: MouseEvent) {
    if (store.activeTool !== "select") return;
    e.stopPropagation();
    store.selectNode(id, e.shiftKey);
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
  tabindex="0"
  onmousedown={handleMouseDown}
  onmousemove={handleCanvasMouseMove}
  onmouseup={handleCanvasMouseUp}
  onwheel={handleWheel}
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
          stroke="hsl(var(--border))"
          stroke-width="0.5"
          class="dark:stroke-zinc-700"
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
          stroke="#D1D5DB"
          stroke-width="1"
          class="dark:stroke-zinc-600"
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
    />
  {/each}

  <!-- Walls -->
  {#each store.walls as node (node.id)}
    <WallNode
      {node}
      selected={store.selectedNodeIds.has(node.id)}
      onmousedown={(e) => handleNodeMouseDown(node.id, e)}
      onclick={(e) => handleNodeClick(node.id, e)}
    />
  {/each}

  <!-- Doors and Windows -->
  {#each [...store.doors, ...store.windows] as node (node.id)}
    <FurnitureNode
      {node}
      selected={store.selectedNodeIds.has(node.id)}
      onmousedown={(e) => handleNodeMouseDown(node.id, e)}
      onclick={(e) => handleNodeClick(node.id, e)}
    />
  {/each}

  <!-- Furniture -->
  {#each store.furniture as node (node.id)}
    <FurnitureNode
      {node}
      selected={store.selectedNodeIds.has(node.id)}
      onmousedown={(e) => handleNodeMouseDown(node.id, e)}
      onclick={(e) => handleNodeClick(node.id, e)}
    />
  {/each}

  <!-- Annotations -->
  {#each store.annotations as node (node.id)}
    <AnnotationNode
      {node}
      selected={store.selectedNodeIds.has(node.id)}
      onmousedown={(e) => handleNodeMouseDown(node.id, e)}
      onclick={(e) => handleNodeClick(node.id, e)}
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
        stroke="hsl(var(--foreground) / 0.7)"
        stroke-width="6"
        stroke-linecap="round"
        opacity="0.5"
      />
    {:else if store.activeTool === "room"}
      <rect
        x={Math.min(drawStart.x, drawCurrent.x)}
        y={Math.min(drawStart.y, drawCurrent.y)}
        width={Math.abs(drawCurrent.x - drawStart.x)}
        height={Math.abs(drawCurrent.y - drawStart.y)}
        fill="hsl(var(--muted))"
        stroke="hsl(var(--muted-foreground))"
        stroke-width="2"
        stroke-dasharray="8 4"
        opacity="0.5"
      />
    {/if}
  {/if}
</svg>
