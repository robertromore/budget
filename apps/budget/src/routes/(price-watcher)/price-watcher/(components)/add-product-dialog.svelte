<script lang="ts">
import * as AlertDialog from '$lib/components/ui/alert-dialog';
import { Button } from '$lib/components/ui/button';
import { Input } from '$lib/components/ui/input';
import { Label } from '$lib/components/ui/label';
import { addProduct } from '$lib/query/price-watcher';

interface Props {
  open: boolean;
}

let { open = $bindable(false) }: Props = $props();

let url = $state('');
let targetPrice = $state('');
let checkInterval = $state('6');

const addMutation = addProduct.options();

// Reset error state when dialog opens
$effect(() => {
  if (open) {
    addMutation.reset();
  }
});

async function handleSubmit() {
  if (!url) return;

  await addMutation.mutateAsync({
    url,
    targetPrice: targetPrice ? parseFloat(targetPrice) : undefined,
    checkInterval: checkInterval ? parseInt(checkInterval) : undefined,
  });

  url = '';
  targetPrice = '';
  checkInterval = '6';
  open = false;
}

function handleCancel() {
  url = '';
  targetPrice = '';
  checkInterval = '6';
  open = false;
}
</script>

<AlertDialog.Root bind:open>
  <AlertDialog.Content class="max-w-md">
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
          required />
      </div>

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
          <Label for="check-interval">Check Every (hours)</Label>
          <Input
            id="check-interval"
            type="number"
            min="1"
            max="168"
            bind:value={checkInterval} />
        </div>
      </div>

      {#if addMutation.error}
        <p class="text-sm text-destructive">
          {addMutation.error.message || 'Failed to add product'}
        </p>
      {/if}
    </div>

    <AlertDialog.Footer>
      <AlertDialog.Cancel onclick={handleCancel}>Cancel</AlertDialog.Cancel>
      <AlertDialog.Action
        onclick={handleSubmit}
        disabled={!url || addMutation.isPending}>
        {addMutation.isPending ? 'Adding...' : 'Add Product'}
      </AlertDialog.Action>
    </AlertDialog.Footer>
  </AlertDialog.Content>
</AlertDialog.Root>
