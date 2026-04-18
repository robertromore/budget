<script lang="ts">
import * as AlertDialog from '$lib/components/ui/alert-dialog';
import { Badge } from '$lib/components/ui/badge';
import { Button } from '$lib/components/ui/button';
import { Input } from '$lib/components/ui/input';
import { Label } from '$lib/components/ui/label';
import * as Select from '$lib/components/ui/select';
import { previewUrl, addProduct } from '$lib/query/price-watcher';
import { getCurrentWorkspace } from '$lib/query/workspaces';
import { currencyFormatter } from '$lib/utils/formatters';
import { hoursToUnit, unitToHours } from '../(data)/interval-utils';
import Package from '@lucide/svelte/icons/package';
import Loader2 from '@lucide/svelte/icons/loader-2';
import ChevronLeft from '@lucide/svelte/icons/chevron-left';

interface ProductPreviewData {
  url: string;
  retailer: string;
  retailerLogoUrl: string | null;
  name: string | null;
  price: number | null;
  currency: string | null;
  imageUrl: string | null;
  description: string | null;
  inStock: boolean;
}

interface Props {
  open: boolean;
}

let { open = $bindable(false) }: Props = $props();

// Read default interval from workspace prefs
const workspaceQuery = getCurrentWorkspace().options();
const workspace = $derived(workspaceQuery.data);
const defaultInterval = $derived.by(() => {
  const raw = workspace?.preferences;
  const parsed = typeof raw === 'string' ? JSON.parse(raw) : raw;
  const pw = parsed?.priceWatcher;
  if (pw?.defaultCheckInterval) {
    const converted = hoursToUnit(pw.defaultCheckInterval);
    return { value: String(converted.value), unit: converted.unit };
  }
  return { value: '6', unit: 'hours' };
});

let url = $state('');
let targetPrice = $state('');
let intervalValue = $state('6');
let intervalUnit = $state('hours');
let preview = $state<ProductPreviewData | null>(null);
let step = $state<'url' | 'preview'>('url');

const previewMutation = previewUrl.options();
const addMutation = addProduct.options();

function resetForm() {
  url = '';
  targetPrice = '';
  intervalValue = defaultInterval.value;
  intervalUnit = defaultInterval.unit;
  preview = null;
  step = 'url';
  previewMutation.reset();
  addMutation.reset();
}

async function handlePreview() {
  if (!url) return;
  try {
    const result = await previewMutation.mutateAsync({ url });
    preview = result;
    step = 'preview';
  } catch {
    // Error is shown via previewMutation.error
  }
}

async function handleSubmit() {
  if (!preview) return;
  const ci = Math.max(1, Math.round(unitToHours(intervalValue, intervalUnit)));
  try {
    await addMutation.mutateAsync({
      url: preview.url,
      targetPrice: targetPrice ? parseFloat(targetPrice) : undefined,
      checkInterval: ci,
    });
    resetForm();
    open = false;
  } catch {
    // Error is shown via addMutation.error
  }
}

function handleCancel() {
  resetForm();
  open = false;
}

function handleBack() {
  step = 'url';
  preview = null;
  previewMutation.reset();
}

function handleUrlKeydown(e: KeyboardEvent) {
  if (e.key === 'Enter') {
    e.preventDefault();
    handlePreview();
  }
}
</script>

<AlertDialog.Root bind:open>
  <AlertDialog.Content class="max-w-md">
    {#if step === 'url'}
      <!-- Step 1: Enter URL -->
      <AlertDialog.Header>
        <AlertDialog.Title>Add Product</AlertDialog.Title>
        <AlertDialog.Description>
          Paste a product URL to start tracking its price.
        </AlertDialog.Description>
      </AlertDialog.Header>

      <div class="space-y-4">
        <div class="space-y-2">
          <Label for="product-url">Product URL</Label>
          <Input
            id="product-url"
            type="url"
            placeholder="https://amazon.com/dp/..."
            bind:value={url}
            onkeydown={handleUrlKeydown}
            disabled={previewMutation.isPending}
            required />
        </div>

        {#if previewMutation.isPending}
          <div class="rounded-lg border p-3">
            <div class="flex gap-3">
              <div class="bg-muted h-16 w-16 shrink-0 animate-pulse rounded-md"></div>
              <div class="flex-1 space-y-2 py-1">
                <div class="bg-muted h-3.5 w-3/4 animate-pulse rounded"></div>
                <div class="bg-muted h-3 w-1/2 animate-pulse rounded"></div>
                <div class="bg-muted h-3 w-1/3 animate-pulse rounded"></div>
              </div>
            </div>
            <p class="text-muted-foreground mt-2 flex items-center gap-2 text-xs">
              <Loader2 class="h-3 w-3 animate-spin" />
              Fetching product info...
            </p>
          </div>
        {/if}

        {#if previewMutation.error}
          <p class="text-sm text-destructive">
            {previewMutation.error.message || 'Failed to fetch product info'}
          </p>
        {/if}
      </div>

      <AlertDialog.Footer>
        <AlertDialog.Cancel onclick={handleCancel}>Cancel</AlertDialog.Cancel>
        <Button
          onclick={handlePreview}
          disabled={!url.trim() || previewMutation.isPending}>
          {#if previewMutation.isPending}
            <Loader2 class="mr-2 h-4 w-4 animate-spin" />
            Fetching...
          {:else}
            Preview
          {/if}
        </Button>
      </AlertDialog.Footer>

    {:else}
      <!-- Step 2: Preview & Confirm -->
      <AlertDialog.Header>
        <AlertDialog.Title>Add Product</AlertDialog.Title>
        <AlertDialog.Description>
          Review the extracted info before adding.
        </AlertDialog.Description>
      </AlertDialog.Header>

      <div class="space-y-4">
        <!-- Preview Card -->
        {#if preview}
          <div class="rounded-lg border p-3">
            <div class="flex gap-3">
              {#if preview.imageUrl}
                <img
                  src={preview.imageUrl}
                  alt=""
                  class="h-16 w-16 shrink-0 rounded-md border object-cover" />
              {:else}
                <div class="bg-muted flex h-16 w-16 shrink-0 items-center justify-center rounded-md border">
                  <Package class="text-muted-foreground h-6 w-6" />
                </div>
              {/if}
              <div class="min-w-0 flex-1 space-y-1">
                <p class="text-sm font-medium leading-tight">
                  {preview.name || 'Unknown product'}
                </p>
                <div class="flex flex-wrap items-center gap-1.5">
                  <Badge variant="outline" class="text-[10px]">
                    {#if preview.retailerLogoUrl}
                      <img src={preview.retailerLogoUrl} alt="" class="mr-1 inline h-3 w-3 rounded" />
                    {/if}
                    {preview.retailer}
                  </Badge>
                  {#if preview.price !== null}
                    <span class="text-sm font-semibold">
                      {currencyFormatter.format(preview.price)}
                    </span>
                  {:else}
                    <span class="text-muted-foreground text-xs">No price found</span>
                  {/if}
                  {#if !preview.inStock}
                    <Badge variant="destructive" class="text-[10px]">Out of stock</Badge>
                  {/if}
                </div>
                {#if preview.description}
                  <p class="text-muted-foreground line-clamp-2 text-xs">{preview.description}</p>
                {/if}
              </div>
            </div>
          </div>
        {/if}

        <!-- Settings -->
        <div class="grid grid-cols-2 gap-4">
          <div class="space-y-2">
            <Label for="target-price">Target Price (optional)</Label>
            <Input
              id="target-price"
              type="number"
              step="0.01"
              min="0"
              placeholder="0.00"
              bind:value={targetPrice} />
          </div>
          <div class="space-y-2">
            <Label for="check-interval">Check Every</Label>
            <div class="flex gap-2">
              <Input
                id="check-interval"
                type="number"
                min="1"
                class="w-20"
                bind:value={intervalValue} />
              <Select.Root type="single" bind:value={intervalUnit}>
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
          </div>
        </div>

        {#if addMutation.error}
          <p class="text-sm text-destructive">
            {addMutation.error.message || 'Failed to add product'}
          </p>
        {/if}
      </div>

      <AlertDialog.Footer class="flex-row justify-between sm:justify-between">
        <Button variant="ghost" size="sm" onclick={handleBack}>
          <ChevronLeft class="mr-1 h-4 w-4" />
          Back
        </Button>
        <div class="flex gap-2">
          <AlertDialog.Cancel onclick={handleCancel}>Cancel</AlertDialog.Cancel>
          <Button
            onclick={handleSubmit}
            disabled={addMutation.isPending}>
            {addMutation.isPending ? 'Adding...' : 'Add Product'}
          </Button>
        </div>
      </AlertDialog.Footer>
    {/if}
  </AlertDialog.Content>
</AlertDialog.Root>
