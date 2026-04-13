<script lang="ts">
import { getPriceHistory } from '$lib/query/price-watcher';
import type { PriceProduct } from '$core/schema/price-products';
import { currencyFormatter } from '$lib/utils/formatters';
import { cn } from '$lib/utils';

interface Props {
  product: PriceProduct;
  period?: '7d' | '30d' | '90d' | '1y' | 'all';
}

let { product, period = 'all' }: Props = $props();

const dateRange = $derived.by(() => {
  if (period === 'all') return undefined;
  const now = new Date();
  const days = { '7d': 7, '30d': 30, '90d': 90, '1y': 365 }[period];
  const from = new Date(now.getTime() - days * 24 * 60 * 60 * 1000);
  return { dateFrom: from.toISOString() };
});

const historyQuery = $derived(getPriceHistory(product.id, dateRange).options());
const history = $derived(historyQuery.data ?? []);
const isLoading = $derived(historyQuery.isLoading);

// Chart dimensions
const chartHeight = 200;
const chartPadding = { top: 10, right: 10, bottom: 30, left: 60 };

const chartData = $derived.by(() => {
  if (history.length === 0) return null;

  const prices = history.map((h) => h.price);
  const minPrice = Math.min(...prices);
  const maxPrice = Math.max(...prices);
  const priceRange = maxPrice - minPrice || 1;

  const width = 100; // percentage-based
  const xStep = history.length > 1 ? width / (history.length - 1) : 0;

  const points = history.map((h, i) => ({
    x: i * xStep,
    y: ((maxPrice - h.price) / priceRange) * 100,
    price: h.price,
    date: new Date(h.checkedAt).toLocaleDateString(),
  }));

  const pathD = points.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ');

  return { points, pathD, minPrice, maxPrice };
});
</script>

{#if isLoading}
  <div class="bg-muted h-[240px] animate-pulse rounded-lg"></div>
{:else if history.length === 0}
  <div class="text-muted-foreground flex h-[240px] items-center justify-center rounded-lg border border-dashed text-sm">
    No price history yet
  </div>
{:else if chartData}
  <div class="rounded-lg border p-4">
    <div class="mb-2 flex items-center justify-between text-xs text-muted-foreground">
      <span>{currencyFormatter.format(chartData.maxPrice)}</span>
      <span>{history.length} data points</span>
    </div>
    <svg
      viewBox="0 0 100 100"
      preserveAspectRatio="none"
      class="h-[200px] w-full"
      role="img"
      aria-label="Price history chart">
      <!-- Grid lines -->
      <line x1="0" y1="0" x2="100" y2="0" stroke="currentColor" stroke-width="0.2" class="text-border" />
      <line x1="0" y1="50" x2="100" y2="50" stroke="currentColor" stroke-width="0.2" class="text-border" />
      <line x1="0" y1="100" x2="100" y2="100" stroke="currentColor" stroke-width="0.2" class="text-border" />

      <!-- Target price line -->
      {#if product.targetPrice !== null && chartData.maxPrice !== chartData.minPrice}
        {@const targetY = ((chartData.maxPrice - product.targetPrice) / (chartData.maxPrice - chartData.minPrice)) * 100}
        {#if targetY >= 0 && targetY <= 100}
          <line
            x1="0" y1={targetY} x2="100" y2={targetY}
            stroke="currentColor"
            stroke-width="0.3"
            stroke-dasharray="2,2"
            class="text-success" />
        {/if}
      {/if}

      <!-- Price line -->
      <path
        d={chartData.pathD}
        fill="none"
        stroke="currentColor"
        stroke-width="0.8"
        class="text-info"
        vector-effect="non-scaling-stroke" />

      <!-- Data points -->
      {#each chartData.points as point}
        <circle
          cx={point.x}
          cy={point.y}
          r="1"
          fill="currentColor"
          class="text-info" />
      {/each}
    </svg>
    <div class="mt-2 flex items-center justify-between text-xs text-muted-foreground">
      <span>{currencyFormatter.format(chartData.minPrice)}</span>
      <span>{history[0]?.checkedAt ? new Date(history[0].checkedAt).toLocaleDateString() : ''} — {history[history.length - 1]?.checkedAt ? new Date(history[history.length - 1].checkedAt).toLocaleDateString() : ''}</span>
    </div>
  </div>
{/if}
