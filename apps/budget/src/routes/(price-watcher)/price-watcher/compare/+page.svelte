<script lang="ts">
import { untrack } from 'svelte';
import { page } from '$app/stores';
import { goto } from '$app/navigation';
import { Badge } from '$lib/components/ui/badge';
import { Button } from '$lib/components/ui/button';
import { Input } from '$lib/components/ui/input';
import * as Popover from '$lib/components/ui/popover';
import * as Dialog from '$lib/components/ui/dialog';
import { InteractiveLegend } from '$lib/components/layercake';
import {
  listProducts,
  getPriceHistory,
  listRetailers,
  getComparisons,
  getListProducts,
  createComparison,
  deleteList,
  removeFromList,
  setListItemNotes,
  addManyToList,
} from '$lib/query/price-watcher';
import { currencyFormatter } from '$lib/utils/formatters';
import { chartInteractions } from '$lib/states/ui/chart-interactions.svelte';
import type { PriceHistoryEntry } from '$core/schema/price-history';
import type { PriceProduct } from '$core/schema/price-products';
import PriceComparisonChart from '../(components)/price-comparison-chart.svelte';
import type { ComparisonSeries } from '../(components)/price-comparison-chart.svelte';
import ComparisonDetailRow from '../(components)/comparison-detail-row.svelte';
import type { ComparisonProduct } from '../(components)/comparison-detail-row.svelte';
import ComparisonSummary from '../(components)/comparison-summary.svelte';
import Plus from '@lucide/svelte/icons/plus';
import X from '@lucide/svelte/icons/x';
import Check from '@lucide/svelte/icons/check';
import Percent from '@lucide/svelte/icons/percent';
import Save from '@lucide/svelte/icons/save';
import Trash2 from '@lucide/svelte/icons/trash-2';

const CHART_COLORS = [
  'var(--chart-1)',
  'var(--chart-2)',
  'var(--chart-3)',
  'var(--chart-4)',
  'var(--chart-5)',
  'var(--chart-6)',
];
const MAX_PRODUCTS = 6;
/** Debounce delay for per-item note saves (ms). Short enough to feel
 *  responsive, long enough to coalesce rapid keystrokes into one
 *  network write. */
const NOTES_DEBOUNCE_MS = 400;

// ─── URL params ──────────────────────────────
// The page supports two modes:
//   - ephemeral: `?products=1,2,3`  → chose products inline, no save
//   - saved:     `?list=slug-abc12345` → open a saved comparison-kind
//                list; products + per-item notes come from the server
//
// Ephemeral wins if both params are present (explicit user intent).

const initialIds = $derived.by(() => {
  const param = $page.url.searchParams.get('products');
  if (!param) return [] as number[];
  return param
    .split(',')
    .map((s) => parseInt(s, 10))
    .filter((n) => !isNaN(n));
});

const listSlug = $derived($page.url.searchParams.get('list'));

let selectedProductIds = $state<number[]>([]);
let period = $state<'7d' | '30d' | '90d' | '1y' | 'all'>('30d');
let normalized = $state(false);
let selectorOpen = $state(false);
let searchQuery = $state('');

// ─── Saved-comparison state ──────────────────
//
// When `?list=slug` resolves to a real comparison, we track:
//   - `activeList`: the list row itself (id, name, slug, etc.)
//   - `activeListProducts`: products with their per-item notes
//   - `notesDraftMap`: in-flight edits keyed by productId, flushed via
//      debounced mutations

const comparisonsQuery = $derived(getComparisons().options());
const comparisons = $derived(comparisonsQuery.data ?? []);

const activeList = $derived(
  listSlug ? comparisons.find((c) => c.slug === listSlug) ?? null : null
);
const isSavedComparison = $derived(activeList !== null);

// Load the list's product snapshot with their per-item notes. Only
// fetches when we actually have a list id — ephemeral mode skips it.
const listProductsQuery = $derived(
  activeList ? getListProducts(activeList.id).options() : null
);
const activeListProducts = $derived(listProductsQuery?.data ?? []);

// If the URL names a list that doesn't exist (deleted, wrong workspace,
// typo), we want a clear empty-state rather than silently defaulting
// to an empty comparison.
const listNotFound = $derived(
  listSlug !== null &&
    comparisonsQuery.isSuccess &&
    activeList === null
);

// ─── Initial selection sync ──────────────────
//
// Two paths populate `selectedProductIds` on first load:
//   - ephemeral: from `initialIds` once the URL parses
//   - saved: from `activeListProducts` once the list query resolves
// Whichever fires first wins; switching later between them is
// intentional (user edited URL).

let initialized = $state(false);
$effect(() => {
  if (initialized) return;
  if (listSlug) {
    // Wait for the list query to resolve before initializing.
    if (activeListProducts.length > 0) {
      selectedProductIds = activeListProducts.map((p) => p.id);
      initialized = true;
    } else if (listNotFound) {
      initialized = true;
    }
  } else if (initialIds.length > 0) {
    selectedProductIds = initialIds;
    initialized = true;
  } else {
    initialized = true;
  }
});

// Keep `selectedProductIds` in lockstep with the saved comparison's
// product set when membership changes on the server (e.g. user removed
// a product via the in-page remove button — the mutation invalidates
// the list products query, which re-fetches).
$effect(() => {
  if (!isSavedComparison || !activeList) return;
  const serverIds = activeListProducts.map((p) => p.id);
  untrack(() => {
    const current = selectedProductIds.join(',');
    const next = serverIds.join(',');
    if (current !== next) {
      selectedProductIds = serverIds;
    }
  });
});

// ─── URL sync (ephemeral mode only) ──────────
//
// Saved comparisons never write to `?products=` — their canonical URL
// is `?list=slug`. Ephemeral comparisons sync selection to the URL so
// reloads / shares work.
$effect(() => {
  if (!initialized) return;
  if (isSavedComparison) return;
  const current = $page.url.searchParams.get('products') ?? '';
  const next = selectedProductIds.join(',');
  if (current !== next) {
    const url = new URL($page.url);
    if (selectedProductIds.length > 0) {
      url.searchParams.set('products', next);
    } else {
      url.searchParams.delete('products');
    }
    goto(url.toString(), { replaceState: true, noScroll: true });
  }
});

// Reset chart interactions when selection changes
$effect(() => {
  selectedProductIds;
  chartInteractions.reset();
});

// ─── Data for the chart / cards / summary ────
const productsQuery = listProducts().options();
const retailersQuery = listRetailers().options();
const allProducts = $derived(productsQuery.data ?? []);
const retailerMap = $derived(new Map((retailersQuery.data ?? []).map((r) => [r.id, r])));

/**
 * Resolve selected product ids to full product objects, preferring the
 * saved-comparison payload (which already carries per-item `listNotes`)
 * and falling back to the global product list for ephemeral mode.
 */
const selectedProducts = $derived.by((): ComparisonProduct[] => {
  const result: ComparisonProduct[] = [];
  for (const id of selectedProductIds) {
    if (isSavedComparison) {
      const listed = activeListProducts.find((p) => p.id === id);
      if (listed) {
        result.push(listed);
        continue;
      }
    }
    const global = allProducts.find((p) => p.id === id);
    if (global) result.push({ ...global, listNotes: null });
  }
  return result;
});

// Search filter for selector
const filteredProducts = $derived.by(() => {
  const q = searchQuery.trim().toLowerCase();
  if (!q) return allProducts;
  return allProducts.filter(
    (p) =>
      p.name.toLowerCase().includes(q) ||
      p.retailer.toLowerCase().includes(q)
  );
});

// Date range from period (same logic as price-history-chart)
const dateRange = $derived.by(() => {
  if (period === 'all') return undefined;
  const now = new Date();
  const days = { '7d': 7, '30d': 30, '90d': 90, '1y': 365 }[period];
  const from = new Date(now.getTime() - days * 24 * 60 * 60 * 1000);
  return { dateFrom: from.toISOString() };
});

// Imperative data fetching per product
let historyMap = $state<Map<number, PriceHistoryEntry[]>>(new Map());
let loadingIds = $state<Set<number>>(new Set());

// Fetch history when selection or period changes
$effect(() => {
  const ids = selectedProductIds;
  const range = dateRange;

  untrack(() => {
    // Clear data for removed products
    const currentIds = new Set(ids);
    let cleaned = false;
    const next = new Map(historyMap);
    for (const id of next.keys()) {
      if (!currentIds.has(id)) {
        next.delete(id);
        cleaned = true;
      }
    }
    if (cleaned) historyMap = next;

    // Fetch data for each selected product
    for (const id of ids) {
      if (loadingIds.has(id)) continue;
      loadingIds = new Set([...loadingIds, id]);

      getPriceHistory(id, range)
        .execute()
        .then((data) => {
          historyMap = new Map(historyMap).set(id, data);
        })
        .finally(() => {
          loadingIds = new Set([...loadingIds].filter((x) => x !== id));
        });
    }
  });
});

// Build chart series
const chartSeries = $derived.by((): ComparisonSeries[] => {
  return selectedProducts.map((product, idx) => {
    const history = historyMap.get(product.id) ?? [];
    const rawData = history.map((h) => ({
      x: new Date(h.checkedAt),
      y: h.price,
    }));

    let data = rawData;
    if (normalized && rawData.length > 0) {
      const firstPrice = rawData[0].y;
      if (firstPrice !== 0) {
        data = rawData.map((d) => ({
          x: d.x,
          y: ((d.y - firstPrice) / firstPrice) * 100,
        }));
      }
    }

    return {
      key: `product-${product.id}`,
      label: product.name.length > 30 ? product.name.slice(0, 30) + '...' : product.name,
      color: CHART_COLORS[idx % CHART_COLORS.length],
      data,
    };
  });
});

// Legend items
const legendItems = $derived(
  chartSeries.map((s) => ({
    key: s.key,
    label: s.label,
    color: s.color,
  }))
);

const isLoading = $derived(loadingIds.size > 0);

function toggleProduct(id: number) {
  if (selectedProductIds.includes(id)) {
    selectedProductIds = selectedProductIds.filter((x) => x !== id);
  } else if (selectedProductIds.length < MAX_PRODUCTS) {
    selectedProductIds = [...selectedProductIds, id];
  }
}

function removeProduct(id: number) {
  selectedProductIds = selectedProductIds.filter((x) => x !== id);
}

// ─── Save-as / delete comparison ─────────────
const createMut = createComparison.options();
const deleteMut = deleteList.options();
const removeFromListMut = removeFromList.options();
const setNotesMut = setListItemNotes.options();
const addManyMut = addManyToList.options();

let saveDialogOpen = $state(false);
let saveName = $state('');
let saveDescription = $state('');

async function handleSaveAsComparison() {
  const name = saveName.trim();
  if (!name) return;
  const created = await createMut.mutateAsync({
    name,
    description: saveDescription.trim() || null,
  });
  // Seed the new list with every currently-selected product in one
  // round-trip. The server validates each id belongs to the workspace
  // and silently drops strangers, so cross-tenant ids in the URL can't
  // poison the junction.
  if (selectedProductIds.length > 0) {
    await addManyMut.mutateAsync({
      listId: created.id,
      productIds: selectedProductIds,
    });
  }
  saveDialogOpen = false;
  saveName = '';
  saveDescription = '';
  // Canonical URL for a saved comparison drops `?products=` in favour
  // of `?list=slug`.
  const url = new URL($page.url);
  url.searchParams.delete('products');
  url.searchParams.set('list', created.slug);
  goto(url.toString(), { replaceState: true });
}

async function handleDeleteComparison() {
  if (!activeList) return;
  if (!confirm(`Delete the comparison "${activeList.name}"? This cannot be undone.`)) {
    return;
  }
  await deleteMut.mutateAsync({ id: activeList.id });
  const url = new URL($page.url);
  url.searchParams.delete('list');
  goto(url.toString(), { replaceState: true });
}

async function handleRemoveFromComparison(productId: number) {
  if (!activeList) {
    removeProduct(productId);
    return;
  }
  await removeFromListMut.mutateAsync({ listId: activeList.id, productId });
  // `activeListProducts` will refresh via cache invalidation; the
  // follow-up effect above keeps `selectedProductIds` in sync.
}

// ─── Notes editing (saved comparisons only) ──
//
// Each productId gets its own debounce timer; typing in one card
// doesn't stall a save on another. We persist the LATEST value the user
// typed — if three keystrokes land inside the window, the third wins.

const notesDebounceTimers = new Map<number, ReturnType<typeof setTimeout>>();
const notesDrafts = new Map<number, string>();

function handleNotesChange(productId: number, notes: string): void {
  if (!activeList) return;
  notesDrafts.set(productId, notes);
  const existing = notesDebounceTimers.get(productId);
  if (existing) clearTimeout(existing);
  const timer = setTimeout(() => {
    notesDebounceTimers.delete(productId);
    const latest = notesDrafts.get(productId) ?? '';
    notesDrafts.delete(productId);
    setNotesMut
      .mutateAsync({
        listId: activeList!.id,
        productId,
        notes: latest.trim() === '' ? null : latest,
      })
      .catch(() => {
        // Toast handled by the mutation's errorMessage.
      });
  }, NOTES_DEBOUNCE_MS);
  notesDebounceTimers.set(productId, timer);
}
</script>

<svelte:head>
  <title>{activeList?.name ?? 'Compare'} - Price Watcher</title>
</svelte:head>

<div class="space-y-6">
  <!-- Header -->
  <div class="flex flex-wrap items-center justify-between gap-4">
    <div>
      <h1 class="text-2xl font-bold tracking-tight">
        {#if activeList}
          {activeList.name}
        {:else}
          Compare Prices
        {/if}
      </h1>
      <p class="text-muted-foreground text-sm">
        {#if activeList}
          {activeList.description ?? 'Saved comparison'}
        {:else}
          Overlay price histories to compare trends
        {/if}
      </p>
    </div>
    <div class="flex items-center gap-2">
      {#if isSavedComparison}
        <Button variant="outline" size="sm" onclick={handleDeleteComparison}>
          <Trash2 class="mr-2 h-4 w-4" />
          Delete
        </Button>
      {:else if selectedProductIds.length >= 2}
        <Button variant="default" size="sm" onclick={() => (saveDialogOpen = true)}>
          <Save class="mr-2 h-4 w-4" />
          Save as comparison
        </Button>
      {/if}
      <!-- Normalize toggle -->
      <Button
        variant={normalized ? 'default' : 'outline'}
        size="sm"
        onclick={() => (normalized = !normalized)}>
        <Percent class="mr-2 h-4 w-4" />
        % Change
      </Button>
      <!-- Period buttons -->
      <div class="flex gap-1">
        {#each ['7d', '30d', '90d', '1y', 'all'] as p}
          <Button
            variant={period === p ? 'default' : 'ghost'}
            size="sm"
            class="h-7 px-2 text-xs"
            onclick={() => (period = p as typeof period)}>
            {p === 'all' ? 'All' : p}
          </Button>
        {/each}
      </div>
    </div>
  </div>

  {#if listNotFound}
    <div class="rounded-md border border-dashed p-6 text-center">
      <p class="text-muted-foreground text-sm">
        This comparison doesn't exist or was deleted.
      </p>
      <Button
        variant="outline"
        size="sm"
        class="mt-3"
        onclick={() => goto('/price-watcher/comparisons')}>
        Back to comparisons
      </Button>
    </div>
  {/if}

  <!-- Product Selector -->
  <div class="space-y-2">
    <div class="flex flex-wrap items-center gap-2">
      <Popover.Root bind:open={selectorOpen}>
        <Popover.Trigger>
          {#snippet child({ props })}
            <button
              {...props}
              class="border-primary/50 text-foreground inline-flex h-8 items-center gap-1.5 rounded-md border border-dashed px-3 text-xs transition-colors hover:bg-muted">
              <Plus class="h-3.5 w-3.5" />
              Add product ({selectedProductIds.length}/{MAX_PRODUCTS})
            </button>
          {/snippet}
        </Popover.Trigger>
        <Popover.Content class="w-72 p-0" align="start">
          <div class="border-b p-2">
            <Input
              class="h-8 text-sm"
              placeholder="Search products..."
              bind:value={searchQuery} />
          </div>
          <div class="max-h-60 overflow-y-auto p-1">
            {#if filteredProducts.length === 0}
              <p class="text-muted-foreground p-4 text-center text-xs">No products found</p>
            {:else}
              {#each filteredProducts as product (product.id)}
                {@const isSelected = selectedProductIds.includes(product.id)}
                {@const isDisabled = !isSelected && selectedProductIds.length >= MAX_PRODUCTS}
                {@const retailer = product.retailerId ? retailerMap.get(product.retailerId) : undefined}
                <button
                  class="hover:bg-muted flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-sm transition-colors disabled:opacity-40"
                  disabled={isDisabled}
                  onclick={() => toggleProduct(product.id)}>
                  <div class="flex h-4 w-4 shrink-0 items-center justify-center rounded border {isSelected ? 'border-primary bg-primary' : 'border-muted-foreground/30'}">
                    {#if isSelected}
                      <Check class="text-primary-foreground h-3 w-3" />
                    {/if}
                  </div>
                  <div class="min-w-0 flex-1">
                    <div class="truncate text-sm">{product.name}</div>
                    <div class="text-muted-foreground text-xs">
                      {retailer?.name ?? product.retailer}
                      {#if product.currentPrice !== null}
                        · {currencyFormatter.format(product.currentPrice)}
                      {/if}
                    </div>
                  </div>
                </button>
              {/each}
            {/if}
          </div>
        </Popover.Content>
      </Popover.Root>

      <!-- Selected product badges (compact visual legend beside selector) -->
      {#each selectedProducts as product, idx (product.id)}
        <Badge variant="outline" class="gap-1.5 pr-1">
          <span class="inline-block h-2.5 w-2.5 rounded-sm" style="background-color: {CHART_COLORS[idx % CHART_COLORS.length]};"></span>
          <span class="max-w-32 truncate">{product.name}</span>
          <button
            class="hover:bg-muted-foreground/20 rounded-full p-0.5 transition-colors"
            onclick={() => (isSavedComparison ? handleRemoveFromComparison(product.id) : removeProduct(product.id))}>
            <X class="h-3 w-3" />
          </button>
        </Badge>
      {/each}

      {#if isLoading}
        <span class="text-muted-foreground animate-pulse text-xs">Loading...</span>
      {/if}
    </div>
  </div>

  {#if selectedProducts.length > 0}
    <!-- Decision-helper stats -->
    <ComparisonSummary
      products={selectedProducts}
      histories={historyMap}
    />

    <!-- Side-by-side product cards -->
    <ComparisonDetailRow
      products={selectedProducts}
      retailersById={retailerMap}
      editableNotes={isSavedComparison}
      onRemove={(id) => (isSavedComparison ? handleRemoveFromComparison(id) : removeProduct(id))}
      onNotesChange={handleNotesChange}
    />
  {/if}

  <!-- Chart -->
  <PriceComparisonChart series={chartSeries} {normalized} />

  <!-- Legend -->
  {#if legendItems.length > 0}
    <InteractiveLegend
      items={legendItems}
      direction="horizontal"
      showToggleIcon
      clickToToggle />
  {/if}
</div>

<!-- Save-as-comparison dialog -->
<Dialog.Root bind:open={saveDialogOpen}>
  <Dialog.Content class="sm:max-w-md">
    <Dialog.Header>
      <Dialog.Title>Save this comparison</Dialog.Title>
      <Dialog.Description>
        Name it so you can come back to it later. You can still add or remove
        products, edit notes, or delete it at any time.
      </Dialog.Description>
    </Dialog.Header>
    <form
      class="space-y-4"
      onsubmit={(event) => {
        event.preventDefault();
        void handleSaveAsComparison();
      }}
    >
      <div class="space-y-1">
        <label for="save-name" class="text-sm font-medium">Name</label>
        <Input
          id="save-name"
          placeholder="e.g. Vacuum shortlist"
          bind:value={saveName}
          maxlength={100}
          autofocus
          required
        />
      </div>
      <div class="space-y-1">
        <label for="save-description" class="text-sm font-medium">
          Description <span class="text-muted-foreground text-xs">(optional)</span>
        </label>
        <Input
          id="save-description"
          placeholder="What decision are you making?"
          bind:value={saveDescription}
          maxlength={500}
        />
      </div>
      <Dialog.Footer>
        <Button type="button" variant="outline" onclick={() => (saveDialogOpen = false)}>
          Cancel
        </Button>
        <Button type="submit" disabled={!saveName.trim()}>Save</Button>
      </Dialog.Footer>
    </form>
  </Dialog.Content>
</Dialog.Root>
