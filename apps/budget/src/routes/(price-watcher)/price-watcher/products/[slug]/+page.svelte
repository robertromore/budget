<script lang="ts">
import { goto } from '$app/navigation';
import * as AlertDialog from '$lib/components/ui/alert-dialog';
import { Badge } from '$lib/components/ui/badge';
import { Button } from '$lib/components/ui/button';
import * as Card from '$lib/components/ui/card';
import { Input } from '$lib/components/ui/input';
import { Label } from '$lib/components/ui/label';
import * as Select from '$lib/components/ui/select';
import {
  getProduct,
  checkPriceNow,
  deleteProduct,
  listAlerts,
  createAlert,
  deleteAlert as deleteAlertMutation,
  updateAlert,
} from '$lib/query/price-watcher';
import { currencyFormatter } from '$lib/utils/formatters';
import { cn } from '$lib/utils';
import ChevronLeft from '@lucide/svelte/icons/chevron-left';
import ExternalLink from '@lucide/svelte/icons/external-link';
import RefreshCw from '@lucide/svelte/icons/refresh-cw';
import Trash2 from '@lucide/svelte/icons/trash-2';
import Bell from '@lucide/svelte/icons/bell';
import Plus from '@lucide/svelte/icons/plus';
import type { PageData } from './$types';
import PriceHistoryChart from '../../(components)/price-history-chart.svelte';
import { getAlertTypeLabel } from '../../(data)/alert-utils';

let { data }: { data: PageData } = $props();

const productQuery = $derived(getProduct(data.productSlug).options());
const product = $derived(productQuery.data);
const alertsQuery = $derived(product ? listAlerts(product.id).options() : undefined);
const alerts = $derived(alertsQuery?.data ?? []);

const checkMutation = checkPriceNow.options();
const deleteMutation = deleteProduct.options();
const createAlertMutation = createAlert.options();
const deleteAlertMut = deleteAlertMutation.options();
const updateAlertMut = updateAlert.options();

let deleteOpen = $state(false);
let addAlertOpen = $state(false);
let newAlertType = $state('price_drop');
let newAlertThreshold = $state('10');
let period = $state<'7d' | '30d' | '90d' | '1y' | 'all'>('30d');

async function handleCheck() {
  if (!product) return;
  await checkMutation.mutateAsync({ productId: product.id });
}

async function handleDelete() {
  if (!product) return;
  await deleteMutation.mutateAsync({ id: product.id });
  deleteOpen = false;
  goto('/price-watcher/products');
}

async function handleCreateAlert() {
  if (!product) return;
  await createAlertMutation.mutateAsync({
    productId: product.id,
    type: newAlertType as any,
    threshold: newAlertType === 'price_drop' ? parseFloat(newAlertThreshold) || 10 : null,
  });
  addAlertOpen = false;
  newAlertType = 'price_drop';
  newAlertThreshold = '10';
}

async function handleToggleAlert(alertId: number, enabled: boolean) {
  await updateAlertMut.mutateAsync({ id: alertId, data: { enabled: !enabled } });
}

async function handleDeleteAlert(alertId: number) {
  await deleteAlertMut.mutateAsync({ id: alertId });
}

</script>

<svelte:head>
  <title>{product?.name ?? 'Product'} - Price Watcher</title>
</svelte:head>

{#if product}
  <div class="space-y-6">
    <!-- Navigation -->
    <div class="text-muted-foreground flex items-center space-x-2 text-sm">
      <Button variant="ghost" size="sm" href="/price-watcher/products" class="h-auto p-0">
        <ChevronLeft class="mr-1 h-4 w-4" />
        Products
      </Button>
      <span>/</span>
      <span class="text-foreground max-w-xs truncate" title={product.name}>{product.name}</span>
    </div>

    <!-- Header -->
    <div class="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
      <div>
        <h1 class="max-w-xl truncate text-2xl font-bold" title={product.name}>{product.name}</h1>
        <div class="text-muted-foreground mt-1 flex items-center gap-2 text-sm">
          <span class="capitalize">{product.retailer}</span>
          <a
            href={product.url}
            target="_blank"
            rel="noopener noreferrer"
            class="text-info inline-flex items-center gap-1 hover:underline">
            Visit page <ExternalLink class="h-3 w-3" />
          </a>
          {#if product.status === 'error'}
            <Badge variant="destructive">Error</Badge>
          {:else if product.status === 'paused'}
            <Badge variant="secondary">Paused</Badge>
          {/if}
        </div>
        {#if product.status === 'error' && product.errorMessage}
          <p class="mt-1 text-sm text-destructive">{product.errorMessage}</p>
        {/if}
      </div>
      <div class="flex items-center gap-2">
        <Button
          variant="outline"
          size="sm"
          onclick={handleCheck}
          disabled={checkMutation.isPending}>
          <RefreshCw class={cn('mr-2 h-4 w-4', checkMutation.isPending && 'animate-spin')} />
          {checkMutation.isPending ? 'Checking...' : 'Check Now'}
        </Button>
        <Button
          variant="destructive"
          size="sm"
          onclick={() => (deleteOpen = true)}>
          <Trash2 class="mr-2 h-4 w-4" />
          Delete
        </Button>
      </div>
    </div>

    <!-- Price Cards -->
    <div class="grid grid-cols-2 gap-3 lg:grid-cols-4">
      <Card.Root>
        <Card.Header class="pb-2">
          <Card.Title class="text-muted-foreground text-xs font-medium">Current</Card.Title>
        </Card.Header>
        <Card.Content>
          <div class="text-2xl font-bold">
            {product.currentPrice !== null ? currencyFormatter.format(product.currentPrice) : '—'}
          </div>
        </Card.Content>
      </Card.Root>
      <Card.Root>
        <Card.Header class="pb-2">
          <Card.Title class="text-muted-foreground text-xs font-medium">Lowest</Card.Title>
        </Card.Header>
        <Card.Content>
          <div class="text-success text-2xl font-bold">
            {product.lowestPrice !== null ? currencyFormatter.format(product.lowestPrice) : '—'}
          </div>
        </Card.Content>
      </Card.Root>
      <Card.Root>
        <Card.Header class="pb-2">
          <Card.Title class="text-muted-foreground text-xs font-medium">Highest</Card.Title>
        </Card.Header>
        <Card.Content>
          <div class="text-destructive text-2xl font-bold">
            {product.highestPrice !== null ? currencyFormatter.format(product.highestPrice) : '—'}
          </div>
        </Card.Content>
      </Card.Root>
      <Card.Root>
        <Card.Header class="pb-2">
          <Card.Title class="text-muted-foreground text-xs font-medium">Target</Card.Title>
        </Card.Header>
        <Card.Content>
          <div class="text-info text-2xl font-bold">
            {product.targetPrice !== null ? currencyFormatter.format(product.targetPrice) : '—'}
          </div>
        </Card.Content>
      </Card.Root>
    </div>

    <!-- Price History Chart -->
    <div class="space-y-3">
      <div class="flex items-center justify-between">
        <h2 class="text-lg font-semibold">Price History</h2>
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
      <PriceHistoryChart {product} {period} />
    </div>

    <!-- Alerts Section -->
    <div class="space-y-3">
      <div class="flex items-center justify-between">
        <div class="flex items-center gap-2">
          <Bell class="h-5 w-5" />
          <h2 class="text-lg font-semibold">Alerts</h2>
          <Badge variant="secondary">{alerts.length}</Badge>
        </div>
        <Button variant="outline" size="sm" onclick={() => (addAlertOpen = true)}>
          <Plus class="mr-2 h-4 w-4" />
          Add Alert
        </Button>
      </div>

      {#if alerts.length === 0}
        <div class="text-muted-foreground rounded-lg border border-dashed p-6 text-center text-sm">
          No alerts configured. Add one to get notified about price changes.
        </div>
      {:else}
        <div class="space-y-2">
          {#each alerts as alert (alert.id)}
            <div class="flex items-center justify-between rounded-lg border p-3">
              <div class="flex items-center gap-3">
                <Badge variant="outline" class="text-xs">{getAlertTypeLabel(alert.type)}</Badge>
                {#if alert.type === 'price_drop' && alert.threshold}
                  <span class="text-muted-foreground text-xs">{alert.threshold}% drop</span>
                {/if}
                {#if alert.lastTriggeredAt}
                  <span class="text-muted-foreground text-xs">
                    Last: {new Date(alert.lastTriggeredAt).toLocaleDateString()}
                  </span>
                {/if}
              </div>
              <div class="flex items-center gap-2">
                <Button
                  variant={alert.enabled ? 'default' : 'outline'}
                  size="sm"
                  class="h-7 text-xs"
                  onclick={() => handleToggleAlert(alert.id, alert.enabled)}>
                  {alert.enabled ? 'Enabled' : 'Disabled'}
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  class="h-7 w-7 p-0"
                  onclick={() => handleDeleteAlert(alert.id)}>
                  <Trash2 class="h-3.5 w-3.5" />
                </Button>
              </div>
            </div>
          {/each}
        </div>
      {/if}
    </div>
  </div>

  <!-- Delete Confirmation -->
  <AlertDialog.Root bind:open={deleteOpen}>
    <AlertDialog.Content>
      <AlertDialog.Header>
        <AlertDialog.Title>Delete Product</AlertDialog.Title>
        <AlertDialog.Description>
          This will permanently delete "{product.name}" and all its price history and alerts.
        </AlertDialog.Description>
      </AlertDialog.Header>
      <AlertDialog.Footer>
        <AlertDialog.Cancel>Cancel</AlertDialog.Cancel>
        <AlertDialog.Action
          onclick={handleDelete}
          class="bg-destructive text-destructive-foreground hover:bg-destructive/90">
          Delete
        </AlertDialog.Action>
      </AlertDialog.Footer>
    </AlertDialog.Content>
  </AlertDialog.Root>

  <!-- Add Alert Dialog -->
  <AlertDialog.Root bind:open={addAlertOpen}>
    <AlertDialog.Content>
      <AlertDialog.Header>
        <AlertDialog.Title>Add Alert</AlertDialog.Title>
      </AlertDialog.Header>
      <div class="space-y-4">
        <div class="space-y-2">
          <Label>Alert Type</Label>
          <Select.Root type="single" bind:value={newAlertType}>
            <Select.Trigger>{getAlertTypeLabel(newAlertType)}</Select.Trigger>
            <Select.Content>
              <Select.Item value="price_drop">Price Drop</Select.Item>
              <Select.Item value="target_reached">Target Reached</Select.Item>
              <Select.Item value="back_in_stock">Back in Stock</Select.Item>
              <Select.Item value="any_change">Any Change</Select.Item>
            </Select.Content>
          </Select.Root>
        </div>
        {#if newAlertType === 'price_drop'}
          <div class="space-y-2">
            <Label>Threshold (%)</Label>
            <Input type="number" min="1" max="100" bind:value={newAlertThreshold} />
            <p class="text-muted-foreground text-xs">Alert when price drops by this percentage</p>
          </div>
        {/if}
      </div>
      <AlertDialog.Footer>
        <AlertDialog.Cancel>Cancel</AlertDialog.Cancel>
        <AlertDialog.Action onclick={handleCreateAlert}>
          Create Alert
        </AlertDialog.Action>
      </AlertDialog.Footer>
    </AlertDialog.Content>
  </AlertDialog.Root>
{/if}
