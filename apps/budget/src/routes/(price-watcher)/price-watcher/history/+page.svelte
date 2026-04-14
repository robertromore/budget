<script lang="ts">
import { Button } from '$lib/components/ui/button';
import * as Empty from '$lib/components/ui/empty';
import { listProducts, getPriceHistory } from '$lib/query/price-watcher';
import type { PriceProduct } from '$core/schema/price-products';
import { currencyFormatter } from '$lib/utils/formatters';
import TrendingUp from '@lucide/svelte/icons/trending-up';

const productsQuery = listProducts().options();
const products = $derived(productsQuery.data ?? []);
const isLoading = $derived(productsQuery.isLoading);

// Collect recent price changes across all products
const recentChanges = $derived.by(() => {
  return products
    .filter((p: PriceProduct) => p.currentPrice !== null && p.lastCheckedAt !== null)
    .sort((a: PriceProduct, b: PriceProduct) =>
      (b.lastCheckedAt ?? '').localeCompare(a.lastCheckedAt ?? '')
    )
    .slice(0, 50);
});
</script>

<svelte:head>
  <title>Price History - Price Watcher</title>
  <meta name="description" content="Price history across all tracked products" />
</svelte:head>

<div class="space-y-6">
  <div>
    <h1 class="text-2xl font-bold tracking-tight">Price History</h1>
    <p class="text-muted-foreground text-sm">Recent price checks across all products</p>
  </div>

  {#if isLoading}
    <div class="space-y-3">
      {#each Array(6) as _}
        <div class="rounded-lg border p-4">
          <div class="bg-muted h-4 w-1/3 animate-pulse rounded"></div>
          <div class="bg-muted mt-2 h-3 w-1/2 animate-pulse rounded"></div>
        </div>
      {/each}
    </div>
  {:else if recentChanges.length === 0}
    <Empty.Empty>
      <Empty.EmptyMedia variant="icon">
        <TrendingUp class="size-6" />
      </Empty.EmptyMedia>
      <Empty.EmptyHeader>
        <Empty.EmptyTitle>No Price History</Empty.EmptyTitle>
        <Empty.EmptyDescription>
          Price history will appear here after products are checked.
        </Empty.EmptyDescription>
      </Empty.EmptyHeader>
      <Empty.EmptyContent>
        <Button variant="outline" href="/price-watcher/products">Browse Products</Button>
      </Empty.EmptyContent>
    </Empty.Empty>
  {:else}
    <div class="space-y-2">
      {#each recentChanges as product (product.id)}
        <a
          href="/price-watcher/products/{product.slug}"
          class="flex items-center justify-between rounded-lg border p-3 transition-shadow hover:shadow-md">
          <div class="min-w-0 flex-1 pr-4">
            <div class="truncate font-medium" title={product.name}>{product.name}</div>
            <div class="text-muted-foreground text-xs capitalize">{product.retailer}</div>
          </div>
          <div class="shrink-0 text-right">
            <div class="font-mono font-bold">
              {product.currentPrice !== null ? currencyFormatter.format(product.currentPrice) : '—'}
            </div>
            <div class="text-muted-foreground text-xs">
              {product.lowestPrice !== null ? `Low: ${currencyFormatter.format(product.lowestPrice)}` : ''}
              {product.highestPrice !== null ? ` · High: ${currencyFormatter.format(product.highestPrice)}` : ''}
            </div>
            {#if product.lastCheckedAt}
              <div class="text-muted-foreground text-xs">
                {new Date(product.lastCheckedAt).toLocaleString()}
              </div>
            {/if}
          </div>
        </a>
      {/each}
    </div>
  {/if}
</div>
