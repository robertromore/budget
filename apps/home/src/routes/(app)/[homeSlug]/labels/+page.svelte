<script lang="ts">
  import { Button } from "$ui/lib/components/ui/button";
  import * as Card from "$ui/lib/components/ui/card";
  import { createQuery, createMutation } from "@tanstack/svelte-query";
  import { rpc } from "$lib/query";
  import { Plus, Tags } from "@lucide/svelte";
  import type { PageData } from "./$types";

  let { data }: { data: PageData } = $props();

  const labelsQuery = createQuery(
    rpc.labels.listHomeLabelsWithCounts(data.home.id).options()
  );
  const createMut = createMutation(rpc.labels.createHomeLabel.options());

  const labels = $derived($labelsQuery.data ?? []);

  let showCreateForm = $state(false);
  let newLabelName = $state("");
  let newLabelColor = $state("#6366f1");

  async function handleCreate() {
    if (!newLabelName.trim()) return;
    await $createMut.mutateAsync({
      homeId: data.home.id,
      name: newLabelName.trim(),
      color: newLabelColor,
    });
    newLabelName = "";
    newLabelColor = "#6366f1";
    showCreateForm = false;
  }
</script>

<div class="p-6">
  <div class="mb-6 flex items-center justify-between">
    <h1 class="text-2xl font-bold">Labels</h1>
    <Button onclick={() => (showCreateForm = !showCreateForm)}>
      <Plus class="mr-2 h-4 w-4" />
      Add Label
    </Button>
  </div>

  {#if showCreateForm}
    <Card.Root class="mb-6">
      <Card.Content class="pt-6">
        <form onsubmit={handleCreate} class="flex items-end gap-4">
          <div class="flex-1">
            <label for="label-name" class="text-sm font-medium">Name</label>
            <input
              id="label-name"
              type="text"
              bind:value={newLabelName}
              placeholder="Label name"
              class="border-input bg-background mt-1 w-full rounded-md border px-3 py-2 text-sm"
              required
            />
          </div>
          <div>
            <label for="label-color" class="text-sm font-medium">Color</label>
            <input
              id="label-color"
              type="color"
              bind:value={newLabelColor}
              class="mt-1 h-10 w-16 cursor-pointer rounded-md border"
            />
          </div>
          <Button type="submit" disabled={!newLabelName.trim()}>Create</Button>
          <Button variant="outline" type="button" onclick={() => (showCreateForm = false)}>
            Cancel
          </Button>
        </form>
      </Card.Content>
    </Card.Root>
  {/if}

  {#if labels.length === 0}
    <Card.Root class="p-12 text-center">
      <div class="flex flex-col items-center gap-4">
        <Tags class="text-muted-foreground h-12 w-12" />
        <div>
          <h3 class="text-lg font-semibold">No labels yet</h3>
          <p class="text-muted-foreground text-sm">
            Create labels to categorize and tag your items.
          </p>
        </div>
      </div>
    </Card.Root>
  {:else}
    <div class="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
      {#each labels as label}
        <Card.Root>
          <Card.Content class="flex items-center justify-between py-4">
            <div class="flex items-center gap-3">
              {#if label.color}
                <div class="h-4 w-4 rounded-full" style="background-color: {label.color}"></div>
              {/if}
              <div>
                <p class="text-sm font-medium">{label.name}</p>
                {#if label.description}
                  <p class="text-muted-foreground text-xs">{label.description}</p>
                {/if}
              </div>
            </div>
            <span class="text-muted-foreground text-xs">
              {label.itemCount} {label.itemCount === 1 ? "item" : "items"}
            </span>
          </Card.Content>
        </Card.Root>
      {/each}
    </div>
  {/if}
</div>
