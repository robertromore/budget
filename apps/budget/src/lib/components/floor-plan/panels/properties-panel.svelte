<script lang="ts">
  import type { FloorPlanNodeType } from "$core/schema/home/home-floor-plan-nodes";
  import type { FloorPlanStore } from "$lib/stores/floor-plan.svelte";
  import {
    getFloorPlanAssetProperties,
    patchFloorPlanNodeProperties,
  } from "$lib/utils/floor-plan-node-properties";
  import { Trash2 } from "@lucide/svelte";
  import { onDestroy } from "svelte";

  let { store }: { store: FloorPlanStore } = $props();

  const node = $derived(store.selectedNode);
  const ALLOWED_PARENT_TYPES: Partial<Record<FloorPlanNodeType, FloorPlanNodeType[]>> = {
    building: ["site"],
    level: ["building"],
    slab: ["level"],
    ceiling: ["level"],
    roof: ["level"],
    stair: ["level"],
    door: ["wall"],
    window: ["wall"],
    "roof-segment": ["roof"],
    "stair-segment": ["stair"],
  };
  const REQUIRED_PARENT_TYPES = new Set<FloorPlanNodeType>([
    "level",
    "slab",
    "ceiling",
    "roof",
    "stair",
    "roof-segment",
    "stair-segment",
  ]);
  const SEGMENT_NODE_TYPES = new Set<FloorPlanNodeType>([
    "wall",
    "fence",
    "roof-segment",
    "stair-segment",
  ]);
  const parentIsRequired = $derived(node ? REQUIRED_PARENT_TYPES.has(node.nodeType) : false);
  const isSegmentNode = $derived(node ? SEGMENT_NODE_TYPES.has(node.nodeType) : false);
  const parentCandidates = $derived.by(() => {
    if (!node) return [];
    const allowedParentTypes = ALLOWED_PARENT_TYPES[node.nodeType];
    return store.nodeList.filter((candidate) => {
      if (candidate.id === node.id) return false;
      if (!allowedParentTypes) return true;
      return allowedParentTypes.includes(candidate.nodeType);
    });
  });
  const isAssetNode = $derived(node ? node.nodeType === "scan" || node.nodeType === "guide" : false);
  const assetProps = $derived.by(() =>
    node && isAssetNode ? getFloorPlanAssetProperties(node) : null
  );

  type CommitMode = "immediate" | "debounced";
  let pendingCommitTimer: ReturnType<typeof setTimeout> | null = null;

  function scheduleCommit(delayMs = 250) {
    if (pendingCommitTimer !== null) clearTimeout(pendingCommitTimer);
    pendingCommitTimer = setTimeout(() => {
      pendingCommitTimer = null;
      store.commitChange();
    }, delayMs);
  }

  function commitNow() {
    if (pendingCommitTimer !== null) {
      clearTimeout(pendingCommitTimer);
      pendingCommitTimer = null;
    }
    store.commitChange();
  }

  function handleUpdate(field: string, value: any, mode: CommitMode = "debounced") {
    if (!node) return;
    store.updateNode(node.id, { [field]: value });
    if (mode === "immediate") {
      commitNow();
    } else {
      scheduleCommit();
    }
  }

  /**
   * rAF-throttled variant for continuously-firing inputs (color pickers,
   * range sliders). `oninput` fires on every pixel of drag; routing each
   * event through `updateNode` invalidates every derived node collection,
   * which cascades into re-renders for every wall / room / furniture mesh.
   * Coalesce to at most one commit per animation frame so drag feels
   * smooth while still landing a debounced history entry at the end.
   */
  let rafHandle: number | null = null;
  let pendingField: string | null = null;
  let pendingValue: unknown = null;
  function handleUpdateThrottled(field: string, value: unknown) {
    pendingField = field;
    pendingValue = value;
    if (rafHandle !== null) return;
    rafHandle = requestAnimationFrame(() => {
      rafHandle = null;
      const f = pendingField;
      const v = pendingValue;
      pendingField = null;
      pendingValue = null;
      if (f !== null) handleUpdate(f, v);
    });
  }

  function updateNodePropertiesPatch(
    patch: Record<string, unknown>,
    mode: CommitMode = "debounced"
  ): void {
    if (!node) return;
    const next = patchFloorPlanNodeProperties(node.properties, patch);
    handleUpdate("properties", next, mode);
  }

  function parseNumericInput(value: string): number | null {
    const parsed = Number.parseFloat(value);
    if (!Number.isFinite(parsed)) return null;
    return parsed;
  }

  function getAssetAspectRatio(): number | null {
    if (!node || !assetProps) return null;
    const naturalWidth = assetProps.naturalWidth;
    const naturalHeight = assetProps.naturalHeight;
    if (naturalWidth && naturalHeight && naturalWidth > 0 && naturalHeight > 0) {
      return naturalWidth / naturalHeight;
    }
    if (node.width > 0 && node.height > 0) {
      return node.width / node.height;
    }
    return null;
  }

  function handleDimensionUpdate(axis: "width" | "height", value: string): void {
    if (!node) return;
    const parsed = parseNumericInput(value);
    if (parsed === null) return;
    const clamped = Math.max(1, parsed);

    if (!isAssetNode || !assetProps?.lockAspectRatio) {
      handleUpdate(axis, clamped, "immediate");
      return;
    }

    const ratio = getAssetAspectRatio();
    if (!ratio || ratio <= 0) {
      handleUpdate(axis, clamped, "immediate");
      return;
    }

    const updates =
      axis === "width"
        ? { width: clamped, height: Math.max(1, clamped / ratio) }
        : { width: Math.max(1, clamped * ratio), height: clamped };
    store.updateNode(node.id, updates);
    commitNow();
  }

  function readFileAsDataUrl(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        const result = reader.result;
        if (typeof result === "string") {
          resolve(result);
          return;
        }
        reject(new Error("Failed to read file as data URL"));
      };
      reader.onerror = () => reject(reader.error ?? new Error("Unable to read file"));
      reader.readAsDataURL(file);
    });
  }

  function readImageDimensions(dataUrl: string): Promise<{ width: number; height: number }> {
    return new Promise((resolve, reject) => {
      const image = new Image();
      image.onload = () => {
        resolve({
          width: image.naturalWidth,
          height: image.naturalHeight,
        });
      };
      image.onerror = () => reject(new Error("Unable to read image dimensions"));
      image.src = dataUrl;
    });
  }

  /**
   * Maximum raw image size we'll embed as a base64 data URL. The server
   * caps the entire `properties` JSON payload at 8 KB (see
   * `MAX_PROPERTIES_BYTES` in the tRPC route). Base64 inflates by ~4/3
   * plus the `data:image/…;base64,` prefix and the JSON wrapper; 5 KB
   * raw lands comfortably under the envelope. Anything bigger needs to
   * be hosted elsewhere and pasted as a URL — we surface that guidance
   * in the rejection toast rather than letting the save silently fail
   * with a generic Zod error.
   */
  const MAX_EMBEDDED_ASSET_BYTES = 5_000;

  async function handleAssetFileChange(event: Event): Promise<void> {
    const input = event.currentTarget as HTMLInputElement;
    if (!node || !isAssetNode) {
      input.value = "";
      return;
    }
    const file = input.files?.[0];
    if (!file) return;

    if (file.size > MAX_EMBEDDED_ASSET_BYTES) {
      const kb = Math.ceil(file.size / 1024);
      store.showStatusMessage(
        `Image is ${kb} KB; embedded assets must be under ${Math.floor(
          MAX_EMBEDDED_ASSET_BYTES / 1024
        )} KB. Host the image elsewhere and paste its URL in the field above.`,
        "warning",
        6000
      );
      input.value = "";
      return;
    }

    try {
      const dataUrl = await readFileAsDataUrl(file);
      const dims = await readImageDimensions(dataUrl);
      const patch = {
        assetUrl: dataUrl,
        naturalWidth: dims.width,
        naturalHeight: dims.height,
        lockAspectRatio: assetProps?.lockAspectRatio ?? true,
      };
      const ratio = dims.width > 0 && dims.height > 0 ? dims.width / dims.height : null;
      const updates: Record<string, number> = {};
      if (ratio && ratio > 0 && node.width > 0 && (assetProps?.lockAspectRatio ?? true)) {
        updates.height = Math.max(1, node.width / ratio);
      } else if (node.width <= 0 || node.height <= 0) {
        const maxDimension = store.gridSize * 40;
        const scale = Math.min(1, maxDimension / Math.max(dims.width, dims.height));
        updates.width = Math.max(store.gridSize * 6, dims.width * scale);
        updates.height = Math.max(store.gridSize * 6, dims.height * scale);
      }

      if (Object.keys(updates).length > 0) {
        store.updateNode(node.id, updates);
      }
      const nextProperties = patchFloorPlanNodeProperties(node.properties, patch);
      store.updateNode(node.id, { properties: nextProperties });
      commitNow();
    } catch {
      store.showStatusMessage("Could not load the selected image file.");
    } finally {
      input.value = "";
    }
  }

  onDestroy(() => {
    // Flush any rAF-queued throttled update so the final value is applied
    // before the debounced-commit flush below lands a history entry.
    if (rafHandle !== null) {
      cancelAnimationFrame(rafHandle);
      rafHandle = null;
      if (pendingField !== null) {
        handleUpdate(pendingField, pendingValue);
        pendingField = null;
        pendingValue = null;
      }
    }
    // If the panel unmounts with a queued debounced commit (e.g. route change),
    // flush it so the change remains undoable.
    if (pendingCommitTimer !== null) {
      clearTimeout(pendingCommitTimer);
      pendingCommitTimer = null;
      store.commitChange();
    }
  });
</script>

<div class="bg-white p-4 dark:bg-zinc-900">
  {#if node}
    <div class="mb-4 flex items-center justify-between">
      <h3 class="text-sm font-semibold capitalize">{node.nodeType}</h3>
      <button
        class="rounded p-1 text-red-500 hover:bg-red-50 dark:hover:bg-red-950"
        onclick={() => store.deleteNode(node.id)}
      >
        <Trash2 class="h-4 w-4" />
      </button>
    </div>

    <div class="space-y-3">
      <div>
        <label for="fp-name" class="text-muted-foreground text-xs">Name</label>
        <input
          id="fp-name"
          type="text"
          value={node.name ?? ""}
          oninput={(e) => handleUpdate("name", e.currentTarget.value || null)}
          class="border-input bg-background mt-1 w-full rounded border px-2 py-1 text-sm"
        />
      </div>

      {#if isAssetNode}
        <div class="space-y-2 rounded border p-2">
          <p class="text-muted-foreground text-xs font-medium">
            {node.nodeType === "scan" ? "Scan Asset" : "Guide Asset"}
          </p>

          <div>
            <label for="fp-asset-url" class="text-muted-foreground text-xs">Image URL / Data URL</label>
            <input
              id="fp-asset-url"
              type="text"
              value={assetProps?.assetUrl ?? ""}
              oninput={(e) => updateNodePropertiesPatch({ assetUrl: e.currentTarget.value || null })}
              class="border-input bg-background mt-1 w-full rounded border px-2 py-1 text-sm"
              placeholder="https://... or paste data:image/..."
            />
          </div>

          <div class="flex items-center gap-2">
            <label class="inline-flex cursor-pointer items-center gap-2 rounded border px-2 py-1 text-xs">
              <input
                type="file"
                accept="image/*"
                class="hidden"
                onchange={handleAssetFileChange}
              />
              Upload
            </label>
            <button
              type="button"
              class="rounded border px-2 py-1 text-xs hover:bg-accent"
              onclick={() =>
                updateNodePropertiesPatch(
                  { assetUrl: null, naturalWidth: null, naturalHeight: null },
                  "immediate"
                )}
            >
              Clear
            </button>
          </div>

          <label class="inline-flex items-center gap-2 text-xs">
            <input
              type="checkbox"
              checked={assetProps?.lockAspectRatio ?? true}
              onchange={(e) =>
                updateNodePropertiesPatch(
                  { lockAspectRatio: e.currentTarget.checked },
                  "immediate"
                )}
            />
            Lock aspect ratio
          </label>
        </div>
      {/if}

      {#if node.nodeType !== "site"}
        <div>
          <label for="fp-parent" class="text-muted-foreground text-xs">Parent</label>
          <select
            id="fp-parent"
            value={node.parentId ?? ""}
            onchange={(e) => handleUpdate("parentId", e.currentTarget.value || null, "immediate")}
            class="border-input bg-background mt-1 w-full rounded border px-2 py-1 text-sm"
          >
            {#if !parentIsRequired}
              <option value="">None</option>
            {:else}
              <option value="" disabled>Select parent</option>
            {/if}
            {#each parentCandidates as candidate}
              <option value={candidate.id}>
                {candidate.nodeType}{candidate.name ? ` - ${candidate.name}` : ` - ${candidate.id}`}
              </option>
            {/each}
          </select>
          {#if parentIsRequired && !node.parentId}
            <p class="text-destructive mt-1 text-xs">This node type requires a parent before save.</p>
          {/if}
        </div>
      {/if}

      <div class="grid grid-cols-2 gap-2">
        <div>
          <label for="fp-x" class="text-muted-foreground text-xs">X</label>
          <input
            id="fp-x"
            type="number"
            value={Math.round(node.posX)}
            onchange={(e) => handleUpdate("posX", Number(e.currentTarget.value), "immediate")}
            class="border-input bg-background mt-1 w-full rounded border px-2 py-1 text-sm"
          />
        </div>
        <div>
          <label for="fp-y" class="text-muted-foreground text-xs">Y</label>
          <input
            id="fp-y"
            type="number"
            value={Math.round(node.posY)}
            onchange={(e) => handleUpdate("posY", Number(e.currentTarget.value), "immediate")}
            class="border-input bg-background mt-1 w-full rounded border px-2 py-1 text-sm"
          />
        </div>
      </div>

      {#if isSegmentNode}
        <div class="grid grid-cols-2 gap-2">
          <div>
            <label for="fp-x2" class="text-muted-foreground text-xs">X2</label>
            <input
              id="fp-x2"
              type="number"
              value={Math.round(node.x2 ?? node.posX)}
              onchange={(e) => handleUpdate("x2", Number(e.currentTarget.value), "immediate")}
              class="border-input bg-background mt-1 w-full rounded border px-2 py-1 text-sm"
            />
          </div>
          <div>
            <label for="fp-y2" class="text-muted-foreground text-xs">Y2</label>
            <input
              id="fp-y2"
              type="number"
              value={Math.round(node.y2 ?? node.posY)}
              onchange={(e) => handleUpdate("y2", Number(e.currentTarget.value), "immediate")}
              class="border-input bg-background mt-1 w-full rounded border px-2 py-1 text-sm"
            />
          </div>
        </div>

        <div class="grid grid-cols-2 gap-2">
          <div>
            <label for="fp-segment-height" class="text-muted-foreground text-xs">Height (m)</label>
            <input
              id="fp-segment-height"
              type="number"
              min="0.01"
              step="0.01"
              value={Number((node.wallHeight ?? 2.5).toFixed(2))}
              onchange={(e) =>
                handleUpdate(
                  "wallHeight",
                  Math.max(0.01, Number(e.currentTarget.value)),
                  "immediate"
                )}
              class="border-input bg-background mt-1 w-full rounded border px-2 py-1 text-sm"
            />
          </div>
          <div>
            <label for="fp-segment-thickness" class="text-muted-foreground text-xs">Thickness (m)</label>
            <input
              id="fp-segment-thickness"
              type="number"
              min="0.01"
              step="0.01"
              value={Number((node.thickness ?? 0.15).toFixed(2))}
              onchange={(e) =>
                handleUpdate(
                  "thickness",
                  Math.max(0.01, Number(e.currentTarget.value)),
                  "immediate"
                )}
              class="border-input bg-background mt-1 w-full rounded border px-2 py-1 text-sm"
            />
          </div>
        </div>
      {/if}

      {#if !isSegmentNode && node.nodeType !== "annotation"}
        <div class="grid grid-cols-2 gap-2">
          <div>
            <label for="fp-width" class="text-muted-foreground text-xs">Width</label>
            <input
              id="fp-width"
              type="number"
              value={Math.round(node.width)}
              onchange={(e) => handleDimensionUpdate("width", e.currentTarget.value)}
              class="border-input bg-background mt-1 w-full rounded border px-2 py-1 text-sm"
            />
          </div>
          <div>
            <label for="fp-height" class="text-muted-foreground text-xs">Height</label>
            <input
              id="fp-height"
              type="number"
              value={Math.round(node.height)}
              onchange={(e) => handleDimensionUpdate("height", e.currentTarget.value)}
              class="border-input bg-background mt-1 w-full rounded border px-2 py-1 text-sm"
            />
          </div>
        </div>

        <div>
          <label for="fp-rotation" class="text-muted-foreground text-xs">Rotation</label>
          <input
            id="fp-rotation"
            type="number"
            value={Math.round(node.rotation)}
            step="15"
            onchange={(e) => handleUpdate("rotation", Number(e.currentTarget.value), "immediate")}
            class="border-input bg-background mt-1 w-full rounded border px-2 py-1 text-sm"
          />
        </div>
      {/if}

      <div>
        <label for="fp-color" class="text-muted-foreground text-xs">Color</label>
        <input
          id="fp-color"
          type="color"
          value={node.color ?? "#374151"}
          oninput={(e) => handleUpdateThrottled("color", e.currentTarget.value)}
          class="mt-1 h-8 w-full cursor-pointer rounded border"
        />
      </div>

      <div>
        <label for="fp-opacity" class="text-muted-foreground text-xs">Opacity</label>
        <input
          id="fp-opacity"
          type="range"
          min="0"
          max="1"
          step="0.1"
          value={node.opacity}
          oninput={(e) => handleUpdateThrottled("opacity", Number(e.currentTarget.value))}
          class="mt-1 w-full"
        />
      </div>
    </div>
  {:else if store.selectedNodeIds.size > 1}
    <p class="text-muted-foreground text-sm">{store.selectedNodeIds.size} nodes selected</p>
    <button
      class="mt-2 rounded bg-red-500 px-3 py-1 text-sm text-white hover:bg-red-600"
      onclick={() => store.deleteSelected()}
    >
      Delete Selected
    </button>
  {:else}
    <p class="text-muted-foreground text-sm">Select an element to edit its properties.</p>
  {/if}
</div>
