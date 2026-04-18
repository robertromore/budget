<script lang="ts">
  /**
   * Index of saved comparison-kind lists. Each card links to
   * `/compare?list=<slug>` for the full comparison view.
   *
   * We deliberately reuse the generic list query (`getComparisons` is a
   * thin alias over `getAllLists({ kind: "comparison" })`) and load
   * product thumbnails lazily per-card — a comparisons index with a
   * dozen entries should only fire a dozen small queries instead of
   * one mega-query with joins.
   */
  import { goto } from '$app/navigation';
  import { Button } from '$lib/components/ui/button';
  import * as Card from '$lib/components/ui/card';
  import * as Dialog from '$lib/components/ui/dialog';
  import { Input } from '$lib/components/ui/input';
  import {
    getComparisons,
    getListProducts,
    createComparison,
    deleteList,
    updateList,
  } from '$lib/query/price-watcher';
  import ProductImage from '../(components)/product-image.svelte';
  import Scale from '@lucide/svelte/icons/scale';
  import Plus from '@lucide/svelte/icons/plus';
  import Pencil from '@lucide/svelte/icons/pencil';
  import Trash2 from '@lucide/svelte/icons/trash-2';

  const comparisonsQuery = $derived(getComparisons().options());
  const comparisons = $derived(comparisonsQuery.data ?? []);

  const createMut = createComparison.options();
  const deleteMut = deleteList.options();
  const renameMut = updateList.options();

  let createDialogOpen = $state(false);
  let newName = $state('');
  let newDescription = $state('');

  let renameDialogOpen = $state(false);
  let renameId = $state<number | null>(null);
  let renameName = $state('');
  let renameDescription = $state('');

  async function handleCreate() {
    const name = newName.trim();
    if (!name) return;
    const created = await createMut.mutateAsync({
      name,
      description: newDescription.trim() || null,
    });
    createDialogOpen = false;
    newName = '';
    newDescription = '';
    goto(`/price-watcher/compare?list=${created.slug}`);
  }

  function openRename(id: number, name: string, description: string | null) {
    renameId = id;
    renameName = name;
    renameDescription = description ?? '';
    renameDialogOpen = true;
  }

  async function handleRename() {
    if (renameId === null) return;
    const name = renameName.trim();
    if (!name) return;
    await renameMut.mutateAsync({
      id: renameId,
      data: { name, description: renameDescription.trim() || null },
    });
    renameDialogOpen = false;
    renameId = null;
    renameName = '';
    renameDescription = '';
  }

  async function handleDelete(id: number, name: string) {
    if (!confirm(`Delete the comparison "${name}"? This cannot be undone.`)) {
      return;
    }
    await deleteMut.mutateAsync({ id });
  }
</script>

<svelte:head>
  <title>Comparisons - Price Watcher</title>
</svelte:head>

<div class="space-y-6">
  <div class="flex flex-wrap items-center justify-between gap-4">
    <div>
      <h1 class="text-2xl font-bold tracking-tight">Comparisons</h1>
      <p class="text-muted-foreground text-sm">
        Named shortlists of products you're deciding between.
      </p>
    </div>
    <Button onclick={() => (createDialogOpen = true)}>
      <Plus class="mr-2 h-4 w-4" />
      New comparison
    </Button>
  </div>

  {#if comparisons.length === 0}
    <div class="rounded-md border border-dashed p-10 text-center">
      <Scale class="text-muted-foreground mx-auto h-10 w-10" />
      <h2 class="mt-3 text-lg font-medium">No comparisons yet</h2>
      <p class="text-muted-foreground mx-auto mt-1 max-w-md text-sm">
        Comparisons are saved side-by-side views of 2–6 products —
        useful when you're deciding between a handful of options.
      </p>
      <Button class="mt-4" onclick={() => (createDialogOpen = true)}>
        <Plus class="mr-2 h-4 w-4" />
        Create your first comparison
      </Button>
    </div>
  {:else}
    <div class="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
      {#each comparisons as comparison (comparison.id)}
        {@const productsQuery = getListProducts(comparison.id).options()}
        {@const products = productsQuery.data ?? []}
        <Card.Root class="transition-shadow hover:shadow-md">
          <Card.Content class="p-4">
            <a
              href="/price-watcher/compare?list={comparison.slug}"
              class="block"
            >
              <div class="flex items-start justify-between gap-2">
                <div class="min-w-0 flex-1">
                  <h3 class="truncate font-medium" title={comparison.name}>
                    {comparison.name}
                  </h3>
                  <p class="text-muted-foreground text-xs">
                    {comparison.itemCount} product{comparison.itemCount === 1 ? '' : 's'}
                  </p>
                </div>
              </div>
              {#if comparison.description}
                <p class="text-muted-foreground mt-1 line-clamp-2 text-xs">
                  {comparison.description}
                </p>
              {/if}
              {#if products.length > 0}
                <!-- Up-to-six thumbnails in a row; overflow clipped
                     visually by the container, not by JS truncation,
                     so pixel-perfect layout stays even if `itemCount`
                     drifts from the loaded products. -->
                <div class="mt-3 flex -space-x-2">
                  {#each products.slice(0, 6) as product (product.id)}
                    <div class="ring-background rounded-md ring-2">
                      <ProductImage
                        imageUrl={product.imageUrl}
                        alt={product.name}
                        size="sm"
                      />
                    </div>
                  {/each}
                </div>
              {/if}
            </a>
            <div class="mt-3 flex items-center justify-end gap-1">
              <Button
                variant="ghost"
                size="sm"
                class="h-7 gap-1 px-2 text-xs"
                onclick={() =>
                  openRename(comparison.id, comparison.name, comparison.description)}
              >
                <Pencil class="h-3 w-3" />
                Rename
              </Button>
              <Button
                variant="ghost"
                size="sm"
                class="text-destructive hover:text-destructive h-7 gap-1 px-2 text-xs"
                onclick={() => handleDelete(comparison.id, comparison.name)}
              >
                <Trash2 class="h-3 w-3" />
                Delete
              </Button>
            </div>
          </Card.Content>
        </Card.Root>
      {/each}
    </div>
  {/if}
</div>

<!-- Create -->
<Dialog.Root bind:open={createDialogOpen}>
  <Dialog.Content class="sm:max-w-md">
    <Dialog.Header>
      <Dialog.Title>New comparison</Dialog.Title>
      <Dialog.Description>
        Add products from the product list, or directly on the compare page.
      </Dialog.Description>
    </Dialog.Header>
    <form
      class="space-y-4"
      onsubmit={(event) => {
        event.preventDefault();
        void handleCreate();
      }}
    >
      <div class="space-y-1">
        <label for="new-name" class="text-sm font-medium">Name</label>
        <Input
          id="new-name"
          placeholder="e.g. Vacuum shortlist"
          bind:value={newName}
          maxlength={100}
          autofocus
          required
        />
      </div>
      <div class="space-y-1">
        <label for="new-description" class="text-sm font-medium">
          Description <span class="text-muted-foreground text-xs">(optional)</span>
        </label>
        <Input
          id="new-description"
          placeholder="What decision are you making?"
          bind:value={newDescription}
          maxlength={500}
        />
      </div>
      <Dialog.Footer>
        <Button type="button" variant="outline" onclick={() => (createDialogOpen = false)}>
          Cancel
        </Button>
        <Button type="submit" disabled={!newName.trim()}>Create</Button>
      </Dialog.Footer>
    </form>
  </Dialog.Content>
</Dialog.Root>

<!-- Rename -->
<Dialog.Root bind:open={renameDialogOpen}>
  <Dialog.Content class="sm:max-w-md">
    <Dialog.Header>
      <Dialog.Title>Rename comparison</Dialog.Title>
    </Dialog.Header>
    <form
      class="space-y-4"
      onsubmit={(event) => {
        event.preventDefault();
        void handleRename();
      }}
    >
      <div class="space-y-1">
        <label for="rename-name" class="text-sm font-medium">Name</label>
        <Input
          id="rename-name"
          bind:value={renameName}
          maxlength={100}
          autofocus
          required
        />
      </div>
      <div class="space-y-1">
        <label for="rename-description" class="text-sm font-medium">
          Description <span class="text-muted-foreground text-xs">(optional)</span>
        </label>
        <Input
          id="rename-description"
          bind:value={renameDescription}
          maxlength={500}
        />
      </div>
      <Dialog.Footer>
        <Button type="button" variant="outline" onclick={() => (renameDialogOpen = false)}>
          Cancel
        </Button>
        <Button type="submit" disabled={!renameName.trim()}>Save</Button>
      </Dialog.Footer>
    </form>
  </Dialog.Content>
</Dialog.Root>
