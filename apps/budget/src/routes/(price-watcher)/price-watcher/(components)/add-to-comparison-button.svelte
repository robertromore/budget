<script lang="ts">
  /**
   * Popover button that toggles a product's membership in one or more
   * comparison-kind lists. Mirrors the `product-lists.svelte` pattern
   * used for generic collections, but filtered to `kind = "comparison"`
   * and with an inline "+ New comparison…" affordance so the user
   * doesn't have to leave the page to create one.
   *
   * Saves go through the existing `addToList` / `removeFromList` /
   * `createComparison` query-layer mutations — no bespoke server code.
   */
  import { Button } from "$lib/components/ui/button";
  import { Input } from "$lib/components/ui/input";
  import * as Popover from "$lib/components/ui/popover";
  import {
    getComparisons,
    getProductLists,
    addToList,
    removeFromList,
    createComparison,
  } from "$lib/query/price-watcher";
  import Scale from "@lucide/svelte/icons/scale";
  import Check from "@lucide/svelte/icons/check";
  import Plus from "@lucide/svelte/icons/plus";

  let {
    productId,
    label = "Compare",
  }: { productId: number; label?: string } = $props();

  // `getProductLists` returns BOTH kinds; we only need the subset whose
  // id is also in `comparisons`. That's simpler than a dedicated
  // `getProductComparisons` endpoint and keeps cache keys unified.
  const productListsQuery = $derived(getProductLists(productId).options());
  const productLists = $derived(productListsQuery.data ?? []);

  const comparisonsQuery = $derived(getComparisons().options());
  const comparisons = $derived(comparisonsQuery.data ?? []);

  const addMut = addToList.options();
  const removeMut = removeFromList.options();
  const createMut = createComparison.options();

  let popoverOpen = $state(false);
  let creatingNew = $state(false);
  let newName = $state("");

  // Only count membership in comparison-kind lists; plain collections
  // are invisible to this button.
  const comparisonIds = $derived(new Set(comparisons.map((c) => c.id)));
  const memberIds = $derived(
    new Set(
      productLists
        .filter((list) => comparisonIds.has(list.id))
        .map((list) => list.id)
    )
  );

  async function handleToggle(listId: number): Promise<void> {
    if (memberIds.has(listId)) {
      await removeMut.mutateAsync({ listId, productId });
    } else {
      await addMut.mutateAsync({ listId, productId });
    }
  }

  async function handleCreateAndAdd(): Promise<void> {
    const name = newName.trim();
    if (!name) return;
    const created = await createMut.mutateAsync({ name });
    await addMut.mutateAsync({ listId: created.id, productId });
    newName = "";
    creatingNew = false;
  }
</script>

<Popover.Root bind:open={popoverOpen}>
  <Popover.Trigger>
    {#snippet child({ props })}
      <Button
        {...props}
        variant="outline"
        size="sm"
        class="gap-1"
        aria-label="Add to comparison"
      >
        <Scale class="h-3.5 w-3.5" />
        <span class="text-xs">{label}</span>
        {#if memberIds.size > 0}
          <span
            class="bg-primary text-primary-foreground ml-1 inline-flex h-4 min-w-4 items-center justify-center rounded-full px-1 text-[10px] font-medium"
          >
            {memberIds.size}
          </span>
        {/if}
      </Button>
    {/snippet}
  </Popover.Trigger>
  <Popover.Content class="w-64 p-2" align="start">
    <p class="text-muted-foreground px-2 pb-1 text-[10px] font-medium uppercase tracking-wide">
      Comparisons
    </p>

    {#if comparisons.length === 0 && !creatingNew}
      <p class="text-muted-foreground px-2 py-3 text-center text-xs">
        No comparisons yet.
      </p>
    {:else}
      <div class="max-h-60 space-y-0.5 overflow-y-auto">
        {#each comparisons as comparison (comparison.id)}
          {@const isMember = memberIds.has(comparison.id)}
          <button
            type="button"
            class="hover:bg-accent flex w-full items-center justify-between gap-2 rounded px-2 py-1.5 text-left text-sm transition-colors"
            onclick={() => handleToggle(comparison.id)}
          >
            <span class="truncate">{comparison.name}</span>
            {#if isMember}
              <Check class="text-primary h-4 w-4 shrink-0" />
            {/if}
          </button>
        {/each}
      </div>
    {/if}

    <div class="mt-1 border-t pt-1">
      {#if creatingNew}
        <form
          class="flex items-center gap-1 p-1"
          onsubmit={(event) => {
            event.preventDefault();
            void handleCreateAndAdd();
          }}
        >
          <Input
            type="text"
            class="h-7 text-xs"
            placeholder="Comparison name"
            bind:value={newName}
            autofocus
          />
          <Button type="submit" size="sm" class="h-7 px-2" disabled={!newName.trim()}>
            Add
          </Button>
        </form>
      {:else}
        <button
          type="button"
          class="text-muted-foreground hover:text-foreground hover:bg-accent flex w-full items-center gap-2 rounded px-2 py-1.5 text-left text-xs transition-colors"
          onclick={() => {
            creatingNew = true;
          }}
        >
          <Plus class="h-3.5 w-3.5" />
          New comparison…
        </button>
      {/if}
    </div>
  </Popover.Content>
</Popover.Root>
