<script lang="ts">
import { Badge } from '$lib/components/ui/badge';
import { Button } from '$lib/components/ui/button';
import * as Empty from '$lib/components/ui/empty';
import { listAlerts, updateAlert, deleteAlert as deleteAlertMutation } from '$lib/query/price-watcher';
import Bell from '@lucide/svelte/icons/bell';
import Trash2 from '@lucide/svelte/icons/trash-2';

const alertsQuery = listAlerts().options();
const alerts = $derived(alertsQuery.data ?? []);
const isLoading = $derived(alertsQuery.isLoading);

const updateMutation = updateAlert.options();
const deleteMutation = deleteAlertMutation.options();

async function handleToggle(alertId: number, enabled: boolean) {
  await updateMutation.mutateAsync({ id: alertId, data: { enabled: !enabled } });
}

async function handleDelete(alertId: number) {
  await deleteMutation.mutateAsync({ id: alertId });
}

function getTypeLabel(type: string): string {
  switch (type) {
    case 'price_drop': return 'Price Drop';
    case 'target_reached': return 'Target Reached';
    case 'back_in_stock': return 'Back in Stock';
    case 'any_change': return 'Any Change';
    default: return type;
  }
}

function getTypeVariant(type: string) {
  switch (type) {
    case 'price_drop': return 'text-success';
    case 'target_reached': return 'text-info';
    case 'back_in_stock': return 'text-warning';
    case 'any_change': return 'text-muted-foreground';
    default: return '';
  }
}
</script>

<svelte:head>
  <title>Alerts - Price Watcher</title>
  <meta name="description" content="Manage price drop alerts" />
</svelte:head>

<div class="space-y-6">
  <div>
    <h1 class="text-2xl font-bold tracking-tight">Alerts</h1>
    <p class="text-muted-foreground text-sm">{alerts.length} alert rules</p>
  </div>

  {#if isLoading}
    <div class="space-y-3">
      {#each Array(4) as _}
        <div class="rounded-lg border p-4">
          <div class="bg-muted h-4 w-1/3 animate-pulse rounded"></div>
          <div class="bg-muted mt-2 h-3 w-1/2 animate-pulse rounded"></div>
        </div>
      {/each}
    </div>
  {:else if alerts.length === 0}
    <Empty.Empty>
      <Empty.EmptyMedia variant="icon">
        <Bell class="size-6" />
      </Empty.EmptyMedia>
      <Empty.EmptyHeader>
        <Empty.EmptyTitle>No Alerts</Empty.EmptyTitle>
        <Empty.EmptyDescription>
          Add alerts from a product's detail page to get notified about price changes.
        </Empty.EmptyDescription>
      </Empty.EmptyHeader>
      <Empty.EmptyContent>
        <Button variant="outline" href="/price-watcher/products">
          Browse Products
        </Button>
      </Empty.EmptyContent>
    </Empty.Empty>
  {:else}
    <div class="space-y-2">
      {#each alerts as alert (alert.id)}
        <div class="flex items-center justify-between rounded-lg border p-4">
          <div class="flex items-center gap-3">
            <div class={getTypeVariant(alert.type)}>
              <Bell class="h-4 w-4" />
            </div>
            <div>
              <div class="flex items-center gap-2">
                <Badge variant="outline" class="text-xs">{getTypeLabel(alert.type)}</Badge>
                {#if alert.type === 'price_drop' && alert.threshold}
                  <span class="text-muted-foreground text-xs">{alert.threshold}% threshold</span>
                {/if}
                {#if !alert.enabled}
                  <Badge variant="secondary" class="text-xs">Disabled</Badge>
                {/if}
              </div>
              {#if alert.lastTriggeredAt}
                <p class="text-muted-foreground mt-1 text-xs">
                  Last triggered: {new Date(alert.lastTriggeredAt).toLocaleString()}
                </p>
              {/if}
            </div>
          </div>
          <div class="flex items-center gap-2">
            <Button
              variant={alert.enabled ? 'default' : 'outline'}
              size="sm"
              onclick={() => handleToggle(alert.id, alert.enabled)}>
              {alert.enabled ? 'Enabled' : 'Disabled'}
            </Button>
            <Button
              variant="ghost"
              size="sm"
              class="h-8 w-8 p-0"
              onclick={() => handleDelete(alert.id)}>
              <Trash2 class="h-4 w-4" />
            </Button>
          </div>
        </div>
      {/each}
    </div>
  {/if}
</div>
