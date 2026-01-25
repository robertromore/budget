<script lang="ts">
import { Button } from '$lib/components/ui/button';
import * as Dialog from '$lib/components/ui/dialog';
import * as Form from '$lib/components/ui/form';
import * as Select from '$lib/components/ui/select';
import { Input } from '$lib/components/ui/input';
import { Checkbox } from '$lib/components/ui/checkbox';
import NumericInput from '$lib/components/input/numeric-input.svelte';
import { EnhancedPayeeSelector } from '$lib/components/payees/enhanced-payee-selector';
import { rpc } from '$lib/query';
import { billingCycles, subscriptionStatuses, subscriptionTypes } from '$lib/schema/subscriptions';
import type { SubscriptionWithRelations } from '$lib/schema/subscriptions-table';
import CreditCard from '@lucide/svelte/icons/credit-card';
import Calendar from '@lucide/svelte/icons/calendar';
import DollarSign from '@lucide/svelte/icons/dollar-sign';

let {
  open = $bindable(false),
  subscription,
  onSaved,
}: {
  open?: boolean;
  subscription?: SubscriptionWithRelations;
  onSaved?: (subscription: SubscriptionWithRelations) => void;
} = $props();

const isEditing = $derived(!!subscription?.id);

// Form state
let name = $state(subscription?.name ?? '');
let type = $state(subscription?.type ?? 'other');
let billingCycle = $state(subscription?.billingCycle ?? 'monthly');
let amount = $state(subscription?.amount ?? 0);
let status = $state(subscription?.status ?? 'active');
let payeeId = $state<number | null>(subscription?.payeeId ?? null);
let renewalDate = $state(subscription?.renewalDate ?? '');
let startDate = $state(subscription?.startDate ?? new Date().toISOString().split('T')[0]);
let autoRenewal = $state(subscription?.autoRenewal ?? true);
let trialEndsAt = $state(subscription?.trialEndsAt ?? '');

// Reset form when subscription changes
$effect(() => {
  if (subscription) {
    name = subscription.name ?? '';
    type = subscription.type ?? 'other';
    billingCycle = subscription.billingCycle ?? 'monthly';
    amount = subscription.amount ?? 0;
    status = subscription.status ?? 'active';
    payeeId = subscription.payeeId ?? null;
    renewalDate = subscription.renewalDate ?? '';
    startDate = subscription.startDate ?? new Date().toISOString().split('T')[0];
    autoRenewal = subscription.autoRenewal ?? true;
    trialEndsAt = subscription.trialEndsAt ?? '';
  } else {
    name = '';
    type = 'other';
    billingCycle = 'monthly';
    amount = 0;
    status = 'active';
    payeeId = null;
    renewalDate = '';
    startDate = new Date().toISOString().split('T')[0];
    autoRenewal = true;
    trialEndsAt = '';
  }
});

// Mutations - .options() already returns createMutation result
const createMutationFn = rpc.subscriptions.create.options();
const updateMutationFn = rpc.subscriptions.update.options();

const isSubmitting = $derived(createMutationFn.isPending || updateMutationFn.isPending);

// Options
const typeOptions = subscriptionTypes.map((t) => ({
  value: t,
  label: t.charAt(0).toUpperCase() + t.slice(1).replace('_', ' '),
}));

const cycleOptions = billingCycles.map((c) => ({
  value: c,
  label: c.charAt(0).toUpperCase() + c.slice(1).replace('_', ' '),
}));

const statusOptions = subscriptionStatuses.map((s) => ({
  value: s,
  label: s.charAt(0).toUpperCase() + s.slice(1),
}));

async function handleSubmit(e: Event) {
  e.preventDefault();

  const data = {
    name,
    type,
    billingCycle,
    amount,
    status,
    payeeId,
    renewalDate: renewalDate || null,
    startDate: startDate || null,
    autoRenewal,
    trialEndsAt: trialEndsAt || null,
    isManuallyAdded: true,
    isUserConfirmed: true,
  };

  try {
    if (isEditing && subscription) {
      const result = await updateMutationFn.mutateAsync({
        id: subscription.id,
        ...data,
      });
      onSaved?.(result as SubscriptionWithRelations);
    } else {
      const result = await createMutationFn.mutateAsync(data);
      onSaved?.(result as SubscriptionWithRelations);
    }
    open = false;
  } catch (error) {
    console.error('Failed to save subscription:', error);
  }
}
</script>

<Dialog.Root bind:open>
  <Dialog.Content class="sm:max-w-[500px]">
    <Dialog.Header>
      <Dialog.Title class="flex items-center gap-2">
        <CreditCard class="h-5 w-5" />
        {isEditing ? 'Edit Subscription' : 'Add Subscription'}
      </Dialog.Title>
      <Dialog.Description>
        {isEditing
          ? 'Update the details of this subscription.'
          : 'Manually add a new subscription to track.'}
      </Dialog.Description>
    </Dialog.Header>

    <form onsubmit={handleSubmit} class="space-y-4">
      <!-- Name -->
      <div class="space-y-2">
        <label for="name" class="text-sm font-medium">Name</label>
        <Input id="name" bind:value={name} placeholder="e.g., Netflix, Spotify" required />
      </div>

      <!-- Type and Billing Cycle -->
      <div class="grid grid-cols-2 gap-4">
        <div class="space-y-2">
          <label for="type" class="text-sm font-medium">Type</label>
          <Select.Root type="single" bind:value={type}>
            <Select.Trigger>
              {typeOptions.find((o) => o.value === type)?.label ?? 'Select type'}
            </Select.Trigger>
            <Select.Content>
              {#each typeOptions as option}
                <Select.Item value={option.value}>{option.label}</Select.Item>
              {/each}
            </Select.Content>
          </Select.Root>
        </div>

        <div class="space-y-2">
          <label for="cycle" class="text-sm font-medium">Billing Cycle</label>
          <Select.Root type="single" bind:value={billingCycle}>
            <Select.Trigger>
              {cycleOptions.find((o) => o.value === billingCycle)?.label ?? 'Select cycle'}
            </Select.Trigger>
            <Select.Content>
              {#each cycleOptions as option}
                <Select.Item value={option.value}>{option.label}</Select.Item>
              {/each}
            </Select.Content>
          </Select.Root>
        </div>
      </div>

      <!-- Amount and Status -->
      <div class="grid grid-cols-2 gap-4">
        <div class="space-y-2">
          <label for="amount" class="text-sm font-medium flex items-center gap-1">
            <DollarSign class="h-4 w-4" />
            Amount
          </label>
          <NumericInput bind:value={amount} />
        </div>

        <div class="space-y-2">
          <label for="status" class="text-sm font-medium">Status</label>
          <Select.Root type="single" bind:value={status}>
            <Select.Trigger>
              {statusOptions.find((o) => o.value === status)?.label ?? 'Select status'}
            </Select.Trigger>
            <Select.Content>
              {#each statusOptions as option}
                <Select.Item value={option.value}>{option.label}</Select.Item>
              {/each}
            </Select.Content>
          </Select.Root>
        </div>
      </div>

      <!-- Payee Selector -->
      <div class="space-y-2">
        <label for="payee" class="text-sm font-medium">Linked Payee (Optional)</label>
        <EnhancedPayeeSelector
          value={payeeId}
          onValueChange={(id) => {
            payeeId = id ?? null;
          }}
          placeholder="Select a payee..."
        />
        <p class="text-muted-foreground text-xs">
          Link to a payee for automatic transaction tracking
        </p>
      </div>

      <!-- Dates -->
      <div class="grid grid-cols-2 gap-4">
        <div class="space-y-2">
          <label for="startDate" class="text-sm font-medium flex items-center gap-1">
            <Calendar class="h-4 w-4" />
            Start Date
          </label>
          <Input id="startDate" type="date" bind:value={startDate} />
        </div>

        <div class="space-y-2">
          <label for="renewalDate" class="text-sm font-medium">Next Renewal</label>
          <Input id="renewalDate" type="date" bind:value={renewalDate} />
        </div>
      </div>

      <!-- Trial End Date (only show if status is trial) -->
      {#if status === 'trial'}
        <div class="space-y-2">
          <label for="trialEndsAt" class="text-sm font-medium">Trial Ends</label>
          <Input id="trialEndsAt" type="date" bind:value={trialEndsAt} />
        </div>
      {/if}

      <!-- Auto Renewal -->
      <div class="flex items-center space-x-2">
        <Checkbox
          id="autoRenewal"
          checked={autoRenewal}
          onCheckedChange={(checked) => {
            autoRenewal = checked === true;
          }}
        />
        <label for="autoRenewal" class="text-sm font-medium leading-none">
          Auto-renewal enabled
        </label>
      </div>

      <Dialog.Footer>
        <Button type="button" variant="outline" onclick={() => (open = false)}>
          Cancel
        </Button>
        <Button type="submit" disabled={isSubmitting || !name || amount <= 0}>
          {isSubmitting ? 'Saving...' : isEditing ? 'Update' : 'Add Subscription'}
        </Button>
      </Dialog.Footer>
    </form>
  </Dialog.Content>
</Dialog.Root>
