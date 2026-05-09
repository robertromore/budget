<script lang="ts">
import { Button } from '$lib/components/ui/button';
import { Input } from '$lib/components/ui/input';
import { Label } from '$lib/components/ui/label';
import * as Select from '$lib/components/ui/select';
import { Textarea } from '$lib/components/ui/textarea';
import { ResponsiveSheet } from '$lib/components/ui/responsive-sheet';
import { rpc } from '$lib/query';
import { AccountsState } from '$lib/states/entities/accounts.svelte';
import { GOAL_TYPE_LABELS, type GoalWithProgress } from '$core/query/financial-goals';
import { goalTypeEnum, type GoalType } from '$core/schema/financial-goals';

interface Props {
  open?: boolean;
  goal?: GoalWithProgress | null;
  onClose?: () => void;
}

let { open = $bindable(false), goal = null, onClose }: Props = $props();

const saveMutation = rpc.financialGoals.saveGoal.options();

const accountsState = $derived(AccountsState.get());
const accounts = $derived(
  Array.from(accountsState.accounts.values()).filter((a) => !a.closed && !a.deletedAt)
);

// Form state — populated by the $effect below when the sheet opens
let name = $state('');
let goalType = $state<GoalType>('savings_target');
let targetAmount = $state('');
let targetDate = $state('');
let accountId = $state('');
let notes = $state('');

// Reset form whenever the sheet opens with new goal data.
// Reference `goal` unconditionally so the effect re-runs when the prop changes.
$effect(() => {
  const g = goal;
  if (open) {
    name = g?.name ?? '';
    goalType = (g?.goalType ?? 'savings_target') as GoalType;
    targetAmount = g?.targetAmount?.toString() ?? '';
    targetDate = g?.targetDate ?? '';
    accountId = g?.accountId?.toString() ?? '';
    notes = g?.notes ?? '';
  }
});

const isEditing = $derived(goal != null);
const isSaving = $derived(saveMutation.isPending);

async function handleSubmit(e: SubmitEvent) {
  e.preventDefault();
  const amount = parseFloat(targetAmount);
  if (!name.trim() || isNaN(amount) || amount <= 0) return;

  await saveMutation.mutateAsync({
    id: goal?.id,
    name: name.trim(),
    goalType,
    targetAmount: amount,
    targetDate: targetDate || null,
    accountId: accountId ? parseInt(accountId) : null,
    notes: notes.trim() || null,
  });

  open = false;
  onClose?.();
}

const goalTypeAccessors = {
  get: () => goalType,
  set: (v: string) => { goalType = v as GoalType; },
};

const accountIdAccessors = {
  get: () => accountId,
  set: (v: string) => { accountId = v; },
};
</script>

<ResponsiveSheet bind:open defaultWidth={520} minWidth={400} maxWidth={700}>
  {#snippet header()}
    <div class="pb-2">
      <h2 class="text-lg font-semibold">{isEditing ? 'Edit Goal' : 'New Goal'}</h2>
      <p class="text-muted-foreground text-sm">
        {isEditing ? 'Update your financial goal.' : 'Set a new financial target to work toward.'}
      </p>
    </div>
  {/snippet}

  {#snippet content()}
    <form id="goal-form" onsubmit={handleSubmit} class="space-y-5">
      <!-- Name -->
      <div class="space-y-1.5">
        <Label for="goal-name">Goal name</Label>
        <Input
          id="goal-name"
          bind:value={name}
          placeholder="e.g. Emergency fund, Pay off Visa"
          required
          maxlength={200} />
      </div>

      <!-- Type -->
      <div class="space-y-1.5">
        <Label>Goal type</Label>
        <Select.Root type="single" bind:value={goalTypeAccessors.get, goalTypeAccessors.set}>
          <Select.Trigger class="w-full">
            {GOAL_TYPE_LABELS[goalType as keyof typeof GOAL_TYPE_LABELS] ?? 'Select type'}
          </Select.Trigger>
          <Select.Content>
            {#each goalTypeEnum as type}
              <Select.Item value={type}>{GOAL_TYPE_LABELS[type]}</Select.Item>
            {/each}
          </Select.Content>
        </Select.Root>
      </div>

      <!-- Target amount -->
      <div class="space-y-1.5">
        <Label for="goal-target">Target amount</Label>
        <Input
          id="goal-target"
          type="number"
          bind:value={targetAmount}
          placeholder="0.00"
          min="0.01"
          step="0.01"
          required />
      </div>

      <!-- Target date (optional) -->
      <div class="space-y-1.5">
        <Label for="goal-date">Target date <span class="text-muted-foreground">(optional)</span></Label>
        <Input id="goal-date" type="date" bind:value={targetDate} />
      </div>

      <!-- Linked account (optional) -->
      <div class="space-y-1.5">
        <Label>Linked account <span class="text-muted-foreground">(optional)</span></Label>
        <Select.Root type="single" bind:value={accountIdAccessors.get, accountIdAccessors.set}>
          <Select.Trigger class="w-full">
            {#if accountId}
              {accounts.find((a) => a.id.toString() === accountId)?.name ?? 'Unknown account'}
            {:else}
              No account linked
            {/if}
          </Select.Trigger>
          <Select.Content>
            <Select.Item value="">No account</Select.Item>
            {#each accounts as account (account.id)}
              <Select.Item value={account.id.toString()}>{account.name}</Select.Item>
            {/each}
          </Select.Content>
        </Select.Root>
        <p class="text-muted-foreground text-xs">
          Progress will be calculated from this account's live balance.
        </p>
      </div>

      <!-- Notes (optional) -->
      <div class="space-y-1.5">
        <Label for="goal-notes">Notes <span class="text-muted-foreground">(optional)</span></Label>
        <Textarea
          id="goal-notes"
          bind:value={notes}
          placeholder="Add any notes about this goal..."
          rows={3}
          maxlength={2000} />
      </div>
    </form>
  {/snippet}

  {#snippet footer()}
    <div class="flex justify-end gap-2">
      <Button
        variant="outline"
        onclick={() => {
          open = false;
          onClose?.();
        }}>
        Cancel
      </Button>
      <Button type="submit" form="goal-form" disabled={isSaving}>
        {isSaving ? 'Saving…' : isEditing ? 'Save changes' : 'Create goal'}
      </Button>
    </div>
  {/snippet}
</ResponsiveSheet>
