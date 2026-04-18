<script lang="ts">
import { Badge } from '$lib/components/ui/badge';
import { Button } from '$lib/components/ui/button';
import * as Empty from '$lib/components/ui/empty';
import * as Popover from '$lib/components/ui/popover';
import {
  listProducts,
  listAlerts,
  listRetailers,
  getAllTags,
  getAllLists,
  getListProducts,
  getProductIdsByTags,
} from '$lib/query/price-watcher';
import { cn } from '$lib/utils';
import Grid3x3 from '@lucide/svelte/icons/grid-3x3';
import List from '@lucide/svelte/icons/list';
import ListIcon from '@lucide/svelte/icons/list';
import Package from '@lucide/svelte/icons/package';
import Plus from '@lucide/svelte/icons/plus';
import Tags from '@lucide/svelte/icons/tags';
import Filter from '@lucide/svelte/icons/filter';
import X from '@lucide/svelte/icons/x';
import Check from '@lucide/svelte/icons/check';
import Settings2 from '@lucide/svelte/icons/settings-2';
import ChevronLeft from '@lucide/svelte/icons/chevron-left';
import ChevronRight from '@lucide/svelte/icons/chevron-right';
import ProductCard from '../(components)/product-card.svelte';
import ProductDataTable from '../(components)/product-data-table.svelte';
import AddProductDialog from '../(components)/add-product-dialog.svelte';
import ManageListsDialog from '../(components)/manage-lists-dialog.svelte';

const productsQuery = listProducts().options();
const alertsQuery = listAlerts().options();
const retailersQuery = listRetailers().options();
const tagsQuery = getAllTags().options();
const listsQuery = getAllLists().options();

const products = $derived(productsQuery.data ?? []);
const alerts = $derived(alertsQuery.data ?? []);
const retailerMap = $derived(new Map((retailersQuery.data ?? []).map((r) => [r.id, r])));
const allTags = $derived(tagsQuery.data ?? []);
const allLists = $derived(listsQuery.data ?? []);
const isLoading = $derived(productsQuery.isLoading);

// Filters
let selectedTags = $state<Set<string>>(new Set());
let selectedListId = $state<number | null>(null);
let tagPopoverOpen = $state(false);
let listPopoverOpen = $state(false);
let manageListsOpen = $state(false);

// List products query (only when a list is selected)
const listProductsQuery = $derived(
  selectedListId ? getListProducts(selectedListId).options() : undefined
);
const listProductIds = $derived(
  listProductsQuery?.data
    ? new Set(listProductsQuery.data.map((p) => p.id))
    : null
);

// Tag-filtered product IDs
const selectedTagsArray = $derived([...selectedTags]);
const tagProductIdsQuery = $derived(
  selectedTagsArray.length > 0
    ? getProductIdsByTags(selectedTagsArray).options()
    : undefined
);
const tagProductIds = $derived(
  tagProductIdsQuery?.data ? new Set(tagProductIdsQuery.data) : null
);

// Filter products
const filteredProducts = $derived.by(() => {
  let result = products;

  // Filter by list
  if (listProductIds) {
    result = result.filter((p) => listProductIds.has(p.id));
  }

  // Filter by tags
  if (tagProductIds) {
    result = result.filter((p) => tagProductIds.has(p.id));
  }

  return result;
});

const hasActiveFilters = $derived(selectedTags.size > 0 || selectedListId !== null);

function toggleTag(tag: string) {
  const next = new Set(selectedTags);
  if (next.has(tag)) {
    next.delete(tag);
  } else {
    next.add(tag);
  }
  selectedTags = next;
}

function clearFilters() {
  selectedTags = new Set();
  selectedListId = null;
}

// Count alerts per product
const alertCountByProduct = $derived.by(() => {
  const counts = new Map<number, number>();
  for (const alert of alerts) {
    if (alert.enabled) {
      counts.set(alert.productId, (counts.get(alert.productId) ?? 0) + 1);
    }
  }
  return counts;
});

let addDialogOpen = $state(false);
let viewMode = $state<'grid' | 'table'>('table');

// Grid pagination
const GRID_PAGE_SIZE = 12;
let gridPage = $state(0);

// Reset grid page when filters change
$effect(() => {
  filteredProducts;
  gridPage = 0;
});

const gridTotalPages = $derived(Math.ceil(filteredProducts.length / GRID_PAGE_SIZE));
const gridPageProducts = $derived(
  filteredProducts.slice(gridPage * GRID_PAGE_SIZE, (gridPage + 1) * GRID_PAGE_SIZE)
);
</script>

<svelte:head>
  <title>Products - Price Watcher</title>
  <meta name="description" content="Track product prices across retailers" />
</svelte:head>

<div class="space-y-6">
  <div class="flex items-center justify-between">
    <div>
      <h1 class="text-2xl font-bold tracking-tight">Products</h1>
      <p class="text-muted-foreground text-sm">
        {filteredProducts.length}{hasActiveFilters ? ` of ${products.length}` : ''} products tracked
      </p>
    </div>
    <div class="flex items-center gap-2">
      {#if products.length > 0}
        <div class="flex rounded-md border">
          <button
            class={cn(
              'flex h-8 w-8 items-center justify-center rounded-l-md transition-colors',
              viewMode === 'grid' ? 'bg-muted' : 'hover:bg-muted/50'
            )}
            onclick={() => (viewMode = 'grid')}
            aria-label="Grid view">
            <Grid3x3 class="h-4 w-4" />
          </button>
          <button
            class={cn(
              'flex h-8 w-8 items-center justify-center rounded-r-md border-l transition-colors',
              viewMode === 'table' ? 'bg-muted' : 'hover:bg-muted/50'
            )}
            onclick={() => (viewMode = 'table')}
            aria-label="Table view">
            <List class="h-4 w-4" />
          </button>
        </div>
      {/if}
      <Button variant="outline" size="sm" onclick={() => (manageListsOpen = true)}>
        <Settings2 class="mr-2 h-4 w-4" />
        Lists
      </Button>
      <Button onclick={() => (addDialogOpen = true)}>
        <Plus class="mr-2 h-4 w-4" />
        Add Product
      </Button>
    </div>
  </div>

  <!-- Filter Bar -->
  {#if allTags.length > 0 || allLists.length > 0}
    <div class="flex flex-wrap items-center gap-2">
      <Filter class="text-muted-foreground h-4 w-4" />

      <!-- Tag Filter -->
      {#if allTags.length > 0}
        <Popover.Root bind:open={tagPopoverOpen}>
          <Popover.Trigger>
            {#snippet child({ props })}
              <button
                {...props}
                class={cn(
                  'inline-flex h-8 items-center gap-1.5 rounded-md border px-3 text-xs transition-colors',
                  selectedTags.size > 0
                    ? 'border-primary/50 bg-primary/5 text-foreground'
                    : 'text-muted-foreground hover:text-foreground hover:bg-muted'
                )}>
                <Tags class="h-3.5 w-3.5" />
                Tags
                {#if selectedTags.size > 0}
                  <Badge variant="secondary" class="ml-0.5 h-5 px-1.5 text-[10px]">
                    {selectedTags.size}
                  </Badge>
                {/if}
              </button>
            {/snippet}
          </Popover.Trigger>
          <Popover.Content class="w-56 p-2" align="start">
            <div class="space-y-0.5">
              {#each allTags as tagItem (tagItem.tag)}
                <button
                  class="hover:bg-muted flex w-full items-center justify-between rounded-md px-2 py-1.5 text-left text-sm transition-colors"
                  onclick={() => toggleTag(tagItem.tag)}>
                  <span class="flex items-center gap-2">
                    <span>{tagItem.tag}</span>
                    <span class="text-muted-foreground text-xs">({tagItem.count})</span>
                  </span>
                  {#if selectedTags.has(tagItem.tag)}
                    <Check class="text-primary h-4 w-4 shrink-0" />
                  {/if}
                </button>
              {/each}
            </div>
          </Popover.Content>
        </Popover.Root>
      {/if}

      <!-- List Filter -->
      {#if allLists.length > 0}
        <Popover.Root bind:open={listPopoverOpen}>
          <Popover.Trigger>
            {#snippet child({ props })}
              <button
                {...props}
                class={cn(
                  'inline-flex h-8 items-center gap-1.5 rounded-md border px-3 text-xs transition-colors',
                  selectedListId !== null
                    ? 'border-primary/50 bg-primary/5 text-foreground'
                    : 'text-muted-foreground hover:text-foreground hover:bg-muted'
                )}>
                <ListIcon class="h-3.5 w-3.5" />
                {selectedListId !== null
                  ? allLists.find((l) => l.id === selectedListId)?.name ?? 'List'
                  : 'List'}
              </button>
            {/snippet}
          </Popover.Trigger>
          <Popover.Content class="w-56 p-2" align="start">
            <div class="space-y-0.5">
              {#each allLists as list (list.id)}
                <button
                  class="hover:bg-muted flex w-full items-center justify-between rounded-md px-2 py-1.5 text-left text-sm transition-colors"
                  onclick={() => {
                    selectedListId = selectedListId === list.id ? null : list.id;
                    listPopoverOpen = false;
                  }}>
                  <span class="flex items-center gap-2">
                    <span>{list.name}</span>
                    <span class="text-muted-foreground text-xs">({list.itemCount})</span>
                  </span>
                  {#if selectedListId === list.id}
                    <Check class="text-primary h-4 w-4 shrink-0" />
                  {/if}
                </button>
              {/each}
            </div>
          </Popover.Content>
        </Popover.Root>
      {/if}

      <!-- Active filter badges + clear -->
      {#if hasActiveFilters}
        {#each [...selectedTags] as tag (tag)}
          <Badge variant="secondary" class="gap-1 pr-1">
            {tag}
            <button
              class="hover:bg-muted-foreground/20 rounded-full p-0.5"
              onclick={() => toggleTag(tag)}>
              <X class="h-3 w-3" />
            </button>
          </Badge>
        {/each}
        <button
          class="text-muted-foreground hover:text-foreground text-xs underline-offset-4 hover:underline"
          onclick={clearFilters}>
          Clear all
        </button>
      {/if}
    </div>
  {/if}

  {#if isLoading}
    <div class="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {#each Array(6) as _}
        <div class="rounded-lg border p-6">
          <div class="bg-muted h-4 w-3/4 animate-pulse rounded"></div>
          <div class="bg-muted mt-2 h-3 w-1/2 animate-pulse rounded"></div>
          <div class="bg-muted mt-4 h-8 w-1/3 animate-pulse rounded"></div>
        </div>
      {/each}
    </div>
  {:else if products.length === 0}
    <Empty.Empty>
      <Empty.EmptyMedia variant="icon">
        <Package class="size-6" />
      </Empty.EmptyMedia>
      <Empty.EmptyHeader>
        <Empty.EmptyTitle>No Products Yet</Empty.EmptyTitle>
        <Empty.EmptyDescription>
          Add a product URL to start tracking prices. You'll get notified when prices drop.
        </Empty.EmptyDescription>
      </Empty.EmptyHeader>
      <Empty.EmptyContent>
        <Button onclick={() => (addDialogOpen = true)}>
          <Plus class="mr-2 h-4 w-4" />
          Add Your First Product
        </Button>
      </Empty.EmptyContent>
    </Empty.Empty>
  {:else if filteredProducts.length === 0}
    <div class="text-muted-foreground rounded-lg border border-dashed p-8 text-center text-sm">
      No products match the current filters.
      <button class="text-primary ml-1 underline underline-offset-4" onclick={clearFilters}>
        Clear filters
      </button>
    </div>
  {:else if viewMode === 'grid'}
    <div class="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {#each gridPageProducts as product (product.id)}
        <ProductCard {product} retailer={product.retailerId ? retailerMap.get(product.retailerId) : undefined} alertCount={alertCountByProduct.get(product.id) ?? 0} />
      {/each}
    </div>
    {#if gridTotalPages > 1}
      <div class="flex items-center justify-between pt-2">
        <span class="text-muted-foreground text-sm">
          {gridPage * GRID_PAGE_SIZE + 1}–{Math.min((gridPage + 1) * GRID_PAGE_SIZE, filteredProducts.length)} of {filteredProducts.length}
        </span>
        <div class="flex items-center gap-1">
          <Button
            variant="outline"
            size="sm"
            class="h-8 w-8 p-0"
            disabled={gridPage === 0}
            onclick={() => (gridPage--)}>
            <ChevronLeft class="h-4 w-4" />
          </Button>
          <span class="text-muted-foreground px-2 text-sm">
            {gridPage + 1} / {gridTotalPages}
          </span>
          <Button
            variant="outline"
            size="sm"
            class="h-8 w-8 p-0"
            disabled={gridPage >= gridTotalPages - 1}
            onclick={() => (gridPage++)}>
            <ChevronRight class="h-4 w-4" />
          </Button>
        </div>
      </div>
    {/if}
  {:else}
    <ProductDataTable products={filteredProducts} />
  {/if}
</div>

<AddProductDialog bind:open={addDialogOpen} />
<ManageListsDialog bind:open={manageListsOpen} />
