<script lang="ts">
  import Eye from "@lucide/svelte/icons/eye";
  import EyeOff from "@lucide/svelte/icons/eye-off";
  import Lock from "@lucide/svelte/icons/lock";
  import LockOpen from "@lucide/svelte/icons/lock-open";
  import type { FloorPlanNode } from "$core/schema/home/home-floor-plan-nodes";
  import type { FloorPlanStore } from "$lib/stores/floor-plan.svelte";

  let {
    store,
    node,
  }: {
    store: FloorPlanStore;
    node: FloorPlanNode;
  } = $props();

  const hiddenOwn = $derived(store.isNodeHiddenOwn(node.id));
  const hiddenInherited = $derived(store.isNodeHiddenInherited(node.id));
  const hiddenEffective = $derived(hiddenOwn || hiddenInherited);

  const lockedOwn = $derived(store.isNodeLockedOwn(node.id));
  const lockedInherited = $derived(store.isNodeLockedInherited(node.id));
  const lockedEffective = $derived(lockedOwn || lockedInherited);

  function toggleVisibility(event: MouseEvent): void {
    event.stopPropagation();
    store.toggleNodeVisibility(node.id);
  }

  function toggleLock(event: MouseEvent): void {
    event.stopPropagation();
    store.toggleNodeLock(node.id);
  }

  const visibilityTitle = $derived.by(() => {
    if (hiddenOwn) return "Show node";
    if (hiddenInherited) return "Hide node (currently hidden by parent)";
    return "Hide node";
  });

  const lockTitle = $derived.by(() => {
    if (lockedOwn) return "Unlock node";
    if (lockedInherited) return "Lock node (currently locked by parent)";
    return "Lock node";
  });
</script>

<div class="flex items-center gap-0.5" onclick={(event) => event.stopPropagation()}>
  <button
    class="text-muted-foreground hover:bg-accent rounded px-1 py-0.5 {hiddenInherited && !hiddenOwn
      ? 'opacity-70'
      : ''}"
    title={visibilityTitle}
    aria-label={visibilityTitle}
    onclick={toggleVisibility}
  >
    {#if hiddenEffective}
      <EyeOff class="size-3.5" />
    {:else}
      <Eye class="size-3.5" />
    {/if}
  </button>
  <button
    class="text-muted-foreground hover:bg-accent rounded px-1 py-0.5 {lockedInherited && !lockedOwn
      ? 'opacity-70'
      : ''}"
    title={lockTitle}
    aria-label={lockTitle}
    onclick={toggleLock}
  >
    {#if lockedEffective}
      <Lock class="size-3.5" />
    {:else}
      <LockOpen class="size-3.5" />
    {/if}
  </button>
</div>
