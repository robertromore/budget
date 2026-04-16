<script lang="ts">
  import { Button } from "$lib/components/ui/button";
  import * as Card from "$lib/components/ui/card";
  import { createQuery, createMutation } from "@tanstack/svelte-query";
  import { rpc } from "$lib/query";
  import { Plus, Package, Search } from "@lucide/svelte";
  import type { PageData } from "./$types";

  let { data }: { data: PageData } = $props();

  let searchTerm = $state("");
  let showCreateForm = $state(false);
  let newItemName = $state("");
  let newItemDescription = $state("");

  const itemsQuery = createQuery(
    rpc.items
      .listHomeItems(data.home.id, { search: searchTerm || undefined })
      .options()
  );

  const createMut = createMutation(rpc.homeItems.createHomeItem.options());

  const items = $derived($itemsQuery.data ?? data.items ?? []);

  async function handleCreate() {
    if (!newItemName.trim()) return;
    await $createMut.mutateAsync({
      homeId: data.home.id,
      name: newItemName.trim(),
      description: newItemDescription.trim() || null,
    });
    newItemName = "";
    newItemDescription = "";
    showCreateForm = false;
  }
</script>

<div class="p-6">
  <div class="mb-6 flex items-center justify-between">
    <h1 class="text-2xl font-bold">Items</h1>
    <Button onclick={() => (showCreateForm = !showCreateForm)}>
      <Plus class="mr-2 h-4 w-4" />
      Add Item
    </Button>
  </div>

  <div class="mb-4">
    <div class="relative">
      <Search class="text-muted-foreground absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2" />
      <input
        type="text"
        bind:value={searchTerm}
        placeholder="Search items..."
        class="border-input bg-background w-full rounded-md border py-2 pl-10 pr-4 text-sm"
      />
    </div>
  </div>

  {#if showCreateForm}
    <Card.Root class="mb-6">
      <Card.Content class="pt-6">
        <form onsubmit={handleCreate} class="flex flex-col gap-4">
          <div>
            <label for="item-name" class="text-sm font-medium">Name</label>
            <input
              id="item-name"
              type="text"
              bind:value={newItemName}
              placeholder="Item name"
              class="border-input bg-background mt-1 w-full rounded-md border px-3 py-2 text-sm"
              required
            />
          </div>
          <div>
            <label for="item-desc" class="text-sm font-medium">Description</label>
            <input
              id="item-desc"
              type="text"
              bind:value={newItemDescription}
              placeholder="Optional description"
              class="border-input bg-background mt-1 w-full rounded-md border px-3 py-2 text-sm"
            />
          </div>
          <div class="flex justify-end gap-2">
            <Button variant="outline" type="button" onclick={() => (showCreateForm = false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={!newItemName.trim()}>Create</Button>
          </div>
        </form>
      </Card.Content>
    </Card.Root>
  {/if}

  {#if items.length === 0}
    <Card.Root class="p-12 text-center">
      <div class="flex flex-col items-center gap-4">
        <Package class="text-muted-foreground h-12 w-12" />
        <div>
          <h3 class="text-lg font-semibold">No items yet</h3>
          <p class="text-muted-foreground text-sm">
            Add items to track your home inventory.
          </p>
        </div>
      </div>
    </Card.Root>
  {:else}
    <div class="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
      {#each items as item}
        <a href="/home/{data.home.slug}/items/{item.cuid}">
          <Card.Root class="transition-shadow hover:shadow-md">
            <Card.Header class="pb-2">
              <Card.Title class="text-sm">{item.name}</Card.Title>
              {#if item.description}
                <Card.Description class="line-clamp-2 text-xs">
                  {item.description}
                </Card.Description>
              {/if}
            </Card.Header>
            <Card.Content>
              <div class="text-muted-foreground flex items-center gap-3 text-xs">
                {#if item.manufacturer}
                  <span>{item.manufacturer}</span>
                {/if}
                {#if item.currentValue}
                  <span class="font-medium">
                    ${item.currentValue.toLocaleString("en-US", {
                      minimumFractionDigits: 2,
                    })}
                  </span>
                {/if}
                {#if item.quantity > 1}
                  <span>Qty: {item.quantity}</span>
                {/if}
              </div>
            </Card.Content>
          </Card.Root>
        </a>
      {/each}
    </div>
  {/if}
</div>
