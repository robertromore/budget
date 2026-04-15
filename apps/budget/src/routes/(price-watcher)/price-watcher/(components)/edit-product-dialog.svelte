<script lang="ts">
import * as AlertDialog from '$lib/components/ui/alert-dialog';
import { Input } from '$lib/components/ui/input';
import { Label } from '$lib/components/ui/label';
import * as Select from '$lib/components/ui/select';
import { Textarea } from '$lib/components/ui/textarea';
import { updateProduct } from '$lib/query/price-watcher';
import type { PriceProduct } from '$core/schema/price-products';
import { hoursToUnit, unitToHours } from '../(data)/interval-utils';

interface Props {
  open: boolean;
  product: PriceProduct;
}

let { open = $bindable(false), product }: Props = $props();

let name = $state('');
let targetPrice = $state('');
let intervalValue = $state('');
let intervalUnit = $state('hours');
let status = $state('active');
let notes = $state('');

const updateMutation = updateProduct.options();

// Populate form when dialog opens
$effect(() => {
  if (open) {
    name = product.name;
    targetPrice = product.targetPrice?.toString() ?? '';
    const decomposed = hoursToUnit(product.checkInterval ?? 6);
    intervalValue = decomposed.value;
    intervalUnit = decomposed.unit;
    status = product.status;
    notes = product.notes ?? '';
  }
});

async function handleSave() {
  const tp = targetPrice ? parseFloat(targetPrice) : null;
  const ci = Math.max(1, Math.round(unitToHours(intervalValue, intervalUnit)));

  await updateMutation.mutateAsync({
    id: product.id,
    data: {
      name: name || undefined,
      targetPrice: tp !== null && !isNaN(tp) ? tp : null,
      checkInterval: ci,
      status: status as 'active' | 'paused',
      notes: notes || null,
    },
  });

  open = false;
}
</script>

<AlertDialog.Root bind:open>
  <AlertDialog.Content class="max-w-md">
    <AlertDialog.Header>
      <AlertDialog.Title>Edit Product</AlertDialog.Title>
    </AlertDialog.Header>

    <div class="space-y-4">
      <div class="space-y-2">
        <Label for="edit-name">Name</Label>
        <Input id="edit-name" bind:value={name} />
      </div>

      <div class="grid grid-cols-2 gap-4">
        <div class="space-y-2">
          <Label for="edit-target">Target Price</Label>
          <Input
            id="edit-target"
            type="number"
            step="0.01"
            min="0"
            placeholder="None"
            bind:value={targetPrice} />
        </div>
        <div class="space-y-2">
          <Label for="edit-interval">Check Every</Label>
          <div class="flex gap-2">
            <Input
              id="edit-interval"
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

      <div class="space-y-2">
        <Label>Status</Label>
        <Select.Root type="single" bind:value={status}>
          <Select.Trigger>{status === 'active' ? 'Active' : 'Paused'}</Select.Trigger>
          <Select.Content>
            <Select.Item value="active">Active</Select.Item>
            <Select.Item value="paused">Paused</Select.Item>
          </Select.Content>
        </Select.Root>
      </div>

      <div class="space-y-2">
        <Label for="edit-notes">Notes</Label>
        <Textarea
          id="edit-notes"
          rows={3}
          placeholder="Optional notes..."
          class="resize-none"
          bind:value={notes} />
      </div>
    </div>

    <AlertDialog.Footer>
      <AlertDialog.Cancel>Cancel</AlertDialog.Cancel>
      <AlertDialog.Action
        onclick={handleSave}
        disabled={updateMutation.isPending}>
        {updateMutation.isPending ? 'Saving...' : 'Save'}
      </AlertDialog.Action>
    </AlertDialog.Footer>
  </AlertDialog.Content>
</AlertDialog.Root>
