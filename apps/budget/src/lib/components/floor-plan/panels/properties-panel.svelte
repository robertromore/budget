<script lang="ts">
  import type { FloorPlanStore } from "$lib/stores/floor-plan.svelte";
  import { Trash2 } from "@lucide/svelte";

  let { store }: { store: FloorPlanStore } = $props();

  const node = $derived(store.selectedNode);

  function handleUpdate(field: string, value: any) {
    if (!node) return;
    store.updateNode(node.id, { [field]: value });
  }
</script>

<div class="border-l bg-white p-4 dark:bg-zinc-900" style="width: 260px;">
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
        <label class="text-muted-foreground text-xs">Name</label>
        <input
          type="text"
          value={node.name ?? ""}
          oninput={(e) => handleUpdate("name", e.currentTarget.value || null)}
          class="border-input bg-background mt-1 w-full rounded border px-2 py-1 text-sm"
        />
      </div>

      <div class="grid grid-cols-2 gap-2">
        <div>
          <label class="text-muted-foreground text-xs">X</label>
          <input
            type="number"
            value={Math.round(node.posX)}
            onchange={(e) => handleUpdate("posX", Number(e.currentTarget.value))}
            class="border-input bg-background mt-1 w-full rounded border px-2 py-1 text-sm"
          />
        </div>
        <div>
          <label class="text-muted-foreground text-xs">Y</label>
          <input
            type="number"
            value={Math.round(node.posY)}
            onchange={(e) => handleUpdate("posY", Number(e.currentTarget.value))}
            class="border-input bg-background mt-1 w-full rounded border px-2 py-1 text-sm"
          />
        </div>
      </div>

      {#if node.nodeType !== "wall" && node.nodeType !== "annotation"}
        <div class="grid grid-cols-2 gap-2">
          <div>
            <label class="text-muted-foreground text-xs">Width</label>
            <input
              type="number"
              value={Math.round(node.width)}
              onchange={(e) => handleUpdate("width", Number(e.currentTarget.value))}
              class="border-input bg-background mt-1 w-full rounded border px-2 py-1 text-sm"
            />
          </div>
          <div>
            <label class="text-muted-foreground text-xs">Height</label>
            <input
              type="number"
              value={Math.round(node.height)}
              onchange={(e) => handleUpdate("height", Number(e.currentTarget.value))}
              class="border-input bg-background mt-1 w-full rounded border px-2 py-1 text-sm"
            />
          </div>
        </div>

        <div>
          <label class="text-muted-foreground text-xs">Rotation</label>
          <input
            type="number"
            value={Math.round(node.rotation)}
            step="15"
            onchange={(e) => handleUpdate("rotation", Number(e.currentTarget.value))}
            class="border-input bg-background mt-1 w-full rounded border px-2 py-1 text-sm"
          />
        </div>
      {/if}

      <div>
        <label class="text-muted-foreground text-xs">Color</label>
        <input
          type="color"
          value={node.color ?? "#374151"}
          oninput={(e) => handleUpdate("color", e.currentTarget.value)}
          class="mt-1 h-8 w-full cursor-pointer rounded border"
        />
      </div>

      <div>
        <label class="text-muted-foreground text-xs">Opacity</label>
        <input
          type="range"
          min="0"
          max="1"
          step="0.1"
          value={node.opacity}
          oninput={(e) => handleUpdate("opacity", Number(e.currentTarget.value))}
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
