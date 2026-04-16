<script lang="ts">
  import { createQuery, createMutation } from "@tanstack/svelte-query";
  import { rpc } from "$lib/query";
  import { FloorPlanStore } from "$lib/stores/floor-plan.svelte";
  import FloorPlanCanvas from "$lib/components/floor-plan/floor-plan-canvas.svelte";
  import FloorPlanToolbar from "$lib/components/floor-plan/floor-plan-toolbar.svelte";
  import PropertiesPanel from "$lib/components/floor-plan/panels/properties-panel.svelte";
  import type { PageData } from "./$types";

  let { data }: { data: PageData } = $props();

  const store = new FloorPlanStore();

  let currentFloor = $state(0);

  const floorPlanQuery = createQuery(
    rpc.homeFloorPlans.getFloorPlan(data.home.id, currentFloor).options()
  );
  const floorLevelsQuery = createQuery(
    rpc.homeFloorPlans.getFloorLevels(data.home.id).options()
  );
  const saveMutation = createMutation(rpc.homeFloorPlans.saveFloorPlan.options());

  const floorLevels = $derived($floorLevelsQuery.data ?? [0]);

  // Load nodes when query data arrives
  $effect(() => {
    if ($floorPlanQuery.data) {
      store.loadNodes($floorPlanQuery.data, data.home.id, currentFloor);
    }
  });

  async function handleSave() {
    await $saveMutation.mutateAsync({
      homeId: data.home.id,
      floorLevel: currentFloor,
      nodes: store.getNodesForSave(),
      deletedNodeIds: store.deletedNodeIds,
    });
    store.markSaved();
  }

  function handleKeyDown(e: KeyboardEvent) {
    if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;

    if (e.key === "Delete" || e.key === "Backspace") {
      store.deleteSelected();
    } else if (e.key === "z" && (e.metaKey || e.ctrlKey) && !e.shiftKey) {
      e.preventDefault();
      store.undo();
    } else if ((e.key === "z" && (e.metaKey || e.ctrlKey) && e.shiftKey) || (e.key === "y" && (e.metaKey || e.ctrlKey))) {
      e.preventDefault();
      store.redo();
    } else if (e.key === "a" && (e.metaKey || e.ctrlKey)) {
      e.preventDefault();
      store.selectAll();
    } else if (e.key === "s" && (e.metaKey || e.ctrlKey)) {
      e.preventDefault();
      handleSave();
    } else if (e.key === "Escape") {
      store.clearSelection();
      store.activeTool = "select";
    } else if (e.key === "v" || e.key === "1") {
      store.activeTool = "select";
    } else if (e.key === "h" || e.key === "2") {
      store.activeTool = "pan";
    } else if (e.key === "w" || e.key === "3") {
      store.activeTool = "wall";
    } else if (e.key === "r" || e.key === "4") {
      store.activeTool = "room";
    } else if (e.key === "d" || e.key === "5") {
      store.activeTool = "door";
    } else if (e.key === "f" || e.key === "6") {
      store.activeTool = "furniture";
    }
  }
</script>

<svelte:window onkeydown={handleKeyDown} />

<div class="flex h-[calc(100vh)] flex-col">
  <!-- Toolbar -->
  <FloorPlanToolbar {store} onsave={handleSave} />

  <!-- Floor level selector -->
  {#if floorLevels.length > 1}
    <div class="flex items-center gap-2 border-b bg-white px-3 py-1.5 dark:bg-zinc-900">
      <span class="text-muted-foreground text-xs font-medium">Floor:</span>
      {#each floorLevels as level}
        <button
          class="rounded px-2 py-0.5 text-xs {currentFloor === level
            ? 'bg-primary text-primary-foreground'
            : 'hover:bg-accent'}"
          onclick={() => (currentFloor = level)}
        >
          {level === 0 ? "Ground" : level > 0 ? `Floor ${level}` : `Basement ${Math.abs(level)}`}
        </button>
      {/each}
      <button
        class="text-muted-foreground rounded px-2 py-0.5 text-xs hover:bg-accent"
        onclick={() => {
          const maxLevel = Math.max(...floorLevels);
          currentFloor = maxLevel + 1;
        }}
      >
        + Add Floor
      </button>
    </div>
  {/if}

  <!-- Canvas + Properties -->
  <div class="flex flex-1 overflow-hidden">
    <div class="flex-1">
      <FloorPlanCanvas {store} />
    </div>
    <PropertiesPanel {store} />
  </div>
</div>
