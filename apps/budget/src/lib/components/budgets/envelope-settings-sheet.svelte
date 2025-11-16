<script lang="ts">
import ResponsiveSheet from '$lib/components/ui/responsive-sheet/responsive-sheet.svelte';
import * as Sheet from '$lib/components/ui/sheet';
import * as Select from '$lib/components/ui/select';
import {Button} from '$lib/components/ui/button';
import {Input} from '$lib/components/ui/input';
import Label from '$lib/components/ui/label/label.svelte';
import {Badge} from '$lib/components/ui/badge';
import {Switch} from '$lib/components/ui/switch';
import type {EnvelopeAllocation, RolloverMode} from '$lib/schema/budgets/envelope-allocations';
import {Settings2} from '@lucide/svelte/icons';

interface Props {
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  envelope: EnvelopeAllocation;
  categoryName: string;
  onSettingsUpdated?: (updates: Partial<EnvelopeAllocation>) => void;
}

let {
  open = $bindable(false),
  onOpenChange,
  envelope,
  categoryName,
  onSettingsUpdated,
}: Props = $props();

// Initialize state from envelope
let rolloverMode = $state<RolloverMode>(envelope.rolloverMode);
let priority = $state(String((envelope.metadata as any)?.priority ?? 5));
let maxRolloverMonths = $state(String((envelope.metadata as any)?.maxRolloverMonths ?? 3));
let isEmergencyFund = $state((envelope.metadata as any)?.isEmergencyFund ?? false);
let autoRefill = $state(!!(envelope.metadata as any)?.autoRefill);
let autoRefillAmount = $state(String((envelope.metadata as any)?.autoRefill ?? ''));

const rolloverModeOptions = [
  {value: 'unlimited', label: 'Unlimited', description: 'Rollover all unused funds indefinitely'},
  {value: 'limited', label: 'Limited', description: 'Rollover for a specific number of months'},
  {value: 'reset', label: 'Reset', description: 'Clear unused funds at period end'},
];

// Reset form when envelope changes
$effect(() => {
  rolloverMode = envelope.rolloverMode;
  priority = String((envelope.metadata as any)?.priority ?? 5);
  maxRolloverMonths = String((envelope.metadata as any)?.maxRolloverMonths ?? 3);
  isEmergencyFund = (envelope.metadata as any)?.isEmergencyFund ?? false;
  const refillValue = (envelope.metadata as any)?.autoRefill;
  autoRefill = !!refillValue;
  autoRefillAmount = refillValue ? String(refillValue) : '';
});

function handleClose() {
  open = false;
}

async function handleSubmit(e: Event) {
  e.preventDefault();

  const metadata: Record<string, unknown> = {
    ...envelope.metadata,
    priority: Number(priority),
    isEmergencyFund,
  };

  if (rolloverMode === 'limited') {
    metadata['maxRolloverMonths'] = Number(maxRolloverMonths);
  } else {
    delete metadata['maxRolloverMonths'];
  }

  if (autoRefill && autoRefillAmount) {
    metadata['autoRefill'] = Number(autoRefillAmount);
  } else {
    delete metadata['autoRefill'];
  }

  const updates: Partial<EnvelopeAllocation> = {
    rolloverMode,
    metadata: metadata as any,
  };

  onSettingsUpdated?.(updates);
  handleClose();
}
</script>

<ResponsiveSheet bind:open {onOpenChange}>
  {#snippet header()}
    <div class="flex items-center gap-2">
      <Settings2 class="h-5 w-5" />
      <div>
        <Sheet.Title>Envelope Settings</Sheet.Title>
        <Sheet.Description>
          Configure rollover rules and priority for <strong>{categoryName}</strong>
        </Sheet.Description>
      </div>
    </div>
  {/snippet}

  {#snippet content()}
    <form onsubmit={handleSubmit} class="space-y-6">
      <!-- Rollover Mode -->
      <div class="space-y-3">
        <Label class="text-base font-semibold">Rollover Settings</Label>
        <div class="space-y-2">
          <Label for="rollover-mode">Rollover Mode</Label>
          <Select.Root type="single" bind:value={rolloverMode}>
            <Select.Trigger id="rollover-mode">
              <span
                >{rolloverModeOptions.find((option) => option.value === rolloverMode)?.label}</span>
            </Select.Trigger>
            <Select.Content>
              {#each rolloverModeOptions as option (option.value)}
                <Select.Item value={option.value}>
                  <div class="flex flex-col">
                    <span>{option.label}</span>
                    <span class="text-muted-foreground text-xs">{option.description}</span>
                  </div>
                </Select.Item>
              {/each}
            </Select.Content>
          </Select.Root>
        </div>

        <!-- Limited Rollover Settings -->
        {#if rolloverMode === 'limited'}
          <div class="border-muted space-y-2 border-l-2 pl-4">
            <Label for="max-rollover">Max Rollover Months</Label>
            <Input
              id="max-rollover"
              type="number"
              min="1"
              max="12"
              bind:value={maxRolloverMonths}
              placeholder="3"
              class="w-32" />
            <p class="text-muted-foreground text-xs">
              Unused funds will be reset after rolling over for this many months
            </p>
          </div>
        {/if}
      </div>

      <!-- Priority Setting -->
      <div class="space-y-3">
        <Label class="text-base font-semibold">Priority Settings</Label>
        <div class="space-y-2">
          <Label for="priority">Priority Level</Label>
          <Select.Root type="single" bind:value={priority}>
            <Select.Trigger id="priority">
              <span
                >{priority} -
                {[
                  'Highest Priority',
                  'High Priority',
                  'Medium-High Priority',
                  'Medium Priority',
                  'Normal Priority',
                  'Low Priority',
                  'Lowest Priority',
                ][Number(priority) - 1]}</span>
            </Select.Trigger>
            <Select.Content>
              <Select.Item value="1">1 - Highest Priority</Select.Item>
              <Select.Item value="2">2 - High Priority</Select.Item>
              <Select.Item value="3">3 - Medium-High Priority</Select.Item>
              <Select.Item value="4">4 - Medium Priority</Select.Item>
              <Select.Item value="5">5 - Normal Priority</Select.Item>
              <Select.Item value="6">6 - Low Priority</Select.Item>
              <Select.Item value="7">7 - Lowest Priority</Select.Item>
            </Select.Content>
          </Select.Root>
          <p class="text-muted-foreground text-xs">
            Used for automatic fund allocation and deficit recovery
          </p>
        </div>
      </div>

      <!-- Special Options -->
      <div class="space-y-3">
        <Label class="text-base font-semibold">Special Options</Label>

        <div class="border-muted space-y-4 border-l-2 pl-4">
          <!-- Emergency Fund -->
          <div class="space-y-2">
            <div class="flex items-center justify-between">
              <Label for="emergency-fund" class="text-sm font-medium">Emergency Fund</Label>
              <Switch id="emergency-fund" bind:checked={isEmergencyFund} />
            </div>
            {#if isEmergencyFund}
              <p class="text-muted-foreground text-xs">
                This envelope will be used as a source for deficit recovery and have special
                priority handling
              </p>
            {/if}
          </div>

          <!-- Auto Refill -->
          <div class="space-y-2">
            <div class="flex items-center justify-between">
              <Label for="auto-refill" class="text-sm font-medium">Auto-refill on rollover</Label>
              <Switch id="auto-refill" bind:checked={autoRefill} />
            </div>
            {#if autoRefill}
              <div class="mt-2 space-y-2">
                <Label for="auto-refill-amount" class="text-sm">Minimum Balance</Label>
                <Input
                  id="auto-refill-amount"
                  type="number"
                  step="0.01"
                  min="0"
                  bind:value={autoRefillAmount}
                  placeholder="0.00"
                  class="w-32" />
                <p class="text-muted-foreground text-xs">
                  Minimum amount to maintain in this envelope after rollover
                </p>
              </div>
            {/if}
          </div>
        </div>
      </div>

      <!-- Current Settings Preview -->
      <div class="bg-muted/50 space-y-2 rounded-lg border p-4">
        <h4 class="text-sm font-medium">Current Settings</h4>
        <div class="grid grid-cols-2 gap-2 text-xs">
          <div>
            <span class="text-muted-foreground">Rollover:</span>
            <span class="ml-2 capitalize">{rolloverMode}</span>
          </div>
          <div>
            <span class="text-muted-foreground">Priority:</span>
            <span class="ml-2">{priority}</span>
          </div>
          {#if rolloverMode === 'limited'}
            <div>
              <span class="text-muted-foreground">Max Months:</span>
              <span class="ml-2">{maxRolloverMonths}</span>
            </div>
          {/if}
          {#if isEmergencyFund}
            <div class="col-span-2">
              <Badge variant="destructive" class="text-xs">Emergency Fund</Badge>
            </div>
          {/if}
        </div>
      </div>
    </form>
  {/snippet}

  {#snippet footer()}
    <div class="flex w-full gap-2">
      <Button type="button" variant="outline" onclick={handleClose} class="flex-1">Cancel</Button>
      <Button type="submit" onclick={handleSubmit} class="flex-1">Save Settings</Button>
    </div>
  {/snippet}
</ResponsiveSheet>
