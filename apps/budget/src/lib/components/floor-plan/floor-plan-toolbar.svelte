<script lang="ts">
  import type { Component } from "svelte";
  import type { IconProps } from "@lucide/svelte";
  import type {
    FloorPlanStore,
    EditorTool,
    LevelDisplayMode,
  } from "$lib/stores/floor-plan.svelte";
  import { floorPlanToolbarLayout } from "$lib/stores/floor-plan-toolbar-layout.svelte";
  import * as Popover from "$lib/components/ui/popover";
  import * as Tooltip from "$lib/components/ui/tooltip";
  import TooltipButton from "./tooltip-button.svelte";
  import {
    MousePointer2,
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
    ChevronDown,
    // Distinct per-tool icons — avoid the previous Square/Minus/Sofa
    // collisions that made nine different tools look identical.
    Fence,
    Triangle,
    MoveUpRight,
    LassoSelect,
    LandPlot,
    Building2,
    RectangleHorizontal,
    RectangleVertical,
    ChevronsUp,
    House,
    StepForward,
    Package,
    ScanLine,
    Ruler,
    WandSparkles,
  } from "@lucide/svelte";

  type IconComponent = Component<IconProps>;
  type Tool = { id: EditorTool; icon: IconComponent; label: string };
  type ToolGroup = { id: string; label: string; tools: Tool[] };

  let {
    store,
    onsave,
    viewMode = "2d",
    onviewmodechange,
    onzoomin,
    onzoomout,
    onresetview,
    zoomPercent,
    onopenwizard,
  }: {
    store: FloorPlanStore;
    onsave: () => void;
    viewMode?: "2d" | "3d";
    onviewmodechange?: (mode: "2d" | "3d") => void;
    onzoomin?: () => void;
    onzoomout?: () => void;
    onresetview?: () => void;
    zoomPercent?: number;
    onopenwizard?: () => void;
  } = $props();

  /**
   * Tools grouped by conceptual family. The first tool in each group is
   * the fallback "representative" — whichever tool gets rendered on the
   * main toolbar row in `grouped` layout mode until the user picks a
   * different one from the popover (see `representativeFor`).
   *
   * The expanded layout renders every tool inline with dividers between
   * groups; the grouped layout renders one button per group with a
   * chevron-triggered Popover revealing the rest.
   */
  const toolGroups: ToolGroup[] = [
    {
      id: "navigate",
      label: "Navigate",
      tools: [
        { id: "select", icon: MousePointer2, label: "Select" },
        { id: "pan", icon: Hand, label: "Pan" },
      ],
    },
    {
      id: "segments",
      label: "Segments",
      tools: [
        { id: "wall", icon: Minus, label: "Wall" },
        { id: "fence", icon: Fence, label: "Fence" },
      ],
    },
    {
      id: "structural-segments",
      label: "Structural Segments",
      tools: [
        { id: "roof-segment", icon: Triangle, label: "Roof Segment" },
        { id: "stair-segment", icon: MoveUpRight, label: "Stair Segment" },
      ],
    },
    {
      id: "spaces",
      label: "Spaces",
      tools: [
        { id: "room", icon: Square, label: "Room" },
        { id: "zone", icon: LassoSelect, label: "Zone" },
      ],
    },
    {
      id: "hierarchy",
      label: "Hierarchy",
      tools: [
        { id: "building", icon: Building2, label: "Building" },
        { id: "site", icon: LandPlot, label: "Site" },
        { id: "level", icon: Layers2, label: "Level" },
      ],
    },
    {
      id: "structural-surfaces",
      label: "Structural Surfaces",
      tools: [
        { id: "slab", icon: RectangleHorizontal, label: "Slab" },
        { id: "ceiling", icon: ChevronsUp, label: "Ceiling" },
        { id: "roof", icon: House, label: "Roof" },
        { id: "stair", icon: StepForward, label: "Stair" },
      ],
    },
    {
      id: "openings",
      label: "Openings",
      tools: [
        { id: "door", icon: DoorOpen, label: "Door" },
        { id: "window", icon: RectangleVertical, label: "Window" },
      ],
    },
    {
      id: "content",
      label: "Content",
      tools: [
        { id: "furniture", icon: Sofa, label: "Furniture" },
        { id: "item", icon: Package, label: "Item" },
      ],
    },
    {
      id: "references",
      label: "References",
      tools: [
        { id: "scan", icon: ScanLine, label: "Scan" },
        { id: "guide", icon: Ruler, label: "Guide" },
      ],
    },
  ];

  /**
   * For a group, decide which tool to show on the main toolbar:
   *   1. The currently-active tool, if it lives in this group — keeps
   *      the UI in sync with the user's live state.
   *   2. Otherwise, the user's last-promoted representative (persisted).
   *   3. Otherwise, the first tool (group default).
   */
  function representativeFor(group: ToolGroup): Tool {
    const activeInGroup = group.tools.find((t) => t.id === store.activeTool);
    if (activeInGroup) return activeInGroup;
    const promotedId = floorPlanToolbarLayout.representativeFor(group.id);
    const promoted = promotedId
      ? group.tools.find((t) => t.id === promotedId)
      : undefined;
    return promoted ?? group.tools[0];
  }

  function groupContainsActive(group: ToolGroup): boolean {
    return group.tools.some((t) => t.id === store.activeTool);
  }

  /**
   * Tool selection from within a group. Activates the tool if valid and
   * promotes it to the group's representative so it stays visible on the
   * main row after the popover closes.
   */
  function selectToolInGroup(group: ToolGroup, toolId: EditorTool): void {
    // Toolbar click path — `tryActivateTool` auto-creates missing
    // parents (when the setting is on) and shows a toast. Pure-predicate
    // `canActivateTool` is reserved for the button's disabled state.
    if (!store.tryActivateTool(toolId)) return;
    store.activeTool = toolId;
    floorPlanToolbarLayout.promoteTool(group.id, toolId);
  }
  const levelDisplayModes: { id: LevelDisplayMode; label: string }[] = [
    { id: "stacked", label: "Stacked" },
    { id: "exploded", label: "Exploded" },
    { id: "solo", label: "Solo" },
    { id: "manual", label: "Manual" },
  ];

  function handleExplodeSpacingInput(value: string): void {
    const parsed = Number.parseFloat(value);
    if (!Number.isFinite(parsed)) return;
    store.setLevelExplodeSpacing(parsed);
  }

  function handleManualOffsetInput(value: string): void {
    if (!store.activeLevelId) return;
    const parsed = Number.parseFloat(value);
    if (!Number.isFinite(parsed)) return;
    store.setManualLevelOffset(store.activeLevelId, parsed);
  }

  function handleZoomIn(): void {
    if (onzoomin) {
      onzoomin();
      return;
    }
    store.zoomIn();
  }

  function handleZoomOut(): void {
    if (onzoomout) {
      onzoomout();
      return;
    }
    store.zoomOut();
  }

  function handleResetView(): void {
    if (onresetview) {
      onresetview();
      return;
    }
    store.resetView();
  }
</script>

<!--
  One `Tooltip.Provider` wraps the whole toolbar so every `TooltipButton`
  and inline `Tooltip.Root` below shares a single timing context. Without
  this they'd each need their own Provider, which also works but costs
  extra context lookups and makes the delay uneven across buttons.
-->
<Tooltip.Provider delayDuration={300} disableHoverableContent>
<div class="flex items-center gap-1 border-b bg-white px-3 py-2 dark:bg-zinc-900">
  <!--
    Tools. Two layout modes (user-pickable in Settings › Display):
      - grouped:  one split button per group (main = current
                  representative, chevron = popover with full group)
      - expanded: every tool inline with a visual divider between groups
  -->
  {#if floorPlanToolbarLayout.layout === "grouped"}
    <div class="flex items-center gap-1">
      {#each toolGroups as group (group.id)}
        {@const rep = representativeFor(group)}
        {@const isActive = groupContainsActive(group)}
        {#if group.tools.length === 1}
          <!-- Degenerate "group" with a single tool — no popover needed. -->
          <TooltipButton
            label={rep.label}
            class="rounded p-1.5 transition-colors {isActive
              ? 'bg-primary text-primary-foreground'
              : 'hover:bg-accent'}"
            onclick={() => selectToolInGroup(group, rep.id)}
          >
            <rep.icon class="h-4 w-4" />
          </TooltipButton>
        {:else}
          <div
            class="flex items-center rounded-md border p-0.5"
            role="group"
            aria-label={group.label}
          >
            <TooltipButton
              label={`${rep.label} (${group.label})`}
              ariaLabel={rep.label}
              class="rounded px-1.5 py-1 transition-colors {isActive
                ? 'bg-primary text-primary-foreground'
                : 'hover:bg-accent'}"
              onclick={() => selectToolInGroup(group, rep.id)}
            >
              <rep.icon class="h-4 w-4" />
            </TooltipButton>
            <Popover.Root>
              <Popover.Trigger
                class="text-muted-foreground hover:bg-accent ml-0.5 rounded px-0.5 py-1"
                aria-label={`${group.label}: more tools`}
              >
                <ChevronDown class="h-3 w-3" />
              </Popover.Trigger>
              <Popover.Content
                side="bottom"
                align="start"
                class="w-48 p-1"
              >
                <div class="text-muted-foreground px-2 py-1 text-[10px] font-medium uppercase tracking-wide">
                  {group.label}
                </div>
                {#each group.tools as tool (tool.id)}
                  <Popover.Close
                    class="hover:bg-accent flex w-full items-center gap-2 rounded px-2 py-1.5 text-left text-sm transition-colors {store.activeTool ===
                    tool.id
                      ? 'bg-primary/15 text-primary'
                      : ''}"
                    onclick={() => selectToolInGroup(group, tool.id)}
                  >
                    <tool.icon class="h-4 w-4" />
                    <span>{tool.label}</span>
                  </Popover.Close>
                {/each}
              </Popover.Content>
            </Popover.Root>
          </div>
        {/if}
      {/each}
    </div>
  {:else}
    <div class="flex items-center gap-0.5 rounded-md border p-0.5">
      {#each toolGroups as group, groupIndex (group.id)}
        {#if groupIndex > 0}
          <div class="bg-border mx-1 h-5 w-px" aria-hidden="true"></div>
        {/if}
        {#each group.tools as tool (tool.id)}
          <TooltipButton
            label={tool.label}
            class="rounded px-2 py-1.5 text-sm transition-colors {store.activeTool === tool.id
              ? 'bg-primary text-primary-foreground'
              : 'hover:bg-accent'}"
            onclick={() => selectToolInGroup(group, tool.id)}
          >
            <tool.icon class="h-4 w-4" />
          </TooltipButton>
        {/each}
      {/each}
    </div>
  {/if}

  <div class="bg-border mx-2 h-6 w-px"></div>

  <!-- Selection mode -->
  <div class="flex items-center gap-0.5 rounded-md border p-0.5">
    <TooltipButton
      label="Selection: Click"
      class="rounded px-2 py-1.5 text-xs font-medium transition-colors {store.selectionToolMode === 'click'
        ? 'bg-primary text-primary-foreground'
        : 'hover:bg-accent'}"
      onclick={() => (store.selectionToolMode = "click")}
    >
      Click
    </TooltipButton>
    <TooltipButton
      label="Selection: Marquee"
      class="rounded px-2 py-1.5 text-xs font-medium transition-colors {store.selectionToolMode === 'marquee'
        ? 'bg-primary text-primary-foreground'
        : 'hover:bg-accent'}"
      onclick={() => (store.selectionToolMode = "marquee")}
    >
      Marquee
    </TooltipButton>
  </div>

  <div class="bg-border mx-2 h-6 w-px"></div>

  <!-- Hierarchy auto-parent -->
  <TooltipButton
    label="Automatically create missing hierarchy parents for structural tools"
    ariaLabel="Toggle auto-create missing parents"
    ariaPressed={store.autoCreateMissingParents}
    class="rounded px-2 py-1.5 text-xs font-medium transition-colors {store.autoCreateMissingParents
      ? 'bg-accent'
      : 'hover:bg-accent'}"
    onclick={() => (store.autoCreateMissingParents = !store.autoCreateMissingParents)}
  >
    Auto Parent
  </TooltipButton>

  <TooltipButton
    label="Detect enclosed wall/fence loops and sync room/zone nodes"
    ariaLabel="Auto-detect spaces"
    class="rounded px-2 py-1.5 text-xs font-medium transition-colors hover:bg-accent"
    onclick={() => store.autoDetectSpacesAndZones()}
  >
    Auto Spaces
  </TooltipButton>

  <TooltipButton
    label="Open starter floor plan wizard"
    ariaLabel="Open floor plan setup wizard"
    class="rounded px-2 py-1.5 text-xs font-medium transition-colors hover:bg-accent"
    onclick={() => onopenwizard?.()}
  >
    <WandSparkles class="mr-1 inline h-3.5 w-3.5" />
    Wizard
  </TooltipButton>

  <div class="bg-border mx-2 h-6 w-px"></div>

  <!-- Undo/Redo -->
  <TooltipButton
    label="Undo"
    class="rounded p-1.5 hover:bg-accent disabled:opacity-30"
    disabled={!store.canUndo}
    onclick={() => store.undo()}
  >
    <Undo2 class="h-4 w-4" />
  </TooltipButton>
  <TooltipButton
    label="Redo"
    class="rounded p-1.5 hover:bg-accent disabled:opacity-30"
    disabled={!store.canRedo}
    onclick={() => store.redo()}
  >
    <Redo2 class="h-4 w-4" />
  </TooltipButton>

  <div class="bg-border mx-2 h-6 w-px"></div>

  <!-- Zoom -->
  <TooltipButton
    label="Zoom In"
    class="rounded p-1.5 hover:bg-accent"
    onclick={handleZoomIn}
  >
    <ZoomIn class="h-4 w-4" />
  </TooltipButton>
  <span class="text-muted-foreground min-w-12 text-center text-xs">
    {Math.round(zoomPercent ?? store.zoom * 100)}%
  </span>
  <TooltipButton
    label="Zoom Out"
    class="rounded p-1.5 hover:bg-accent"
    onclick={handleZoomOut}
  >
    <ZoomOut class="h-4 w-4" />
  </TooltipButton>
  <TooltipButton
    label="Reset View"
    class="rounded p-1.5 hover:bg-accent"
    onclick={handleResetView}
  >
    <Maximize class="h-4 w-4" />
  </TooltipButton>

  <div class="bg-border mx-2 h-6 w-px"></div>

  <!-- Grid toggle -->
  <TooltipButton
    label="Toggle Grid"
    ariaPressed={store.showGrid}
    class="rounded p-1.5 transition-colors {store.showGrid ? 'bg-accent' : 'hover:bg-accent'}"
    onclick={() => (store.showGrid = !store.showGrid)}
  >
    <Grid3x3 class="h-4 w-4" />
  </TooltipButton>

  <div class="bg-border mx-2 h-6 w-px"></div>

  {#if store.statusMessage}
    <span
      class="text-xs {store.statusMessageTone === 'warning'
        ? 'text-amber-700 dark:text-amber-300'
        : 'text-muted-foreground'}"
    >
      {store.statusMessage}
    </span>
    <div class="bg-border mx-2 h-6 w-px"></div>
  {/if}

  <!-- 2D/3D toggle -->
  <div class="flex items-center gap-0.5 rounded-md border p-0.5">
    <TooltipButton
      label="2D View"
      class="rounded px-2 py-1.5 text-xs font-medium transition-colors {viewMode === '2d'
        ? 'bg-primary text-primary-foreground'
        : 'hover:bg-accent'}"
      onclick={() => onviewmodechange?.("2d")}
    >
      <Layers2 class="h-4 w-4" />
    </TooltipButton>
    <TooltipButton
      label="3D View"
      class="rounded px-2 py-1.5 text-xs font-medium transition-colors {viewMode === '3d'
        ? 'bg-primary text-primary-foreground'
        : 'hover:bg-accent'}"
      onclick={() => onviewmodechange?.("3d")}
    >
      <Box class="h-4 w-4" />
    </TooltipButton>
  </div>

  {#if viewMode === "3d"}
    <div class="bg-border mx-2 h-6 w-px"></div>

    <div class="flex items-center gap-0.5 rounded-md border p-0.5">
      {#each levelDisplayModes as mode}
        <TooltipButton
          label={`3D Level Display: ${mode.label}`}
          ariaLabel={mode.label}
          class="rounded px-2 py-1.5 text-xs font-medium transition-colors {store.levelDisplayMode === mode.id
            ? 'bg-primary text-primary-foreground'
            : 'hover:bg-accent'}"
          onclick={() => store.setLevelDisplayMode(mode.id)}
        >
          {mode.label}
        </TooltipButton>
      {/each}
    </div>

    {#if store.levelDisplayMode === "exploded"}
      <label class="ml-2 flex items-center gap-2 text-xs">
        <span class="text-muted-foreground whitespace-nowrap">Explode</span>
        <input
          type="range"
          min="0"
          max="12"
          step="0.25"
          value={store.levelExplodeSpacing}
          oninput={(e) => handleExplodeSpacingInput((e.currentTarget as HTMLInputElement).value)}
        />
        <span class="text-muted-foreground min-w-8 text-right">{store.levelExplodeSpacing.toFixed(2)}</span>
      </label>
    {:else if store.levelDisplayMode === "manual"}
      <label class="ml-2 flex items-center gap-2 text-xs">
        <span class="text-muted-foreground whitespace-nowrap">Level Offset</span>
        <input
          type="range"
          min="-10"
          max="20"
          step="0.25"
          disabled={!store.activeLevelId}
          value={store.getManualLevelOffset(store.activeLevelId)}
          oninput={(e) => handleManualOffsetInput((e.currentTarget as HTMLInputElement).value)}
        />
        <span class="text-muted-foreground min-w-8 text-right">
          {store.getManualLevelOffset(store.activeLevelId).toFixed(2)}
        </span>
        <button
          class="rounded px-2 py-1 text-[11px] font-medium transition-colors hover:bg-accent disabled:opacity-40"
          disabled={
            !store.activeLevelId || store.getManualLevelOffset(store.activeLevelId) === 0
          }
          onclick={() =>
            store.activeLevelId && store.setManualLevelOffset(store.activeLevelId, 0)}
        >
          Reset
        </button>
      </label>
    {/if}
  {/if}

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
</Tooltip.Provider>
