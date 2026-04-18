<script lang="ts">
  import { browser } from "$app/environment";
  import { page } from "$app/stores";
  import { onMount, untrack } from "svelte";
  import { rpc } from "$lib/query";
  import { FloorPlanStore } from "$lib/stores/floor-plan.svelte";
  import type { EditorTool, FloorPlanWizardInput } from "$lib/stores/floor-plan.svelte";
  import FloorPlanCanvas from "$lib/components/floor-plan/floor-plan-canvas.svelte";
  import FloorPlanToolbar from "$lib/components/floor-plan/floor-plan-toolbar.svelte";
  import FloorPlanDefaultWizard from "$lib/components/floor-plan/floor-plan-default-wizard.svelte";
  import HierarchyPanel from "$lib/components/floor-plan/panels/hierarchy-panel.svelte";
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
  let wizardOpen = $state(false);
  let scene3DZoomPercent = $state(100);

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
  // unsaved edits (isDirty) for the SAME floor — otherwise a query refetch
  // triggered during the save round-trip would clobber in-flight changes.
  // Dedup by (homeId, floorLevel, data-ref) so switching floors always
  // reloads even when referentially-equal cached payloads are in play.
  let lastLoadedKey: string | null = null;
  let lastLoadedData: unknown = null;
  $effect(() => {
    const data = floorPlanQuery?.data;
    if (!data) return;
    const key = `${homeId}:${currentFloor}`;
    const sameFloorSameData = key === lastLoadedKey && data === lastLoadedData;
    if (sameFloorSameData) return;
    const floorChanged = key !== lastLoadedKey;
    if (floorChanged || !untrack(() => store.isDirty)) {
      lastLoadedKey = key;
      lastLoadedData = data;
      untrack(() => store.loadNodes(data, homeId, currentFloor));
    }
  });

  // Lazy-import the 3D scene to avoid SSR issues with Three.js.
  // Typed as the inferred default export so downstream usage isn't `any`.
  //
  // Svelte 5's `Component<Props, Exports, Bindings>` is a pure TYPE, not a
  // constructor, so `InstanceType<>` on it errors. We declare the ref's
  // shape explicitly — it must match scene-3d.svelte's `export function`
  // declarations for `zoomIn` / `zoomOut` / `resetView`.
  type Scene3DModule = typeof import("$lib/components/floor-plan/viewer-3d/scene-3d.svelte");
  type Scene3DExports = {
    zoomIn: () => void;
    zoomOut: () => void;
    resetView: () => void;
  };
  let Scene3D: Scene3DModule["default"] | null = $state(null);
  let scene3DRef = $state<Scene3DExports | null>(null);
  $effect(() => {
    if (browser && viewMode === "3d" && !Scene3D) {
      import("$lib/components/floor-plan/viewer-3d/scene-3d.svelte").then((mod) => {
        Scene3D = mod.default;
      });
    }
  });

  function handleToolbarZoomIn(): void {
    if (viewMode === "3d") {
      scene3DRef?.zoomIn?.();
      return;
    }
    store.zoomIn();
  }

  function handleToolbarZoomOut(): void {
    if (viewMode === "3d") {
      scene3DRef?.zoomOut?.();
      return;
    }
    store.zoomOut();
  }

  function handleToolbarResetView(): void {
    if (viewMode === "3d") {
      scene3DRef?.resetView?.();
      return;
    }
    store.resetView();
  }

  function handleGenerateFromWizard(input: FloorPlanWizardInput): void {
    if (!home) {
      store.showStatusMessage("Wait for the floor plan to load before running the wizard.", "warning");
      return;
    }
    store.generateDefaultPlanFromWizard(input);
    wizardOpen = false;
  }

  async function handleSave() {
    // Snapshot the payload AND the live references behind it before
    // awaiting the server. If the user mutates or creates nodes during
    // the round-trip, those stay dirty instead of being silently
    // baselined as "saved" by a post-await `markSaved()` call.
    const captured = store.prepareSave();
    try {
      await saveMutation.mutateAsync({
        homeId,
        floorLevel: currentFloor,
        nodes: captured.nodes,
        deletedNodeIds: captured.deletedNodeIds,
      });
      store.markSaved(captured.sentRefs, captured.sentDeletedIds);
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

  function setTool(tool: EditorTool) {
    // Keyboard shortcut path — use the side-effecting variant so the
    // user gets a toast if parents need to be created or a reason is
    // required (matches clicking the toolbar button).
    if (!store.tryActivateTool(tool)) return;
    store.activeTool = tool;
  }

  function isTextEntryTarget(target: EventTarget | null): boolean {
    if (!(target instanceof Element)) return false;
    const tag = target.tagName;
    if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT") return true;
    if (target instanceof HTMLElement && target.isContentEditable) return true;
    return false;
  }

  function handleKeyDown(e: KeyboardEvent) {
    if (e.isComposing) return;
    // Guard against focus being on a form element, including portalled
    // inputs inside shadow DOM (bits-ui dialogs, select popovers), where
    // `e.target` resolves to the shadow host rather than the input. Falling
    // back to `document.activeElement` catches those cases so bare keys like
    // `z`/`l`/`b`/`y` don't silently mutate the editor.
    if (isTextEntryTarget(e.target) || isTextEntryTarget(document.activeElement)) return;
    if (wizardOpen) return;
    const hasModifier = e.metaKey || e.ctrlKey || e.altKey;

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
    } else if (!hasModifier && e.key === "c") {
      store.selectionToolMode = "click";
      setTool("select");
    } else if (!hasModifier && e.key === "m") {
      store.selectionToolMode = "marquee";
      setTool("select");
    } else if (!hasModifier && (e.key === "v" || e.key === "1")) {
      setTool("select");
    } else if (!hasModifier && (e.key === "h" || e.key === "2")) {
      setTool("pan");
    } else if (!hasModifier && (e.key === "w" || e.key === "3")) {
      setTool("wall");
    } else if (!hasModifier && (e.key === "e" || e.key === "8")) {
      setTool("fence");
    } else if (!hasModifier && (e.key === "r" || e.key === "4")) {
      setTool("room");
    } else if (!hasModifier && (e.key === "q" || e.key === "9")) {
      setTool("zone");
    } else if (!hasModifier && e.key === "u") {
      setTool("site");
    } else if (!hasModifier && e.key === "b") {
      setTool("building");
    } else if (!hasModifier && e.key === "l") {
      setTool("level");
    } else if (!hasModifier && e.key === "j") {
      setTool("slab");
    } else if (!hasModifier && e.key === "y") {
      setTool("ceiling");
    } else if (!hasModifier && e.key === "o") {
      setTool("roof");
    } else if (!hasModifier && e.key === "p") {
      setTool("roof-segment");
    } else if (!hasModifier && e.key === "x") {
      setTool("stair");
    } else if (!hasModifier && (e.key === "d" || e.key === "5")) {
      setTool("door");
    } else if (!hasModifier && (e.key === "g" || e.key === "6")) {
      setTool("window");
    } else if (!hasModifier && (e.key === "f" || e.key === "7")) {
      setTool("furniture");
    } else if (!hasModifier && (e.key === "i" || e.key === "0")) {
      setTool("item");
    } else if (!hasModifier && e.key === "n") {
      setTool("scan");
    } else if (!hasModifier && e.key === "t") {
      setTool("guide");
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
    zoomPercent={viewMode === "3d" ? scene3DZoomPercent : undefined}
    onzoomin={handleToolbarZoomIn}
    onzoomout={handleToolbarZoomOut}
    onresetview={handleToolbarResetView}
    onviewmodechange={(mode) => (viewMode = mode)}
    onopenwizard={() => (wizardOpen = true)}
  />

  <FloorPlanDefaultWizard
    open={wizardOpen}
    hasExistingNodes={store.nodeList.length > 0}
    oncancel={() => (wizardOpen = false)}
    ongenerate={handleGenerateFromWizard}
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

  <!--
    Live region for editor status messages. Off-screen but announced by
    screen readers when `store.statusMessage` changes — covers blocked
    tool activations, auto-detect results, "ground level can't be
    deleted", etc. Visually hidden (the toast-style surface is rendered
    elsewhere); this is the a11y channel.
  -->
  <div role="status" aria-live="polite" aria-atomic="true" class="sr-only">
    {store.statusMessage ?? ""}
  </div>

  <!-- Canvas + Properties -->
  <div class="flex flex-1 overflow-hidden">
    <div class="flex-1">
      {#if viewMode === "3d" && Scene3D}
        <Scene3D {store} bind:this={scene3DRef} bind:zoomPercent={scene3DZoomPercent} />
      {:else}
        <FloorPlanCanvas {store} />
      {/if}
    </div>
    {#if viewMode === "2d"}
      <div class="flex w-80 flex-col border-l bg-white dark:bg-zinc-900">
        <HierarchyPanel {store} />
        <div class="min-h-0 flex-1 overflow-y-auto">
          <PropertiesPanel {store} />
        </div>
      </div>
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
