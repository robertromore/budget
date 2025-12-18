<script lang="ts">
import { Button } from '$lib/components/ui/button';
import { Input } from '$lib/components/ui/input';
import { Label } from '$lib/components/ui/label';
import ResponsiveSheet from '$lib/components/ui/responsive-sheet/responsive-sheet.svelte';
import * as Sheet from '$lib/components/ui/sheet';
import type { BudgetPeriodInstance } from '$lib/schema/budgets';
import { trpc } from '$lib/trpc/client';
import { currentDate, formatDateDisplay, parseISOString } from '$lib/utils/dates';
import { currencyFormatter } from '$lib/utils/formatters';
import { toast } from 'svelte-sonner';

interface Props {
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  instance: BudgetPeriodInstance | null;
  onSuccess?: () => void;
}

let { open = $bindable(false), onOpenChange, instance, onSuccess }: Props = $props();

let allocatedAmount = $state(0);
let isSubmitting = $state(false);

// Update form when instance changes
$effect(() => {
  if (instance) {
    allocatedAmount = instance.allocatedAmount;
  }
});

async function handleSubmit(e: Event) {
  e.preventDefault();
  if (!instance) return;

  isSubmitting = true;
  try {
    await trpc().budgetRoutes.updatePeriodInstance.mutate({
      instanceId: instance.id,
      allocatedAmount,
    });

    toast.success('Period instance updated successfully');
    open = false;
    onSuccess?.();
  } catch (error) {
    console.error('Failed to update period instance:', error);
    toast.error('Failed to update period instance');
  } finally {
    isSubmitting = false;
  }
}

function handleClose() {
  open = false;
}
</script>

{#if instance}
  <ResponsiveSheet bind:open {onOpenChange}>
    {#snippet header()}
      <Sheet.Title>Edit Period Instance</Sheet.Title>
      <Sheet.Description>Adjust the allocated amount for this budget period</Sheet.Description>
    {/snippet}

    {#snippet content()}
      <form onsubmit={handleSubmit} class="space-y-6">
        <!-- Period Info (Read-only) -->
        <div class="bg-muted/50 space-y-4 rounded-lg border p-4">
          <div class="grid grid-cols-2 gap-4 text-sm">
            <div>
              <span class="text-muted-foreground">Start Date</span>
              <p class="font-medium">
                {formatDateDisplay(parseISOString(instance.startDate) || currentDate, 'medium')}
              </p>
            </div>
            <div>
              <span class="text-muted-foreground">End Date</span>
              <p class="font-medium">
                {formatDateDisplay(parseISOString(instance.endDate) || currentDate, 'medium')}
              </p>
            </div>
            <div>
              <span class="text-muted-foreground">Rollover Amount</span>
              <p class="font-medium">{currencyFormatter.format(instance.rolloverAmount)}</p>
            </div>
            <div>
              <span class="text-muted-foreground">Actual Spent</span>
              <p class="font-medium">{currencyFormatter.format(instance.actualAmount)}</p>
            </div>
          </div>
        </div>

        <!-- Editable Fields -->
        <div class="space-y-4">
          <div class="space-y-2">
            <Label for="allocated">Allocated Amount</Label>
            <Input
              id="allocated"
              type="number"
              step="0.01"
              min="0"
              bind:value={allocatedAmount}
              required
              placeholder="0.00" />
            <p class="text-muted-foreground text-xs">The total amount allocated for this period</p>
          </div>

          <div class="bg-muted/30 rounded-lg border p-4">
            <div class="space-y-2 text-sm">
              <div class="flex justify-between">
                <span class="text-muted-foreground">New Allocated:</span>
                <span class="font-medium">{currencyFormatter.format(allocatedAmount)}</span>
              </div>
              <div class="flex justify-between">
                <span class="text-muted-foreground">Rollover:</span>
                <span class="font-medium">{currencyFormatter.format(instance.rolloverAmount)}</span>
              </div>
              <div class="flex justify-between">
                <span class="text-muted-foreground">Already Spent:</span>
                <span class="font-medium">{currencyFormatter.format(instance.actualAmount)}</span>
              </div>
              <div class="mt-2 flex justify-between border-t pt-2 font-semibold">
                <span>Remaining:</span>
                <span
                  class={allocatedAmount + instance.rolloverAmount - instance.actualAmount < 0
                    ? 'text-destructive'
                    : 'text-primary'}>
                  {currencyFormatter.format(
                    allocatedAmount + instance.rolloverAmount - instance.actualAmount
                  )}
                </span>
              </div>
            </div>
          </div>
        </div>
      </form>
    {/snippet}

    {#snippet footer()}
      <div class="flex w-full gap-2">
        <Button type="button" variant="outline" onclick={handleClose} class="flex-1">Cancel</Button>
        <Button type="submit" onclick={handleSubmit} disabled={isSubmitting} class="flex-1">
          {isSubmitting ? 'Saving...' : 'Save Changes'}
        </Button>
      </div>
    {/snippet}
  </ResponsiveSheet>
{/if}
