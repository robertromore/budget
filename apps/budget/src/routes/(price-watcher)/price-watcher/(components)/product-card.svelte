<script lang="ts">
import { Badge } from '$lib/components/ui/badge';
import * as Card from '$lib/components/ui/card';
import type { PriceProduct } from '$core/schema/price-products';
import type { PriceAlert } from '$core/schema/price-alerts';
import { currencyFormatter } from '$lib/utils/formatters';
import { cn } from '$lib/utils';
import AlertTriangle from '@lucide/svelte/icons/alert-triangle';
import Bell from '@lucide/svelte/icons/bell';
import Pause from '@lucide/svelte/icons/pause';
import TrendingDown from '@lucide/svelte/icons/trending-down';
import TrendingUp from '@lucide/svelte/icons/trending-up';
import ProductImage from './product-image.svelte';

interface Props {
  product: PriceProduct;
  alertCount?: number;
}

let { product, alertCount = 0 }: Props = $props();

const priceChange = $derived.by(() => {
  if (product.currentPrice === null || product.highestPrice === null || product.highestPrice === 0) return null;
  return ((product.currentPrice - product.highestPrice) / product.highestPrice) * 100;
});

const isAtTarget = $derived(
  product.currentPrice !== null &&
  product.targetPrice !== null &&
  product.currentPrice <= product.targetPrice
);

// Progress: where current price sits between lowest and highest
const priceProgress = $derived.by(() => {
  if (product.lowestPrice === null || product.highestPrice === null || product.currentPrice === null) return null;
  const range = product.highestPrice - product.lowestPrice;
  if (range === 0) return 50;
  return Math.max(0, Math.min(100, ((product.currentPrice - product.lowestPrice) / range) * 100));
});

// Target position on the progress bar
const targetPosition = $derived.by(() => {
  if (product.targetPrice === null || product.lowestPrice === null || product.highestPrice === null) return null;
  const range = product.highestPrice - product.lowestPrice;
  if (range === 0) return null;
  return Math.max(0, Math.min(100, ((product.targetPrice - product.lowestPrice) / range) * 100));
});
</script>

<a href="/price-watcher/products/{product.slug}" class="block">
  <Card.Root class="transition-shadow hover:shadow-md">
    <Card.Content class="p-4">
      <div class="flex gap-3">
        <!-- Image -->
        <ProductImage imageUrl={product.imageUrl} alt={product.name} size="md" />

        <!-- Content -->
        <div class="min-w-0 flex-1">
          <!-- Top row: name + badges -->
          <div class="flex items-start justify-between gap-2">
            <div class="min-w-0 flex-1">
              <div class="truncate text-sm font-medium" title={product.name}>{product.name}</div>
              <div class="text-muted-foreground text-xs capitalize">{product.retailer}</div>
            </div>
            <div class="flex shrink-0 items-center gap-1">
              {#if alertCount > 0}
                <Badge variant="secondary" class="h-5 gap-1 px-1.5 text-xs">
                  <Bell class="h-3 w-3" />
                  {alertCount}
                </Badge>
              {/if}
              {#if product.status === 'error'}
                <Badge variant="destructive" class="text-xs">Error</Badge>
              {:else if product.status === 'paused'}
                <Badge variant="secondary" class="text-xs">
                  <Pause class="mr-1 h-3 w-3" />Paused
                </Badge>
              {:else if isAtTarget}
                <Badge class="bg-success text-xs text-white">Target</Badge>
              {/if}
            </div>
          </div>

          <!-- Price row -->
          <div class="mt-2 flex items-baseline gap-2">
            <span class="text-lg font-bold">
              {product.currentPrice !== null ? currencyFormatter.format(product.currentPrice) : '—'}
            </span>
            {#if priceChange !== null && priceChange !== 0}
              <span
                class={cn(
                  'flex items-center gap-0.5 text-xs font-medium',
                  priceChange < 0 ? 'text-success' : 'text-destructive'
                )}>
                {#if priceChange < 0}
                  <TrendingDown class="h-3 w-3" />
                {:else}
                  <TrendingUp class="h-3 w-3" />
                {/if}
                {Math.abs(priceChange).toFixed(0)}%
              </span>
            {/if}
          </div>

          <!-- Price range bar -->
          {#if priceProgress !== null}
            <div class="mt-2">
              <div class="relative h-1.5 w-full overflow-hidden rounded-full bg-muted">
                <!-- Current price position -->
                <div
                  class="absolute top-0 left-0 h-full rounded-full bg-info transition-all"
                  style="width: {priceProgress}%"></div>
                <!-- Target marker -->
                {#if targetPosition !== null}
                  <div
                    class="absolute top-0 h-full w-0.5 bg-success"
                    style="left: {targetPosition}%"></div>
                {/if}
              </div>
              <div class="text-muted-foreground mt-1 flex justify-between text-[10px]">
                <span>{product.lowestPrice !== null ? currencyFormatter.format(product.lowestPrice) : ''}</span>
                <span>{product.highestPrice !== null ? currencyFormatter.format(product.highestPrice) : ''}</span>
              </div>
            </div>
          {/if}

          <!-- Footer -->
          <div class="text-muted-foreground mt-1 flex items-center justify-between text-[10px]">
            {#if product.targetPrice !== null}
              <span>Target: {currencyFormatter.format(product.targetPrice)}</span>
            {:else}
              <span></span>
            {/if}
            {#if product.lastCheckedAt}
              <span>Checked {new Date(product.lastCheckedAt).toLocaleDateString()}</span>
            {/if}
          </div>

          <!-- Error message -->
          {#if product.status === 'error' && product.errorMessage}
            <div class="mt-1 flex items-center gap-1 text-[10px] text-destructive">
              <AlertTriangle class="h-3 w-3 shrink-0" />
              <span class="truncate">{product.errorMessage}</span>
            </div>
          {/if}
        </div>
      </div>
    </Card.Content>
  </Card.Root>
</a>
