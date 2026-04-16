<script lang="ts">
  import { browser } from "$app/environment";
  import { page } from "$app/stores";
  import { onMount, untrack } from "svelte";
  import { rpc } from "$lib/query";
  import { FloorPlanStore } from "$lib/stores/floor-plan.svelte";
  import FloorPlanCanvas from "$lib/components/floor-plan/floor-plan-canvas.svelte";
  import FloorPlanToolbar from "$lib/components/floor-plan/floor-plan-toolbar.svelte";
  import PropertiesPanel from "$lib/components/floor-plan/panels/properties-panel.svelte";

  const homeSlug = $derived($page.params.homeSlug ?? "");
  const homeQuery = $derived(rpc.homes.getHomeBySlug(homeSlug).options());

  /**
   * Hydration gate — see the comment in the parent `[homeSlug]/+layout.svelte`
   * for why. TanStack's in-memory query cache survives across client-side
   * navigations, so the very first client render can pick up a cached
   * `home` value while the SSR render saw `undefined`. That mismatch
   * propagates through derived values (floorLevels, floorPlanQuery, etc.)
   * and fires Svelte's hydration_mismatch warning. Delaying the swap to
   * real data until `onMount` keeps SSR and initial client HTML identical.
   */
  let hydrated = $state(false);
  onMount(() => {
    hydrated = true;
  });

  const home = $derived(hydrated ? homeQuery.data : undefined);
  const homeId = $derived(home?.id ?? 0);

  const store = new FloorPlanStore();

  let currentFloor = $state(0);
  let viewMode = $state<"2d" | "3d">("2d");
  let confirmDeleteOpen = $state(false);

  const floorPlanQuery = $derived(home ? rpc.homeFloorPlans.getFloorPlan(homeId, currentFloor).options() : undefined);
  const floorLevelsQuery = $derived(home ? rpc.homeFloorPlans.getFloorLevels(homeId).options() : undefined);
  const saveMutation = rpc.homeFloorPlans.saveFloorPlan.options();

  // FP-L1: distinguish "no plan exists yet" from "ground-floor-only plan" —
  // if the server returned no floor levels, default to a single ground floor
  // for display without misrepresenting the data.
  const floorLevels = $derived(
    (floorLevelsQuery?.data && floorLevelsQuery.data.length > 0)
      ? floorLevelsQuery.data
      : [0]
  );

  // Load nodes when query data arrives. Skip the load if the user has
  // unsaved edits (isDirty) — otherwise a query refetch triggered during
  // the save round-trip would clobber the in-flight changes. The load
  // still fires once after markSaved() clears the dirty flag.
  let lastLoadedData: unknown = null;
  $effect(() => {
    const data = floorPlanQuery?.data;
    if (data && data !== lastLoadedData && !untrack(() => store.isDirty)) {
      lastLoadedData = data;
      untrack(() => store.loadNodes(data, homeId, currentFloor));
    }
  });

  // Lazy-import the 3D scene to avoid SSR issues with Three.js.
  // Typed as the inferred default export so downstream usage isn't `any`.
  type Scene3DModule = typeof import("$lib/components/floor-plan/viewer-3d/scene-3d.svelte");
  let Scene3D: Scene3DModule["default"] | null = $state(null);
  $effect(() => {
    if (browser && viewMode === "3d" && !Scene3D) {
      import("$lib/components/floor-plan/viewer-3d/scene-3d.svelte").then((mod) => {
        Scene3D = mod.default;
      });
    }
  });

  async function handleSave() {
    try {
      await saveMutation.mutateAsync({
        homeId,
        floorLevel: currentFloor,
        nodes: store.getNodesForSave(),
        deletedNodeIds: store.deletedNodeIds,
      });
      store.markSaved();
    } catch {
      // Error toast handled by defineMutation's errorMessage
    }
  }

  function requestDeleteSelected() {
    if (store.selectedNodeIds.size === 0) return;
    // FP-M10: a single keystroke used to wipe the selection with no confirmation.
    // For more than one node we prompt; for a single selection we rely on undo.
    if (store.selectedNodeIds.size > 1) {
      confirmDeleteOpen = true;
      return;
    }
    store.deleteSelected();
  }

  function confirmDelete() {
    store.deleteSelected();
    confirmDeleteOpen = false;
  }

  function handleKeyDown(e: KeyboardEvent) {
    if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;

    if (e.key === "Delete" || e.key === "Backspace") {
      requestDeleteSelected();
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
    } else if (e.key === "g" || e.key === "6") {
      store.activeTool = "window";
    } else if (e.key === "f" || e.key === "7") {
      store.activeTool = "furniture";
    }
  }
</script>

<svelte:window onkeydown={handleKeyDown} />

<div class="flex h-[calc(100vh)] flex-col">
  <!-- Toolbar -->
  <FloorPlanToolbar
    {store}
    onsave={handleSave}
    {viewMode}
    onviewmodechange={(mode) => (viewMode = mode)}
  />

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
      {#if viewMode === "3d" && Scene3D}
        <Scene3D {store} />
      {:else}
        <FloorPlanCanvas {store} />
      {/if}
    </div>
    {#if viewMode === "2d"}
      <PropertiesPanel {store} />
    {/if}
  </div>

  {#if confirmDeleteOpen}
    <div
      class="fixed inset-0 z-50 flex items-center justify-center bg-black/40"
      role="dialog"
      aria-modal="true"
      aria-labelledby="fp-delete-title"
    >
      <div class="w-80 rounded-lg bg-white p-4 shadow-lg dark:bg-zinc-900">
        <h2 id="fp-delete-title" class="mb-2 text-base font-semibold">Delete selection?</h2>
        <p class="text-muted-foreground mb-4 text-sm">
          Remove {store.selectedNodeIds.size} nodes from the floor plan? You can undo with ⌘Z.
        </p>
        <div class="flex justify-end gap-2">
          <button
            class="rounded border px-3 py-1 text-sm hover:bg-accent"
            onclick={() => (confirmDeleteOpen = false)}
          >Cancel</button>
          <button
            class="bg-destructive text-destructive-foreground rounded px-3 py-1 text-sm"
            onclick={confirmDelete}
          >Delete</button>
        </div>
      </div>
    </div>
  {/if}
</div>
