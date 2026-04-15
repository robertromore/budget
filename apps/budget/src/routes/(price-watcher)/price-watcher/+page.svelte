<script lang="ts">
import { Button } from '$lib/components/ui/button';
import * as Card from '$lib/components/ui/card';
import * as Select from '$lib/components/ui/select';
import { listProducts, listAlerts } from '$lib/query/price-watcher';
import { currencyFormatter } from '$lib/utils/formatters';
import ProductImage from './(components)/product-image.svelte';
import AlertTriangle from '@lucide/svelte/icons/alert-triangle';
import Bell from '@lucide/svelte/icons/bell';
import Package from '@lucide/svelte/icons/package';
import Plus from '@lucide/svelte/icons/plus';
import TrendingDown from '@lucide/svelte/icons/trending-down';

const productsQuery = listProducts().options();
const alertsQuery = listAlerts().options();

const products = $derived(productsQuery.data ?? []);
const alerts = $derived(alertsQuery.data ?? []);

type SortOption = 'recent' | 'name' | 'price-low' | 'price-high' | 'biggest-drop';
let sortBy = $state<SortOption>('recent');

const sortLabels: Record<SortOption, string> = {
  'recent': 'Recently Checked',
  'name': 'Name',
  'price-low': 'Price: Low to High',
  'price-high': 'Price: High to Low',
  'biggest-drop': 'Biggest Drop',
};

const sortedProducts = $derived.by(() => {
  const sorted = [...products];
  switch (sortBy) {
    case 'name':
      return sorted.sort((a, b) => a.name.localeCompare(b.name));
    case 'price-low':
      return sorted.sort((a, b) => (a.currentPrice ?? Infinity) - (b.currentPrice ?? Infinity));
    case 'price-high':
      return sorted.sort((a, b) => (b.currentPrice ?? -Infinity) - (a.currentPrice ?? -Infinity));
    case 'biggest-drop':
      return sorted.sort((a, b) => {
        const dropA = a.highestPrice && a.currentPrice ? (a.highestPrice - a.currentPrice) / a.highestPrice : 0;
        const dropB = b.highestPrice && b.currentPrice ? (b.highestPrice - b.currentPrice) / b.highestPrice : 0;
        return dropB - dropA;
      });
    case 'recent':
    default:
      return sorted.sort((a, b) => {
        if (!a.lastCheckedAt) return 1;
        if (!b.lastCheckedAt) return -1;
        return b.lastCheckedAt.localeCompare(a.lastCheckedAt);
      });
  }
});

const productCount = $derived(products.length);
const activeAlerts = $derived(alerts.filter((a) => a.enabled).length);
const errorCount = $derived(products.filter((p) => p.status === 'error').length);

const productsAtTarget = $derived(
  products.filter(
    (p) => p.currentPrice !== null && p.targetPrice !== null && p.currentPrice <= p.targetPrice
  )
);
</script>

<svelte:head>
  <title>Price Watcher</title>
  <meta name="description" content="Track product prices and get alerts on price drops" />
</svelte:head>

<div class="space-y-6">
  <div class="flex items-center justify-between">
    <div>
      <h1 class="text-2xl font-bold tracking-tight">Price Watcher</h1>
      <p class="text-muted-foreground text-sm">Track prices and get notified on drops</p>
    </div>
    <Button href="/price-watcher/products">
      <Plus class="mr-2 h-4 w-4" />
      Add Product
    </Button>
  </div>

  <!-- Summary Cards -->
  <div class="grid grid-cols-2 gap-3 lg:grid-cols-4">
    <Card.Root>
      <Card.Header class="flex flex-row items-center justify-between space-y-0 pb-2">
        <Card.Title class="text-xs font-medium sm:text-sm">Products</Card.Title>
        <Package class="text-muted-foreground h-4 w-4" />
      </Card.Header>
      <Card.Content>
        <div class="text-2xl font-bold">{productCount}</div>
        <p class="text-muted-foreground text-xs">tracked</p>
      </Card.Content>
    </Card.Root>
    <Card.Root>
      <Card.Header class="flex flex-row items-center justify-between space-y-0 pb-2">
        <Card.Title class="text-xs font-medium sm:text-sm">Active Alerts</Card.Title>
        <Bell class="text-muted-foreground h-4 w-4" />
      </Card.Header>
      <Card.Content>
        <div class="text-2xl font-bold">{activeAlerts}</div>
        <p class="text-muted-foreground text-xs">monitoring</p>
      </Card.Content>
    </Card.Root>
    <Card.Root>
      <Card.Header class="flex flex-row items-center justify-between space-y-0 pb-2">
        <Card.Title class="text-xs font-medium sm:text-sm">At Target</Card.Title>
        <TrendingDown class="text-success h-4 w-4" />
      </Card.Header>
      <Card.Content>
        <div class="text-success text-2xl font-bold">{productsAtTarget.length}</div>
        <p class="text-muted-foreground text-xs">hit target price</p>
      </Card.Content>
    </Card.Root>
    <Card.Root>
      <Card.Header class="flex flex-row items-center justify-between space-y-0 pb-2">
        <Card.Title class="text-xs font-medium sm:text-sm">Errors</Card.Title>
        <AlertTriangle class="text-muted-foreground h-4 w-4" />
      </Card.Header>
      <Card.Content>
        <div class={errorCount > 0 ? 'text-destructive text-2xl font-bold' : 'text-2xl font-bold'}>
          {errorCount}
        </div>
        <p class="text-muted-foreground text-xs">need attention</p>
      </Card.Content>
    </Card.Root>
  </div>

  <!-- Products at Target -->
  {#if productsAtTarget.length > 0}
    <div class="space-y-3">
      <h2 class="text-lg font-semibold">Target Price Reached</h2>
      <div class="space-y-2">
        {#each productsAtTarget as product (product.id)}
          <a
            href="/price-watcher/products/{product.slug}"
            class="flex items-center justify-between rounded-lg border bg-success-bg p-3 transition-shadow hover:shadow-md">
            <ProductImage imageUrl={product.imageUrl} alt={product.name} size="sm" />
            <div class="min-w-0 flex-1 pr-4">
              <div class="max-w-sm truncate font-medium sm:max-w-md lg:max-w-lg" title={product.name}>{product.name}</div>
              <div class="text-muted-foreground text-xs capitalize">{product.retailer}</div>
            </div>
            <div class="shrink-0 text-right">
              <div class="text-success font-bold">
                {product.currentPrice !== null ? currencyFormatter.format(product.currentPrice) : '—'}
              </div>
              <div class="text-muted-foreground text-xs">
                Target: {product.targetPrice !== null ? currencyFormatter.format(product.targetPrice) : '—'}
              </div>
            </div>
          </a>
        {/each}
      </div>
    </div>
  {/if}

  <!-- Recent Products -->
  {#if products.length > 0}
    <div class="space-y-3">
      <div class="flex items-center justify-between">
        <h2 class="text-lg font-semibold">All Products</h2>
        <div class="flex items-center gap-2">
          <Select.Root type="single" value={sortBy} onValueChange={(v) => (sortBy = v as SortOption)}>
            <Select.Trigger class="h-8 w-44 text-xs">{sortLabels[sortBy]}</Select.Trigger>
            <Select.Content>
              <Select.Item value="recent">Recently Checked</Select.Item>
              <Select.Item value="name">Name</Select.Item>
              <Select.Item value="price-low">Price: Low to High</Select.Item>
              <Select.Item value="price-high">Price: High to Low</Select.Item>
              <Select.Item value="biggest-drop">Biggest Drop</Select.Item>
            </Select.Content>
          </Select.Root>
          <Button variant="ghost" size="sm" href="/price-watcher/products">View all</Button>
        </div>
      </div>
      <div class="space-y-2">
        {#each sortedProducts.slice(0, 10) as product (product.id)}
          <a
            href="/price-watcher/products/{product.slug}"
            class="flex items-center justify-between overflow-hidden rounded-lg border p-3 transition-shadow hover:shadow-md">
            <ProductImage imageUrl={product.imageUrl} alt={product.name} size="sm" />
            <div class="min-w-0 flex-1 pr-4">
              <div class="max-w-sm truncate font-medium sm:max-w-md lg:max-w-lg" title={product.name}>{product.name}</div>
              <div class="text-muted-foreground text-xs capitalize">{product.retailer}</div>
            </div>
            <div class="shrink-0 text-right">
              <div class="font-bold">
                {product.currentPrice !== null ? currencyFormatter.format(product.currentPrice) : '—'}
              </div>
              {#if product.status === 'error'}
                <span class="text-xs text-destructive">Error</span>
              {:else if product.lastCheckedAt}
                <span class="text-muted-foreground text-xs">
                  Checked {new Date(product.lastCheckedAt).toLocaleDateString()}
                </span>
              {/if}
            </div>
          </a>
        {/each}
      </div>
    </div>
  {:else if !productsQuery.isLoading}
    <div class="text-muted-foreground rounded-lg border border-dashed p-8 text-center">
      <Package class="mx-auto h-8 w-8" />
      <p class="mt-2 font-medium">No products tracked yet</p>
      <p class="mt-1 text-sm">Add a product URL to start monitoring prices.</p>
      <Button variant="outline" class="mt-4" href="/price-watcher/products">
        <Plus class="mr-2 h-4 w-4" />
        Add Product
      </Button>
    </div>
  {/if}
</div>
