<script lang="ts">
import { Label } from '$lib/components/ui/label';
import { Input } from '$lib/components/ui/input';
import { Button } from '$lib/components/ui/button';
import { Switch } from '$lib/components/ui/switch';
import * as Select from '$lib/components/ui/select';
import { onboardingWizardStore } from '$lib/stores/onboarding-wizard.svelte';
import {
  DEBT_TYPE_LABELS,
  type DebtType,
  type DebtItem,
} from '$lib/types/onboarding';
import Plus from '@lucide/svelte/icons/plus';
import Trash2 from '@lucide/svelte/icons/trash-2';
import CreditCard from '@lucide/svelte/icons/credit-card';

const formData = $derived(onboardingWizardStore.typedFormData);

const debtTypes: DebtType[] = ['credit-card', 'student-loan', 'car-loan', 'mortgage', 'personal-loan', 'medical-debt'];

let newDebtType = $state<DebtType>('credit-card');
let newDebtAmount = $state<number | undefined>();
let newDebtInterest = $state<number | undefined>();

function addDebtItem() {
  if (!newDebtAmount) return;

  onboardingWizardStore.addDebtItem({
    type: newDebtType,
    approximateAmount: newDebtAmount,
    interestRate: newDebtInterest,
  });

  // Reset form
  newDebtType = 'credit-card';
  newDebtAmount = undefined;
  newDebtInterest = undefined;
}

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 0,
  }).format(amount);
}
</script>

<div class="space-y-6">
  <!-- Has Debt Toggle -->
  <div class="flex items-center justify-between rounded-lg border p-4">
    <div class="space-y-0.5">
      <Label class="text-base font-medium">Do you have any debt?</Label>
      <p class="text-muted-foreground text-sm">
        This helps us suggest debt payoff strategies and relevant categories.
      </p>
    </div>
    <Switch
      checked={formData.hasDebt ?? false}
      onCheckedChange={(checked) => onboardingWizardStore.setHasDebt(checked)}
    />
  </div>

  {#if formData.hasDebt}
    <!-- Existing Debt Items -->
    {#if (formData.debtOverview?.length ?? 0) > 0}
      <div class="space-y-3">
        <Label class="text-sm font-medium">Your Debts</Label>
        {#each formData.debtOverview ?? [] as debt, index}
          <div class="bg-muted/50 flex items-center justify-between rounded-lg p-3">
            <div class="flex items-center gap-3">
              <CreditCard class="h-4 w-4 text-muted-foreground" />
              <div>
                <p class="font-medium">{DEBT_TYPE_LABELS[debt.type]}</p>
                <p class="text-muted-foreground text-sm">
                  {formatCurrency(debt.approximateAmount)}
                  {#if debt.interestRate}
                    <span class="mx-1">·</span>
                    {debt.interestRate}% APR
                  {/if}
                </p>
              </div>
            </div>
            <Button
              variant="ghost"
              size="icon"
              onclick={() => onboardingWizardStore.removeDebtItem(index)}>
              <Trash2 class="h-4 w-4" />
            </Button>
          </div>
        {/each}
      </div>
    {/if}

    <!-- Add New Debt Form -->
    <div class="space-y-4 rounded-lg border p-4">
      <Label class="text-sm font-medium">Add Debt</Label>

      <div class="grid gap-4 sm:grid-cols-3">
        <!-- Debt Type -->
        <div class="space-y-2">
          <Label for="debt-type" class="text-xs">Type</Label>
          <Select.Root type="single" bind:value={newDebtType}>
            <Select.Trigger>
              {DEBT_TYPE_LABELS[newDebtType]}
            </Select.Trigger>
            <Select.Content>
              {#each debtTypes as type}
                <Select.Item value={type}>{DEBT_TYPE_LABELS[type]}</Select.Item>
              {/each}
            </Select.Content>
          </Select.Root>
        </div>

        <!-- Amount -->
        <div class="space-y-2">
          <Label for="debt-amount" class="text-xs">Amount ($)</Label>
          <Input
            id="debt-amount"
            type="number"
            placeholder="10000"
            bind:value={newDebtAmount}
          />
        </div>

        <!-- Interest Rate -->
        <div class="space-y-2">
          <Label for="debt-interest" class="text-xs">Interest % (optional)</Label>
          <Input
            id="debt-interest"
            type="number"
            step="0.1"
            placeholder="18.9"
            bind:value={newDebtInterest}
          />
        </div>
      </div>

      <Button
        variant="outline"
        onclick={addDebtItem}
        disabled={!newDebtAmount}
        class="w-full">
        <Plus class="mr-2 h-4 w-4" />
        Add Debt
      </Button>
    </div>
  {:else}
    <div class="bg-muted/30 rounded-lg p-6 text-center">
      <p class="text-muted-foreground">
        No worries! You can always add debt tracking later if needed.
      </p>
    </div>
  {/if}
</div>
