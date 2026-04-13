<script lang="ts">
import { Badge } from '$lib/components/ui/badge';
import * as Card from '$lib/components/ui/card';
import type { PriceProduct } from '$core/schema/price-products';
import { currencyFormatter } from '$lib/utils/formatters';
import { cn } from '$lib/utils';
import AlertTriangle from '@lucide/svelte/icons/alert-triangle';
import ExternalLink from '@lucide/svelte/icons/external-link';
import Pause from '@lucide/svelte/icons/pause';
import TrendingDown from '@lucide/svelte/icons/trending-down';
import TrendingUp from '@lucide/svelte/icons/trending-up';

interface Props {
  product: PriceProduct;
}

let { product }: Props = $props();

const priceChange = $derived.by(() => {
  if (product.currentPrice === null || product.lowestPrice === null || product.highestPrice === null) return null;
  if (product.highestPrice === product.lowestPrice) return 0;
  // Compare current to highest: negative means cheaper than peak
  return ((product.currentPrice - product.highestPrice) / product.highestPrice) * 100;
});

const isAtLowest = $derived(
  product.currentPrice !== null &&
  product.lowestPrice !== null &&
  product.currentPrice <= product.lowestPrice
);

const isAtTarget = $derived(
  product.currentPrice !== null &&
  product.targetPrice !== null &&
  product.currentPrice <= product.targetPrice
);
</script>

<a href="/price-watcher/products/{product.slug}" class="block">
  <Card.Root
    class="transition-shadow hover:shadow-md">
    <Card.Header class="pb-2">
      <div class="flex items-start justify-between gap-2">
        <div class="min-w-0 flex-1">
          <Card.Title class="max-w-full truncate text-sm" title={product.name}>{product.name}</Card.Title>
          <Card.Description class="flex items-center gap-1 text-xs">
            <span class="capitalize">{product.retailer}</span>
          </Card.Description>
        </div>
        {#if product.status === 'error'}
          <Badge variant="destructive" class="shrink-0 text-xs">Error</Badge>
        {:else if product.status === 'paused'}
          <Badge variant="secondary" class="shrink-0 text-xs">
            <Pause class="mr-1 h-3 w-3" />
            Paused
          </Badge>
        {:else if isAtTarget}
          <Badge class="shrink-0 bg-success text-xs text-white">Target reached</Badge>
        {:else if isAtLowest}
          <Badge class="shrink-0 bg-success text-xs text-white">Lowest</Badge>
        {/if}
      </div>
    </Card.Header>
    <Card.Content>
      <div class="flex items-end justify-between">
        <div>
          <div class="text-2xl font-bold">
            {product.currentPrice !== null ? currencyFormatter.format(product.currentPrice) : '—'}
          </div>
          {#if product.targetPrice !== null}
            <div class="text-muted-foreground text-xs">
              Target: {currencyFormatter.format(product.targetPrice)}
            </div>
          {/if}
        </div>
        {#if priceChange !== null && priceChange !== 0}
          <div
            class={cn(
              'flex items-center gap-1 text-xs font-medium',
              priceChange < 0 ? 'text-success' : 'text-destructive'
            )}>
            {#if priceChange < 0}
              <TrendingDown class="h-3.5 w-3.5" />
            {:else}
              <TrendingUp class="h-3.5 w-3.5" />
            {/if}
            {Math.abs(priceChange).toFixed(1)}% from peak
          </div>
        {/if}
      </div>
      {#if product.status === 'error' && product.errorMessage}
        <div class="mt-2 flex items-center gap-1 text-xs text-destructive">
          <AlertTriangle class="h-3 w-3 shrink-0" />
          <span class="truncate">{product.errorMessage}</span>
        </div>
      {/if}
    </Card.Content>
  </Card.Root>
</a>
