<script lang="ts">
import { Button } from '$lib/components/ui/button';
import * as Empty from '$lib/components/ui/empty';
import { listProducts } from '$lib/query/price-watcher';
import Package from '@lucide/svelte/icons/package';
import Plus from '@lucide/svelte/icons/plus';
import ProductCard from '../(components)/product-card.svelte';
import AddProductDialog from '../(components)/add-product-dialog.svelte';

const productsQuery = listProducts().options();
const products = $derived(productsQuery.data ?? []);
const isLoading = $derived(productsQuery.isLoading);

let addDialogOpen = $state(false);
</script>

<svelte:head>
  <title>Products - Price Watcher</title>
  <meta name="description" content="Track product prices across retailers" />
</svelte:head>

<div class="space-y-6">
  <div class="flex items-center justify-between">
    <div>
      <h1 class="text-2xl font-bold tracking-tight">Products</h1>
      <p class="text-muted-foreground text-sm">{products.length} products tracked</p>
    </div>
    <Button onclick={() => (addDialogOpen = true)}>
      <Plus class="mr-2 h-4 w-4" />
      Add Product
    </Button>
  </div>

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
  {:else}
    <div class="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {#each products as product (product.id)}
        <ProductCard {product} />
      {/each}
    </div>
  {/if}
</div>

<AddProductDialog bind:open={addDialogOpen} />
