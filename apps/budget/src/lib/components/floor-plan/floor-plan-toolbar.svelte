<script lang="ts">
  import type { FloorPlanStore, EditorTool } from "$lib/stores/floor-plan.svelte";
  import {
    MousePointer,
    Minus,
    Square,
    DoorOpen,
    Grid3x3,
    Undo2,
    Redo2,
    ZoomIn,
    ZoomOut,
    Maximize,
    Save,
    Hand,
    Sofa,
    Box,
    Layers2,
  } from "@lucide/svelte";

  let {
    store,
    onsave,
    viewMode = "2d",
    onviewmodechange,
  }: {
    store: FloorPlanStore;
    onsave: () => void;
    viewMode?: "2d" | "3d";
    onviewmodechange?: (mode: "2d" | "3d") => void;
  } = $props();

  const tools: { id: EditorTool; icon: any; label: string }[] = [
    { id: "select", icon: MousePointer, label: "Select" },
    { id: "pan", icon: Hand, label: "Pan" },
    { id: "wall", icon: Minus, label: "Wall" },
    { id: "room", icon: Square, label: "Room" },
    { id: "door", icon: DoorOpen, label: "Door" },
    { id: "window", icon: Box, label: "Window" },
    { id: "furniture", icon: Sofa, label: "Furniture" },
  ];
</script>

<div class="flex items-center gap-1 border-b bg-white px-3 py-2 dark:bg-zinc-900">
  <!-- Tools -->
  <div class="flex items-center gap-0.5 rounded-md border p-0.5">
    {#each tools as tool}
      <button
        class="rounded px-2 py-1.5 text-sm transition-colors {store.activeTool === tool.id
          ? 'bg-primary text-primary-foreground'
          : 'hover:bg-accent'}"
        title={tool.label}
        onclick={() => (store.activeTool = tool.id)}
      >
        <tool.icon class="h-4 w-4" />
      </button>
    {/each}
  </div>

  <div class="bg-border mx-2 h-6 w-px"></div>

  <!-- Undo/Redo -->
  <button
    class="rounded p-1.5 hover:bg-accent disabled:opacity-30"
    title="Undo"
    disabled={!store.canUndo}
    onclick={() => store.undo()}
  >
    <Undo2 class="h-4 w-4" />
  </button>
  <button
    class="rounded p-1.5 hover:bg-accent disabled:opacity-30"
    title="Redo"
    disabled={!store.canRedo}
    onclick={() => store.redo()}
  >
    <Redo2 class="h-4 w-4" />
  </button>

  <div class="bg-border mx-2 h-6 w-px"></div>

  <!-- Zoom -->
  <button
    class="rounded p-1.5 hover:bg-accent"
    title="Zoom In"
    onclick={() => store.zoomIn()}
  >
    <ZoomIn class="h-4 w-4" />
  </button>
  <span class="text-muted-foreground min-w-12 text-center text-xs">
    {Math.round(store.zoom * 100)}%
  </span>
  <button
    class="rounded p-1.5 hover:bg-accent"
    title="Zoom Out"
    onclick={() => store.zoomOut()}
  >
    <ZoomOut class="h-4 w-4" />
  </button>
  <button
    class="rounded p-1.5 hover:bg-accent"
    title="Reset View"
    onclick={() => store.resetView()}
  >
    <Maximize class="h-4 w-4" />
  </button>

  <div class="bg-border mx-2 h-6 w-px"></div>

  <!-- Grid toggle -->
  <button
    class="rounded p-1.5 transition-colors {store.showGrid ? 'bg-accent' : 'hover:bg-accent'}"
    title="Toggle Grid"
    onclick={() => (store.showGrid = !store.showGrid)}
  >
    <Grid3x3 class="h-4 w-4" />
  </button>

  <div class="bg-border mx-2 h-6 w-px"></div>

  <!-- 2D/3D toggle -->
  <div class="flex items-center gap-0.5 rounded-md border p-0.5">
    <button
      class="rounded px-2 py-1.5 text-xs font-medium transition-colors {viewMode === '2d'
        ? 'bg-primary text-primary-foreground'
        : 'hover:bg-accent'}"
      title="2D View"
      onclick={() => onviewmodechange?.("2d")}
    >
      <Layers2 class="h-4 w-4" />
    </button>
    <button
      class="rounded px-2 py-1.5 text-xs font-medium transition-colors {viewMode === '3d'
        ? 'bg-primary text-primary-foreground'
        : 'hover:bg-accent'}"
      title="3D View"
      onclick={() => onviewmodechange?.("3d")}
    >
      <Box class="h-4 w-4" />
    </button>
  </div>

  <!-- Spacer -->
  <div class="flex-1"></div>

  <!-- Save -->
  <button
    class="flex items-center gap-1.5 rounded px-3 py-1.5 text-sm font-medium transition-colors {store.isDirty
      ? 'bg-primary text-primary-foreground hover:bg-primary/90'
      : 'bg-secondary text-secondary-foreground'}"
    onclick={onsave}
    disabled={!store.isDirty}
  >
    <Save class="h-4 w-4" />
    {store.isDirty ? "Save" : "Saved"}
  </button>
</div>
