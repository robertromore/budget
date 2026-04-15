<script lang="ts">
import { untrack } from 'svelte';
import { page } from '$app/stores';
import { goto } from '$app/navigation';
import { Badge } from '$lib/components/ui/badge';
import { Button } from '$lib/components/ui/button';
import { Input } from '$lib/components/ui/input';
import * as Popover from '$lib/components/ui/popover';
import { InteractiveLegend } from '$lib/components/layercake';
import { listProducts, getPriceHistory } from '$lib/query/price-watcher';
import { currencyFormatter } from '$lib/utils/formatters';
import { chartInteractions } from '$lib/states/ui/chart-interactions.svelte';
import type { PriceHistoryEntry } from '$core/schema/price-history';
import type { PriceProduct } from '$core/schema/price-products';
import PriceComparisonChart from '../(components)/price-comparison-chart.svelte';
import type { ComparisonSeries } from '../(components)/price-comparison-chart.svelte';
import Plus from '@lucide/svelte/icons/plus';
import X from '@lucide/svelte/icons/x';
import Check from '@lucide/svelte/icons/check';
import Percent from '@lucide/svelte/icons/percent';

const CHART_COLORS = [
  'var(--chart-1)',
  'var(--chart-2)',
  'var(--chart-3)',
  'var(--chart-4)',
  'var(--chart-5)',
  'var(--chart-6)',
];
const MAX_PRODUCTS = 6;

// Read initial product IDs from URL
const initialIds = $derived.by(() => {
  const param = $page.url.searchParams.get('products');
  if (!param) return [] as number[];
  return param
    .split(',')
    .map((s) => parseInt(s, 10))
    .filter((n) => !isNaN(n));
});

let selectedProductIds = $state<number[]>([]);
let period = $state<'7d' | '30d' | '90d' | '1y' | 'all'>('30d');
let normalized = $state(false);
let selectorOpen = $state(false);
let searchQuery = $state('');

// Sync from URL on first load
let initialized = $state(false);
$effect(() => {
  if (!initialized && initialIds.length > 0) {
    selectedProductIds = initialIds;
    initialized = true;
  } else if (!initialized) {
    initialized = true;
  }
});

// Sync selected IDs to URL
$effect(() => {
  if (!initialized) return;
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

// Product list
const productsQuery = listProducts().options();
const allProducts = $derived(productsQuery.data ?? []);

const selectedProducts = $derived(
  selectedProductIds
    .map((id) => allProducts.find((p) => p.id === id))
    .filter((p): p is PriceProduct => p !== undefined)
);

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
// Uses untrack() to read historyMap/loadingIds without subscribing
$effect(() => {
  // These are the reactive dependencies — changes trigger re-fetch
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
</script>

<svelte:head>
  <title>Compare Prices - Price Watcher</title>
</svelte:head>

<div class="space-y-6">
  <!-- Header -->
  <div class="flex flex-wrap items-center justify-between gap-4">
    <div>
      <h1 class="text-2xl font-bold tracking-tight">Compare Prices</h1>
      <p class="text-muted-foreground text-sm">Overlay price histories to compare trends</p>
    </div>
    <div class="flex items-center gap-2">
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
                      {product.retailer}
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

      <!-- Selected product badges -->
      {#each selectedProducts as product, idx (product.id)}
        <Badge variant="outline" class="gap-1.5 pr-1">
          <span class="inline-block h-2.5 w-2.5 rounded-sm" style="background-color: {CHART_COLORS[idx % CHART_COLORS.length]};"></span>
          <span class="max-w-32 truncate">{product.name}</span>
          <button
            class="hover:bg-muted-foreground/20 rounded-full p-0.5 transition-colors"
            onclick={() => removeProduct(product.id)}>
            <X class="h-3 w-3" />
          </button>
        </Badge>
      {/each}

      {#if isLoading}
        <span class="text-muted-foreground animate-pulse text-xs">Loading...</span>
      {/if}
    </div>
  </div>

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
