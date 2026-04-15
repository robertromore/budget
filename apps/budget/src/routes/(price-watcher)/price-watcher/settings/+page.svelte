<script lang="ts">
import * as Card from '$lib/components/ui/card';
import { Input } from '$lib/components/ui/input';
import { Label } from '$lib/components/ui/label';
import * as Select from '$lib/components/ui/select';
import { Switch } from '$lib/components/ui/switch';
import { getCurrentWorkspace, updateWorkspacePreferences } from '$lib/query/workspaces';
import type { PriceWatcherPreferences } from '$core/schema/workspaces';
import { hoursToUnit, unitToHours } from '../(data)/interval-utils';

const workspaceQuery = getCurrentWorkspace().options();
const workspace = $derived(workspaceQuery.data);
const updateMut = updateWorkspacePreferences().options();

const prefs = $derived.by((): PriceWatcherPreferences => {
  const raw = workspace?.preferences;
  const parsed = typeof raw === 'string' ? JSON.parse(raw) : raw;
  return parsed?.priceWatcher ?? {};
});

// Local state derived from prefs
let intervalValue = $state('');
let intervalUnit = $state('hours');
let pauseAfterErrors = $state('3');
let notifyPriceDrop = $state(true);
let notifyTargetReached = $state(true);
let notifyBackInStock = $state(true);
let notifyAnyChange = $state(false);
let notifyErrors = $state(true);

// Sync from prefs when loaded
let synced = $state(false);
$effect(() => {
  if (workspace && !synced) {
    const defaultHours = prefs.defaultCheckInterval ?? 6;
    const unit = prefs.defaultCheckUnit ?? 'hours';
    const converted = hoursToUnit(defaultHours);
    intervalValue = String(converted.value);
    intervalUnit = converted.unit;

    pauseAfterErrors = String(prefs.pauseOnConsecutiveErrors ?? 3);

    const n = prefs.notifications ?? {};
    notifyPriceDrop = n.priceDrop ?? true;
    notifyTargetReached = n.targetReached ?? true;
    notifyBackInStock = n.backInStock ?? true;
    notifyAnyChange = n.anyChange ?? false;
    notifyErrors = n.errors ?? true;

    synced = true;
  }
});

// Reset sync when workspace changes
$effect(() => {
  workspace?.id;
  synced = false;
});

async function save() {
  if (!workspace) return;
  const hours = Math.max(0.0167, unitToHours(intervalValue, intervalUnit));

  const raw = typeof workspace.preferences === 'string'
    ? JSON.parse(workspace.preferences)
    : workspace.preferences ?? {};

  const priceWatcher: PriceWatcherPreferences = {
    defaultCheckInterval: hours,
    defaultCheckUnit: intervalUnit as any,
    pauseOnConsecutiveErrors: Math.max(1, parseInt(pauseAfterErrors) || 3),
    notifications: {
      priceDrop: notifyPriceDrop,
      targetReached: notifyTargetReached,
      backInStock: notifyBackInStock,
      anyChange: notifyAnyChange,
      errors: notifyErrors,
    },
  };

  await updateMut.mutateAsync({
    workspaceId: workspace.id,
    preferences: { ...raw, priceWatcher },
  });
}

let saveTimeout: ReturnType<typeof setTimeout> | undefined;
function debouncedSave() {
  clearTimeout(saveTimeout);
  saveTimeout = setTimeout(save, 600);
}
</script>

<svelte:head>
  <title>Settings - Price Watcher</title>
</svelte:head>

<div class="space-y-6">
  <div>
    <h1 class="text-2xl font-bold tracking-tight">Settings</h1>
    <p class="text-muted-foreground text-sm">Configure price watcher defaults and notifications</p>
  </div>

  <!-- Default Check Interval -->
  <Card.Root>
    <Card.Header>
      <Card.Title class="text-base">Default Check Interval</Card.Title>
      <Card.Description>
        How often new products are checked by default. You can override this per product.
      </Card.Description>
    </Card.Header>
    <Card.Content>
      <div class="flex items-center gap-2">
        <Label for="interval-value" class="sr-only">Interval</Label>
        <Input
          id="interval-value"
          type="number"
          min="1"
          class="w-20"
          bind:value={intervalValue}
          onchange={debouncedSave} />
        <Select.Root
          type="single"
          value={intervalUnit}
          onValueChange={(v) => { intervalUnit = v; debouncedSave(); }}>
          <Select.Trigger class="w-28">
            {intervalUnit === 'minutes' ? 'Minutes' : intervalUnit === 'hours' ? 'Hours' : intervalUnit === 'days' ? 'Days' : 'Weeks'}
          </Select.Trigger>
          <Select.Content>
            <Select.Item value="minutes">Minutes</Select.Item>
            <Select.Item value="hours">Hours</Select.Item>
            <Select.Item value="days">Days</Select.Item>
            <Select.Item value="weeks">Weeks</Select.Item>
          </Select.Content>
        </Select.Root>
      </div>
    </Card.Content>
  </Card.Root>

  <!-- Error Handling -->
  <Card.Root>
    <Card.Header>
      <Card.Title class="text-base">Error Handling</Card.Title>
      <Card.Description>
        Products are paused after consecutive check failures.
      </Card.Description>
    </Card.Header>
    <Card.Content>
      <div class="flex items-center gap-2">
        <Label for="pause-errors">Pause after</Label>
        <Input
          id="pause-errors"
          type="number"
          min="1"
          max="20"
          class="w-16"
          bind:value={pauseAfterErrors}
          onchange={debouncedSave} />
        <span class="text-muted-foreground text-sm">consecutive failures</span>
      </div>
    </Card.Content>
  </Card.Root>

  <!-- Notification Preferences -->
  <Card.Root>
    <Card.Header>
      <Card.Title class="text-base">Notifications</Card.Title>
      <Card.Description>
        Choose which alert types send notifications. Individual alerts are still configured per product.
      </Card.Description>
    </Card.Header>
    <Card.Content>
      <div class="space-y-4">
        <div class="flex items-center justify-between">
          <div>
            <p class="text-sm font-medium">Price Drops</p>
            <p class="text-muted-foreground text-xs">When a product's price drops by the alert threshold</p>
          </div>
          <Switch
            checked={notifyPriceDrop}
            onCheckedChange={(v) => { notifyPriceDrop = v; debouncedSave(); }} />
        </div>

        <div class="flex items-center justify-between">
          <div>
            <p class="text-sm font-medium">Target Reached</p>
            <p class="text-muted-foreground text-xs">When a product hits or goes below its target price</p>
          </div>
          <Switch
            checked={notifyTargetReached}
            onCheckedChange={(v) => { notifyTargetReached = v; debouncedSave(); }} />
        </div>

        <div class="flex items-center justify-between">
          <div>
            <p class="text-sm font-medium">Back in Stock</p>
            <p class="text-muted-foreground text-xs">When an out-of-stock product becomes available</p>
          </div>
          <Switch
            checked={notifyBackInStock}
            onCheckedChange={(v) => { notifyBackInStock = v; debouncedSave(); }} />
        </div>

        <div class="flex items-center justify-between">
          <div>
            <p class="text-sm font-medium">Any Price Change</p>
            <p class="text-muted-foreground text-xs">Notified on every price change, no matter how small</p>
          </div>
          <Switch
            checked={notifyAnyChange}
            onCheckedChange={(v) => { notifyAnyChange = v; debouncedSave(); }} />
        </div>

        <div class="flex items-center justify-between">
          <div>
            <p class="text-sm font-medium">Check Errors</p>
            <p class="text-muted-foreground text-xs">When a product fails to check or is auto-paused</p>
          </div>
          <Switch
            checked={notifyErrors}
            onCheckedChange={(v) => { notifyErrors = v; debouncedSave(); }} />
        </div>
      </div>
    </Card.Content>
  </Card.Root>

  {#if updateMut.isPending}
    <p class="text-muted-foreground text-xs">Saving...</p>
  {/if}
</div>
