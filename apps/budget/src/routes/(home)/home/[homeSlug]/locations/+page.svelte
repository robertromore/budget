<script lang="ts">
  import { page } from "$app/stores";
  import { Button } from "$lib/components/ui/button";
  import * as Card from "$lib/components/ui/card";
  import { createQuery, createMutation } from "@tanstack/svelte-query";
  import { rpc } from "$lib/query";
  import { Plus, MapPin, ChevronRight, FolderOpen } from "@lucide/svelte";

  const homeSlug = $derived($page.params.homeSlug);
  const homeQuery = createQuery(rpc.homes.getHomeBySlug(homeSlug).options());
  const home = $derived($homeQuery.data);
  const homeId = $derived(home?.id ?? 0);

  const treeQuery = createQuery(() => ({
    ...rpc.homeLocations.getHomeLocationTree(homeId).options(),
    enabled: !!home,
  }));
  const createMut = createMutation(rpc.homeLocations.createHomeLocation.options());

  const tree = $derived($treeQuery.data ?? []);

  let showCreateForm = $state(false);
  let newLocationName = $state("");
  let newLocationType = $state("room");
  let newLocationParentId = $state<number | null>(null);

  async function handleCreate() {
    if (!newLocationName.trim()) return;
    await $createMut.mutateAsync({
      homeId,
      name: newLocationName.trim(),
      locationType: newLocationType,
      parentId: newLocationParentId,
    });
    newLocationName = "";
    newLocationType = "room";
    newLocationParentId = null;
    showCreateForm = false;
  }
</script>

{#snippet locationNode(node: any, depth: number)}
  <div class="border-b last:border-b-0" style="padding-left: {depth * 1.5}rem">
    <div class="flex items-center gap-2 px-4 py-3">
      {#if node.children?.length > 0}
        <ChevronRight class="text-muted-foreground h-4 w-4" />
      {:else}
        <FolderOpen class="text-muted-foreground h-4 w-4" />
      {/if}
      <span class="text-sm font-medium">{node.name}</span>
      {#if node.locationType && node.locationType !== "other"}
        <span class="bg-secondary text-secondary-foreground rounded-full px-2 py-0.5 text-xs">
          {node.locationType}
        </span>
      {/if}
      {#if node.description}
        <span class="text-muted-foreground text-xs">{node.description}</span>
      {/if}
    </div>
    {#if node.children?.length > 0}
      {#each node.children as child}
        {@render locationNode(child, depth + 1)}
      {/each}
    {/if}
  </div>
{/snippet}

<div class="p-6">
  <div class="mb-6 flex items-center justify-between">
    <h1 class="text-2xl font-bold">Locations</h1>
    <Button onclick={() => (showCreateForm = !showCreateForm)}>
      <Plus class="mr-2 h-4 w-4" />
      Add Location
    </Button>
  </div>

  {#if showCreateForm}
    <Card.Root class="mb-6">
      <Card.Content class="pt-6">
        <form onsubmit={handleCreate} class="flex items-end gap-4">
          <div class="flex-1">
            <label for="loc-name" class="text-sm font-medium">Name</label>
            <input
              id="loc-name"
              type="text"
              bind:value={newLocationName}
              placeholder="Kitchen, Garage, etc."
              class="border-input bg-background mt-1 w-full rounded-md border px-3 py-2 text-sm"
              required
            />
          </div>
          <div>
            <label for="loc-type" class="text-sm font-medium">Type</label>
            <select
              id="loc-type"
              bind:value={newLocationType}
              class="border-input bg-background mt-1 rounded-md border px-3 py-2 text-sm"
            >
              <option value="room">Room</option>
              <option value="area">Area</option>
              <option value="container">Container</option>
              <option value="shelf">Shelf</option>
              <option value="drawer">Drawer</option>
              <option value="closet">Closet</option>
              <option value="garage">Garage</option>
              <option value="shed">Shed</option>
              <option value="attic">Attic</option>
              <option value="basement">Basement</option>
              <option value="other">Other</option>
            </select>
          </div>
          <Button type="submit" disabled={!newLocationName.trim()}>Create</Button>
          <Button variant="outline" type="button" onclick={() => (showCreateForm = false)}>
            Cancel
          </Button>
        </form>
      </Card.Content>
    </Card.Root>
  {/if}

  {#if tree.length === 0}
    <Card.Root class="p-12 text-center">
      <div class="flex flex-col items-center gap-4">
        <MapPin class="text-muted-foreground h-12 w-12" />
        <div>
          <h3 class="text-lg font-semibold">No locations yet</h3>
          <p class="text-muted-foreground text-sm">
            Add locations like rooms, shelves, and drawers to organize your items.
          </p>
        </div>
      </div>
    </Card.Root>
  {:else}
    <Card.Root>
      {#each tree as node}
        {@render locationNode(node, 0)}
      {/each}
    </Card.Root>
  {/if}
</div>
