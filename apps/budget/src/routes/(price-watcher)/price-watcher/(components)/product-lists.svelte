<script lang="ts">
import { Badge } from '$lib/components/ui/badge';
import { Button } from '$lib/components/ui/button';
import * as Popover from '$lib/components/ui/popover';
import {
  getProductLists,
  getAllLists,
  addToList,
  removeFromList,
} from '$lib/query/price-watcher';
import ListIcon from '@lucide/svelte/icons/list';
import Plus from '@lucide/svelte/icons/plus';
import X from '@lucide/svelte/icons/x';
import Check from '@lucide/svelte/icons/check';

interface Props {
  productId: number;
}

let { productId }: Props = $props();

const productListsQuery = $derived(getProductLists(productId).options());
const productLists = $derived(productListsQuery.data ?? []);

const allListsQuery = $derived(getAllLists().options());
const allLists = $derived(allListsQuery.data ?? []);

const addMut = addToList.options();
const removeMut = removeFromList.options();

let popoverOpen = $state(false);

const memberListIds = $derived(new Set(productLists.map((l) => l.id)));

async function handleToggleList(listId: number) {
  if (memberListIds.has(listId)) {
    await removeMut.mutateAsync({ listId, productId });
  } else {
    await addMut.mutateAsync({ listId, productId });
  }
}

async function handleRemoveFromList(listId: number) {
  await removeMut.mutateAsync({ listId, productId });
}
</script>

<div class="space-y-2">
  <div class="flex items-center gap-2">
    <ListIcon class="text-muted-foreground h-4 w-4" />
    <span class="text-sm font-medium">Lists</span>
  </div>
  <div class="flex flex-wrap items-center gap-1.5">
    {#each productLists as list (list.id)}
      <Badge variant="outline" class="gap-1 pr-1">
        {list.name}
        <button
          class="hover:bg-muted-foreground/20 rounded-full p-0.5 transition-colors"
          onclick={() => handleRemoveFromList(list.id)}
          aria-label="Remove from {list.name}">
          <X class="h-3 w-3" />
        </button>
      </Badge>
    {/each}
    <Popover.Root bind:open={popoverOpen}>
      <Popover.Trigger>
        {#snippet child({ props })}
          <button
            {...props}
            class="text-muted-foreground hover:text-foreground hover:bg-muted inline-flex h-6 items-center gap-1 rounded-md border border-dashed px-2 text-xs transition-colors">
            <Plus class="h-3 w-3" />
            Add to list
          </button>
        {/snippet}
      </Popover.Trigger>
      <Popover.Content class="w-56 p-2" align="start">
        {#if allLists.length === 0}
          <p class="text-muted-foreground px-2 py-3 text-center text-xs">
            No lists yet. Create one from the products page.
          </p>
        {:else}
          <div class="space-y-0.5">
            {#each allLists as list (list.id)}
              <button
                class="hover:bg-muted flex w-full items-center justify-between rounded-md px-2 py-1.5 text-left text-sm transition-colors"
                onclick={() => handleToggleList(list.id)}>
                <span class="truncate">{list.name}</span>
                {#if memberListIds.has(list.id)}
                  <Check class="text-success h-4 w-4 shrink-0" />
                {/if}
              </button>
            {/each}
          </div>
        {/if}
      </Popover.Content>
    </Popover.Root>
  </div>
</div>
